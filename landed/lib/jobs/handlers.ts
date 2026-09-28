import type { Job } from "@prisma/client";
import { prisma } from "../prisma";
import { getAdapter } from "../sources/adapters";
import { CrawlError, type DiscoveredCandidate } from "../sources/types";
import { enqueueJob, JobFailure } from "./queue";
import { withTimeout } from "./timeout";
import { clusterKeyword, priceProduct, upsertOffers } from "../catalog";
import { recordSearch, watchToken } from "../demand";
import { distillKeywords, refineKeywordsWithGemini } from "../discovery/keywords";
import { freshnessTier, isDue } from "../freshness";
import { queueEmail } from "../notify";
import { requestAction } from "../actions/bus";
import { guardListings, publicOrigin } from "../listings";
import { sweepPools } from "../pools-service";
import { clearEntries } from "../ledger";
import { hkd } from "../format";
import { rowsFromOffers } from "../supermarket/view";
import { retailerName } from "../supermarket/retailers";
import { newPromos, promoKey, type PromoRow } from "../supermarket/promo-watch";
import { runKeywordAlerts } from "../keyword-alert-service";
import {
  isPlatform,
  type ClusterPayload,
  type DiscoverPayload,
  type Platform,
  type PlatformCrawlResult,
  type SearchCrawlPayload,
} from "../types";

function failureOf(platform: Platform, e: unknown): PlatformCrawlResult {
  return {
    platform,
    ok: false,
    listings: 0,
    failure: e instanceof CrawlError ? e.kind : "ERROR",
    message: e instanceof Error ? e.message : String(e),
  };
}

async function markLoginWall(platform: Platform, e: unknown) {
  if (e instanceof CrawlError && e.kind === "LOGIN_WALL") {
    await prisma.platformSession.updateMany({ where: { platform }, data: { status: "EXPIRED", lastCheckedAt: new Date() } });
  }
}

export async function handleSearchCrawl(job: Job) {
  const payload = JSON.parse(job.payload) as SearchCrawlPayload;
  const results: PlatformCrawlResult[] = [];
  // Serial per platform — deliberate rate limiting.
  for (const platform of payload.platforms) {
    try {
      const adapter = await getAdapter(platform);
      const listings = await adapter.searchProducts(payload.keyword, { maxResults: 40 });
      await upsertOffers(payload.keyword, listings, job.id);
      results.push({ platform, ok: true, listings: listings.length });
    } catch (e) {
      await markLoginWall(platform, e);
      results.push(failureOf(platform, e));
    }
  }
  const any = results.some((r) => r.ok && r.listings > 0);
  if (any) await enqueueJob("CLUSTER", { keyword: payload.keyword } satisfies ClusterPayload, { dedupeKey: `cluster:${payload.keyword}` });
  const result = { keyword: payload.keyword, platforms: results, clusterEnqueued: any };
  if (results.length && results.every((r) => !r.ok)) throw new JobFailure(`all ${results.length} platform(s) failed`, result);
  return result;
}

export async function handleCluster(job: Job) {
  const payload = JSON.parse(job.payload) as ClusterPayload;
  return clusterKeyword(payload.keyword);
}

const OFFER_TIMEOUT_MS = 90_000;

/** Re-price whatever is due by freshness tier, capped per run. */
export async function handleRefreshOffers(job: Job) {
  const payload = JSON.parse(job.payload) as { productIds?: number[] };
  const max = Number(process.env.REFRESH_MAX_PRODUCTS ?? 25);
  const now = new Date();
  const products = await prisma.product.findMany({
    // Supermarket prices come from the Price Watch feed (SUPERMARKET_SYNC), never re-crawled per product.
    where: payload.productIds?.length ? { id: { in: payload.productIds }, segment: "GLOBAL" } : { segment: "GLOBAL" },
    include: {
      _count: {
        select: {
          channelListings: { where: { status: "LIVE" } },
          pools: { where: { status: "OPEN" } },
          watches: { where: { active: true } },
        },
      },
    },
    orderBy: { lastPricedAt: "asc" },
  });

  const due = [];
  for (const p of products) {
    if (payload.productIds?.length) {
      due.push(p);
      continue;
    }
    const openOrders = await prisma.orderLine.count({
      where: { productId: p.id, order: { status: { in: ["PAID", "ROUTED", "NEEDS_DECISION"] } } },
    });
    const search = await prisma.searchQuery.findUnique({ where: { normalized: p.keyword } });
    const tier = freshnessTier({
      liveListings: p._count.channelListings,
      openPools: p._count.pools,
      openOrders,
      activeWatches: p._count.watches,
      searchedWithinDays: search ? (now.getTime() - search.lastSearchedAt.getTime()) / 86400_000 : null,
    });
    if (isDue(p.lastPricedAt, tier, now)) due.push(p);
    if (due.length >= max) break;
  }

  let refreshed = 0;
  let delisted = 0;
  const failures: string[] = [];
  // A platform that answers with a captcha/login wall twice in a row will do so
  // for every offer: stop asking it this run instead of burning the time budget.
  const blockStreak = new Map<Platform, number>();
  const skipped = new Set<Platform>();
  for (const p of due) {
    const offers = await prisma.offer.findMany({ where: { productId: p.id } });
    for (const o of offers) {
      if (!isPlatform(o.platform) || skipped.has(o.platform)) continue;
      try {
        const adapter = await getAdapter(o.platform);
        if (!adapter.fetchDetail) continue;
        // One unresponsive listing must not eat the whole run's time budget.
        const detail = await withTimeout(adapter.fetchDetail(o.itemId), OFFER_TIMEOUT_MS, `${o.platform} ${o.itemId}`);
        if (!detail) {
          // null = confirmed dead listing (adapters throw on anything uncertain).
          await prisma.offer.update({ where: { id: o.id }, data: { inStock: false, lastCheckedAt: new Date() } });
          await prisma.offerSnapshot.create({ data: { offerId: o.id, price: o.latestPrice, currency: o.currency, inStock: false, jobId: job.id } });
          delisted++;
          continue;
        }
        await prisma.offer.update({
          where: { id: o.id },
          data: {
            latestPrice: detail.price,
            priceTiers: detail.priceTiers ? JSON.stringify(detail.priceTiers) : o.priceTiers,
            inStock: true,
            lastCheckedAt: new Date(),
          },
        });
        await prisma.offerSnapshot.create({ data: { offerId: o.id, price: detail.price, currency: detail.currency, inStock: true, jobId: job.id } });
        refreshed++;
        blockStreak.set(o.platform, 0);
      } catch (e) {
        failures.push(`#${o.id} ${o.platform}: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
        if (e instanceof CrawlError && (e.kind === "CAPTCHA" || e.kind === "LOGIN_WALL")) {
          await markLoginWall(o.platform, e);
          const n = (blockStreak.get(o.platform) ?? 0) + 1;
          blockStreak.set(o.platform, n);
          if (n >= 2) skipped.add(o.platform);
        }
      }
    }
    await priceProduct(p.id, { persist: true });
  }
  const result = { productsDue: due.length, offersRefreshed: refreshed, offersGone: delisted, blockedPlatforms: [...skipped], failures: failures.slice(0, 10) };
  if (failures.length && refreshed === 0 && delisted === 0) throw new JobFailure(`all ${failures.length} offer refresh(es) failed`, result);
  return result;
}

const FX_CURRENCIES = ["USD", "CNY", "JPY", "EUR", "GBP", "SGD"];

export async function handleFetchFx() {
  const res = await fetch("https://open.er-api.com/v6/latest/HKD", { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`FX API ${res.status}`);
  const data = (await res.json()) as { rates?: Record<string, number> };
  const updated: Record<string, number> = {};
  for (const c of FX_CURRENCIES) {
    const perHkd = data.rates?.[c];
    if (!perHkd) continue;
    const mid = 1 / perHkd; // HKD per 1 unit of c
    await prisma.fxQuote.upsert({
      where: { base_quote: { base: c, quote: "HKD" } },
      create: { base: c, quote: "HKD", mid, source: "open.er-api.com" },
      update: { mid, source: "open.er-api.com", fetchedAt: new Date() },
    });
    updated[`${c}/HKD`] = Number(mid.toFixed(5));
  }
  if (Object.keys(updated).length === 0) throw new Error("FX API returned no usable rates");
  return updated;
}

export async function handleDiscover(job: Job) {
  const payload = JSON.parse(job.payload) as DiscoverPayload;
  const platforms = payload.platforms?.length
    ? payload.platforms
    : (process.env.DISCOVER_PLATFORMS ?? "AMAZON,EBAY").split(",").map((s) => s.trim()).filter(isPlatform);
  const maxKeywords = payload.maxKeywords ?? Number(process.env.DISCOVER_MAX_KEYWORDS ?? 5);
  const results: PlatformCrawlResult[] = [];
  const candidates: DiscoveredCandidate[] = [];
  for (const platform of platforms) {
    try {
      const adapter = await getAdapter(platform);
      if (!adapter.discoverProducts) continue;
      const found = await adapter.discoverProducts({ maxResults: 30 });
      candidates.push(...found);
      results.push({ platform, ok: true, listings: found.length });
    } catch (e) {
      await markLoginWall(platform, e);
      results.push(failureOf(platform, e));
    }
  }
  let keywords: string[] = [];
  if (candidates.length && process.env.GEMINI_API_KEY) {
    keywords = await refineKeywordsWithGemini(candidates, maxKeywords).catch((e) => {
      console.warn(`[discover] Gemini refine failed, using heuristic keywords: ${e instanceof Error ? e.message : e}`);
      return [];
    });
  }
  if (!keywords.length) keywords = distillKeywords(candidates.map((c) => c.title), { max: maxKeywords });
  const crawls: string[] = [];
  for (const kw of keywords) {
    const r = await recordSearch(kw, { background: true });
    if (r.crawlJobId) crawls.push(kw);
  }
  const result = { platforms: results, candidates: candidates.length, keywords, crawlsEnqueued: crawls };
  if (results.length && results.every((r) => !r.ok)) throw new JobFailure(`all ${results.length} platform(s) failed`, result);
  return result;
}

/** Supermarket rows for a promo watch: which promotions run now and beat buying singles. */
async function promoRowsFor(productId: number): Promise<PromoRow[]> {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { titleEn: true, offers: true } });
  if (!p) return [];
  return rowsFromOffers(p.offers, p.titleEn).map((r) => ({
    retailer: r.retailer,
    inStock: r.inStock,
    promo: r.promoZh ?? r.promoEn,
    dealUnitCents: r.deal && r.deal.unitCents < r.shelfCents ? r.deal.unitCents : null,
  }));
}

/**
 * Alerts: ≥5% below the last price we told them, or at/below their target;
 * PROMO watches (supermarket items) also fire once per newly started promotion.
 */
export async function handleAlerts() {
  const watches = await prisma.watch.findMany({ where: { active: true }, include: { product: true } });
  let queued = 0;
  let promoQueued = 0;
  const failed: string[] = [];
  const origin = publicOrigin();
  for (const w of watches) {
    if (w.kind === "PROMO") {
      try {
        const rows = await promoRowsFor(w.productId);
        const fresh = newPromos(w.lastPromoKey, rows);
        const key = promoKey(rows);
        if (fresh.length) {
          const lead = fresh[0];
          const text = fresh.map((r) => `• ${retailerName(r.retailer)}「${r.promo}」`).join("\n");
          const n = await queueEmail({
            email: w.email,
            subject: `有優惠：${w.product.title.slice(0, 40)} @ ${retailerName(lead.retailer)}`,
            body: `${w.product.title}\n而家有優惠 Now on offer:\n${text}\n${origin}/p/${w.product.slug}\n\n取消通知 Unsubscribe: ${origin}/api/watch/unsubscribe?id=${w.id}&t=${watchToken(w.id, w.email)}`,
            dedupeKey: `promo:${w.id}:${key}`,
            telegramChatId: w.telegramChatId,
          });
          await requestAction({
            kind: "SEND_PRICE_ALERT",
            title: `Promo alert to ${w.email}`,
            payload: { notificationId: n.id, email: w.email, cents: lead.dealUnitCents ?? 0 },
            idempotencyKey: `promo:${w.id}:${key}`,
          });
          promoQueued++;
        }
        // Always remember what runs now: an ended promo that starts again later is news again.
        if (key !== (w.lastPromoKey ?? "")) await prisma.watch.update({ where: { id: w.id }, data: { lastPromoKey: key } });
      } catch (e) {
        failed.push(`#${w.id}: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
      }
    }
    const now = w.product.bestLandedHkdCents;
    if (now == null) continue;
    if (w.lastNotifiedCents == null && w.targetHkdCents == null) {
      // Watched before the product had a price: take today's as the baseline, silently.
      await prisma.watch.update({ where: { id: w.id }, data: { lastNotifiedCents: now } });
      continue;
    }
    try {
      const dropped = w.lastNotifiedCents != null && now <= Math.round(w.lastNotifiedCents * 0.95);
      const hitTarget = w.targetHkdCents != null && now <= w.targetHkdCents && (w.lastNotifiedCents == null || now < w.lastNotifiedCents);
      if (!dropped && !hitTarget) continue;
      const n = await queueEmail({
        email: w.email,
        subject: `減價：${w.product.title.slice(0, 40)} 到手價 ${hkd(now)}`,
        body: `${w.product.title}\n到手價而家 ${hkd(now)}（之前 ${hkd(w.lastNotifiedCents)}）。\nLanded price is now ${hkd(now)}.\n${origin}/p/${w.product.slug}\n\n取消通知 Unsubscribe: ${origin}/api/watch/unsubscribe?id=${w.id}&t=${watchToken(w.id, w.email)}`,
        dedupeKey: `alert:${w.id}:${now}`,
        telegramChatId: w.telegramChatId,
      });
      await requestAction({
        kind: "SEND_PRICE_ALERT",
        title: `Price alert to ${w.email}`,
        payload: { notificationId: n.id, email: w.email, cents: now },
        idempotencyKey: `alert:${w.id}:${now}`,
      });
      await prisma.watch.update({ where: { id: w.id }, data: { lastNotifiedCents: now } });
      queued++;
    } catch (e) {
      // One bad watch must not skip everyone after it.
      failed.push(`#${w.id}: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
    }
  }
  const keyword = await runKeywordAlerts();
  return { watches: watches.length, alertsQueued: queued, promoAlertsQueued: promoQueued, failed, ...keyword };
}

export async function handleGuardListings() {
  return guardListings();
}

export async function handlePoolSweep() {
  return sweepPools();
}

export async function handleClearLedger() {
  return { cleared: await clearEntries() };
}
