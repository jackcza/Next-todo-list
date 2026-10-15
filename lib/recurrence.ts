import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { STATUS, type Todo } from "@/lib/todo";
import { addDays, isoWeekday, parseDays, repeatHorizon } from "@/lib/todo-ops";

/**
 * Weekly tasks. A rule keeps the days and what its copies get; each copy is an ordinary task with recurrenceId set,
 * so editing, completing or deleting one leaves the others alone. Everything here runs inside a transaction that
 * holds the user's row lock (see lib/sync-server.ts), so new tasks get versions in order like any other change.
 */

type Tx = Prisma.TransactionClient;

type Rule = {
  id: string;
  userId: string;
  days: string;
  content: string;
  location: string | null;
  time: string | null;
  generatedThrough: string;
};

/**
 * Adds a copy for each matching day in [from, to] that doesn't have one yet; a copy the user deleted counts, so it
 * doesn't come back. Returns the last position used.
 */
async function addCopies(tx: Tx, rule: Rule, from: string, to: string, lastPosition: number) {
  if (from > to) return lastPosition;
  const days = new Set(parseDays(rule.days));
  const existing = new Set(
    (
      await tx.todo.findMany({
        where: { recurrenceId: rule.id, date: { gte: from, lte: to } },
        select: { date: true },
      })
    ).map((row) => row.date),
  );
  const data = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (!days.has(isoWeekday(date)) || existing.has(date)) continue;
    data.push({
      id: randomUUID(),
      userId: rule.userId,
      content: rule.content,
      location: rule.location,
      time: rule.time,
      date,
      position: ++lastPosition,
      repeat: rule.days,
      recurrenceId: rule.id,
    });
  }
  if (data.length > 0) await tx.todo.createMany({ data });
  return lastPosition;
}

/**
 * Applies a repeat change to `todo`: creates or updates its rule from the task's current content, location and
 * time, deletes future undone copies on days no longer included, and adds copies from `today` through the end of
 * the week (or of next week, if that's already been added). An empty `days` stops the rule.
 */
export async function applyRepeat(
  tx: Tx,
  userId: string,
  todo: Todo,
  days: number[],
  today: string,
  at: Date,
  lastPosition: number,
) {
  const rule = todo.recurrenceId ? await tx.recurrence.findUnique({ where: { id: todo.recurrenceId } }) : null;

  if (rule) {
    const kept = new Set(days);
    const dropped = parseDays(rule.days).filter((day) => !kept.has(day));
    if (dropped.length > 0) {
      await tx.$executeRaw`
        UPDATE "Todo" SET "status" = ${STATUS.IS_DELETE}, "deletedAt" = ${at}, "updatedAt" = now()
        WHERE "recurrenceId" = ${rule.id} AND "id" <> ${todo.id} AND "status" = ${STATUS.IS_CREATE}
          AND "date" > ${today} AND extract(isodow FROM "date"::date)::int = ANY(${dropped})`;
    }
  }

  if (days.length === 0) {
    if (rule) {
      await tx.todo.updateMany({ where: { recurrenceId: rule.id }, data: { recurrenceId: null, repeat: null } });
      await tx.recurrence.delete({ where: { id: rule.id } });
    } else if (todo.repeat) {
      await tx.todo.update({ where: { id: todo.id }, data: { repeat: null } });
    }
    return lastPosition;
  }

  const repeat = days.join(",");
  const fields = { days: repeat, content: todo.content, location: todo.location, time: todo.time };
  let saved: Rule;
  if (rule) {
    saved = await tx.recurrence.update({ where: { id: rule.id }, data: fields });
    await tx.todo.updateMany({ where: { recurrenceId: rule.id }, data: { repeat } });
  } else {
    saved = await tx.recurrence.create({ data: { ...fields, userId, generatedThrough: today } });
    await tx.todo.update({ where: { id: todo.id }, data: { recurrenceId: saved.id, repeat } });
  }

  const horizon = repeatHorizon(today);
  const through = saved.generatedThrough > horizon ? saved.generatedThrough : horizon;
  lastPosition = await addCopies(tx, saved, today, through, lastPosition);
  if (saved.generatedThrough !== through) {
    await tx.recurrence.update({ where: { id: saved.id }, data: { generatedThrough: through } });
  }
  return lastPosition;
}

/**
 * Called every minute by /api/reminders/tick: for users whose local week has moved on (it's Sunday, or a Sunday
 * was missed), adds each rule's copies up to the new horizon. Users without a known time zone wait until their
 * next sync reports one. Returns the number of rules extended.
 */
export async function addDueCopies() {
  const rules = await prisma.$queryRaw<{ id: string; userId: string; generatedThrough: string; today: string }[]>`
    SELECT r."id", r."userId", r."generatedThrough",
           to_char((now() AT TIME ZONE u."timeZone")::date, 'YYYY-MM-DD') AS "today"
    FROM "Recurrence" r
    JOIN "User" u ON u."id" = r."userId"
    WHERE u."timeZone" IS NOT NULL`;
  const due = rules.filter((rule) => rule.generatedThrough < repeatHorizon(rule.today));
  const byUser = new Map<string, typeof due>();
  for (const rule of due) byUser.set(rule.userId, [...(byUser.get(rule.userId) ?? []), rule]);

  for (const [userId, userRules] of byUser) {
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const { _max } = await tx.todo.aggregate({ where: { userId }, _max: { position: true } });
        let lastPosition = _max.position ?? -1;
        for (const { id, today } of userRules) {
          const rule = await tx.recurrence.findUnique({ where: { id } });
          const horizon = repeatHorizon(today);
          // Re-read under the lock: a sync may have extended or removed it since the query above.
          if (!rule || rule.generatedThrough >= horizon) continue;
          const from = rule.generatedThrough < today ? today : addDays(rule.generatedThrough, 1);
          lastPosition = await addCopies(tx, rule, from, horizon, lastPosition);
          await tx.recurrence.update({ where: { id }, data: { generatedThrough: horizon } });
        }
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
  }
  return due.length;
}
