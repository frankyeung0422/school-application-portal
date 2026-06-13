/**
 * Literature surveillance CLI — thin wrapper over src/lib/research/surveil.ts.
 *
 * Auto-fetches recent PubMed evidence per disease, GRADEs it, inserts new
 * EvidenceEntry rows (idempotent by pubmedId) and keyword-links matched
 * herbs/formulas/acupoints. Logs a summary to ImprovementLog.
 *
 * The same core runs inside the auto-improve weekly phase (runType="weekly").
 *
 * Dry run: npx tsx scripts/surveil-evidence.ts --disease=t2dm
 * Apply:   npx tsx scripts/surveil-evidence.ts --apply --max-per-disease=4
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { runSurveillance } from "../src/lib/research/surveil";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const MAX_PER = Number(process.argv.find((a) => a.startsWith("--max-per-disease="))?.split("=")[1] ?? 4);
const ONLY = process.argv.find((a) => a.startsWith("--disease="))?.split("=")[1];

async function main() {
  const summary = await runSurveillance({
    maxPerDisease: MAX_PER,
    diseaseIds: ONLY ? [ONLY] : undefined,
    apply: APPLY,
    onProgress: (m) => console.log(`  ${m}`),
  });

  if (summary.skipped) {
    console.error(`Skipped: ${summary.reason}`);
    process.exitCode = 1;
    return;
  }

  if (APPLY) {
    await prisma.improvementLog.create({
      data: {
        runDate: new Date(),
        runType: "surveillance",
        category: "research",
        action: "pubmed_surveillance",
        details: `Surveilled ${summary.diseasesProcessed} diseases; inserted ${summary.inserted} new evidence entries, ${summary.links} entity links. Per-disease: ${JSON.stringify(summary.perDisease)}`,
        itemsAffected: summary.inserted,
        status: "completed",
        duration: 0,
      },
    });
    console.log(`\n✓ Applied. inserted=${summary.inserted} links=${summary.links}`);
  } else {
    console.log(`\n(dry run) would insert ~${summary.inserted}. Re-run with --apply.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
