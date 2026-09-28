// The evidence gate between "we point you at the cheapest seller" (affiliate,
// no risk) and "pay us and we deliver it" (fulfil, we carry refunds, customs
// and supplier failure). Pure; tests/eligibility.test.ts.
//
// A product only earns our checkout when people demonstrably want it, we are
// sure every source is the same thing, somebody can actually fulfil it, and
// the margin survives the complete landed cost. Passing the gate does not flip
// the switch — it makes an ENABLE_FULFIL action a human approves.

export interface EligibilityEvidence {
  watches14d: number;
  clicks14d: number;
  /** Best match confidence of the offer we would fulfil from. */
  fulfilMatchConfidence: number | null;
  hasFulfilSupplier: boolean;
  /** Our margin at today's landed cost via the settlement rail. */
  liveMarginPct: number | null;
  /** How much cheaper our price is than the buyer's own best landed route. */
  beatsBuyerRouteByCents: number | null;
  restricted: boolean;
  restrictedReason?: string | null;
  priceAgeHours: number | null;
}

export interface EligibilityThresholds {
  minWatches: number;
  minClicks: number;
  minMatch: number;
  minMarginPct: number;
  maxPriceAgeHours: number;
}

export const DEFAULT_THRESHOLDS: EligibilityThresholds = {
  minWatches: 5,
  minClicks: 20,
  minMatch: 0.85,
  minMarginPct: 0.08,
  maxPriceAgeHours: 48,
};

export function isFulfilEligible(
  ev: EligibilityEvidence,
  t: EligibilityThresholds = DEFAULT_THRESHOLDS,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (ev.restricted) {
    missing.push(`受限類別：${ev.restrictedReason ?? "restricted"} — restricted category, never fulfilled`);
  }
  if (ev.watches14d < t.minWatches && ev.clicks14d < t.minClicks) {
    missing.push(
      `需求不足：14 日內 ${ev.watches14d}/${t.minWatches} 個關注或 ${ev.clicks14d}/${t.minClicks} 次點擊 — not enough demand`,
    );
  }
  if (ev.fulfilMatchConfidence == null || ev.fulfilMatchConfidence < t.minMatch) {
    missing.push(
      `同款未確認：置信度 ${ev.fulfilMatchConfidence?.toFixed(2) ?? "—"} < ${t.minMatch}（需圖片比對或人手核實）— match not verified`,
    );
  }
  if (!ev.hasFulfilSupplier) {
    missing.push("冇可落單供應商：全部來源只支援聯盟連結 — no supplier we can place orders with");
  }
  if (ev.liveMarginPct == null || ev.liveMarginPct < t.minMarginPct) {
    missing.push(
      `利潤不足：${ev.liveMarginPct == null ? "—" : (ev.liveMarginPct * 100).toFixed(1) + "%"} < ${(t.minMarginPct * 100).toFixed(0)}% — margin below floor at real landed cost`,
    );
  }
  if (ev.beatsBuyerRouteByCents != null && ev.beatsBuyerRouteByCents < 0) {
    missing.push("我哋售價高過買家自己買嘅到手價 — our price is above the buyer's own route");
  }
  if (ev.priceAgeHours == null || ev.priceAgeHours > t.maxPriceAgeHours) {
    missing.push(`價格過舊：${ev.priceAgeHours == null ? "未有" : Math.round(ev.priceAgeHours) + " 小時"} — price must be re-checked within ${t.maxPriceAgeHours}h`);
  }
  return { ok: missing.length === 0, missing };
}
