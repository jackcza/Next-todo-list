import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, readJson } from "@/lib/http";
import { POINTS_PER_TASK } from "@/lib/rank";
import { STATUS, TODO_SELECT, isDateKey, isTodoStatus, toTodo } from "@/lib/todo";

type TodoUpdate = {
  status?: string;
  doneAt?: Date | null;
  deletedAt?: Date | null;
  date?: string;
  position?: number;
};

/**
 * Body: { status } and/or { date }. Moving to another date puts the task at the end of that day.
 * Responds with the task and the user's rank points after the change.
 */
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

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.todo.findFirst({ where: { id, userId: user.id }, select: { doneAt: true } });
    if (!current) return null;

    const wasDone = current.doneAt !== null;
    const isDone = data.doneAt === undefined ? wasDone : data.doneAt !== null;
    // Re-completing a done task keeps its original time and scores nothing.
    if (wasDone && isDone) delete data.doneAt;

    // Matching on the doneAt state we read means a concurrent change makes this update miss instead of scoring twice.
    const { count } = await tx.todo.updateMany({
      where: { id, userId: user.id, doneAt: wasDone ? { not: null } : null },
      data,
    });
    if (count === 0) return "conflict" as const;

    const delta = (isDone ? POINTS_PER_TASK : 0) - (wasDone ? POINTS_PER_TASK : 0);
    const { points } = await tx.user.update({
      where: { id: user.id },
      data: delta === 0 ? {} : { points: { increment: delta } },
      select: { points: true },
    });
    const todo = await tx.todo.findUniqueOrThrow({ where: { id }, select: TODO_SELECT });
    return { todo: toTodo(todo), points };
  });

  if (result === null) return jsonError("Task not found.", 404);
  if (result === "conflict") return jsonError("This task was just changed. Please try again.", 409);
  return Response.json(result);
}
