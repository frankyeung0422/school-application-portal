// Official boutique prices across markets. Pure; tests/official.test.ts.
//
// For luxury, the manufacturer's own price is the only honest reference: a
// marketplace listing is either above it (grey premium / hype), below it
// (pre-owned, grey import — or fake), and the interesting question for a Hong
// Kong buyer is which boutique market is actually cheapest once tax is handled.

export const MARKETS = ["HK", "JP", "GB", "US", "SG"] as const;
export type Market = (typeof MARKETS)[number];

export interface MarketRule {
  label: string;
  currency: string;
  /** Tax already inside the quoted price. */
  taxInPricePct: number;
  /**
   * Share of the quoted price a visitor can realistically get back on export.
   * UK abolished tourist VAT refunds in 2021, so it is 0 despite 20% VAT.
   */
  tourdistRefundPct: number;
  /** Tax added at the till that the quoted price does NOT include (US sales tax). */
  taxOnTopPct: number;
  note: string;
}

export const MARKET_RULES: Record<Market, MarketRule> = {
  HK: {
    label: "香港 Hong Kong",
    currency: "HKD",
    taxInPricePct: 0,
    tourdistRefundPct: 0,
    taxOnTopPct: 0,
    note: "香港免關稅及增值稅，標價即係付款價。No VAT or duty — the listed price is what you pay.",
  },
  JP: {
    label: "日本 Japan",
    currency: "JPY",
    taxInPricePct: 0.1,
    tourdistRefundPct: 0.0909, // 10% tax inside the price ≈ 9.09% of the gross
    taxOnTopPct: 0,
    note: "含 10% 消費稅；旅客可於免稅店退稅（需符合條件）。Includes 10% consumption tax, refundable for visitors at tax-free shops.",
  },
  GB: {
    label: "英國 United Kingdom",
    currency: "GBP",
    taxInPricePct: 0.2,
    tourdistRefundPct: 0,
    taxOnTopPct: 0,
    note: "含 20% VAT；英國自 2021 年起取消旅客退稅，唔好當有得退。Includes 20% VAT; UK tourist VAT refunds were abolished in 2021.",
  },
  US: {
    label: "美國 United States",
    currency: "USD",
    taxInPricePct: 0,
    tourdistRefundPct: 0,
    taxOnTopPct: 0.08,
    note: "標價未含州銷售稅（約 0–10%，結帳先加）。Sales tax (roughly 0–10%) is added at checkout, not refundable.",
  },
  SG: {
    label: "新加坡 Singapore",
    currency: "SGD",
    taxInPricePct: 0.09,
    tourdistRefundPct: 0.0826,
    taxOnTopPct: 0,
    note: "含 9% GST；旅客離境可退。Includes 9% GST, refundable on departure for visitors.",
  },
};

export interface MarketPriceInput {
  market: Market;
  priceNative: number;
  currency: string;
  /** HKD per 1 unit of the market's currency. */
  midToHkd: number;
}

export interface MarketPriceRow {
  market: Market;
  priceNative: number;
  currency: string;
  /** Sticker price converted at mid. */
  stickerHkdCents: number;
  /** What a HK buyer realistically pays there: + sales tax, − claimable refund. */
  effectiveHkdCents: number;
  note: string;
}

export function marketRow(i: MarketPriceInput): MarketPriceRow {
  const rule = MARKET_RULES[i.market];
  const sticker = i.priceNative * i.midToHkd;
  const withTax = sticker * (1 + rule.taxOnTopPct);
  const effective = withTax - sticker * rule.tourdistRefundPct;
  return {
    market: i.market,
    priceNative: i.priceNative,
    currency: i.currency,
    stickerHkdCents: Math.round(sticker * 100),
    effectiveHkdCents: Math.round(effective * 100),
    note: rule.note,
  };
}

export interface MarketComparison {
  rows: MarketPriceRow[];
  hk: MarketPriceRow | null;
  cheapest: MarketPriceRow | null;
  /** How much cheaper the best market is than Hong Kong, before travel costs. */
  hkSavingCents: number | null;
}

export function compareMarkets(inputs: MarketPriceInput[]): MarketComparison {
  const rows = inputs.map(marketRow).sort((a, b) => a.effectiveHkdCents - b.effectiveHkdCents);
  const hk = rows.find((r) => r.market === "HK") ?? null;
  const cheapest = rows[0] ?? null;
  return {
    rows,
    hk,
    cheapest,
    hkSavingCents: hk && cheapest ? hk.effectiveHkdCents - cheapest.effectiveHkdCents : null,
  };
}

/** A marketplace listing against the official HK price. Negative = below official. */
export function premiumVsOfficial(listingCents: number, officialHkCents: number): number {
  return (listingCents - officialHkCents) / officialHkCents;
}
