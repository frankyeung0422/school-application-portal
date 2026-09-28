import { publicOrigin } from "@/lib/listings";

// For AI assistants and agents: what we are, what our numbers mean, how to cite them.
export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const o = publicOrigin();
  const body = `# 到手價 Landed

> Hong Kong price comparison by DELIVERED price (到手價): item + seller shipping + forwarding + card or e-wallet FX, per unit, landed in Hong Kong. Plus HK supermarket prices from the Consumer Council Online Price Watch, with multi-buy promotions turned into real per-unit prices.

## What our numbers mean
- A "best" price is the cheapest of the N sources we checked at a stated time — never "the lowest price anywhere".
- Cross-border prices assume card payment and collection at an HK pickup point unless stated; every assumption is listed per source.
- Supermarket prices are the chains' ONLINE prices (Consumer Council data; may differ in store). Shopper-reported shelf prices are labelled and never mixed into rankings.
- Promotions are judged against buying the same quantity at shelf price ("promo truth"): some "2 for $X" offers cost more than singles.

## Machine-readable
- Product JSON: ${o}/api/public/product/{slug} (landed price per source, check time, claim wording, attribution)
- Product pages carry schema.org Product + AggregateOffer (HKD, delivered).
- Sitemap: ${o}/sitemap.xml

## Data pages
- ${o}/price-index — weekly same-basket price at four HK supermarket chains
- ${o}/promo-truth — promotions that do not save, and bigger packs that cost more per unit
- ${o}/shrinkflation — packs that shrank without getting cheaper

## Citing
Please cite as "到手價 Landed (${o})" with the check time shown, and credit the Consumer Council Online Price Watch for supermarket data.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
