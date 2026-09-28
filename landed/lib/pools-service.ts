import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { authorizationPlan, buildLadder, canUnlock, settleUnlock, tierFor, type LadderStep } from "./pools";
import { fulfilmentPlan, bufferedMids } from "./fulfil";
import { MIN_ROUTING_MATCH } from "./routing";
import { loadProfiles, loadMids, commercialSettings, settlementRail } from "./settings";
import { quoteOffer } from "./catalog";
import { assertChargeAllowed, getProvider, getProviderById, type NormalizedEvent } from "./payments";
import { stripeIsLiveKey } from "./payments/stripe";
import { postEntry } from "./ledger";
import { requestAction } from "./actions/bus";
import { safeJson, slugify } from "./format";
import { UserFacingError } from "./errors";
import type { PriceTier, Realness } from "./types";

// 拼單 Pools: DB orchestration around the pure rules in lib/pools.ts.

export class PoolError extends UserFacingError {}

export const DEFAULT_POOL_DAYS = 7;

export function ladderOf(pool: { ladder: string }): LadderStep[] {
  return safeJson<LadderStep[]>(pool.ladder, []);
}

/** Cash tied up right now: open pools at their first rung + supplier orders not yet paid. */
export async function openExposureCents() {
  const [pools, sos] = await Promise.all([
    prisma.pool.aggregate({ where: { status: { in: ["OPEN", "UNLOCKING"] } }, _sum: { exposureHkdCents: true } }),
    prisma.supplierOrder.aggregate({ where: { status: { in: ["TASK_OPEN", "NEEDS_DECISION"] } }, _sum: { expectedCostHkdCents: true } }),
  ]);
  return (pools._sum.exposureHkdCents ?? 0) + (sos._sum.expectedCostHkdCents ?? 0);
}

export async function currentEnvelope() {
  return prisma.capitalEnvelope.findFirst({ orderBy: { version: "desc" } });
}

/**
 * The best wholesale source a pool could buy from, and its ladder. Wholesale
 * MOQ sources are exactly what single orders must never route to (we would be
 * left holding stock) and exactly what a pool exists for.
 */
export async function bestPoolCandidate(productId: number) {
  const plan = await fulfilmentPlan(productId);
  if (!plan) throw new PoolError("Product not found");
  const profiles = await loadProfiles();
  const mids = bufferedMids(plan.mids, plan.settings.fxBufferPct);
  let best: { offer: (typeof plan.priced.offers)[number]["offer"]; ladder: LadderStep[]; singleUnitHkdCents: number } | null = null;
  const reasons: string[] = [];
  for (const { offer } of plan.priced.offers) {
    const mode = offer.supplier?.fulfilmentMode ?? "AFFILIATE_ONLY";
    const tiers = safeJson<PriceTier[] | null>(offer.priceTiers, null);
    if (mode === "AFFILIATE_ONLY") continue;
    if (!offer.inStock || (offer.matchConfidence ?? 0) < MIN_ROUTING_MATCH) {
      reasons.push(`#${offer.id} not in stock or not verified`);
      continue;
    }
    if (!tiers?.length && !(offer.moq && offer.moq > 1)) continue;
    const profile = profiles[offer.platform];
    if (!profile) continue;
    const built = buildLadder({
      price: offer.latestPrice,
      currency: offer.currency,
      priceTiers: tiers,
      moq: offer.moq,
      packQty: offer.packQty,
      weightKg: offer.weightKg,
      profile,
      mids,
      rail: plan.rail,
      targetMarginPct: plan.settings.targetMarginPct,
    });
    if (!built.ladder.length) {
      reasons.push(`#${offer.id} tiers do not lower the landed price`);
      continue;
    }
    if (!best || built.ladder[0].unitHkdCents < best.ladder[0].unitHkdCents) best = { offer, ...built };
  }
  if (!best) {
    throw new PoolError(`No orderable wholesale source with price tiers${reasons.length ? ` (${reasons.join("; ")})` : ""}`);
  }
  const firstRung = best.ladder[0];
  // The pool must beat what one buyer pays alone by card, or nobody should join.
  const beatsBuyerRouteByCents = plan.buyerRouteCents == null ? null : plan.buyerRouteCents - firstRung.unitHkdCents;
  return {
    plan,
    offer: best.offer,
    ladder: best.ladder,
    singleUnitHkdCents: best.singleUnitHkdCents,
    firstRung,
    beatsBuyerRouteByCents,
    exposureHkdCents: firstRung.unitHkdCents * firstRung.minQty,
  };
}

/** Build the ladder a pool would have, without creating anything. */
export async function proposePool(productId: number) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new PoolError("Product not found");
  if (product.fulfilMode !== "FULFIL") throw new PoolError("Pools need a product approved for fulfilment");
  if (product.restricted) throw new PoolError("Restricted product");
  const c = await bestPoolCandidate(productId);
  if (c.beatsBuyerRouteByCents != null && c.beatsBuyerRouteByCents <= 0) {
    throw new PoolError("First pool rung is not cheaper than buying one yourself — a pool would save nobody anything");
  }
  return { product, ...c };
}

export async function requestOpenPool(productId: number, actor: string, days = DEFAULT_POOL_DAYS) {
  const p = await proposePool(productId);
  return requestAction({
    kind: "OPEN_POOL",
    title: `Open 拼單 for ${p.product.title.slice(0, 60)} — first rung ${p.ladder[0].minQty} units`,
    payload: { productId, days, ladder: p.ladder, exposureHkdCents: p.exposureHkdCents },
    // One open request per pool generation: a second click while one waits is a duplicate.
    idempotencyKey: `open-pool:${productId}:${await prisma.pool.count({ where: { productId } })}`,
    requestedBy: actor,
  });
}

/** OPEN_POOL handler body. Re-derives the ladder: prices may have moved since the request. */
export async function openPool(productId: number, days: number) {
  const p = await proposePool(productId);
  const envelope = await currentEnvelope();
  if (!envelope) throw new PoolError("No capital envelope — set one on /admin before opening pools");
  const exposure = await openExposureCents();
  if (exposure + p.exposureHkdCents > envelope.maxOpenExposureHkdCents) {
    throw new PoolError(
      `Capital envelope v${envelope.version} exceeded: open HK$${(exposure / 100).toFixed(0)} + pool HK$${(p.exposureHkdCents / 100).toFixed(0)} > HK$${(envelope.maxOpenExposureHkdCents / 100).toFixed(0)}`,
    );
  }
  const pool = await prisma.pool.create({
    data: {
      slug: `${slugify(p.product.title).slice(0, 40)}-${randomBytes(3).toString("hex")}`,
      productId,
      offerId: p.offer.id,
      ladder: JSON.stringify(p.ladder),
      singleUnitHkdCents: p.singleUnitHkdCents,
      deadline: new Date(Date.now() + days * 86400_000),
      exposureHkdCents: p.exposureHkdCents,
    },
  });
  return pool;
}

export async function commitToPool(opts: {
  slug: string;
  customer: { id: number; email: string; providerCustomer: string | null };
  qty: number;
  origin: string;
}) {
  if (!Number.isInteger(opts.qty) || opts.qty < 1 || opts.qty > 10) throw new PoolError("數量 1–10 Quantity must be 1–10");
  const pool = await prisma.pool.findUnique({ where: { slug: opts.slug } });
  if (!pool || pool.status !== "OPEN") throw new PoolError("此拼單已截止 Pool is not open");
  if (pool.deadline < new Date()) throw new PoolError("拼單已過期 Pool has expired");
  const existing = await prisma.poolCommitment.findUnique({
    where: { poolId_customerId: { poolId: pool.id, customerId: opts.customer.id } },
  });
  if (existing && existing.status !== "PENDING_SETUP" && existing.status !== "RELEASED") {
    throw new PoolError("你已加入此拼單 You have already joined this pool");
  }
  const ladder = ladderOf(pool);
  // The most this buyer can ever be charged: the price the pool is at once their
  // units count. It only goes down from here as others join.
  const maxUnit = tierFor(pool.committedQty + opts.qty, ladder).unitHkdCents;
  const commitment = existing
    ? await prisma.poolCommitment.update({
        where: { id: existing.id },
        data: { qty: opts.qty, maxUnitHkdCents: maxUnit, status: "PENDING_SETUP" },
      })
    : await prisma.poolCommitment.create({
        data: { poolId: pool.id, customerId: opts.customer.id, qty: opts.qty, maxUnitHkdCents: maxUnit },
      });

  const provider = getProvider();
  await assertChargeAllowed(provider);
  const setup = await provider.createSetup({
    commitmentId: commitment.id,
    email: opts.customer.email,
    customerRef: opts.customer.providerCustomer,
    successUrl: `${opts.origin}/pools/${pool.slug}?joined=1`,
    cancelUrl: `${opts.origin}/pools/${pool.slug}`,
  });
  if (setup.customerRef && setup.customerRef !== opts.customer.providerCustomer) {
    await prisma.customer.update({ where: { id: opts.customer.id }, data: { providerCustomer: setup.customerRef } });
  }
  return { commitment, redirectUrl: setup.redirectUrl };
}

export async function onSetupCompleted(event: NormalizedEvent) {
  const commitmentId = Number(event.metadata.commitmentId);
  const c = await prisma.poolCommitment.findUnique({ where: { id: commitmentId }, include: { pool: true, customer: true } });
  if (!c) throw new Error(`SETUP_COMPLETED for unknown commitment ${event.metadata.commitmentId}`);
  if (c.status !== "PENDING_SETUP") return;
  await prisma.$transaction([
    prisma.poolCommitment.update({
      where: { id: c.id },
      data: { status: "COMMITTED", paymentMethodRef: event.paymentMethodRef ?? null },
    }),
    prisma.pool.update({ where: { id: c.poolId }, data: { committedQty: { increment: c.qty } } }),
    ...(event.customerRef && !c.customer.providerCustomer
      ? [prisma.customer.update({ where: { id: c.customerId }, data: { providerCustomer: event.customerRef } })]
      : []),
  ]);
  await maybeUnlock(c.poolId);
}

export async function maybeUnlock(poolId: number) {
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return null;
  const check = canUnlock({ ...pool, ladder: ladderOf(pool) }, new Date());
  if (check.ok) {
    return requestAction({
      kind: "UNLOCK_POOL",
      title: `拼單成團 ${pool.slug}: ${pool.committedQty} units committed`,
      payload: { poolId },
      idempotencyKey: `unlock:${poolId}`,
    });
  }
  if (check.expired) await failPool(poolId, check.reason);
  return null;
}

async function failPool(poolId: number, reason: string) {
  const moved = await prisma.pool.updateMany({ where: { id: poolId, status: "OPEN" }, data: { status: "FAILED", outcome: JSON.stringify({ reason }) } });
  if (moved.count) {
    await prisma.poolCommitment.updateMany({ where: { poolId, status: { in: ["COMMITTED", "PENDING_SETUP"] } }, data: { status: "RELEASED" } });
  }
}

/**
 * UNLOCK_POOL handler body: authorize every commitment, settle by the pure
 * rules, capture or void, then create ONE supplier order at the earned tier.
 */
export async function unlockPool(poolId: number) {
  const claimed = await prisma.pool.updateMany({ where: { id: poolId, status: "OPEN" }, data: { status: "UNLOCKING" } });
  if (claimed.count !== 1) throw new PoolError("Pool is not OPEN");
  const pool = (await prisma.pool.findUnique({ where: { id: poolId }, include: { commitments: { include: { customer: true } }, offer: true } }))!;
  const ladder = ladderOf(pool);
  const committed = pool.commitments.filter((c) => c.status === "COMMITTED" && c.paymentMethodRef);
  const provider = getProvider();
  await assertChargeAllowed(provider);

  const plan = authorizationPlan(committed.map((c) => ({ id: c.id, qty: c.qty, maxUnitHkdCents: c.maxUnitHkdCents })), ladder);
  const holds = new Map(plan.holds.map((h) => [h.id, h]));
  const authResults: Record<number, "AUTHORIZED" | "DECLINED"> = {};
  const authRefs = new Map<number, string>();
  let realness: Realness = "TEST";

  for (const c of committed) {
    const hold = holds.get(c.id)!;
    const r = await provider.authorize({
      customerRef: c.customer.providerCustomer,
      paymentMethodRef: c.paymentMethodRef!,
      amountHkdCents: hold.amountCents,
      idempotencyKey: `pool-auth:${pool.id}:${c.id}`,
      metadata: { poolId: String(pool.id), commitmentId: String(c.id) },
    });
    authResults[c.id] = r.status;
    authRefs.set(c.id, r.ref);
    // Test keys and the mock provider can only ever move TEST money.
    realness = provider.id === "stripe" && stripeIsLiveKey() ? "REAL" : "TEST";
    await prisma.paymentRecord.create({
      data: {
        commitmentId: c.id,
        provider: provider.id,
        providerRef: r.ref,
        kind: "AUTHORIZE",
        amountHkdCents: hold.amountCents,
        status: r.status === "AUTHORIZED" ? "SUCCEEDED" : "DECLINED",
        realness,
      },
    });
    await prisma.poolCommitment.update({
      where: { id: c.id },
      data: { status: r.status === "AUTHORIZED" ? "AUTHORIZED" : "DECLINED", authorizationRef: r.ref },
    });
  }

  const settings = await commercialSettings();
  const heldTotal = plan.holds.reduce((s, h) => s + h.amountCents, 0);
  const settle = settleUnlock(
    committed.map((c) => ({ id: c.id, qty: c.qty, maxUnitHkdCents: c.maxUnitHkdCents })),
    authResults,
    ladder,
    Math.round(heldTotal * settings.poolMaxAbsorbPct),
  );

  if (settle.decision === "VOID_ALL") {
    for (const id of settle.voids) {
      const ref = authRefs.get(id)!;
      await getProviderById(provider.id).cancelAuthorization(ref);
      await prisma.paymentRecord.create({
        data: { commitmentId: id, provider: provider.id, providerRef: ref, kind: "CANCEL", amountHkdCents: holds.get(id)!.amountCents, status: "SUCCEEDED", realness },
      });
    }
    await prisma.poolCommitment.updateMany({ where: { poolId, status: { in: ["AUTHORIZED", "COMMITTED"] } }, data: { status: "RELEASED" } });
    await prisma.pool.update({ where: { id: poolId }, data: { status: "FAILED", outcome: JSON.stringify(settle) } });
    return { decision: settle.decision, reason: settle.reason };
  }

  let capturedQty = 0;
  for (const cap of settle.captures) {
    const ref = authRefs.get(cap.id)!;
    const r = await provider.capture(ref, cap.amountCents);
    const c = committed.find((x) => x.id === cap.id)!;
    await prisma.paymentRecord.create({
      data: { commitmentId: cap.id, provider: provider.id, providerRef: ref, kind: "CAPTURE", amountHkdCents: cap.amountCents, status: r.status, realness },
    });
    if (r.status !== "SUCCEEDED") {
      await prisma.poolCommitment.update({ where: { id: cap.id }, data: { status: "DECLINED" } });
      continue;
    }
    capturedQty += c.qty;
    await prisma.poolCommitment.update({
      where: { id: cap.id },
      data: { status: "CHARGED", chargedUnitHkdCents: Math.round(cap.amountCents / c.qty) },
    });
    await postEntry({
      kind: "SALE",
      amountHkdCents: cap.amountCents,
      realness,
      sourceRef: `pool-capture:${pool.id}:${cap.id}`,
      poolId: pool.id,
      productId: pool.productId,
      channel: "POOL",
      memo: `拼單 ${pool.slug} × ${c.qty}`,
    });
  }

  // Cost of the bulk buy at the tier the captured quantity earns, via the settlement rail.
  const [profiles, { mids }, rail] = await Promise.all([loadProfiles(), loadMids(), settlementRail()]);
  const bulk = quoteOffer(pool.offer, Math.max(1, capturedQty), { kind: "RAIL", rail }, profiles, bufferedMids(mids, settings.fxBufferPct));
  const so = await prisma.supplierOrder.create({
    data: {
      poolId: pool.id,
      offerId: pool.offerId,
      qty: capturedQty,
      expectedCostHkdCents: bulk?.totalHkdCents ?? 0,
      rail: rail.name,
      fxMid: pool.offer.currency === "HKD" ? 1 : (mids[pool.offer.currency] ?? 1),
      fxBufferPct: settings.fxBufferPct,
      status: "TASK_OPEN",
      mode: "MANUAL_ASSISTED",
      routingReason: `Pool bulk order at tier for ${capturedQty} units. ${settle.reason}`,
    },
  });
  const place = await requestAction({
    kind: "PLACE_SUPPLIER_ORDER",
    title: `拼單 bulk buy ${capturedQty} × offer #${pool.offerId}`,
    payload: { supplierOrderId: so.id },
    idempotencyKey: `place:${so.id}`,
  });
  await prisma.supplierOrder.update({ where: { id: so.id }, data: { actionRequestId: place.actionId } });
  await prisma.pool.update({
    where: { id: poolId },
    data: { status: "UNLOCKED", unlockedAt: new Date(), outcome: JSON.stringify({ ...settle, capturedQty }) },
  });
  return { decision: settle.decision, capturedQty, supplierOrderId: so.id, absorbCents: settle.absorbCents };
}

/** Worker sweep: unlock pools that reached a tier, fail expired ones. */
export async function sweepPools() {
  const open = await prisma.pool.findMany({ where: { status: "OPEN" } });
  let unlocked = 0;
  let failed = 0;
  for (const pool of open) {
    const check = canUnlock({ ...pool, ladder: ladderOf(pool) }, new Date());
    if (check.ok) {
      await maybeUnlock(pool.id);
      unlocked++;
    } else if (check.expired) {
      await failPool(pool.id, check.reason);
      failed++;
    }
  }
  return { open: open.length, unlocked, failed };
}
