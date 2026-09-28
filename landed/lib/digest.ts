// Weekly 慳錢清單: a saved supermarket basket, priced again, with what changed.
// Pure; tests/digest.test.ts.
//
// The one reason to open it every week: this week's cheapest way to buy the
// same list, plus which items are on offer or shrank. Claims stay in the
// "of the N chains we checked" form (lintClaims).

import type { BasketComparison } from "./supermarket/basket";

export const DIGEST_EVERY_DAYS = 7;

export function digestDue(lastDigestAt: Date | null, now: Date, everyDays = DIGEST_EVERY_DAYS): boolean {
  // A little slack so an hourly scheduler does not drift the send time by an hour each week.
  return !lastDigestAt || now.getTime() - lastDigestAt.getTime() >= everyDays * 86400_000 - 90 * 60_000;
}

export interface DigestInput {
  comparison: BasketComparison;
  chainName: (code: string) => string;
  onPromo: { title: string; chain: string; promo: string }[];
  shrank: { title: string; from: string; to: string }[];
  /** Basket items where a smaller pack of the same product is cheaper per unit. */
  packTraps?: { title: string; smallerTitle: string; dearerBy: number }[];
  lastWeekBestCents: number | null;
  basketUrl: string;
  unsubscribeUrl: string;
}

const money = (c: number) => `HK$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export function composeDigest(d: DigestInput): { subject: string; body: string; bestCents: number } | null {
  const c = d.comparison;
  const priced = c.stores.filter((s) => s.lines.length > 0).length;
  const best = c.split.lines.length ? c.split : null;
  if (!best && !c.bestSingle) return null;
  const bestCents = Math.min(c.bestSingle?.totalCents ?? Infinity, best?.totalCents ?? Infinity);
  const lines: string[] = [];

  if (c.bestSingle) {
    lines.push(`一間買晒：${d.chainName(c.bestSingle.retailer)} ${money(c.bestSingle.totalCents)}（查咗 ${priced} 間超市中最平）`);
  }
  if (best && best.stores.length > 1 && (c.splitSavesCents ?? 0) > 0) {
    lines.push(`分開買：${best.stores.map(d.chainName).join(" + ")} ${money(best.totalCents)}，再慳 ${money(c.splitSavesCents!)}`);
  }
  if (best && best.unavailable.length) {
    lines.push(`今個星期冇貨：${best.unavailable.map((u) => u.title.slice(0, 20)).join("、")}`);
  }
  if (d.lastWeekBestCents != null && d.lastWeekBestCents !== bestCents) {
    const diff = bestCents - d.lastWeekBestCents;
    lines.push(`比上星期${diff < 0 ? "平" : "貴"}咗 ${money(Math.abs(diff))}`);
  }
  if (d.onPromo.length) {
    lines.push("", "今個星期有優惠：");
    for (const p of d.onPromo.slice(0, 8)) lines.push(`• ${p.title.slice(0, 28)} — ${d.chainName(p.chain)}「${p.promo.slice(0, 30)}」`);
  }
  if (d.shrank.length) {
    lines.push("", "⚠ 縮水咗：");
    for (const s of d.shrank.slice(0, 5)) lines.push(`• ${s.title.slice(0, 28)}：${s.from} → ${s.to}`);
  }
  if (d.packTraps?.length) {
    lines.push("", "📦 買細包裝更抵：");
    for (const t of d.packTraps.slice(0, 5)) lines.push(`• ${t.title.slice(0, 24)} 每單位貴 ${Math.round(t.dearerBy * 100)}% — 改買 ${t.smallerTitle.slice(0, 24)}`);
  }
  lines.push("", `睇清單：${d.basketUrl}`, `唔想再收 Unsubscribe：${d.unsubscribeUrl}`);

  const subject = `慳錢清單：今個星期 ${money(bestCents)} 買齊${d.onPromo.length ? `（${d.onPromo.length} 件有優惠）` : ""}`;
  return { subject, body: lines.join("\n"), bestCents };
}
