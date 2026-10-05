export const STATUS = {
  IS_CREATE: "0",
  IS_DONE: "1",
  IS_DELETE: "2",
} as const;

/** Timestamps are ISO strings; `date` is the 'YYYY-MM-DD' day the task belongs to. */
export type Todo = {
  id: string;
  content: string;
  status: string;
  date: string;
  createdAt: string;
  doneAt: string | null;
  deletedAt: string | null;
};

export const TODO_SELECT = {
  id: true,
  content: true,
  status: true,
  date: true,
  createdAt: true,
  doneAt: true,
  deletedAt: true,
} as const;

type TodoRow = Omit<Todo, "createdAt" | "doneAt" | "deletedAt"> & {
  createdAt: Date;
  doneAt: Date | null;
  deletedAt: Date | null;
};

export function toTodo(row: TodoRow): Todo {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    doneAt: row.doneAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export const TODO_ORDER = [{ position: "asc" }, { createdAt: "asc" }] as const;

export const MAX_TODO_LENGTH = 200;

export const MAX_REORDER_IDS = 1000;

export function isTodoStatus(value: unknown): value is string {
  return typeof value === "string" && (Object.values(STATUS) as string[]).includes(value);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
