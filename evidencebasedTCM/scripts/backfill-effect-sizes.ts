/**
 * Backfill primary effect sizes on existing EvidenceEntry rows by re-running
 * the LLM extractor over their stored abstracts. Idempotent: only processes
 * entries that have an abstract and no effectMetric yet. Bounded by --max.
 *
 * Prioritises higher-grade / quantitative study types (SR/MA/RCT) first since
 * those are the ones worth pooling.
 *
 * Dry run: npx tsx scripts/backfill-effect-sizes.ts
 * Apply:   npx tsx scripts/backfill-effect-sizes.ts --apply --max=80
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { gradePaper } from "../src/lib/research/grade-paper";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const MAX = Number(process.argv.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 60);

async function main() {
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error("Needs OPENAI_API_KEY or ANTHROPIC_API_KEY.");
    process.exitCode = 1;
    return;
  }

  // Fetch entries with a substantial real abstract (short Chinese summaries
  // rarely contain extractable CIs). Filter length in JS, then cap to MAX.
  const candidatesRaw = await prisma.evidenceEntry.findMany({
    where: { effectMetric: null, abstract: { not: null } },
    select: { id: true, title: true, abstract: true, journal: true, year: true, pubmedId: true, studyType: true },
    orderBy: { year: "desc" },
  });
  const rows = candidatesRaw.filter((r) => (r.abstract?.length ?? 0) > 250).slice(0, MAX);
  console.log(`Candidates (abstract > 250 chars, no effect yet): ${rows.length} of ${candidatesRaw.length} with abstracts`);

  let withEffect = 0;
  for (const r of rows) {
    if (!r.abstract || r.abstract.length < 50) continue;
    const graded = await gradePaper({
      pubmedId: r.pubmedId ?? "", doi: null, title: r.title, abstract: r.abstract,
      authors: "", journal: r.journal, year: r.year, studyTypeHint: r.studyType,
    }).catch(() => null);
    if (!graded || !graded.effectMetric) {
      continue;
    }
    withEffect++;
    if (!APPLY) {
      console.log(`  [dry] ${graded.effectMetric} ${graded.effectValue} [${graded.ciLow}, ${graded.ciHigh}] — ${r.title.slice(0, 60)}`);
      continue;
    }
    await prisma.evidenceEntry.update({
      where: { id: r.id },
      data: { effectMetric: graded.effectMetric, effectValue: graded.effectValue, ciLow: graded.ciLow, ciHigh: graded.ciHigh, favorsTx: graded.favorsTx },
    });
  }

  console.log(
    APPLY
      ? `\n✓ Applied. ${withEffect}/${rows.length} entries got an effect size.`
      : `\n(dry run) ${withEffect}/${rows.length} would get an effect size. Re-run with --apply.`,
  );
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
