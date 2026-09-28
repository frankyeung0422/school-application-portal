import { describe, expect, it } from "vitest";
import { authorizationPlan, buildLadder, canUnlock, settleUnlock, tierFor, type LadderStep } from "../lib/pools";
import { clusterOffers } from "../lib/match/cluster";

const ladder: LadderStep[] = [
  { minQty: 10, unitHkdCents: 18000 },
  { minQty: 50, unitHkdCents: 16500 },
];

describe("tierFor", () => {
  it("locked below the first rung shows how many are needed", () => {
    const t = tierFor(7, ladder);
    expect(t.unlocked).toBe(false);
    expect(t.next).toEqual({ minQty: 10, unitHkdCents: 18000, needed: 3 });
  });
  it("unlocks at the rung and points at the next one", () => {
    const t = tierFor(12, ladder);
    expect(t.unlocked).toBe(true);
    expect(t.unitHkdCents).toBe(18000);
    expect(t.next?.needed).toBe(38);
    expect(tierFor(60, ladder).next).toBeNull();
  });
});

describe("canUnlock", () => {
  const now = new Date("2026-09-15T00:00:00Z");
  it("unlocks when the first tier is met", () => {
    expect(canUnlock({ status: "OPEN", committedQty: 10, ladder, deadline: new Date("2026-09-20") }, now).ok).toBe(true);
  });
  it("expires below tier after the deadline — nobody is charged", () => {
    const r = canUnlock({ status: "OPEN", committedQty: 9, ladder, deadline: new Date("2026-09-14") }, now);
    expect(r.ok).toBe(false);
    expect(r.expired).toBe(true);
  });
  it("only OPEN pools unlock", () => {
    expect(canUnlock({ status: "UNLOCKED", committedQty: 99, ladder, deadline: new Date("2026-09-20") }, now).ok).toBe(false);
  });
});

describe("settleUnlock", () => {
  const commits = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, qty: 1, maxUnitHkdCents: 19000 }));

  it("never holds more than a buyer agreed to", () => {
    const plan = authorizationPlan([{ id: 1, qty: 2, maxUnitHkdCents: 17000 }, ...commits.slice(1, 10)], ladder);
    expect(plan.holds.find((h) => h.id === 1)!.amountCents).toBe(34000);
    expect(plan.holds.every((h) => h.unitHkdCents <= 18000)).toBe(true);
  });

  it("captures everything when all authorize", () => {
    const auth = Object.fromEntries(commits.map((c) => [c.id, "AUTHORIZED" as const]));
    const r = settleUnlock(commits, auth, ladder, 0);
    expect(r.decision).toBe("CAPTURE_ALL");
    expect(r.captures).toHaveLength(12);
    expect(r.captures.every((c) => c.amountCents === 18000)).toBe(true);
  });

  it("voids every hold when declines drop below the first tier", () => {
    const auth = Object.fromEntries(commits.map((c) => [c.id, (c.id <= 9 ? "AUTHORIZED" : "DECLINED") as "AUTHORIZED" | "DECLINED"]));
    const r = settleUnlock(commits, auth, ladder, 100000);
    expect(r.decision).toBe("VOID_ALL");
    expect(r.captures).toEqual([]);
    expect(r.voids).toHaveLength(9);
  });

  it("declines that drop a tier are absorbed within budget, voided beyond it", () => {
    const big = Array.from({ length: 52 }, (_, i) => ({ id: i + 1, qty: 1, maxUnitHkdCents: 19000 }));
    const auth = Object.fromEntries(big.map((c) => [c.id, (c.id <= 48 ? "AUTHORIZED" : "DECLINED") as "AUTHORIZED" | "DECLINED"]));
    // Holds at 16500 (52 committed), but 48 authorized earns only the 18000 rung.
    const within = settleUnlock(big, auth, ladder, 1_000_000);
    expect(within.decision).toBe("CAPTURE_ABSORB");
    expect(within.absorbCents).toBe((18000 - 16500) * 48);
    expect(within.captures.every((c) => c.amountCents === 16500)).toBe(true);
    const beyond = settleUnlock(big, auth, ladder, 1000);
    expect(beyond.decision).toBe("VOID_ALL");
  });
});

describe("buildLadder", () => {
  it("builds a strictly cheaper ladder from supplier tiers", () => {
    const { ladder: l, singleUnitHkdCents } = buildLadder({
      price: 145,
      currency: "CNY",
      priceTiers: [
        { minQty: 2, price: 145 },
        { minQty: 10, price: 138 },
        { minQty: 50, price: 129 },
      ],
      moq: 2,
      packQty: 1,
      weightKg: 0.1,
      profile: {
        platform: "ALI1688",
        currency: "CNY",
        shipToHkHkd: 0,
        freeShipOverNative: null,
        domesticShipNative: 10,
        viaForwarder: true,
        forwarderPerKgHkd: 20,
        forwarderMinHkd: 18,
        assumedWeightKg: 0.5,
        cardFxMarkupPct: 0.02,
        paymentFeePct: 0,
        importDutyPct: 0,
      },
      mids: { CNY: 1.08 },
      rail: { name: "AIRWALLEX", bps: 50, minFeeHkdCents: 0 },
      targetMarginPct: 0.1,
    });
    expect(l.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < l.length; i++) expect(l[i].unitHkdCents).toBeLessThan(l[i - 1].unitHkdCents);
    expect(l[0].unitHkdCents).toBeLessThan(singleUnitHkdCents);
  });
});

describe("clusterOffers", () => {
  it("anchors membership so one weak chain cannot glue two products", () => {
    // 1≈2 strong, 2≈3 strong, but 1 and 3 have no direct edge.
    const clusters = clusterOffers([1, 2, 3], [
      { a: 1, b: 2, confidence: 0.9 },
      { a: 2, b: 3, confidence: 0.8 },
    ]);
    // 2 is the strongest hub, so it anchors and both join directly.
    expect(clusters).toHaveLength(1);
    expect(clusters[0].anchor).toBe(2);

    const split = clusterOffers([1, 2, 3, 4], [
      { a: 1, b: 2, confidence: 0.9 },
      { a: 3, b: 4, confidence: 0.9 },
      { a: 2, b: 3, confidence: 0.61 },
    ]);
    // 2 and 3 anchor-tie; whichever anchors, the far end of the other pair is not directly linked.
    const sizes = split.map((c) => c.members.length).sort();
    expect(sizes).not.toEqual([4]);
  });
  it("ignores weak edges and keeps singletons", () => {
    const clusters = clusterOffers([1, 2], [{ a: 1, b: 2, confidence: 0.4 }]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].members[0].confidence).toBe(1);
  });
});
