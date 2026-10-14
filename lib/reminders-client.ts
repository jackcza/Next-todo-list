import { useEffect } from "react";
import { requestJson } from "@/lib/api-client";
import type { Locale } from "@/lib/i18n";
import { STATUS, type Todo } from "@/lib/todo";

/** Same lead time as REMINDER_MINUTES in lib/push.ts (which can't be imported here, it pulls in the database). */
export const REMINDER_MINUTES = 15;

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "supported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  return ios ? "ios-needs-install" : "unsupported";
}

function toKey(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** The service worker is only registered in production builds, so in dev this is null. */
async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? null;
}

export async function currentSubscription() {
  return (await registration())?.pushManager.getSubscription() ?? null;
}

function subscriptionBody(subscription: PushSubscription, locale: Locale, confirm: boolean) {
  return { ...subscription.toJSON(), locale, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, confirm };
}

export type EnableResult = "enabled" | "denied" | "unsupported";

/** Asks for permission, subscribes this browser and registers it; the server sends a test notification. */
export async function enablePush(publicKey: string, locale: Locale): Promise<EnableResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const reg = await registration();
  if (!reg) return "unsupported";
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }));
  try {
    await requestJson("/api/push", { method: "POST", body: subscriptionBody(subscription, locale, true) });
  } catch (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
  return "enabled";
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await requestJson("/api/push", { method: "DELETE", body: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => false);
}

/** Re-attaches an existing subscription to whoever is logged in now, with the current language. */
export async function refreshPush(subscription: PushSubscription, locale: Locale) {
  await requestJson("/api/push", { method: "POST", body: subscriptionBody(subscription, locale, false) });
}

const SHOWN_KEY = "todo-next-reminded";

function readShown(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function dueTime(todo: Todo) {
  return todo.time ? new Date(`${todo.date}T${todo.time}:00`).getTime() : null;
}

/**
 * While the page is open, calls `show` for each active task starting within REMINDER_MINUTES. Used on devices
 * without push; with push the service worker shows the notification instead. What was shown is kept in
 * localStorage, so other tabs and reloads don't repeat it, and moving the task's time re-arms it.
 */
export function useInAppReminders(todos: Todo[], enabled: boolean, show: (todo: Todo, minutes: number) => void) {
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = Date.now();
      const shown = readShown();
      let changed = false;
      for (const [key, due] of Object.entries(shown)) {
        if (due < now - 24 * 60 * 60 * 1000) {
          delete shown[key];
          changed = true;
        }
      }
      for (const todo of todos) {
        const due = dueTime(todo);
        if (todo.status !== STATUS.IS_CREATE || due === null) continue;
        const key = `${todo.id}|${todo.date} ${todo.time}`;
        if (shown[key] || due <= now || due - now > REMINDER_MINUTES * 60_000) continue;
        shown[key] = due;
        changed = true;
        show(todo, Math.max(1, Math.ceil((due - now) / 60_000)));
      }
      if (changed) localStorage.setItem(SHOWN_KEY, JSON.stringify(shown));
    };
    check();
    const timer = window.setInterval(check, 20_000);
    return () => window.clearInterval(timer);
  }, [todos, enabled, show]);
}
