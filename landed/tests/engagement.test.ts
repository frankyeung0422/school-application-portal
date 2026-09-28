import { describe, expect, it } from "vitest";
import { dailySessions, funnel, isBot, normalisePath, refHostOf, returnRate, type EventRow } from "../lib/analytics";
import { composeDigest, digestDue } from "../lib/digest";
import { newPromos, promoKey, type PromoRow } from "../lib/supermarket/promo-watch";
import { comparisonTally, median } from "../lib/tally";
import { leaderboard, maskEmail } from "../lib/instore/leaderboard";
import { pushToken, verifyPushToken, firstUrl } from "../lib/push";
import { lintClaims } from "../lib/claims";
import type { BasketComparison } from "../lib/supermarket/basket";

const d = (iso: string) => new Date(iso);
const ev = (sessionId: string, path: string, at: string, event = "view"): EventRow => ({ sessionId, path, event, createdAt: d(at) });

describe("analytics", () => {
  it("drops bots, query strings, admin paths and full referrer URLs", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(false);
    expect(normalisePath("/search?q=secret")).toBe("/search");
    expect(normalisePath("/admin/jobs")).toBeNull();
    expect(normalisePath("/p/x/")).toBe("/p/x");
    expect(refHostOf("https://www.google.com/search?q=airpods", "buycheap.aihkexam.com")).toBe("www.google.com");
    expect(refHostOf("https://buycheap.aihkexam.com/p/x", "buycheap.aihkexam.com")).toBeNull();
  });

  const events = [
    ev("a", "/", "2026-09-01T02:00:00Z"),
    ev("a", "/search", "2026-09-01T02:01:00Z", "search"),
    ev("a", "/p/kettle", "2026-09-01T02:02:00Z"),
    ev("a", "/p/kettle", "2026-09-01T02:03:00Z", "watch"),
    ev("a", "/", "2026-09-04T02:00:00Z"), // came back day 3
    ev("b", "/", "2026-09-02T02:00:00Z"),
    ev("c", "/supermarket", "2026-09-20T02:00:00Z"), // outside cohort
  ];

  it("funnel counts sessions per step, click-outs from affiliate sessions", () => {
    expect(funnel(events, new Set(["a", "zzz"]))).toEqual({ sessions: 3, searched: 1, viewedProduct: 1, clickedOut: 1, watched: 1 });
  });

  it("return rate is by HK day, within the window, for the cohort only", () => {
    expect(returnRate(events, d("2026-09-01T00:00:00Z"), 7, 7)).toEqual({ cohort: 2, returned: 1, rate: 0.5 });
    expect(returnRate(events, d("2026-09-01T00:00:00Z"), 7, 1).returned).toBe(0);
  });

  it("daily sessions are distinct per day", () => {
    expect(dailySessions(events)[0]).toEqual({ day: "2026-09-01", sessions: 1 });
  });
});

const comparison = (over: Partial<BasketComparison> = {}): BasketComparison => ({
  stores: [
    { retailer: "WELLCOME", itemsCents: 10000, deliveryCents: 0, totalCents: 10000, promoSavingCents: 0, missing: [], lines: [{ productId: 1, qty: 1, costCents: 10000 }] },
    { retailer: "AEON", itemsCents: 11000, deliveryCents: 0, totalCents: 11000, promoSavingCents: 0, missing: [], lines: [{ productId: 1, qty: 1, costCents: 11000 }] },
  ],
  bestSingle: { retailer: "WELLCOME", itemsCents: 10000, deliveryCents: 0, totalCents: 10000, promoSavingCents: 0, missing: [], lines: [] },
  split: {
    totalCents: 9500,
    itemsCents: 9500,
    deliveryCents: 0,
    stores: ["WELLCOME", "AEON"],
    lines: [{ productId: 1, retailer: "AEON", qty: 1, costCents: 9500 }],
    unavailable: [],
  },
  splitSavesCents: 500,
  ...over,
});

describe("weekly digest", () => {
  const base = {
    chainName: (c: string) => c,
    onPromo: [{ title: "維他奶", chain: "WELLCOME", promo: "買2件$20" }],
    shrank: [{ title: "薯片", from: "184g", to: "170g" }],
    lastWeekBestCents: 9800,
    basketUrl: "https://x/basket",
    unsubscribeUrl: "https://x/u",
  };

  it("leads with this week's best, split saving, promos, shrink and week change", () => {
    const out = composeDigest({ ...base, comparison: comparison() })!;
    expect(out.bestCents).toBe(9500);
    expect(out.subject).toContain("HK$95");
    expect(out.body).toContain("WELLCOME HK$100");
    expect(out.body).toContain("再慳 HK$5");
    expect(out.body).toContain("平咗 HK$3");
    expect(out.body).toContain("買2件$20");
    expect(out.body).toContain("184g → 170g");
    expect(out.body).toContain("https://x/u");
  });

  it("passes the claims lint", () => {
    const out = composeDigest({ ...base, comparison: comparison() })!;
    expect(lintClaims(out.subject + out.body)).toEqual([]);
  });

  it("sends nothing for a basket with no priced lines", () => {
    const empty = comparison({ bestSingle: null, split: { totalCents: 0, itemsCents: 0, deliveryCents: 0, stores: [], lines: [], unavailable: [] } });
    expect(composeDigest({ ...base, comparison: empty })).toBeNull();
  });

  it("is weekly, with slack for an hourly scheduler", () => {
    const now = d("2026-09-24T10:00:00Z");
    expect(digestDue(null, now)).toBe(true);
    expect(digestDue(d("2026-09-17T10:30:00Z"), now)).toBe(true);
    expect(digestDue(d("2026-09-20T10:00:00Z"), now)).toBe(false);
  });
});

describe("promo watch", () => {
  const rows: PromoRow[] = [
    { retailer: "WELLCOME", inStock: true, promo: "買2件$20", dealUnitCents: 1000 },
    { retailer: "AEON", inStock: true, promo: "會員價", dealUnitCents: null }, // does not beat singles
    { retailer: "JASONS", inStock: false, promo: "買3件$25", dealUnitCents: 833 }, // out of stock
  ];

  it("only counts in-stock promos that beat buying singles", () => {
    expect(promoKey(rows)).toBe("WELLCOME:買2件$20");
  });

  it("announces a promo once, and again only after it ended and restarted", () => {
    expect(newPromos(null, rows).map((r) => r.retailer)).toEqual(["WELLCOME"]);
    expect(newPromos("WELLCOME:買2件$20", rows)).toEqual([]);
    const withNew = [...rows, { retailer: "PARKNSHOP", inStock: true, promo: "第二件半價", dealUnitCents: 750 }];
    expect(newPromos("WELLCOME:買2件$20", withNew).map((r) => r.retailer)).toEqual(["PARKNSHOP"]);
    expect(newPromos("", rows).length).toBe(1);
  });
});

describe("comparison tally", () => {
  it("medians and never counts a dearer pick as below typical", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([100, 200])).toBe(150);
    expect(median([])).toBeNull();
    expect(
      comparisonTally([
        { landedHkdCents: 900, medianHkdCents: 1000 },
        { landedHkdCents: 1200, medianHkdCents: 1000 },
        { landedHkdCents: 500, medianHkdCents: null },
      ]),
    ).toEqual({ comparisons: 3, belowTypical: 1, belowTypicalCents: 100 });
  });
});

describe("price detectives", () => {
  it("groups by email else key, masks, and badges at five", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => ({ reporterKey: "k1", reporterEmail: "Chan.TaiMan@gmail.com" })),
      { reporterKey: "k9", reporterEmail: "chan.taiman@gmail.com" },
      { reporterKey: "abcdef", reporterEmail: null },
    ];
    const b = leaderboard(rows);
    expect(b[0]).toEqual({ handle: "ch***@gmail", approved: 6, detective: true });
    expect(b[1]).toEqual({ handle: "匿名偵探 #abcd", approved: 1, detective: false });
    expect(maskEmail("x")).toBe("匿名");
  });
});

describe("push", () => {
  it("a push token proves this browser just set an alert for that email", () => {
    const t = pushToken("a@b.com", 1_000_000);
    expect(verifyPushToken("A@B.com", t, 1_000_000 + 60_000)).toBe(true);
    expect(verifyPushToken("other@b.com", t, 1_000_000 + 60_000)).toBe(false);
    expect(verifyPushToken("a@b.com", t, 1_000_000 + 31 * 60_000)).toBe(false);
    expect(verifyPushToken("a@b.com", "garbage", 1_000_000)).toBe(false);
  });

  it("the notification opens the alert's first link", () => {
    expect(firstUrl("drop!\nhttps://x.com/p/a\n\nUnsubscribe: https://x.com/u")).toBe("https://x.com/p/a");
  });
});
