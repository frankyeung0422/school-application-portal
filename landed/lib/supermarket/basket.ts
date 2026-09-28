// "Which supermarket is cheapest for my whole list?" Pure;
// tests/supermarket.test.ts.
//
// Item-by-item cheapest is not the answer people act on: nobody visits five
// shops for five items, and online orders carry delivery fees below a minimum.
// So two answers are given side by side — the cheapest single shop that stocks
// everything, and the cheapest split — with the difference in dollars and shops.

import { costFor, type PromoRule } from "./promo";

export interface BasketLine {
  productId: number;
  title: string;
  qty: number;
}

export interface RetailerPrice {
  productId: number;
  retailer: string;
  shelfCents: number;
  rules: PromoRule[];
  inStock: boolean;
}

export interface DeliveryRule {
  retailer: string;
  feeCents: number | null;
  freeOverCents: number | null;
}

export interface StoreTotal {
  retailer: string;
  itemsCents: number;
  deliveryCents: number;
  totalCents: number;
  /** Savings from promotions versus shelf price. */
  promoSavingCents: number;
  missing: BasketLine[];
  lines: { productId: number; qty: number; costCents: number }[];
}

export interface SplitPlan {
  totalCents: number;
  itemsCents: number;
  deliveryCents: number;
  stores: string[];
  lines: { productId: number; retailer: string; qty: number; costCents: number }[];
  unavailable: BasketLine[];
}

export interface BasketComparison {
  stores: StoreTotal[];
  /** Cheapest shop that stocks every line, or null. */
  bestSingle: StoreTotal | null;
  split: SplitPlan;
  /** How much splitting saves versus the best single shop (≥ 0), when both exist. */
  splitSavesCents: number | null;
}

function delivery(retailer: string, itemsCents: number, rules: DeliveryRule[], include: boolean): number {
  if (!include || itemsCents === 0) return 0;
  const r = rules.find((d) => d.retailer === retailer);
  if (!r || r.feeCents == null) return 0;
  return r.freeOverCents != null && itemsCents >= r.freeOverCents ? 0 : r.feeCents;
}

export function compareBasket(
  lines: BasketLine[],
  prices: RetailerPrice[],
  opts: { deliveryRules?: DeliveryRule[]; includeDelivery?: boolean } = {},
): BasketComparison {
  const rules = opts.deliveryRules ?? [];
  const include = opts.includeDelivery ?? false;
  const clean = lines.filter((l) => l.qty > 0);
  const retailers = [...new Set(prices.map((p) => p.retailer))];
  const priceOf = (productId: number, retailer: string) =>
    prices.find((p) => p.productId === productId && p.retailer === retailer && p.inStock);

  const stores: StoreTotal[] = retailers.map((retailer) => {
    let itemsCents = 0;
    let shelfCents = 0;
    const missing: BasketLine[] = [];
    const out: StoreTotal["lines"] = [];
    for (const l of clean) {
      const p = priceOf(l.productId, retailer);
      if (!p) {
        missing.push(l);
        continue;
      }
      const cost = costFor(p.shelfCents, p.rules, l.qty);
      itemsCents += cost;
      shelfCents += p.shelfCents * l.qty;
      out.push({ productId: l.productId, qty: l.qty, costCents: cost });
    }
    const deliveryCents = delivery(retailer, itemsCents, rules, include);
    return { retailer, itemsCents, deliveryCents, totalCents: itemsCents + deliveryCents, promoSavingCents: shelfCents - itemsCents, missing, lines: out };
  });
  stores.sort((a, b) => a.missing.length - b.missing.length || a.totalCents - b.totalCents);

  const complete = stores.filter((s) => s.missing.length === 0 && clean.length > 0);
  const bestSingle = complete.length ? complete.reduce((a, b) => (b.totalCents < a.totalCents ? b : a)) : null;

  const splitLines: SplitPlan["lines"] = [];
  const unavailable: BasketLine[] = [];
  for (const l of clean) {
    let best: { retailer: string; cost: number } | null = null;
    for (const retailer of retailers) {
      const p = priceOf(l.productId, retailer);
      if (!p) continue;
      const cost = costFor(p.shelfCents, p.rules, l.qty);
      if (!best || cost < best.cost) best = { retailer, cost };
    }
    if (best) splitLines.push({ productId: l.productId, retailer: best.retailer, qty: l.qty, costCents: best.cost });
    else unavailable.push(l);
  }
  const usedStores = [...new Set(splitLines.map((s) => s.retailer))];
  const splitItems = splitLines.reduce((s, l) => s + l.costCents, 0);
  const splitDelivery = usedStores.reduce(
    (s, r) => s + delivery(r, splitLines.filter((l) => l.retailer === r).reduce((x, l) => x + l.costCents, 0), rules, include),
    0,
  );
  const split: SplitPlan = {
    totalCents: splitItems + splitDelivery,
    itemsCents: splitItems,
    deliveryCents: splitDelivery,
    stores: usedStores,
    lines: splitLines,
    unavailable,
  };

  return {
    stores,
    bestSingle,
    split,
    splitSavesCents: bestSingle && unavailable.length === 0 ? Math.max(0, bestSingle.totalCents - split.totalCents) : null,
  };
}
