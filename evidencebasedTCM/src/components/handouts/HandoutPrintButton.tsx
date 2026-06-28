"use client";

export function HandoutPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-light transition-colors"
    >
      🖨️ 列印 / Print
    </button>
  );
}
