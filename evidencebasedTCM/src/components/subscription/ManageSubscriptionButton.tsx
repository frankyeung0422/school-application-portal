"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/types";

export function ManageSubscriptionButton({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Failed to open portal");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={openPortal}
        disabled={loading}
        className="rounded-lg bg-primary text-white px-5 py-2 text-sm font-semibold hover:bg-primary-light disabled:opacity-60"
      >
        {loading
          ? (isZh ? "載入中…" : "Loading…")
          : (isZh ? "開啟客戶入口管理訂閱" : "Open Customer Portal")}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
