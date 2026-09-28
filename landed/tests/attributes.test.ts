import { describe, expect, it } from "vitest";
import {
  brandsConflict,
  incompatibleReason,
  isAccessoryTitle,
  parsePackQty,
  parseUnitSize,
  sizesConflict,
} from "../lib/match/attributes";
import { generateCandidatePairs, isUnitToken, tokenize } from "../lib/match/blocking";

describe("isAccessoryTitle", () => {
  it("flags replacement parts", () => {
    expect(
      isAccessoryTitle(
        "Straw Lid Replacement for Hydrojug Traveler 32oz Water Bottle",
      ),
    ).toBe(true);
    expect(isAccessoryTitle("5Pcs Clear Replacement Straws for Hydrojug Traveler (32oz)")).toBe(true);
    expect(isAccessoryTitle("1Pack Replacement Lid Compatible with HydroJug Traveler 32oz")).toBe(true);
    expect(isAccessoryTitle("Metal Straws for Hydrojug Traveler 32 oz Flip Straw Lid Tumbler")).toBe(true);
  });

  it("flags CJK accessory phrasing", () => {
    expect(isAccessoryTitle("适用小米手环9腕带 硅胶表带 多色 批发")).toBe(true);
    expect(isAccessoryTitle("苹果手机保护套 防摔")).toBe(true);
  });

  it("does not flag the product itself", () => {
    expect(isAccessoryTitle("HydroJug Traveler 32oz, Insulated Tumbler with Handle & Straw")).toBe(false);
    expect(isAccessoryTitle("Xiaomi Smart Band 9 Activity Tracker, NFC, SpO2")).toBe(false);
    expect(isAccessoryTitle("小米手环9 NFC版 智能手环 血氧监测")).toBe(false);
  });
});

describe("parsePackQty", () => {
  it("reads marketing pack copy", () => {
    expect(parsePackQty("BountyPaper Towels Quick Size, White, 2 Family Triple Rolls")).toBe(2);
    expect(parsePackQty("Paper Towels Quick Size, White, 16 Family Rolls = 40 Regular Rolls")).toBe(16);
    expect(parsePackQty("5Pcs Clear Replacement Straws")).toBe(5);
    expect(parsePackQty("Silicone Spatula Set, Pack of 6")).toBe(6);
    expect(parsePackQty("Socks 3 Pairs Cotton")).toBe(3);
    expect(parsePackQty("硅胶表带 10个装 多色")).toBe(10);
  });

  it("returns null when no pack size is stated", () => {
    expect(parsePackQty("HydroJug Traveler 32oz Insulated Tumbler")).toBeNull();
    expect(parsePackQty("Xiaomi Smart Band 9 Activity Tracker")).toBeNull();
  });
});

describe("parseUnitSize / sizesConflict", () => {
  it("normalizes within a dimension", () => {
    expect(parseUnitSize("Midea Electric Kettle 1.5L")?.label).toBe("1500ml");
    expect(parseUnitSize("Water Bottle 500 ml")?.label).toBe("500ml");
    expect(parseUnitSize("HydroJug Traveler 32oz")?.label).toBe("32oz");
  });

  it("treats different capacities as a conflict", () => {
    expect(
      sizesConflict(parseUnitSize("Owala FreeSip 32 oz"), parseUnitSize("Owala FreeSip 24 oz")),
    ).toBe(true);
  });

  it("treats fl oz and oz as the same dimension", () => {
    // Live failure: a 32 oz Owala matched a 24 fl oz Owala because fl oz was
    // converted to ml and landed in a different dimension.
    expect(
      sizesConflict(
        parseUnitSize('Owala FreeSip 32 oz "Cowgirl Core" Bottle'),
        parseUnitSize("Owala 24fl oz Stainless Steel FreeSip Water Bottle"),
      ),
    ).toBe(true);
  });

  it("does not conflict across dimensions or when unknown", () => {
    expect(sizesConflict(parseUnitSize("Kettle 1.5L"), parseUnitSize("Tumbler 32oz"))).toBe(false);
    expect(sizesConflict(parseUnitSize("Kettle 1.5L"), null)).toBe(false);
  });

  it("ignores bare 'in' and 'm' so prepositions are not sizes", () => {
    expect(parseUnitSize("Pack of 2 in Black")).toBeNull();
  });
});

describe("brandsConflict", () => {
  it("rejects two different brands", () => {
    expect(brandsConflict("Xiaomi Smart Band 9 NFC", "Samsung Galaxy Fit 3 Tracker")).toBe(true);
  });
  it("tolerates concatenation noise and brand-in-the-middle titles", () => {
    expect(
      brandsConflict(
        "BountyPaper Towels Quick Size, White, 2 Family Triple Rolls",
        "Paper Towels Quick Size, White, 16 Family Rolls",
      ),
    ).toBe(false);
    expect(
      brandsConflict("5Pcs Clear Straws for Hydrojug Traveler", "Hydrojug Traveler 32OZ Pink"),
    ).toBe(false);
  });
});

describe("model tokens", () => {
  it("rejects measurements as model numbers", () => {
    expect(isUnitToken("32oz")).toBe(true);
    expect(isUnitToken("1000")).toBe(false); // pure number, excluded by the letter rule
    expect(tokenize("HydroJug Traveler 32oz Tumbler").modelTokens.has("32oz")).toBe(false);
    expect(tokenize("Anker PowerCore 10000 Power Bank").modelTokens.has("10000")).toBe(false);
  });
  it("rejects ratings and standards as model numbers", () => {
    // Live failure: "ipx7" matched a $25 AUKEY earbud to a $120 generic earbud.
    for (const t of ["ipx7", "ip68", "usb3", "bt5.3", "1080p", "42db", "10000mah"]) {
      expect(isUnitToken(t)).toBe(true);
    }
    expect(
      tokenize("AUKEY EP-T27 Soundstream Wireless Earbuds IPX7").modelTokens.has("ipx7"),
    ).toBe(false);
  });
  it("still accepts real model codes", () => {
    expect(tokenize("Sony WH-1000XM5 Headphones").modelTokens.has("wh-1000xm5")).toBe(true);
    expect(tokenize("Midea Electric Kettle MK-SH15").modelTokens.has("mk-sh15")).toBe(true);
  });
});

// The two failure modes that produced every top-ranked "opportunity" in the
// live database before this change. Both must now be rejected outright.
describe("live regressions", () => {
  const STRAW = "5Pcs Clear Replacement Straws for Hydrojug Traveler (32oz)";
  const TUMBLER = "HydroJug Traveler 32oz, Insulated Tumbler with Handle & Straw";
  const ROLLS_2 = "BountyPaper Towels Quick Size, White, 2 Family Triple Rolls";
  const ROLLS_16 = "Paper Towels Quick Size, White, 16 Family Rolls = 40 Regular Rolls";

  it("rejects accessory vs product", () => {
    expect(incompatibleReason({ title: STRAW }, { title: TUMBLER })).toBe("accessory vs product");
  });

  it("rejects mismatched pack sizes", () => {
    expect(incompatibleReason({ title: ROLLS_2 }, { title: ROLLS_16 })).toContain("pack size");
  });

  it("rejects equal pack counts with different quantity equivalence", () => {
    // Both say "8", but 27 regular rolls is not 20 regular rolls.
    expect(
      incompatibleReason(
        { title: "BountyQuick-Size Paper Towels, White, 8 Family Triple Rolls = 27 Regular Rolls" },
        { title: "Bounty Quick-Size Paper Towels, White, 8 Family Rolls = 20 Regular Rolls" },
      ),
    ).toContain("quantity equivalence");
  });

  it("keeps genuinely identical multi-packs", () => {
    expect(
      incompatibleReason(
        { title: "BountyQuick-Size Paper Towels, White, 8 Family Triple Rolls = 27 Regular Rolls" },
        { title: "Bounty Quick-Size Paper Towels,White,8 Family Triple Rolls 27 Regular Rolls" },
      ),
    ).toBeNull();
  });

  it("rejects the AUKEY-vs-generic earbud pair that ipx7 used to join", () => {
    const pairs = generateCandidatePairs([
      {
        id: 1,
        platform: "EBAY",
        title: "AUKEY EP-T27 Soundstream Wireless Earbuds Noise Cancelling IPX7 - Black",
        priceCny: 180,
      },
      {
        id: 2,
        platform: "AMAZON",
        title:
          "Wireless Earbuds Bluetooth Headphones, 50H Playtime Ear Buds with Mic and LED Digital Display Charging Case, IPX7 Waterproof in-Ear Earphone",
        priceCny: 864,
      },
    ]);
    expect(pairs).toEqual([]);
  });

  it("keeps them out of candidate pairs entirely", () => {
    const pairs = generateCandidatePairs([
      { id: 1, platform: "AMAZON", title: STRAW, priceCny: 43.13 },
      { id: 2, platform: "EBAY", title: TUMBLER, priceCny: 540 },
      { id: 3, platform: "AMAZON", title: ROLLS_2, priceCny: 71.93 },
      { id: 4, platform: "EBAY", title: ROLLS_16, priceCny: 1036.73 },
    ]);
    expect(pairs).toEqual([]);
  });

  it("still pairs the genuine article across platforms", () => {
    const pairs = generateCandidatePairs([
      { id: 1, platform: "AMAZON", title: TUMBLER, priceCny: 214.13 },
      { id: 2, platform: "EBAY", title: "HydroJug Traveler 32oz Insulated Tumbler Handle Straw", priceCny: 320 },
    ]);
    expect(pairs.length).toBe(1);
    expect(pairs[0].buy.id).toBe(1);
  });
});

describe("per-unit price band", () => {
  it("compares packs on a per-unit basis", () => {
    // 6-pack at ¥60 (¥10/unit) vs single at ¥12 — a real 17% spread, not 80%.
    const pairs = generateCandidatePairs([
      { id: 1, platform: "ALIEXPRESS", title: "Silicone Kitchen Spatula, Pack of 6", priceCny: 60, packQty: 6 },
      { id: 2, platform: "AMAZON", title: "Silicone Kitchen Spatula", priceCny: 12, packQty: null },
    ]);
    expect(pairs.length).toBe(1);
    expect(pairs[0].buy.id).toBe(1); // ¥10/unit is the cheaper side
  });
});

describe("trade direction", () => {
  const BOTTLE = "Owala FreeSip Sway 32oz Insulated Stainless Steel Water Bottle";

  it("rejects a pair whose expensive side is a sourcing platform", () => {
    // Live data really did produce this: AliExpress prices Owala ABOVE Amazon,
    // so the ranker proposed buying on Amazon to sell on AliExpress.
    const pairs = generateCandidatePairs([
      { id: 1, platform: "AMAZON", title: BOTTLE, priceCny: 251 },
      { id: 2, platform: "ALIEXPRESS", title: BOTTLE, priceCny: 343 },
    ]);
    expect(pairs).toEqual([]);
  });

  it("keeps the pair when the resale venue is the expensive side", () => {
    const pairs = generateCandidatePairs([
      { id: 1, platform: "ALIEXPRESS", title: BOTTLE, priceCny: 120 },
      { id: 2, platform: "AMAZON", title: BOTTLE, priceCny: 251 },
    ]);
    expect(pairs.length).toBe(1);
    expect(pairs[0].buy.platform).toBe("ALIEXPRESS");
  });
});
