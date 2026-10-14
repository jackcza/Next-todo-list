import webpush from "web-push";
import { prisma } from "@/lib/db";
import { isLocale, MESSAGES, type Locale } from "@/lib/i18n";

/** Minutes before a task's time that its reminder goes out. */
export const REMINDER_MINUTES = 15;

export type PushPayload = { title: string; body: string; tag: string; url: string };

let configured = false;

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

function configure() {
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
}

/** Postgres has to know the zone too, since /api/reminders/tick converts times in SQL. */
export async function isKnownTimeZone(value: unknown): Promise<boolean> {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return false;
  const rows = await prisma.$queryRaw<unknown[]>`SELECT 1 FROM pg_timezone_names WHERE name = ${value} LIMIT 1`;
  return rows.length > 0;
}

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string; locale: string };

/** Sends to one browser; drops the subscription when the push service says it no longer exists. */
export async function sendPush(subscription: Subscription, payload: (locale: Locale) => PushPayload) {
  configure();
  const locale = isLocale(subscription.locale) ? subscription.locale : "en";
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload(locale)),
      { TTL: REMINDER_MINUTES * 60, timeout: 10_000 },
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
    } else {
      console.error("Push failed:", status ?? error);
    }
    return false;
  }
}

type DueTodo = { id: string; userId: string; content: string; location: string | null; time: string; dueAt: Date };

/**
 * Sends a reminder for every active task that starts within the next REMINDER_MINUTES and hasn't had one for its
 * current date and time. Claiming the tasks and marking them happen in one UPDATE, so overlapping runs can't
 * send the same reminder twice. Only users with a subscription are considered, and only dates near today
 * (every time zone is within a day of UTC), which keeps the time zone conversion to a few rows.
 */
export async function sendDueReminders() {
  const due = await prisma.$queryRaw<DueTodo[]>`
    WITH candidates AS (
      SELECT t."id", (t."date" || ' ' || t."time")::timestamp AT TIME ZONE u."timeZone" AS "dueAt"
      FROM "Todo" t
      JOIN "User" u ON u."id" = t."userId"
      WHERE t."status" = '0'
        AND t."time" IS NOT NULL
        AND u."timeZone" IS NOT NULL
        AND t."remindedFor" IS DISTINCT FROM (t."date" || ' ' || t."time")
        AND t."date" BETWEEN to_char(now() - interval '1 day', 'YYYY-MM-DD')
                         AND to_char(now() + interval '1 day', 'YYYY-MM-DD')
        AND EXISTS (SELECT 1 FROM "PushSubscription" s WHERE s."userId" = t."userId")
    )
    UPDATE "Todo" t
    SET "remindedFor" = t."date" || ' ' || t."time"
    FROM candidates c
    WHERE t."id" = c."id"
      AND t."remindedFor" IS DISTINCT FROM (t."date" || ' ' || t."time")
      AND c."dueAt" > now()
      AND c."dueAt" <= now() + make_interval(mins => ${REMINDER_MINUTES})
    RETURNING t."id", t."userId", t."content", t."location", t."time", c."dueAt"`;
  if (due.length === 0) return { tasks: 0, sent: 0 };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: [...new Set(due.map((todo) => todo.userId))] } },
  });
  const now = Date.now();
  const results = await Promise.all(
    due.flatMap((todo) => {
      const minutes = Math.max(1, Math.ceil((todo.dueAt.getTime() - now) / 60_000));
      return subscriptions
        .filter((subscription) => subscription.userId === todo.userId)
        .map((subscription) =>
          sendPush(subscription, (locale) => {
            const t = MESSAGES[locale].reminder;
            return {
              title: t.startsIn(minutes),
              body: [`${todo.time} ${todo.content}`, todo.location].filter(Boolean).join(" · "),
              tag: `todo-${todo.id}`,
              url: "/",
            };
          }),
        );
    }),
  );
  return { tasks: due.length, sent: results.filter(Boolean).length };
}
