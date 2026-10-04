export const STATUS = {
  IS_CREATE: "0",
  IS_DONE: "1",
  IS_DELETE: "2",
} as const;

export type Todo = {
  id: string;
  content: string;
  status: string;
};

export const TODO_SELECT = { id: true, content: true, status: true } as const;

export const TODO_ORDER = [{ position: "asc" }, { createdAt: "asc" }] as const;

export const MAX_TODO_LENGTH = 200;

export const MAX_REORDER_IDS = 1000;

export function isTodoStatus(value: unknown): value is string {
  return typeof value === "string" && (Object.values(STATUS) as string[]).includes(value);
}
