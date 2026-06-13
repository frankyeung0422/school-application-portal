import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { buildProposal } from "@/lib/research/synthesize";
import { craftInnovativeFormulas } from "@/lib/research/formula-architect";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min timeout for full cycle

/**
 * POST /api/research/auto
 *
 * Background deep-research engine. For each disease in the catalog:
 * 1. Builds a treatment proposal (evidence mining)
 * 2. Crafts innovative formulas (AI medical mind)
 * 3. Cross-references all diseases for shared herb/acupoint patterns
 * 4. Stores results in research_reports table
 * 5. Returns a summary with discovery insights
 */
export async function POST() {
  const startTime = Date.now();
  const results: {
    diseaseId: string;
    disease: string;
    evidenceCount: number;
    formulaName: string;
    herbCount: number;
    score: number;
    isNew: boolean;
  }[] = [];

  // Cross-disease analytics
  const globalHerbFreq = new Map<string, { name: string; count: number; diseases: string[] }>();
  const globalAcupointFreq = new Map<string, { code: string; count: number; diseases: string[] }>();
  const globalFormulaFreq = new Map<string, { name: string; count: number; diseases: string[] }>();

  for (const disease of DISEASE_CATALOG) {
    try {
      // Phase 1: Evidence proposal
      const proposal = await buildProposal(disease);

      // Phase 2: AI formula innovation
      const innovation = await craftInnovativeFormulas(disease);

      // Compute quality score based on evidence depth + formula balance
      const evidenceScore = Math.min(proposal.evidence.length / 5, 1) * 40; // max 40 pts
      const gradeACount = proposal.evidence.filter((e) => e.evidenceGrade === "A").length;
      const gradeScore = Math.min(gradeACount / 3, 1) * 30; // max 30 pts
      const balanceScore =
        innovation.primaryFormula.natureBalance.warm > 0 &&
        innovation.primaryFormula.natureBalance.cool > 0
          ? 20
          : 10;
      const coverageScore = Math.min(innovation.primaryFormula.meridianCoverage.length / 6, 1) * 10;
      const totalScore = Math.round(evidenceScore + gradeScore + balanceScore + coverageScore);

      // Store proposal report
      await prisma.researchReport.upsert({
        where: { id: `proposal_${disease.id}` },
        create: {
          id: `proposal_${disease.id}`,
          diseaseId: disease.id,
          diseaseName: disease.nameZh,
          reportType: "proposal",
          content: JSON.stringify({
            evidence: proposal.evidence.length,
            herbs: proposal.herbs.map((h) => ({ name: h.chineseName, gradeA: h.gradeA, total: h.totalEvidence })),
            formulas: proposal.formulas.map((f) => ({ name: f.chineseName, gradeA: f.gradeA, total: f.totalEvidence })),
            acupoints: proposal.acupoints.map((a) => ({ code: a.code, total: a.totalEvidence })),
            patterns: proposal.patterns.map((p) => p.chineseName),
            synthesis: proposal.synthesis,
          }),
          score: totalScore,
        },
        update: {
          content: JSON.stringify({
            evidence: proposal.evidence.length,
            herbs: proposal.herbs.map((h) => ({ name: h.chineseName, gradeA: h.gradeA, total: h.totalEvidence })),
            formulas: proposal.formulas.map((f) => ({ name: f.chineseName, gradeA: f.gradeA, total: f.totalEvidence })),
            acupoints: proposal.acupoints.map((a) => ({ code: a.code, total: a.totalEvidence })),
            patterns: proposal.patterns.map((p) => p.chineseName),
            synthesis: proposal.synthesis,
          }),
          score: totalScore,
          version: { increment: 1 },
        },
      });

      // Store innovation report
      const formulaContent = {
        formula: {
          name: innovation.primaryFormula.chineseName,
          herbs: innovation.primaryFormula.herbs.map((h) => ({
            name: h.chineseName, role: h.role, dosage: h.roleDosage, score: h.score,
          })),
          natureBalance: innovation.primaryFormula.natureBalance,
          meridianCoverage: innovation.primaryFormula.meridianCoverage,
          modifications: innovation.primaryFormula.modifications,
        },
        alternates: innovation.alternateFormulas.map((f) => ({
          name: f.chineseName,
          herbs: f.herbs.length,
          principle: f.treatmentPrinciple,
        })),
        protocol: {
          phases: innovation.combinationProtocol.phases.map((p) => ({
            phase: p.phase, duration: p.duration, formula: p.formula.chineseName,
            acupoints: p.acupoints,
          })),
        },
        insights: innovation.innovativeInsights,
        mechanisms: innovation.mechanismHypotheses,
        analysis: innovation.analysis,
      };

      await prisma.researchReport.upsert({
        where: { id: `innovation_${disease.id}` },
        create: {
          id: `innovation_${disease.id}`,
          diseaseId: disease.id,
          diseaseName: disease.nameZh,
          reportType: "innovation",
          formulaName: innovation.primaryFormula.chineseName,
          content: JSON.stringify(formulaContent),
          score: totalScore,
        },
        update: {
          formulaName: innovation.primaryFormula.chineseName,
          content: JSON.stringify(formulaContent),
          score: totalScore,
          version: { increment: 1 },
        },
      });

      // Aggregate cross-disease frequency
      for (const h of proposal.herbs) {
        const cur = globalHerbFreq.get(h.chineseName) ?? { name: h.chineseName, count: 0, diseases: [] };
        cur.count += h.totalEvidence;
        cur.diseases.push(disease.nameZh);
        globalHerbFreq.set(h.chineseName, cur);
      }
      for (const a of proposal.acupoints) {
        const cur = globalAcupointFreq.get(a.code) ?? { code: a.code, count: 0, diseases: [] };
        cur.count += a.totalEvidence;
        cur.diseases.push(disease.nameZh);
        globalAcupointFreq.set(a.code, cur);
      }
      for (const f of proposal.formulas) {
        const cur = globalFormulaFreq.get(f.chineseName) ?? { name: f.chineseName, count: 0, diseases: [] };
        cur.count += f.totalEvidence;
        cur.diseases.push(disease.nameZh);
        globalFormulaFreq.set(f.chineseName, cur);
      }

      results.push({
        diseaseId: disease.id,
        disease: disease.nameZh,
        evidenceCount: proposal.evidence.length,
        formulaName: innovation.primaryFormula.chineseName,
        herbCount: innovation.primaryFormula.herbs.length,
        score: totalScore,
        isNew: true,
      });
    } catch (err) {
      console.error(`[auto-research] Error for ${disease.id}:`, err);
      results.push({
        diseaseId: disease.id,
        disease: disease.nameZh,
        evidenceCount: 0,
        formulaName: "ERROR",
        herbCount: 0,
        score: 0,
        isNew: false,
      });
    }
  }

  // Cross-disease discovery insights
  const crossDiseaseHerbs = [...globalHerbFreq.values()]
    .filter((h) => h.diseases.length >= 3)
    .sort((a, b) => b.count - a.count);
  const crossDiseaseAcupoints = [...globalAcupointFreq.values()]
    .filter((a) => a.diseases.length >= 3)
    .sort((a, b) => b.count - a.count);
  const crossDiseaseFormulas = [...globalFormulaFreq.values()]
    .filter((f) => f.diseases.length >= 2)
    .sort((a, b) => b.count - a.count);

  // Store cross-disease discovery report
  const discoveries = {
    universalHerbs: crossDiseaseHerbs.slice(0, 10).map((h) => ({
      name: h.name, evidenceCount: h.count, diseases: h.diseases,
    })),
    universalAcupoints: crossDiseaseAcupoints.slice(0, 8).map((a) => ({
      code: a.code, evidenceCount: a.count, diseases: a.diseases,
    })),
    multiDiseaseFormulas: crossDiseaseFormulas.slice(0, 6).map((f) => ({
      name: f.name, evidenceCount: f.count, diseases: f.diseases,
    })),
    insight: crossDiseaseHerbs.length > 0
      ? `發現 ${crossDiseaseHerbs.length} 味跨疾病通用核心中藥（覆蓋≥3種疾病），最重要的是 ${crossDiseaseHerbs[0]?.name}（${crossDiseaseHerbs[0]?.diseases.length} 種疾病）。這些藥物可能作為「廣譜」中藥候選，值得深入網絡藥理學研究。`
      : "尚未發現跨疾病通用中藥。",
  };

  await prisma.researchReport.upsert({
    where: { id: "cross_disease_discovery" },
    create: {
      id: "cross_disease_discovery",
      diseaseId: "cross",
      diseaseName: "跨疾病發現",
      reportType: "discovery",
      content: JSON.stringify(discoveries),
      score: crossDiseaseHerbs.length * 10,
    },
    update: {
      content: JSON.stringify(discoveries),
      score: crossDiseaseHerbs.length * 10,
      version: { increment: 1 },
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    success: true,
    elapsed: `${elapsed}s`,
    diseases: results.length,
    results,
    discoveries,
    totalReports: results.length * 2 + 1,
    message: `Auto-research cycle complete. ${results.length} diseases analyzed, ${results.length * 2 + 1} reports stored.`,
  });
}

/**
 * GET /api/research/auto — retrieve latest stored reports
 */
export async function GET() {
  const reports = await prisma.researchReport.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    count: reports.length,
    reports: reports.map((r) => ({
      id: r.id,
      diseaseId: r.diseaseId,
      diseaseName: r.diseaseName,
      reportType: r.reportType,
      formulaName: r.formulaName,
      score: r.score,
      version: r.version,
      updatedAt: r.updatedAt,
    })),
  });
}
