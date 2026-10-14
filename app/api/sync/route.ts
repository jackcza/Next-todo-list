import { getCurrentUser } from "@/lib/auth";
import { jsonError, readJson } from "@/lib/http";
import { parseCursor, runSync } from "@/lib/sync-server";
import { MAX_SYNC_OPS } from "@/lib/todo-ops";

/**
 * Body: { userId, ops: SyncOp[], since: string | null }. Applies the queued operations, then returns the tasks
 * changed after `since` (all of them when it is null), the new cursor and the user's rank points.
 * See lib/sync-server.ts. A 409 means the local copy belongs to another account than the one now logged in
 * (e.g. a saved page opened after logging in as someone else), so its changes and cursor don't apply.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const body = await readJson(request);
  if (body.userId !== user.id) return jsonError("Account changed.", 409);
  const ops = body.ops ?? [];
  if (!Array.isArray(ops) || ops.length > MAX_SYNC_OPS) return jsonError("Invalid sync request.", 400);

  return Response.json(await runSync(user.id, ops, parseCursor(body.since)));
}
