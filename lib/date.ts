import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { useSyncExternalStore } from "react";
import type { Locale, Messages } from "@/lib/i18n";

const DATE_KEY_FORMAT = "YYYY-MM-DD";

export const DAYJS_LOCALE: Record<Locale, string> = { en: "en", zh: "zh-cn" };

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

type DateMessages = Messages["date"];

export function formatDay(dateKey: string, today: string, t: DateMessages, locale: Locale) {
  const day = dayjs(dateKey).locale(DAYJS_LOCALE[locale]);
  const sameYear = day.year() === dayjs(today).year();
  const relative = { [-1]: t.yesterday, 0: t.today, 1: t.tomorrow }[day.diff(dayjs(today), "day")];
  return relative
    ? { label: relative, detail: day.format(sameYear ? t.short : t.shortYear) }
    : { label: day.format(sameYear ? t.weekday : t.weekdayYear), detail: null };
}

/** Time only when the timestamp falls on `dateKey`, otherwise prefixed with its date. */
export function formatStamp(iso: string, dateKey: string, t: DateMessages) {
  const time = dayjs(iso);
  if (toDateKey(time) === dateKey) return time.format("HH:mm");
  return time.format(`${time.year() === dayjs(dateKey).year() ? t.short : t.shortYear} HH:mm`);
}
