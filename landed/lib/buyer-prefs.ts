// How THIS shopper pays and collects, which changes the landed price. Pure;
// tests/buyer-prefs.test.ts. Stored in a cookie; stored/listed prices always use
// the default (card + pickup point) so every visitor sees the same headline.

import { WALLETS, type Delivery, type PayWith, type Wallet } from "./money/landed";

export type PayMethod = "CARD" | Wallet;

export interface BuyerPrefs {
  pay: PayMethod;
  delivery: Delivery;
}

export const DEFAULT_PREFS: BuyerPrefs = { pay: "CARD", delivery: "PICKUP" };
export const PREFS_COOKIE = "landed_prefs";

/** Where HK e-wallets are accepted at checkout. Elsewhere the shopper pays by card. */
export const WALLET_PLATFORMS = ["TAOBAO", "ALI1688", "JD", "PDD", "ALIEXPRESS"];

export const PAY_LABEL: Record<PayMethod, string> = {
  CARD: "信用卡 Card",
  ALIPAYHK: "AlipayHK",
  WECHATPAYHK: "WeChat Pay HK",
};

export const DELIVERY_LABEL: Record<Delivery, string> = {
  PICKUP: "自提點／智能櫃 Pickup point",
  HOME: "送貨上門 Home delivery",
};

export function parsePrefs(raw: string | null | undefined): BuyerPrefs {
  const [pay, delivery] = (raw ?? "").split(".");
  return {
    pay: pay === "CARD" || (WALLETS as readonly string[]).includes(pay) ? (pay as PayMethod) : DEFAULT_PREFS.pay,
    delivery: delivery === "HOME" || delivery === "PICKUP" ? delivery : DEFAULT_PREFS.delivery,
  };
}

export function serializePrefs(p: BuyerPrefs): string {
  return `${p.pay}.${p.delivery}`;
}

export function isDefaultPrefs(p: BuyerPrefs): boolean {
  return p.pay === DEFAULT_PREFS.pay && p.delivery === DEFAULT_PREFS.delivery;
}

/** The payment actually used on this platform: a wallet only where it is accepted. */
export function payWithFor(prefs: BuyerPrefs, platform: string, walletMarkup: Record<Wallet, number>): PayWith {
  if (prefs.pay !== "CARD" && WALLET_PLATFORMS.includes(platform)) {
    return { kind: "WALLET", wallet: prefs.pay, fxMarkupPct: walletMarkup[prefs.pay] };
  }
  return { kind: "CARD" };
}

/** "3 x 20 x 15" / "30x20x15cm" → cm dims; null when unparseable. */
export function parseDims(raw: string | null | undefined): { l: number; w: number; h: number } | null {
  const m = /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i.exec(raw ?? "");
  if (!m) return null;
  const [l, w, h] = [m[1], m[2], m[3]].map(Number);
  return l > 0 && w > 0 && h > 0 ? { l, w, h } : null;
}
