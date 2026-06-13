import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
async function main() {
  const g = await prisma.courseLesson.groupBy({ by: ["courseId", "courseName"], _count: true });
  console.log("\n=== COURSE LESSONS ===");
  for (const c of g) console.log(`  ${c.courseId} · ${c.courseName}: ${c._count} lessons`);
  console.log(`  TOTAL: ${await prisma.courseLesson.count()} lessons`);
  console.log("\n=== DATABASE ===");
  console.log(`  Herbs: ${await prisma.herb.count()}`);
  console.log(`  Formulas: ${await prisma.formula.count()}`);
  console.log(`  Acupoints: ${await prisma.acupuncturePoint.count()}`);
  console.log(`  Patterns: ${await prisma.tcmPattern.count()}`);
  console.log(`  Evidence: ${await prisma.evidenceEntry.count()}`);
  console.log(`  Research Reports: ${await prisma.researchReport.count()}`);
  await prisma.$disconnect();
}
main();
