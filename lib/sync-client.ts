import { openLocalStore, type LocalMeta, type LocalStore, type OutboxEntry } from "@/lib/local-store";
import type { SyncResponse } from "@/lib/sync-server";
import type { Todo } from "@/lib/todo";
import { MAX_SYNC_OPS, projectOps, type SyncOp } from "@/lib/todo-ops";

/**
 * Local-first sync. Changes go into the local outbox and show up at once; the engine sends them to
 * POST /api/sync in order and pulls whatever other devices changed. It syncs on start, after a change, when the
 * connection comes back, when the tab becomes visible and every 30 seconds while it is visible. Tabs share the
 * local database; a Web Lock lets one of them sync at a time and a BroadcastChannel tells the others to reload.
 */

export type SyncStatus = "idle" | "syncing" | "offline" | "error" | "auth";

export type SyncView = { todos: Todo[]; points: number; pending: number; status: SyncStatus };

/** What the server rendered the page with. */
export type Snapshot = { userId: string; todos: Todo[]; cursor: string; points: number };

export type SyncNotice = { type: "rejected"; errors: string[] } | { type: "discarded"; count: number };

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type OpInput = DistributiveOmit<SyncOp, "id" | "at">;

const CHANNEL = "todo-next-sync";
const LOCK = "todo-next-sync";
const PAGES_CACHE = "todo-pages";
const RETRY_SECONDS = [2, 5, 10, 30, 60];
const POLL_MS = 30_000;
const DEBOUNCE_MS = 300;
const REQUEST_TIMEOUT_MS = 30_000;

type Message = { type: "changed" } | { type: "logout" };

export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // randomUUID only exists on https and localhost; this covers plain http, e.g. testing on a phone over the LAN.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isNewer(cursor: string, than: string | null) {
  return than === null || BigInt(cursor) > BigInt(than);
}

export class SyncEngine {
  private store: LocalStore | null = null;
  /** Local database work runs one step at a time, in the order it was requested. */
  private chain: Promise<unknown> = Promise.resolve();
  private base: Todo[];
  private basePoints: number;
  private saved: OutboxEntry[] = [];
  /** Queued in memory, waiting for the local database write. */
  private unsaved: SyncOp[] = [];
  private status: SyncStatus = "idle";
  private view: SyncView;
  private running: Promise<void> | null = null;
  private again = false;
  private failures = 0;
  private stopped = true;
  private channel: BroadcastChannel | null = null;
  private timers = { debounce: 0, retry: 0, poll: 0 };
  private listeners = new Set<() => void>();
  private noticeListeners = new Set<(notice: SyncNotice) => void>();
  private cleanup: (() => void)[] = [];
  private onLogout: () => void = () => undefined;

  constructor(private snapshot: Snapshot) {
    this.base = snapshot.todos;
    this.basePoints = snapshot.points;
    this.view = { todos: snapshot.todos, points: snapshot.points, pending: 0, status: "idle" };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getView = () => this.view;

  onNotice(listener: (notice: SyncNotice) => void) {
    this.noticeListeners.add(listener);
    return () => void this.noticeListeners.delete(listener);
  }

  /**
   * `onLogout` runs when another tab logs out. Returns the function that stops the engine, so it fits a
   * React effect (which may start and stop it twice in dev).
   */
  start(onLogout: () => void) {
    this.stopped = false;
    this.onLogout = onLogout;
    this.run(() => this.init());

    const listen = <K extends keyof WindowEventMap>(name: K, handler: () => void) => {
      window.addEventListener(name, handler);
      this.cleanup.push(() => window.removeEventListener(name, handler));
    };
    listen("online", () => void this.syncNow());
    listen("offline", () => this.setStatus("offline"));
    const onVisible = () => {
      if (document.visibilityState === "visible") void this.syncNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    this.cleanup.push(() => document.removeEventListener("visibilitychange", onVisible));
    this.timers.poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void this.syncNow();
    }, POLL_MS);

    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event: MessageEvent<Message>) => {
        if (event.data.type === "logout") this.onLogout();
        else this.run(() => this.reload());
      };
    }

    return () => this.stop();
  }

  private stop() {
    this.stopped = true;
    for (const fn of this.cleanup.splice(0)) fn();
    window.clearTimeout(this.timers.debounce);
    window.clearTimeout(this.timers.retry);
    window.clearInterval(this.timers.poll);
    this.channel?.close();
    this.channel = null;
  }

  /** Applies a change locally right away and queues it for the server. */
  enqueue(input: OpInput) {
    const op = { ...input, id: newId(), at: new Date().toISOString() } as SyncOp;
    this.unsaved.push(op);
    this.emit();
    this.run(async () => {
      const entry = await this.store!.add(op);
      this.unsaved = this.unsaved.filter((item) => item !== op);
      this.saved.push(entry);
      this.emit();
      this.broadcast({ type: "changed" });
      this.scheduleSync(DEBOUNCE_MS);
    });
  }

  /** Sends everything queued and pulls changes; resolves when done. `wait` queues behind another tab's sync. */
  syncNow(wait = false): Promise<void> {
    window.clearTimeout(this.timers.debounce);
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      do {
        this.again = false;
        await this.syncOnce(wait);
      } while (this.again && !this.stopped);
    })().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Forgets this user's local data, in every tab, and the pages saved for offline use. */
  async clearLocal() {
    await this.run(async () => {
      await this.store?.clear();
      this.base = [];
      this.basePoints = 0;
      this.saved = [];
      this.unsaved = [];
    });
    this.broadcast({ type: "logout" });
    if (typeof caches !== "undefined") await caches.delete(PAGES_CACHE).catch(() => false);
  }

  private run<T>(step: () => Promise<T>) {
    const result = this.chain.then(step);
    this.chain = result.catch((error) => console.error("Local task storage failed:", error));
    return result;
  }

  private async init() {
    navigator.storage?.persist?.().catch(() => false);
    this.store = await openLocalStore();
    const local = await this.store.load();
    const snap = this.snapshot;
    const meta: LocalMeta = { userId: snap.userId, cursor: snap.cursor, points: snap.points };

    if (local.meta.userId !== snap.userId) {
      if (local.meta.userId && local.outbox.length > 0) {
        this.notify({ type: "discarded", count: local.outbox.length });
      }
      await this.store.commit({ remove: local.outbox.map((entry) => entry.seq), todos: snap.todos, full: true, meta });
    } else if (isNewer(snap.cursor, local.meta.cursor)) {
      // The page is newer than the local copy, e.g. another device synced since this one was last open.
      await this.store.commit({ remove: [], todos: snap.todos, full: true, meta });
    }
    await this.reload();
    if (!navigator.onLine) this.setStatus("offline");
    void this.syncNow();
  }

  private async reload() {
    if (!this.store) return;
    const { meta, todos, outbox } = await this.store.load();
    this.base = todos;
    this.basePoints = meta.points;
    this.saved = outbox;
    this.emit();
    if (outbox.length > 0) this.scheduleSync(DEBOUNCE_MS);
  }

  private async syncOnce(wait: boolean) {
    if (this.stopped || !this.store) return;
    if (!navigator.onLine) {
      this.setStatus("offline");
      return;
    }
    if (!navigator.locks) {
      await this.pushPull();
      return;
    }
    await navigator.locks.request(LOCK, { ifAvailable: !wait }, async (lock) => {
      if (lock) await this.pushPull();
    });
  }

  private async pushPull() {
    window.clearTimeout(this.timers.retry);
    this.setStatus("syncing");
    try {
      for (;;) {
        const { meta, outbox } = await this.run(() => this.store!.peek(MAX_SYNC_OPS + 1));
        const batch = outbox.slice(0, MAX_SYNC_OPS);
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ops: batch.map((entry) => entry.op), since: meta.cursor }),
          signal: AbortSignal.timeout?.(REQUEST_TIMEOUT_MS),
        });
        if (response.status === 401) {
          this.setStatus("auth");
          return;
        }
        if (!response.ok) throw new Error(`Sync failed with status ${response.status}.`);
        const data = (await response.json()) as SyncResponse;

        await this.run(async () => {
          await this.store!.commit({
            remove: batch.map((entry) => entry.seq),
            todos: data.todos,
            full: data.full,
            meta: { ...meta, cursor: data.cursor, points: data.points },
          });
          await this.reload();
        });
        this.broadcast({ type: "changed" });
        const errors = data.results.flatMap((result) => (result.ok ? [] : [result.error]));
        if (errors.length > 0) this.notify({ type: "rejected", errors });
        if (outbox.length <= MAX_SYNC_OPS || this.stopped) break;
      }
      this.failures = 0;
      this.setStatus("idle");
    } catch (error) {
      if (this.stopped) return;
      if (!navigator.onLine) {
        this.setStatus("offline");
        return;
      }
      console.error(error);
      this.setStatus("error");
      const delay = RETRY_SECONDS[Math.min(this.failures, RETRY_SECONDS.length - 1)];
      this.failures += 1;
      this.timers.retry = window.setTimeout(() => void this.syncNow(), delay * 1000);
    }
  }

  private scheduleSync(delay: number) {
    if (this.stopped || this.status === "auth") return;
    window.clearTimeout(this.timers.debounce);
    this.timers.debounce = window.setTimeout(() => void this.syncNow(), delay);
  }

  private setStatus(status: SyncStatus) {
    if (this.status === status) return;
    this.status = status;
    this.emit();
  }

  private emit() {
    const ops = [...this.saved.map((entry) => entry.op), ...this.unsaved];
    const { todos, points } = projectOps(this.base, this.basePoints, ops);
    this.view = { todos, points, pending: ops.length, status: this.status };
    for (const listener of this.listeners) listener();
  }

  private notify(notice: SyncNotice) {
    for (const listener of this.noticeListeners) listener(notice);
  }

  private broadcast(message: Message) {
    this.channel?.postMessage(message);
  }
}
