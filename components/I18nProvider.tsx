"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { errorMessage } from "@/lib/api-client";
import { HTML_LANG, LOCALE_COOKIE, MESSAGES, translateServerError, type Locale } from "@/lib/i18n";

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void };

const I18nContext = createContext<I18nContextValue | null>(null);

/** The server picks the first locale from the cookie or Accept-Language, so the first paint is already translated. */
export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = HTML_LANG[next];
    setLocaleState(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  const { locale, setLocale } = context;
  return {
    locale,
    setLocale,
    t: MESSAGES[locale],
    errorText: (error: unknown) => translateServerError(errorMessage(error), locale),
  };
}
