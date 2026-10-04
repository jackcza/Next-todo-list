import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { MAX_TODO_LENGTH, TODO_ORDER, TODO_SELECT } from "@/lib/todo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const todos = await prisma.todo.findMany({
    where: { userId: user.id },
    orderBy: [...TODO_ORDER],
    select: TODO_SELECT,
  });
  return Response.json(todos);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const body = await readJson(request);
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return jsonError("Task content cannot be empty.", 400);
  if (content.length > MAX_TODO_LENGTH) {
    return jsonError(`Task content must be at most ${MAX_TODO_LENGTH} characters.`, 400);
  }

  const { _max } = await prisma.todo.aggregate({ where: { userId: user.id }, _max: { position: true } });
  const todo = await prisma.todo.create({
    data: { userId: user.id, content, position: (_max.position ?? -1) + 1 },
    select: TODO_SELECT,
  });
  return Response.json(todo, { status: 201 });
}
