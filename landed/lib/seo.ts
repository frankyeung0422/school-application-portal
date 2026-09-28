// Search-engine surface for product pages. Pure; tests/seo.test.ts.
//
// Structured data is a claim too: lowPrice is the cheapest DELIVERED price of
// the sources we checked, stated in HKD, with the check time. The description
// uses the same substantiated wording as the page (cheapestClaim).

import { cheapestClaim, lintClaims } from "./claims";

export interface SeoOffer {
  /** Delivered-to-HK price per unit, HKD cents. */
  landedHkdCents: number;
  inStock: boolean;
}

export interface SeoProduct {
  title: string;
  brand: string | null;
  imageUrl: string | null;
  url: string;
  offers: SeoOffer[];
  checkedAt: Date | null;
}

const money = (cents: number) => (cents / 100).toFixed(2);

/** schema.org Product + AggregateOffer; null when there is no in-stock price to state. */
export function productJsonLd(p: SeoProduct): Record<string, unknown> | null {
  const prices = p.offers.filter((o) => o.inStock && o.landedHkdCents > 0).map((o) => o.landedHkdCents);
  if (!prices.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title.slice(0, 150),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.imageUrl ? { image: [p.imageUrl] } : {}),
    url: p.url,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "HKD",
      lowPrice: money(Math.min(...prices)),
      highPrice: money(Math.max(...prices)),
      offerCount: prices.length,
      availability: "https://schema.org/InStock",
      // No priceValidUntil: we never promise a price holds; it is what we saw at the check time.
    },
  };
}

/** Safe to inline in <script type="application/ld+json">: no `</script>` breakout. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productMeta(p: { title: string; bestHkdCents: number | null; sourceCount: number; checkedAt: Date | null }): {
  title: string;
  description: string;
} {
  const short = p.title.length > 60 ? `${p.title.slice(0, 57)}…` : p.title;
  if (p.bestHkdCents == null || !p.checkedAt || p.sourceCount < 1) {
    return {
      title: `${short} 到手價比較 | 到手價 Landed`,
      description: `${p.title} — 比較送到香港嘅到手價（運費、轉運、信用卡匯率全計）。Compare the delivered-to-Hong-Kong price.`,
    };
  }
  const price = `HK$${money(p.bestHkdCents).replace(/\.00$/, "")}`;
  const description = `${p.title}：到手價 ${price} — ${cheapestClaim(p.sourceCount, p.checkedAt)}。運費、轉運、信用卡匯率全計。`;
  // A seller's title can itself carry a banned claim ("100% authentic"): then we do not repeat it.
  if (lintClaims(p.title).length) {
    return { title: `到手價 ${price} | 到手價 Landed`, description: `到手價 ${price} — ${cheapestClaim(p.sourceCount, p.checkedAt)}。` };
  }
  return { title: `${short} 到手價 ${price} | 到手價 Landed`, description: description.slice(0, 300) };
}
