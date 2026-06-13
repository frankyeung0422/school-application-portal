/**
 * ClinicalTrials.gov import — per catalog disease, fetch TCM-relevant trials
 * and upsert ClinicalTrial rows (idempotent by nctId).
 *
 * Dry run: npx tsx scripts/import-trials.ts
 * Apply:   npx tsx scripts/import-trials.ts --apply --max-per-disease=10
 * One:     npx tsx scripts/import-trials.ts --apply --disease=t2dm
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { searchTrials } from "../src/lib/research/clinicaltrials";
import { DISEASE_CATALOG } from "../src/lib/research/disease-catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const MAX_PER = Number(process.argv.find((a) => a.startsWith("--max-per-disease="))?.split("=")[1] ?? 10);
const ONLY = process.argv.find((a) => a.startsWith("--disease="))?.split("=")[1];

async function main() {
  const targets = ONLY ? DISEASE_CATALOG.filter((d) => d.id === ONLY) : DISEASE_CATALOG;
  let fetched = 0, upserted = 0;

  for (const disease of targets) {
    let trials;
    try {
      trials = await searchTrials(disease.nameEn, MAX_PER);
    } catch (e) {
      console.warn(`  ⚠ ${disease.nameZh}: ${String(e).slice(0, 120)}`);
      continue;
    }
    fetched += trials.length;
    if (!APPLY) {
      console.log(`  [dry] ${disease.nameZh}: ${trials.length} trials — e.g. ${trials.slice(0, 2).map((t) => t.nctId).join(", ")}`);
      continue;
    }
    for (const t of trials) {
      const data = {
        title: t.title, status: t.status, phase: t.phase, studyType: t.studyType,
        enrollment: t.enrollment, conditions: t.conditions, interventions: t.interventions,
        leadSponsor: t.leadSponsor, startDate: t.startDate, completionDate: t.completionDate,
        url: t.url, diseaseId: disease.id, diseaseName: disease.nameZh,
      };
      await prisma.clinicalTrial.upsert({ where: { nctId: t.nctId }, create: { nctId: t.nctId, ...data }, update: data });
      upserted++;
    }
    console.log(`  ✓ ${disease.nameZh}: ${trials.length} trials`);
  }

  console.log(APPLY ? `\n✓ Applied. upserted=${upserted}` : `\n(dry run) ${fetched} trials seen. Re-run with --apply.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
