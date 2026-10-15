import { timingSafeEqual } from "node:crypto";
import { jsonError } from "@/lib/http";
import { pushConfigured, sendDueReminders } from "@/lib/push";
import { addDueCopies } from "@/lib/recurrence";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  // Lenient about case, spacing and quotes, which are easy to get wrong when pasting into a scheduler's form.
  const header = request.headers.get("authorization")?.replace(/^\s*Bearer\s+/i, "");
  const given = (header ?? new URL(request.url).searchParams.get("key") ?? "").trim().replace(/^"|"$/g, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called every minute by an external scheduler (see README). Auth: `Authorization: Bearer <CRON_SECRET>`,
 * or `?key=<CRON_SECRET>` for schedulers that can't set headers. Adds the coming week's copies of weekly tasks
 * (on Sunday in each user's time zone), then sends the reminders that are due, including for those copies.
 */
async function handle(request: Request) {
  if (!authorized(request)) return jsonError("Unauthorized.", 401);
  const repeated = await addDueCopies();
  if (!pushConfigured()) return Response.json({ repeated, tasks: 0, sent: 0 });
  return Response.json({ repeated, ...(await sendDueReminders()) });
}

export const GET = handle;
export const POST = handle;
