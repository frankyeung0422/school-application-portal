import { describe, expect, it } from "vitest";
import { looksImplausible, overDailyLimit, validateReport, MAX_PHOTO_BYTES } from "../lib/instore/validate";
import { isOpwRetailer, pricesArePublished, RETAILERS } from "../lib/supermarket/retailers";

const now = new Date("2026-09-16T12:00:00Z");
const base = { retailer: "WELLCOME", priceCents: 1250, seenAt: new Date("2026-09-16T09:00:00Z"), productId: 42 };

describe("validateReport", () => {
  it("accepts a normal report", () => {
    expect(validateReport(base, now)).toEqual({ ok: true, errors: [] });
  });
  it("needs a known shop", () => {
    expect(validateReport({ ...base, retailer: "MY_SHOP" }, now).errors.join()).toMatch(/Pick a shop/);
    // The chains that publish nothing are still valid targets — that is the point.
    expect(validateReport({ ...base, retailer: "AJI", productId: null, itemName: "優之良品 芒果乾" }, now).ok).toBe(true);
  });
  it("needs either a catalogue product or a typed item name", () => {
    expect(validateReport({ ...base, productId: null }, now).errors.join()).toMatch(/item name/);
    expect(validateReport({ ...base, productId: null, itemName: "維他奶 250ml" }, now).ok).toBe(true);
  });
  it("rejects impossible prices and dates", () => {
    expect(validateReport({ ...base, priceCents: 5 }, now).ok).toBe(false);
    expect(validateReport({ ...base, priceCents: 99_999_999_00 }, now).ok).toBe(false);
    expect(validateReport({ ...base, seenAt: new Date("2026-10-01") }, now).errors.join()).toMatch(/future/);
    expect(validateReport({ ...base, seenAt: new Date("2026-08-01") }, now).errors.join()).toMatch(/older than/);
  });
  it("only accepts real image uploads within the size cap", () => {
    expect(validateReport({ ...base, photo: { type: "image/jpeg", size: 1000 } }, now).ok).toBe(true);
    expect(validateReport({ ...base, photo: { type: "application/pdf", size: 1000 } }, now).ok).toBe(false);
    expect(validateReport({ ...base, photo: { type: "image/png", size: MAX_PHOTO_BYTES + 1 } }, now).errors.join()).toMatch(/too large/i);
  });
  it("validates an optional email", () => {
    expect(validateReport({ ...base, reporterEmail: "not-an-email" }, now).ok).toBe(false);
    expect(validateReport({ ...base, reporterEmail: "a@b.com" }, now).ok).toBe(true);
  });
});

describe("moderation aids", () => {
  it("caps reports per shopper per day", () => {
    expect(overDailyLimit(14)).toBe(false);
    expect(overDailyLimit(15)).toBe(true);
  });
  it("flags reports far from the chain's own online price", () => {
    expect(looksImplausible(1200, 1300)).toBeNull();
    expect(looksImplausible(300, 1300)).toMatch(/cheaper/);
    expect(looksImplausible(3000, 1300)).toMatch(/dearer/);
    // No online price to compare against (優之良品 and friends) → no flag, just review.
    expect(looksImplausible(1200, null)).toBeNull();
  });
});

describe("retailers", () => {
  it("separates chains the feed prices from chains only shoppers can price", () => {
    expect(isOpwRetailer("WELLCOME")).toBe(true);
    expect(isOpwRetailer("AJI")).toBe(false);
    expect(pricesArePublished("AJI")).toBe(false);
    expect(RETAILERS).toContain("AJI");
    expect(RETAILERS).toContain("BESTMART360");
    expect(RETAILERS).toContain("STORE759");
  });
});
