import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { isLocale, MESSAGES } from "@/lib/i18n";
import { isKnownTimeZone, pushConfigured, sendPush } from "@/lib/push";

function parseEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function isKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

/**
 * Turns reminders on for this browser. Body: { endpoint, keys: { p256dh, auth }, locale, timeZone, confirm } —
 * the PushSubscription JSON plus the browser's language and time zone. With `confirm`, sends a notification
 * to show it works; the app also calls this without it on every start, to keep the subscription attached to
 * whoever is logged in and its language current.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);
  if (!pushConfigured()) return jsonError("Reminders are not available right now.", 503);

  const body = await readJson(request);
  const endpoint = parseEndpoint(body.endpoint);
  const keys = (body.keys ?? {}) as Record<string, unknown>;
  if (!endpoint || !isKey(keys.p256dh) || !isKey(keys.auth)) return jsonError("Invalid request.", 400);
  const locale = isLocale(body.locale) ? body.locale : "en";

  if (await isKnownTimeZone(body.timeZone)) {
    await prisma.user.update({ where: { id: user.id }, data: { timeZone: body.timeZone as string } });
  }
  // A browser that was used by another account now belongs to this one.
  const data = { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, locale };
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, ...data },
    update: data,
  });

  if (body.confirm !== true) return Response.json({ ok: true });
  const t = MESSAGES[locale].reminder;
  const delivered = await sendPush(subscription, () => ({
    title: t.enabledTitle,
    body: t.enabledBody,
    tag: "reminders-enabled",
    url: "/",
  }));
  if (!delivered) return jsonError("Couldn't send a notification to this browser. Please try again.", 502);
  return Response.json({ ok: true });
}

/** Body: { endpoint }. Turns reminders off for this browser. */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);
  const endpoint = parseEndpoint((await readJson(request)).endpoint);
  if (!endpoint) return jsonError("Invalid request.", 400);
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return Response.json({ ok: true });
}
