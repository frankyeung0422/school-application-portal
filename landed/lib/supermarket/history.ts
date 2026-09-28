// What a price history can say that a price cannot. Pure;
// tests/history.test.ts.
//
// Two questions shoppers actually ask: "is this the same pack it used to be?"
// and "if I wait, will it go on offer?". Both need several weeks of daily
// snapshots, so both refuse to answer until the evidence exists — the same rule
// as buySignal in lib/passport.ts.

export interface HistoryPoint {
  day: string; // YYYY-MM-DD
  priceCents: number;
  /** Canonical size that day, e.g. "250g" — null when the title stated none. */
  unitSizeLabel: string | null;
  /** Size in base units (ml / g / pieces), for comparing across a relabel. */
  unitSizeValue: number | null;
  promoText: string | null;
}

// ── Shrinkflation ───────────────────────────────────────────────────────────

export interface Shrinkflation {
  fromLabel: string;
  toLabel: string;
  fromValue: number;
  toValue: number;
  /** Size cut, e.g. 0.12 for 250g → 220g. */
  shrankBy: number;
  /** Change in price per unit, e.g. 0.136 = 13.6% dearer per gram. */
  perUnitRise: number;
  priceThenCents: number;
  priceNowCents: number;
  changedOn: string;
}

/**
 * A pack that got smaller without getting cheaper. Only flagged when the size
 * actually shrank and the per-unit price rose — a genuine relabel (500g → 0.5kg)
 * has the same base value and is ignored.
 */
export function detectShrinkflation(points: HistoryPoint[]): Shrinkflation | null {
  const sized = points.filter((p) => p.unitSizeValue && p.unitSizeValue > 0 && p.priceCents > 0);
  if (sized.length < 2) return null;
  const latest = sized[sized.length - 1];
  // Walk back to the most recent point with a different size.
  for (let i = sized.length - 2; i >= 0; i--) {
    const prev = sized[i];
    if (prev.unitSizeValue === latest.unitSizeValue) continue;
    if (prev.unitSizeValue! <= latest.unitSizeValue!) return null; // grew, or grew back
    const perUnitThen = prev.priceCents / prev.unitSizeValue!;
    const perUnitNow = latest.priceCents / latest.unitSizeValue!;
    if (perUnitNow <= perUnitThen) return null; // smaller but cheaper per unit: not shrinkflation
    return {
      fromLabel: prev.unitSizeLabel ?? String(prev.unitSizeValue),
      toLabel: latest.unitSizeLabel ?? String(latest.unitSizeValue),
      fromValue: prev.unitSizeValue!,
      toValue: latest.unitSizeValue!,
      shrankBy: (prev.unitSizeValue! - latest.unitSizeValue!) / prev.unitSizeValue!,
      perUnitRise: (perUnitNow - perUnitThen) / perUnitThen,
      priceThenCents: prev.priceCents,
      priceNowCents: latest.priceCents,
      changedOn: sized[i + 1].day,
    };
  }
  return null;
}

// ── Promotion cadence ───────────────────────────────────────────────────────

export type CadenceVerdict = "NOT_ENOUGH_DATA" | "IRREGULAR" | "REGULAR";

export interface PromoCadence {
  verdict: CadenceVerdict;
  /** Completed promo cycles observed. */
  cycles: number;
  medianGapDays: number | null;
  daysSinceLastPromo: number | null;
  onPromoNow: boolean;
  /** Only when REGULAR: days until the next one is due (can be negative = overdue). */
  dueInDays: number | null;
  explanation: string;
}

/** At least this many completed gaps before we will call a rhythm a rhythm. */
export const MIN_CYCLES = 3;
/** Gaps must be this consistent (max ÷ min) to be called regular. */
const REGULARITY = 2;

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400_000);

export function promoCadence(points: HistoryPoint[], today?: string): PromoCadence {
  const days = [...points].sort((a, b) => a.day.localeCompare(b.day));
  if (days.length < 2) {
    return { verdict: "NOT_ENOUGH_DATA", cycles: 0, medianGapDays: null, daysSinceLastPromo: null, onPromoNow: false, dueInDays: null, explanation: "價格紀錄未夠 — not enough price history yet" };
  }
  // A promo "start" is a day with a promotion where the day before had none.
  const starts: string[] = [];
  for (let i = 0; i < days.length; i++) {
    const on = Boolean(days[i].promoText);
    const prevOn = i > 0 ? Boolean(days[i - 1].promoText) : false;
    if (on && !prevOn) starts.push(days[i].day);
  }
  const onPromoNow = Boolean(days[days.length - 1].promoText);
  const now = today ?? days[days.length - 1].day;
  const daysSinceLastPromo = starts.length ? dayNumber(now) - dayNumber(starts[starts.length - 1]) : null;

  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) gaps.push(dayNumber(starts[i]) - dayNumber(starts[i - 1]));
  if (gaps.length < MIN_CYCLES) {
    return {
      verdict: "NOT_ENOUGH_DATA",
      cycles: gaps.length,
      medianGapDays: null,
      daysSinceLastPromo,
      onPromoNow,
      dueInDays: null,
      explanation: `只見過 ${gaps.length} 個減價週期，需要 ${MIN_CYCLES} 個先講得準 — only ${gaps.length} promo cycles seen, need ${MIN_CYCLES}`,
    };
  }
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const regular = sorted[sorted.length - 1] <= sorted[0] * REGULARITY;
  return {
    verdict: regular ? "REGULAR" : "IRREGULAR",
    cycles: gaps.length,
    medianGapDays: median,
    daysSinceLastPromo,
    onPromoNow,
    dueInDays: regular && daysSinceLastPromo != null ? median - daysSinceLastPromo : null,
    explanation: regular
      ? `過去 ${gaps.length} 次減價，平均每 ${median} 日一次 — promotions roughly every ${median} days over ${gaps.length} cycles`
      : `減價時間唔規律（${sorted[0]}–${sorted[sorted.length - 1]} 日）— promotion timing is irregular`,
  };
}
