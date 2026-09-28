import { prisma } from "../prisma";
import { registerHandler } from "./bus";
import type { ActionKind } from "./kinds";
import { openPool, unlockPool } from "../pools-service";
import { refundOrder } from "../orders";
import { delistListing, publishListing, publishSocialPost, repriceListing } from "../listings";
import { deliver } from "../notify";
import { hkd } from "../format";

// One handler per action kind. Handlers are only reachable through the bus.

const num = (v: unknown) => Number(v);

registerHandler("ENABLE_FULFIL", {
  async preview(p) {
    const product = await prisma.product.findUnique({ where: { id: num(p.productId) } });
    return `Turn on our own checkout for “${product?.title ?? p.productId}” at ${hkd(p.priceCents as number)}. From then on we carry refunds, customs and supplier failure for this product.`;
  },
  async execute(p) {
    const product = await prisma.product.update({
      where: { id: num(p.productId) },
      data: { fulfilMode: "FULFIL", fulfilApprovedAt: new Date() },
    });
    return { productId: product.id, fulfilMode: product.fulfilMode };
  },
});

registerHandler("OPEN_POOL", {
  async preview(p) {
    const ladder = p.ladder as { minQty: number; unitHkdCents: number }[];
    return `Open a ${p.days}-day pool. Ladder: ${ladder.map((s) => `${s.minQty}+ → ${hkd(s.unitHkdCents)}`).join(", ")}. Exposure at first rung ${hkd(p.exposureHkdCents as number)}.`;
  },
  async execute(p) {
    const pool = await openPool(num(p.productId), num(p.days));
    return { poolId: pool.id, slug: pool.slug };
  },
});

registerHandler("UNLOCK_POOL", {
  async preview(p) {
    const pool = await prisma.pool.findUnique({ where: { id: num(p.poolId) } });
    return `Authorize ${pool?.committedQty ?? "?"} committed unit(s), then capture or void every hold per the settlement rules.`;
  },
  async execute(p) {
    return unlockPool(num(p.poolId));
  },
});

registerHandler("PLACE_SUPPLIER_ORDER", {
  async preview(p) {
    const so = await prisma.supplierOrder.findUnique({ where: { id: num(p.supplierOrderId) }, include: { offer: true } });
    if (!so) return "Supplier order missing";
    return `${so.mode}: buy ${so.qty} × ${so.offer.title.slice(0, 60)} on ${so.offer.platform} (${so.offer.url}). Expected cost ${hkd(so.expectedCostHkdCents)} via ${so.rail}.`;
  },
  async execute(p) {
    // Manual-assisted: approval releases the task to the purchasing queue, where the
    // operator buys it and enters the real receipt. API suppliers would place here.
    const so = await prisma.supplierOrder.findUnique({ where: { id: num(p.supplierOrderId) } });
    if (!so) throw new Error("Supplier order missing");
    if (so.mode === "API") throw new Error("No supplier API adapter is connected — switch this supplier to MANUAL_ASSISTED");
    return { supplierOrderId: so.id, queue: "/admin/purchasing" };
  },
});

registerHandler("RESOLVE_MARGIN_DRIFT", {
  async preview(p) {
    const g = p.guard as { reason: string };
    return `${g.reason}. Approving = absorb the cost and release the purchase task. Reject, then refund from the order page, to cancel.`;
  },
  async execute(p) {
    const so = await prisma.supplierOrder.update({ where: { id: num(p.supplierOrderId) }, data: { status: "TASK_OPEN" } });
    if (so.orderId) {
      const open = await prisma.supplierOrder.count({ where: { orderId: so.orderId, status: "NEEDS_DECISION" } });
      if (open === 0) await prisma.order.update({ where: { id: so.orderId }, data: { status: "ROUTED" } });
    }
    return { supplierOrderId: so.id, absorbed: true };
  },
});

registerHandler("REFUND_ORDER", {
  async preview(p) {
    const order = await prisma.order.findUnique({ where: { id: String(p.orderId) } });
    return `Refund order ${order?.number ?? p.orderId} in full (${hkd(order?.totalHkdCents)}). Reason: ${p.reason ?? "—"}`;
  },
  async execute(p, ctx) {
    return refundOrder(String(p.orderId), ctx.actor);
  },
});

registerHandler("PUBLISH_LISTING", {
  async preview(p) {
    const l = await prisma.channelListing.findUnique({ where: { id: num(p.listingId) } });
    return l ? `Publish on ${l.platform} at ${hkd(l.priceHkdCents)}:\n\n${l.title}\n\n${l.description}` : "Listing missing";
  },
  async execute(p, ctx) {
    return publishListing(num(p.listingId), ctx.runMode);
  },
});

registerHandler("REPRICE_LISTING", {
  async preview(p) {
    return `Change listing #${p.listingId} price to ${hkd(p.newPriceCents as number)} to hold the margin floor.`;
  },
  async execute(p, ctx) {
    return repriceListing(num(p.listingId), num(p.newPriceCents), ctx.runMode);
  },
});

registerHandler("DELIST_LISTING", {
  async preview(p) {
    return `Withdraw listing #${p.listingId}: ${p.reason}`;
  },
  async execute(p, ctx) {
    return delistListing(num(p.listingId), String(p.reason), ctx.runMode);
  },
});

registerHandler("PUBLISH_SOCIAL", {
  async preview(p) {
    const post = await prisma.socialPost.findUnique({ where: { id: num(p.postId) } });
    return post ? `${post.platform}:\n\n${post.caption}` : "Post missing";
  },
  async execute(p, ctx) {
    return publishSocialPost(num(p.postId), ctx.runMode);
  },
});

registerHandler("SEND_PRICE_ALERT", {
  async preview(p) {
    return `Email ${p.email}: price dropped to ${hkd(p.cents as number)}`;
  },
  async execute(p, ctx) {
    const n = await deliver(num(p.notificationId), ctx.runMode);
    return { notificationId: n?.id, status: n?.status };
  },
});

registerHandler("SEND_DIGEST", {
  async preview(p) {
    return `Weekly basket digest to ${p.email}: best ${hkd(p.cents as number)}`;
  },
  async execute(p, ctx) {
    const n = await deliver(num(p.notificationId), ctx.runMode);
    return { notificationId: n?.id, status: n?.status };
  },
});

registerHandler("POST_CHANNEL", {
  async preview(p) {
    return String(p.text ?? "").slice(0, 600);
  },
  async execute(p, ctx) {
    const channel = process.env.TELEGRAM_CHANNEL_ID;
    if (!channel) return { status: "skipped", reason: "TELEGRAM_CHANNEL_ID not set" };
    const { sendTelegram } = await import("../telegram");
    return sendTelegram(channel, String(p.text ?? ""), ctx.runMode);
  },
});

/** Side effects of a human rejecting a proposal. */
export async function onRejected(kind: ActionKind, payload: Record<string, unknown>) {
  if (kind === "PUBLISH_LISTING") {
    await prisma.channelListing
      .update({ where: { id: num(payload.listingId) }, data: { status: "DRAFT" } })
      .catch((e) => console.warn(`[onRejected] listing ${String(payload.listingId)} not reset to DRAFT: ${e instanceof Error ? e.message : e}`));
  }
  if (kind === "PUBLISH_SOCIAL") {
    await prisma.socialPost
      .update({ where: { id: num(payload.postId) }, data: { status: "DRAFT" } })
      .catch((e) => console.warn(`[onRejected] post ${String(payload.postId)} not reset to DRAFT: ${e instanceof Error ? e.message : e}`));
  }
}
