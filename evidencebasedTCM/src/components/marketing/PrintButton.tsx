"use client";

import type { Locale } from "@/lib/i18n/types";

export function PrintButton({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-primary text-white px-4 py-1.5 text-sm font-medium hover:bg-primary-light"
    >
      🖨 {isZh ? "列印 / 匯出 PDF" : "Print / Save as PDF"}
    </button>
  );
}
