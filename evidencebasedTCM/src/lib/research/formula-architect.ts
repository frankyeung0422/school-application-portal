import { prisma } from "@/lib/db/prisma";
import type { DiseaseTarget } from "./disease-catalog";
import {
  diseaseGeneSet,
  herbTargetMap,
  scoreNetworkFit,
  enrichPathways,
} from "./network-pharmacology";

/**
 * Formula Architect — a TCM "medical mind" that:
 * 1. Analyzes disease pathology through multi-pattern differentiation
 * 2. Derives treatment principles from pattern analysis
 * 3. Selects herbs using scoring: actions match + evidence + meridian fit + nature balance
 * 4. Assembles novel formulas in Jun-Chen-Zuo-Shi (君臣佐使) structure
 * 5. Proposes multi-formula protocols for complex diseases
 * 6. Cross-checks safety (herb-herb interactions, contraindications)
 */

// ── Types ────────────────────────────────────────────────────────────

export interface HerbCandidate {
  id: string;
  pinyinName: string;
  chineseName: string;
  category: string;
  nature: string;
  flavor: string[];
  meridianTropism: string[];
  dosageRange: string | null;
  description: string | null;
  score: number;
  scoreBreakdown: {
    actionMatch: number;
    evidenceWeight: number;
    meridianFit: number;
    categoryFit: number;
    networkFit: number;
  };
  sharedGenes?: string[];
  role?: "JUN" | "CHEN" | "ZUO" | "SHI";
  roleDosage?: string;
  roleRationale?: string;
}

export interface NovelFormula {
  name: string;
  chineseName: string;
  rationale: string;
  treatmentPrinciple: string;
  targetPatterns: string[];
  herbs: HerbCandidate[];
  natureBalance: { warm: number; cool: number; neutral: number };
  flavorProfile: Record<string, number>;
  meridianCoverage: string[];
  modifications: FormulaModification[];
  safetyWarnings: string[];
  dosageInstructions: string;
  courseDuration: string;
}

export interface FormulaModification {
  condition: string;
  add: string[];
  remove: string[];
  rationale: string;
}

export interface MultiFormulaProtocol {
  name: string;
  phases: ProtocolPhase[];
  lifestyleIntegration: string[];
  monitoringPlan: string[];
}

export interface ProtocolPhase {
  phase: string;
  duration: string;
  formula: NovelFormula;
  acupoints: string[];
  focus: string;
}

export interface InnovationReport {
  disease: DiseaseTarget;
  analysis: DiseaseAnalysis;
  primaryFormula: NovelFormula;
  alternateFormulas: NovelFormula[];
  combinationProtocol: MultiFormulaProtocol;
  innovativeInsights: string[];
  mechanismHypotheses: string[];
}

export interface DiseaseAnalysis {
  primaryPathology: string;
  secondaryPathologies: string[];
  affectedOrgans: string[];
  treatmentPrinciples: string[];
  therapeuticStrategy: string;
  innovationOpportunities: string[];
}

// ── TCM Knowledge Rules ──────────────────────────────────────────────

const PATHOLOGY_TREATMENTS: Record<string, { principles: string[]; categoryNeeds: string[]; naturePref: string }> = {
  YIN_DEFICIENCY: { principles: ["滋陰", "養陰", "清虛熱"], categoryNeeds: ["Yin Tonifying", "Heat Clearing"], naturePref: "COOL" },
  YANG_DEFICIENCY: { principles: ["溫陽", "補火", "益腎"], categoryNeeds: ["Yang Tonifying", "Interior Warming"], naturePref: "WARM" },
  QI_DEFICIENCY: { principles: ["補氣", "益氣", "健脾"], categoryNeeds: ["Qi Tonifying"], naturePref: "WARM" },
  BLOOD_DEFICIENCY: { principles: ["補血", "養血", "滋陰養血"], categoryNeeds: ["Blood Tonifying"], naturePref: "WARM" },
  HEAT: { principles: ["清熱", "瀉火", "涼血"], categoryNeeds: ["Heat Clearing"], naturePref: "COLD" },
  COLD: { principles: ["溫中", "散寒", "回陽"], categoryNeeds: ["Interior Warming"], naturePref: "HOT" },
  DAMPNESS: { principles: ["利濕", "化濕", "健脾祛濕"], categoryNeeds: ["Dampness Draining", "Aromatic Dampness Dissolving"], naturePref: "WARM" },
  PHLEGM: { principles: ["化痰", "祛痰", "燥濕化痰"], categoryNeeds: ["Phlegm Resolving"], naturePref: "WARM" },
  STAGNATION: { principles: ["疏肝", "理氣", "行氣活血"], categoryNeeds: ["Qi Regulating", "Blood Activating"], naturePref: "WARM" },
  BLOOD_STASIS: { principles: ["活血", "化瘀", "通絡"], categoryNeeds: ["Blood Activating"], naturePref: "WARM" },
  WIND: { principles: ["祛風", "息風", "平肝息風"], categoryNeeds: ["Wind Extinguishing"], naturePref: "NEUTRAL" },
  DEFICIENCY: { principles: ["補虛", "扶正"], categoryNeeds: ["Qi Tonifying", "Blood Tonifying"], naturePref: "WARM" },
  EXCESS: { principles: ["瀉實", "攻下"], categoryNeeds: ["Purgatives"], naturePref: "COLD" },
};

const ORGAN_MERIDIAN: Record<string, string[]> = {
  Spleen: ["Spleen", "Stomach"],
  Kidney: ["Kidney", "Bladder"],
  Liver: ["Liver", "Gallbladder"],
  Heart: ["Heart", "Small Intestine", "Pericardium"],
  Lung: ["Lung", "Large Intestine"],
};

// Flavor therapeutic properties
const FLAVOR_ACTIONS: Record<string, string> = {
  Sweet: "補益和中",
  Bitter: "清熱燥濕、瀉火",
  Pungent: "發散行氣",
  Sour: "收斂固澀",
  Salty: "軟堅散結",
  Astringent: "收斂止瀉",
  Bland: "滲濕利水",
};

// ── Shared type for herb with all relations loaded ───────────────────
type HerbWithRelations = Awaited<ReturnType<typeof fetchHerbsWithRelations>>[number];

async function fetchHerbsWithRelations() {
  return prisma.herb.findMany({
    where: { status: "PUBLISHED" },
    include: {
      activeCompounds: true,
      evidenceLinks: { include: { evidence: { select: { evidenceGrade: true } } } },
      herbInteractionsA: { include: { herbB: { select: { id: true, pinyinName: true } } } },
      herbInteractionsB: { include: { herbA: { select: { id: true, pinyinName: true } } } },
      contraindications: true,
    },
  });
}

type PatternWithRelations = Awaited<ReturnType<typeof fetchPatterns>>[number];

async function fetchPatterns(enumHints: string[], textHints: string[]) {
  return prisma.tcmPattern.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        ...enumHints.map((h) => ({ pathologyType: { equals: h as never } })),
        ...textHints.flatMap((h) => [
          { chineseName: { contains: h } },
          { keySymptoms: { contains: h } },
        ]),
      ],
    },
    include: {
      patternFormulas: { include: { formula: { include: { herbs: { include: { herb: true } } } } } },
      patternAcupoints: { include: { acupoint: true } },
    },
    take: 8,
  });
}

// ── Core Engine ──────────────────────────────────────────────────────

export async function craftInnovativeFormulas(disease: DiseaseTarget): Promise<InnovationReport> {
  // 1. Fetch all herbs with their interactions
  const allHerbs = await fetchHerbsWithRelations();

  // 2. Fetch patterns matching this disease
  const PATHOLOGY_ENUMS = new Set(Object.keys(PATHOLOGY_TREATMENTS));
  const enumHints = disease.commonPatternHints.filter((h) => PATHOLOGY_ENUMS.has(h));
  const textHints = disease.commonPatternHints.filter((h) => !PATHOLOGY_ENUMS.has(h));
  const patterns = await fetchPatterns(enumHints, textHints);

  // 3. Analyze disease
  const analysis = analyzeDiseaseDeep(disease, patterns);

  // 3b. Load the network-pharmacology graph slice for this disease.
  const diseaseGenes = await diseaseGeneSet(disease.id);
  const targetMap = await herbTargetMap();

  // 4. Score all herbs for this disease (incl. molecular target overlap)
  const scoredHerbs = scoreHerbs(allHerbs, disease, analysis, diseaseGenes, targetMap);

  // 5. Assemble primary novel formula
  const primaryFormula = assembleFormula(
    scoredHerbs,
    analysis,
    disease,
    allHerbs,
    "primary",
  );

  // 6. Build alternate formulas for secondary patterns
  const alternateFormulas = analysis.secondaryPathologies.slice(0, 2).map((pathology, i) => {
    const altAnalysis = { ...analysis, primaryPathology: pathology, treatmentPrinciples: PATHOLOGY_TREATMENTS[pathology]?.principles ?? [] };
    const altScored = scoreHerbs(allHerbs, disease, altAnalysis, diseaseGenes, targetMap);
    return assembleFormula(altScored, altAnalysis, disease, allHerbs, `alt-${i + 1}`);
  });

  // 7. Design multi-phase protocol
  const acupointCodes = patterns
    .flatMap((p) => p.patternAcupoints.map((pa) => pa.acupoint.code))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);

  const combinationProtocol = designProtocol(disease, primaryFormula, alternateFormulas, analysis, acupointCodes);

  // 8. Generate innovation insights (data-grounded via the network graph)
  const innovativeInsights = await generateInsights(disease, analysis, allHerbs, patterns, diseaseGenes, targetMap);
  const mechanismHypotheses = await generateMechanisms(disease, primaryFormula, allHerbs, diseaseGenes, targetMap);

  return {
    disease,
    analysis,
    primaryFormula,
    alternateFormulas,
    combinationProtocol,
    innovativeInsights,
    mechanismHypotheses,
  };
}

// ── Disease Analysis ─────────────────────────────────────────────────

function analyzeDiseaseDeep(
  disease: DiseaseTarget,
  patterns: PatternWithRelations[],
): DiseaseAnalysis {
  const pathologies = disease.commonPatternHints.filter((h) => h in PATHOLOGY_TREATMENTS);
  const primaryPathology = pathologies[0] ?? "QI_DEFICIENCY";
  const secondaryPathologies = pathologies.slice(1);

  const affectedOrgans: string[] = [];
  for (const p of patterns) {
    if (p.organSystem && !affectedOrgans.includes(p.organSystem)) {
      affectedOrgans.push(p.organSystem);
    }
  }
  if (affectedOrgans.length === 0) {
    affectedOrgans.push("Spleen", "Kidney");
  }

  const treatmentPrinciples = pathologies.flatMap(
    (p) => PATHOLOGY_TREATMENTS[p]?.principles ?? [],
  ).filter((v, i, a) => a.indexOf(v) === i);

  const therapeuticStrategy = buildStrategy(disease, primaryPathology, secondaryPathologies, affectedOrgans);

  const innovationOpportunities = [
    `多靶點組合：同時針對 ${pathologies.join(" + ")} 的複合病機`,
    affectedOrgans.length > 1 ? `跨臟腑協調：${affectedOrgans.join("、")} 同治` : null,
    "腸道菌群-代謝軸：利用中藥多糖與小分子調節微生態",
    `時序療法：按晝夜節律分配不同方劑`,
    "現代活性成分與傳統配伍規律的交叉驗證",
  ].filter((x): x is string => !!x);

  return {
    primaryPathology,
    secondaryPathologies,
    affectedOrgans,
    treatmentPrinciples,
    therapeuticStrategy,
    innovationOpportunities,
  };
}

function buildStrategy(disease: DiseaseTarget, primary: string, secondary: string[], organs: string[]): string {
  const phases = [];
  phases.push(`第一階段：以${PATHOLOGY_TREATMENTS[primary]?.principles[0] ?? "扶正"}為主，兼顧${secondary[0] ? PATHOLOGY_TREATMENTS[secondary[0]]?.principles[0] ?? "祛邪" : "祛邪"}`);
  if (secondary.length > 1) {
    phases.push(`第二階段：鞏固${PATHOLOGY_TREATMENTS[primary]?.principles[0] ?? ""}成效，加強${secondary.slice(1).map((s) => PATHOLOGY_TREATMENTS[s]?.principles[0]).filter(Boolean).join("、")}`);
  }
  phases.push("第三階段：調和善後，防止復發，配合生活調養。");
  return phases.join("。");
}

// ── Herb Scoring ─────────────────────────────────────────────────────

function scoreHerbs(
  allHerbs: HerbWithRelations[],
  disease: DiseaseTarget,
  analysis: DiseaseAnalysis,
  diseaseGenes: Set<string>,
  targetMap: Map<string, Set<string>>,
): HerbCandidate[] {
  const targetMeridians = analysis.affectedOrgans.flatMap((o) => ORGAN_MERIDIAN[o] ?? []);
  const targetCategories = [analysis.primaryPathology, ...analysis.secondaryPathologies]
    .flatMap((p) => PATHOLOGY_TREATMENTS[p]?.categoryNeeds ?? []);
  const allKeywords = [...disease.tcmTermsZh, ...disease.keywordsZh];

  return allHerbs
    .map((h) => {
      const desc = h.description ?? "";

      // Action match: how well herb's description matches disease keywords
      let actionMatch = 0;
      for (const kw of allKeywords) {
        if (desc.includes(kw)) actionMatch += 2;
      }
      for (const tp of analysis.treatmentPrinciples) {
        if (desc.includes(tp)) actionMatch += 3;
      }

      // Evidence weight: Grade A = 10, B = 5, C = 2, D = 1
      const evidenceWeight = h.evidenceLinks.reduce((sum, l) => {
        const g = l.evidence.evidenceGrade;
        return sum + (g === "A" ? 10 : g === "B" ? 5 : g === "C" ? 2 : 1);
      }, 0);

      // Meridian fit
      const meridianFit = h.meridianTropism.filter((m) => targetMeridians.includes(m)).length * 3;

      // Category fit
      const categoryFit = targetCategories.includes(h.category) ? 8 : 0;

      // Network fit: molecular target overlap with the disease gene set.
      // Each shared target is worth 4 pts — meaningful, but evidence + actions
      // still dominate so target-only herbs don't crowd out the classics.
      const fit = scoreNetworkFit(targetMap.get(h.id), diseaseGenes);
      const networkFit = fit.overlap * 4;

      const score = actionMatch + evidenceWeight + meridianFit + categoryFit + networkFit;

      return {
        id: h.id,
        pinyinName: h.pinyinName,
        chineseName: h.chineseName,
        category: h.category,
        nature: h.nature,
        flavor: h.flavor,
        meridianTropism: h.meridianTropism,
        dosageRange: h.dosageRange,
        description: h.description,
        score,
        scoreBreakdown: { actionMatch, evidenceWeight, meridianFit, categoryFit, networkFit },
        sharedGenes: fit.sharedGenes,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Formula Assembly ─────────────────────────────────────────────────

function assembleFormula(
  ranked: HerbCandidate[],
  analysis: DiseaseAnalysis,
  disease: DiseaseTarget,
  allHerbs: HerbWithRelations[],
  variant: string,
): NovelFormula {
  const selected: HerbCandidate[] = [];
  const usedIds = new Set<string>();

  // Build interaction lookup for safety
  const dangerousPairs = new Set<string>();
  for (const h of allHerbs) {
    for (const ia of h.herbInteractionsA) {
      if (ia.severity === "MAJOR") {
        dangerousPairs.add(`${h.id}|${ia.herbB.id}`);
        dangerousPairs.add(`${ia.herbB.id}|${h.id}`);
      }
    }
    for (const ib of h.herbInteractionsB) {
      if (ib.severity === "MAJOR") {
        dangerousPairs.add(`${h.id}|${ib.herbA.id}`);
        dangerousPairs.add(`${ib.herbA.id}|${h.id}`);
      }
    }
  }

  const isSafe = (candidate: HerbCandidate) =>
    ![...usedIds].some((id) => dangerousPairs.has(`${id}|${candidate.id}`));

  // JUN (Emperor) — 1-2 herbs with highest score, directly treating primary pathology
  const junHerbs = ranked
    .filter((h) => h.scoreBreakdown.actionMatch >= 4 && isSafe(h))
    .slice(0, 2);
  for (const h of junHerbs) {
    const dosage = scaleDosage(h.dosageRange, 1.3);
    selected.push({
      ...h,
      role: "JUN",
      roleDosage: dosage,
      roleRationale: `主攻${analysis.treatmentPrinciples[0] ?? "核心病機"}，為全方核心`,
    });
    usedIds.add(h.id);
  }

  // CHEN (Minister) — 2-3 herbs supporting the Jun, possibly targeting secondary pathology
  const chenHerbs = ranked
    .filter((h) => !usedIds.has(h.id) && h.score > 5 && isSafe(h))
    .slice(0, 3);
  for (const h of chenHerbs) {
    const dosage = scaleDosage(h.dosageRange, 1.0);
    selected.push({
      ...h,
      role: "CHEN",
      roleDosage: dosage,
      roleRationale: `輔助君藥，兼治${analysis.secondaryPathologies[0] ? PATHOLOGY_TREATMENTS[analysis.secondaryPathologies[0]]?.principles[0] ?? "兼證" : "兼證"}`,
    });
    usedIds.add(h.id);
  }

  // ZUO (Assistant) — 2-3 herbs that moderate, address side effects, or treat minor aspects
  const zuoHerbs = ranked
    .filter((h) => !usedIds.has(h.id) && isSafe(h) && h.score > 0)
    .slice(0, 3);
  for (const h of zuoHerbs) {
    const dosage = scaleDosage(h.dosageRange, 0.8);
    selected.push({
      ...h,
      role: "ZUO",
      roleDosage: dosage,
      roleRationale: "佐助君臣、制約偏性或針對次要病機",
    });
    usedIds.add(h.id);
  }

  // SHI (Envoy) — 1 herb that harmonizes or guides to target meridian
  const shiCandidates = ranked
    .filter((h) => !usedIds.has(h.id) && isSafe(h) && (h.pinyinName === "Gan Cao" || h.category === "Qi Regulating" || h.meridianTropism.length >= 3))
    .slice(0, 1);
  if (shiCandidates.length === 0 && ranked.length > usedIds.size) {
    const fallback = ranked.find((h) => !usedIds.has(h.id) && isSafe(h));
    if (fallback) shiCandidates.push(fallback);
  }
  for (const h of shiCandidates) {
    const dosage = scaleDosage(h.dosageRange, 0.5);
    selected.push({
      ...h,
      role: "SHI",
      roleDosage: dosage,
      roleRationale: "調和諸藥，引藥歸經",
    });
    usedIds.add(h.id);
  }

  // Nature balance analysis
  const natureBalance = { warm: 0, cool: 0, neutral: 0 };
  for (const h of selected) {
    if (h.nature === "HOT" || h.nature === "WARM") natureBalance.warm++;
    else if (h.nature === "COLD" || h.nature === "COOL") natureBalance.cool++;
    else natureBalance.neutral++;
  }

  // Flavor profile
  const flavorProfile: Record<string, number> = {};
  for (const h of selected) {
    for (const f of h.flavor) {
      flavorProfile[f] = (flavorProfile[f] ?? 0) + 1;
    }
  }

  // Meridian coverage
  const meridianCoverage = [...new Set(selected.flatMap((h) => h.meridianTropism))];

  // Safety warnings
  const safetyWarnings: string[] = [];
  for (const h of selected) {
    const herbData = allHerbs.find((ah) => ah.id === h.id);
    if (herbData) {
      for (const c of herbData.contraindications) {
        if (c.pregnancyCategory === "CONTRAINDICATED") {
          safetyWarnings.push(`${h.chineseName}：妊娠禁忌`);
        }
      }
    }
  }

  // Modifications
  const modifications: FormulaModification[] = [];
  if (analysis.secondaryPathologies.includes("DAMPNESS")) {
    modifications.push({
      condition: "濕邪偏重",
      add: ["茯苓 15g", "薏苡仁 20g"],
      remove: [],
      rationale: "加強利濕健脾",
    });
  }
  if (analysis.secondaryPathologies.includes("BLOOD_STASIS")) {
    modifications.push({
      condition: "血瘀明顯",
      add: ["丹參 15g", "川芎 10g"],
      remove: [],
      rationale: "活血化瘀通絡",
    });
  }
  if (analysis.secondaryPathologies.includes("HEAT")) {
    modifications.push({
      condition: "熱象明顯",
      add: ["黃芩 10g"],
      remove: selected.filter((h) => h.nature === "HOT").map((h) => `減量 ${h.chineseName}`),
      rationale: "清熱瀉火，調整寒熱平衡",
    });
  }
  modifications.push({
    condition: "脾胃虛弱、消化不良",
    add: ["炒白朮 10g", "陳皮 6g"],
    remove: [],
    rationale: "運脾助運，防止滋膩礙胃",
  });

  // Name generation
  const junNames = selected.filter((h) => h.role === "JUN").map((h) => h.chineseName.slice(0, 2));
  const formulaChineseName = `${junNames.join("")}${analysis.treatmentPrinciples[0]?.slice(0, 2) ?? "調"}方`;
  const formulaName = `${disease.nameEn.split(" ")[0]} Innovation Formula ${variant}`;

  return {
    name: formulaName,
    chineseName: formulaChineseName,
    rationale: `針對${disease.nameZh}（${disease.tcmTermsZh[0]}）之${analysis.primaryPathology}病機，以${analysis.treatmentPrinciples.slice(0, 3).join("、")}為治則，從${selected.length}味中藥的君臣佐使結構中組方。`,
    treatmentPrinciple: analysis.treatmentPrinciples.join("、"),
    targetPatterns: [analysis.primaryPathology, ...analysis.secondaryPathologies.slice(0, 2)],
    herbs: selected,
    natureBalance,
    flavorProfile,
    meridianCoverage,
    modifications,
    safetyWarnings,
    dosageInstructions: "水煎服，每日1劑，分早晚2次溫服。首煎加水500ml，煎至200ml；二煎加水400ml，煎至150ml。兩煎混勻分服。",
    courseDuration: "基礎療程4週，每2週複診調整。建議連續3個療程（12週）後評估療效。",
  };
}

function scaleDosage(range: string | null, factor: number): string {
  if (!range) return "6-12g";
  const m = range.match(/(\d+(?:\.\d+)?)\s*[-–~]\s*(\d+(?:\.\d+)?)/);
  if (!m) return range;
  const lo = Math.round(parseFloat(m[1]) * factor);
  const hi = Math.round(parseFloat(m[2]) * factor);
  return `${lo}-${hi}g`;
}

// ── Protocol Design ──────────────────────────────────────────────────

function designProtocol(
  disease: DiseaseTarget,
  primary: NovelFormula,
  alternates: NovelFormula[],
  analysis: DiseaseAnalysis,
  acupoints: string[],
): MultiFormulaProtocol {
  const phases: ProtocolPhase[] = [
    {
      phase: "Phase 1 · 攻邪/祛標",
      duration: "1–4 週",
      formula: primary,
      acupoints: acupoints.slice(0, 4),
      focus: `主攻${analysis.treatmentPrinciples[0] ?? "核心病機"}，針灸每週3次`,
    },
  ];

  if (alternates[0]) {
    phases.push({
      phase: "Phase 2 · 調理/鞏固",
      duration: "5–8 週",
      formula: alternates[0],
      acupoints: acupoints.slice(2, 6),
      focus: `鞏固Phase 1成效，加強${analysis.secondaryPathologies[0] ?? "兼證"}治療，針灸每週2次`,
    });
  }

  phases.push({
    phase: `Phase ${phases.length + 1} · 善後/預防`,
    duration: "9–12 週",
    formula: { ...primary, dosageInstructions: "減量至2/3劑量，隔日服用或製成丸劑長期調理。" },
    acupoints: acupoints.slice(0, 3),
    focus: "防止復發，調和陰陽，恢復臟腑功能，針灸每週1次",
  });

  return {
    name: `${disease.nameZh} 三階段創新方案`,
    phases,
    lifestyleIntegration: [
      "飲食：按證型調整——陰虛忌辛燥、陽虛忌生冷、痰濕忌甜膩",
      "運動：太極拳或八段錦 20–30 min/d（有 RCT 支持）",
      "情志：每日正念冥想 10 min，肝鬱者加疏肝功法",
      "起居：23:00 前入睡，子午覺（適用陰虛型）",
      "穴位按摩：每日自行按壓主穴 2–3 分鐘/穴",
    ],
    monitoringPlan: disease.priorityOutcomes.map((o) => `${o} — baseline, 4w, 8w, 12w`),
  };
}

// ── Insights & Mechanisms ────────────────────────────────────────────

async function generateInsights(
  disease: DiseaseTarget,
  analysis: DiseaseAnalysis,
  allHerbs: HerbWithRelations[],
  patterns: PatternWithRelations[],
  diseaseGenes: Set<string>,
  targetMap: Map<string, Set<string>>,
): Promise<string[]> {
  const insights: string[] = [];

  insights.push(
    `多維度組方策略：本方案同時覆蓋 ${analysis.affectedOrgans.join("、")} 等臟腑系統，打破傳統單一臟腑辨治模式。`,
  );

  const classicalFormulas = patterns.flatMap((p) => p.patternFormulas.map((pf) => pf.formula));
  if (classicalFormulas.length > 0) {
    const herbFreq = new Map<string, number>();
    for (const f of classicalFormulas) {
      for (const fh of f.herbs) {
        herbFreq.set(fh.herb.chineseName, (herbFreq.get(fh.herb.chineseName) ?? 0) + 1);
      }
    }
    const top = [...herbFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length > 0) {
      insights.push(
        `經典方劑交叉分析：在 ${classicalFormulas.length} 首相關經典方中，高頻核心藥物為 ${top.map(([n, c]) => `${n}(${c}首)`).join("、")}，提示這些藥物在本病治療中具有跨方共識。`,
      );
    }
  }

  // Network-pharmacology insight — grounded in the herb→target→disease graph.
  if (diseaseGenes.size > 0) {
    // Which of our herbs hit the most disease targets?
    const ranked = allHerbs
      .map((h) => ({ h, fit: scoreNetworkFit(targetMap.get(h.id), diseaseGenes) }))
      .filter((x) => x.fit.overlap > 0)
      .sort((a, b) => b.fit.overlap - a.fit.overlap);
    const hitGenes = new Set<string>();
    for (const r of ranked) for (const g of r.fit.sharedGenes) hitGenes.add(g);

    if (ranked.length > 0) {
      const topHerbs = ranked.slice(0, 5).map((r) => `${r.h.chineseName}(${r.fit.overlap})`);
      insights.push(
        `網絡藥理靶點分析：藥庫中有 ${ranked.length} 味中藥命中 ${disease.nameZh} 相關靶點（共 ${hitGenes.size}/${diseaseGenes.size} 個疾病基因被覆蓋），靶點命中數最高者為 ${topHerbs.join("、")}，為分子對接與機制驗證提供候選。`,
      );
      const pathways = await enrichPathways(hitGenes, 4);
      if (pathways.length > 0) {
        insights.push(
          `通路富集：命中靶點集中於 ${pathways.map((p) => `${p.name}(${p.hitGenes.length})`).join("、")} 等信號通路，提示組方可循「多成分-多靶點-多通路」協同切入。`,
        );
      }
    }
  }

  insights.push(
    "時序用藥創新：建議早晨服用偏於補氣升陽的藥物，晚間服用偏於滋陰安神的藥物，順應人體晝夜節律。",
  );

  return insights;
}

async function generateMechanisms(
  disease: DiseaseTarget,
  formula: NovelFormula,
  allHerbs: HerbWithRelations[],
  diseaseGenes: Set<string>,
  targetMap: Map<string, Set<string>>,
): Promise<string[]> {
  const hypotheses: string[] = [];

  const formulaHerbIds = new Set(formula.herbs.map((h) => h.id));
  const herbsWithCompounds = allHerbs.filter((h) => formulaHerbIds.has(h.id) && h.activeCompounds.length > 0);

  // 1. Real per-compound mechanism text from the seeded graph.
  for (const h of herbsWithCompounds) {
    for (const c of h.activeCompounds.slice(0, 2)) {
      if (c.mechanismOfAction) {
        hypotheses.push(`${h.chineseName}中${c.compoundName}的作用機制：${c.mechanismOfAction}`);
      }
    }
  }

  // 2. Multi-target synergy — grounded in the formula's actual disease-target hits.
  const formulaGenes = new Set<string>();
  for (const id of formulaHerbIds) {
    const genes = targetMap.get(id);
    if (genes) for (const g of genes) formulaGenes.add(g);
  }
  const sharedWithDisease = [...formulaGenes].filter((g) => diseaseGenes.has(g)).sort();

  if (sharedWithDisease.length > 0) {
    const pathways = await enrichPathways(sharedWithDisease, 4);
    const pathwayText = pathways.length
      ? pathways.map((p) => `${p.name}（命中 ${p.hitGenes.join("/")}）`).join("；")
      : "多條炎症與代謝通路";
    hypotheses.push(
      `多靶點協同假說：本方命中 ${disease.nameZh} 相關靶點 ${sharedWithDisease.slice(0, 12).join("、")}（共 ${sharedWithDisease.length} 個），富集於 ${pathwayText}，形成「多成分-多靶點-多通路」的網絡調控。`,
    );

    // 3. Conditional mechanism hypotheses keyed on which gene families are hit.
    const has = (g: string) => sharedWithDisease.includes(g);
    if (["TNF", "IL6", "NFKB1", "PTGS2", "IL1B"].some(has)) {
      const inflam = ["TNF", "IL6", "NFKB1", "PTGS2", "IL1B"].filter(has);
      hypotheses.push(
        `抗炎機制假說：方中成分經 ${inflam.join("、")} 抑制 NF-κB 介導的慢性低度炎症與促炎細胞因子釋放。`,
      );
    }
    if (["PPARG", "PRKAA1", "INSR", "SLC2A4", "PTPN1"].some(has)) {
      const metab = ["PPARG", "PRKAA1", "INSR", "SLC2A4", "PTPN1"].filter(has);
      hypotheses.push(
        `代謝調節假說：經 ${metab.join("、")}（AMPK/PPARγ/胰島素信號軸）改善能量與糖脂代謝。`,
      );
    }
    if (["BDNF", "SLC6A4", "GABRA1", "HTR1A", "ACHE", "MAOB"].some(has)) {
      const neuro = ["BDNF", "SLC6A4", "GABRA1", "HTR1A", "ACHE", "MAOB"].filter(has);
      hypotheses.push(
        `神經調節假說：經 ${neuro.join("、")} 調節單胺、GABA 能與神經營養信號，改善神志/睡眠相關症狀。`,
      );
    }
    if (["NFE2L2", "HMOX1", "GPX1", "SOD2"].some(has)) {
      const ox = ["NFE2L2", "HMOX1", "GPX1", "SOD2"].filter(has);
      hypotheses.push(`抗氧化機制假說：經 ${ox.join("、")}（Nrf2/HO-1 軸）增強內源抗氧化防禦、減輕氧化應激損傷。`);
    }
  } else {
    hypotheses.push(
      `機制待驗證：本方所選藥物目前在靶點庫中尚無與 ${disease.nameZh} 疾病基因的明確交集，建議補充網絡藥理數據後再評估分子機制。`,
    );
  }

  return hypotheses;
}
