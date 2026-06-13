import { prisma } from "@/lib/db/prisma";
import type { DiseaseTarget } from "./disease-catalog";

// Compose a structured, evidence-linked treatment proposal for a disease by mining
// the internal evidence graph. Pulls patterns, formulas, herbs, and acupoints that
// match the disease's TCM terms and pattern hints, ranking by linked evidence grade.

export interface ProposalHerb {
  id: string;
  name: string;
  chineseName: string;
  category: string;
  gradeA: number;
  gradeB: number;
  totalEvidence: number;
}

export interface ProposalFormula {
  id: string;
  name: string;
  chineseName: string;
  source: string | null;
  category: string;
  gradeA: number;
  gradeB: number;
  totalEvidence: number;
}

export interface ProposalAcupoint {
  id: string;
  code: string;
  name: string;
  meridian: string;
  totalEvidence: number;
}

export interface ProposalPattern {
  id: string;
  name: string;
  chineseName: string;
  pathologyType: string;
  keySymptoms: string | null;
  treatmentPrinciple: string | null;
}

export interface ProposalEvidence {
  id: string;
  title: string;
  studyType: string;
  evidenceGrade: string;
  year: number | null;
  journal: string | null;
  pubmedId: string | null;
  doi: string | null;
  summary: string | null;
}

export interface ResearchProposal {
  disease: DiseaseTarget;
  patterns: ProposalPattern[];
  formulas: ProposalFormula[];
  herbs: ProposalHerb[];
  acupoints: ProposalAcupoint[];
  evidence: ProposalEvidence[];
  externalQueries: {
    pubmed: string;
    cochrane: string;
    who: string;
    chinaCNKI: string;
  };
  synthesis: {
    headline: string;
    rationale: string;
    regimen: string[];
    lifestyle: string[];
    monitoring: string[];
    risks: string[];
  };
}

export async function buildProposal(disease: DiseaseTarget): Promise<ResearchProposal> {
  const enTerms = disease.keywordsEn;
  const zhTerms = [...disease.tcmTermsZh, ...disease.keywordsZh];
  const allTerms = [...enTerms, ...zhTerms];

  // 1. Find evidence entries mentioning any term (by indication / summary / title match).
  const evidence = await prisma.evidenceEntry.findMany({
    where: {
      status: "PUBLISHED",
      OR: allTerms.flatMap((term) => [
        { title: { contains: term, mode: "insensitive" as const } },
        { summary: { contains: term, mode: "insensitive" as const } },
        { population: { contains: term, mode: "insensitive" as const } },
        { intervention: { contains: term, mode: "insensitive" as const } },
        { primaryOutcome: { contains: term, mode: "insensitive" as const } },
      ]),
    },
    include: {
      herbLinks: { include: { herb: { select: { id: true, pinyinName: true, chineseName: true, category: true } } } },
      formulaLinks: {
        include: {
          formula: { select: { id: true, pinyinName: true, chineseName: true, category: true, sourceText: true } },
        },
      },
      acupointLinks: {
        include: { acupoint: { select: { id: true, code: true, pinyinName: true, chineseName: true, meridian: true } } },
      },
      patternLinks: true,
    },
    orderBy: [{ evidenceGrade: "asc" }, { year: "desc" }],
    take: 40,
  });

  // 2. Aggregate herb / formula / acupoint rankings by evidence count.
  const herbMap = new Map<string, ProposalHerb>();
  const formulaMap = new Map<string, ProposalFormula>();
  const acuMap = new Map<string, ProposalAcupoint>();

  for (const e of evidence) {
    for (const l of e.herbLinks) {
      const h = l.herb;
      const cur = herbMap.get(h.id) ?? {
        id: h.id,
        name: h.pinyinName,
        chineseName: h.chineseName,
        category: h.category,
        gradeA: 0,
        gradeB: 0,
        totalEvidence: 0,
      };
      cur.totalEvidence++;
      if (e.evidenceGrade === "A") cur.gradeA++;
      if (e.evidenceGrade === "B") cur.gradeB++;
      herbMap.set(h.id, cur);
    }
    for (const l of e.formulaLinks) {
      const f = l.formula;
      const cur = formulaMap.get(f.id) ?? {
        id: f.id,
        name: f.pinyinName,
        chineseName: f.chineseName,
        source: f.sourceText,
        category: f.category,
        gradeA: 0,
        gradeB: 0,
        totalEvidence: 0,
      };
      cur.totalEvidence++;
      if (e.evidenceGrade === "A") cur.gradeA++;
      if (e.evidenceGrade === "B") cur.gradeB++;
      formulaMap.set(f.id, cur);
    }
    for (const l of e.acupointLinks) {
      const a = l.acupoint;
      const cur = acuMap.get(a.id) ?? {
        id: a.id,
        code: a.code,
        name: a.pinyinName,
        meridian: a.meridian,
        totalEvidence: 0,
      };
      cur.totalEvidence++;
      acuMap.set(a.id, cur);
    }
  }

  // 3. Surface TCM patterns matching this disease's pattern hints.
  // Split hints into enum values (for pathologyType) vs free-text (for chineseName/keySymptoms).
  const PATHOLOGY_ENUMS = new Set([
    "DEFICIENCY",
    "EXCESS",
    "STAGNATION",
    "HEAT",
    "COLD",
    "DAMPNESS",
    "PHLEGM",
    "WIND",
    "BLOOD_STASIS",
    "YIN_DEFICIENCY",
    "YANG_DEFICIENCY",
    "QI_DEFICIENCY",
    "BLOOD_DEFICIENCY",
  ]);
  const enumHints = disease.commonPatternHints.filter((h) => PATHOLOGY_ENUMS.has(h));
  const textHints = disease.commonPatternHints.filter((h) => !PATHOLOGY_ENUMS.has(h));

  const patterns = await prisma.tcmPattern.findMany({
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
    select: {
      id: true,
      pinyinName: true,
      chineseName: true,
      pathologyType: true,
      keySymptoms: true,
      treatmentPrinciple: true,
    },
    take: 8,
  });

  // 4. Compile synthesis — a structured proposal based on the gathered data.
  const topHerbs = [...herbMap.values()].sort((a, b) => b.gradeA * 10 + b.gradeB - (a.gradeA * 10 + a.gradeB)).slice(0, 8);
  const topFormulas = [...formulaMap.values()].sort((a, b) => b.gradeA * 10 + b.gradeB - (a.gradeA * 10 + a.gradeB)).slice(0, 6);
  const topAcupoints = [...acuMap.values()].sort((a, b) => b.totalEvidence - a.totalEvidence).slice(0, 10);

  const synthesis = {
    headline:
      topFormulas[0]
        ? `${topFormulas[0].chineseName} + acupuncture regimen for ${disease.nameZh} (${disease.nameEn})`
        : `Integrative TCM regimen for ${disease.nameZh} (${disease.nameEn})`,
    rationale: [
      `Disease framed in TCM as: ${disease.tcmTermsZh.join(" / ")}.`,
      patterns.length > 0
        ? `Commonly differentiated into ${patterns.length} pattern(s): ${patterns.map((p) => p.chineseName).join(", ")}.`
        : "",
      topFormulas[0]
        ? `Highest-evidence formula in the database: ${topFormulas[0].chineseName} (${topFormulas[0].gradeA} Grade-A, ${topFormulas[0].gradeB} Grade-B studies).`
        : "",
      topHerbs.length > 0
        ? `Top herb candidates (by evidence weight): ${topHerbs.slice(0, 5).map((h) => h.chineseName).join("、")}.`
        : "",
      topAcupoints.length > 0
        ? `Acupoints with supporting evidence: ${topAcupoints.slice(0, 6).map((a) => `${a.code}(${a.name})`).join(", ")}.`
        : "",
    ].filter(Boolean).join(" "),
    regimen: [
      topFormulas[0]
        ? `Base formula: ${topFormulas[0].chineseName}${topFormulas[0].source ? ` (${topFormulas[0].source})` : ""}. Modify per pattern differentiation.`
        : "Build an individualized formula using the ranked herb list below.",
      topHerbs.length > 0
        ? `Key herbs to consider (rank-ordered): ${topHerbs.map((h) => `${h.chineseName}`).join("、")}.`
        : "",
      topAcupoints.length > 0
        ? `Acupuncture protocol: ${topAcupoints.map((a) => a.code).join(", ")}. Typical frequency: 2–3 sessions/week × 4–8 weeks.`
        : "",
      "Follow serial clinical and lab outcomes per priority list.",
    ].filter(Boolean),
    lifestyle: [
      "飲食調養 — avoid sweet/greasy for heat/dampness patterns; add warming foods for yang deficiency.",
      "情志調攝 — stress management aligned with pattern (liver-qi stagnation benefits from moderate exercise & meditation).",
      "起居有常 — consistent sleep/wake timing; 23:00 bedtime for patterns with yin deficiency.",
      "Tai Chi or Qigong 20–30 min daily has RCT support across several of the indexed conditions.",
    ],
    monitoring: [
      `Priority outcomes: ${disease.priorityOutcomes.join(", ")}.`,
      "Re-assess pattern differentiation every 2–4 weeks; adjust formula composition accordingly.",
      "Screen for herb-drug interactions each visit — use the Safety Checker tool.",
    ],
    risks: [
      "Herb-drug interactions (especially anticoagulants, immunosuppressants, hypoglycemics).",
      "Pregnancy / lactation contraindications — consult the contraindications table before dispensing.",
      "Hepatic/renal impairment may require dose reduction.",
      "Evidence base skews toward Chinese-language journals; external independent replication is still limited for several formulas.",
    ],
  };

  // 5. External queries for deeper auto-research
  const externalQueries = {
    pubmed: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(
      `(${disease.keywordsEn.join(" OR ")}) AND (traditional chinese medicine OR acupuncture OR herbal)`,
    )}`,
    cochrane: `https://www.cochranelibrary.com/search?text=${encodeURIComponent(
      `${disease.keywordsEn[0]} AND traditional chinese medicine`,
    )}`,
    who: `https://www.who.int/traditional-complementary-integrative-medicine/search?query=${encodeURIComponent(
      disease.keywordsEn[0],
    )}`,
    chinaCNKI: `https://scholar.cnki.net/Detail/index/GARJ2021_3/?searchword=${encodeURIComponent(
      disease.tcmTermsZh[0],
    )}`,
  };

  return {
    disease,
    patterns: patterns.map((p) => ({
      id: p.id,
      name: p.pinyinName,
      chineseName: p.chineseName,
      pathologyType: p.pathologyType,
      keySymptoms: p.keySymptoms,
      treatmentPrinciple: p.treatmentPrinciple,
    })),
    formulas: topFormulas,
    herbs: topHerbs,
    acupoints: topAcupoints,
    evidence: evidence.slice(0, 20).map((e) => ({
      id: e.id,
      title: e.title,
      studyType: e.studyType,
      evidenceGrade: e.evidenceGrade,
      year: e.year,
      journal: e.journal,
      pubmedId: e.pubmedId,
      doi: e.doi,
      summary: e.summary,
    })),
    externalQueries,
    synthesis,
  };
}
