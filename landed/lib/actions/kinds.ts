// Every side effect this system can have on the world, and how much autonomy
// each is allowed. Adapted from autoearn's action bus.

export const ACTION_KINDS = [
  "ENABLE_FULFIL",
  "OPEN_POOL",
  "UNLOCK_POOL",
  "PLACE_SUPPLIER_ORDER",
  "RESOLVE_MARGIN_DRIFT",
  "REFUND_ORDER",
  "PUBLISH_LISTING",
  "REPRICE_LISTING",
  "DELIST_LISTING",
  "PUBLISH_SOCIAL",
  "SEND_PRICE_ALERT",
  "SEND_DIGEST",
  "POST_CHANNEL",
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export type PolicyMode = "AUTO" | "APPROVE" | "BLOCK";
export type RunMode = "DRY" | "LIVE";

export function isActionKind(v: string): v is ActionKind {
  return (ACTION_KINDS as readonly string[]).includes(v);
}

export const ACTION_LABELS: Record<ActionKind, string> = {
  ENABLE_FULFIL: "開啟自家結帳 Enable fulfilment",
  OPEN_POOL: "開拼單 Open pool",
  UNLOCK_POOL: "拼單成團扣款 Unlock pool",
  PLACE_SUPPLIER_ORDER: "向供應商落單 Place supplier order",
  RESOLVE_MARGIN_DRIFT: "成本上升待決定 Resolve cost drift",
  REFUND_ORDER: "退款 Refund order",
  PUBLISH_LISTING: "上架 Publish listing",
  REPRICE_LISTING: "調價 Reprice listing",
  DELIST_LISTING: "下架 Delist listing",
  PUBLISH_SOCIAL: "發帖 Publish social post",
  SEND_PRICE_ALERT: "減價通知 Price-drop alert",
  SEND_DIGEST: "慳錢清單 Weekly basket digest",
  POST_CHANNEL: "頻道帖 Telegram deals channel post",
};

export const DEFAULT_POLICY: Record<ActionKind, PolicyMode> = {
  ENABLE_FULFIL: "APPROVE",
  OPEN_POOL: "APPROVE",
  // The buyers consented when they committed; unlocking is deterministic.
  UNLOCK_POOL: "AUTO",
  PLACE_SUPPLIER_ORDER: "APPROVE",
  RESOLVE_MARGIN_DRIFT: "APPROVE",
  REFUND_ORDER: "APPROVE",
  PUBLISH_LISTING: "APPROVE",
  REPRICE_LISTING: "AUTO",
  DELIST_LISTING: "AUTO",
  PUBLISH_SOCIAL: "APPROVE",
  SEND_PRICE_ALERT: "AUTO",
  // The shopper opted in on their own basket; unsubscribing is one link.
  SEND_DIGEST: "AUTO",
  // Public, but every post is generated from evidenced deals and passes the claims lint first.
  POST_CHANNEL: "AUTO",
};

/**
 * Minimum strictness, in code. No database row can loosen these. Committing
 * the business to a new product, a new pool, a refund or a loss-making order
 * is always a person's decision.
 */
export const POLICY_FLOOR: Partial<Record<ActionKind, PolicyMode>> = {
  ENABLE_FULFIL: "APPROVE",
  OPEN_POOL: "APPROVE",
  RESOLVE_MARGIN_DRIFT: "APPROVE",
  REFUND_ORDER: "APPROVE",
};

/**
 * Autonomy that must be earned: AUTO is honoured only after this many
 * human-approved executions of the kind with no failure among the most recent
 * ones. Until then AUTO resolves to APPROVE.
 */
export const EARNED_AUTONOMY: Partial<Record<ActionKind, number>> = {
  PUBLISH_LISTING: 10,
  PUBLISH_SOCIAL: 10,
  PLACE_SUPPLIER_ORDER: 20,
};

/**
 * Protective actions reduce exposure (a delist stops overselling, a reprice
 * up stops selling at a loss). The kill switch must not block them — during an
 * incident they are exactly what you want to happen.
 */
export const PROTECTIVE_KINDS: readonly ActionKind[] = ["DELIST_LISTING", "REPRICE_LISTING"];

/** Rolling-24h caps. Constants on purpose: changing one is a reviewed code edit. */
export const DAILY_CAPS: Partial<Record<ActionKind, number>> = {
  SEND_PRICE_ALERT: 500,
  SEND_DIGEST: 2000,
  POST_CHANNEL: 6,
  PUBLISH_SOCIAL: 4,
  PUBLISH_LISTING: 50,
};
