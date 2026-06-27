import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "./disease-catalog";
import { herbTargetMap, scoreNetworkFit, targetSourceMap } from "./network-pharmacology";
import { diseaseKeywords, textMatchesDisease } from "./disease-match";
import { scoreCredibility, type CredibilityScore } from "./credibility";

/**
 * Repurposing Discovery board.
 *
 * Ranks herb-disease and formula-disease target-overlap pairs across the whole
 * catalog, flags NOVEL ones (target overlap but no disease-matched clinical
 * evidence), and attaches a unified credibility score to each. Bulk queries +
 * in-memory computation (no per-disease round-trips).
 */

export interface DiscoveryPair {
  kind: "herb" | "formula";
  entityId: string;
  entityName: string;
  diseaseId: string;
  diseaseName: string;
  overlap: number;
  sharedGenes: string[];
  novel: boolean;
  gradeA: number;
  gradeB: number;
  totalEvidence: number;
  credibility: CredibilityScore;
}

export interface DiscoveryBoard {
  diseasesCovered: number;
  minOverlap: number;
  herbPairs: DiscoveryPair[];
  formulaPairs: DiscoveryPair[];
  novelHerbCount: number;
  novelFormulaCount: number;
}

interface EvLink { grade: string; text: string }

function gradeCounts(links: EvLink[]): { gradeA: number; gradeB: number; total: number } {
  let gradeA = 0, gradeB = 0;
  for (const l of links) {
    if (l.grade === "A") gradeA++;
    else if (l.grade === "B") gradeB++;
  }
  return { gradeA, gradeB, total: links.length };
}

function llmShare(sharedGenes: string[], src: Map<string, "curated" | "LLM" | "mixed">): number {
  if (sharedGenes.length === 0) return 0;
  const llmOnly = sharedGenes.filter((g) => src.get(g) === "LLM").length;
  return llmOnly / sharedGenes.length;
}

export async function buildDiscoveryBoard(opts: { minOverlap?: number } = {}): Promise<DiscoveryBoard> {
  const minOverlap = opts.minOverlap ?? 3;

  const targetMap = await herbTargetMap();
  const herbIdsWithTargets = [...targetMap.keys()];

  const [herbMeta, dgRows, formulaHerbs, evHerbLinks, evFormulaLinks, srcMap] = await Promise.all([
    prisma.herb.findMany({ where: { id: { in: herbIdsWithTargets } }, select: { id: true, chineseName: true, pinyinName: true } }),
    prisma.diseaseGene.findMany({ select: { diseaseId: true, geneSymbol: true } }),
    prisma.formulaHerb.findMany({
      where: { herbId: { in: herbIdsWithTargets } },
      select: { herbId: true, formula: { select: { id: true, chineseName: true, pinyinName: true, status: true } } },
    }),
    prisma.evidenceHerbLink.findMany({
      select: { herbId: true, evidence: { select: { evidenceGrade: true, title: true, summary: true, intervention: true, primaryOutcome: true, population: true } } },
    }),
    prisma.evidenceFormulaLink.findMany({
      select: { formulaId: true, evidence: { select: { evidenceGrade: true, title: true, summary: true, intervention: true, primaryOutcome: true, population: true } } },
    }),
    targetSourceMap(),
  ]);

  const metaById = new Map(herbMeta.map((h) => [h.id, h]));

  const diseaseGenes = new Map<string, Set<string>>();
  for (const r of dgRows) {
    let s = diseaseGenes.get(r.diseaseId);
    if (!s) { s = new Set(); diseaseGenes.set(r.diseaseId, s); }
    s.add(r.geneSymbol);
  }

  const toLink = (e: { evidenceGrade: string; title: string; summary: string | null; intervention: string | null; primaryOutcome: string | null; population: string | null }): EvLink => ({
    grade: e.evidenceGrade,
    text: `${e.title} ${e.summary ?? ""} ${e.intervention ?? ""} ${e.primaryOutcome ?? ""} ${e.population ?? ""}`,
  });
  const herbEvidence = new Map<string, EvLink[]>();
  for (const l of evHerbLinks) {
    const arr = herbEvidence.get(l.herbId) ?? [];
    arr.push(toLink(l.evidence));
    herbEvidence.set(l.herbId, arr);
  }
  const formulaEvidence = new Map<string, EvLink[]>();
  for (const l of evFormulaLinks) {
    const arr = formulaEvidence.get(l.formulaId) ?? [];
    arr.push(toLink(l.evidence));
    formulaEvidence.set(l.formulaId, arr);
  }

  const herbPairs: DiscoveryPair[] = [];
  const formulaPairs: DiscoveryPair[] = [];

  for (const disease of DISEASE_CATALOG) {
    const genes = diseaseGenes.get(disease.id);
    if (!genes || genes.size === 0) continue;
    const kw = diseaseKeywords(disease);

    const herbShared = new Map<string, string[]>();
    for (const herbId of herbIdsWithTargets) {
      const fit = scoreNetworkFit(targetMap.get(herbId), genes);
      if (fit.overlap === 0) continue;
      herbShared.set(herbId, fit.sharedGenes);
      if (fit.overlap >= minOverlap) {
        const meta = metaById.get(herbId);
        if (!meta) continue;
        const matched = (herbEvidence.get(herbId) ?? []).filter((e) => textMatchesDisease(e.text, kw));
        const gc = gradeCounts(matched);
        const credibility = scoreCredibility({
          gradeA: gc.gradeA, gradeB: gc.gradeB, totalEvidence: gc.total,
          targetOverlap: fit.overlap, diseaseGeneCount: genes.size, llmOnlyShare: llmShare(fit.sharedGenes, srcMap),
        });
        herbPairs.push({
          kind: "herb", entityId: herbId, entityName: meta.chineseName, diseaseId: disease.id, diseaseName: disease.nameZh,
          overlap: fit.overlap, sharedGenes: fit.sharedGenes, novel: gc.total === 0,
          gradeA: gc.gradeA, gradeB: gc.gradeB, totalEvidence: gc.total, credibility,
        });
      }
    }

    const formulaAgg = new Map<string, { name: string; pinyin: string; genes: Set<string> }>();
    for (const fh of formulaHerbs) {
      if (fh.formula.status !== "PUBLISHED") continue;
      const shared = herbShared.get(fh.herbId);
      if (!shared) continue;
      let agg = formulaAgg.get(fh.formula.id);
      if (!agg) { agg = { name: fh.formula.chineseName, pinyin: fh.formula.pinyinName, genes: new Set() }; formulaAgg.set(fh.formula.id, agg); }
      for (const g of shared) agg.genes.add(g);
    }
    for (const [formulaId, agg] of formulaAgg) {
      if (agg.genes.size < minOverlap) continue;
      const sharedGenes = [...agg.genes].sort();
      const matched = (formulaEvidence.get(formulaId) ?? []).filter((e) => textMatchesDisease(e.text, kw));
      const gc = gradeCounts(matched);
      const credibility = scoreCredibility({
        gradeA: gc.gradeA, gradeB: gc.gradeB, totalEvidence: gc.total,
        targetOverlap: agg.genes.size, diseaseGeneCount: genes.size, llmOnlyShare: llmShare(sharedGenes, srcMap),
      });
      formulaPairs.push({
        kind: "formula", entityId: formulaId, entityName: agg.name, diseaseId: disease.id, diseaseName: disease.nameZh,
        overlap: agg.genes.size, sharedGenes, novel: gc.total === 0,
        gradeA: gc.gradeA, gradeB: gc.gradeB, totalEvidence: gc.total, credibility,
      });
    }
  }

  herbPairs.sort(byCredibility);
  formulaPairs.sort(byCredibility);

  return {
    diseasesCovered: new Set([...herbPairs, ...formulaPairs].map((p) => p.diseaseId)).size,
    minOverlap,
    herbPairs,
    formulaPairs,
    novelHerbCount: herbPairs.filter((p) => p.novel).length,
    novelFormulaCount: formulaPairs.filter((p) => p.novel).length,
  };
}

// Highest credibility first, then strongest target overlap.
function byCredibility(a: DiscoveryPair, b: DiscoveryPair): number {
  return b.credibility.score - a.credibility.score || b.overlap - a.overlap;
}
