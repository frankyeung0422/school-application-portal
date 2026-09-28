import type { Job } from "@prisma/client";
import { prisma } from "./prisma";
import { UserFacingError } from "./errors";
import { getAdapter } from "./sources/adapters";
import { CrawlError } from "./sources/types";
import { parseProductUrl, needsLogin } from "./sources/url";
import { clusterKeyword, upsertOffers } from "./catalog";
import { distillKeyword } from "./discovery/keywords";
import { enqueueJob } from "./jobs/queue";
import { recordSearch, searchPlatforms } from "./demand";
import { PLATFORM_LABELS, type Platform } from "./types";

// Paste a link → the worker fetches that exact listing, then the normal crawl
// finds alternatives behind it. The web app only parses and enqueues: crawling
// from a request would drag Playwright into the Next.js server.

export class PasteError extends UserFacingError {}

export interface PastePayload {
  url: string;
  platform: Platform;
  itemId: string;
}

/** Web side: validate the link and queue the fetch. */
export async function requestPaste(input: string) {
  const parsed = parseProductUrl(input);
  if (!parsed) {
    throw new PasteError(
      "認唔到呢條連結。支援 Amazon / eBay / AliExpress / Alibaba / 淘寶 / 天貓 / 京東 / 1688 嘅產品頁 — Unrecognised product link.",
    );
  }
  // Already known? Then there is nothing to wait for.
  const existing = await prisma.offer.findUnique({
    where: { platform_itemId: { platform: parsed.platform, itemId: parsed.itemId } },
    include: { product: true },
  });
  if (existing?.product) {
    return { slug: existing.product.slug, jobId: null, platform: parsed.platform };
  }
  const job = await enqueueJob(
    "PASTE_FETCH",
    { url: parsed.url, platform: parsed.platform, itemId: parsed.itemId } satisfies PastePayload,
    { dedupeKey: `paste:${parsed.platform}:${parsed.itemId}` },
  );
  return { slug: null, jobId: job.id, platform: parsed.platform };
}

/** Worker side: fetch the listing, cluster it, and kick off the comparison. */
export async function handlePasteFetch(job: Job) {
  const payload = JSON.parse(job.payload) as PastePayload;
  const adapter = await getAdapter(payload.platform);
  if (!adapter.fetchDetail) throw new PasteError(`${PLATFORM_LABELS[payload.platform]} 暫時未支援 — not supported yet`);

  let listing;
  try {
    listing = await adapter.fetchDetail(payload.itemId);
  } catch (e) {
    if (e instanceof CrawlError && (e.kind === "LOGIN_WALL" || e.kind === "CAPTCHA")) {
      throw new PasteError(
        needsLogin(payload.platform)
          ? `${PLATFORM_LABELS[payload.platform]} 需要一次 QR 登入先讀到（npm run login）— needs a one-time QR login on the server.`
          : `${PLATFORM_LABELS[payload.platform]} 暫時擋住我哋讀取（${e.kind}）— the site blocked the read.`,
      );
    }
    // Keep the platform's own words, but as a sentence a shopper can act on.
    throw new PasteError(
      `讀唔到呢個產品（可能已落架、缺貨或者冇標價）— could not read that listing: ${e instanceof Error ? e.message.slice(0, 140) : e}`,
    );
  }
  if (!listing) throw new PasteError("呢個產品已經落架或者讀唔到價錢 — listing is gone or has no price.");

  const keyword = distillKeyword(listing.title) ?? listing.title.slice(0, 60);
  await upsertOffers(keyword, [{ ...listing, url: payload.url }], job.id);
  // Cluster now so the pasted item has a page immediately…
  await clusterKeyword(keyword);
  const offer = await prisma.offer.findUniqueOrThrow({
    where: { platform_itemId: { platform: payload.platform, itemId: payload.itemId } },
    include: { product: true },
  });
  // …then let the normal pipeline look for alternatives elsewhere.
  const { crawlJobId } = await recordSearch(keyword);
  const searchJobId =
    crawlJobId ??
    (await enqueueJob("SEARCH_CRAWL", { keyword, platforms: await searchPlatforms() }, { dedupeKey: `search:${keyword}` })).id;

  return {
    slug: offer.product?.slug ?? null,
    title: listing.title,
    keyword,
    platform: payload.platform,
    searchJobId,
  };
}
