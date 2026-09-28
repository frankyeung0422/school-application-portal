import { worthBuyingNow } from "./deals/service";
import { priceIndex, promoTruthView } from "./supermarket/stories";
import { retailerName } from "./supermarket/retailers";
import { TRUTH_TEXT } from "./supermarket/promo-truth";
import { composeChannelPost, isIndexDay, type ChannelItem } from "./channel-post";
import { requestAction } from "./actions/bus";
import { publicOrigin } from "./listings";
import { hkd } from "./format";

/** CHANNEL_DIGEST job: one post a day of the best-evidenced deals. Blocked posts are reported, never sent. */
export async function runChannelDigest(now = new Date()) {
  const origin = publicOrigin();
  const [deals, truth] = await Promise.all([worthBuyingNow(10), promoTruthView()]);
  const items: ChannelItem[] = deals.map((d) => ({
    title: d.title,
    url: `${origin}/p/${d.slug}`,
    priceCents: d.priceCents,
    where: d.retailerName,
    why: d.reasons[0]?.text ?? "",
  }));
  // Top up with the biggest real multi-buy discounts (never a fake one: promo truth decides).
  for (const r of truth.real.filter((x) => x.truth.pctOff >= 0.25)) {
    if (items.length >= 5) break;
    if (items.some((i) => i.url.endsWith(`/p/${r.slug}`))) continue;
    items.push({ title: r.title, url: `${origin}/p/${r.slug}`, priceCents: r.shelfCents, where: retailerName(r.chain), why: `「${r.promo}」${TRUTH_TEXT.REAL(r.truth)}` });
  }
  let indexLine: string | null = null;
  if (isIndexDay(now)) {
    const idx = await priceIndex(4);
    const last = idx.weeks[idx.weeks.length - 1];
    const cheapest = last?.chains.find((c) => c.chain === last.cheapest);
    if (cheapest?.totalCents) indexLine = `🧺 本週超市指數：同一籃 ${idx.basket.length} 件，${retailerName(cheapest.chain)} 最平 ${hkd(cheapest.totalCents)} → ${origin}/price-index`;
  }
  const dateLabel = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(5, 10);
  const post = composeChannelPost(items, { dateLabel, indexLine, siteUrl: origin });
  if (!post) return { posted: false, reason: "no deals with enough evidence today" };
  if (post.issues.length) return { posted: false, reason: "claims lint blocked the post", issues: post.issues };
  const day = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  const outcome = await requestAction({
    kind: "POST_CHANNEL",
    title: `Telegram channel post ${day}`,
    payload: { text: post.text },
    idempotencyKey: `channel:${day}`,
  });
  return { posted: outcome.status, items: items.length, channelConfigured: Boolean(process.env.TELEGRAM_CHANNEL_ID) };
}
