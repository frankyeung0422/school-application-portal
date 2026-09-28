// Keyword deal alerts: which of a keyword's matching products are news. Pure;
// tests/keyword-alerts.test.ts. Everything already told (or already visible when
// the alert was made) is a "state key" in KeywordAlertHit, so nothing repeats.

export interface MatchState {
  productId: number;
  /** Current headline delivered/shelf price, HKD cents. */
  bestCents: number | null;
  /** promoKey() of the real promotions running now ("" when none). */
  promoKey: string;
}

export interface KeywordHit {
  productId: number;
  /** Every state key this message covers (recorded so none of them is announced again). */
  stateKeys: string[];
  reason: "NEW" | "UNDER_TARGET" | "PROMO";
}

/** The states a product is in right now — used to baseline a new alert silently. */
export function currentStateKeys(m: MatchState, maxCents: number | null): string[] {
  const keys = ["seen"];
  if (maxCents != null && m.bestCents != null && m.bestCents <= maxCents) keys.push("max");
  if (m.promoKey) keys.push(`promo:${m.promoKey}`);
  return keys;
}

/** News since the alert last looked: a product it has never seen, a drop under target, or a new real promotion. */
export function keywordHits(matches: MatchState[], told: Set<string>, maxCents: number | null): KeywordHit[] {
  const has = (productId: number, key: string) => told.has(`${productId}|${key}`);
  const out: KeywordHit[] = [];
  for (const m of matches) {
    if (!has(m.productId, "seen")) {
      // A brand-new match: announce once, as new (its current price/promo ride along in the message).
      out.push({ productId: m.productId, stateKeys: currentStateKeys(m, maxCents), reason: "NEW" });
      continue;
    }
    if (maxCents != null && m.bestCents != null && m.bestCents <= maxCents && !has(m.productId, "max")) {
      out.push({ productId: m.productId, stateKeys: ["max"], reason: "UNDER_TARGET" });
    }
    if (m.promoKey && !has(m.productId, `promo:${m.promoKey}`)) {
      out.push({ productId: m.productId, stateKeys: [`promo:${m.promoKey}`], reason: "PROMO" });
    }
  }
  return out;
}

/** "iphone 15" / "維他奶" — 2 to 60 characters after trimming. */
export function cleanKeyword(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim().replace(/\s+/g, " ");
  return k.length >= 2 && k.length <= 60 ? k : null;
}
