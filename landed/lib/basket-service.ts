import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import { compareSupermarketBasket, productHistory, rowsFromOffers } from "./supermarket/view";
import { detectShrinkflation } from "./supermarket/history";
import { retailerName } from "./supermarket/retailers";
import { composeDigest, digestDue } from "./digest";
import { promoTruthView } from "./supermarket/stories";
import { queueEmail } from "./notify";
import { requestAction } from "./actions/bus";
import { publicOrigin } from "./listings";

// Saved supermarket baskets (so the list follows the shopper) and the weekly
// digest that prices them again. The digest is the habit: one message a week
// with this week's cheapest way to buy the same things.

export interface SavedLine {
  productId: number;
  qty: number;
}

export function cleanLines(raw: unknown): SavedLine[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<number, number>();
  for (const l of raw as { productId?: unknown; qty?: unknown }[]) {
    const productId = Number(l?.productId);
    const qty = Math.round(Number(l?.qty));
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(productId, Math.min(99, qty));
  }
  return [...merged.entries()].slice(0, 100).map(([productId, qty]) => ({ productId, qty }));
}

export async function getSavedBasket(customerId: number) {
  const row = await prisma.savedBasket.findUnique({ where: { customerId } });
  const lines = cleanLines(JSON.parse(row?.lines ?? "[]"));
  const products = await prisma.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, select: { id: true, title: true } });
  const title = new Map(products.map((p) => [p.id, p.title]));
  return {
    lines: lines.filter((l) => title.has(l.productId)).map((l) => ({ ...l, title: title.get(l.productId)! })),
    digestOptIn: row?.digestOptIn ?? false,
  };
}

export async function saveBasket(customerId: number, lines: SavedLine[], digestOptIn?: boolean) {
  const clean = JSON.stringify(cleanLines(lines));
  return prisma.savedBasket.upsert({
    where: { customerId },
    create: { customerId, lines: clean, ...(digestOptIn === undefined ? {} : { digestOptIn }) },
    update: { lines: clean, ...(digestOptIn === undefined ? {} : { digestOptIn }) },
  });
}

export function digestToken(basketId: number, email: string): string {
  const secret = process.env.AUTH_SECRET ?? "landed-dev-only-secret-do-not-use-in-production";
  return createHmac("sha256", secret).update(`digest:${basketId}:${email.toLowerCase()}`).digest("hex").slice(0, 32);
}

export async function unsubscribeDigest(basketId: number, token: string): Promise<boolean> {
  const b = await prisma.savedBasket.findUnique({ where: { id: basketId }, include: { customer: true } });
  if (!b || token !== digestToken(b.id, b.customer.email)) return false;
  await prisma.savedBasket.update({ where: { id: b.id }, data: { digestOptIn: false } });
  return true;
}

/** BASKET_DIGEST job: every opted-in basket that is due gets this week's prices. */
export async function runBasketDigests(now = new Date()) {
  const baskets = await prisma.savedBasket.findMany({ where: { digestOptIn: true }, include: { customer: true } });
  let sent = 0;
  let skipped = 0;
  const failed: string[] = [];
  for (const b of baskets) {
    const lines = cleanLines(JSON.parse(b.lines));
    if (!lines.length || !digestDue(b.lastDigestAt, now)) {
      skipped++;
      continue;
    }
    try {
      const { comparison } = await compareSupermarketBasket(lines, false);
      const ids = lines.map((l) => l.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, titleEn: true, offers: true },
      });
      const title = new Map(products.map((p) => [p.id, p.title]));
      // Only promotions that actually beat buying singles (rowsFromOffers works that out).
      const onPromo = products.flatMap((p) =>
        rowsFromOffers(p.offers, p.titleEn)
          .filter((r) => r.inStock && r.deal && r.deal.unitCents < r.shelfCents && (r.promoZh || r.promoEn))
          .map((r) => ({ title: p.title, chain: r.retailer, promo: (r.promoZh ?? r.promoEn)! })),
      );
      const shrank = [];
      for (const id of ids) {
        const s = detectShrinkflation(await productHistory(id, 120));
        // Only news: a shrink first seen in the last fortnight.
        if (s && now.getTime() - new Date(s.changedOn).getTime() < 14 * 86400_000) shrank.push({ title: title.get(id) ?? "", from: s.fromLabel, to: s.toLabel });
      }
      const { trapByProduct } = await promoTruthView();
      const packTraps = ids.flatMap((id) => {
        const t = trapByProduct.get(id);
        return t ? [{ title: t.big.title, smallerTitle: t.small.title, dearerBy: t.dearerBy }] : [];
      });
      const origin = publicOrigin();
      const digest = composeDigest({
        packTraps,
        comparison,
        chainName: retailerName,
        onPromo,
        shrank,
        lastWeekBestCents: b.lastBestCents,
        basketUrl: `${origin}/basket`,
        unsubscribeUrl: `${origin}/api/basket/unsubscribe?id=${b.id}&t=${digestToken(b.id, b.customer.email)}`,
      });
      if (!digest) {
        skipped++;
        continue;
      }
      const week = now.toISOString().slice(0, 10);
      const n = await queueEmail({
        email: b.customer.email,
        subject: digest.subject,
        body: digest.body,
        dedupeKey: `digest:${b.id}:${week}`,
        telegramChatId: b.customer.telegramChatId,
      });
      await requestAction({
        kind: "SEND_DIGEST",
        title: `Basket digest to ${b.customer.email}`,
        payload: { notificationId: n.id, email: b.customer.email, cents: digest.bestCents },
        idempotencyKey: `digest:${b.id}:${week}`,
      });
      await prisma.savedBasket.update({ where: { id: b.id }, data: { lastDigestAt: now, lastBestCents: digest.bestCents } });
      sent++;
    } catch (e) {
      failed.push(`#${b.id}: ${e instanceof Error ? e.message.slice(0, 100) : e}`);
    }
  }
  return { baskets: baskets.length, sent, skipped, failed };
}
