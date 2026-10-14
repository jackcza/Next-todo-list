export const STATUS = {
  IS_CREATE: "0",
  IS_DONE: "1",
  IS_DELETE: "2",
} as const;

/** Timestamps are ISO strings; `date` is the 'YYYY-MM-DD' day the task belongs to. */
export type Todo = {
  id: string;
  content: string;
  location: string | null;
  /** 'HH:mm' on `date`, in the user's local time zone. */
  time: string | null;
  status: string;
  date: string;
  /** Sort key across all of the user's tasks; ties fall back to createdAt. */
  position: number;
  createdAt: string;
  doneAt: string | null;
  deletedAt: string | null;
};

export const TODO_SELECT = {
  id: true,
  content: true,
  location: true,
  time: true,
  status: true,
  date: true,
  position: true,
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
    id: row.id,
    content: row.content,
    location: row.location,
    time: row.time,
    status: row.status,
    date: row.date,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    doneAt: row.doneAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

export const TODO_ORDER = [{ position: "asc" }, { createdAt: "asc" }] as const;

export function compareTodos(a: Todo, b: Todo) {
  return a.position - b.position || a.createdAt.localeCompare(b.createdAt);
}

export const MAX_TODO_LENGTH = 200;

export const MAX_LOCATION_LENGTH = 100;

export const MAX_REORDER_IDS = 1000;

export function isTodoStatus(value: unknown): value is string {
  return typeof value === "string" && (Object.values(STATUS) as string[]).includes(value);
}

export function isTimeKey(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
