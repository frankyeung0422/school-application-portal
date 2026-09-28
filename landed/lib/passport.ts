// Price Passport — "buy now or wait?" from the product's own history. Pure;
// tests/passport.test.ts. With too little history we say so rather than
// inventing a signal.

export type BuySignal = "BUY_NOW" | "FAIR" | "WAIT" | "NOT_ENOUGH_DATA";

export interface PassportInput {
  /** Best landed price per day (HKD cents), any order. */
  dailyBestCents: number[];
  currentCents: number;
}

export interface PassportResult {
  signal: BuySignal;
  lowCents: number | null;
  medianCents: number | null;
  highCents: number | null;
  /** (current − low) ÷ low. */
  pctAboveLow: number | null;
  days: number;
  explanation: string;
}

export const MIN_DAYS_FOR_SIGNAL = 7;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function buySignal(input: PassportInput): PassportResult {
  const days = input.dailyBestCents.filter((x) => x > 0);
  if (days.length < MIN_DAYS_FOR_SIGNAL) {
    return {
      signal: "NOT_ENOUGH_DATA",
      lowCents: days.length ? Math.min(...days) : null,
      medianCents: days.length ? median(days) : null,
      highCents: days.length ? Math.max(...days) : null,
      pctAboveLow: null,
      days: days.length,
      explanation: `只有 ${days.length} 日價格紀錄，需要至少 ${MIN_DAYS_FOR_SIGNAL} 日先有建議 — not enough history yet`,
    };
  }
  const low = Math.min(...days, input.currentCents);
  const med = median(days);
  const high = Math.max(...days);
  const pctAboveLow = (input.currentCents - low) / low;

  let signal: BuySignal;
  let explanation: string;
  if (input.currentCents <= low * 1.03) {
    signal = "BUY_NOW";
    explanation = `接近 ${days.length} 日最低價 — within 3% of the ${days.length}-day low`;
  } else if (input.currentCents <= med) {
    signal = "FAIR";
    explanation = `低於 ${days.length} 日中位數 — at or below the median`;
  } else {
    signal = "WAIT";
    explanation = `比 ${days.length} 日最低價高 ${(pctAboveLow * 100).toFixed(0)}% — above the median; history suggests it drops`;
  }
  return { signal, lowCents: low, medianCents: med, highCents: high, pctAboveLow, days: days.length, explanation };
}
