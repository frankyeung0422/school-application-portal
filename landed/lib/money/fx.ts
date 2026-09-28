// Pure FX maths. No DB access — tests/fx.test.ts.
//
// This is where "currency arbitrage" is made honest. We do not beat the
// market. We earn the difference between two real prices that exist today:
//   1. the rate a buyer is quoted (mid × (1 + disclosed buffer)), and
//   2. what it actually costs us to pay the supplier in their currency through
//      a cheap rail (Airwallex/Wise ≈ 0.3–0.6%) instead of a card (≈2–3%).
// If the market moves against us between quote and settlement, the "gain" is
// negative and is booked as negative. It is never smoothed or hidden.

/** HKD per 1 unit of each currency, e.g. { USD: 7.8, CNY: 1.08, HKD: 1 }. */
export type FxMids = Record<string, number>;

export interface Rail {
  name: string;
  /** Cost in basis points of the converted amount. */
  bps: number;
  minFeeHkdCents: number;
}

export function midFor(currency: string, mids: FxMids): number {
  if (currency === "HKD") return 1;
  const m = mids[currency];
  if (!m || !Number.isFinite(m) || m <= 0) {
    throw new Error(`No FX mid for ${currency}/HKD`);
  }
  return m;
}

/** Native amount → HKD at mid (float, HKD major units). */
export function toHkd(amount: number, currency: string, mids: FxMids): number {
  return amount * midFor(currency, mids);
}

export function toCents(hkd: number): number {
  return Math.round(hkd * 100);
}

/** The rate we quote a buyer: mid plus a disclosed buffer. */
export function customerRate(mid: number, bufferPct: number): number {
  if (bufferPct < 0) throw new Error("FX buffer cannot be negative");
  return mid * (1 + bufferPct);
}

/** Fee charged by a payment rail on an HKD-equivalent amount. */
export function settlementFeeCents(amountHkdCents: number, rail: Rail): number {
  if (amountHkdCents <= 0) return 0;
  return Math.max(rail.minFeeHkdCents, Math.round((amountHkdCents * rail.bps) / 10000));
}

export interface FxEconomicsInput {
  /** Supplier cost in the supplier's currency. */
  nativeAmount: number;
  currency: string;
  mids: FxMids;
  bufferPct: number;
  rail: Rail;
}

export interface FxEconomics {
  midCostHkdCents: number;
  /** What the buyer pays for the goods at our quoted rate. */
  quotedHkdCents: number;
  railFeeHkdCents: number;
  /** quoted − (mid cost + rail fee), at today's mid. Projection, not money. */
  expectedGainHkdCents: number;
}

export function fxEconomics(input: FxEconomicsInput): FxEconomics {
  const mid = midFor(input.currency, input.mids);
  if (input.currency === "HKD") {
    const cents = toCents(input.nativeAmount);
    return { midCostHkdCents: cents, quotedHkdCents: cents, railFeeHkdCents: 0, expectedGainHkdCents: 0 };
  }
  const midCostHkdCents = toCents(input.nativeAmount * mid);
  const quotedHkdCents = toCents(input.nativeAmount * customerRate(mid, input.bufferPct));
  const railFeeHkdCents = settlementFeeCents(midCostHkdCents, input.rail);
  return {
    midCostHkdCents,
    quotedHkdCents,
    railFeeHkdCents,
    expectedGainHkdCents: quotedHkdCents - midCostHkdCents - railFeeHkdCents,
  };
}

/**
 * Realised FX result once the supplier has actually been paid.
 * `settledHkdCents` is what left our account (conversion + rail fee), taken
 * from the rail's statement — not recomputed from a rate we hoped for.
 */
export function realisedFxGainCents(quotedHkdCents: number, settledHkdCents: number): number {
  return quotedHkdCents - settledHkdCents;
}
