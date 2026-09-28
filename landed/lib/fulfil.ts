import { prisma } from "./prisma";
import { priceProduct, quoteOffer, supplierReliability } from "./catalog";
import { demandCounts } from "./demand";
import { isFulfilEligible, type EligibilityEvidence } from "./eligibility";
import { routeOrder, type RoutableOffer } from "./routing";
import { storefrontPrice } from "./money/pricing";
import { customerRate, type FxMids } from "./money/fx";
import { commercialSettings, eligibilityThresholds, loadMids, loadProfiles, settlementRail } from "./settings";
import { hoursSince } from "./format";
import { requestAction } from "./actions/bus";
import type { FulfilmentMode } from "./types";

/**
 * Mids with our disclosed FX buffer applied. Quotes convert supplier cost at
 * this rate, so the buffer sits inside the locked cost and the realised FX
 * result can be booked separately when the supplier is actually paid.
 */
export function bufferedMids(mids: FxMids, bufferPct: number): FxMids {
  return Object.fromEntries(Object.entries(mids).map(([c, m]) => [c, c === "HKD" ? 1 : customerRate(m, bufferPct)]));
}

/** Everything needed to decide whether (and at what price) we can fulfil a product. */
export async function fulfilmentPlan(productId: number, qty = 1) {
  const priced = await priceProduct(productId);
  if (!priced) return null;
  const [profiles, { mids }, rail, settings] = await Promise.all([
    loadProfiles(),
    loadMids(),
    settlementRail(),
    commercialSettings(),
  ]);
  const buffered = bufferedMids(mids, settings.fxBufferPct);

  const routable: (RoutableOffer & { offer: (typeof priced.offers)[number]["offer"]; fxMid: number })[] = [];
  let buyerRouteCents: number | null = null;
  for (const p of priced.offers) {
    const buyer = quoteOffer(p.offer, qty, { kind: "CARD" }, profiles, mids);
    if (buyer && p.rank.eligibleForBest && !buyer.moqForced) {
      buyerRouteCents = Math.min(buyerRouteCents ?? Number.MAX_SAFE_INTEGER, buyer.totalHkdCents);
    }
    const cost = quoteOffer(p.offer, qty, { kind: "RAIL", rail }, profiles, buffered);
    if (!cost) continue;
    routable.push({
      offerId: p.offer.id,
      supplierMode: (p.offer.supplier?.fulfilmentMode ?? "AFFILIATE_ONLY") as FulfilmentMode,
      costCents: cost.totalHkdCents,
      inStock: p.offer.inStock,
      matchConfidence: p.offer.matchConfidence ?? 0,
      supplierReliability: supplierReliability(p.offer.supplier),
      moqForced: cost.moqForced,
      offer: p.offer,
      fxMid: p.offer.currency === "HKD" ? 1 : mids[p.offer.currency],
    });
  }
  const route = routeOrder(routable);
  const chosen = route.chosen ? routable.find((r) => r.offerId === route.chosen!.offerId)! : null;
  const price = chosen
    ? storefrontPrice({ costCents: chosen.costCents, buyerRouteCents, targetMarginPct: settings.targetMarginPct })
    : null;
  return { priced, route, chosen, price, buyerRouteCents, settings, rail, mids };
}

export async function eligibilityEvidence(productId: number) {
  const plan = await fulfilmentPlan(productId);
  if (!plan) return null;
  const { watches, clicks } = await demandCounts(productId);
  const product = plan.priced.product;

  // Two ways we can sell it: single orders from a retail-quantity source, or
  // pools from a wholesale one. Evidence comes from whichever is viable.
  const { bestPoolCandidate } = await import("./pools-service");
  const pool = await bestPoolCandidate(productId).catch(() => null);
  const single = plan.chosen && plan.price ? plan : null;
  const singleViable = Boolean(single?.price?.viable);
  const poolViable = Boolean(pool && (pool.beatsBuyerRouteByCents ?? 0) > 0);
  const via: "SINGLE" | "POOL" | null = singleViable ? "SINGLE" : poolViable ? "POOL" : single ? "SINGLE" : pool ? "POOL" : null;
  const poolMarginPct = pool ? plan.settings.targetMarginPct : null; // ladder prices are built at the target margin

  const evidence: EligibilityEvidence = {
    watches14d: watches,
    clicks14d: clicks,
    fulfilMatchConfidence: via === "POOL" ? (pool!.offer.matchConfidence ?? null) : (plan.chosen?.matchConfidence ?? null),
    hasFulfilSupplier: via !== null,
    liveMarginPct: via === "POOL" ? poolMarginPct : (plan.price?.marginPct ?? null),
    beatsBuyerRouteByCents: via === "POOL" ? pool!.beatsBuyerRouteByCents : (plan.price?.beatsBuyerRouteByCents ?? null),
    restricted: product.restricted,
    restrictedReason: product.restrictedReason,
    priceAgeHours: hoursSince((via === "POOL" ? pool!.offer : plan.chosen?.offer)?.lastCheckedAt),
  };
  const verdict = isFulfilEligible(evidence, await eligibilityThresholds());
  return { evidence, verdict, plan, via, pool };
}

/** Snapshot the evidence; when it passes, ask a human to enable fulfilment. */
export async function reviewEligibility(productId: number, actor: string) {
  const r = await eligibilityEvidence(productId);
  if (!r) throw new Error("Product not found");
  let actionRequestId: string | null = null;
  if (r.verdict.ok) {
    const product = r.plan.priced.product;
    const outcome = await requestAction({
      kind: "ENABLE_FULFIL",
      title: `Enable own checkout for ${product.title.slice(0, 60)}`,
      payload: { productId, evidence: r.evidence, priceCents: r.plan.price?.priceCents },
      idempotencyKey: `enable-fulfil:${productId}:${new Date().toISOString().slice(0, 10)}`,
      requestedBy: actor,
    });
    actionRequestId = outcome.actionId;
  }
  await prisma.eligibilityReview.create({
    data: {
      productId,
      evidence: JSON.stringify(r.evidence),
      ok: r.verdict.ok,
      missing: JSON.stringify(r.verdict.missing),
      actionRequestId,
    },
  });
  return { ...r.verdict, actionRequestId };
}

/** A human looked at both listings and confirms they are the same product. */
export async function verifyMatchByHuman(offerId: number, anchorOfferId: number, actor: string) {
  const [a, b] = offerId < anchorOfferId ? [offerId, anchorOfferId] : [anchorOfferId, offerId];
  await prisma.matchPair.upsert({
    where: { offerAId_offerBId: { offerAId: a, offerBId: b } },
    create: { offerAId: a, offerBId: b, verdict: "SAME", confidence: 1, reason: `verified by ${actor}`, model: "human" },
    update: { verdict: "SAME", confidence: 1, reason: `verified by ${actor}`, model: "human" },
  });
  const offer = await prisma.offer.update({ where: { id: offerId }, data: { matchConfidence: 1 } });
  if (offer.productId) await priceProduct(offer.productId, { persist: true });
  return offer;
}
