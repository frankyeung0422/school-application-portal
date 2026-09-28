import { createHmac } from "node:crypto";
import { prisma } from "./prisma";
import { findProducts } from "./demand";
import { rowsFromOffers } from "./supermarket/view";
import { promoKey } from "./supermarket/promo-watch";
import { currentStateKeys, keywordHits, type MatchState } from "./keyword-alerts";
import { queueEmail } from "./notify";
import { requestAction } from "./actions/bus";
import { publicOrigin } from "./listings";
import { hkd } from "./format";

// Loads a keyword's matches (cross-border and supermarket), baselines new alerts,
// and turns news into one message per alert per run.

const MATCH_LIMIT = 30;

async function matchStates(keyword: string): Promise<(MatchState & { title: string; slug: string })[]> {
  const { products } = await findProducts(keyword, MATCH_LIMIT, { segments: ["GLOBAL", "SUPERMARKET"] });
  const supermarket = products.filter((p) => p.segment === "SUPERMARKET").map((p) => p.id);
  const offers = supermarket.length ? await prisma.offer.findMany({ where: { productId: { in: supermarket } } }) : [];
  return products.map((p) => {
    const rows = p.segment === "SUPERMARKET" ? rowsFromOffers(offers.filter((o) => o.productId === p.id), p.titleEn) : [];
    return {
      productId: p.id,
      title: p.title,
      slug: p.slug,
      bestCents: p.bestLandedHkdCents,
      promoKey: promoKey(
        rows.map((r) => ({
          retailer: r.retailer,
          inStock: r.inStock,
          promo: r.promoZh ?? r.promoEn,
          dealUnitCents: r.deal && r.deal.unitCents < r.shelfCents ? r.deal.unitCents : null,
        })),
      ),
    };
  });
}

export function keywordToken(alertId: number, email: string): string {
  const secret = process.env.AUTH_SECRET ?? "landed-dev-only-secret-do-not-use-in-production";
  return createHmac("sha256", secret).update(`kw:${alertId}:${email.toLowerCase()}`).digest("hex").slice(0, 32);
}

/** Create (or re-activate) an alert, marking everything that matches today as already seen. */
export async function addKeywordAlert(opts: { email: string; keyword: string; maxHkdCents: number | null; customerId: number | null }) {
  const email = opts.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("電郵格式唔啱 Invalid email");
  const customer = opts.customerId ? await prisma.customer.findUnique({ where: { id: opts.customerId }, select: { telegramChatId: true } }) : null;
  const alert = await prisma.keywordAlert.upsert({
    where: { email_keyword: { email, keyword: opts.keyword } },
    create: { email, keyword: opts.keyword, maxHkdCents: opts.maxHkdCents, customerId: opts.customerId, telegramChatId: customer?.telegramChatId ?? null },
    update: { active: true, maxHkdCents: opts.maxHkdCents, customerId: opts.customerId ?? undefined },
  });
  const matches = await matchStates(opts.keyword);
  const rows = matches.flatMap((m) => currentStateKeys(m, opts.maxHkdCents).map((stateKey) => ({ alertId: alert.id, productId: m.productId, stateKey })));
  for (const r of rows) {
    await prisma.keywordAlertHit.upsert({ where: { alertId_productId_stateKey: r }, create: r, update: {} });
  }
  return { alert, matching: matches.length };
}

/** ALERTS job, keyword branch. */
export async function runKeywordAlerts() {
  const alerts = await prisma.keywordAlert.findMany({ where: { active: true }, include: { hits: { select: { productId: true, stateKey: true } } } });
  let sent = 0;
  const failed: string[] = [];
  const origin = publicOrigin();
  for (const a of alerts) {
    try {
      const matches = await matchStates(a.keyword);
      const told = new Set(a.hits.map((h) => `${h.productId}|${h.stateKey}`));
      const hits = keywordHits(matches, told, a.maxHkdCents);
      if (!hits.length) continue;
      const byId = new Map(matches.map((m) => [m.productId, m]));
      const reasonText = { NEW: "新上架", UNDER_TARGET: "低過你嘅目標價", PROMO: "有新優惠" } as const;
      const lines = hits.slice(0, 6).map((h) => {
        const m = byId.get(h.productId)!;
        return `• ${reasonText[h.reason]}：${m.title.slice(0, 40)} ${hkd(m.bestCents)}\n  ${origin}/p/${m.slug}`;
      });
      const stamp = hits.flatMap((h) => h.stateKeys.map((k) => `${h.productId}:${k}`)).sort().join(",");
      const key = `kw:${a.id}:${createHmac("sha1", "kw").update(stamp).digest("hex").slice(0, 16)}`;
      const n = await queueEmail({
        email: a.email,
        subject: `「${a.keyword}」有 ${hits.length} 個新抵價`,
        body: `${lines.join("\n")}\n\n取消通知 Unsubscribe: ${origin}/api/keyword-alert/unsubscribe?id=${a.id}&t=${keywordToken(a.id, a.email)}`,
        dedupeKey: key,
        telegramChatId: a.telegramChatId,
      });
      await requestAction({
        kind: "SEND_PRICE_ALERT",
        title: `Keyword alert「${a.keyword}」to ${a.email}`,
        payload: { notificationId: n.id, email: a.email, cents: byId.get(hits[0].productId)?.bestCents ?? 0 },
        idempotencyKey: key,
      });
      for (const h of hits) {
        for (const stateKey of h.stateKeys) {
          const r = { alertId: a.id, productId: h.productId, stateKey };
          await prisma.keywordAlertHit.upsert({ where: { alertId_productId_stateKey: r }, create: r, update: {} });
        }
      }
      sent++;
    } catch (e) {
      failed.push(`kw#${a.id}: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
    }
  }
  return { keywordAlerts: alerts.length, keywordSent: sent, keywordFailed: failed };
}

export async function unsubscribeKeyword(alertId: number, token: string): Promise<boolean> {
  const a = await prisma.keywordAlert.findUnique({ where: { id: alertId } });
  if (!a || token !== keywordToken(a.id, a.email)) return false;
  await prisma.keywordAlert.update({ where: { id: a.id }, data: { active: false } });
  return true;
}
