import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { fulfilmentPlan } from "./fulfil";
import { guardMargin } from "./routing";
import { checkoutFeeCents, DEFAULT_CHECKOUT_FEES } from "./money/pricing";
import { assertChargeAllowed, getProvider, getProviderById, type NormalizedEvent } from "./payments";
import { postEntry } from "./ledger";
import { requestAction, tripKillSwitch } from "./actions/bus";
import { commercialSettings } from "./settings";
import { onSetupCompleted } from "./pools-service";
import { safeJson } from "./format";
import { UserFacingError } from "./errors";
import type { Realness } from "./types";

// Storefront commerce: quote → checkout → paid → routed → supplier order.

export class CommerceError extends UserFacingError {}

function orderNumber() {
  return `LD${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createQuote(productId: number, qty: number, customerId: number | null) {
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new CommerceError("數量 1–20 Quantity must be 1–20");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new CommerceError("Product not found");
  if (product.fulfilMode !== "FULFIL") throw new CommerceError("此產品未開放自家結帳 Not available for checkout");
  if (product.restricted) throw new CommerceError("受限產品 Restricted product");

  const plan = await fulfilmentPlan(productId, qty);
  if (!plan?.chosen || !plan.price) throw new CommerceError(plan?.route.reason ?? "No orderable source");
  if (!plan.price.viable) throw new CommerceError(plan.price.reason ?? "Not viable at the current cost");

  const expiresAt = new Date(Date.now() + plan.settings.quoteTtlMinutes * 60_000);
  return prisma.quote.create({
    data: {
      productId,
      offerId: plan.chosen.offerId,
      customerId,
      qty,
      unitPriceHkdCents: Math.round(plan.price.priceCents / qty),
      totalHkdCents: plan.price.priceCents,
      lockedCostHkdCents: plan.chosen.costCents,
      fxMid: plan.chosen.fxMid,
      fxBufferPct: plan.settings.fxBufferPct,
      rail: plan.rail.name,
      breakdown: JSON.stringify({
        marginCents: plan.price.marginCents,
        checkoutFeeCents: plan.price.checkoutFeeCents,
        beatsBuyerRouteByCents: plan.price.beatsBuyerRouteByCents,
        buyerRouteCents: plan.buyerRouteCents,
        routeReason: plan.route.reason,
      }),
      expiresAt,
    },
  });
}

export async function checkoutQuote(opts: {
  quoteId: string;
  customer: { id: number; email: string };
  shipping: { name: string; phone: string; address: string };
  origin: string;
}) {
  const quote = await prisma.quote.findUnique({ where: { id: opts.quoteId }, include: { product: true } });
  if (!quote) throw new CommerceError("Quote not found");
  if (quote.customerId && quote.customerId !== opts.customer.id) throw new CommerceError("Quote belongs to another account");
  if (quote.expiresAt < new Date()) throw new CommerceError("報價已過期，請重新報價 Quote expired — please re-quote");
  if (!opts.shipping.name || !opts.shipping.phone || opts.shipping.address.length < 8) {
    throw new CommerceError("請填寫收件資料 Shipping details required");
  }

  const provider = getProvider();
  await assertChargeAllowed(provider);
  const order = await prisma.order.create({
    data: {
      number: orderNumber(),
      customerId: opts.customer.id,
      totalHkdCents: quote.totalHkdCents,
      shipping: JSON.stringify(opts.shipping),
      lines: {
        create: {
          productId: quote.productId,
          quoteId: quote.id,
          qty: quote.qty,
          unitPriceHkdCents: quote.unitPriceHkdCents,
          lockedCostHkdCents: quote.lockedCostHkdCents,
          fxMid: quote.fxMid,
          offerId: quote.offerId,
        },
      },
    },
  });
  const session = await provider.createCheckout({
    orderId: order.id,
    orderNumber: order.number,
    amountHkdCents: order.totalHkdCents,
    description: `${quote.product.title.slice(0, 120)} × ${quote.qty}`,
    email: opts.customer.email,
    successUrl: `${opts.origin}/account/orders/${order.id}?paid=1`,
    cancelUrl: `${opts.origin}/p/${quote.product.slug}`,
  });
  await prisma.order.update({ where: { id: order.id }, data: { providerSessionId: session.sessionId } });
  return { order, redirectUrl: session.redirectUrl };
}

/** Normalized payment events from any provider. Idempotent via WebhookEvent. */
export async function processPaymentEvent(providerId: string, event: NormalizedEvent, rawBody: string) {
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: providerId, eventId: event.eventId } },
  });
  if (existing?.processed) return { deduped: true };
  const row =
    existing ??
    (await prisma.webhookEvent.create({
      data: { provider: providerId, eventId: event.eventId, type: event.type, payload: rawBody.slice(0, 10000) },
    }));
  try {
    if (event.type === "CHECKOUT_PAID") await onCheckoutPaid(providerId, event);
    else if (event.type === "SETUP_COMPLETED") await onSetupCompleted(event);
    else if (event.type === "DISPUTE_OPENED") {
      await tripKillSwitch(`Dispute opened on ${event.paymentRef ?? "unknown payment"}`, `webhook:${providerId}`);
    }
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { processed: true, processedAt: new Date() } });
    return { deduped: false };
  } catch (e) {
    await prisma.webhookEvent.update({ where: { id: row.id }, data: { error: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}

async function onCheckoutPaid(providerId: string, event: NormalizedEvent) {
  const orderId = event.metadata.orderId;
  const order = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;
  if (!order) throw new Error(`CHECKOUT_PAID for unknown order ${orderId}`);
  if (order.status !== "QUOTED") return; // already handled
  if (event.amountHkdCents != null && event.amountHkdCents !== order.totalHkdCents) {
    throw new Error(`Paid ${event.amountHkdCents} ≠ order total ${order.totalHkdCents}`);
  }
  const realness: Realness = event.realness;
  await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date(), realness } });
  await prisma.paymentRecord.create({
    data: {
      orderId: order.id,
      provider: providerId,
      providerRef: event.paymentRef ?? event.sessionId ?? event.eventId,
      kind: "CHARGE",
      amountHkdCents: order.totalHkdCents,
      status: "SUCCEEDED",
      realness,
    },
  });
  await postEntry({
    kind: "SALE",
    amountHkdCents: order.totalHkdCents,
    realness,
    sourceRef: `sale:${order.id}`,
    orderId: order.id,
    channel: order.channel,
    memo: `Order ${order.number}`,
  });
  if (event.metadata.feeHkdCents) {
    // Only the processor's reported fee is booked; we never book our estimate.
    await postEntry({
      kind: "FEE",
      amountHkdCents: -Math.abs(Number(event.metadata.feeHkdCents)),
      realness,
      sourceRef: `fee:${order.id}`,
      orderId: order.id,
      channel: order.channel,
      memo: "Card processing fee (reported by provider)",
    });
  }
  await routePaidOrder(order.id);
}

/** Pick a supplier for each line, re-checking live cost against the locked quote. */
export async function routePaidOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!order || order.status !== "PAID") return;
  const settings = await commercialSettings();
  let needsDecision = false;

  for (const line of order.lines) {
    const plan = await fulfilmentPlan(line.productId, line.qty);
    if (!plan?.chosen) {
      needsDecision = true;
      const so = await prisma.supplierOrder.create({
        data: {
          orderId,
          offerId: line.offerId,
          qty: line.qty,
          expectedCostHkdCents: line.lockedCostHkdCents,
          rail: settings.settlementRail,
          status: "NEEDS_DECISION",
          mode: "MANUAL_ASSISTED",
          routingReason: plan?.route.reason ?? "product missing",
        },
      });
      await requestAction({
        kind: "REFUND_ORDER",
        title: `No orderable source for order ${order.number} — refund?`,
        payload: { orderId, reason: so.routingReason },
        idempotencyKey: `refund-nosource:${orderId}`,
      });
      continue;
    }
    const guard = guardMargin({
      priceCents: line.unitPriceHkdCents * line.qty,
      lockedCostCents: line.lockedCostHkdCents,
      liveCostCents: plan.chosen.costCents,
      checkoutFeeCents: checkoutFeeCents(line.unitPriceHkdCents * line.qty, DEFAULT_CHECKOUT_FEES),
      floorPct: settings.targetMarginPct / 2,
    });
    const so = await prisma.supplierOrder.create({
      data: {
        orderId,
        offerId: plan.chosen.offerId,
        qty: line.qty,
        expectedCostHkdCents: plan.chosen.costCents,
        rail: plan.rail.name,
        fxMid: plan.chosen.fxMid,
        fxBufferPct: plan.settings.fxBufferPct,
        status: guard.action === "NEEDS_DECISION" ? "NEEDS_DECISION" : "TASK_OPEN",
        mode: plan.chosen.supplierMode === "API" ? "API" : "MANUAL_ASSISTED",
        routingReason: `${plan.route.reason}. ${guard.reason}`,
        fallbackOfferIds: JSON.stringify(plan.route.fallbacks.map((f) => f.offerId)),
      },
    });
    if (guard.action === "NEEDS_DECISION") {
      needsDecision = true;
      const out = await requestAction({
        kind: "RESOLVE_MARGIN_DRIFT",
        title: `Cost drift on order ${order.number}: ${guard.reason}`,
        payload: { supplierOrderId: so.id, orderId, guard },
        idempotencyKey: `drift:${so.id}`,
      });
      await prisma.supplierOrder.update({ where: { id: so.id }, data: { actionRequestId: out.actionId } });
    } else {
      const out = await requestAction({
        kind: "PLACE_SUPPLIER_ORDER",
        title: `Buy ${line.qty} × offer #${plan.chosen.offerId} for order ${order.number}`,
        payload: { supplierOrderId: so.id },
        idempotencyKey: `place:${so.id}`,
      });
      await prisma.supplierOrder.update({ where: { id: so.id }, data: { actionRequestId: out.actionId } });
    }
  }
  await prisma.order.update({ where: { id: orderId }, data: { status: needsDecision ? "NEEDS_DECISION" : "ROUTED" } });
}

/**
 * Operator (or supplier API) confirms the purchase with the real numbers off
 * the supplier receipt and the rail statement. This is where cost and FX
 * become ledger facts.
 */
export async function confirmSupplierPurchase(opts: {
  supplierOrderId: number;
  externalRef: string;
  nativeAmountPaid: number;
  actualDebitedHkdCents: number;
  actor: string;
}) {
  const so = await prisma.supplierOrder.findUnique({
    where: { id: opts.supplierOrderId },
    include: { offer: true, order: { include: { lines: true } }, pool: true },
  });
  if (!so) throw new CommerceError("Supplier order not found");
  if (so.status !== "TASK_OPEN") throw new CommerceError(`Supplier order is ${so.status}`);
  if (!opts.externalRef.trim()) throw new CommerceError("Supplier order reference required");
  if (!(opts.actualDebitedHkdCents > 0) || !(opts.nativeAmountPaid > 0)) throw new CommerceError("Amounts must be positive");

  const realness: Realness = (so.order?.realness as Realness | undefined) ?? (so.pool ? await poolRealness(so.pool.id) : "TEST");
  const mid = so.fxMid;
  const bufferPct = so.offer.currency === "HKD" ? 0 : so.fxBufferPct;
  // The HKD the quote budgeted for exactly these native goods, at the buffered rate.
  const budgetedCents = Math.round(opts.nativeAmountPaid * mid * (1 + bufferPct) * 100);

  await prisma.supplierOrder.update({
    where: { id: so.id },
    data: {
      status: "PLACED",
      externalRef: opts.externalRef.trim(),
      actualCostHkdCents: opts.actualDebitedHkdCents,
      placedAt: new Date(),
    },
  });
  const base = { realness, orderId: so.orderId, poolId: so.poolId, productId: so.offer.productId, channel: so.order?.channel ?? "POOL" };
  // SUPPLIER_COST + FX_GAIN sum to exactly what left the account.
  await postEntry({ ...base, kind: "SUPPLIER_COST", amountHkdCents: -budgetedCents, sourceRef: `supplier:${so.id}`, memo: `${so.offer.platform} ${opts.externalRef}` });
  await postEntry({
    ...base,
    kind: "FX_GAIN",
    amountHkdCents: budgetedCents - opts.actualDebitedHkdCents,
    sourceRef: `fx:${so.id}`,
    memo: `Budgeted at mid ${mid} +${(bufferPct * 100).toFixed(2)}% vs debited`,
  });
  await prisma.supplier.updateMany({ where: { offers: { some: { id: so.offerId } } }, data: { ordersPlaced: { increment: 1 } } });
  if (so.orderId) {
    const open = await prisma.supplierOrder.count({ where: { orderId: so.orderId, status: { in: ["TASK_OPEN", "NEEDS_DECISION"] } } });
    if (open === 0) await prisma.order.update({ where: { id: so.orderId }, data: { status: "SUPPLIER_PLACED" } });
  }
  return so.id;
}

async function poolRealness(poolId: number): Promise<Realness> {
  const pay = await prisma.paymentRecord.findFirst({ where: { commitment: { poolId }, kind: "CAPTURE", status: "SUCCEEDED" } });
  return (pay?.realness as Realness | undefined) ?? "TEST";
}

export async function markSupplierOutcome(supplierOrderId: number, outcome: "SHIPPED" | "RECEIVED" | "FAILED", trackingNo?: string) {
  const so = await prisma.supplierOrder.update({
    where: { id: supplierOrderId },
    data: { status: outcome, trackingNo: trackingNo ?? undefined },
    include: { offer: true },
  });
  if (outcome === "RECEIVED") {
    await prisma.supplier.updateMany({ where: { offers: { some: { id: so.offerId } } }, data: { ordersFilled: { increment: 1 } } });
  }
  if (so.orderId && outcome !== "FAILED") {
    await prisma.order.update({ where: { id: so.orderId }, data: { status: outcome === "RECEIVED" ? "DELIVERED" : "SHIPPED" } });
  }
  return so;
}

/** Executed by the REFUND_ORDER handler after approval. */
export async function refundOrder(orderId: string, actor: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new CommerceError("Order not found");
  if (order.status === "REFUNDED") return { alreadyRefunded: true };
  const charge = order.payments.find((p) => p.kind === "CHARGE" && p.status === "SUCCEEDED");
  if (!charge) throw new CommerceError("No captured payment to refund");
  const provider = getProviderById(charge.provider);
  const r = await provider.refund(charge.providerRef, charge.amountHkdCents);
  await prisma.paymentRecord.create({
    data: {
      orderId,
      provider: charge.provider,
      providerRef: r.ref,
      kind: "REFUND",
      amountHkdCents: charge.amountHkdCents,
      status: r.status,
      realness: charge.realness,
    },
  });
  if (r.status === "FAILED") throw new CommerceError("Refund failed at the provider");
  await postEntry({
    kind: "REFUND",
    amountHkdCents: -charge.amountHkdCents,
    realness: charge.realness as Realness,
    sourceRef: `refund:${orderId}`,
    orderId,
    channel: order.channel,
    memo: `Refunded by ${actor}`,
  });
  await prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
  await prisma.supplierOrder.updateMany({ where: { orderId, status: { in: ["TASK_OPEN", "NEEDS_DECISION"] } }, data: { status: "CANCELLED" } });
  return { refundRef: r.ref };
}

export function shippingOf(order: { shipping: string | null }) {
  return safeJson<{ name?: string; phone?: string; address?: string }>(order.shipping, {});
}
