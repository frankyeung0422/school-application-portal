import type { Offer, Supplier } from "@prisma/client";
import { prisma } from "./prisma";
import type { NormalizedListing } from "./sources/types";
import { isAccessoryTitle, parseAttributes } from "./match/attributes";
import { generateCandidatePairs } from "./match/blocking";
import { judgePair } from "./match/gemini-judge";
import { clusterOffers, type SameEdge } from "./match/cluster";
import { landedQuote, type Delivery, type LandedResult, type PayWith, type SourceProfile } from "./money/landed";
import { DEFAULT_PREFS, parseDims, payWithFor, type BuyerPrefs } from "./buyer-prefs";
import { toHkd, type FxMids } from "./money/fx";
import { lowOutliers, rankOffers, type RankedOffer } from "./rank";
import { restrictedReason } from "./restricted";
import { hoursSince, safeJson, slugify } from "./format";
import { loadMids, loadProfiles, settlementRail, walletMarkups } from "./settings";
import { CONSUMER_ACCESSIBLE_PLATFORMS, isConsumerAccessible, type PriceTier } from "./types";
import { RETAILERS } from "./supermarket/retailers";
import { detectLuxury, luxuryBrandLabel, type LuxuryCategory } from "./luxury/brands";
import { authenticityRisk, PLATFORM_POLICY, type RiskResult } from "./luxury/risk";

// Catalogue services: offers in, products out, 到手價 computed. The pure
// engines (landed, rank, cluster) do the thinking; this file only loads and
// stores.

/** Strip marketplace UI text that scrapers pick up with the title. */
export function cleanTitle(title: string): string {
  return title
    .replace(/^\s*(New Listing|Sponsored|NEW LISTING)\s*/i, "")
    .replace(/\s*Opens in a new window( or tab)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function upsertOffers(keyword: string, rawListings: NormalizedListing[], jobId?: number) {
  let upserted = 0;
  // A scraped price of 0 is a parse failure ("See price in cart"), not a bargain.
  const listings = rawListings.filter((l) => l.price > 0).map((l) => ({ ...l, title: cleanTitle(l.title) }));
  for (const l of listings) {
    const attrs = parseAttributes(l.title);
    const supplier = l.shopName
      ? await prisma.supplier.upsert({
          where: { platform_shopName: { platform: l.platform, shopName: l.shopName } },
          create: { platform: l.platform, shopName: l.shopName },
          update: {},
        })
      : null;
    const data = {
      url: l.url,
      title: l.title,
      imageUrl: l.imageUrl,
      shopName: l.shopName,
      currency: l.currency,
      latestPrice: l.price,
      soldCount: l.soldCount,
      moq: l.moq,
      priceTiers: l.priceTiers ? JSON.stringify(l.priceTiers) : null,
      attributes: l.attributes ? JSON.stringify(l.attributes) : null,
      packQty: attrs.packQty,
      isAccessory: attrs.isAccessory,
      unitSize: attrs.unitSize?.label ?? null,
      rating: l.rating ?? null,
      reviewCount: l.reviewCount ?? null,
      boughtPastMonth: l.boughtPastMonth ?? null,
      weightKg: l.weightKg ?? null,
      category: l.category ?? null,
      supplierId: supplier?.id ?? null,
      inStock: true,
      lastCheckedAt: new Date(),
    };
    const offer = await prisma.offer.upsert({
      where: { platform_itemId: { platform: l.platform, itemId: l.itemId } },
      create: { platform: l.platform, itemId: l.itemId, keyword, ...data },
      update: data,
    });
    await prisma.offerSnapshot.create({
      data: { offerId: offer.id, price: l.price, currency: l.currency, inStock: true, jobId },
    });
    upserted++;
  }
  return upserted;
}

/** Pairwise matching → anchored clusters → products. */
export async function clusterKeyword(keyword: string) {
  const offers = await prisma.offer.findMany({ where: { keyword } });
  if (offers.length === 0) return { offers: 0, products: 0, judged: 0, cached: 0 };
  const { mids } = await loadMids();
  const byId = new Map(offers.map((o) => [o.id, o]));

  const priced = offers.filter((o) => o.currency === "HKD" || mids[o.currency]);
  // Counterfeit luxury sells at 1–10% of the real thing, so the normal 5% price
  // floor would drop those pairs — and an unclustered fake is a fake with no
  // genuine price beside it. Widen the band so they cluster and get risk-flagged.
  const isLuxuryKeyword = offers.some((o) => detectLuxury(o.title));
  const pairs = generateCandidatePairs(
    priced.map((o) => ({
      id: o.id,
      platform: o.platform,
      title: o.title,
      priceCny: toHkd(o.latestPrice, o.currency, mids),
      packQty: o.packQty,
      isAccessory: o.isAccessory,
    })),
    {
      requireResaleVenue: false,
      priceBand: isLuxuryKeyword ? [0.003, 1] : [0.05, 1],
      maxPairs: Number(process.env.MATCH_MAX_PAIRS ?? 150),
    },
  );

  let judged = 0;
  let cached = 0;
  for (const pair of pairs) {
    const [aId, bId] = pair.buy.id < pair.sell.id ? [pair.buy.id, pair.sell.id] : [pair.sell.id, pair.buy.id];
    const existing = await prisma.matchPair.findUnique({ where: { offerAId_offerBId: { offerAId: aId, offerBId: bId } } });
    if (existing) {
      cached++;
      continue;
    }
    const result = await judgePair(byId.get(aId)!, byId.get(bId)!);
    await prisma.matchPair.create({
      data: { offerAId: aId, offerBId: bId, ...result },
    });
    judged++;
  }

  // Every SAME verdict among these offers — including human verifications made
  // on the admin page, which carry confidence 1.
  const ids = offers.map((o) => o.id);
  const sames = await prisma.matchPair.findMany({
    where: { verdict: "SAME", offerAId: { in: ids }, offerBId: { in: ids } },
  });
  const edges: SameEdge[] = sames.map((m) => ({ a: m.offerAId, b: m.offerBId, confidence: m.confidence }));
  const clusters = clusterOffers(ids, edges);

  const touched = new Set<number>();
  for (const c of clusters) {
    const members = c.members.map((m) => byId.get(m.offerId)!);
    // Reuse the product most members already belong to, so product URLs are stable.
    const counts = new Map<number, number>();
    for (const m of members) if (m.productId) counts.set(m.productId, (counts.get(m.productId) ?? 0) + 1);
    let productId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!productId) {
      // Name the product after its most retail-like listing, not a wholesale "工厂批发" title.
      const named = [...members].sort((x, y) => titleRank(x) - titleRank(y))[0];
      productId = (await createProduct(named, keyword)).id;
    }
    for (const m of c.members) {
      await prisma.offer.update({ where: { id: m.offerId }, data: { productId, matchConfidence: m.confidence } });
    }
    touched.add(productId);
  }
  for (const productId of touched) await priceProduct(productId, { persist: true });
  // Luxury clusters are screened for counterfeits as soon as they exist.
  const luxuryIds = (await prisma.product.findMany({ where: { id: { in: [...touched] }, segment: "LUXURY" }, select: { id: true } })).map((p) => p.id);
  let screened = null;
  if (luxuryIds.length) {
    const { screenLuxuryOffers } = await import("./luxury/screen");
    screened = await screenLuxuryOffers(luxuryIds);
  }
  return { offers: offers.length, products: touched.size, judged, cached, candidatePairs: pairs.length, screened };
}

const TITLE_PREFERENCE = ["AMAZON", "ALIEXPRESS", "EBAY", "JD", "TAOBAO", "PDD", "ALI1688", "ALIBABA"];

function titleRank(o: Offer): number {
  const i = TITLE_PREFERENCE.indexOf(o.platform);
  return (i < 0 ? 99 : i) + (o.moq && o.moq > 1 ? 50 : 0);
}

async function createProduct(anchor: Offer, keyword: string) {
  const attrs = parseAttributes(anchor.title);
  // A HK$17 bezel insert or strap mentioning "Rolex" is an accessory, not a luxury
  // watch — labelling it luxury put spare parts on the luxury page.
  const luxury = isAccessoryTitle(anchor.title) ? null : detectLuxury(anchor.title);
  // Luxury is compare-only: counterfeit exposure and chargeback risk are not
  // ours to carry, so the product is restricted from fulfilment at birth.
  const restricted = luxury
    ? `奢侈品：真偽風險，我哋只做比價 — luxury goods: comparison only, never fulfilled by us`
    : restrictedReason(anchor.title, anchor.category);
  const created = await prisma.product.create({
    data: {
      slug: `tmp-${anchor.id}-${Date.now()}`,
      title: anchor.title,
      segment: luxury ? "LUXURY" : "GLOBAL",
      brand: luxury ? luxuryBrandLabel(luxury.brand) : (attrs.brand ?? null),
      imageUrl: anchor.imageUrl,
      category: anchor.category,
      keyword,
      packQty: anchor.packQty,
      unitSize: anchor.unitSize,
      restricted: restricted !== null,
      restrictedReason: restricted,
    },
  });
  return prisma.product.update({ where: { id: created.id }, data: { slug: slugify(anchor.title, created.id) } });
}

export function supplierReliability(s: Pick<Supplier, "ordersPlaced" | "ordersFilled"> | null): number | null {
  if (!s || s.ordersPlaced < 3) return null;
  return s.ordersFilled / s.ordersPlaced;
}

export function quoteOffer(
  offer: Offer,
  qty: number,
  payWith: PayWith,
  profiles: Record<string, SourceProfile>,
  mids: FxMids,
  opts: { delivery?: Delivery } = {},
): LandedResult | null {
  const profile = profiles[offer.platform];
  if (!profile) return null;
  if (offer.currency !== "HKD" && !mids[offer.currency]) return null;
  // Defensive: an older row may still hold a bad price; skip it instead of failing the job.
  if (!(offer.latestPrice > 0)) return null;
  return landedQuote({
    price: offer.latestPrice,
    currency: offer.currency,
    qty,
    priceTiers: safeJson<PriceTier[] | null>(offer.priceTiers, null),
    moq: offer.moq,
    packQty: offer.packQty,
    weightKg: offer.weightKg,
    dimsCm: parseDims(offer.dimsCm),
    delivery: opts.delivery,
    profile,
    mids,
    payWith,
  });
}

export interface PricedOffer {
  offer: Offer & { supplier: Supplier | null };
  buyer: LandedResult;
  viaRail: LandedResult;
  rank: RankedOffer;
  /** Luxury products only: why this source may or may not be genuine. */
  risk?: RiskResult;
}

/** Counterfeit risk per offer, anchored on the median of the platforms that control it. */
function luxuryRisks(
  priced: { offer: Offer; buyer: LandedResult }[],
  category: LuxuryCategory,
): Map<number, RiskResult> {
  const trusted = priced
    .filter((p) => (PLATFORM_POLICY[p.offer.platform]?.base ?? "MEDIUM") !== "HIGH")
    .map((p) => p.buyer.perUnitHkdCents)
    .sort((a, b) => a - b);
  const median = trusted.length ? trusted[Math.floor((trusted.length - 1) / 2)] : null;
  return new Map(
    priced.map((p) => [
      p.offer.id,
      authenticityRisk({
        platform: p.offer.platform,
        category,
        priceCents: p.buyer.perUnitHkdCents,
        medianTrustedCents: median,
        sellerRating: p.offer.rating,
        reviewCount: p.offer.reviewCount,
      }),
    ]),
  );
}

/**
 * Compute every offer's 到手價 and rank them. With `persist` (crawl/refresh
 * paths only) it also refreshes the product's read cache and freshness stamp —
 * a page view or a quote must not make a stale product look freshly priced.
 */
/**
 * Prices every source of a product. `buyer` (payment + delivery) personalises the
 * ranking for one visitor; persisted prices always use the default, so the stored
 * headline is the same for everyone.
 */
export async function priceProduct(productId: number, opts: { persist?: boolean; buyer?: BuyerPrefs } = {}) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { offers: { include: { supplier: true } } },
  });
  if (!product) return null;
  const [profiles, { mids }, rail, walletMarkup] = await Promise.all([loadProfiles(), loadMids(), settlementRail(), walletMarkups()]);
  const prefs = opts.persist || !opts.buyer ? DEFAULT_PREFS : opts.buyer;

  const priced: Omit<PricedOffer, "rank">[] = [];
  for (const offer of product.offers) {
    const buyer = quoteOffer(offer, 1, payWithFor(prefs, offer.platform, walletMarkup), profiles, mids, { delivery: prefs.delivery });
    const viaRail = quoteOffer(offer, 1, { kind: "RAIL", rail }, profiles, mids);
    if (buyer && viaRail) priced.push({ offer, buyer, viaRail });
  }
  // Compare item prices only (not shipping), per unit, across the cluster.
  const itemCents = priced.map((p) => (p.buyer.breakdown.find((l) => l.key === "ITEMS")?.hkdCents ?? 0) / p.buyer.unitsReceived);
  const outliers = lowOutliers(itemCents);
  const luxuryCategory = product.segment === "LUXURY" ? (detectLuxury(product.title)?.category ?? "ACCESSORY") : null;
  const risks = luxuryCategory ? luxuryRisks(priced, luxuryCategory) : new Map<number, RiskResult>();
  const { ranked, bestOfferId } = rankOffers(
    priced.map((p, i) => ({
      priceOutlier: outliers.has(i),
      // Screened-out fakes can never be "cheapest", even before the page filters them.
      highCounterfeitRisk: risks.get(p.offer.id)?.excludeFromBest || p.offer.suspectCounterfeit,
      offerId: p.offer.id,
      landedPerUnitHkdCents: p.buyer.perUnitHkdCents,
      matchConfidence: p.offer.matchConfidence ?? 0,
      supplierReliability: supplierReliability(p.offer.supplier),
      inStock: p.offer.inStock,
      isAccessory: p.offer.isAccessory,
      sellerRating: p.offer.rating,
      moqForced: p.buyer.moqForced,
      priceAgeHours: hoursSince(p.offer.lastCheckedAt),
      consumerAccessible: isConsumerAccessible(p.offer.platform),
    })),
    { productIsAccessory: isAccessoryTitle(product.title) },
  );
  const rankById = new Map(ranked.map((r) => [r.offerId, r]));
  const result: PricedOffer[] = ranked
    .map((r) => priced.find((p) => p.offer.id === r.offerId)!)
    .map((p) => ({ ...p, rank: rankById.get(p.offer.id)!, risk: risks.get(p.offer.id) }));

  const best = result.find((r) => r.offer.id === bestOfferId);
  const bestCents = best?.buyer.perUnitHkdCents ?? null;

  // Supermarket caches are owned by the feed sync; the cross-border pricer must never overwrite them.
  if (!opts.persist || product.segment === "SUPERMARKET") return { product, offers: result, bestOfferId, mids, rail, prefs };

  // Stamp landed price onto each offer's latest snapshot (history for the passport).
  for (const p of result) {
    const snap = await prisma.offerSnapshot.findFirst({ where: { offerId: p.offer.id }, orderBy: { capturedAt: "desc" } });
    if (snap && snap.landedHkdCents == null) {
      await prisma.offerSnapshot.update({ where: { id: snap.id }, data: { landedHkdCents: p.buyer.perUnitHkdCents } });
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      bestLandedHkdCents: bestCents,
      bestOfferId,
      sourceCount: result.length,
      lastPricedAt: new Date(),
      historicalLowHkdCents:
        bestCents == null
          ? product.historicalLowHkdCents
          : Math.min(bestCents, product.historicalLowHkdCents ?? Number.MAX_SAFE_INTEGER),
      imageUrl: product.imageUrl ?? best?.offer.imageUrl ?? null,
    },
  });
  return { product, offers: result, bestOfferId, mids, rail, prefs };
}

/** Best landed price per HKT day across a product's offers (for the passport). */
export async function dailyBestHistory(productId: number, days = 90, segment: string = "GLOBAL") {
  const since = new Date(Date.now() - days * 86400_000);
  const platforms = segment === "SUPERMARKET" ? [...RETAILERS] : [...CONSUMER_ACCESSIBLE_PLATFORMS];
  const snaps = await prisma.offerSnapshot.findMany({
    // Same population the headline "cheapest" is drawn from: verified, consumer-reachable sources.
    where: {
      offer: { productId, matchConfidence: { gte: 0.6 }, platform: { in: platforms } },
      capturedAt: { gte: since },
      landedHkdCents: { not: null },
    },
    select: { capturedAt: true, landedHkdCents: true },
    orderBy: { capturedAt: "asc" },
  });
  const byDay = new Map<string, number>();
  for (const s of snaps) {
    const day = new Date(s.capturedAt.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const v = s.landedHkdCents!;
    byDay.set(day, Math.min(v, byDay.get(day) ?? Number.MAX_SAFE_INTEGER));
  }
  return [...byDay.entries()].map(([day, cents]) => ({ day, cents }));
}
