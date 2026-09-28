"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DELIVERY_LABEL, PAY_LABEL, PREFS_COOKIE, serializePrefs, type BuyerPrefs, type PayMethod } from "@/lib/buyer-prefs";

/** How I pay / collect: re-ranks the sources for this shopper (a cookie, no account needed). */
export function BuyerPrefsToggle({ pay, delivery }: BuyerPrefs) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function set(next: BuyerPrefs) {
    document.cookie = `${PREFS_COOKIE}=${serializePrefs(next)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    start(() => router.refresh());
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${pending ? "opacity-60" : ""}`}>
      <span className="text-slate-500">我用</span>
      <select className="rounded border border-slate-300 bg-white px-1.5 py-0.5" value={pay} onChange={(e) => set({ pay: e.target.value as PayMethod, delivery })} aria-label="Payment method">
        {(Object.keys(PAY_LABEL) as PayMethod[]).map((p) => (
          <option key={p} value={p}>{PAY_LABEL[p]}</option>
        ))}
      </select>
      <span className="text-slate-500">付款，</span>
      <select className="rounded border border-slate-300 bg-white px-1.5 py-0.5" value={delivery} onChange={(e) => set({ pay, delivery: e.target.value as BuyerPrefs["delivery"] })} aria-label="Delivery">
        {(Object.keys(DELIVERY_LABEL) as BuyerPrefs["delivery"][]).map((d) => (
          <option key={d} value={d}>{DELIVERY_LABEL[d]}</option>
        ))}
      </select>
      <span className="text-slate-400">— 到手價會跟住重新計</span>
    </div>
  );
}
