import { describe, expect, it } from "vitest";
import { affiliateUrl, clickIdFromSubId, subIdFor } from "../lib/affiliate";
import { commissionSourceRef, parseCommissionReport, parseCsv, reconcile } from "../lib/affiliate-reconcile";
import { saysGone, unreadableDetail } from "../lib/sources/detail";
import { CrawlError } from "../lib/sources/types";

describe("per-click sub-IDs", () => {
  it("round-trips and rejects foreign tags", () => {
    expect(subIdFor(42)).toBe("L42");
    expect(clickIdFromSubId("L42")).toBe(42);
    expect(clickIdFromSubId(" L7 ")).toBe(7);
    expect(clickIdFromSubId("someone-else")).toBeNull();
    expect(clickIdFromSubId("L")).toBeNull();
    expect(clickIdFromSubId(null)).toBeNull();
  });

  it("goes on the Amazon link as ascsubtag and on eBay as customid", () => {
    const a = affiliateUrl("AMAZON", "https://www.amazon.com/dp/X", { AMAZON_ASSOCIATE_TAG: "landed-20" }, "L9");
    expect(a.url).toContain("tag=landed-20");
    expect(a.url).toContain("ascsubtag=L9");
    const e = affiliateUrl("EBAY", "https://www.ebay.com/itm/1", { EBAY_EPN_CAMPAIGN_ID: "123" }, "L9");
    expect(e.url).toContain("customid=L9");
  });

  it("an untracked link never carries a sub-ID (nothing to reconcile)", () => {
    expect(affiliateUrl("AMAZON", "https://www.amazon.com/dp/X", {}, "L9").url).not.toContain("ascsubtag");
  });
});

describe("CSV parsing", () => {
  it("handles quotes, doubled quotes, embedded commas and CRLF", () => {
    expect(parseCsv('a,"b,c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ["a", "b,c", 'say "hi"'],
      ["1", "2", "3"],
    ]);
  });
});

const AMAZON = `Fee-Earnings report for landed-20
Category,Name,ASIN,Tracking ID,Sub Tag,Date Shipped,Price($),Items Shipped,Revenue($),Ad Fees($)
Electronics,"Buds, Pro",B0X,landed-20,L12,2026-09-01,99.00,1,99.00,3.96
Electronics,Cable,B0Y,landed-20,,2026-09-02,10.00,1,10.00,0.40
Electronics,Returned thing,B0Z,landed-20,L13,2026-09-03,20.00,1,-20.00,(0.80)
Total,,,,,,,,,4.36`;

describe("Amazon earnings report", () => {
  const { rows, errors } = parseCommissionReport("AMAZON", AMAZON);
  it("finds the header below a title line and skips the totals row", () => {
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
  });
  it("books earned rows, attributes by sub tag, reverses negatives", () => {
    expect(rows[0]).toMatchObject({ subId: "L12", clickId: 12, amount: 3.96, decision: "BOOK", currency: "USD" });
    expect(rows[1]).toMatchObject({ subId: null, clickId: null, decision: "BOOK" });
    expect(rows[2]).toMatchObject({ clickId: 13, amount: -0.8, decision: "REVERSE" });
  });
  it("row refs are stable across re-imports (idempotent booking)", () => {
    const again = parseCommissionReport("AMAZON", AMAZON).rows;
    expect(again.map((r) => r.externalRef)).toEqual(rows.map((r) => r.externalRef));
    expect(commissionSourceRef("AMAZON", rows[0].externalRef)).toMatch(/^affiliate:AMAZON:/);
  });
});

const EPN = `Event Date,Event Type,Custom ID,Item ID,Transaction ID,Earnings,Status
2026-09-05,Winning Bid (Revenue),L20,111,T1,1.50,Paid
2026-09-06,Winning Bid (Revenue),L21,112,T2,2.00,Pending
2026-09-07,Winning Bid (Revenue),L22,113,T3,0.90,Locked
2026-09-08,Return,L20,111,T4,-1.50,Reversed
2026-09-09,Winning Bid (Revenue),L23,114,T5,0.70,Under investigation`;

describe("eBay EPN report", () => {
  const { rows } = parseCommissionReport("EBAY", EPN);
  const s = reconcile(rows, new Set([20, 21, 22]));
  it("books only what the programme says is paid/locked", () => {
    expect(s.book.map((r) => r.externalRef)).toEqual(["T1", "T3"]);
  });
  it("pending and unrecognised statuses are shown, never booked", () => {
    expect(s.pending.map((r) => r.externalRef)).toEqual(["T2", "T5"]);
    expect(s.pending[1].reason).toContain("unrecognised");
  });
  it("reversals are separated", () => {
    expect(s.reverse.map((r) => r.externalRef)).toEqual(["T4"]);
  });
  it("flags a sub-ID that matches no click of ours", () => {
    expect(s.unknownClick.map((r) => r.clickId)).toEqual([23]);
  });
});

it("refuses a file with no commission column", () => {
  expect(parseCommissionReport("AMAZON", "a,b\n1,2").errors[0]).toMatch(/no commission/);
});

describe("detail pages: gone vs unreadable", () => {
  it("null only when the page says the item is gone", () => {
    expect(saysGone("Sorry, this item is no longer available!")).toBe(true);
    expect(saysGone("该商品已下柜，欢迎挑选其他商品")).toBe(true);
    expect(unreadableDetail("JD", "1", "商品已下架")).toBeNull();
  });
  it("throws on a page we could not read, so the offer is not delisted", () => {
    expect(() => unreadableDetail("AliExpress", "1", "Please slide to verify")).toThrow(CrawlError);
    expect(() => unreadableDetail("AliExpress", "1", null)).toThrow(/could not read/);
  });
});
