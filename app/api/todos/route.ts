import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { TODO_ORDER, TODO_SELECT, toTodo } from "@/lib/todo";

/** Read-only list; changes go through POST /api/sync. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [...TODO_ORDER],
    select: TODO_SELECT,
  });
  return Response.json(todos.map(toTodo));
}
