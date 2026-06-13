import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "EBTCM — 實證中醫藥臨床參考平台",
  description:
    "首個系統性應用GRADE證據分級的中醫藥臨床決策支援平台。搜尋中藥、方劑、針灸穴位、辨證分型，瀏覽經GRADE分級的臨床證據。",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getMessages(locale);

  return (
    <html
      lang={locale === "zh-Hant" ? "zh-Hant" : "en"}
      data-locale={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansTc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <I18nProvider locale={locale} messages={messages}>
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-border bg-surface py-6 px-4 text-center text-sm text-muted">
              <p>{t(messages, "footer.line1")}</p>
              <p className="mt-1">{t(messages, "footer.line2")}</p>
            </footer>
          </I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
