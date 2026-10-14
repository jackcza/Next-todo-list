import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { TODO_SELECT, toTodo, type Todo } from "@/lib/todo";
import { applyChanges, newTodo, parseOp, reorderPositions, type SyncOp } from "@/lib/todo-ops";

export type SyncResult = { id: string | null; ok: true } | { id: string | null; ok: false; error: string };

export type SyncResponse = {
  results: SyncResult[];
  /** Every task when `full`, otherwise the ones changed after `since`. */
  todos: Todo[];
  full: boolean;
  /** The highest task version the response covers; send it back as `since` next time. */
  cursor: string;
  points: number;
};

const DAY = 24 * 60 * 60 * 1000;
const APPLIED_OP_DAYS = 30;
/** How far back an offline change may date itself; older ones are recorded as made at this limit. */
const MAX_OFFLINE_DAYS = 60;

type StoredTodo = Todo & { userId: string };

function clampTime(at: string, now: number) {
  return new Date(Math.min(now, Math.max(now - MAX_OFFLINE_DAYS * DAY, Date.parse(at)))).toISOString();
}

function toRow(todo: Todo) {
  return {
    content: todo.content,
    location: todo.location,
    time: todo.time,
    status: todo.status,
    date: todo.date,
    position: todo.position,
    doneAt: todo.doneAt ? new Date(todo.doneAt) : null,
    deletedAt: todo.deletedAt ? new Date(todo.deletedAt) : null,
  };
}

export function maxVersion(versions: bigint[], since = BigInt(0)) {
  return versions.reduce((max, version) => (version > max ? version : max), since).toString();
}

export function parseCursor(value: unknown) {
  return typeof value === "string" && /^\d{1,19}$/.test(value) ? BigInt(value) : null;
}

/**
 * Applies the operations in order and returns what the device needs to catch up. Rejected operations
 * (invalid, or for a task that doesn't exist) are reported and skipped; the rest still apply.
 * The user's row is locked for the whole transaction, so one user's syncs run one at a time and task
 * versions commit in increasing order, which is what makes "changed after version N" reliable.
 */
export async function runSync(userId: string, rawOps: unknown[], since: bigint | null): Promise<SyncResponse> {
  const parsed = rawOps.map(parseOp);
  const ops = parsed.flatMap((item) => ("op" in item ? [item.op] : []));
  const now = Date.now();

  return prisma.$transaction(
    async (tx) => {
      const [locked] = await tx.$queryRaw<{ points: number }[]>`
        SELECT "points" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      let points = locked.points;

      const applied = new Set(
        (
          await tx.appliedOp.findMany({
            where: { userId, id: { in: ops.map((op) => op.id) } },
            select: { id: true },
          })
        ).map((row) => row.id),
      );

      const touchedIds = ops.flatMap((op) =>
        op.type === "create" ? [op.todo.id] : op.type === "update" ? [op.todoId] : [],
      );
      const todos = new Map<string, StoredTodo>(
        (
          await tx.todo.findMany({ where: { id: { in: touchedIds } }, select: { ...TODO_SELECT, userId: true } })
        ).map((row) => [row.id, { ...toTodo(row), userId: row.userId }]),
      );
      const { _max } = await tx.todo.aggregate({ where: { userId }, _max: { position: true } });
      let lastPosition = _max.position ?? -1;

      async function apply(op: SyncOp): Promise<string | null> {
        const at = clampTime(op.at, now);

        if (op.type === "create") {
          const existing = todos.get(op.todo.id);
          if (existing) return existing.userId === userId ? null : "Invalid task id.";
          const todo = newTodo(op.todo, at, ++lastPosition);
          await tx.todo.create({
            data: { ...toRow(todo), id: todo.id, userId, createdAt: new Date(todo.createdAt) },
          });
          todos.set(todo.id, { ...todo, userId });
          return null;
        }

        if (op.type === "update") {
          const current = todos.get(op.todoId);
          if (!current || current.userId !== userId) return "Task not found.";
          const { todo, delta } = applyChanges(current, op.changes, at, lastPosition + 1);
          if (todo.position !== current.position) lastPosition = todo.position;
          await tx.todo.update({ where: { id: todo.id }, data: toRow(todo) });
          todos.set(todo.id, { ...todo, userId });
          points += delta;
          return null;
        }

        const all = await tx.todo.findMany({ where: { userId }, select: { id: true, position: true, createdAt: true } });
        const positions = reorderPositions(
          all.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }) as Todo),
          op.ids,
        );
        const moved = all.filter((row) => positions.get(row.id) !== row.position);
        if (moved.length > 0) {
          const values = Prisma.join(moved.map((row) => Prisma.sql`(${row.id}, ${positions.get(row.id)}::int)`));
          await tx.$executeRaw`
            UPDATE "Todo" AS t SET "position" = v.position
            FROM (VALUES ${values}) AS v(id, position)
            WHERE t."id" = v.id AND t."userId" = ${userId}`;
        }
        for (const todo of todos.values()) {
          const position = positions.get(todo.id);
          if (position !== undefined) todo.position = position;
        }
        lastPosition = Math.max(lastPosition, all.length - 1);
        return null;
      }

      const results: SyncResult[] = [];
      const newlyApplied: string[] = [];
      for (const item of parsed) {
        if (!("op" in item)) {
          results.push({ id: item.id, ok: false, error: item.error });
          continue;
        }
        const { op } = item;
        if (applied.has(op.id)) {
          results.push({ id: op.id, ok: true });
          continue;
        }
        const error = await apply(op);
        if (error) {
          results.push({ id: op.id, ok: false, error });
        } else {
          results.push({ id: op.id, ok: true });
          applied.add(op.id);
          newlyApplied.push(op.id);
        }
      }

      if (newlyApplied.length > 0) {
        await tx.appliedOp.createMany({ data: newlyApplied.map((id) => ({ userId, id })), skipDuplicates: true });
      }
      if (points !== locked.points) {
        await tx.user.update({ where: { id: userId }, data: { points } });
      }
      if (newlyApplied.length > 0 && Math.random() < 0.05) {
        await tx.appliedOp.deleteMany({
          where: { userId, createdAt: { lt: new Date(now - APPLIED_OP_DAYS * DAY) } },
        });
      }

      const changed = await tx.todo.findMany({
        where: since === null ? { userId } : { userId, version: { gt: since } },
        select: { ...TODO_SELECT, version: true },
      });
      return {
        results,
        todos: changed.map(toTodo),
        full: since === null,
        cursor: maxVersion(
          changed.map((row) => row.version),
          since ?? BigInt(0),
        ),
        points,
      };
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}
