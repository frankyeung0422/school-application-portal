// Supermarket promotion text → pricing rules → what N units actually cost.
// Pure; tests/supermarket.test.ts.
//
// The Price Watch feed gives promotions as free text ("2 for $14.00",
// "Buy 2 get 1 free", "第2件半價"). A shelf price alone ranks a $10 item with
// "2 for $14" behind a $7.50 item with no deal — wrong for anyone buying two.
// Rules are never stacked: the single best promotion for the quantity applies,
// and text we cannot parse is shown verbatim but never priced.

export type PromoRule =
  | { kind: "BUNDLE"; qty: number; totalCents: number }
  | { kind: "SAVE"; qty: number; saveCents: number }
  | { kind: "FREE"; buy: number; free: number }
  | { kind: "NTH_PCT"; nth: number; pctOff: number }
  | { kind: "NTH_PRICE"; nth: number; priceCents: number }
  | { kind: "GROUP_PCT"; qty: number; pctOff: number }
  | { kind: "MIN_PCT"; minQty: number; pctOff: number }
  | { kind: "PCT"; pctOff: number };

const money = (s: string) => Math.round(Number(s) * 100);
const pct = (s: string) => Number(s) / 100;

const PATTERNS: { re: RegExp; build: (m: RegExpMatchArray) => PromoRule }[] = [
  { re: /^buy\s+(\d+)\s+to\s+save\s+\$(\d+(?:\.\d+)?)$/i, build: (m) => ({ kind: "SAVE", qty: +m[1], saveCents: money(m[2]) }) },
  { re: /^(?:buy\s+)?(\d+)\s+(?:item\(s\)\s+)?(?:for|at)\s+\$(\d+(?:\.\d+)?)$/i, build: (m) => ({ kind: "BUNDLE", qty: +m[1], totalCents: money(m[2]) }) },
  { re: /^buy\s+(\d+)\s+get\s+(\d+)\s+free$/i, build: (m) => ({ kind: "FREE", buy: +m[1], free: +m[2] }) },
  { re: /^buy\s+(\d+)(?:st|nd|rd|th)\s+at\s+half\s+price$/i, build: (m) => ({ kind: "NTH_PCT", nth: +m[1], pctOff: 0.5 }) },
  { re: /^(\d+)(?:st|nd|rd|th)\s+(?:item\s+for\s+)?(\d+(?:\.\d+)?)%\s*off$/i, build: (m) => ({ kind: "NTH_PCT", nth: +m[1], pctOff: pct(m[2]) }) },
  { re: /^buy\s+second\s+for\s+\$(\d+(?:\.\d+)?)$/i, build: (m) => ({ kind: "NTH_PRICE", nth: 2, priceCents: money(m[1]) }) },
  { re: /^buy\s+(\d+)\s+(?:to\s+get|save)\s+(\d+(?:\.\d+)?)%(?:\s*off)?$/i, build: (m) => ({ kind: "GROUP_PCT", qty: +m[1], pctOff: pct(m[2]) }) },
  { re: /^(\d+)\s+or\s+more\s+(\d+(?:\.\d+)?)%\s*off$/i, build: (m) => ({ kind: "MIN_PCT", minQty: +m[1], pctOff: pct(m[2]) }) },
  { re: /^(\d+)\s+red\s+white\s+wine\s+save\s+(\d+(?:\.\d+)?)%$/i, build: (m) => ({ kind: "MIN_PCT", minQty: +m[1], pctOff: pct(m[2]) }) },
  { re: /^(\d+(?:\.\d+)?)%\s*off$/i, build: (m) => ({ kind: "PCT", pctOff: pct(m[1]) }) },
];

/** Parse one promotion text (English form). Unknown text → empty list. */
export function parsePromo(text: string): PromoRule[] {
  const rules: PromoRule[] = [];
  for (const part of text.split(" / ")) {
    const t = part.trim().replace(/\s+/g, " ");
    for (const p of PATTERNS) {
      const m = t.match(p.re);
      if (m) {
        const rule = p.build(m);
        if (isSane(rule)) rules.push(rule);
        break;
      }
    }
  }
  return rules;
}

function isSane(r: PromoRule): boolean {
  switch (r.kind) {
    case "BUNDLE":
      return r.qty >= 1 && r.totalCents > 0; // "1 For $20" is a sale price
    case "SAVE":
      return r.qty >= 1 && r.saveCents > 0;
    case "FREE":
      return r.buy >= 1 && r.free >= 1;
    case "NTH_PCT":
      return r.nth >= 2 && r.pctOff > 0 && r.pctOff <= 1;
    case "NTH_PRICE":
      return r.nth >= 2 && r.priceCents >= 0;
    case "GROUP_PCT":
      return r.qty >= 1 && r.pctOff > 0 && r.pctOff < 1;
    case "MIN_PCT":
      return r.minQty >= 1 && r.pctOff > 0 && r.pctOff < 1;
    case "PCT":
      return r.pctOff > 0 && r.pctOff < 1;
  }
}

function ruleCost(shelf: number, r: PromoRule, qty: number): number {
  switch (r.kind) {
    case "BUNDLE": {
      // The true cost, even when it is worse than buying singles: costFor() takes
      // the minimum anyway, and promoVerdict() needs the real number to say so.
      return Math.floor(qty / r.qty) * r.totalCents + (qty % r.qty) * shelf;
    }
    case "SAVE": {
      const group = Math.max(0, shelf * r.qty - r.saveCents);
      return Math.floor(qty / r.qty) * group + (qty % r.qty) * shelf;
    }
    case "FREE": {
      const size = r.buy + r.free;
      const rem = qty % size;
      return Math.floor(qty / size) * r.buy * shelf + Math.min(rem, r.buy) * shelf;
    }
    case "NTH_PCT": {
      const group = (r.nth - 1) * shelf + shelf * (1 - r.pctOff);
      return Math.floor(qty / r.nth) * group + (qty % r.nth) * shelf;
    }
    case "NTH_PRICE": {
      const group = (r.nth - 1) * shelf + Math.min(shelf, r.priceCents);
      return Math.floor(qty / r.nth) * group + (qty % r.nth) * shelf;
    }
    case "GROUP_PCT":
      return Math.floor(qty / r.qty) * r.qty * shelf * (1 - r.pctOff) + (qty % r.qty) * shelf;
    case "MIN_PCT":
      return qty >= r.minQty ? qty * shelf * (1 - r.pctOff) : qty * shelf;
    case "PCT":
      return qty * shelf * (1 - r.pctOff);
  }
}

/** Cheapest way to buy exactly `qty` units: best single rule, or no rule. */
export function costFor(shelfCents: number, rules: PromoRule[], qty: number): number {
  if (qty <= 0) return 0;
  let best = shelfCents * qty;
  for (const r of rules) best = Math.min(best, ruleCost(shelfCents, r, qty));
  return Math.round(best);
}

/** The quantity a promotion is written for: 「買2件$14」 is about two. */
function naturalQty(r: PromoRule): number {
  switch (r.kind) {
    case "BUNDLE":
    case "SAVE":
    case "GROUP_PCT":
      return r.qty;
    case "FREE":
      return r.buy + r.free;
    case "NTH_PCT":
    case "NTH_PRICE":
      return r.nth;
    case "MIN_PCT":
      return r.minQty;
    case "PCT":
      return 1;
  }
}

export type PromoVerdictKind = "BETTER" | "SAME" | "WORSE";

export interface PromoVerdict {
  kind: PromoVerdictKind;
  qty: number;
  /** Positive = the promotion saves money; negative = it costs more. */
  savingCents: number;
  promoTotalCents: number;
  plainTotalCents: number;
}

/**
 * Is the advertised promotion actually cheaper than just buying that many?
 *
 * The live feed contains 「買2件$14.00」 on an item whose shelf price is $6.90 —
 * buying two singles is 20 cents cheaper. `costFor` already refuses to use such
 * a rule, but until now the page still displayed it as if it were a deal.
 */
export function promoVerdict(shelfCents: number, rules: PromoRule[]): PromoVerdict | null {
  if (!rules.length || !(shelfCents > 0)) return null;
  let best: PromoVerdict | null = null;
  for (const r of rules) {
    const qty = naturalQty(r);
    if (!(qty >= 1)) continue;
    const plain = shelfCents * qty;
    const promo = Math.round(ruleCost(shelfCents, r, qty));
    const saving = plain - promo;
    const kind: PromoVerdictKind = saving > 0 ? "BETTER" : saving < 0 ? "WORSE" : "SAME";
    const verdict: PromoVerdict = { kind, qty, savingCents: saving, promoTotalCents: promo, plainTotalCents: plain };
    // Report the most favourable rule; a shopper only has to use the best one.
    if (!best || verdict.savingCents > best.savingCents) best = verdict;
  }
  return best;
}

/** The smallest quantity that reaches the lowest per-unit price (for "買 N 件每件 $X"). */
export function bestDeal(shelfCents: number, rules: PromoRule[], maxQty = 12): { qty: number; unitCents: number; totalCents: number } | null {
  if (!rules.length) return null;
  let best: { qty: number; unitCents: number; totalCents: number } | null = null;
  for (let q = 1; q <= maxQty; q++) {
    const total = costFor(shelfCents, rules, q);
    const unit = total / q;
    if (!best || unit < best.unitCents - 0.5) best = { qty: q, unitCents: Math.round(unit), totalCents: total };
  }
  return best && best.unitCents < shelfCents ? best : null;
}
