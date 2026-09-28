import { prisma } from "../prisma";
import { loadMids, loadProfiles } from "../settings";
import { quoteOffer } from "../catalog";
import { detectLuxury } from "./brands";
import { counterfeitCheck } from "./risk";
import { officialHkPrices } from "../official/view";

// Screens luxury listings for counterfeits and hides the ones that cannot be
// genuine. Runs after clustering/pricing and as a standalone job, so a newly
// captured official price re-judges everything that references it.

export async function screenLuxuryOffers(productIds?: number[]) {
  const products = await prisma.product.findMany({
    where: { segment: "LUXURY", ...(productIds?.length ? { id: { in: productIds } } : {}) },
    include: { offers: true },
  });
  const [profiles, { mids }] = await Promise.all([loadProfiles(), loadMids()]);
  const refs = products.map((p) => p.officialRef).filter((r): r is string => Boolean(r));
  const official = await officialHkPrices([...new Set(refs)]);

  let flagged = 0;
  let cleared = 0;
  const examples: string[] = [];

  for (const product of products) {
    const category = detectLuxury(product.title)?.category ?? "ACCESSORY";
    const officialHk = product.officialRef ? (official.get(product.officialRef) ?? null) : null;
    for (const offer of product.offers) {
      // A human decision always wins over the heuristic.
      if (offer.clearedBy) continue;
      const landed = quoteOffer(offer, 1, { kind: "CARD" }, profiles, mids);
      if (!landed) continue;
      const verdict = counterfeitCheck({
        brand: product.brand,
        category,
        title: offer.title,
        priceHkdCents: landed.perUnitHkdCents,
        officialHkCents: officialHk,
      });
      if (verdict.suspect !== offer.suspectCounterfeit || verdict.reasons.join(" · ") !== (offer.suspectReason ?? "")) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { suspectCounterfeit: verdict.suspect, suspectReason: verdict.suspect ? verdict.reasons.join(" · ") : null },
        });
      }
      if (verdict.suspect) {
        flagged++;
        if (examples.length < 8) examples.push(`HK$${Math.round(landed.perUnitHkdCents / 100)} ${product.brand} — ${offer.title.slice(0, 50)}`);
      } else if (offer.suspectCounterfeit) {
        cleared++;
      }
    }
  }
  return { products: products.length, flagged, unflagged: cleared, examples };
}

export async function countSuspectOffers() {
  return prisma.offer.count({ where: { suspectCounterfeit: true, inStock: true } });
}

export async function suspectOffers(take = 100) {
  return prisma.offer.findMany({
    where: { suspectCounterfeit: true },
    include: { product: { select: { id: true, title: true, brand: true, slug: true } } },
    orderBy: { latestPrice: "asc" },
    take,
  });
}

/** Admin override: this listing is genuine, keep it in the comparison. */
export async function clearCounterfeitFlag(offerId: number, actor: string) {
  return prisma.offer.update({
    where: { id: offerId },
    data: { suspectCounterfeit: false, suspectReason: null, clearedBy: actor },
  });
}
