import { describe, expect, it } from "vitest";
import { chooseIndexBasket, hkWeekStart, weekChange, weeklyIndex, type PricePoint } from "../lib/supermarket/basket-index";

const CORE = ["A", "B"];

describe("choosing the index basket", () => {
  it("keeps only items every core chain sells, capped per category, stable order", () => {
    const basket = chooseIndexBasket(
      [
        { productId: 5, category: "milk", chains: ["A", "B", "C"] },
        { productId: 3, category: "milk", chains: ["A", "B"] },
        { productId: 9, category: "milk", chains: ["A", "B"] },
        { productId: 1, category: "rice", chains: ["A"] }, // not everywhere
        { productId: 7, category: null, chains: ["B", "A"] },
      ],
      CORE,
      10,
      2,
    );
    expect(basket).toEqual([3, 5, 7]); // milk capped at 2 (5 first: more chains, then 3 by id)
  });
});

describe("weekly index", () => {
  const pts = (week: string, chain: string, entries: [number, number[]][]): PricePoint[] =>
    entries.flatMap(([productId, days]) => days.map((cents) => ({ productId, chain, week, cents })));

  const points = [
    ...pts("2026-09-14", "A", [[1, [1000, 1000]], [2, [500]]]),
    ...pts("2026-09-14", "B", [[1, [900]], [2, [700]]]),
    ...pts("2026-09-21", "A", [[1, [1000, 1100, 99999]], [2, [500]]]), // one-day glitch
    ...pts("2026-09-21", "B", [[1, [900]]]), // missing item 2
  ];
  const weeks = weeklyIndex([1, 2], points, CORE);

  it("totals complete chains and names the cheapest", () => {
    expect(weeks[0].chains.find((c) => c.chain === "A")!.totalCents).toBe(1500);
    expect(weeks[0].chains.find((c) => c.chain === "B")!.totalCents).toBe(1600);
    expect(weeks[0].cheapest).toBe("A");
    expect(weeks[0].spreadCents).toBe(100);
  });

  it("uses the median day, so one glitch cannot move the index", () => {
    expect(weeks[1].chains.find((c) => c.chain === "A")!.totalCents).toBe(1100 + 500);
  });

  it("a chain missing a basket item is not ranked that week", () => {
    const b = weeks[1].chains.find((c) => c.chain === "B")!;
    expect(b.totalCents).toBeNull();
    expect(b.priced).toBe(1);
    expect(weeks[1].cheapest).toBe("A");
    expect(weeks[1].spreadCents).toBeNull();
  });

  it("week-over-week change only between complete weeks", () => {
    expect(weekChange(weeks, "A")).toBeCloseTo(100 / 1500);
    expect(weekChange(weeks, "B")).toBeNull();
  });
});

it("weeks start on Monday, Hong Kong time", () => {
  expect(hkWeekStart(new Date("2026-09-24T11:00:00Z"))).toBe("2026-09-21"); // Thu
  expect(hkWeekStart(new Date("2026-09-20T17:00:00Z"))).toBe("2026-09-21"); // Mon 01:00 HKT
  expect(hkWeekStart(new Date("2026-09-20T15:00:00Z"))).toBe("2026-09-14"); // Sun 23:00 HKT
});
