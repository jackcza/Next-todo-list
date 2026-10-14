import { POINTS_PER_TASK } from "@/lib/rank";
import {
  MAX_LOCATION_LENGTH,
  MAX_REORDER_IDS,
  MAX_TODO_LENGTH,
  STATUS,
  compareTodos,
  isDateKey,
  isTimeKey,
  isTodoStatus,
  isUuid,
  type Todo,
} from "@/lib/todo";

/**
 * Every change to a task is an operation. The browser applies it to its local copy straight away and queues it;
 * POST /api/sync applies the same operation on the server. Both sides use the rules in this file, so the local
 * prediction matches what the server ends up storing.
 */

export type TodoChanges = {
  content?: string;
  location?: string | null;
  time?: string | null;
  status?: string;
  date?: string;
};

export type NewTodo = {
  id: string;
  content: string;
  date: string;
  location: string | null;
  time: string | null;
};

/** `id` makes retries safe: the server skips an operation it has already applied. `at` is when the user did it. */
export type SyncOp =
  | { id: string; at: string; type: "create"; todo: NewTodo }
  | { id: string; at: string; type: "update"; todoId: string; changes: TodoChanges }
  | { id: string; at: string; type: "reorder"; ids: string[] };

/** Per request; a longer queue goes up in several requests. */
export const MAX_SYNC_OPS = 20;

type Parsed<T> = { value: T } | { error: string };

function parseContent(value: unknown): Parsed<string> {
  const content = typeof value === "string" ? value.trim() : "";
  if (!content) return { error: "Task content cannot be empty." };
  if (content.length > MAX_TODO_LENGTH) return { error: `Task content must be at most ${MAX_TODO_LENGTH} characters.` };
  return { value: content };
}

/** A blank or null location clears it. */
function parseLocation(value: unknown): Parsed<string | null> {
  if (value !== null && typeof value !== "string") return { error: "Invalid location." };
  const location = value?.trim() ?? "";
  if (location.length > MAX_LOCATION_LENGTH) return { error: `Location must be at most ${MAX_LOCATION_LENGTH} characters.` };
  return { value: location || null };
}

/** A blank or null time clears it. */
function parseTime(value: unknown): Parsed<string | null> {
  if (value === null || value === "") return { value: null };
  return isTimeKey(value) ? { value } : { error: "Invalid time." };
}

export function parseChanges(raw: unknown): Parsed<TodoChanges> {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const changes: TodoChanges = {};

  if (body.content !== undefined) {
    const parsed = parseContent(body.content);
    if ("error" in parsed) return parsed;
    changes.content = parsed.value;
  }
  if (body.location !== undefined) {
    const parsed = parseLocation(body.location);
    if ("error" in parsed) return parsed;
    changes.location = parsed.value;
  }
  if (body.time !== undefined) {
    const parsed = parseTime(body.time);
    if ("error" in parsed) return parsed;
    changes.time = parsed.value;
  }
  if (body.status !== undefined) {
    if (!isTodoStatus(body.status)) return { error: "Invalid task status." };
    changes.status = body.status;
  }
  if (body.date !== undefined) {
    if (!isDateKey(body.date)) return { error: "Invalid date." };
    changes.date = body.date;
  }

  if (Object.keys(changes).length === 0) return { error: "Nothing to update." };
  return { value: changes };
}

function parseNewTodo(raw: unknown): Parsed<NewTodo> {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (!isUuid(body.id)) return { error: "Invalid task id." };
  if (!isDateKey(body.date)) return { error: "Invalid date." };
  const content = parseContent(body.content);
  if ("error" in content) return content;
  const location = parseLocation(body.location ?? null);
  if ("error" in location) return location;
  const time = parseTime(body.time ?? null);
  if ("error" in time) return time;
  return {
    value: { id: body.id.toLowerCase(), content: content.value, date: body.date, location: location.value, time: time.value },
  };
}

function parseOrder(raw: unknown): Parsed<string[]> {
  if (
    !Array.isArray(raw) ||
    raw.length === 0 ||
    raw.length > MAX_REORDER_IDS ||
    !raw.every((id) => typeof id === "string") ||
    new Set(raw).size !== raw.length
  ) {
    return { error: "Invalid task order." };
  }
  return { value: raw };
}

/** Returns the operation id with any error, so the server can report which operation was rejected. */
export function parseOp(raw: unknown): { op: SyncOp } | { id: string | null; error: string } {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = isUuid(body.id) ? body.id.toLowerCase() : null;
  if (!id || typeof body.at !== "string" || Number.isNaN(Date.parse(body.at))) {
    return { id, error: "Invalid sync request." };
  }
  const at = new Date(body.at).toISOString();

  if (body.type === "create") {
    const todo = parseNewTodo(body.todo);
    return "error" in todo ? { id, error: todo.error } : { op: { id, at, type: "create", todo: todo.value } };
  }
  if (body.type === "update") {
    if (typeof body.todoId !== "string") return { id, error: "Task not found." };
    const changes = parseChanges(body.changes);
    return "error" in changes
      ? { id, error: changes.error }
      : { op: { id, at, type: "update", todoId: body.todoId, changes: changes.value } };
  }
  if (body.type === "reorder") {
    const ids = parseOrder(body.ids);
    return "error" in ids ? { id, error: ids.error } : { op: { id, at, type: "reorder", ids: ids.value } };
  }
  return { id, error: "Invalid sync request." };
}

export function newTodo(todo: NewTodo, at: string, position: number): Todo {
  return { ...todo, status: STATUS.IS_CREATE, position, createdAt: at, doneAt: null, deletedAt: null };
}

/**
 * The task after `changes`, and the rank points it gains or loses. A task scores while it has a completion time:
 * completing gives 10, making it active again takes them back, and deleting a done task keeps them.
 * `nextPosition` is used when the task moves to another day, which puts it at the end of the list.
 */
export function applyChanges(todo: Todo, changes: TodoChanges, at: string, nextPosition: number) {
  const next: Todo = { ...todo };
  if (changes.content !== undefined) next.content = changes.content;
  if (changes.location !== undefined) next.location = changes.location;
  if (changes.time !== undefined) next.time = changes.time;
  if (changes.date !== undefined && changes.date !== todo.date) {
    next.date = changes.date;
    next.position = nextPosition;
  }
  if (changes.status !== undefined) {
    const status = changes.status;
    next.status = status;
    next.deletedAt = status === STATUS.IS_DELETE ? (todo.status === STATUS.IS_DELETE ? todo.deletedAt : at) : null;
    // Completing a task that already has a completion time (e.g. restoring a deleted done task) keeps the original.
    if (status === STATUS.IS_DONE) next.doneAt = todo.doneAt ?? at;
    if (status === STATUS.IS_CREATE) next.doneAt = null;
  }
  const delta = (next.doneAt ? POINTS_PER_TASK : 0) - (todo.doneAt ? POINTS_PER_TASK : 0);
  return { todo: next, delta };
}

/** New positions after a reorder: the listed tasks first, then any others (e.g. added on another device) in their old order. */
export function reorderPositions(todos: Todo[], ids: string[]) {
  const sorted = [...todos].sort(compareTodos);
  const known = new Set(sorted.map((todo) => todo.id));
  const listed = ids.filter((id) => known.has(id));
  const listedSet = new Set(listed);
  const order = [...listed, ...sorted.filter((todo) => !listedSet.has(todo.id)).map((todo) => todo.id)];
  return new Map(order.map((id, index) => [id, index]));
}

function nextPositionOf(todos: Todo[]) {
  return todos.reduce((max, todo) => Math.max(max, todo.position), -1) + 1;
}

/** The local view: the last server state with the queued operations replayed on top, sorted for display. */
export function projectOps(base: Todo[], basePoints: number, ops: SyncOp[]) {
  let todos = [...base];
  let points = basePoints;
  for (const op of ops) {
    if (op.type === "create") {
      if (!todos.some((todo) => todo.id === op.todo.id)) todos.push(newTodo(op.todo, op.at, nextPositionOf(todos)));
    } else if (op.type === "update") {
      const index = todos.findIndex((todo) => todo.id === op.todoId);
      if (index === -1) continue;
      const { todo, delta } = applyChanges(todos[index], op.changes, op.at, nextPositionOf(todos));
      todos[index] = todo;
      points += delta;
    } else {
      const positions = reorderPositions(todos, op.ids);
      todos = todos.map((todo) => ({ ...todo, position: positions.get(todo.id) ?? todo.position }));
    }
  }
  return { todos: todos.sort(compareTodos), points };
}
