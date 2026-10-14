import type { Todo } from "@/lib/todo";
import type { SyncOp } from "@/lib/todo-ops";

/**
 * The browser's copy of the user's tasks: `todos` and `meta` hold the last state confirmed by the server, and
 * `outbox` holds the changes not yet sent. What the user sees is the outbox replayed on top (lib/todo-ops.ts).
 */

export type OutboxEntry = { seq: number; op: SyncOp };

export type LocalMeta = { userId: string | null; cursor: string | null; points: number };

export type LocalData = { meta: LocalMeta; todos: Todo[]; outbox: OutboxEntry[] };

export type Commit = {
  /** Outbox entries the server has handled. */
  remove: number[];
  /** With `full`, these replace every stored task; otherwise they are upserted. */
  todos: Todo[];
  full: boolean;
  meta: LocalMeta;
};

export interface LocalStore {
  load(): Promise<LocalData>;
  /** The meta and the oldest `limit` outbox entries, without reading the tasks. */
  peek(limit: number): Promise<{ meta: LocalMeta; outbox: OutboxEntry[] }>;
  add(op: SyncOp): Promise<OutboxEntry>;
  commit(commit: Commit): Promise<void>;
  clear(): Promise<void>;
}

const EMPTY_META: LocalMeta = { userId: null, cursor: null, points: 0 };
const DB_NAME = "todo-next";
const DB_VERSION = 1;
const META_KEY = "meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("todos", { keyPath: "id" });
      db.createObjectStore("outbox", { keyPath: "seq", autoIncrement: true });
      db.createObjectStore("meta");
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB is blocked."));
  });
}

/** Runs `body` in one transaction and resolves with what its getter returns once the transaction commits. */
function transact<T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  body: (tx: IDBTransaction) => () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    const result = body(tx);
    tx.oncomplete = () => resolve(result());
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted."));
  });
}

function read<T>(request: IDBRequest, set: (value: T) => void) {
  request.onsuccess = () => set(request.result as T);
}

function readOutbox(tx: IDBTransaction, limit: number | undefined, set: (entries: OutboxEntry[]) => void) {
  read<OutboxEntry[]>(tx.objectStore("outbox").getAll(null, limit), set);
}

async function openIndexedDbStore(): Promise<LocalStore> {
  const db = await openDb();
  return {
    load: () =>
      transact(db, ["todos", "outbox", "meta"], "readonly", (tx) => {
        const data: LocalData = { meta: EMPTY_META, todos: [], outbox: [] };
        read<Todo[]>(tx.objectStore("todos").getAll(), (todos) => (data.todos = todos));
        readOutbox(tx, undefined, (outbox) => (data.outbox = outbox));
        read<LocalMeta | undefined>(tx.objectStore("meta").get(META_KEY), (meta) => (data.meta = meta ?? EMPTY_META));
        return () => data;
      }),
    peek: (limit) =>
      transact(db, ["outbox", "meta"], "readonly", (tx) => {
        const data = { meta: EMPTY_META, outbox: [] as OutboxEntry[] };
        readOutbox(tx, limit, (outbox) => (data.outbox = outbox));
        read<LocalMeta | undefined>(tx.objectStore("meta").get(META_KEY), (meta) => (data.meta = meta ?? EMPTY_META));
        return () => data;
      }),
    add: (op) =>
      transact(db, ["outbox"], "readwrite", (tx) => {
        let seq = 0;
        read<number>(tx.objectStore("outbox").add({ op }), (key) => (seq = key));
        return () => ({ seq, op });
      }),
    commit: ({ remove, todos, full, meta }) =>
      transact(db, ["todos", "outbox", "meta"], "readwrite", (tx) => {
        const outbox = tx.objectStore("outbox");
        for (const seq of remove) outbox.delete(seq);
        const store = tx.objectStore("todos");
        if (full) store.clear();
        for (const todo of todos) store.put(todo);
        tx.objectStore("meta").put(meta, META_KEY);
        return () => undefined;
      }),
    clear: () =>
      transact(db, ["todos", "outbox", "meta"], "readwrite", (tx) => {
        for (const name of ["todos", "outbox", "meta"]) tx.objectStore(name).clear();
        return () => undefined;
      }),
  };
}

/** Used when IndexedDB is unavailable (e.g. some private browsing modes): works the same until the page closes. */
function createMemoryStore(): LocalStore {
  let meta = EMPTY_META;
  let todos = new Map<string, Todo>();
  let outbox: OutboxEntry[] = [];
  let nextSeq = 1;
  return {
    load: async () => ({ meta, todos: [...todos.values()], outbox: [...outbox] }),
    peek: async (limit) => ({ meta, outbox: outbox.slice(0, limit) }),
    add: async (op) => {
      const entry = { seq: nextSeq++, op };
      outbox.push(entry);
      return entry;
    },
    commit: async (commit) => {
      const removed = new Set(commit.remove);
      outbox = outbox.filter((entry) => !removed.has(entry.seq));
      if (commit.full) todos = new Map();
      for (const todo of commit.todos) todos.set(todo.id, todo);
      meta = commit.meta;
    },
    clear: async () => {
      meta = EMPTY_META;
      todos = new Map();
      outbox = [];
    },
  };
}

export async function openLocalStore(): Promise<LocalStore> {
  try {
    return await openIndexedDbStore();
  } catch {
    return createMemoryStore();
  }
}