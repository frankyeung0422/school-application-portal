/**
 * Link the 2 patterns currently without any recommended formulas.
 *  - 營分證 (Ying Fen Zheng) → 清營湯 (Qing Ying Tang)
 *  - 涼燥犯肺 (Liang Zao Fan Fei) → 杏蘇散 (Xing Su San)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const links: { patternPinyin: string; formulaPinyin: string; primary: boolean }[] = [
  { patternPinyin: "Ying Fen Zheng", formulaPinyin: "Qing Ying Tang", primary: true },
  { patternPinyin: "Liang Zao Fan Fei", formulaPinyin: "Xing Su San", primary: true },
];

async function main() {
  for (const l of links) {
    const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: l.patternPinyin } });
    if (!pat) { console.log(`[skip] pattern not found: ${l.patternPinyin}`); continue; }
    let f = await prisma.formula.findFirst({ where: { pinyinName: l.formulaPinyin } });
    if (!f) {
      // Try fuzzy: prefix match (handles "(note)" suffixes)
      f = await prisma.formula.findFirst({ where: { pinyinName: { startsWith: l.formulaPinyin } } });
    }
    if (!f) { console.log(`[skip] formula not found: ${l.formulaPinyin}`); continue; }
    try {
      await prisma.patternFormula.create({ data: { patternId: pat.id, formulaId: f.id, isPrimary: l.primary } });
      console.log(`[ok] ${l.patternPinyin} → ${f.pinyinName}`);
    } catch (e: any) {
      console.log(`[exists or err] ${l.patternPinyin} → ${l.formulaPinyin}: ${e.message?.slice(0, 80)}`);
    }
  }
  const still = await prisma.tcmPattern.count({ where: { patternFormulas: { none: {} } } });
  console.log(`\nPatterns still without formulas: ${still}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
