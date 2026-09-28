import { describe, expect, it } from "vitest";
import { parseIntent, withinRange } from "../lib/search/intent";
import { currentStateKeys, keywordHits, cleanKeyword } from "../lib/keyword-alerts";

describe("search intent", () => {
  it("takes a Cantonese price cap out of the product words", () => {
    const i = parseIntent("耳機 800以下");
    expect(i.text).toBe("耳機");
    expect(i.maxHkdCents).toBe(80000);
    expect(i.chips).toContain("≤ HK$800");
  });

  it("understands English caps with commas, $ and k", () => {
    expect(parseIntent("airpods under $1,200").maxHkdCents).toBe(120000);
    expect(parseIntent("tv below 3k").maxHkdCents).toBe(300000);
    expect(parseIntent("airpods under $1,200").text).toBe("airpods");
  });

  it("minimums, cheapest-first and chains", () => {
    const i = parseIntent("最平 惠康 維他奶");
    expect(i.cheapestFirst).toBe(true);
    expect(i.chain).toBe("WELLCOME");
    expect(i.supermarket).toBe(true);
    expect(i.text).toBe("維他奶");
    expect(parseIntent("mechanical keyboard 500以上").minHkdCents).toBe(50000);
  });

  it("a plain query passes through untouched", () => {
    const i = parseIntent("Xiaomi Band 9");
    expect(i).toMatchObject({ text: "Xiaomi Band 9", maxHkdCents: null, cheapestFirst: false, supermarket: false, chips: [] });
  });

  it("never strips a query to nothing", () => {
    expect(parseIntent("800以下").text).toBe("800以下");
  });

  it("filters by range; unpriced items drop out only when a range is set", () => {
    const rows = [{ bestLandedHkdCents: 50000 }, { bestLandedHkdCents: 90000 }, { bestLandedHkdCents: null }];
    expect(withinRange(rows, { maxHkdCents: 80000, minHkdCents: null })).toHaveLength(1);
    expect(withinRange(rows, { maxHkdCents: null, minHkdCents: null })).toHaveLength(3);
  });
});

describe("keyword alerts", () => {
  const m = (productId: number, bestCents: number | null, promoKey = "") => ({ productId, bestCents, promoKey });

  it("a new alert baselines what is visible now", () => {
    expect(currentStateKeys(m(1, 700, "WELLCOME:買2件$20"), 800)).toEqual(["seen", "max", "promo:WELLCOME:買2件$20"]);
  });

  it("announces a new match once, with its current states recorded", () => {
    const hits = keywordHits([m(1, 700)], new Set(), 800);
    expect(hits).toEqual([{ productId: 1, stateKeys: ["seen", "max"], reason: "NEW" }]);
    const told = new Set(hits[0].stateKeys.map((k) => `1|${k}`));
    expect(keywordHits([m(1, 700)], told, 800)).toEqual([]);
  });

  it("fires when a known match drops under target or starts a real promo", () => {
    const told = new Set(["1|seen", "2|seen"]);
    const hits = keywordHits([m(1, 790), m(2, 900, "AEON:買3件$25")], told, 800);
    expect(hits.map((h) => h.reason)).toEqual(["UNDER_TARGET", "PROMO"]);
  });

  it("validates keywords", () => {
    expect(cleanKeyword("  維他奶  ")).toBe("維他奶");
    expect(cleanKeyword("a")).toBeNull();
    expect(cleanKeyword(42)).toBeNull();
  });
});
