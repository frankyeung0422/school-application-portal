"use client";

import { useState } from "react";
import { trackEvent } from "@/components/analytics-beacon";

/** "Tell me about deals on 『keyword』" — new listings, drops under a target, real new promos. */
export function KeywordAlertForm({ keyword, defaultEmail, defaultMax }: { keyword: string; defaultEmail?: string; defaultMax?: number | null }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card flex flex-wrap items-center gap-2 border-brand-100 bg-emerald-50/60 p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const f = Object.fromEntries(new FormData(e.currentTarget).entries());
        const res = await fetch("/api/keyword-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, keyword }) });
        const data = (await res.json().catch(() => ({}))) as { error?: string; matchingNow?: number };
        setBusy(false);
        if (res.ok) trackEvent("watch");
        setMsg(res.ok ? { ok: true, text: `✓ 有新貨、減到目標價或者有真優惠就通知你（而家有 ${data.matchingNow ?? 0} 件符合）` } : { ok: false, text: data.error ?? "出錯" });
      }}
    >
      <span className="font-semibold">🔔 「{keyword}」有抵價通知我</span>
      <input name="email" type="email" required defaultValue={defaultEmail} placeholder="電郵 Email" className="input w-52" />
      <input name="max" type="number" min="1" step="1" defaultValue={defaultMax ? Math.round(defaultMax / 100) : undefined} placeholder="目標價 HK$（可選）" className="input w-40" />
      <button className="btn-primary py-1.5" disabled={busy}>{busy ? "…" : "通知我"}</button>
      {msg ? <span className={`w-full text-xs ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</span> : null}
    </form>
  );
}
