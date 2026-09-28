// Enum-like unions (SQLite has no Prisma enums). Sources = where goods are
// bought; channels = where we list and sell.

export const PLATFORMS = [
  "TAOBAO",
  "ALI1688",
  "ALIEXPRESS",
  "ALIBABA",
  "JD",
  "PDD",
  "AMAZON",
  "EBAY",
] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(v: string): v is Platform {
  return (PLATFORMS as readonly string[]).includes(v);
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  TAOBAO: "淘寶 Taobao",
  ALI1688: "1688",
  ALIEXPRESS: "速賣通 AliExpress",
  ALIBABA: "Alibaba.com",
  JD: "京東 JD",
  PDD: "拼多多 PDD",
  AMAZON: "Amazon US",
  EBAY: "eBay",
};

/**
 * Where the goods come from, for the warranty label. Every cross-border source is a
 * parallel import (水貨) from an HK point of view: manufacturer warranties are usually
 * regional, so a shopper should know before comparing against local retail.
 */
export const PLATFORM_ORIGIN: Record<Platform, { country: string; note: string }> = {
  TAOBAO: { country: "CN", note: "內地貨 · 一般冇香港保養" },
  ALI1688: { country: "CN", note: "內地批發 · 冇香港保養" },
  ALIEXPRESS: { country: "CN", note: "海外賣家 · 一般冇香港保養" },
  ALIBABA: { country: "CN", note: "批發 · 冇香港保養" },
  JD: { country: "CN", note: "內地貨 · 一般冇香港保養" },
  PDD: { country: "CN", note: "內地貨 · 一般冇香港保養" },
  AMAZON: { country: "US", note: "美國貨（水貨）· 保養多數只限美國" },
  EBAY: { country: "INTL", note: "海外賣家（水貨）· 保養視乎賣家" },
};

/** Sourcing-side platforms (PriceArb semantics, used by the ported blocking rules). */
export const BUY_SIDE_PLATFORMS: readonly Platform[] = [
  "TAOBAO",
  "ALI1688",
  "ALIEXPRESS",
  "ALIBABA",
  "JD",
  "PDD",
];

export const RESALE_PLATFORMS: readonly Platform[] = ["AMAZON", "EBAY", "JD", "TAOBAO"];

export function isResaleVenue(platform: string): boolean {
  return (RESALE_PLATFORMS as readonly string[]).includes(platform);
}

/**
 * Where an ordinary Hong Kong shopper can actually check out themselves (HK
 * card, ships to HK or via a common forwarder). 1688 / Alibaba.com are B2B
 * (Alipay-only, MOQs, Chinese business accounts) and PDD needs a mainland phone,
 * so their prices are shown but never count as "the price you could get
 * yourself" — reaching them is the service we sell.
 */
export const CONSUMER_ACCESSIBLE_PLATFORMS: readonly Platform[] = ["AMAZON", "EBAY", "ALIEXPRESS", "TAOBAO", "JD"];

export function isConsumerAccessible(platform: string): boolean {
  return (CONSUMER_ACCESSIBLE_PLATFORMS as readonly string[]).includes(platform);
}

/** Platforms a keyless public search can reach from this server without a QR login. */
export const PUBLIC_SEARCH_PLATFORMS: readonly Platform[] = ["ALIEXPRESS", "AMAZON", "EBAY"];

export const CURRENCIES = ["HKD", "CNY", "USD", "JPY", "EUR", "GBP", "SGD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const PLATFORM_CURRENCY: Record<Platform, Currency> = {
  TAOBAO: "CNY",
  ALI1688: "CNY",
  ALIEXPRESS: "USD",
  ALIBABA: "USD",
  JD: "CNY",
  PDD: "CNY",
  AMAZON: "USD",
  EBAY: "USD",
};

export const JOB_TYPES = [
  "SEARCH_CRAWL",
  "CLUSTER",
  "REFRESH_OFFERS",
  "FETCH_FX",
  "DISCOVER",
  "ALERTS",
  "GUARD_LISTINGS",
  "POOL_SWEEP",
  "CLEAR_LEDGER",
  "SUPERMARKET_SYNC",
  "STORE_SYNC",
  "OFFICIAL_SYNC",
  "PASTE_FETCH",
  "TRAVEL_SEARCH",
  "BASKET_DIGEST",
  "HOUSEKEEPING",
  "CHANNEL_DIGEST",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["PENDING", "RUNNING", "DONE", "FAILED", "CANCELLED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const VERDICTS = ["SAME", "DIFFERENT", "UNSURE"] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface PriceTier {
  minQty: number;
  price: number;
}

export interface SearchCrawlPayload {
  keyword: string;
  platforms: Platform[];
  /** Machine-chosen (DISCOVER): no visitor is waiting, so it queues behind scheduled syncs. */
  background?: boolean;
}

export interface ClusterPayload {
  keyword: string;
}

export interface RefreshOffersPayload {
  productIds?: number[];
}

export interface DiscoverPayload {
  platforms?: Platform[];
  maxKeywords?: number;
}

export const FULFILMENT_MODES = ["AFFILIATE_ONLY", "MANUAL_ASSISTED", "API"] as const;
export type FulfilmentMode = (typeof FULFILMENT_MODES)[number];

export const ORDER_STATUSES = [
  "QUOTED",
  "PAID",
  "ROUTED",
  "NEEDS_DECISION",
  "SUPPLIER_PLACED",
  "SHIPPED",
  "DELIVERED",
  "REFUNDED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  QUOTED: "待付款",
  PAID: "已付款",
  ROUTED: "已分派供應商",
  NEEDS_DECISION: "待人手決定",
  SUPPLIER_PLACED: "已向供應商下單",
  SHIPPED: "運送中",
  DELIVERED: "已送達",
  REFUNDED: "已退款",
  CANCELLED: "已取消",
};

export const CHANNELS = [
  "STOREFRONT",
  "EBAY",
  "SHOPIFY",
  "META",
  "TIKTOK_SHOP",
  "SHOPEE",
  "HKTVMALL",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  STOREFRONT: "到手價 自家商店",
  EBAY: "eBay",
  SHOPIFY: "Shopify",
  META: "Facebook / Instagram",
  TIKTOK_SHOP: "TikTok Shop",
  SHOPEE: "Shopee",
  HKTVMALL: "HKTVmall",
};

export const REALNESS = ["TEST", "REAL"] as const;
export type Realness = (typeof REALNESS)[number];

export interface PlatformCrawlResult {
  platform: Platform;
  ok: boolean;
  listings: number;
  failure?: "LOGIN_WALL" | "CAPTCHA" | "TIMEOUT" | "NOT_AVAILABLE" | "ERROR";
  message?: string;
}
