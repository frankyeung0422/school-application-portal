import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [
    evidence,
    gradeA,
    gradeB,
    gradeC,
    gradeD,
    herbLinks,
    formulaLinks,
    acuLinks,
    patternLinks,
  ] = await Promise.all([
    prisma.evidenceEntry.count(),
    prisma.evidenceEntry.count({ where: { evidenceGrade: "A" } }),
    prisma.evidenceEntry.count({ where: { evidenceGrade: "B" } }),
    prisma.evidenceEntry.count({ where: { evidenceGrade: "C" } }),
    prisma.evidenceEntry.count({ where: { evidenceGrade: "D" } }),
    prisma.evidenceHerbLink.count(),
    prisma.evidenceFormulaLink.count(),
    prisma.evidenceAcupointLink.count(),
    prisma.evidencePatternLink.count(),
  ]);
  const totalLinks = herbLinks + formulaLinks + acuLinks + patternLinks;
  console.log(`Evidence entries: ${evidence}`);
  console.log(`  Grade A: ${gradeA}`);
  console.log(`  Grade B: ${gradeB}`);
  console.log(`  Grade C: ${gradeC}`);
  console.log(`  Grade D: ${gradeD}`);
  console.log(`Links: ${totalLinks} total (herb:${herbLinks} formula:${formulaLinks} acupoint:${acuLinks} pattern:${patternLinks})`);
  await prisma.$disconnect();
}
main();
