import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "./disease-catalog";
import { diseaseKeywords, textMatchesDisease } from "./disease-match";

/**
 * Evidence map + literature-surveillance aggregation.
 *
 * For each catalog disease, buckets the matching evidence into a
 * study-type × GRADE matrix, computes recency, and flags research gaps
 * (no Grade-A, only observational, sparse). Also returns a global
 * "recently added" feed so newly-surveilled papers surface immediately.
 *
 * One bulk query + in-memory matching (disease association is by keyword,
 * mirroring synthesize.ts buildProposal — evidence is not disease-tagged).
 */

export const STUDY_TYPE_ORDER = [
  "SYSTEMATIC_REVIEW",
  "META_ANALYSIS",
  "RCT",
  "COHORT",
  "CASE_CONTROL",
  "CASE_SERIES",
  "CASE_REPORT",
  "EXPERT_OPINION",
  "TRADITIONAL_USE",
] as const;

export const GRADE_ORDER = ["A", "B", "C", "D"] as const;

export interface DiseaseEvidenceMap {
  diseaseId: string;
  diseaseName: string;
  total: number;
  recent30: number; // added in last 30 days
  byGrade: Record<string, number>;
  /** studyType -> grade -> count (only study types with ≥1 entry retained) */
  matrix: Record<string, Record<string, number>>;
  presentStudyTypes: string[];
  gaps: string[];
}

export interface RecentEvidence {
  id: string;
  title: string;
  studyType: string;
  evidenceGrade: string;
  year: number | null;
  journal: string | null;
  pubmedId: string | null;
  createdAt: string;
}

export interface EvidenceMapResult {
  diseases: DiseaseEvidenceMap[];
  recent: RecentEvidence[];
  added7: number;
  added30: number;
  totalEvidence: number;
}

const DAY = 86_400_000;

export async function buildEvidenceMap(): Promise<EvidenceMapResult> {
  const now = Date.now();
  const all = await prisma.evidenceEntry.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, title: true, studyType: true, evidenceGrade: true, year: true,
      journal: true, pubmedId: true, createdAt: true,
      summary: true, population: true, intervention: true, primaryOutcome: true,
    },
  });

  const diseases: DiseaseEvidenceMap[] = DISEASE_CATALOG.map((d) => {
    const kw = diseaseKeywords(d);
    const matched = all.filter((e) =>
      textMatchesDisease(`${e.title} ${e.summary ?? ""} ${e.population ?? ""} ${e.intervention ?? ""} ${e.primaryOutcome ?? ""}`, kw),
    );

    const matrix: Record<string, Record<string, number>> = {};
    const byGrade: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    let recent30 = 0;
    for (const e of matched) {
      (matrix[e.studyType] ??= { A: 0, B: 0, C: 0, D: 0 })[e.evidenceGrade]++;
      byGrade[e.evidenceGrade] = (byGrade[e.evidenceGrade] ?? 0) + 1;
      if (now - e.createdAt.getTime() <= 30 * DAY) recent30++;
    }
    const presentStudyTypes = STUDY_TYPE_ORDER.filter((s) => matrix[s]);

    const gaps: string[] = [];
    if (matched.length === 0) gaps.push("無任何相關文獻 / No matched evidence");
    else {
      if (byGrade.A === 0) gaps.push("缺乏 A 級實證 / No Grade-A evidence");
      const hasHighTier = ["SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT"].some((s) => matrix[s]);
      if (!hasHighTier) gaps.push("僅有觀察性/低階研究 / Only observational evidence");
      if (matched.length < 5) gaps.push("文獻稀少（<5）/ Sparse evidence (<5)");
    }

    return {
      diseaseId: d.id,
      diseaseName: d.nameZh,
      total: matched.length,
      recent30,
      byGrade,
      matrix,
      presentStudyTypes,
      gaps,
    };
  });

  const recentSorted = [...all].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const recent: RecentEvidence[] = recentSorted.slice(0, 15).map((e) => ({
    id: e.id,
    title: e.title,
    studyType: e.studyType,
    evidenceGrade: e.evidenceGrade,
    year: e.year,
    journal: e.journal,
    pubmedId: e.pubmedId,
    createdAt: e.createdAt.toISOString(),
  }));
  const added7 = all.filter((e) => now - e.createdAt.getTime() <= 7 * DAY).length;
  const added30 = all.filter((e) => now - e.createdAt.getTime() <= 30 * DAY).length;

  return { diseases, recent, added7, added30, totalEvidence: all.length };
}
