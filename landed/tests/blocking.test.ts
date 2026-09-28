import { describe, expect, it } from "vitest";
import {
  generateCandidatePairs,
  jaccard,
  normalizeTitle,
  sharesModelToken,
  tokenize,
} from "../lib/match/blocking";

describe("normalizeTitle", () => {
  it("strips marketing stopwords and punctuation", () => {
    const t = normalizeTitle("【正品包邮】小米手环9 NFC版！旗舰店");
    expect(t).not.toContain("正品");
    expect(t).not.toContain("包邮");
    expect(t).not.toContain("旗舰店");
    expect(t).toContain("小米手环9");
    expect(t).toContain("nfc");
  });
});

describe("tokenize", () => {
  it("extracts model-number tokens", () => {
    const t = tokenize("Sony WH-1000XM5 无线降噪耳机");
    expect(t.modelTokens.has("wh-1000xm5")).toBe(true);
  });
  it("does not treat plain words as model tokens", () => {
    const t = tokenize("wireless headphones black");
    expect(t.modelTokens.size).toBe(0);
  });
  it("builds CJK bigrams", () => {
    const t = tokenize("小米手环");
    expect(t.bigrams.has("小米")).toBe(true);
    expect(t.bigrams.has("手环")).toBe(true);
  });
});

describe("sharesModelToken / jaccard", () => {
  it("matches identical model numbers across CN/EN titles", () => {
    const a = tokenize("美的电热水壶 MK-SH15 家用");
    const b = tokenize("Midea Electric Kettle MK-SH15 1.5L");
    expect(sharesModelToken(a, b)).toBe(true);
  });
  it("jaccard is high for near-identical CN titles", () => {
    const a = tokenize("小米手环9 NFC版 智能手环");
    const b = tokenize("小米手环9 NFC 智能运动手环");
    expect(jaccard(a.bigrams, b.bigrams)).toBeGreaterThan(0.4);
  });
  it("bridges CN brand/category terms to latin tokens for EN overlap", () => {
    const cn = tokenize("小米手环9 NFC 智能运动手环");
    expect(cn.bigrams.has("xiaomi")).toBe(true);
    expect(cn.bigrams.has("band")).toBe(true);
    const en = tokenize("Xiaomi Smart Band 9 Activity Tracker, NFC, SpO2");
    expect(jaccard(cn.bigrams, en.bigrams)).toBeGreaterThan(0.2);
  });
});

describe("cross-language blocking (Taobao CN ↔ Amazon EN)", () => {
  it("pairs a Chinese and English title for the same product", () => {
    const listings = [
      { id: 1, platform: "TAOBAO", title: "小米手环9 NFC 智能运动手环 正品包邮", priceCny: 239 },
      { id: 2, platform: "AMAZON", title: "Xiaomi Smart Band 9 Activity Tracker, NFC, SpO2", priceCny: 49.99 * 7.2 },
    ];
    const pairs = generateCandidatePairs(listings);
    expect(pairs.length).toBe(1);
    expect(pairs[0].buy.platform).toBe("TAOBAO"); // 239 < 359.9 → cheaper side buys
  });

  it("does not pair unrelated CN/EN products", () => {
    const listings = [
      { id: 1, platform: "TAOBAO", title: "美的电热水壶 1.5L 家用烧水壶", priceCny: 89 },
      { id: 2, platform: "AMAZON", title: "Sony WH-1000XM5 Wireless Headphones", priceCny: 399 * 7.2 },
    ];
    const pairs = generateCandidatePairs(listings);
    expect(pairs.length).toBe(0);
  });
});

describe("generateCandidatePairs", () => {
  const listings = [
    { id: 1, platform: "ALI1688", title: "小米手环9 NFC版 工厂批发", priceCny: 145 },
    { id: 2, platform: "JD", title: "小米手环9 NFC版 智能手环", priceCny: 249 },
    { id: 3, platform: "ALI1688", title: "适用小米手环9腕带 硅胶表带", priceCny: 3.5 },
    { id: 4, platform: "JD", title: "美的电热水壶 MK-SH15", priceCny: 89 },
    { id: 5, platform: "ALI1688", title: "戴森吹风机 HD08 批发", priceCny: 1200 },
  ];

  it("pairs the same product across platforms", () => {
    const pairs = generateCandidatePairs(listings);
    const hit = pairs.find(
      (p) =>
        (p.buy.id === 1 && p.sell.id === 2) ||
        (p.buy.id === 2 && p.sell.id === 1),
    );
    expect(hit).toBeDefined();
    expect(hit!.buy.id).toBe(1); // cheaper side is the buy side
  });

  it("price band excludes the ¥3.5 strap vs ¥249 band pair", () => {
    const pairs = generateCandidatePairs(listings);
    const strapPair = pairs.find(
      (p) => p.buy.id === 3 && p.sell.id === 2,
    );
    expect(strapPair).toBeUndefined();
  });

  it("never pairs listings on the same platform", () => {
    const pairs = generateCandidatePairs(listings);
    for (const p of pairs) {
      expect(p.buy.platform).not.toBe(p.sell.platform);
    }
  });

  it("respects the maxPairs cap", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      platform: i % 2 === 0 ? "ALI1688" : "JD",
      title: `小米手环9 NFC版 variant${i}`,
      priceCny: i % 2 === 0 ? 100 + i : 200 + i,
    }));
    const pairs = generateCandidatePairs(many, { maxPairs: 15 });
    expect(pairs.length).toBeLessThanOrEqual(15);
  });
});
