import { prisma } from "@/lib/db/prisma";

/**
 * Network-pharmacology engine.
 *
 * Operates over the herb → active-compound → protein-target → pathway graph
 * plus disease → gene sets (see prisma/schema.prisma + scripts/import-*.ts).
 *
 * Provides:
 *  - diseaseGeneSet(diseaseId)         disease's gene symbols
 *  - herbTargetMap()                   herbId → Set<geneSymbol> (one query)
 *  - scoreNetworkFit(genes, geneSet)   shared-target overlap score
 *  - repurposingCandidates(diseaseId)  rank herbs + formulas by target overlap
 *  - enrichPathways(genes)             top KEGG pathways for a target set
 *
 * Used by formula-architect.ts (networkFit scoring + data-grounded mechanism
 * reports) and the /research/[id] Network Pharmacology view.
 */

// ── Disease genes ────────────────────────────────────────────────────

export async function diseaseGeneSet(diseaseId: string): Promise<Set<string>> {
  const rows = await prisma.diseaseGene.findMany({
    where: { diseaseId },
    select: { geneSymbol: true },
  });
  return new Set(rows.map((r) => r.geneSymbol));
}

// ── Herb → targets ───────────────────────────────────────────────────

/**
 * One pass over the whole graph: herbId → set of gene symbols it reaches
 * through its active compounds. Cheaper than per-herb queries when scoring
 * all 536 herbs.
 */
export async function herbTargetMap(): Promise<Map<string, Set<string>>> {
  const compounds = await prisma.herbActiveCompound.findMany({
    select: {
      herbId: true,
      targets: { select: { target: { select: { geneSymbol: true } } } },
    },
  });
  const map = new Map<string, Set<string>>();
  for (const c of compounds) {
    let set = map.get(c.herbId);
    if (!set) {
      set = new Set<string>();
      map.set(c.herbId, set);
    }
    for (const t of c.targets) set.add(t.target.geneSymbol);
  }
  return map;
}

// ── Scoring ──────────────────────────────────────────────────────────

export interface NetworkFit {
  overlap: number; // number of shared genes
  sharedGenes: string[];
  /** overlap normalised by disease set size, 0..1 */
  coverage: number;
}

export function scoreNetworkFit(herbGenes: Set<string> | undefined, diseaseGenes: Set<string>): NetworkFit {
  if (!herbGenes || herbGenes.size === 0 || diseaseGenes.size === 0) {
    return { overlap: 0, sharedGenes: [], coverage: 0 };
  }
  const shared: string[] = [];
  for (const g of herbGenes) {
    if (diseaseGenes.has(g)) shared.push(g);
  }
  return {
    overlap: shared.length,
    sharedGenes: shared.sort(),
    coverage: diseaseGenes.size ? shared.length / diseaseGenes.size : 0,
  };
}

// ── Pathway enrichment ───────────────────────────────────────────────

export interface EnrichedPathway {
  code: string;
  name: string;
  category: string | null;
  hitGenes: string[]; // intersection of the query gene set with pathway members (within our graph)
  pathwaySize: number; // pathway members present as ProteinTarget in our graph
  enrichment: number; // hitGenes / pathwaySize, 0..1
}

/**
 * Rank pathways by how many of `genes` map into them. Pathway size is taken
 * over targets that exist in our graph (so enrichment stays comparable across
 * pathways at the resolution of our herb library).
 */
export async function enrichPathways(genes: Iterable<string>, limit = 10): Promise<EnrichedPathway[]> {
  const geneSet = new Set(genes);
  if (geneSet.size === 0) return [];

  const pathways = await prisma.pathway.findMany({
    select: {
      code: true,
      name: true,
      category: true,
      targetLinks: { select: { target: { select: { geneSymbol: true } } } },
    },
  });

  const out: EnrichedPathway[] = [];
  for (const p of pathways) {
    const members = p.targetLinks.map((l) => l.target.geneSymbol);
    const hits = members.filter((g) => geneSet.has(g));
    if (hits.length === 0) continue;
    out.push({
      code: p.code,
      name: p.name,
      category: p.category,
      hitGenes: hits.sort(),
      pathwaySize: members.length,
      enrichment: members.length ? hits.length / members.length : 0,
    });
  }
  // Most hits first; break ties by enrichment ratio.
  out.sort((a, b) => b.hitGenes.length - a.hitGenes.length || b.enrichment - a.enrichment);
  return out.slice(0, limit);
}

// ── Repurposing ──────────────────────────────────────────────────────

export interface HerbCandidate {
  herbId: string;
  chineseName: string;
  pinyinName: string;
  category: string;
  overlap: number;
  sharedGenes: string[];
}

export interface FormulaCandidate {
  formulaId: string;
  chineseName: string;
  pinyinName: string;
  overlap: number; // distinct disease genes hit across all member herbs
  sharedGenes: string[];
  contributingHerbs: { chineseName: string; overlap: number }[];
}

export interface RepurposingResult {
  diseaseId: string;
  diseaseGenes: string[];
  herbs: HerbCandidate[];
  formulas: FormulaCandidate[];
  enrichedPathways: EnrichedPathway[];
}

/**
 * For a disease, rank herbs and classical formulas by how strongly their
 * molecular targets overlap the disease gene set. Formula overlap is the
 * union of its member herbs' shared genes (multi-component synergy).
 */
export async function repurposingCandidates(
  diseaseId: string,
  opts: { herbLimit?: number; formulaLimit?: number } = {},
): Promise<RepurposingResult> {
  const herbLimit = opts.herbLimit ?? 15;
  const formulaLimit = opts.formulaLimit ?? 12;

  const diseaseGenes = await diseaseGeneSet(diseaseId);
  const targetMap = await herbTargetMap();

  // Score every herb that has targets.
  const herbMeta = await prisma.herb.findMany({
    where: { id: { in: [...targetMap.keys()] } },
    select: { id: true, chineseName: true, pinyinName: true, category: true },
  });
  const metaById = new Map(herbMeta.map((h) => [h.id, h]));

  const herbScores = new Map<string, HerbCandidate>();
  for (const [herbId, genes] of targetMap) {
    const fit = scoreNetworkFit(genes, diseaseGenes);
    if (fit.overlap === 0) continue;
    const meta = metaById.get(herbId);
    if (!meta) continue;
    herbScores.set(herbId, {
      herbId,
      chineseName: meta.chineseName,
      pinyinName: meta.pinyinName,
      category: meta.category,
      overlap: fit.overlap,
      sharedGenes: fit.sharedGenes,
    });
  }

  const herbs = [...herbScores.values()].sort((a, b) => b.overlap - a.overlap).slice(0, herbLimit);

  // Aggregate to formulas via their member herbs.
  const formulaHerbs = await prisma.formulaHerb.findMany({
    where: { herbId: { in: [...herbScores.keys()] } },
    select: {
      herbId: true,
      formula: { select: { id: true, chineseName: true, pinyinName: true, status: true } },
    },
  });

  interface FAgg {
    formulaId: string;
    chineseName: string;
    pinyinName: string;
    genes: Set<string>;
    herbs: { chineseName: string; overlap: number }[];
  }
  const formAgg = new Map<string, FAgg>();
  for (const fh of formulaHerbs) {
    if (fh.formula.status !== "PUBLISHED") continue;
    const hc = herbScores.get(fh.herbId);
    if (!hc) continue;
    let agg = formAgg.get(fh.formula.id);
    if (!agg) {
      agg = {
        formulaId: fh.formula.id,
        chineseName: fh.formula.chineseName,
        pinyinName: fh.formula.pinyinName,
        genes: new Set<string>(),
        herbs: [],
      };
      formAgg.set(fh.formula.id, agg);
    }
    for (const g of hc.sharedGenes) agg.genes.add(g);
    agg.herbs.push({ chineseName: hc.chineseName, overlap: hc.overlap });
  }

  const formulas: FormulaCandidate[] = [...formAgg.values()]
    .map((a) => ({
      formulaId: a.formulaId,
      chineseName: a.chineseName,
      pinyinName: a.pinyinName,
      overlap: a.genes.size,
      sharedGenes: [...a.genes].sort(),
      contributingHerbs: a.herbs.sort((x, y) => y.overlap - x.overlap),
    }))
    .sort((a, b) => b.overlap - a.overlap || b.contributingHerbs.length - a.contributingHerbs.length)
    .slice(0, formulaLimit);

  // Pathways enriched by the union of all shared genes (the disease-relevant
  // slice of our graph that herbs actually hit).
  const hitGenes = new Set<string>();
  for (const h of herbs) for (const g of h.sharedGenes) hitGenes.add(g);
  const enrichedPathways = await enrichPathways(hitGenes);

  return {
    diseaseId,
    diseaseGenes: [...diseaseGenes].sort(),
    herbs,
    formulas,
    enrichedPathways,
  };
}

// ── Target provenance ────────────────────────────────────────────────

export type TargetSource = "curated" | "LLM" | "mixed";

/**
 * Global provenance per gene: "curated" if any curated compound-target edge
 * supports it, "LLM" if only LLM-proposed edges do, "mixed" if both. Lets the
 * UI flag lower-confidence (LLM-only) targets distinctly from curated ones.
 */
export async function targetSourceMap(): Promise<Map<string, TargetSource>> {
  const rows = await prisma.compoundTarget.findMany({
    select: { source: true, target: { select: { geneSymbol: true } } },
  });
  const seen = new Map<string, { curated: boolean; llm: boolean }>();
  for (const r of rows) {
    const g = r.target.geneSymbol;
    const s = seen.get(g) ?? { curated: false, llm: false };
    if (r.source === "curated") s.curated = true;
    else s.llm = true; // any non-curated source (e.g. "LLM") is lower-confidence tier
    seen.set(g, s);
  }
  const out = new Map<string, TargetSource>();
  for (const [g, s] of seen) {
    out.set(g, s.curated && s.llm ? "mixed" : s.curated ? "curated" : "LLM");
  }
  return out;
}

/** Tailwind classes for a gene chip, colored by provenance. */
export function geneChipClass(src: TargetSource | undefined): string {
  if (src === "LLM") return "border border-dashed border-amber-400 bg-amber-500/10 text-amber-700";
  return "bg-emerald-500/10 text-emerald-700";
}

// ── Experimental druggability (BindingDB) ────────────────────────────

export interface Druggability {
  count: number;
  type: string;
  nm: number;
}

/** geneSymbol → BindingDB experimental druggability (measured binders + best affinity). */
export async function targetDruggabilityMap(): Promise<Map<string, Druggability>> {
  const rows = await prisma.proteinTarget.findMany({
    where: { bindingdbCount: { not: null } },
    select: { geneSymbol: true, bindingdbCount: true, bestAffinityType: true, bestAffinityNm: true },
  });
  const m = new Map<string, Druggability>();
  for (const r of rows) m.set(r.geneSymbol, { count: r.bindingdbCount ?? 0, type: r.bestAffinityType ?? "", nm: r.bestAffinityNm ?? 0 });
  return m;
}

function fmtNm(nm: number): string {
  if (nm <= 0) return "—";
  if (nm < 1) return `${(nm * 1000).toPrecision(2)} pM`;
  if (nm >= 1000) return `${(nm / 1000).toPrecision(2)} µM`;
  return `${nm} nM`;
}

/** Hover title summarising a target's experimental binding data. */
export function druggabilityTitle(d: Druggability | undefined, zh: boolean): string | undefined {
  if (!d) return undefined;
  return zh
    ? `BindingDB：${d.count} 個實測配體，最佳 ${d.type}=${fmtNm(d.nm)}`
    : `BindingDB: ${d.count} measured binders, best ${d.type}=${fmtNm(d.nm)}`;
}

// ── Per-formula network profile ──────────────────────────────────────

export interface DiseaseAlignment {
  diseaseId: string;
  diseaseName: string;
  overlap: number;
  sharedGenes: string[];
}

export interface FormulaNetworkProfile {
  formulaId: string;
  targets: string[]; // union of member-herb molecular targets
  enrichedPathways: EnrichedPathway[];
  diseaseAlignment: DiseaseAlignment[]; // catalog diseases ranked by target overlap
}

/**
 * Molecular-target profile of one formula: the union of its member herbs'
 * targets, the pathways those targets enrich, and which catalog diseases the
 * formula's targets best align with (target overlap = repurposing signal).
 */
export async function formulaNetworkProfile(formulaId: string): Promise<FormulaNetworkProfile> {
  const memberHerbs = await prisma.formulaHerb.findMany({
    where: { formulaId },
    select: { herbId: true },
  });
  const herbIds = new Set(memberHerbs.map((h) => h.herbId));
  const targetMap = await herbTargetMap();

  const targets = new Set<string>();
  for (const id of herbIds) {
    const genes = targetMap.get(id);
    if (genes) for (const g of genes) targets.add(g);
  }

  const enrichedPathways = await enrichPathways(targets, 8);

  // Disease alignment: overlap of the formula's targets with each disease gene set.
  const diseaseGeneRows = await prisma.diseaseGene.findMany({
    select: { diseaseId: true, diseaseName: true, geneSymbol: true },
  });
  const byDisease = new Map<string, { name: string; genes: Set<string> }>();
  for (const r of diseaseGeneRows) {
    let d = byDisease.get(r.diseaseId);
    if (!d) {
      d = { name: r.diseaseName, genes: new Set<string>() };
      byDisease.set(r.diseaseId, d);
    }
    d.genes.add(r.geneSymbol);
  }

  const diseaseAlignment: DiseaseAlignment[] = [];
  for (const [diseaseId, d] of byDisease) {
    const fit = scoreNetworkFit(targets, d.genes);
    if (fit.overlap === 0) continue;
    diseaseAlignment.push({ diseaseId, diseaseName: d.name, overlap: fit.overlap, sharedGenes: fit.sharedGenes });
  }
  diseaseAlignment.sort((a, b) => b.overlap - a.overlap);

  return { formulaId, targets: [...targets].sort(), enrichedPathways, diseaseAlignment };
}
