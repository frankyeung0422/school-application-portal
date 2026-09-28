import { describe, expect, it } from "vitest";
import { parsePackQty, parseUnitSize } from "../lib/match/attributes";
import { cheapestPerUnit, unitPriceFromTitles, unitPriceOf } from "../lib/supermarket/unitprice";
import { parsePromo, promoVerdict } from "../lib/supermarket/promo";

describe("sizes in the supermarket feed", () => {
  it("reads Chinese units", () => {
    expect(parseUnitSize("維他奶 山水 鮮黑豆漿 - 低糖 236毫升")).toMatchObject({ value: 236, dim: "volume" });
    expect(parseUnitSize("美心 西餅 1公升")).toMatchObject({ value: 1000, dim: "volume" });
    expect(parseUnitSize("Meadows 幼滑花生醬 510克")).toMatchObject({ value: 510, dim: "mass" });
    expect(parseUnitSize("嘉頓 生命麵包 14片")).toMatchObject({ value: 14, dim: "count" });
  });
  it("handles the full-width digits the feed uses", () => {
    expect(parseUnitSize("Baker's Choice 切皮三文治方麥包６片裝")).toMatchObject({ value: 6, dim: "count" });
    expect(parsePackQty("出前一丁 ５包裝")).toBe(5);
  });
  it("reads English counts and gm/litre spellings", () => {
    expect(parseUnitSize("Garden Life Bread 14 slices")).toMatchObject({ value: 14, dim: "count" });
    expect(parseUnitSize("Meadows XTRA CREAMY PEANUT BUTTER 510GM")).toMatchObject({ value: 510, dim: "mass" });
    expect(parseUnitSize("Vita Lemon Tea 1 Litre")).toMatchObject({ value: 1000, dim: "volume" });
  });
  it("still refuses sizes that are really model numbers", () => {
    expect(parseUnitSize("iPhone 15 Pro 128GB")).toBeNull();
    expect(parseUnitSize("Xiaomi Smart Band 9 NFC")).toBeNull();
  });
});

describe("unit prices", () => {
  it("makes two pack sizes comparable", () => {
    const small = unitPriceFromTitles(600, "維他奶 鮮黑豆漿 236毫升");
    const large = unitPriceFromTitles(1300, "維他奶 鮮黑豆漿 946毫升");
    expect(small!.cents).toBe(254); // HK$2.54 per 100ml
    expect(large!.cents).toBe(137);
    expect(small!.labelZh).toBe("每 100 毫升");
    expect(large!.cents).toBeLessThan(small!.cents);
  });
  it("multiplies by the pack count for multi-packs", () => {
    // 250ml × 6 = 1.5L for HK$23 → HK$1.53 per 100ml
    expect(unitPriceFromTitles(2300, "維他奶 豆奶 250毫升 x 6")!.cents).toBe(153);
  });
  it("prices countable goods per piece and never double-counts", () => {
    expect(unitPriceFromTitles(1350, "嘉頓 生命麵包 14片")).toMatchObject({ cents: 96, labelZh: "每件" });
  });
  it("says nothing when no size can be read", () => {
    expect(unitPriceFromTitles(1000, "某牌 神秘產品")).toBeNull();
    expect(unitPriceOf(1000, { value: 10, dim: "length", label: "10mm" }, null)).toBeNull();
    expect(unitPriceOf(0, { value: 100, dim: "mass", label: "100g" }, null)).toBeNull();
  });
  it("picks the cheapest row that has a unit price", () => {
    const rows = [
      { unit: unitPriceFromTitles(600, "X 236毫升") },
      { unit: null },
      { unit: unitPriceFromTitles(1300, "X 946毫升") },
    ];
    expect(cheapestPerUnit(rows)).toBe(rows[2]);
    expect(cheapestPerUnit([{ unit: null }])).toBeNull();
  });
});

describe("promoVerdict", () => {
  it("calls out a promotion that costs more than buying singles", () => {
    // Real feed case: 「買2件$14.00」 on a $6.90 shelf price.
    const v = promoVerdict(690, parsePromo("2 for $14.00"))!;
    expect(v.kind).toBe("WORSE");
    expect(v.savingCents).toBe(-20);
    expect(v.qty).toBe(2);
  });
  it("confirms a real deal and reports the saving", () => {
    const v = promoVerdict(690, parsePromo("Buy 3 at $13.90"))!;
    expect(v.kind).toBe("BETTER");
    expect(v.savingCents).toBe(690 * 3 - 1390);
  });
  it("handles buy-one-get-one and nth-item deals", () => {
    expect(promoVerdict(1000, parsePromo("Buy 1 Get 1 Free"))!.savingCents).toBe(1000);
    expect(promoVerdict(1000, parsePromo("Buy 2nd at half price"))!.savingCents).toBe(500);
  });
  it("reports the best rule when several are attached", () => {
    const v = promoVerdict(1000, [...parsePromo("2 for $14.00"), ...parsePromo("10% OFF")])!;
    expect(v.kind).toBe("BETTER");
    expect(v.savingCents).toBe(600); // the bundle, not the 10%
  });
  it("returns nothing without a promotion", () => {
    expect(promoVerdict(1000, [])).toBeNull();
  });
});
