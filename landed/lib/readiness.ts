import { prisma } from "./prisma";
import { stripeConfigured, stripeIsLiveKey } from "./payments/stripe";
import { getChannel } from "./channels/registry";
import { socialAvailability } from "./channels/meta";
import { getFlag } from "./settings";
import { serpApiUsage } from "./serpapi";
import { CHANNELS } from "./types";

// "Why is this not making money yet?" as a checklist — every missing key,
// login or account, and exactly what it unlocks. An empty dashboard with no
// explanation reads as broken; this reads as a to-do list.

export interface ReadinessItem {
  key: string;
  ok: boolean;
  label: string;
  detail: string;
  unlocks: string;
  action?: string;
}

export async function getReadiness(): Promise<ReadinessItem[]> {
  const [fx, sessions, suppliers, envelope, runMode, killSwitch, liveUnlocked] = await Promise.all([
    prisma.fxQuote.findMany(),
    prisma.platformSession.findMany(),
    prisma.supplier.count({ where: { fulfilmentMode: { not: "AFFILIATE_ONLY" } } }),
    prisma.capitalEnvelope.findFirst({ orderBy: { version: "desc" } }),
    getFlag("runMode", "DRY"),
    getFlag("killSwitch", "OFF"),
    getFlag("payments.liveUnlocked", "NO"),
  ]);
  const [opwSync, groceryCount] = await Promise.all([getFlag("opw.lastSyncAt", ""), prisma.product.count({ where: { segment: "SUPERMARKET" } })]);
  const opwStale = !opwSync || Date.now() - new Date(opwSync).getTime() > 36 * 3600_000;
  const fxStale = fx.length === 0 || fx.some((q) => Date.now() - q.fetchedAt.getTime() > 24 * 3600_000);
  const cnLoggedIn = sessions.filter((s) => ["TAOBAO", "ALI1688", "JD"].includes(s.platform) && s.status === "LOGGED_IN");
  const env = process.env;
  const serp = await serpApiUsage();

  const items: ReadinessItem[] = [
    {
      key: "fx",
      ok: !fxStale,
      label: "即時匯率 Live FX mids",
      detail: fxStale ? "匯率係預設值或超過 24 小時 — rates are seed defaults or stale" : `來源 ${fx[0]?.source}`,
      unlocks: "Accurate 到手價 for USD/CNY sources",
      action: fxStale ? "Start the worker (FETCH_FX runs every 6h)" : undefined,
    },
    {
      key: "supermarkets",
      ok: groceryCount > 0 && !opwStale,
      label: "超市價格 Supermarket prices (Consumer Council)",
      detail: groceryCount
        ? `${groceryCount} items; last sync ${opwSync || "never"}${opwStale ? " — stale (>36h)" : ""}`
        : "Not synced yet",
      unlocks: "Supermarket & pharmacy comparison and basket totals",
      action: groceryCount && !opwStale ? undefined : "Start the worker or run SUPERMARKET_SYNC on /admin/jobs",
    },
    {
      key: "gemini",
      ok: Boolean(env.GEMINI_API_KEY),
      label: "圖片比對 Gemini image matching",
      detail: env.GEMINI_API_KEY ? "Enabled" : "Title-only matching, confidence capped at 0.70 — no product can pass the 0.85 fulfil gate without a human verifying the match",
      unlocks: "Automatic same-product verification across languages",
      action: env.GEMINI_API_KEY ? undefined : "Set GEMINI_API_KEY",
    },
    {
      key: "serpapi",
      ok: Boolean(env.SERPAPI_KEY),
      label: "機票酒店 + 附近餐廳 SerpApi (Google Flights / Hotels / Maps)",
      detail: env.SERPAPI_KEY
        ? `Live; ${serp.used}/${serp.limit} calls this month${serp.left <= 0 ? " — budget spent, showing cached/OSM data" : ""}`
        : "Travel shows labelled demo fares; nearby food uses OpenStreetMap (no ratings or prices)",
      unlocks: "Live airfares, hotel rates, and rated/priced restaurants near the visitor",
      action: env.SERPAPI_KEY ? (serp.left <= 0 ? "Raise SERPAPI_MONTHLY_LIMIT or wait for next month" : undefined) : "Set SERPAPI_KEY (and optionally SERPAPI_MONTHLY_LIMIT, default 100)",
    },
    {
      key: "cn-logins",
      ok: cnLoggedIn.length > 0,
      label: "內地平台登入 Taobao / 1688 / JD",
      detail: cnLoggedIn.length ? `${cnLoggedIn.map((s) => s.platform).join(", ")} logged in` : "Public search covers AliExpress, Amazon, eBay only",
      unlocks: "The cheapest CN sources and wholesale tiers (pools)",
      action: cnLoggedIn.length ? undefined : "npm run login -- 1688 (QR login, once)",
    },
    {
      key: "affiliate",
      ok: Boolean(env.AMAZON_ASSOCIATE_TAG || env.EBAY_EPN_CAMPAIGN_ID),
      label: "聯盟計劃 Affiliate programmes",
      detail: [env.AMAZON_ASSOCIATE_TAG && "Amazon", env.EBAY_EPN_CAMPAIGN_ID && "eBay"].filter(Boolean).join(", ") || "Clicks are logged but earn nothing",
      unlocks: "Revenue from day one, with no inventory risk",
      action: "Set AMAZON_ASSOCIATE_TAG and/or EBAY_EPN_CAMPAIGN_ID (AliExpress Portals needs its API)",
    },
    {
      key: "payments",
      ok: stripeConfigured(),
      label: "收款 Stripe (HKD)",
      detail: stripeConfigured()
        ? stripeIsLiveKey()
          ? liveUnlocked === "YES" ? "LIVE key, real charges unlocked" : "LIVE key present but payments.liveUnlocked ≠ YES — real charges refused"
          : "Test mode — every order is TEST money and never counts as revenue"
        : "Mock payments — checkout and pools work end to end with TEST money",
      unlocks: "Own checkout and 拼單 pools with real cards",
      action: stripeConfigured() ? undefined : "Set PAYMENT_DRIVER=stripe, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
    },
    {
      key: "suppliers",
      ok: suppliers > 0,
      label: "可落單供應商 Orderable suppliers",
      detail: suppliers ? `${suppliers} supplier(s) not affiliate-only` : "Every source is affiliate-only, so nothing can be fulfilled",
      unlocks: "Fulfilment, routing, pools",
      action: suppliers ? undefined : "Mark a supplier MANUAL_ASSISTED on /admin/suppliers after vetting it",
    },
    {
      key: "envelope",
      ok: Boolean(envelope),
      label: "資金上限 Capital envelope",
      detail: envelope ? `v${envelope.version}: HK$${(envelope.maxOpenExposureHkdCents / 100).toLocaleString()}` : "None — pools cannot open",
      unlocks: "Pools and supplier orders within a cash cap",
    },
    {
      key: "email",
      ok: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
      label: "電郵 Price-drop emails",
      detail: env.RESEND_API_KEY ? "Resend configured" : "Alerts are written to the outbox as DRY",
      unlocks: "Watchers get told when the price drops",
      action: env.RESEND_API_KEY ? undefined : "Set RESEND_API_KEY and EMAIL_FROM",
    },
    {
      key: "mode",
      ok: runMode === "LIVE" && killSwitch === "OFF",
      label: "運行模式 Run mode",
      detail: `runMode=${runMode}, killSwitch=${killSwitch}${runMode === "DRY" ? " — approved publishes and emails are simulated, nothing leaves the machine" : ""}`,
      unlocks: "Real listings, posts and emails",
      action: runMode === "DRY" ? "Switch to LIVE on /admin/settings once channels are connected" : undefined,
    },
  ];

  for (const c of CHANNELS) {
    if (c === "STOREFRONT") continue;
    const a = getChannel(c).availability();
    items.push({
      key: `channel-${c}`,
      ok: a.ok,
      label: `渠道 ${c}`,
      detail: a.ok ? a.reason : `${a.reason}${a.missing.length ? ` (missing ${a.missing.join(", ")})` : ""}`,
      unlocks: `Auto-listing on ${c}`,
    });
  }
  const fb = socialAvailability("FACEBOOK");
  const ig = socialAvailability("INSTAGRAM");
  items.push({
    key: "social",
    ok: fb.ok,
    label: "社交發帖 Facebook / Instagram posts",
    detail: fb.ok ? (ig.ok ? "Page + Instagram connected" : "Page connected; Instagram missing META_IG_USER_ID") : `Missing ${fb.missing.join(", ")}`,
    unlocks: "Scheduled traffic posts",
  });
  return items;
}
