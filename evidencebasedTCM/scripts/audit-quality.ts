import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  console.log("=== Data quality audit ===\n");

  // Herbs with placeholder/short descriptions
  const placeholderHerbs = await p.herb.findMany({
    where: { OR: [{ description: { startsWith: "（已存在" } }, { description: { contains: "見原條目" } }, { description: { startsWith: "（萆薢" } }] },
    select: { id: true, pinyinName: true, chineseName: true, description: true },
  });
  console.log(`Herbs with placeholder description: ${placeholderHerbs.length}`);
  placeholderHerbs.slice(0, 5).forEach(h => console.log(`  ${h.chineseName} (${h.pinyinName})`));

  // Herbs missing english name
  const noEnglishHerbs = await p.herb.count({ where: { OR: [{ englishName: null }, { englishName: "" }] } });
  console.log(`\nHerbs missing english name: ${noEnglishHerbs}`);

  // Formulas without composition
  const noHerbsFormulas = await p.formula.findMany({ where: { herbs: { none: {} } }, select: { id: true, pinyinName: true, chineseName: true, category: true } });
  console.log(`\nFormulas without herb composition: ${noHerbsFormulas.length}`);
  noHerbsFormulas.slice(0, 10).forEach(f => console.log(`  [${f.category}] ${f.chineseName}`));

  // Conditions without pattern mappings
  const noPatConds = await p.conditionMapping.findMany({ where: { patternMappings: { none: {} } }, select: { westernName: true } });
  console.log(`\nConditions without pattern mappings: ${noPatConds.length}`);
  noPatConds.slice(0, 10).forEach(c => console.log(`  ${c.westernName}`));

  // Patterns without acupoints
  const noAcuPatterns = await p.tcmPattern.findMany({ where: { patternAcupoints: { none: {} } }, select: { chineseName: true } });
  console.log(`\nPatterns without acupoint links: ${noAcuPatterns.length}`);
  noAcuPatterns.slice(0, 10).forEach(p => console.log(`  ${p.chineseName}`));

  // Evidence without any entity links
  const orphanEv = await p.evidenceEntry.count({
    where: { herbLinks: { none: {} }, formulaLinks: { none: {} }, acupointLinks: { none: {} }, patternLinks: { none: {} } },
  });
  console.log(`\nOrphan evidence (no entity links): ${orphanEv}`);

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
