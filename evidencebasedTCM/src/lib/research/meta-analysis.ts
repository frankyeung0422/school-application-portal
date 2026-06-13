import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "./disease-catalog";
import { diseaseKeywords, textMatchesDisease } from "./disease-match";

/**
 * Random-effects meta-analysis (DerSimonian–Laird inverse-variance) over the
 * effect sizes the GRADE extractor pulls into EvidenceEntry. Pools per disease,
 * grouped by metric (ratio measures OR/RR/HR pooled in log space; SMD/MD on the
 * natural scale). Reports pooled estimate + 95% CI, I² heterogeneity, and the
 * per-study data needed to draw a forest plot.
 *
 * Caveat: this pools whatever the abstract-level extractor captured (one primary
 * effect per study, assumed reported as intervention-vs-control). It is an
 * indicative synthesis, not a registered systematic review.
 */

const RATIO = new Set(["OR", "RR", "HR"]);

export interface ForestStudy {
  id: string;
  title: string;
  year: number | null;
  value: number;
  ciLow: number;
  ciHigh: number;
  weightPct: number;
}

export interface PooledResult {
  metric: string;
  k: number;
  pooledValue: number;
  ciLow: number;
  ciHigh: number;
  i2: number; // 0..100
  noEffectLine: number; // 1 for ratio metrics, 0 for SMD/MD
  significant: boolean; // CI excludes the no-effect line
}

export interface MetaGroup {
  pooled: PooledResult;
  studies: ForestStudy[];
}

export interface DiseaseMetaAnalysis {
  diseaseId: string;
  diseaseName: string;
  totalWithEffect: number;
  groups: MetaGroup[];
}

interface Row {
  id: string;
  title: string;
  year: number | null;
  effectMetric: string | null;
  effectValue: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  summary: string | null;
  population: string | null;
  intervention: string | null;
  primaryOutcome: string | null;
}

function poolGroup(metric: string, rows: Row[]): MetaGroup | null {
  const ratio = RATIO.has(metric);
  // Transform to analysis scale (y, se).
  const studies = rows
    .map((r) => {
      const v = r.effectValue!, lo = r.ciLow!, hi = r.ciHigh!;
      if (ratio && (v <= 0 || lo <= 0 || hi <= 0)) return null;
      const y = ratio ? Math.log(v) : v;
      const se = (ratio ? Math.log(hi) - Math.log(lo) : hi - lo) / (2 * 1.96);
      if (!(se > 0) || !Number.isFinite(y)) return null;
      return { r, y, se, v: 1 / (se * se) }; // v = inverse variance weight
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (studies.length < 2) return null;

  const sumW = studies.reduce((s, x) => s + x.v, 0);
  const yF = studies.reduce((s, x) => s + x.v * x.y, 0) / sumW;
  const q = studies.reduce((s, x) => s + x.v * (x.y - yF) ** 2, 0);
  const df = studies.length - 1;
  const sumW2 = studies.reduce((s, x) => s + x.v * x.v, 0);
  const c = sumW - sumW2 / sumW;
  const tau2 = c > 0 ? Math.max(0, (q - df) / c) : 0;

  // Random-effects weights.
  const wStar = studies.map((x) => ({ ...x, w: 1 / (x.se * x.se + tau2) }));
  const sumWStar = wStar.reduce((s, x) => s + x.w, 0);
  const yR = wStar.reduce((s, x) => s + x.w * x.y, 0) / sumWStar;
  const seR = Math.sqrt(1 / sumWStar);
  const i2 = q > df ? Math.max(0, ((q - df) / q) * 100) : 0;

  const back = (y: number) => (ratio ? Math.exp(y) : y);
  const r1 = (n: number) => Math.round(n * 100) / 100;
  const pooledValue = r1(back(yR));
  const ciLow = r1(back(yR - 1.96 * seR));
  const ciHigh = r1(back(yR + 1.96 * seR));
  const noEffectLine = ratio ? 1 : 0;
  const significant = ratio ? ciHigh < 1 || ciLow > 1 : ciHigh < 0 || ciLow > 0;

  const forest: ForestStudy[] = wStar
    .map((x) => ({
      id: x.r.id,
      title: x.r.title,
      year: x.r.year,
      value: r1(x.r.effectValue!),
      ciLow: r1(x.r.ciLow!),
      ciHigh: r1(x.r.ciHigh!),
      weightPct: r1((x.w / sumWStar) * 100),
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  return {
    pooled: { metric, k: studies.length, pooledValue, ciLow, ciHigh, i2: r1(i2), noEffectLine, significant },
    studies: forest,
  };
}

export async function buildDiseaseMetaAnalysis(diseaseId: string): Promise<DiseaseMetaAnalysis | null> {
  const disease = DISEASE_CATALOG.find((d) => d.id === diseaseId);
  if (!disease) return null;

  const rows = (await prisma.evidenceEntry.findMany({
    where: { status: "PUBLISHED", effectMetric: { not: null }, effectValue: { not: null }, ciLow: { not: null }, ciHigh: { not: null } },
    select: {
      id: true, title: true, year: true, effectMetric: true, effectValue: true, ciLow: true, ciHigh: true,
      summary: true, population: true, intervention: true, primaryOutcome: true,
    },
  })) as Row[];

  const kw = diseaseKeywords(disease);
  const matched = rows.filter((r) =>
    textMatchesDisease(`${r.title} ${r.summary ?? ""} ${r.population ?? ""} ${r.intervention ?? ""} ${r.primaryOutcome ?? ""}`, kw),
  );
  if (matched.length === 0) return null;

  const byMetric = new Map<string, Row[]>();
  for (const r of matched) {
    const m = r.effectMetric!;
    const arr = byMetric.get(m) ?? [];
    arr.push(r);
    byMetric.set(m, arr);
  }

  const groups: MetaGroup[] = [];
  for (const [metric, rs] of byMetric) {
    const g = poolGroup(metric, rs);
    if (g) groups.push(g);
  }
  // Most-studies group first.
  groups.sort((a, b) => b.pooled.k - a.pooled.k);

  return { diseaseId, diseaseName: disease.nameZh, totalWithEffect: matched.length, groups };
}
