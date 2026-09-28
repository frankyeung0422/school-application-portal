import { describe, expect, it } from "vitest";
import { extractFromJsonLd, isPlausibleOfficialPrice } from "../lib/official/extract";
import { compareMarkets, marketRow, premiumVsOfficial } from "../lib/official/markets";
import { referencesIn } from "../lib/official/catalogue";

describe("extractFromJsonLd", () => {
  it("reads the shape rolex.com ships", () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Submariner Date",
      offers: { "@type": "Offer", price: "91700", priceCurrency: "HKD", availability: "InStock" },
    });
    expect(extractFromJsonLd([block])).toEqual({ priceNative: 91700, currency: "HKD" });
  });

  it("digs through @graph, arrays and nested variants", () => {
    const graph = JSON.stringify({ "@graph": [{ "@type": "WebPage" }, { "@type": "Product", offers: [{ price: 46800, priceCurrency: "HKD" }] }] });
    expect(extractFromJsonLd([graph])?.priceNative).toBe(46800);
    const nested = JSON.stringify([{ "@type": "ItemList", itemListElement: [{ item: { offers: { price: "5600.00", priceCurrency: "GBP" } } }] }]);
    expect(extractFromJsonLd([nested])).toEqual({ priceNative: 5600, currency: "GBP" });
  });

  it("ignores blocks without a usable offer", () => {
    expect(extractFromJsonLd(["not json"])).toBeNull();
    expect(extractFromJsonLd([JSON.stringify({ "@type": "Product", name: "no price" })])).toBeNull();
    expect(extractFromJsonLd([JSON.stringify({ offers: { price: "0", priceCurrency: "HKD" } })])).toBeNull();
    expect(extractFromJsonLd([JSON.stringify({ offers: { price: "100", priceCurrency: "hkd" } })])).toBeNull();
  });

  it("rejects prices outside a sane band for the currency", () => {
    expect(isPlausibleOfficialPrice({ priceNative: 91700, currency: "HKD" })).toBe(true);
    expect(isPlausibleOfficialPrice({ priceNative: 1683000, currency: "JPY" })).toBe(true);
    expect(isPlausibleOfficialPrice({ priceNative: 3, currency: "HKD" })).toBe(false);
    expect(isPlausibleOfficialPrice({ priceNative: 500, currency: "XYZ" })).toBe(false);
  });
});

describe("market comparison", () => {
  // Real figures captured 2026-09-16 for the Submariner 126610LN.
  const mids = { HKD: 1, JPY: 0.0508, GBP: 10.587, USD: 7.844, SGD: 6.1 };
  const inputs = [
    { market: "HK" as const, priceNative: 91700, currency: "HKD", midToHkd: mids.HKD },
    { market: "JP" as const, priceNative: 1683000, currency: "JPY", midToHkd: mids.JPY },
    { market: "GB" as const, priceNative: 9500, currency: "GBP", midToHkd: mids.GBP },
    { market: "US" as const, priceNative: 11350, currency: "USD", midToHkd: mids.USD },
    { market: "SG" as const, priceNative: 15950, currency: "SGD", midToHkd: mids.SGD },
  ];

  it("Japan's tax refund makes it cheaper than its sticker price", () => {
    const jp = marketRow(inputs[1]);
    expect(jp.stickerHkdCents).toBe(8549640);
    expect(jp.effectiveHkdCents).toBeLessThan(jp.stickerHkdCents);
  });

  it("UK keeps its VAT: no tourist refund since 2021", () => {
    const gb = marketRow(inputs[2]);
    expect(gb.effectiveHkdCents).toBe(gb.stickerHkdCents);
  });

  it("US adds sales tax that the sticker price hides", () => {
    const us = marketRow(inputs[3]);
    expect(us.effectiveHkdCents).toBeGreaterThan(us.stickerHkdCents);
  });

  it("ranks markets by what a HK buyer actually pays and states the saving", () => {
    const c = compareMarkets(inputs);
    expect(c.cheapest?.market).toBe("JP");
    expect(c.hk?.market).toBe("HK");
    expect(c.hkSavingCents).toBeGreaterThan(0);
    expect(c.rows.map((r) => r.market)[c.rows.length - 1]).toBe("GB");
  });

  it("prices a marketplace listing against the official HK price", () => {
    expect(premiumVsOfficial(10_000_000, 9_170_000)).toBeCloseTo(0.0905, 3);
    expect(premiumVsOfficial(8_000_000, 9_170_000)).toBeLessThan(0);
  });
});

describe("reference matching", () => {
  it("finds manufacturer references inside marketplace titles", () => {
    expect(referencesIn("Rolex Submariner Date 126610LN 41mm Black Dial")).toEqual(["126610LN"]);
    expect(referencesIn("ROLEX GMT-MASTER II 126710GRNR JUBILEE BRACELET")).toEqual(["126710GRNR"]);
    // A reference we do not track yet must not match something similar that we do.
    expect(referencesIn("ROLEX GMT-MASTER II 126710BLRO PEPSI")).toEqual([]);
    expect(referencesIn("Rolex watch strap for 126610")).toEqual([]);
    expect(referencesIn("Tudor Black Bay 58")).toEqual([]);
  });
});
