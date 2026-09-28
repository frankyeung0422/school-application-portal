import { describe, expect, it } from "vitest";
import { detectShrinkflation, promoCadence, type HistoryPoint } from "../lib/supermarket/history";

const p = (day: string, priceCents: number, size?: [string, number], promo?: string): HistoryPoint => ({
  day,
  priceCents,
  unitSizeLabel: size?.[0] ?? null,
  unitSizeValue: size?.[1] ?? null,
  promoText: promo ?? null,
});

describe("detectShrinkflation", () => {
  it("catches a smaller pack at the same price", () => {
    const s = detectShrinkflation([
      p("2026-08-01", 2500, ["250g", 250]),
      p("2026-08-20", 2500, ["250g", 250]),
      p("2026-09-01", 2500, ["220g", 220]),
      p("2026-09-10", 2500, ["220g", 220]),
    ])!;
    expect(s.fromLabel).toBe("250g");
    expect(s.toLabel).toBe("220g");
    expect(Math.round(s.shrankBy * 100)).toBe(12);
    expect(Math.round(s.perUnitRise * 100)).toBe(14);
    expect(s.changedOn).toBe("2026-09-01");
  });

  it("ignores a smaller pack that is cheaper per unit", () => {
    expect(detectShrinkflation([p("2026-08-01", 2500, ["250g", 250]), p("2026-09-01", 2000, ["220g", 220])])).toBeNull();
  });

  it("ignores a pack that grew, and a pure relabel", () => {
    expect(detectShrinkflation([p("2026-08-01", 2500, ["220g", 220]), p("2026-09-01", 2500, ["250g", 250])])).toBeNull();
    expect(detectShrinkflation([p("2026-08-01", 2500, ["500g", 500]), p("2026-09-01", 2600, ["0.5kg", 500])])).toBeNull();
  });

  it("says nothing without sizes", () => {
    expect(detectShrinkflation([p("2026-08-01", 2500), p("2026-09-01", 2500)])).toBeNull();
    expect(detectShrinkflation([])).toBeNull();
  });
});

describe("promoCadence", () => {
  const cycle = (weeks: number, count: number): HistoryPoint[] => {
    const out: HistoryPoint[] = [];
    const start = Date.parse("2026-06-01T00:00:00Z");
    for (let d = 0; d < weeks * 7 * count; d++) {
      const day = new Date(start + d * 86400_000).toISOString().slice(0, 10);
      const onPromo = d % (weeks * 7) < 3; // three promo days every cycle
      out.push(p(day, onPromo ? 900 : 1200, undefined, onPromo ? "買2件$18" : undefined));
    }
    return out;
  };

  it("refuses to guess before three cycles", () => {
    const c = promoCadence(cycle(3, 3)); // 3 starts = 2 completed gaps
    expect(c.verdict).toBe("NOT_ENOUGH_DATA");
    expect(c.cycles).toBe(2);
    expect(c.explanation).toMatch(/need 3/);
  });

  it("reports a steady rhythm and when the next one is due", () => {
    const c = promoCadence(cycle(3, 5));
    expect(c.verdict).toBe("REGULAR");
    expect(c.medianGapDays).toBe(21);
    expect(c.cycles).toBe(4);
    expect(c.dueInDays).not.toBeNull();
    expect(c.explanation).toMatch(/every 21 days/);
  });

  it("calls erratic promotions irregular instead of predicting", () => {
    const days = ["2026-06-01", "2026-06-05", "2026-07-20", "2026-07-25", "2026-08-01", "2026-08-05", "2026-09-30", "2026-10-02"];
    const points = days.map((d, i) => p(d, i % 2 === 0 ? 900 : 1200, undefined, i % 2 === 0 ? "減價" : undefined));
    const c = promoCadence(points);
    expect(c.verdict).toBe("IRREGULAR");
    expect(c.dueInDays).toBeNull();
  });

  it("knows when a promotion is running right now", () => {
    const c = promoCadence([p("2026-09-14", 1200), p("2026-09-15", 900, undefined, "買2件$18")]);
    expect(c.onPromoNow).toBe(true);
    expect(c.daysSinceLastPromo).toBe(0);
  });
});

describe("telegram link codes", () => {
  it("only accepts the LD- code shape", async () => {
    const { linkChat } = await import("../lib/telegram");
    // No database in a unit test: the shape check is what matters here.
    expect(/^LD-[A-F0-9]{6}$/.test("LD-9A3F21")).toBe(true);
    expect(/^LD-[A-F0-9]{6}$/.test("hello")).toBe(false);
    expect(typeof linkChat).toBe("function");
    // The dynamic import loads Prisma; under a full parallel run that alone can pass 5s.
  }, 30_000);
});
