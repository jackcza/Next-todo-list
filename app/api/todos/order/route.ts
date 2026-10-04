import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { MAX_REORDER_IDS } from "@/lib/todo";

/** Body: { ids: string[] } — the user's todos in their new order; position = index. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const body = await readJson(request);
  const ids = body.ids;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_REORDER_IDS ||
    !ids.every((id) => typeof id === "string") ||
    new Set(ids).size !== ids.length
  ) {
    return jsonError("Invalid task order.", 400);
  }

  await prisma.$transaction(
    ids.map((id: string, index) =>
      prisma.todo.updateMany({ where: { id, userId: user.id }, data: { position: index } }),
    ),
  );
  return Response.json({ ok: true });
}
