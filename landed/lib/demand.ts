import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import { enqueueJob } from "./jobs/queue";
import { affiliateUrl, isSafeRedirect, subIdFor } from "./affiliate";
import { median } from "./tally";
import { PLATFORMS, PUBLIC_SEARCH_PLATFORMS, isPlatform, type Platform } from "./types";
import type { Product } from "@prisma/client";
import {
  FUZZY_MIN,
  candidateNeedles,
  didYouMean,
  foldText,
  parseQuery,
  querySignature,
  scoreTitle,
  vocabulary,
} from "./search/fuzzy";

// Demand capture: searches decide what gets crawled, clicks and watches are
// the evidence a product needs before it can earn our checkout.

export const SEARCH_RECRAWL_HOURS = 24;

export function normalizeQuery(q: string): string {
  return q.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
}

export async function searchPlatforms(): Promise<Platform[]> {
  if (process.env.ADAPTER_MODE === "fixture") return [...PLATFORMS].filter((p) => p !== "PDD");
  const env = process.env.SEARCH_PLATFORMS?.split(",").map((s) => s.trim()).filter(isPlatform);
  if (env && env.length) return env;
  const loggedIn = await prisma.platformSession.findMany({ where: { status: "LOGGED_IN" } });
  const extra = loggedIn.map((s) => s.platform).filter(isPlatform);
  return [...new Set<Platform>([...PUBLIC_SEARCH_PLATFORMS, ...extra])];
}

/**
 * Record a search; enqueue a crawl when we have nothing recent for it — under
 * this wording or any equivalent one ("band 9 xiaomi" = "小米手環9").
 */
/**
 * A search: demand evidence plus, if stale, a crawl. `background` is for
 * machine-chosen keywords (DISCOVER): they get crawled, but they are not a
 * person searching, so they neither count as demand nor jump the job queue.
 */
export async function recordSearch(raw: string, opts: { background?: boolean } = {}) {
  const normalized = normalizeQuery(raw);
  if (normalized.length < 2) return { normalized, crawlJobId: null as number | null };
  const signature = querySignature(normalized);
  const row = await prisma.searchQuery.upsert({
    where: { normalized },
    create: opts.background
      ? { normalized, display: raw.trim().slice(0, 100), signature, count: 0, lastSearchedAt: new Date(0) }
      : { normalized, display: raw.trim().slice(0, 100), signature },
    update: opts.background ? { signature } : { count: { increment: 1 }, lastSearchedAt: new Date(), signature },
  });
  const cutoff = new Date(Date.now() - SEARCH_RECRAWL_HOURS * 3600_000);
  const stale = !row.lastCrawledAt || row.lastCrawledAt < cutoff;
  if (!stale) return { normalized, crawlJobId: null };
  const sibling = signature
    ? await prisma.searchQuery.findFirst({
        where: { signature, normalized: { not: normalized }, lastCrawledAt: { gte: cutoff } },
        orderBy: { lastCrawledAt: "desc" },
      })
    : null;
  if (sibling) {
    // Same search in other words was crawled recently; fuzzy matching finds its
    // products. If that crawl is still running, let the page wait on it.
    const running = await prisma.job.findFirst({
      where: { type: "SEARCH_CRAWL", dedupeKey: `search:${sibling.normalized}`, status: { in: ["PENDING", "RUNNING"] } },
    });
    return { normalized, crawlJobId: running?.id ?? null };
  }
  const job = await enqueueJob(
    "SEARCH_CRAWL",
    { keyword: normalized, platforms: await searchPlatforms(), ...(opts.background ? { background: true } : {}) },
    { dedupeKey: `search:${normalized}` },
  );
  await prisma.searchQuery.update({ where: { normalized }, data: { lastCrawledAt: new Date() } });
  return { normalized, crawlJobId: job.id };
}

const productSearchText = (p: { title: string; brand: string | null; offers: { title: string }[] }) => [
  `${p.brand ?? ""} ${p.title}`,
  ...p.offers.map((o) => o.title),
];

export interface ProductSearchResult {
  products: Product[];
  /** No result matched every word verbatim — the page says "close matches". */
  fuzzy: boolean;
  /** A spelling the catalogue knows, when the query looks mistyped. */
  suggestion: string | null;
}

/**
 * Products for a query, forgiving word order, Traditional/Simplified, typos,
 * plurals, synonyms and Chinese↔English. SQL narrows candidates with one
 * `contains` per word; lib/search/fuzzy.ts decides what actually matches.
 */
export async function findProducts(q: string, take = 24, opts: { segments?: string[] } = {}): Promise<ProductSearchResult> {
  const segments = opts.segments ?? ["GLOBAL"];
  const normalized = normalizeQuery(q);
  if (!normalized) return { products: [], fuzzy: false, suggestion: null };
  const needles = candidateNeedles(normalized);
  const include = { offers: { select: { title: true }, take: 6 } } as const;
  const candidates = await prisma.product.findMany({
    where: {
      segment: { in: segments },
      OR: [
        { keyword: normalized },
        { title: { contains: q.trim() } },
        { offers: { some: { title: { contains: q.trim() } } } },
        ...needles.flatMap((n) => [{ title: { contains: n } }, { brand: { contains: n } }, { offers: { some: { title: { contains: n } } } }]),
      ],
    },
    include,
    orderBy: { updatedAt: "desc" },
    take: 400,
  });
  // Typos defeat every `contains` probe; the catalogue is small enough to score whole.
  // (Titles only here — loading offers for 3,000 products would exceed SQLite's parameter limit.)
  const pool =
    candidates.length >= 5
      ? candidates
      : (await prisma.product.findMany({ where: { segment: { in: segments } }, orderBy: { updatedAt: "desc" }, take: 3000 })).map((p) => ({
          ...p,
          offers: [] as { title: string }[],
        }));

  const query = parseQuery(normalized);
  const ranked = pool
    .map((p) => {
      // Products crawled for exactly this query are matches by definition.
      if (p.keyword === normalized) return { p, score: 1, exact: true };
      const best = productSearchText(p)
        .map((t) => scoreTitle(query, t))
        .reduce((a, b) => (b.score > a.score ? b : a), { score: 0, exact: false });
      return { p, ...best };
    })
    .filter((r) => r.score >= FUZZY_MIN)
    // Verbatim matches first, then how well it matches, then the most-compared and priced.
    .sort(
      (a, b) =>
        Number(b.exact) - Number(a.exact) ||
        Math.round((b.score - a.score) * 10) ||
        Number(b.p.bestLandedHkdCents != null) - Number(a.p.bestLandedHkdCents != null) ||
        b.p.sourceCount - a.p.sourceCount,
    )
    .slice(0, take);

  // Offer titles were only for matching; callers get plain products.
  const products: Product[] = ranked.map(({ p }) => ({ ...p, offers: undefined }));
  const fuzzy = ranked.length > 0 && !ranked[0].exact;
  let suggestion: string | null = null;
  if (!ranked.some((r) => r.exact)) {
    const titles = pool.slice(0, 1500).map((p) => `${p.brand ?? ""} ${p.title}`);
    const fix = didYouMean(normalized, vocabulary(titles));
    if (fix && fix !== foldText(normalized)) suggestion = fix;
  }
  return { products, fuzzy, suggestion };
}

export async function logClick(offerId: number, opts: { sessionId?: string | null; referrer?: string | null }) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { product: true } });
  if (!offer || !isSafeRedirect(offer.url)) return null;
  const env = {
    AMAZON_ASSOCIATE_TAG: process.env.AMAZON_ASSOCIATE_TAG,
    EBAY_EPN_CAMPAIGN_ID: process.env.EBAY_EPN_CAMPAIGN_ID,
    ALIEXPRESS_TRACKING_ID: process.env.ALIEXPRESS_TRACKING_ID,
  };
  const snap = await prisma.offerSnapshot.findFirst({ where: { offerId }, orderBy: { capturedAt: "desc" } });
  // What "typical" was at this moment: the median of each in-stock source's latest delivered price.
  const recent = offer.productId
    ? await prisma.offerSnapshot.findMany({
        where: { offer: { productId: offer.productId, inStock: true }, capturedAt: { gte: new Date(Date.now() - 14 * 86400_000) }, landedHkdCents: { not: null } },
        orderBy: { capturedAt: "desc" },
        select: { offerId: true, landedHkdCents: true },
        take: 500,
      })
    : [];
  const latestPerOffer = new Map<number, number>();
  for (const r of recent) if (!latestPerOffer.has(r.offerId)) latestPerOffer.set(r.offerId, r.landedHkdCents!);
  // The click row comes first: its id is the sub-ID the programme reports back.
  const click = await prisma.affiliateClick.create({
    data: {
      offerId,
      productId: offer.productId,
      sessionId: opts.sessionId ?? null,
      referrer: opts.referrer?.slice(0, 300) ?? null,
      tracked: affiliateUrl(offer.platform, offer.url, env).tracked,
      landedHkdCents: snap?.landedHkdCents ?? null,
      medianHkdCents: latestPerOffer.size >= 2 ? median([...latestPerOffer.values()]) : null,
    },
  });
  return affiliateUrl(offer.platform, offer.url, env, subIdFor(click.id)).url;
}

export async function addWatch(opts: { productId: number; email: string; targetHkdCents: number | null; customerId: number | null; promo?: boolean }) {
  const email = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("電郵格式唔啱 Invalid email");
  const product = await prisma.product.findUnique({ where: { id: opts.productId } });
  if (!product) throw new Error("Product not found");
  // PROMO watches exist for supermarket items only; they also carry the price-drop alert.
  const kind = opts.promo && product.segment === "SUPERMARKET" ? "PROMO" : "PRICE";
  // Start from what runs today, so subscribing does not re-announce the promo the shopper is looking at.
  const lastPromoKey = kind === "PROMO" ? await currentPromoKey(product.id) : null;
  const customer = opts.customerId ? await prisma.customer.findUnique({ where: { id: opts.customerId }, select: { telegramChatId: true } }) : null;
  return prisma.watch.upsert({
    where: { productId_email: { productId: opts.productId, email } },
    create: {
      productId: opts.productId,
      email,
      kind,
      lastPromoKey,
      targetHkdCents: opts.targetHkdCents,
      customerId: opts.customerId,
      telegramChatId: customer?.telegramChatId ?? null,
      lastNotifiedCents: product.bestLandedHkdCents,
    },
    update: {
      targetHkdCents: opts.targetHkdCents,
      active: true,
      kind,
      ...(kind === "PROMO" ? { lastPromoKey } : {}),
      customerId: opts.customerId ?? undefined,
      ...(customer?.telegramChatId ? { telegramChatId: customer.telegramChatId } : {}),
    },
  });
}

async function currentPromoKey(productId: number): Promise<string> {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { titleEn: true, offers: true } });
  if (!p) return "";
  const { rowsFromOffers } = await import("./supermarket/view");
  const { promoKey } = await import("./supermarket/promo-watch");
  return promoKey(
    rowsFromOffers(p.offers, p.titleEn).map((r) => ({
      retailer: r.retailer,
      inStock: r.inStock,
      promo: r.promoZh ?? r.promoEn,
      dealUnitCents: r.deal && r.deal.unitCents < r.shelfCents ? r.deal.unitCents : null,
    })),
  );
}

/** Unsubscribe links carry an HMAC so nobody can switch off someone else's alert by guessing ids. */
export function watchToken(watchId: number, email: string): string {
  const secret = process.env.AUTH_SECRET ?? "landed-dev-only-secret-do-not-use-in-production";
  return createHmac("sha256", secret).update(`watch:${watchId}:${email.toLowerCase()}`).digest("hex").slice(0, 32);
}

export async function unsubscribeWatch(watchId: number, token: string) {
  const w = await prisma.watch.findUnique({ where: { id: watchId } });
  if (!w || watchToken(w.id, w.email) !== token) return false;
  await prisma.watch.update({ where: { id: w.id }, data: { active: false } });
  return true;
}

export async function demandCounts(productId: number, days = 14) {
  const since = new Date(Date.now() - days * 86400_000);
  const [watches, clicks] = await Promise.all([
    prisma.watch.count({ where: { productId, active: true, createdAt: { gte: since } } }),
    prisma.affiliateClick.count({ where: { productId, createdAt: { gte: since } } }),
  ]);
  return { watches, clicks };
}
