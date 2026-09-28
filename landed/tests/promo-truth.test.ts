import { describe, expect, it } from "vitest";
import { familyKey, packTraps, promoTruth, TRUTH_TEXT, type PackRow } from "../lib/supermarket/promo-truth";
import { parsePromo, promoVerdict } from "../lib/supermarket/promo";

describe("promo truth", () => {
  it("a 'deal' dearer than singles is FAKE", () => {
    // Live feed case: 「買2件$14.00」 on a $6.90 item.
    const t = promoTruth(promoVerdict(690, parsePromo("2 for $14.00")))!;
    expect(t.label).toBe("FAKE");
    expect(TRUTH_TEXT.FAKE(t)).toContain("假優惠");
  });

  it("states the real % off of a multi-buy", () => {
    const t = promoTruth(promoVerdict(2400, parsePromo("2 for $38.00")))!;
    expect(t.label).toBe("REAL");
    expect(t.pctOff).toBeCloseTo((4800 - 3800) / 4800);
    expect(TRUTH_TEXT.REAL(t)).toBe("實際折扣 21%");
  });

  it("a promo under 5% off is WEAK, not a deal", () => {
    const t = promoTruth(promoVerdict(1000, parsePromo("2 for $19.50")))!;
    expect(t.label).toBe("WEAK");
  });

  it("no promotion, no verdict", () => {
    expect(promoTruth(null)).toBeNull();
  });
});

describe("product families", () => {
  it("strips sizes and counts so pack variants share a key", () => {
    expect(familyKey("Vitasoy", "Vitasoy Soya Milk 250ml x 6")).toBe(familyKey("Vitasoy", "Vitasoy Soya Milk 1L"));
    expect(familyKey("維他奶", "維他奶 豆奶 250毫升 x 6")).toBe(familyKey("維他奶", "維他奶 豆奶 1公升"));
  });

  it("keeps different products apart", () => {
    expect(familyKey("Vitasoy", "Vitasoy Soya Milk Low Sugar 250ml")).not.toBe(familyKey("Vitasoy", "Vitasoy Soya Milk 250ml"));
    expect(familyKey("A", "Soy Sauce 500ml")).not.toBe(familyKey("B", "Soy Sauce 500ml"));
  });
});

const row = (over: Partial<PackRow>): PackRow => ({
  productId: 1,
  title: "x",
  slug: "x",
  chain: "WELLCOME",
  family: "f",
  dim: "volume",
  totalUnits: 500,
  unitCents: 400,
  shelfCents: 2000,
  ...over,
});

describe("pack-size traps", () => {
  it("flags a bigger pack that costs more per unit at the same chain", () => {
    const traps = packTraps([row({ productId: 1, totalUnits: 500, unitCents: 400 }), row({ productId: 2, totalUnits: 1000, unitCents: 540 })]);
    expect(traps).toHaveLength(1);
    expect(traps[0].big.productId).toBe(2);
    expect(traps[0].dearerBy).toBeCloseTo(0.35);
  });

  it("the normal case (bigger is cheaper per unit) is not a trap", () => {
    expect(packTraps([row({ productId: 1, totalUnits: 500, unitCents: 400 }), row({ productId: 2, totalUnits: 1000, unitCents: 350 })])).toEqual([]);
  });

  it("never compares across chains, families or dimensions, nor a relabel", () => {
    expect(packTraps([row({ productId: 1 }), row({ productId: 2, chain: "AEON", totalUnits: 1000, unitCents: 999 })])).toEqual([]);
    expect(packTraps([row({ productId: 1 }), row({ productId: 2, family: "g", totalUnits: 1000, unitCents: 999 })])).toEqual([]);
    expect(packTraps([row({ productId: 1 }), row({ productId: 2, dim: "mass", totalUnits: 1000, unitCents: 999 })])).toEqual([]);
    expect(packTraps([row({ productId: 1, totalUnits: 500 }), row({ productId: 2, totalUnits: 550, unitCents: 999 })])).toEqual([]);
  });
});
