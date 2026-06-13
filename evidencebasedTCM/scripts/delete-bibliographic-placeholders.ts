/**
 * Delete the 60 auto-generated bibliographic placeholder evidence entries.
 * Title pattern: "中醫藥研究第N輯：基於系統評價的療效報告".
 * These were bulk-generated noise with no specific entities to link.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  // Find them first to verify
  const placeholders = await prisma.evidenceEntry.findMany({
    where: {
      AND: [
        { title: { startsWith: "中醫藥研究第" } },
        { title: { contains: "輯：基於系統評價的療效報告" } },
        { intervention: "中醫藥干預" },
      ],
    },
    select: { id: true, title: true },
  });

  console.log(`Found ${placeholders.length} bibliographic placeholders to delete:\n`);
  for (const p of placeholders.slice(0, 5)) console.log(`  - ${p.title}`);
  if (placeholders.length > 5) console.log(`  ... and ${placeholders.length - 5} more`);

  if (placeholders.length === 0) {
    console.log(`\nNothing to delete.`);
    await prisma.$disconnect();
    return;
  }

  // Delete in a single batch (no FK links exist since they were orphan)
  const ids = placeholders.map((p) => p.id);
  const result = await prisma.evidenceEntry.deleteMany({ where: { id: { in: ids } } });
  console.log(`\nDeleted ${result.count} placeholder evidence entries.`);
  console.log(`Total evidence remaining: ${await prisma.evidenceEntry.count()}`);

  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
