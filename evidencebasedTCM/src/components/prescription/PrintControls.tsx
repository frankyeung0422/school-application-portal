"use client";

import type { Locale } from "@/lib/i18n/types";

export function PrintControls({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  return (
    <div className="no-print mx-auto max-w-3xl px-4 py-4 flex flex-wrap gap-3 items-center justify-between print:hidden">
      <p className="text-sm text-muted">
        {isZh
          ? "預覽列印處方。瀏覽器列印時可選「另存為 PDF」。"
          : "Print preview. Use your browser's print dialog and choose 'Save as PDF'."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary-light"
        >
          🖨 {isZh ? "列印 / 另存 PDF" : "Print / Save PDF"}
        </button>
        <button
          onClick={() => history.back()}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          ← {isZh ? "返回" : "Back"}
        </button>
      </div>
    </div>
  );
}
