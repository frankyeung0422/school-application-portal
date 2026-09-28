// Validation for shopper-reported in-store prices. Pure;
// tests/instore.test.ts.
//
// Anyone can type anything into a form, and a wrong price here is worse than no
// price: it is presented as something a real person saw in a real shop. So the
// rules are strict, explicit, and the same on the client and the server.

import { isRetailer } from "../supermarket/retailers";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Anything older than this is not "the price now". */
export const MAX_AGE_DAYS = 14;
export const MAX_PRICE_CENTS = 500_000_00;
export const MIN_PRICE_CENTS = 50;

export interface ReportInput {
  retailer: string;
  priceCents: number;
  seenAt: Date;
  productId?: number | null;
  itemName?: string | null;
  branch?: string | null;
  note?: string | null;
  reporterEmail?: string | null;
  photo?: { type: string; size: number } | null;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateReport(i: ReportInput, now = new Date()): ValidationResult {
  const errors: string[] = [];
  if (!isRetailer(i.retailer)) errors.push("請揀返超市／店舖 Pick a shop from the list");
  if (!Number.isInteger(i.priceCents) || i.priceCents < MIN_PRICE_CENTS || i.priceCents > MAX_PRICE_CENTS) {
    errors.push("價錢唔合理 Price must be between HK$0.50 and HK$500,000");
  }
  if (!i.productId && !(i.itemName ?? "").trim()) errors.push("請揀產品或者寫低貨品名 Pick a product or type the item name");
  if ((i.itemName ?? "").length > 120) errors.push("貨品名太長 Item name too long");
  if ((i.branch ?? "").length > 80) errors.push("分店名太長 Branch name too long");
  if ((i.note ?? "").length > 300) errors.push("備註太長 Note too long");
  const ageDays = (now.getTime() - i.seenAt.getTime()) / 86400_000;
  if (Number.isNaN(ageDays)) errors.push("日期唔啱 Invalid date");
  else if (ageDays < -0.5) errors.push("日期喺未來 Date is in the future");
  else if (ageDays > MAX_AGE_DAYS) errors.push(`太耐之前嘅價錢（多過 ${MAX_AGE_DAYS} 日）Prices older than ${MAX_AGE_DAYS} days are not accepted`);
  if (i.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.reporterEmail)) errors.push("電郵格式唔啱 Invalid email");
  if (i.photo) {
    if (!(PHOTO_TYPES as readonly string[]).includes(i.photo.type)) errors.push("相片只接受 JPEG / PNG / WebP");
    if (i.photo.size > MAX_PHOTO_BYTES) errors.push("相片太大（上限 4MB）Photo too large (4MB max)");
    if (i.photo.size <= 0) errors.push("相片讀取失敗 Photo could not be read");
  }
  return { ok: errors.length === 0, errors };
}

/** Reports per shopper per day — enough for a real shop, useless for spamming. */
export const DAILY_REPORT_LIMIT = 15;

export function overDailyLimit(countToday: number): boolean {
  return countToday >= DAILY_REPORT_LIMIT;
}

/** A reported price this far from the online price is suspicious enough to flag for review. */
export const SUSPICIOUS_DELTA = 0.6;

export function looksImplausible(priceCents: number, onlinePriceCents: number | null): string | null {
  if (!onlinePriceCents) return null;
  const ratio = priceCents / onlinePriceCents;
  if (ratio < 1 - SUSPICIOUS_DELTA) return `比網上價平 ${Math.round((1 - ratio) * 100)}% — 請核對相片 much cheaper than the online price`;
  if (ratio > 1 + SUSPICIOUS_DELTA) return `比網上價貴 ${Math.round((ratio - 1) * 100)}% — 請核對相片 much dearer than the online price`;
  return null;
}
