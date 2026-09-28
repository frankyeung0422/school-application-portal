import { describe, expect, it } from "vitest";
import { jsonLdScript, productJsonLd, productMeta } from "../lib/seo";
import { lintClaims } from "../lib/claims";

const at = new Date("2026-09-24T06:30:00Z"); // 14:30 HKT

describe("product structured data", () => {
  const ld = productJsonLd({
    title: "Midea kettle 1.5L",
    brand: "Midea",
    imageUrl: "https://img/x.jpg",
    url: "https://buycheap.aihkexam.com/p/midea",
    checkedAt: at,
    offers: [
      { landedHkdCents: 25900, inStock: true },
      { landedHkdCents: 31950, inStock: true },
      { landedHkdCents: 9900, inStock: false }, // gone: never the low price
    ],
  })!;

  it("states delivered HKD low/high over in-stock offers only", () => {
    const offers = ld.offers as Record<string, unknown>;
    expect(offers).toMatchObject({ "@type": "AggregateOffer", priceCurrency: "HKD", lowPrice: "259.00", highPrice: "319.50", offerCount: 2 });
  });

  it("never promises the price holds", () => {
    expect(JSON.stringify(ld)).not.toContain("priceValidUntil");
  });

  it("says nothing when nothing is in stock", () => {
    expect(productJsonLd({ title: "x", brand: null, imageUrl: null, url: "u", checkedAt: at, offers: [{ landedHkdCents: 100, inStock: false }] })).toBeNull();
  });

  it("cannot break out of its script tag", () => {
    expect(jsonLdScript({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("product meta", () => {
  it("uses the substantiated claim and passes the claims lint", () => {
    const m = productMeta({ title: "Midea kettle 1.5L", bestHkdCents: 25900, sourceCount: 5, checkedAt: at });
    expect(m.title).toContain("HK$259");
    expect(m.description).toContain("14:30");
    expect(m.description).toContain("5");
    expect(lintClaims(m.description)).toEqual([]);
  });

  it("does not repeat a seller title that carries a banned claim", () => {
    const m = productMeta({ title: "100% authentic Rolex", bestHkdCents: 100, sourceCount: 2, checkedAt: at });
    expect(m.description).not.toContain("authentic");
    expect(lintClaims(m.title + m.description)).toEqual([]);
  });

  it("falls back to a generic line with no price", () => {
    expect(productMeta({ title: "x", bestHkdCents: null, sourceCount: 0, checkedAt: null }).title).toContain("到手價比較");
  });
});
