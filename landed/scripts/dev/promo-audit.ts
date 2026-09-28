import "dotenv/config";
import { prisma } from "../../lib/prisma";
import { rowsFromOffers } from "../../lib/supermarket/view";
async function main() {
  const ps = await prisma.product.findMany({ where: { segment: "SUPERMARKET" }, include: { offers: true } });
  let promos = 0, worse = 0, withUnit = 0, rows = 0;
  const examples: string[] = [];
  for (const p of ps) {
    for (const r of rowsFromOffers(p.offers, p.titleEn)) {
      rows++;
      if (r.unit) withUnit++;
      if (r.verdict) promos++;
      if (r.verdict?.kind === "WORSE") {
        worse++;
        if (examples.length < 6) examples.push(`${p.title.slice(0, 34)} | ${r.retailer} $${(r.shelfCents / 100).toFixed(2)} | ${r.promoZh} → 貴 $${(-r.verdict.savingCents / 100).toFixed(2)}`);
      }
    }
  }
  console.log(`rows ${rows} | with unit price ${withUnit} (${((withUnit / rows) * 100).toFixed(1)}%) | promos ${promos} | NOT deals ${worse}`);
  console.log(examples.join("\n"));
  await prisma.$disconnect();
}
main();
