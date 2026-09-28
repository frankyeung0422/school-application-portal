// The daily 到手價 Telegram channel post: today's best-evidenced deals, where HK
// deal-sharing already happens. Pure; tests/channel-post.test.ts. Every line is
// a fact we can back (history low, cross-chain gap, real promo %), and the post
// must pass lintClaims or it is not sent.

import { lintClaims } from "./claims";

export interface ChannelItem {
  title: string;
  url: string;
  priceCents: number;
  /** Where / which chain, e.g. "惠康". */
  where: string | null;
  /** Why it is a deal, already worded (DealReason.text or the promo truth). */
  why: string;
}

export const CHANNEL_MAX_ITEMS = 5;

const money = (c: number) => `HK$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export function composeChannelPost(
  items: ChannelItem[],
  opts: { dateLabel: string; indexLine?: string | null; siteUrl: string },
): { text: string; issues: string[] } | null {
  const picked = items.slice(0, CHANNEL_MAX_ITEMS);
  if (!picked.length) return null;
  const lines = [`🛒 到手價 今日抵買（${opts.dateLabel}）`];
  if (opts.indexLine) lines.push("", opts.indexLine);
  lines.push("");
  picked.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.title.slice(0, 50)}`);
    lines.push(`   ${money(it.priceCents)}${it.where ? ` @ ${it.where}` : ""} — ${it.why.slice(0, 60)}`);
    lines.push(`   ${it.url}`);
  });
  lines.push("", `價錢係我哋查價嗰刻嘅紀錄，可能已經變。更多：${opts.siteUrl}`, "（部分連結為聯盟連結，唔影響排名）");
  const text = lines.join("\n");
  const issues = lintClaims(text).map((i) => `${i.rule}: ${i.match}`);
  return { text, issues };
}

/** Mondays carry the weekly basket index headline. */
export function isIndexDay(d: Date): boolean {
  return new Date(d.getTime() + 8 * 3600_000).getUTCDay() === 1;
}
