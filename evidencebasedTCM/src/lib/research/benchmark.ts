import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "./disease-catalog";
import { herbTargetMap, scoreNetworkFit } from "./network-pharmacology";
import { diseaseKeywords, textMatchesDisease } from "./disease-match";

/**
 * Self-contained validation of the network-pharmacology repurposing engine.
 *
 * Gold standard = herbs already evidence-backed for a disease (an
 * EvidenceHerbLink whose evidence text matches the disease's keywords).
 * We then ask: does the engine's molecular target-overlap score rank those
 * known herbs above the rest? Reported as ROC-AUC (rank quality),
 * precision@5/@10, and enrichment vs base rate.
 *
 * This measures whether the predictions carry signal — not clinical efficacy.
 * Universe = herbs that have ≥1 molecular target (i.e. the engine can score
 * them); a known herb with no targets scores 0 and counts against the engine,
 * which is the honest accounting.
 */

export interface DiseaseBenchmark {
  diseaseId: string;
  diseaseName: string;
  universe: number;
  positives: number;
  rocAuc: number | null;
  precisionAt5: number;
  precisionAt10: number;
  enrichment: number; // precision@10 ÷ base positive rate
}

export interface BenchmarkResult {
  perDisease: DiseaseBenchmark[];
  skipped: { diseaseId: string; diseaseName: string; reason: string }[];
  overall: { meanAuc: number | null; meanP5: number; meanP10: number; diseasesEvaluated: number };
  method: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** ROC-AUC via Mann–Whitney U with average-rank tie handling. */
function rocAuc(scoredPositives: number[], scoredNegatives: number[]): number | null {
  const nPos = scoredPositives.length;
  const nNeg = scoredNegatives.length;
  if (nPos === 0 || nNeg === 0) return null;

  const all = [
    ...scoredPositives.map((s) => ({ s, pos: true })),
    ...scoredNegatives.map((s) => ({ s, pos: false })),
  ].sort((a, b) => a.s - b.s);

  // Assign average ranks (1-based), tying equal scores.
  const ranks = new Array(all.length).fill(0);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].s === all[i].s) j++;
    const avg = (i + 1 + (j + 1)) / 2; // average of ranks i+1..j+1
    for (let k = i; k <= j; k++) ranks[k] = avg;
    i = j + 1;
  }

  let sumRankPos = 0;
  for (let k = 0; k < all.length; k++) if (all[k].pos) sumRankPos += ranks[k];
  const u = sumRankPos - (nPos * (nPos + 1)) / 2;
  return u / (nPos * nNeg);
}

export async function buildBenchmark(): Promise<BenchmarkResult> {
  const targetMap = await herbTargetMap();
  const herbIds = [...targetMap.keys()];

  const [dgRows, evHerbLinks] = await Promise.all([
    prisma.diseaseGene.findMany({ select: { diseaseId: true, geneSymbol: true } }),
    prisma.evidenceHerbLink.findMany({
      select: {
        herbId: true,
        evidence: { select: { title: true, summary: true, intervention: true, primaryOutcome: true, population: true } },
      },
    }),
  ]);

  const diseaseGenes = new Map<string, Set<string>>();
  for (const r of dgRows) {
    let s = diseaseGenes.get(r.diseaseId);
    if (!s) { s = new Set(); diseaseGenes.set(r.diseaseId, s); }
    s.add(r.geneSymbol);
  }

  // herbId -> concatenated evidence text bundles (only for herbs with targets)
  const herbWithTargets = new Set(herbIds);
  const herbEvidenceText = new Map<string, string[]>();
  for (const l of evHerbLinks) {
    if (!herbWithTargets.has(l.herbId)) continue;
    const txt = `${l.evidence.title} ${l.evidence.summary ?? ""} ${l.evidence.intervention ?? ""} ${l.evidence.primaryOutcome ?? ""} ${l.evidence.population ?? ""}`;
    const arr = herbEvidenceText.get(l.herbId) ?? [];
    arr.push(txt);
    herbEvidenceText.set(l.herbId, arr);
  }

  const perDisease: DiseaseBenchmark[] = [];
  const skipped: BenchmarkResult["skipped"] = [];

  for (const disease of DISEASE_CATALOG) {
    const genes = diseaseGenes.get(disease.id);
    if (!genes || genes.size === 0) {
      skipped.push({ diseaseId: disease.id, diseaseName: disease.nameZh, reason: "no gene set" });
      continue;
    }
    const kw = diseaseKeywords(disease);

    // Score every herb-with-targets by network overlap; classify as positive
    // (evidence-backed for this disease) vs negative.
    const scored = herbIds.map((herbId) => {
      const overlap = scoreNetworkFit(targetMap.get(herbId), genes).overlap;
      const positive = (herbEvidenceText.get(herbId) ?? []).some((t) => textMatchesDisease(t, kw));
      return { herbId, overlap, positive };
    });

    const positives = scored.filter((x) => x.positive);
    if (positives.length < 2) {
      skipped.push({ diseaseId: disease.id, diseaseName: disease.nameZh, reason: `only ${positives.length} gold positives` });
      continue;
    }

    const auc = rocAuc(positives.map((x) => x.overlap), scored.filter((x) => !x.positive).map((x) => x.overlap));

    const ranked = [...scored].sort((a, b) => b.overlap - a.overlap);
    const top5 = ranked.slice(0, 5);
    const top10 = ranked.slice(0, 10);
    const p5 = top5.filter((x) => x.positive).length / Math.min(5, ranked.length);
    const p10 = top10.filter((x) => x.positive).length / Math.min(10, ranked.length);
    const baseRate = positives.length / scored.length;
    const enrichment = baseRate > 0 ? p10 / baseRate : 0;

    perDisease.push({
      diseaseId: disease.id,
      diseaseName: disease.nameZh,
      universe: scored.length,
      positives: positives.length,
      rocAuc: auc === null ? null : round2(auc),
      precisionAt5: round2(p5),
      precisionAt10: round2(p10),
      enrichment: round2(enrichment),
    });
  }

  perDisease.sort((a, b) => (b.rocAuc ?? 0) - (a.rocAuc ?? 0));
  const aucs = perDisease.map((d) => d.rocAuc).filter((x): x is number => x != null);
  const overall = {
    meanAuc: aucs.length ? round2(aucs.reduce((s, x) => s + x, 0) / aucs.length) : null,
    meanP5: perDisease.length ? round2(perDisease.reduce((s, d) => s + d.precisionAt5, 0) / perDisease.length) : 0,
    meanP10: perDisease.length ? round2(perDisease.reduce((s, d) => s + d.precisionAt10, 0) / perDisease.length) : 0,
    diseasesEvaluated: perDisease.length,
  };

  return {
    perDisease,
    skipped,
    overall,
    method:
      "Gold positives = herbs with an evidence link whose text matches the disease keywords. Universe = herbs with ≥1 molecular target. Ranking score = network target-overlap with the disease gene set. ROC-AUC via Mann–Whitney U (avg-rank ties); AUC>0.5 means the engine ranks known herbs above the rest better than chance.",
  };
}
