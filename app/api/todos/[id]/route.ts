import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { TODO_SELECT, isTodoStatus } from "@/lib/todo";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const { id } = await params;
  const body = await readJson(request);
  if (!isTodoStatus(body.status)) return jsonError("Invalid task status.", 400);

  const { count } = await prisma.todo.updateMany({
    where: { id, userId: user.id },
    data: { status: body.status },
  });
  if (count === 0) return jsonError("Task not found.", 404);

  const todo = await prisma.todo.findUnique({ where: { id }, select: TODO_SELECT });
  return Response.json(todo);
}
