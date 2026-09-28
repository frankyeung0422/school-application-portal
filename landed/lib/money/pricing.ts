// What we charge when we fulfil. Pure; tests/pricing.test.ts.
//
// Our price has to clear two bars at once: it must pay for the complete cost
// (supplier via the cheap rail, shipping, forwarding, AND our own checkout
// processor's fee — the one everyone forgets) with a margin, and it must still
// be worth it to a buyer who could order the same thing themselves by card.
// When it cannot clear both, `viable` is false and the product stays affiliate.

export interface CheckoutFees {
  /** Card processor % on our own checkout, e.g. Stripe HK ≈ 0.034. */
  pct: number;
  fixedCents: number;
}

export const DEFAULT_CHECKOUT_FEES: CheckoutFees = { pct: 0.034, fixedCents: 235 };

export interface StorefrontPriceInput {
  /** Our all-in supplier cost for the order via the settlement rail. */
  costCents: number;
  /** The buyer's own best landed route (paying by HK card), same quantity. */
  buyerRouteCents: number | null;
  targetMarginPct: number;
  checkoutFees?: CheckoutFees;
}

export interface StorefrontPrice {
  priceCents: number;
  marginCents: number;
  marginPct: number;
  checkoutFeeCents: number;
  beatsBuyerRouteByCents: number | null;
  viable: boolean;
  reason: string | null;
}

export function checkoutFeeCents(priceCents: number, fees: CheckoutFees): number {
  return Math.round(priceCents * fees.pct) + fees.fixedCents;
}

export function marginAt(priceCents: number, costCents: number, fees: CheckoutFees) {
  const fee = checkoutFeeCents(priceCents, fees);
  const marginCents = priceCents - fee - costCents;
  return { marginCents, marginPct: priceCents > 0 ? marginCents / priceCents : 0, fee };
}

export function storefrontPrice(input: StorefrontPriceInput): StorefrontPrice {
  const fees = input.checkoutFees ?? DEFAULT_CHECKOUT_FEES;
  const denom = 1 - fees.pct - input.targetMarginPct;
  if (denom <= 0) throw new Error("fees + target margin must be < 100%");
  const raw = (input.costCents + fees.fixedCents) / denom;
  // Whole dollars — HK$129, not HK$128.37.
  const priceCents = Math.ceil(raw / 100) * 100;
  const m = marginAt(priceCents, input.costCents, fees);
  const beats = input.buyerRouteCents == null ? null : input.buyerRouteCents - priceCents;

  let reason: string | null = null;
  if (beats != null && beats < 0) {
    reason = `比買家自己買貴 HK$${(-beats / 100).toFixed(2)} — dearer than the buyer's own route`;
  }
  return {
    priceCents,
    marginCents: m.marginCents,
    marginPct: m.marginPct,
    checkoutFeeCents: m.fee,
    beatsBuyerRouteByCents: beats,
    viable: reason === null && m.marginCents > 0,
    reason,
  };
}
