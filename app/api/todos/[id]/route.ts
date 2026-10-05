import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { STATUS, TODO_SELECT, isDateKey, isTodoStatus, toTodo } from "@/lib/todo";

type TodoUpdate = {
  status?: string;
  doneAt?: Date | null;
  deletedAt?: Date | null;
  date?: string;
  position?: number;
};

/** Body: { status } and/or { date }. Moving to another date puts the task at the end of that day. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const { id } = await params;
  const body = await readJson(request);
  const data: TodoUpdate = {};

  if (body.status !== undefined) {
    if (!isTodoStatus(body.status)) return jsonError("Invalid task status.", 400);
    const now = new Date();
    data.status = body.status;
    data.deletedAt = body.status === STATUS.IS_DELETE ? now : null;
    // Deleting keeps doneAt so a completed task still shows when it was finished.
    if (body.status === STATUS.IS_DONE) data.doneAt = now;
    if (body.status === STATUS.IS_CREATE) data.doneAt = null;
  }

  if (body.date !== undefined) {
    if (!isDateKey(body.date)) return jsonError("Invalid date.", 400);
    const { _max } = await prisma.todo.aggregate({ where: { userId: user.id }, _max: { position: true } });
    data.date = body.date;
    data.position = (_max.position ?? -1) + 1;
  }

  if (Object.keys(data).length === 0) return jsonError("Nothing to update.", 400);

  const { count } = await prisma.todo.updateMany({ where: { id, userId: user.id }, data });
  if (count === 0) return jsonError("Task not found.", 404);

  const todo = await prisma.todo.findUnique({ where: { id }, select: TODO_SELECT });
  return Response.json(todo && toTodo(todo));
}
