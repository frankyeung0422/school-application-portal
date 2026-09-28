import type { Metadata } from "next";
import Link from "next/link";
import { currentCustomer } from "@/lib/auth";
import { BasketBadge } from "@/components/storefront/basket";
import { AnalyticsBeacon } from "@/components/analytics-beacon";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "到手價 Landed",
  title: "到手價 Landed — 真正送到你門口嘅最平價",
  description:
    "Compare the delivered-to-Hong-Kong price of any product across AliExpress, Amazon, eBay, Taobao and 1688 — shipping, forwarding and card FX included.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const customer = await currentCustomer();
  return (
    <html lang="zh-HK">
      <body className="min-h-screen antialiased">
        <AnalyticsBeacon />
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight text-brand-700">到手價</span>
              <span className="text-sm font-semibold text-slate-500">Landed</span>
            </Link>
            <nav className="flex flex-1 flex-wrap items-center gap-4 text-sm text-slate-600">
              <Link href="/search" className="hover:text-slate-900">搜尋 Search</Link>
              <Link href="/supermarket" className="hover:text-slate-900">超市格價</Link>
              <Link href="/travel" className="hover:text-slate-900">機票酒店</Link>
              <Link href="/near" className="hover:text-slate-900">附近抵買</Link>
              <Link href="/instore" className="hidden hover:text-slate-900 sm:inline">門市實價</Link>
              <Link href="/luxury" className="hidden hover:text-slate-900 sm:inline">奢侈品 Luxury</Link>
              <BasketBadge />
              <Link href="/pools" className="hover:text-slate-900">拼單 Pools</Link>
              <Link href="/how" className="hidden hover:text-slate-900 sm:inline">點計 How it works</Link>
            </nav>
            <nav className="flex items-center gap-3 text-sm">
              {customer?.isAdmin ? (
                <Link href="/admin" className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white">管理 Admin</Link>
              ) : null}
              {customer ? (
                <Link href="/account" className="text-slate-700 hover:text-slate-900">我的帳戶</Link>
              ) : (
                <Link href="/login" className="text-slate-700 hover:text-slate-900">登入 Sign in</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 text-xs text-slate-500 sm:grid-cols-3">
            <p>
              到手價 = 貨價 + 運費 + 集運 + 外幣手續費。我哋只講可以證明嘅說法：「我哋喺某時間查咗 N 個來源，呢個最平」。
            </p>
            <p>
              Prices are checked at the time shown on each page and may change at the source. Outbound links may earn us a commission.
            </p>
            <p>
              <Link href="/privacy" className="underline">私隱政策 Privacy (PDPO)</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
