// "Worth buying now" — only when there is evidence. Pure; tests/deals.test.ts.
//
// Three kinds of evidence, each with a floor so noise never reads as a deal:
//   HISTORY_LOW  today is well below this product's own recent median
//                (needs weeks of daily prices — refuses to answer before that);
//   CROSS_CHAIN  one chain is well below what ≥3 other chains charge today
//                (low outliers are already excluded upstream as likely errors);
//   PROMO_CYCLE  on offer now, and past offers came round only every few weeks.
// Wording is fixed here so every card says the same true thing.

import type { PromoCadence } from "../supermarket/history";

export type DealKind = "HISTORY_LOW" | "CROSS_CHAIN" | "PROMO_CYCLE";

export interface DealReason {
  kind: DealKind;
  /** Saving vs the comparison price, in HKD cents (0 for PROMO_CYCLE). */
  savingCents: number;
  pct: number;
  text: string;
}

/** Days of distinct prices needed, and the span they must cover, before history is evidence. */
export const MIN_HISTORY_DAYS = 14;
export const MIN_HISTORY_SPAN_DAYS = 21;
export const HISTORY_DROP = 0.15;
export const CROSS_CHAIN_DROP = 0.2;
export const MIN_CHAINS = 3;
/** Savings below HK$3 are rounding, not a reason to buy. */
export const MIN_SAVING_CENTS = 300;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};
const span = (days: string[]) => (Date.parse(`${days[days.length - 1]}T00:00:00Z`) - Date.parse(`${days[0]}T00:00:00Z`)) / 86400_000;
const hk = (cents: number) => `HK$${(cents / 100).toFixed(cents % 100 ? 1 : 0)}`;

export function historyDeal(points: { day: string; priceCents: number }[], todayCents: number, windowDays = 90): DealReason | null {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day));
  const last = sorted[sorted.length - 1]?.day;
  if (!last) return null;
  const from = new Date(Date.parse(`${last}T00:00:00Z`) - windowDays * 86400_000).toISOString().slice(0, 10);
  const window = sorted.filter((p) => p.day >= from);
  if (window.length < MIN_HISTORY_DAYS || span(window.map((p) => p.day)) < MIN_HISTORY_SPAN_DAYS) return null;
  const med = median(window.map((p) => p.priceCents));
  const saving = med - todayCents;
  const pct = med > 0 ? saving / med : 0;
  if (pct < HISTORY_DROP || saving < MIN_SAVING_CENTS) return null;
  const lowest = todayCents <= Math.min(...window.map((p) => p.priceCents));
  return {
    kind: "HISTORY_LOW",
    savingCents: saving,
    pct,
    text: `比過去 ${Math.round(span(window.map((p) => p.day)))} 日中位數 ${hk(med)} 平 ${Math.round(pct * 100)}%${lowest ? "，係期內最低" : ""} · ${Math.round(pct * 100)}% below its ${windowDays}-day median`,
  };
}

export function crossChainDeal(input: { cheapestCents: number; medianCents: number; chains: number; cheapestChain: string }): DealReason | null {
  const { cheapestCents, medianCents, chains } = input;
  if (chains < MIN_CHAINS || medianCents <= 0) return null;
  const saving = medianCents - cheapestCents;
  const pct = saving / medianCents;
  if (pct < CROSS_CHAIN_DROP || saving < MIN_SAVING_CENTS) return null;
  return {
    kind: "CROSS_CHAIN",
    savingCents: saving,
    pct,
    text: `${input.cheapestChain}比 ${chains} 間連鎖店中位數 ${hk(medianCents)} 平 ${hk(saving)}（${Math.round(pct * 100)}%）· ${Math.round(pct * 100)}% below the ${chains}-chain median today`,
  };
}

/** On offer now, and offers have come round only every ≥ 14 days: waiting will not pay. */
export function promoCycleDeal(cadence: PromoCadence): DealReason | null {
  if (!cadence.onPromoNow || cadence.verdict !== "REGULAR" || cadence.medianGapDays == null || cadence.medianGapDays < 14) return null;
  return {
    kind: "PROMO_CYCLE",
    savingCents: 0,
    pct: 0,
    text: `而家減緊價；過去 ${cadence.cycles} 次減價大約每 ${cadence.medianGapDays} 日先有一次 · on offer now, and offers come round only every ~${cadence.medianGapDays} days`,
  };
}

/** Strongest evidence first: history beats a one-day cross-chain gap; bigger savings first. */
const KIND_WEIGHT: Record<DealKind, number> = { HISTORY_LOW: 3, CROSS_CHAIN: 2, PROMO_CYCLE: 1 };
export function dealStrength(reasons: DealReason[]): number {
  return reasons.reduce((s, r) => s + KIND_WEIGHT[r.kind] + r.pct, 0);
}
