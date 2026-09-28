// 到手價 — the price a Hong Kong buyer actually pays to have the thing at their
// door. Pure; tests/landed.test.ts.
//
// A sticker price is not a comparison. $26 on AliExpress vs HK$249 on JD says
// nothing until you add what each route really costs: the source's shipping,
// the domestic leg to a forwarder for CN-only platforms, per-kg forwarding,
// the card's foreign-currency markup, and whatever duty applies (HK: none).
// Every assumption the number rests on is returned alongside it.

import { tierPriceAt } from "./margin";
import { midFor, settlementFeeCents, toCents, type FxMids, type Rail } from "./fx";
import type { PriceTier } from "../types";

export interface SourceProfile {
  platform: string;
  currency: string;
  shipToHkHkd: number;
  freeShipOverNative: number | null;
  domesticShipNative: number;
  viaForwarder: boolean;
  forwarderPerKgHkd: number;
  forwarderMinHkd: number;
  assumedWeightKg: number;
  cardFxMarkupPct: number;
  paymentFeePct: number;
  importDutyPct: number;
  /**
   * The platform's own consolidation ships free to an HK pickup point / locker
   * (Taobao since 2025-08: no minimum, even a single item). Replaces the
   * domestic leg + private forwarder for parcels up to `officialFreeMaxKg`.
   */
  officialFreeToPickup?: boolean;
  officialFreeMaxKg?: number;
  /** Extra for delivery to the door instead of a pickup point (HKD per order). */
  homeDeliverySurchargeHkd?: number;
  /** Volumetric divisor (cm³ per kg); forwarders bill max(actual, L×W×H/divisor). */
  volumetricDivisor?: number;
}

/** E-wallets HK shoppers pay mainland platforms with; markup is the wallet's FX spread. */
export const WALLETS = ["ALIPAYHK", "WECHATPAYHK"] as const;
export type Wallet = (typeof WALLETS)[number];

export type PayWith =
  | { kind: "CARD" }
  | { kind: "RAIL"; rail: Rail }
  | { kind: "WALLET"; wallet: Wallet; fxMarkupPct: number };

export type Delivery = "PICKUP" | "HOME";

/** Billable weight: the larger of actual and volumetric (when dimensions are known). */
export function billableKg(actualKg: number, dimsCm: { l: number; w: number; h: number } | null | undefined, divisor = 6000): number {
  if (!dimsCm || !(dimsCm.l > 0 && dimsCm.w > 0 && dimsCm.h > 0) || !(divisor > 0)) return actualKg;
  return Math.max(actualKg, (dimsCm.l * dimsCm.w * dimsCm.h) / divisor);
}

export interface LandedInput {
  price: number;
  currency: string;
  /** Sellable units the buyer wants. */
  qty: number;
  priceTiers?: PriceTier[] | null;
  moq?: number | null;
  packQty?: number | null;
  /** Shipping weight of ONE listing, when the source states it. */
  weightKg?: number | null;
  /** Parcel dimensions of ONE listing, when the source states them. */
  dimsCm?: { l: number; w: number; h: number } | null;
  /** Pickup point / locker (default — the cheapest honest route) or door delivery. */
  delivery?: Delivery;
  profile: SourceProfile;
  mids: FxMids;
  payWith: PayWith;
}

export type LandedLineKey =
  | "ITEMS"
  | "SOURCE_SHIPPING"
  | "DOMESTIC_LEG"
  | "FORWARDER"
  | "FX_COST"
  | "PAYMENT_FEE"
  | "DUTY"
  | "DELIVERY";

export interface LandedLine {
  key: LandedLineKey;
  label: string;
  hkdCents: number;
}

export interface LandedResult {
  totalHkdCents: number;
  perUnitHkdCents: number;
  /** Listings that must be bought (after pack size and MOQ). */
  listingsBought: number;
  /** Sellable units actually received. */
  unitsReceived: number;
  /** True when MOQ forced a larger purchase than asked for. */
  moqForced: boolean;
  unitListingPriceNative: number;
  breakdown: LandedLine[];
  assumptions: string[];
}

export const LINE_LABELS: Record<LandedLineKey, string> = {
  ITEMS: "貨價 Item price",
  SOURCE_SHIPPING: "賣家運費 Seller shipping",
  DOMESTIC_LEG: "內地段運費 Domestic leg to forwarder",
  FORWARDER: "集運 Forwarding to HK",
  FX_COST: "外幣手續費 FX cost",
  PAYMENT_FEE: "付款手續費 Payment fee",
  DUTY: "關稅 Duty",
  DELIVERY: "送貨上門 Home delivery",
};

export function landedQuote(input: LandedInput): LandedResult {
  if (!(input.qty >= 1)) throw new Error("qty must be ≥ 1");
  if (!(input.price > 0)) throw new Error("price must be > 0");
  const p = input.profile;
  const assumptions: string[] = [];

  const pack = Math.max(1, input.packQty ?? 1);
  let listings = Math.ceil(input.qty / pack);
  let moqForced = false;
  if (input.moq && listings < input.moq) {
    listings = input.moq;
    moqForced = true;
    assumptions.push(`最低訂購量 ${input.moq} — MOQ forces ${input.moq} listings`);
  }

  const unitListingPrice = tierPriceAt(input.priceTiers, listings, input.price);
  const itemsNative = unitListingPrice * listings;
  const mid = midFor(input.currency, input.mids);

  const freeShip = p.freeShipOverNative != null && itemsNative >= p.freeShipOverNative;
  const sourceShippingHkd = freeShip ? 0 : p.shipToHkHkd;

  const delivery: Delivery = input.delivery ?? "PICKUP";
  const actualKg = input.weightKg ?? p.assumedWeightKg;
  const perListingKg = billableKg(actualKg, input.dimsCm, p.volumetricDivisor ?? 6000);
  if (perListingKg > actualKg) {
    assumptions.push(`按體積重計 ${perListingKg.toFixed(2)}kg/件 — billed by volumetric weight (L×W×H/${p.volumetricDivisor ?? 6000})`);
  }
  if (input.weightKg == null && p.viaForwarder) {
    assumptions.push(`重量假設 ${p.assumedWeightKg}kg/件 — weight not stated, assumed`);
  }
  const totalKg = perListingKg * listings;

  // The platform's own consolidation to a pickup point, when it is free for this parcel.
  const officialFree =
    p.viaForwarder && p.officialFreeToPickup === true && delivery === "PICKUP" && totalKg <= (p.officialFreeMaxKg ?? Infinity);
  if (officialFree) {
    assumptions.push("官方集運：免運到香港自提點／智能櫃（淘寶 2025-08 起單件包郵）— free official consolidation to an HK pickup point");
  } else if (p.viaForwarder && p.officialFreeToPickup && delivery === "PICKUP") {
    assumptions.push(`包裹 ${totalKg.toFixed(1)}kg 超過官方免運上限 ${p.officialFreeMaxKg}kg — too heavy for free official shipping, forwarder rate used`);
  }
  const domesticNative = p.viaForwarder && !officialFree ? p.domesticShipNative : 0;
  const forwarderHkd = p.viaForwarder && !officialFree ? Math.max(p.forwarderMinHkd, p.forwarderPerKgHkd * totalKg) : 0;
  const homeHkd = delivery === "HOME" ? (p.homeDeliverySurchargeHkd ?? 0) : 0;
  if (homeHkd > 0) assumptions.push(`送貨上門附加 HK$${homeHkd} — door delivery instead of a pickup point`);

  const goodsHkd = (itemsNative + domesticNative) * mid;
  const goodsCents = toCents(goodsHkd);

  let fxCents = 0;
  if (input.currency !== "HKD") {
    if (input.payWith.kind === "CARD") {
      fxCents = toCents(goodsHkd * p.cardFxMarkupPct);
    } else if (input.payWith.kind === "WALLET") {
      fxCents = toCents(goodsHkd * input.payWith.fxMarkupPct);
      assumptions.push(`用 ${input.payWith.wallet === "ALIPAYHK" ? "AlipayHK" : "WeChat Pay HK"} 付款，匯率差價假設 ${(input.payWith.fxMarkupPct * 100).toFixed(2)}% — wallet FX spread, assumed`);
    } else {
      fxCents = settlementFeeCents(goodsCents, input.payWith.rail);
    }
  }
  const paymentFeeCents = toCents(goodsHkd * p.paymentFeePct);
  const dutyCents = toCents((goodsHkd + sourceShippingHkd) * p.importDutyPct);

  const lines: LandedLine[] = [
    { key: "ITEMS", label: LINE_LABELS.ITEMS, hkdCents: toCents(itemsNative * mid) },
    { key: "SOURCE_SHIPPING", label: LINE_LABELS.SOURCE_SHIPPING, hkdCents: toCents(sourceShippingHkd) },
  ];
  if (domesticNative > 0) {
    lines.push({ key: "DOMESTIC_LEG", label: LINE_LABELS.DOMESTIC_LEG, hkdCents: toCents(domesticNative * mid) });
  }
  if (forwarderHkd > 0) {
    lines.push({ key: "FORWARDER", label: LINE_LABELS.FORWARDER, hkdCents: toCents(forwarderHkd) });
  }
  if (fxCents > 0) lines.push({ key: "FX_COST", label: LINE_LABELS.FX_COST, hkdCents: fxCents });
  if (paymentFeeCents > 0) lines.push({ key: "PAYMENT_FEE", label: LINE_LABELS.PAYMENT_FEE, hkdCents: paymentFeeCents });
  if (dutyCents > 0) lines.push({ key: "DUTY", label: LINE_LABELS.DUTY, hkdCents: dutyCents });
  if (homeHkd > 0) lines.push({ key: "DELIVERY", label: LINE_LABELS.DELIVERY, hkdCents: toCents(homeHkd) });

  const totalHkdCents = lines.reduce((s, l) => s + l.hkdCents, 0);
  const unitsReceived = listings * pack;

  return {
    totalHkdCents,
    perUnitHkdCents: Math.round(totalHkdCents / unitsReceived),
    listingsBought: listings,
    unitsReceived,
    moqForced,
    unitListingPriceNative: unitListingPrice,
    breakdown: lines,
    assumptions,
  };
}
