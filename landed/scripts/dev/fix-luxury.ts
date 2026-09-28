import "dotenv/config";
import { prisma } from "../../lib/prisma";
import { isAccessoryTitle } from "../../lib/match/attributes";
import { detectLuxury } from "../../lib/luxury/brands";

// One-off: products marked LUXURY before accessories were excluded.
async function main() {
  const rows = await prisma.product.findMany({ where: { segment: "LUXURY" } });
  let demoted = 0;
  for (const p of rows) {
    if (isAccessoryTitle(p.title) || !detectLuxury(p.title)) {
      await prisma.product.update({ where: { id: p.id }, data: { segment: "GLOBAL", restricted: false, restrictedReason: null } });
      demoted++;
    }
  }
  const zeros = await prisma.offer.deleteMany({ where: { latestPrice: { lte: 0 } } });
  console.log(JSON.stringify({ checked: rows.length, demoted, zeroPriceOffersDeleted: zeros.count, luxuryLeft: await prisma.product.count({ where: { segment: "LUXURY" } }) }));
  await prisma.$disconnect();
}
main();
