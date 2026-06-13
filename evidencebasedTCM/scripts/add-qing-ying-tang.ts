/**
 * Add 清營湯 (Qing Ying Tang) — foundational Wen Bing formula from 溫病條辨,
 * and link it to the 營分證 (Ying Fen Zheng) pattern.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const composition = [
  { pinyin: "Shui Niu Jiao", role: "JUN", dose: "30g" },     // formerly Xi Jiao
  { pinyin: "Sheng Di Huang", role: "CHEN", dose: "15g" },
  { pinyin: "Xuan Shen", role: "CHEN", dose: "9g" },
  { pinyin: "Mai Men Dong", role: "CHEN", dose: "9g" },
  { pinyin: "Huang Lian", role: "ZUO", dose: "5g" },
  { pinyin: "Zhu Ye", role: "ZUO", dose: "3g" },
  { pinyin: "Jin Yin Hua", role: "ZUO", dose: "9g" },
  { pinyin: "Lian Qiao", role: "ZUO", dose: "6g" },
  { pinyin: "Dan Shen", role: "ZUO", dose: "6g" },
];

async function main() {
  let formula = await prisma.formula.findFirst({ where: { pinyinName: "Qing Ying Tang" } });
  if (!formula) {
    formula = await prisma.formula.create({
      data: {
        pinyinName: "Qing Ying Tang",
        chineseName: "清營湯",
        englishName: "Clear the Nutritive-Level Decoction",
        sourceText: "溫病條辨",
        category: "Heat Clearing",
        actions: "清營解毒，透熱養陰",
        indications: "邪熱傳營證：身熱夜甚、神煩少寐，時有譫語、目常喜開或喜閉、口渴或不渴、斑疹隱隱、舌絳而乾、脈細數。為溫病營分證之代表方。",
        modifications: "若寸脈大、舌乾而紅，加金銀花、連翹、玄參增清熱解毒之力；夾痰熱可加竹瀝、半夏、貝母。",
        status: "PUBLISHED",
      },
    });
    console.log(`[ok] Created formula: 清營湯 (${formula.id})`);
  } else {
    console.log(`[exists] Qing Ying Tang already in DB.`);
  }

  // Link composition
  let linksAdded = 0;
  for (const c of composition) {
    const herb = await prisma.herb.findFirst({ where: { pinyinName: c.pinyin } });
    if (!herb) { console.log(`  [skip-herb] ${c.pinyin} not in DB`); continue; }
    try {
      await prisma.formulaHerb.create({ data: { formulaId: formula.id, herbId: herb.id, role: c.role as any, dosage: c.dose } });
      linksAdded++;
    } catch {}
  }
  console.log(`  Added ${linksAdded} herb links.`);

  // Link pattern → formula
  const pattern = await prisma.tcmPattern.findFirst({ where: { pinyinName: "Ying Fen Zheng" } });
  if (pattern) {
    try {
      await prisma.patternFormula.create({ data: { patternId: pattern.id, formulaId: formula.id, isPrimary: true } });
      console.log(`[ok] Linked 營分證 → 清營湯 (primary).`);
    } catch (e: any) {
      console.log(`[exists or err] pattern link: ${e.message?.slice(0, 80)}`);
    }
  } else {
    console.log(`[skip] Ying Fen Zheng pattern not found.`);
  }

  const remaining = await prisma.tcmPattern.count({ where: { patternFormulas: { none: {} } } });
  console.log(`\nPatterns still without formulas: ${remaining}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
