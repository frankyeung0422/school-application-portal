import Link from "next/link";
import { hkd } from "@/lib/format";
import { retailerName } from "@/lib/supermarket/retailers";
import type { RetailerRow } from "@/lib/supermarket/view";
import { AddToBasket } from "./basket";
import { NearestStore } from "./nearest-store";
import { promoTruth, TRUTH_TEXT } from "@/lib/supermarket/promo-truth";

/** One supermarket product with every chain's price side by side. */
export function SupermarketRow({
  product,
  rows,
  gapCents,
  savingVsTypicalCents = 0,
  outlierRetailers = [],
}: {
  product: { id: number; slug: string; title: string; titleEn: string | null; category: string | null };
  rows: RetailerRow[];
  gapCents: number;
  savingVsTypicalCents?: number;
  outlierRetailers?: string[];
}) {
  const cheapest = rows[0]?.shelfCents;
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/p/${product.slug}`} className="font-medium hover:text-brand-700">{product.title}</Link>
          {product.titleEn && product.titleEn !== product.title ? <div className="truncate text-xs text-slate-500">{product.titleEn}</div> : null}
          <div className="text-xs text-slate-400">{product.category}</div>
        </div>
        <div className="flex items-center gap-2">
          {savingVsTypicalCents > 0 ? (
            <span className="text-xs font-semibold text-emerald-700">比一般價慳 {hkd(savingVsTypicalCents)}</span>
          ) : rows.length >= 2 && gapCents > 0 ? (
            <span className="text-xs text-slate-500">差價 {hkd(gapCents)}</span>
          ) : null}
          <AddToBasket productId={product.id} title={product.title} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((r) => (
          <div
            key={r.retailer}
            className={`rounded-xl border px-3 py-1.5 text-sm ${r.shelfCents === cheapest ? "border-brand-500 bg-emerald-50" : "border-slate-200"}`}
          >
            <div className="text-xs text-slate-500">{retailerName(r.retailer)}</div>
            <div className="font-semibold tabular-nums">
              {r.shelfCents === cheapest ? (
                <NearestStore retailer={r.retailer} retailerName={retailerName(r.retailer)}>
                  {hkd(r.shelfCents)}
                </NearestStore>
              ) : (
                hkd(r.shelfCents)
              )}
            </div>
            {outlierRetailers.includes(r.retailer) ? (
              <div className="text-xs text-rose-600">異常低價，可能規格唔同 — verify</div>
            ) : null}
            {r.unit ? (
              <div className="text-xs text-slate-500">{r.unit.labelZh} {hkd(r.unit.cents)}</div>
            ) : null}
            {r.promoZh ? (
              <div className={`text-xs ${r.verdict?.kind === "WORSE" ? "text-rose-600" : "text-amber-700"}`}>
                {r.promoZh}
                {r.verdict?.kind === "WORSE"
                  ? ` · 按牌面價唔抵：買 ${r.verdict.qty} 件散裝平 ${hkd(-r.verdict.savingCents)}`
                  : r.deal
                    ? ` → 每件 ${hkd(r.deal.unitCents)}`
                    : ""}
                {(() => {
                  const t = promoTruth(r.verdict);
                  return t && t.label !== "FAKE" ? (
                    <span className={`ml-1 rounded px-1 font-semibold ${t.label === "REAL" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{TRUTH_TEXT[t.label](t)}</span>
                  ) : t ? (
                    <span className="ml-1 rounded bg-rose-50 px-1 font-semibold text-rose-700">假優惠</span>
                  ) : null;
                })()}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
