import { prisma } from "@/lib/db/prisma";
import { esearch, efetch } from "./pubmed";
import { gradePaper } from "./grade-paper";
import { DISEASE_CATALOG } from "./disease-catalog";

/**
 * Literature surveillance core — reusable by both the CLI
 * (scripts/surveil-evidence.ts) and the auto-improve engine's weekly phase.
 *
 * For each target disease, queries PubMed for recent TCM-relevant papers,
 * GRADE-grades each with the LLM, inserts new EvidenceEntry rows (idempotent
 * by pubmedId), and keyword-links matched herbs/formulas/acupoints.
 *
 * Pure logic: returns a summary, does NOT write ImprovementLog (the caller
 * decides how to log). Requires OPENAI_API_KEY or ANTHROPIC_API_KEY + NCBI
 * network access; returns { skipped: true } when no grading key is set.
 */

export interface SurveillanceSummary {
  skipped: boolean;
  reason?: string;
  diseasesProcessed: number;
  inserted: number;
  links: number;
  perDisease: Record<string, number>;
}

export interface SurveillanceOptions {
  maxPerDisease?: number;
  diseaseIds?: string[]; // default: whole catalog
  apply?: boolean; // false = dry run (no DB writes)
  onProgress?: (msg: string) => void;
}

export async function runSurveillance(opts: SurveillanceOptions = {}): Promise<SurveillanceSummary> {
  const maxPerDisease = opts.maxPerDisease ?? 4;
  const apply = opts.apply ?? true;
  const log = opts.onProgress ?? (() => {});

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return { skipped: true, reason: "no grading API key", diseasesProcessed: 0, inserted: 0, links: 0, perDisease: {} };
  }

  const targets = opts.diseaseIds
    ? DISEASE_CATALOG.filter((d) => opts.diseaseIds!.includes(d.id))
    : DISEASE_CATALOG;

  // Entity dictionaries for keyword auto-linking (loaded once).
  const [herbs, formulas, acupoints] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, chineseName: true, latinName: true, englishName: true } }),
    prisma.formula.findMany({ select: { id: true, chineseName: true, englishName: true } }),
    prisma.acupuncturePoint.findMany({ select: { id: true, code: true, chineseName: true } }),
  ]);

  const currentYear = new Date().getFullYear();
  let inserted = 0;
  let links = 0;
  const perDisease: Record<string, number> = {};

  for (const disease of targets) {
    const query = `(${disease.keywordsEn.join(" OR ")}) AND (traditional chinese medicine OR acupuncture OR herbal medicine OR chinese herbal)`;
    let pmids: string[];
    try {
      pmids = await esearch(query, maxPerDisease, currentYear - 3, currentYear);
    } catch (e) {
      log(`⚠ ${disease.nameZh}: esearch failed: ${String(e).slice(0, 100)}`);
      continue;
    }
    if (pmids.length === 0) continue;

    const existing = await prisma.evidenceEntry.findMany({
      where: { pubmedId: { in: pmids } },
      select: { pubmedId: true },
    });
    const have = new Set(existing.map((e) => e.pubmedId));
    const fresh = pmids.filter((p) => !have.has(p));
    if (fresh.length === 0) continue;

    const articles = await efetch(fresh);
    let diseaseInserted = 0;
    for (const art of articles) {
      const graded = await gradePaper(art).catch(() => null);
      if (!graded) continue;
      if (!apply) {
        inserted++;
        diseaseInserted++;
        continue;
      }

      const entry = await prisma.evidenceEntry.create({
        data: {
          title: art.title,
          studyType: graded.studyType,
          evidenceLevel: graded.evidenceLevel,
          evidenceGrade: graded.evidenceGrade,
          authors: art.authors || null,
          journal: art.journal,
          year: art.year,
          doi: art.doi,
          pubmedId: art.pubmedId,
          abstract: art.abstract,
          summary: graded.summary,
          sampleSize: graded.sampleSize,
          population: graded.population,
          intervention: graded.intervention,
          comparator: graded.comparator,
          primaryOutcome: graded.primaryOutcome,
          resultsSummary: graded.resultsSummary,
          riskOfBias: graded.riskOfBias,
          qualityScore: graded.qualityScore,
          effectMetric: graded.effectMetric,
          effectValue: graded.effectValue,
          ciLow: graded.ciLow,
          ciHigh: graded.ciHigh,
          favorsTx: graded.favorsTx,
        },
      });
      inserted++;
      diseaseInserted++;

      const hayCJK = `${art.title} ${art.abstract ?? ""}`;
      const hayLower = hayCJK.toLowerCase();
      for (const h of herbs) {
        const hit =
          hayCJK.includes(h.chineseName) ||
          (h.latinName && h.latinName.length >= 4 && hayLower.includes(h.latinName.toLowerCase())) ||
          (h.englishName && h.englishName.length >= 4 && hayLower.includes(h.englishName.toLowerCase()));
        if (hit) {
          await prisma.evidenceHerbLink
            .create({ data: { evidenceId: entry.id, herbId: h.id, outcomeType: graded.outcomeType, effectDirection: graded.effectDirection } })
            .then(() => { links++; })
            .catch(() => {});
        }
      }
      for (const f of formulas) {
        const hit = hayCJK.includes(f.chineseName) || (f.englishName && f.englishName.length >= 6 && hayLower.includes(f.englishName.toLowerCase()));
        if (hit) {
          await prisma.evidenceFormulaLink
            .create({ data: { evidenceId: entry.id, formulaId: f.id, outcomeType: graded.outcomeType, effectDirection: graded.effectDirection } })
            .then(() => { links++; })
            .catch(() => {});
        }
      }
      for (const a of acupoints) {
        if (hayCJK.includes(a.chineseName) || hayCJK.includes(a.code)) {
          await prisma.evidenceAcupointLink
            .create({ data: { evidenceId: entry.id, acupointId: a.id, outcomeType: graded.outcomeType, effectDirection: graded.effectDirection } })
            .then(() => { links++; })
            .catch(() => {});
        }
      }
    }
    perDisease[disease.id] = diseaseInserted;
    if (diseaseInserted > 0) log(`✓ ${disease.nameZh}: +${diseaseInserted}`);
  }

  return { skipped: false, diseasesProcessed: targets.length, inserted, links, perDisease };
}
