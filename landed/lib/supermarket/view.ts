import { rankFuzzy } from "../search/fuzzy";
import { prisma } from "../prisma";
import { safeJson } from "../format";
import { bestDeal, parsePromo, promoVerdict, type PromoRule, type PromoVerdict } from "./promo";
import { unitPriceFromTitles, type UnitPrice } from "./unitprice";
import { compareBasket, type BasketLine, type DeliveryRule, type RetailerPrice } from "./basket";
import { OPW_RETAILERS, RETAILERS, isRetailer } from "./retailers";
import { parseUnitSize } from "../match/attributes";
import type { HistoryPoint } from "./history";
import { lowOutliers } from "../rank";

// Read models for the supermarket pages.

export interface RetailerRow {
  offerId: number;
  retailer: string;
  shelfCents: number;
  inStock: boolean;
  promoZh: string | null;
  promoEn: string | null;
  rules: PromoRule[];
  deal: { qty: number; unitCents: number; totalCents: number } | null;
  /** Price per 100ml / 100g / piece — null when the title states no size. */
  unit: UnitPrice | null;
  /** Whether the advertised promotion actually beats buying singles. */
  verdict: PromoVerdict | null;
  checkedAt: Date | null;
}

export function rowsFromOffers(
  offers: { id: number; platform: string; latestPrice: number; inStock: boolean; attributes: string | null; lastCheckedAt: Date | null; title?: string }[],
  titleEn?: string | null,
): RetailerRow[] {
  return offers
    .filter((o) => isRetailer(o.platform))
    .map((o) => {
      const a = safeJson<{ promoEn?: string; promoZh?: string }>(o.attributes, {});
      const shelfCents = Math.round(o.latestPrice * 100);
      const rules = a.promoEn ? parsePromo(a.promoEn) : [];
      return {
        offerId: o.id,
        retailer: o.platform,
        shelfCents,
        inStock: o.inStock,
        promoZh: a.promoZh ?? null,
        promoEn: a.promoEn ?? null,
        rules,
        deal: bestDeal(shelfCents, rules),
        unit: unitPriceFromTitles(shelfCents, o.title ?? "", titleEn),
        verdict: promoVerdict(shelfCents, rules),
        checkedAt: o.lastCheckedAt,
      };
    })
    .sort((x, y) => Number(y.inStock) - Number(x.inStock) || x.shelfCents - y.shelfCents);
}

export async function supermarketCategories() {
  const rows = await prisma.product.findMany({ where: { segment: "SUPERMARKET" }, select: { category: true } });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const top = (r.category ?? "").split(" › ")[0];
    if (top) counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export type SupermarketSort = "gap" | "price" | "promo" | "unit";

export async function listSupermarketProducts(opts: { q?: string; cat?: string; sort?: SupermarketSort; take?: number; skip?: number }) {
  const q = opts.q?.trim();
  const where = {
    segment: "SUPERMARKET",
    ...(opts.cat ? { category: { startsWith: opts.cat } } : {}),
  };
  const all = await prisma.product.findMany({
    where,
    include: {
      offers: { select: { id: true, platform: true, latestPrice: true, inStock: true, attributes: true, lastCheckedAt: true, title: true } },
    },
    // Gap/promo ranking must see the whole catalogue (~2.7k), not an arbitrary first page.
    take: 5000,
  });
  // The whole catalogue is already in memory, so matching is fuzzy scoring rather
  // than a SQL substring: 維他奶/维他奶, "vitasoy", word order and typos all hit.
  const matched = q
    ? rankFuzzy(q, all, (p) => `${p.title} ${p.titleEn ?? ""} ${p.brand ?? ""} ${p.category ?? ""}`)
    : all.map((row) => ({ row, score: 1, exact: true }));
  const exactIds = new Set(matched.filter((m) => m.exact).map((m) => m.row.id));
  const products = matched.map((m) => m.row);
  const enriched = products.map((p) => {
    const rows = rowsFromOffers(p.offers, p.titleEn).filter((r) => r.inStock);
    const outlierIdx = lowOutliers(rows.map((r) => r.shelfCents));
    const trusted = rows.filter((_, i) => !outlierIdx.has(i));
    const min = rows[0]?.shelfCents ?? null;
    const max = rows.length ? Math.max(...rows.map((r) => r.shelfCents)) : null;
    const bestUnit = rows.reduce<number | null>((b, r) => Math.min(b ?? Infinity, r.deal?.unitCents ?? r.shelfCents), null);
    // Cheapest per 100ml/100g/piece across the chains, for the 每單位最平 sort.
    const perUnitCents = rows.reduce<number | null>((b, r) => (r.unit ? Math.min(b ?? Infinity, r.unit.cents) : b), null);
    const badPromoCount = rows.filter((r) => r.verdict?.kind === "WORSE").length;
    // "Saving vs typical": median minus the cheapest *trusted* price. A 4× gap is
    // more often a different pack size or a data error than a bargain.
    const sorted = trusted.map((r) => r.shelfCents).sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
    const savingVsTypicalCents = sorted.length >= 2 ? median - sorted[0] : 0;
    return {
      product: p,
      rows,
      outlierRetailers: rows.filter((_, i) => outlierIdx.has(i)).map((r) => r.retailer),
      minCents: min,
      maxCents: max,
      gapCents: min != null && max != null ? max - min : 0,
      savingVsTypicalCents,
      bestUnitCents: bestUnit,
      perUnitCents,
      unitLabelZh: rows.find((r) => r.unit)?.unit?.labelZh ?? null,
      badPromoCount,
      promoCount: rows.filter((r) => r.rules.length).length,
      trustedChains: trusted.length,
    };
  });
  const sort = opts.sort ?? (q ? "price" : "gap");
  enriched.sort((a, b) =>
    // A search shows what matched every word before the close matches.
    Number(exactIds.has(b.product.id)) - Number(exactIds.has(a.product.id)) ||
    (sort === "price"
      ? (a.minCents ?? Infinity) - (b.minCents ?? Infinity)
      : sort === "unit"
        ? (a.perUnitCents ?? Infinity) - (b.perUnitCents ?? Infinity)
      : sort === "promo"
        ? b.promoCount - a.promoCount || b.gapCents - a.gapCents
        : // Biggest saving vs the typical price, preferring items ≥3 chains agree on.
          Number(b.trustedChains >= 3) - Number(a.trustedChains >= 3) || b.savingVsTypicalCents - a.savingVsTypicalCents),
  );
  const skip = opts.skip ?? 0;
  return { total: enriched.length, items: enriched.slice(skip, skip + (opts.take ?? 48)) };
}

/**
 * Daily history for one product: the cheapest chain each day, with that day's
 * promotion and pack size. Feeds detectShrinkflation and promoCadence.
 */
export async function productHistory(productId: number, days = 180): Promise<HistoryPoint[]> {
  const since = new Date(Date.now() - days * 86400_000);
  const snaps = await prisma.offerSnapshot.findMany({
    where: { offer: { productId, platform: { in: [...OPW_RETAILERS] } }, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, landedHkdCents: true, price: true, promoText: true, unitSizeLabel: true },
  });
  const byDay = new Map<string, HistoryPoint>();
  for (const s of snaps) {
    const day = new Date(s.capturedAt.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const cents = s.landedHkdCents ?? Math.round(s.price * 100);
    const existing = byDay.get(day);
    // Keep the cheapest chain for the day, but remember any promotion seen.
    if (!existing || cents < existing.priceCents) {
      byDay.set(day, {
        day,
        priceCents: cents,
        promoText: s.promoText ?? existing?.promoText ?? null,
        unitSizeLabel: s.unitSizeLabel ?? existing?.unitSizeLabel ?? null,
        unitSizeValue: parseUnitSize(s.unitSizeLabel ?? "")?.value ?? null,
      });
    } else if (s.promoText && !existing.promoText) {
      existing.promoText = s.promoText;
    }
  }
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export async function deliveryRules(): Promise<DeliveryRule[]> {
  const rows = await prisma.retailerConfig.findMany({ where: { enabled: true } });
  return rows.map((r) => ({ retailer: r.code, feeCents: r.deliveryFeeCents, freeOverCents: r.freeDeliveryOverCents }));
}

export async function compareSupermarketBasket(lines: { productId: number; qty: number }[], includeDelivery: boolean) {
  const ids = [...new Set(lines.map((l) => l.productId))].slice(0, 100);
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, segment: "SUPERMARKET" },
    include: { offers: { where: { platform: { in: [...RETAILERS] } } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const basketLines: BasketLine[] = lines
    .filter((l) => byId.has(l.productId) && Number.isInteger(l.qty) && l.qty > 0 && l.qty <= 99)
    .map((l) => ({ productId: l.productId, qty: l.qty, title: byId.get(l.productId)!.title }));
  const prices: RetailerPrice[] = products.flatMap((p) =>
    rowsFromOffers(p.offers, p.titleEn).map((r) => ({ productId: p.id, retailer: r.retailer, shelfCents: r.shelfCents, rules: r.rules, inStock: r.inStock })),
  );
  const rules = await deliveryRules();
  return {
    comparison: compareBasket(basketLines, prices, { deliveryRules: rules, includeDelivery }),
    products: products.map((p) => ({ id: p.id, title: p.title, titleEn: p.titleEn, slug: p.slug })),
    deliveryKnown: rules.filter((r) => r.feeCents != null).map((r) => r.retailer),
  };
}
