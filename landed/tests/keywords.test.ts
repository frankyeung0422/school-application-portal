import { describe, expect, it } from "vitest";
import { distillKeyword, distillKeywords } from "../lib/discovery/keywords";

describe("distillKeyword", () => {
  it("keeps brand + model from an English bestseller title", () => {
    const kw = distillKeyword(
      "Xiaomi Smart Band 9 Activity Tracker, NFC, SpO2, 21-Day Battery",
    );
    expect(kw).toBe("xiaomi smart band 9 activity tracker");
  });

  it("cuts at the first model token", () => {
    const kw = distillKeyword("Sony WH-1000XM5 Wireless Noise Canceling Headphones");
    expect(kw).toBe("sony wh-1000xm5");
  });

  it("handles CJK titles and strips CN marketing stopwords", () => {
    const kw = distillKeyword("【正品包邮】小米手环9 NFC版 旗舰店");
    expect(kw).toContain("小米手环9");
    expect(kw).not.toContain("正品");
    expect(kw).not.toContain("旗舰店");
  });

  it("drops English marketing filler", () => {
    const kw = distillKeyword("New Hot Deal Anker 737 Power Bank Free Shipping");
    expect(kw).toBe("anker 737 power bank");
  });

  it("returns null for generic single-word titles", () => {
    expect(distillKeyword("Earbuds")).toBeNull();
    expect(distillKeyword("New Deal Sale")).toBeNull();
    expect(distillKeyword("")).toBeNull();
  });

  it("caps keyword length", () => {
    const kw = distillKeyword(
      "Ultra Premium Professional Stainless Steel Kitchen Knife Sharpener System",
    );
    expect(kw).not.toBeNull();
    expect(kw!.length).toBeLessThanOrEqual(40);
    expect(kw!.split(" ").length).toBeLessThanOrEqual(6);
  });
});

describe("distillKeywords", () => {
  it("dedupes titles that distill to the same keyword", () => {
    const kws = distillKeywords([
      "Xiaomi Smart Band 9 NFC Fitness Tracker - New",
      "Xiaomi Smart Band 9 NFC Fitness Tracker (2024)",
      "Redmi Buds 6 Lite TWS Earbuds",
    ]);
    expect(kws).toHaveLength(2);
  });

  it("respects the max cap and skips generic titles", () => {
    const kws = distillKeywords(
      [
        "Earbuds",
        "Anker 737 Power Bank PowerCore 24K",
        "Logitech MX Master 3S Mouse",
        "Sony WH-1000XM5 Headphones",
        "Kindle Paperwhite 16GB",
      ],
      { max: 3 },
    );
    expect(kws).toHaveLength(3);
    expect(kws[0]).toContain("anker 737");
  });
});
