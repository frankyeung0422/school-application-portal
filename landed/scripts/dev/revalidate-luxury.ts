import "dotenv/config";
import { prisma } from "../../lib/prisma";
import { incompatibleReason } from "../../lib/match/attributes";
import { clusterKeyword } from "../../lib/catalog";
import { screenLuxuryOffers } from "../../lib/luxury/screen";

// Matching rules changed: drop cached verdicts that the new rules reject, then
// re-cluster and re-screen. (PriceArb's revalidate, scoped to luxury keywords.)
async function main() {
  const offers = await prisma.offer.findMany({ where: { product: { segment: "LUXURY" } }, select: { id: true, title: true, packQty: true, isAccessory: true, keyword: true } });
  const byId = new Map(offers.map((o) => [o.id, o]));
  const ids = [...byId.keys()];
  const pairs = await prisma.matchPair.findMany({ where: { offerAId: { in: ids }, offerBId: { in: ids }, verdict: "SAME" } });
  const stale = pairs.filter((m) => {
    const a = byId.get(m.offerAId);
    const b = byId.get(m.offerBId);
    return a && b && incompatibleReason(a, b) !== null;
  });
  await prisma.matchPair.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  const keywords = [...new Set(offers.map((o) => o.keyword))];
  for (const k of keywords) await clusterKeyword(k);
  const screened = await screenLuxuryOffers();
  console.log(JSON.stringify({ luxuryOffers: offers.length, stalePairsDropped: stale.length, keywords: keywords.length, screened }, null, 1));
  await prisma.$disconnect();
}
main();
