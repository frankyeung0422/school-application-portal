import { prisma } from "./prisma";
import { fulfilmentPlan } from "./fulfil";
import { getChannel } from "./channels/registry";
import { channelPriceFor, listingGuard, type ChannelFees } from "./channels/guard";
import { publishSocial } from "./channels/meta";
import { cheapestClaim, lintClaims } from "./claims";
import { requestAction } from "./actions/bus";
import { commercialSettings } from "./settings";
import type { RunMode } from "./actions/kinds";
import { CHANNELS, type Channel } from "./types";
import { hkd } from "./format";
import { UserFacingError } from "./errors";

// Channel Autopilot: propose → approve → publish → guard → reprice/delist.

export class ListingError extends UserFacingError {}

export function isChannel(v: string): v is Channel {
  return (CHANNELS as readonly string[]).includes(v);
}

export async function channelFees(channel: Channel): Promise<{ fees: ChannelFees; floorPct: number }> {
  const acct = await prisma.channelAccount.findUnique({ where: { platform: channel } });
  return {
    fees: {
      commissionPct: acct?.commissionPct ?? 0,
      paymentFeePct: acct?.paymentFeePct ?? 0,
      fixedFeeHkdCents: acct?.fixedFeeHkdCents ?? 0,
    },
    floorPct: acct?.marginFloorPct ?? 0.08,
  };
}

export function appOrigin() {
  return process.env.APP_ORIGIN ?? "http://localhost:6565";
}

/**
 * The address the public reaches us at: canonical URLs, sitemap, and links in
 * emails/Telegram. Separate from APP_ORIGIN, which also drives redirects and
 * would bounce a local admin session to the public host.
 */
export function publicOrigin() {
  return (process.env.PUBLIC_ORIGIN ?? process.env.APP_ORIGIN ?? "http://localhost:6565").replace(/\/$/, "");
}

export function listingCopy(p: { title: string; slug: string }, priceCents: number, sourceCount: number, checkedAt: Date) {
  const title = p.title.slice(0, 80);
  const description = [
    p.title,
    "",
    `到手價 ${hkd(priceCents)}（已包運費、集運及外幣手續費）`,
    `Landed price ${hkd(priceCents)} delivered to Hong Kong — shipping, forwarding and FX included.`,
    cheapestClaim(sourceCount, checkedAt),
    "",
    "我哋會向已核實嘅供應商落單，並提供訂單追蹤。We order from a verified supplier and share tracking.",
    `${publicOrigin()}/p/${p.slug}`,
  ].join("\n");
  return { title, description };
}

export async function proposeListing(productId: number, channel: Channel, actor: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ListingError("Product not found");
  if (product.fulfilMode !== "FULFIL") throw new ListingError("Only products approved for fulfilment can be listed");
  if (product.restricted) throw new ListingError(`Restricted: ${product.restrictedReason}`);
  const adapter = getChannel(channel);
  const avail = adapter.availability();
  if (!avail.ok && channel !== "STOREFRONT") {
    // Still allowed in DRY mode for EBAY/SHOPIFY/META (their adapters never call out in DRY);
    // stub marketplaces refuse outright.
    if (["TIKTOK_SHOP", "SHOPEE", "HKTVMALL"].includes(channel)) throw new ListingError(avail.reason);
  }

  const plan = await fulfilmentPlan(productId);
  if (!plan?.chosen) throw new ListingError(plan?.route.reason ?? "No orderable source");
  const { fees, floorPct } = await channelFees(channel);
  const settings = await commercialSettings();
  const priceCents = channelPriceFor(plan.chosen.costCents, fees, Math.max(floorPct, settings.targetMarginPct));
  const copy = listingCopy(product, priceCents, product.sourceCount, product.lastPricedAt ?? new Date());
  const issues = lintClaims(`${copy.title}\n${copy.description}`);
  if (issues.length) throw new ListingError(`Claims lint: ${issues.map((i) => i.rule).join(", ")}`);

  const listing = await prisma.channelListing.upsert({
    where: { productId_platform: { productId, platform: channel } },
    create: { productId, platform: channel, priceHkdCents: priceCents, title: copy.title, description: copy.description, status: "PENDING_APPROVAL" },
    update: { priceHkdCents: priceCents, title: copy.title, description: copy.description, status: "PENDING_APPROVAL", delistReason: null },
  });
  const out = await requestAction({
    kind: "PUBLISH_LISTING",
    title: `List ${product.title.slice(0, 50)} on ${channel} at ${hkd(priceCents)}`,
    payload: { listingId: listing.id },
    idempotencyKey: `publish:${listing.id}:${listing.updatedAt.getTime()}`,
    requestedBy: actor,
  });
  await prisma.channelListing.update({ where: { id: listing.id }, data: { actionRequestId: out.actionId } });
  return { listing, outcome: out };
}

export async function publishListing(listingId: number, mode: RunMode) {
  const listing = await prisma.channelListing.findUnique({ where: { id: listingId }, include: { product: true } });
  if (!listing) throw new ListingError("Listing not found");
  if (listing.product.restricted) throw new ListingError("Restricted product");
  const adapter = getChannel(listing.platform as Channel);
  try {
    const r = await adapter.publish(
      {
        sku: `LANDED-${listing.productId}`,
        title: listing.title,
        description: listing.description,
        priceHkdCents: listing.priceHkdCents,
        qty: listing.qty,
        imageUrl: listing.product.imageUrl,
        productUrl: `${publicOrigin()}/p/${listing.product.slug}`,
      },
      mode,
    );
    await prisma.channelListing.update({
      where: { id: listingId },
      data: { status: "LIVE", externalId: r.externalId, dryRun: mode === "DRY", lastGuardCheckAt: new Date() },
    });
    return { externalId: r.externalId, url: r.url ?? null, dryRun: mode === "DRY" };
  } catch (e) {
    await prisma.channelListing.update({ where: { id: listingId }, data: { status: "FAILED", delistReason: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}

export async function repriceListing(listingId: number, newPriceCents: number, mode: RunMode) {
  const listing = await prisma.channelListing.findUnique({ where: { id: listingId } });
  if (!listing?.externalId || listing.status !== "LIVE") throw new ListingError("Listing is not live");
  await getChannel(listing.platform as Channel).updatePrice(listing.externalId, newPriceCents, mode);
  await prisma.channelListing.update({ where: { id: listingId }, data: { priceHkdCents: newPriceCents, lastGuardVerdict: "REPRICED" } });
  return { from: listing.priceHkdCents, to: newPriceCents };
}

export async function delistListing(listingId: number, reason: string, mode: RunMode) {
  const listing = await prisma.channelListing.findUnique({ where: { id: listingId } });
  if (!listing) throw new ListingError("Listing not found");
  if (listing.externalId && listing.status === "LIVE") {
    await getChannel(listing.platform as Channel).delist(listing.externalId, mode);
  }
  await prisma.channelListing.update({ where: { id: listingId }, data: { status: "DELISTED", delistReason: reason, lastGuardVerdict: "DELISTED" } });
  return { reason };
}

/** GUARD_LISTINGS job: every live listing re-checked against live cost. */
export async function guardListings() {
  const live = await prisma.channelListing.findMany({ where: { status: "LIVE" } });
  const settings = await commercialSettings();
  const counts = { checked: 0, keep: 0, reprice: 0, delist: 0 };
  for (const l of live) {
    counts.checked++;
    const plan = await fulfilmentPlan(l.productId);
    const { fees, floorPct } = await channelFees(l.platform as Channel);
    const verdict = listingGuard({
      listedPriceCents: l.priceHkdCents,
      liveCostCents: plan?.chosen?.costCents ?? null,
      inStock: plan?.chosen?.inStock ?? false,
      fees,
      marginFloorPct: floorPct,
      maxRepricePct: settings.maxRepricePct,
    });
    await prisma.channelListing.update({
      where: { id: l.id },
      data: { lastGuardCheckAt: new Date(), lastGuardVerdict: `${verdict.verdict}: ${verdict.reason}` },
    });
    if (verdict.verdict === "KEEP") counts.keep++;
    else if (verdict.verdict === "REPRICE") {
      counts.reprice++;
      await requestAction({
        kind: "REPRICE_LISTING",
        title: `Reprice listing #${l.id} on ${l.platform}: ${verdict.reason}`,
        payload: { listingId: l.id, newPriceCents: verdict.newPriceCents },
        idempotencyKey: `reprice:${l.id}:${verdict.newPriceCents}`,
      });
    } else {
      counts.delist++;
      await requestAction({
        kind: "DELIST_LISTING",
        title: `Delist listing #${l.id} on ${l.platform}: ${verdict.reason}`,
        payload: { listingId: l.id, reason: verdict.reason },
        idempotencyKey: `delist:${l.id}:${l.updatedAt.getTime()}`,
      });
    }
  }
  return counts;
}

export async function draftSocialPost(productId: number, platform: "FACEBOOK" | "INSTAGRAM", actor: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { pools: { where: { status: "OPEN" } } } });
  if (!product) throw new ListingError("Product not found");
  if (product.restricted) throw new ListingError("Restricted product");
  if (product.bestLandedHkdCents == null) throw new ListingError("No trustworthy price yet");
  const pool = product.pools[0];
  const lines = [
    `${product.title.slice(0, 90)}`,
    `到手價 ${hkd(product.bestLandedHkdCents)} 起 · delivered to HK from ${hkd(product.bestLandedHkdCents)}`,
    cheapestClaim(product.sourceCount, product.lastPricedAt ?? new Date()),
  ];
  if (pool) lines.push(`拼單進行中：已有 ${pool.committedQty} 件 — group buy open, ${pool.committedQty} committed`);
  lines.push("#到手價 #香港網購 #比價");
  const caption = lines.join("\n");
  // Pool counts come straight from the database, so live scarcity is allowed.
  const issues = lintClaims(caption, { allowScarcity: Boolean(pool) });
  const post = await prisma.socialPost.create({
    data: {
      productId,
      platform,
      caption,
      imageUrl: product.imageUrl,
      status: issues.length ? "BLOCKED" : "PENDING_APPROVAL",
      lintIssues: JSON.stringify(issues),
    },
  });
  if (issues.length) return { post, outcome: null };
  const outcome = await requestAction({
    kind: "PUBLISH_SOCIAL",
    title: `Post ${product.title.slice(0, 50)} to ${platform}`,
    payload: { postId: post.id },
    idempotencyKey: `social:${post.id}`,
    requestedBy: actor,
  });
  await prisma.socialPost.update({ where: { id: post.id }, data: { actionRequestId: outcome.actionId } });
  return { post, outcome };
}

export async function publishSocialPost(postId: number, mode: RunMode) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, include: { product: true } });
  if (!post) throw new ListingError("Post not found");
  if (lintClaims(post.caption, { allowScarcity: true }).length) throw new ListingError("Caption fails claims lint");
  try {
    const r = await publishSocial(
      {
        platform: post.platform as "FACEBOOK" | "INSTAGRAM",
        caption: post.caption,
        imageUrl: post.imageUrl,
        link: post.product ? `${publicOrigin()}/p/${post.product.slug}` : publicOrigin(),
      },
      mode,
    );
    await prisma.socialPost.update({ where: { id: postId }, data: { status: "PUBLISHED", externalId: r.externalId, dryRun: mode === "DRY", publishedAt: new Date() } });
    return { externalId: r.externalId, dryRun: mode === "DRY" };
  } catch (e) {
    await prisma.socialPost.update({ where: { id: postId }, data: { status: "FAILED" } });
    throw e;
  }
}
