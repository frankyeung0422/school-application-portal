import "dotenv/config";
import { prisma } from "../../lib/prisma";
import { parseUnitSize, parsePackQty } from "../../lib/match/attributes";
async function main() {
  const ps = await prisma.product.findMany({ where: { segment: "SUPERMARKET" }, select: { title: true, titleEn: true }, take: 3000 });
  let zh = 0, en = 0, pack = 0;
  const misses: string[] = [];
  for (const p of ps) {
    const a = parseUnitSize(p.title), b = parseUnitSize(p.titleEn ?? "");
    if (a) zh++; if (b) en++; if (parsePackQty(p.title) || parsePackQty(p.titleEn ?? "")) pack++;
    if (!a && !b && misses.length < 12) misses.push(`${p.title}  ||  ${p.titleEn}`);
  }
  console.log(`products ${ps.length} | zh-size ${zh} | en-size ${en} | pack ${pack}`);
  console.log(misses.join("\n"));
  await prisma.$disconnect();
}
main();
