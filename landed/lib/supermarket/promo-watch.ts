// "Tell me when it goes on offer" for supermarket items. Pure; tests/promo-watch.test.ts.
//
// A PROMO watch remembers the set of promotions it last saw (a signature). It
// fires only for a promotion that is new since then and actually beats buying
// singles — the same promo running for a month is announced once.

export interface PromoRow {
  retailer: string;
  inStock: boolean;
  promo: string | null;
  /** Non-null when the promotion beats buying singles (rowsFromOffers().deal). */
  dealUnitCents: number | null;
}

const entry = (r: PromoRow) => `${r.retailer}:${(r.promo ?? "").trim()}`;

function livePromos(rows: PromoRow[]): PromoRow[] {
  return rows.filter((r) => r.inStock && r.promo && r.dealUnitCents != null);
}

/** Stable signature of the promotions running now ("" when none). */
export function promoKey(rows: PromoRow[]): string {
  return [...new Set(livePromos(rows).map(entry))].sort().join("|");
}

/** Promotions in `rows` that were not in the signature last told. */
export function newPromos(lastKey: string | null, rows: PromoRow[]): PromoRow[] {
  const seen = new Set((lastKey ?? "").split("|").filter(Boolean));
  const out = new Map<string, PromoRow>();
  for (const r of livePromos(rows)) if (!seen.has(entry(r))) out.set(entry(r), r);
  // Best deal first.
  return [...out.values()].sort((a, b) => (a.dealUnitCents ?? 0) - (b.dealUnitCents ?? 0));
}
