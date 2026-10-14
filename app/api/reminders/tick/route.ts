import { timingSafeEqual } from "node:crypto";
import { jsonError } from "@/lib/http";
import { pushConfigured, sendDueReminders } from "@/lib/push";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const given = header ?? new URL(request.url).searchParams.get("key") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called every minute by an external scheduler (see README). Auth: `Authorization: Bearer <CRON_SECRET>`,
 * or `?key=<CRON_SECRET>` for schedulers that can't set headers.
 */
async function handle(request: Request) {
  if (!authorized(request)) return jsonError("Unauthorized.", 401);
  if (!pushConfigured()) return jsonError("Push is not configured.", 503);
  return Response.json(await sendDueReminders());
}

export const GET = handle;
export const POST = handle;
