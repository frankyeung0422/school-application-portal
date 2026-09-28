// "Your comparisons": for each outbound click, the price the shopper went to vs
// the median of the sources we had checked at that moment. Pure; tests/tally.test.ts.
//
// This is a COMPARISON, never "you saved": we do not know what they paid, or
// whether they would have bought the median-priced option at all.

export interface ClickRow {
  landedHkdCents: number | null;
  medianHkdCents: number | null;
}

export function median(xs: number[]): number | null {
  const s = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function comparisonTally(rows: ClickRow[]): { comparisons: number; belowTypical: number; belowTypicalCents: number } {
  let belowTypical = 0;
  let belowTypicalCents = 0;
  for (const r of rows) {
    if (r.landedHkdCents == null || r.medianHkdCents == null) continue;
    const gap = r.medianHkdCents - r.landedHkdCents;
    if (gap > 0) {
      belowTypical++;
      belowTypicalCents += gap;
    }
  }
  return { comparisons: rows.length, belowTypical, belowTypicalCents };
}
