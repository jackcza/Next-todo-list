"use client";

import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import { useEffect, type ReactNode } from "react";
import { I18nProvider, useI18n } from "@/components/I18nProvider";
import { DAYJS_LOCALE } from "@/lib/date";
import type { Locale } from "@/lib/i18n";

const ANTD_LOCALE = { en: enUS, zh: zhCN };

function LocalizedApp({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  // antd's Calendar reads weekday and month names from the global dayjs locale. Only the browser sets it,
  // because the server module is shared between requests in different languages.
  if (typeof window !== "undefined") dayjs.locale(DAYJS_LOCALE[locale]);

  return (
    <ConfigProvider locale={ANTD_LOCALE[locale]} theme={{ token: { colorPrimary: "#6366f1", borderRadius: 10 } }}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

export default function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    // iOS Safari ignores user-scalable=no, so pinch zoom has to be blocked here.
    const preventGesture = (event: Event) => event.preventDefault();
    const preventPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("touchmove", preventPinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("touchmove", preventPinch);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
    } else {
      // A worker left over from a production run would serve stale assets and break hot reload.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
    }
  }, []);

  return (
    <I18nProvider initialLocale={locale}>
      <LocalizedApp>{children}</LocalizedApp>
    </I18nProvider>
  );
}
