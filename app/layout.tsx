import type { Metadata, Viewport } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { cookies, headers } from "next/headers";
import Providers from "@/components/Providers";
import { HTML_LANG, LOCALE_COOKIE, detectLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todo List",
  description: "A todo list with email sign-up that remembers your tasks.",
  appleWebApp: {
    capable: true,
    title: "Todo List",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = detectLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get("accept-language"));

  return (
    <html lang={HTML_LANG[locale]}>
      <body>
        <AntdRegistry>
          <Providers locale={locale}>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
