import dayjs from "dayjs";
import { useSyncExternalStore } from "react";

const DATE_KEY_FORMAT = "YYYY-MM-DD";

/** 'YYYY-MM-DD' in the browser's local time zone. */
export function toDateKey(value: Date | dayjs.Dayjs = new Date()) {
  return dayjs(value).format(DATE_KEY_FORMAT);
}

function subscribeToDayChange(onChange: () => void) {
  const timer = setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/** Today's date key, or null during server rendering where the user's time zone is unknown. */
export function useToday() {
  return useSyncExternalStore(subscribeToDayChange, () => toDateKey(), () => null);
}

const RELATIVE_DAYS: Record<number, string> = { [-1]: "Yesterday", 0: "Today", 1: "Tomorrow" };

export function formatDay(dateKey: string, today: string) {
  const day = dayjs(dateKey);
  const sameYear = day.year() === dayjs(today).year();
  const relative = RELATIVE_DAYS[day.diff(dayjs(today), "day")];
  return relative
    ? { label: relative, detail: day.format(sameYear ? "MMM D" : "MMM D, YYYY") }
    : { label: day.format(sameYear ? "ddd, MMM D" : "ddd, MMM D, YYYY"), detail: null };
}

/** Time only when the timestamp falls on `dateKey`, otherwise prefixed with its date. */
export function formatStamp(iso: string, dateKey: string) {
  const time = dayjs(iso);
  if (toDateKey(time) === dateKey) return time.format("HH:mm");
  return time.format(time.year() === dayjs(dateKey).year() ? "MMM D HH:mm" : "MMM D, YYYY HH:mm");
}
