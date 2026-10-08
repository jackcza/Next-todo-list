"use client";

import { Segmented } from "antd";
import { useI18n } from "@/components/I18nProvider";
import type { Locale } from "@/lib/i18n";

const OPTIONS: { label: string; value: Locale }[] = [
  { label: "中文", value: "zh" },
  { label: "EN", value: "en" },
];

export default function LanguageSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="lang-switch">
      <Segmented<Locale> size="small" options={OPTIONS} value={locale} onChange={setLocale} />
    </div>
  );
}
