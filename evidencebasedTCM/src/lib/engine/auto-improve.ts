import { prisma } from "@/lib/db/prisma";
import { DISEASE_CATALOG } from "@/lib/research/disease-catalog";
import { buildProposal } from "@/lib/research/synthesize";
import { craftInnovativeFormulas } from "@/lib/research/formula-architect";
import { repurposingCandidates } from "@/lib/research/network-pharmacology";
import { runSurveillance } from "@/lib/research/surveil";
import { refreshTrials } from "@/lib/research/clinicaltrials";
import { buildSelfReportCommunityRWE } from "@/lib/rwe/community";

/**
 * Auto-Improvement Engine — Daily audit, fix, and enhancement cycle.
 *
 * Phases:
 * 1. AUDIT — check data completeness and quality
 * 2. FIX — auto-fix identified issues
 * 3. RESEARCH — refresh research proposals and formulas
 * 4. CONTENT — identify content gaps and opportunities
 * 5. REPORT — generate improvement summary
 */

export interface ImprovementResult {
  runDate: string;
  runType: string;
  duration: number;
  phases: PhaseResult[];
  summary: {
    totalActions: number;
    totalItemsAffected: number;
    issuesFound: number;
    issuesFixed: number;
    researchUpdated: number;
    contentGaps: string[];
    recommendations: string[];
  };
}

interface PhaseResult {
  phase: string;
  actions: ActionLog[];
  duration: number;
}

interface ActionLog {
  category: string;
  action: string;
  details: string;
  itemsAffected: number;
  status: "completed" | "failed" | "skipped";
}

async function logAction(
  runDate: Date,
  runType: string,
  log: ActionLog,
  duration: number,
) {
  await prisma.improvementLog.create({
    data: {
      runDate,
      runType,
      category: log.category,
      action: log.action,
      details: log.details,
      itemsAffected: log.itemsAffected,
      status: log.status,
      duration,
    },
  });
}

// ═══ Phase 1: AUDIT ═══════════════════════════════════════════════════

async function auditPhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  // 1a. Herbs without descriptions
  const herbsNoDesc = await prisma.herb.count({
    where: { OR: [{ description: null }, { description: "" }] },
  });
  actions.push({
    category: "audit",
    action: "herbs_missing_description",
    details: `${herbsNoDesc} herbs have no description`,
    itemsAffected: herbsNoDesc,
    status: herbsNoDesc === 0 ? "completed" : "completed",
  });

  // 1b. Herbs without modern pharmacology
  const herbsNoPharm = await prisma.herb.count({
    where: { OR: [{ modernPharmacology: null }, { modernPharmacology: "" }] },
  });
  actions.push({
    category: "audit",
    action: "herbs_missing_pharmacology",
    details: `${herbsNoPharm} herbs have no modern pharmacology data`,
    itemsAffected: herbsNoPharm,
    status: "completed",
  });

  // 1c. Formulas without herb compositions
  const formulasNoHerbs = await prisma.formula.findMany({
    where: { herbs: { none: {} } },
    select: { id: true, pinyinName: true },
  });
  actions.push({
    category: "audit",
    action: "formulas_without_herbs",
    details: `${formulasNoHerbs.length} formulas have no herb composition: ${formulasNoHerbs.map((f) => f.pinyinName).join(", ") || "none"}`,
    itemsAffected: formulasNoHerbs.length,
    status: "completed",
  });

  // 1d. Evidence without entity links
  const evidenceNoLinks = await prisma.evidenceEntry.findMany({
    where: {
      herbLinks: { none: {} },
      formulaLinks: { none: {} },
      acupointLinks: { none: {} },
      patternLinks: { none: {} },
    },
    select: { id: true },
  });
  actions.push({
    category: "audit",
    action: "evidence_without_links",
    details: `${evidenceNoLinks.length} evidence entries have no entity links`,
    itemsAffected: evidenceNoLinks.length,
    status: "completed",
  });

  // 1e. Patterns without formulas
  const patternsNoFormulas = await prisma.tcmPattern.findMany({
    where: { patternFormulas: { none: {} } },
    select: { id: true, pinyinName: true },
  });
  actions.push({
    category: "audit",
    action: "patterns_without_formulas",
    details: `${patternsNoFormulas.length} patterns have no linked formulas: ${patternsNoFormulas.map((p) => p.pinyinName).join(", ") || "none"}`,
    itemsAffected: patternsNoFormulas.length,
    status: "completed",
  });

  // 1f. Patterns without acupoints
  const patternsNoAcu = await prisma.tcmPattern.findMany({
    where: { patternAcupoints: { none: {} } },
    select: { id: true, pinyinName: true },
  });
  actions.push({
    category: "audit",
    action: "patterns_without_acupoints",
    details: `${patternsNoAcu.length} patterns have no linked acupoints`,
    itemsAffected: patternsNoAcu.length,
    status: "completed",
  });

  // 1g. Evidence age analysis
  const currentYear = new Date().getFullYear();
  const oldEvidence = await prisma.evidenceEntry.count({
    where: { year: { lt: currentYear - 10 } },
  });
  const recentEvidence = await prisma.evidenceEntry.count({
    where: { year: { gte: currentYear - 3 } },
  });
  const totalEvidence = await prisma.evidenceEntry.count();
  actions.push({
    category: "audit",
    action: "evidence_freshness",
    details: `Evidence freshness: ${recentEvidence}/${totalEvidence} recent (≤3y), ${oldEvidence}/${totalEvidence} old (>10y)`,
    itemsAffected: totalEvidence,
    status: "completed",
  });

  // 1h. Grade distribution
  const gradeA = await prisma.evidenceEntry.count({ where: { evidenceGrade: "A" } });
  const gradeB = await prisma.evidenceEntry.count({ where: { evidenceGrade: "B" } });
  const gradeC = await prisma.evidenceEntry.count({ where: { evidenceGrade: "C" } });
  const gradeD = await prisma.evidenceEntry.count({ where: { evidenceGrade: "D" } });
  actions.push({
    category: "audit",
    action: "evidence_grade_distribution",
    details: `Grade distribution: A:${gradeA} B:${gradeB} C:${gradeC} D:${gradeD}. A-rate: ${((gradeA / totalEvidence) * 100).toFixed(1)}%`,
    itemsAffected: totalEvidence,
    status: "completed",
  });

  // 1i. Course coverage
  const totalLessons = await prisma.courseLesson.count();
  const totalPossible = 613; // 8 courses total lessons
  actions.push({
    category: "audit",
    action: "course_coverage",
    details: `Course coverage: ${totalLessons}/${totalPossible} lessons imported (${((totalLessons / totalPossible) * 100).toFixed(1)}%)`,
    itemsAffected: totalLessons,
    status: "completed",
  });

  // 1j. Network-pharmacology coverage — herbs with no molecular targets.
  const totalHerbsForNet = await prisma.herb.count();
  const herbsWithTargets = await prisma.herb.count({
    where: { activeCompounds: { some: { targets: { some: {} } } } },
  });
  const herbsNoTargets = totalHerbsForNet - herbsWithTargets;
  actions.push({
    category: "audit",
    action: "herbs_missing_targets",
    details: `Network-pharmacology coverage: ${herbsWithTargets}/${totalHerbsForNet} herbs have ≥1 protein target; ${herbsNoTargets} have none (import-compound-targets.ts)`,
    itemsAffected: herbsNoTargets,
    status: "completed",
  });

  // 1k. Active compounds without any target edge.
  const compoundsNoTargets = await prisma.herbActiveCompound.count({
    where: { targets: { none: {} } },
  });
  actions.push({
    category: "audit",
    action: "compounds_missing_targets",
    details: `${compoundsNoTargets} active compounds have no protein-target edge`,
    itemsAffected: compoundsNoTargets,
    status: "completed",
  });

  // 1l. Catalog diseases without a gene set (can't run network analysis).
  const diseaseGeneRows = await prisma.diseaseGene.groupBy({
    by: ["diseaseId"],
    _count: true,
  });
  const diseasesWithGenes = new Set(diseaseGeneRows.map((r) => r.diseaseId));
  const diseasesNoGenes = DISEASE_CATALOG.filter((d) => !diseasesWithGenes.has(d.id));
  actions.push({
    category: "audit",
    action: "diseases_missing_genes",
    details: `${diseasesNoGenes.length} catalog diseases have no gene set: ${diseasesNoGenes.map((d) => d.id).join(", ") || "none"} (import-disease-genes.ts)`,
    itemsAffected: diseasesNoGenes.length,
    status: "completed",
  });

  const dur = Date.now() - start;
  for (const a of actions) await logAction(runDate, runType, a, dur);
  return { phase: "audit", actions, duration: dur };
}

// ═══ Phase 2: FIX ════════════════════════════════════════════════════

async function fixPhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  // 2a. Auto-link unlinked evidence by keyword matching
  const unlinked = await prisma.evidenceEntry.findMany({
    where: {
      herbLinks: { none: {} },
      formulaLinks: { none: {} },
      acupointLinks: { none: {} },
      patternLinks: { none: {} },
    },
    select: { id: true, title: true, summary: true, intervention: true },
    take: 50,
  });

  if (unlinked.length > 0) {
    const herbs = await prisma.herb.findMany({
      select: { id: true, chineseName: true, latinName: true, englishName: true },
    });
    const formulas = await prisma.formula.findMany({
      select: { id: true, chineseName: true, englishName: true },
    });
    const acupoints = await prisma.acupuncturePoint.findMany({
      select: { id: true, code: true, chineseName: true, englishName: true },
    });

    // Build a low-cased haystack for English/Latin substring matching;
    // Chinese stays case-sensitive on the original text.
    let linkedCount = 0;
    for (const ev of unlinked) {
      const hayCJK = `${ev.title} ${ev.summary ?? ""} ${ev.intervention ?? ""}`;
      const hayLower = hayCJK.toLowerCase();

      const matchHerb = (h: { chineseName: string; latinName: string | null; englishName: string | null }) => {
        if (hayCJK.includes(h.chineseName)) return true;
        // Latin/English match requires ≥4 chars to avoid false positives like "Da"
        if (h.latinName && h.latinName.length >= 4 && hayLower.includes(h.latinName.toLowerCase())) return true;
        if (h.englishName && h.englishName.length >= 4 && hayLower.includes(h.englishName.toLowerCase())) return true;
        return false;
      };

      for (const h of herbs) {
        if (matchHerb(h)) {
          try {
            await prisma.evidenceHerbLink.create({
              data: { evidenceId: ev.id, herbId: h.id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
            });
            linkedCount++;
          } catch { /* dup */ }
        }
      }
      for (const f of formulas) {
        const hit =
          hayCJK.includes(f.chineseName) ||
          (f.englishName && f.englishName.length >= 6 && hayLower.includes(f.englishName.toLowerCase()));
        if (hit) {
          try {
            await prisma.evidenceFormulaLink.create({
              data: { evidenceId: ev.id, formulaId: f.id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
            });
            linkedCount++;
          } catch { /* dup */ }
        }
      }
      for (const a of acupoints) {
        if (hayCJK.includes(a.chineseName) || hayCJK.includes(a.code)) {
          try {
            await prisma.evidenceAcupointLink.create({
              data: { evidenceId: ev.id, acupointId: a.id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
            });
            linkedCount++;
          } catch { /* dup */ }
        }
      }
    }

    actions.push({
      category: "fix",
      action: "auto_link_evidence",
      details: `Scanned ${unlinked.length} unlinked evidence entries, created ${linkedCount} new entity links by keyword matching`,
      itemsAffected: linkedCount,
      status: "completed",
    });
  }

  const dur = Date.now() - start;
  for (const a of actions) await logAction(runDate, runType, a, dur);
  return { phase: "fix", actions, duration: dur };
}

// ═══ Phase 3: RESEARCH ═══════════════════════════════════════════════

async function researchPhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  let updatedCount = 0;
  for (const disease of DISEASE_CATALOG) {
    try {
      const proposal = await buildProposal(disease);
      const innovation = await craftInnovativeFormulas(disease);

      const evidenceScore = Math.min(proposal.evidence.length / 5, 1) * 40;
      const gradeACount = proposal.evidence.filter((e) => e.evidenceGrade === "A").length;
      const gradeScore = Math.min(gradeACount / 3, 1) * 30;
      const balanceScore =
        innovation.primaryFormula.natureBalance.warm > 0 &&
        innovation.primaryFormula.natureBalance.cool > 0 ? 20 : 10;
      const coverageScore = Math.min(innovation.primaryFormula.meridianCoverage.length / 6, 1) * 10;
      const totalScore = Math.round(evidenceScore + gradeScore + balanceScore + coverageScore);

      await prisma.researchReport.upsert({
        where: { id: `proposal_${disease.id}` },
        create: {
          id: `proposal_${disease.id}`,
          diseaseId: disease.id,
          diseaseName: disease.nameZh,
          reportType: "proposal",
          content: JSON.stringify({ evidence: proposal.evidence.length, synthesis: proposal.synthesis }),
          score: totalScore,
        },
        update: {
          content: JSON.stringify({ evidence: proposal.evidence.length, synthesis: proposal.synthesis }),
          score: totalScore,
          version: { increment: 1 },
        },
      });

      await prisma.researchReport.upsert({
        where: { id: `innovation_${disease.id}` },
        create: {
          id: `innovation_${disease.id}`,
          diseaseId: disease.id,
          diseaseName: disease.nameZh,
          reportType: "innovation",
          formulaName: innovation.primaryFormula.chineseName,
          content: JSON.stringify({
            formula: innovation.primaryFormula.chineseName,
            herbs: innovation.primaryFormula.herbs.length,
            insights: innovation.innovativeInsights.length,
          }),
          score: totalScore,
        },
        update: {
          formulaName: innovation.primaryFormula.chineseName,
          content: JSON.stringify({
            formula: innovation.primaryFormula.chineseName,
            herbs: innovation.primaryFormula.herbs.length,
            insights: innovation.innovativeInsights.length,
          }),
          score: totalScore,
          version: { increment: 1 },
        },
      });

      // Network-pharmacology report: repurposing candidates + pathway enrichment.
      const network = await repurposingCandidates(disease.id);
      const geneCoverage = network.diseaseGenes.length
        ? Math.round(
            (new Set(network.herbs.flatMap((h) => h.sharedGenes)).size / network.diseaseGenes.length) * 100,
          )
        : 0;
      await prisma.researchReport.upsert({
        where: { id: `network_${disease.id}` },
        create: {
          id: `network_${disease.id}`,
          diseaseId: disease.id,
          diseaseName: disease.nameZh,
          reportType: "network",
          content: JSON.stringify({
            diseaseGenes: network.diseaseGenes.length,
            geneCoveragePct: geneCoverage,
            topHerbs: network.herbs.slice(0, 10).map((h) => ({ name: h.chineseName, overlap: h.overlap })),
            topFormulas: network.formulas.slice(0, 8).map((f) => ({ name: f.chineseName, overlap: f.overlap })),
            enrichedPathways: network.enrichedPathways.map((p) => ({ code: p.code, name: p.name, hits: p.hitGenes.length })),
          }),
          score: geneCoverage,
        },
        update: {
          content: JSON.stringify({
            diseaseGenes: network.diseaseGenes.length,
            geneCoveragePct: geneCoverage,
            topHerbs: network.herbs.slice(0, 10).map((h) => ({ name: h.chineseName, overlap: h.overlap })),
            topFormulas: network.formulas.slice(0, 8).map((f) => ({ name: f.chineseName, overlap: f.overlap })),
            enrichedPathways: network.enrichedPathways.map((p) => ({ code: p.code, name: p.name, hits: p.hitGenes.length })),
          }),
          score: geneCoverage,
          version: { increment: 1 },
        },
      });

      updatedCount++;
    } catch (err) {
      actions.push({
        category: "research",
        action: `research_error_${disease.id}`,
        details: `Failed to update research for ${disease.nameZh}: ${String(err).slice(0, 200)}`,
        itemsAffected: 0,
        status: "failed",
      });
    }
  }

  actions.push({
    category: "research",
    action: "refresh_research_reports",
    details: `Updated ${updatedCount}/${DISEASE_CATALOG.length} disease research reports (proposals + innovations + network)`,
    itemsAffected: updatedCount * 3,
    status: "completed",
  });

  const dur = Date.now() - start;
  for (const a of actions) await logAction(runDate, runType, a, dur);
  return { phase: "research", actions, duration: dur };
}

// ═══ Phase 4: CONTENT ════════════════════════════════════════════════

async function contentPhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  const gaps: string[] = [];

  // 4a. Check herb categories coverage
  const herbCats = await prisma.herb.groupBy({ by: ["category"], _count: true });
  const catMap = new Map(herbCats.map((c) => [c.category, c._count]));
  const expectedCats = [
    "Qi Tonifying", "Blood Tonifying", "Yin Tonifying", "Yang Tonifying",
    "Heat Clearing", "Exterior Releasing", "Interior Warming", "Blood Activating",
    "Phlegm Resolving", "Spirit Calming", "Wind Extinguishing", "Dampness Draining",
    "Qi Regulating", "Aromatic Dampness Dissolving", "Wind-Dampness Expelling", "Purgatives",
  ];
  for (const cat of expectedCats) {
    const count = catMap.get(cat) ?? 0;
    if (count < 3) {
      gaps.push(`Herb category "${cat}" has only ${count} herbs — consider adding more`);
    }
  }

  // 4b. Meridian coverage for acupoints
  const acuMeridians = await prisma.acupuncturePoint.groupBy({ by: ["meridian"], _count: true });
  const meridMap = new Map(acuMeridians.map((m) => [m.meridian, m._count]));
  const expectedMeridians = [
    "Lung", "Large Intestine", "Stomach", "Spleen", "Heart", "Small Intestine",
    "Bladder", "Kidney", "Pericardium", "Triple Energizer", "Gallbladder", "Liver",
    "Governing Vessel", "Conception Vessel",
  ];
  for (const m of expectedMeridians) {
    const count = meridMap.get(m) ?? 0;
    if (count < 2) {
      gaps.push(`Meridian "${m}" has only ${count} acupoints — consider adding from theqi.com`);
    }
  }

  // 4c. Disease coverage in research
  const existingReports = await prisma.researchReport.findMany({
    where: { reportType: "proposal" },
    select: { diseaseId: true, score: true },
  });
  for (const r of existingReports) {
    if ((r.score ?? 0) < 50) {
      gaps.push(`Disease "${r.diseaseId}" has low research score (${r.score}) — needs more evidence`);
    }
  }

  actions.push({
    category: "content",
    action: "identify_gaps",
    details: `Found ${gaps.length} content gaps:\n${gaps.join("\n")}`,
    itemsAffected: gaps.length,
    status: "completed",
  });

  // 4d. Generate recommendations
  const recommendations: string[] = [];
  const totalHerbs = await prisma.herb.count();
  const totalFormulas = await prisma.formula.count();
  const totalAcu = await prisma.acupuncturePoint.count();
  const totalEvidence = await prisma.evidenceEntry.count();
  const totalLessons = await prisma.courseLesson.count();

  if (totalHerbs < 100) recommendations.push(`Expand herb database from ${totalHerbs} to 100+ (import more from theqi.com herb categories)`);
  if (totalFormulas < 50) recommendations.push(`Expand formula database from ${totalFormulas} to 50+ (import from 方劑索引)`);
  if (totalAcu < 50) recommendations.push(`Expand acupoint database from ${totalAcu} to 50+ (import from all 14 meridians)`);
  if (totalEvidence < 300) recommendations.push(`Add more evidence entries (current: ${totalEvidence}, target: 300+)`);
  if (totalLessons < 200) recommendations.push(`Import more course lessons (current: ${totalLessons}/613)`);

  actions.push({
    category: "content",
    action: "generate_recommendations",
    details: recommendations.join("\n"),
    itemsAffected: recommendations.length,
    status: "completed",
  });

  const dur = Date.now() - start;
  for (const a of actions) await logAction(runDate, runType, a, dur);
  return { phase: "content", actions, duration: dur };
}

// ═══ Phase 5: SURVEILLANCE (weekly only) ═════════════════════════════
// Pulls recent PubMed evidence per disease, GRADEs + links it. Network +
// LLM heavy, so it only runs on the weekly cadence (or ENABLE_SURVEILLANCE=1)
// — never on the fast daily/manual cycle. Failures are isolated.

async function surveillancePhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  // Refresh ClinicalTrials.gov registry (network-only, no LLM) alongside PubMed.
  try {
    const trials = await refreshTrials({ maxPerDisease: 8 });
    actions.push({
      category: "research",
      action: "clinicaltrials_refresh",
      details: `Refreshed ClinicalTrials.gov: upserted ${trials.upserted} trial records across the catalog.`,
      itemsAffected: trials.upserted,
      status: "completed",
    });
  } catch (err) {
    actions.push({
      category: "research",
      action: "clinicaltrials_refresh",
      details: `Trial refresh failed: ${String(err).slice(0, 200)}`,
      itemsAffected: 0,
      status: "failed",
    });
  }

  try {
    const summary = await runSurveillance({ maxPerDisease: 3 });
    if (summary.skipped) {
      actions.push({
        category: "research",
        action: "pubmed_surveillance",
        details: `Surveillance skipped: ${summary.reason}`,
        itemsAffected: 0,
        status: "skipped",
      });
    } else {
      actions.push({
        category: "research",
        action: "pubmed_surveillance",
        details: `Surveilled ${summary.diseasesProcessed} diseases; inserted ${summary.inserted} new evidence entries, ${summary.links} entity links. Per-disease: ${JSON.stringify(summary.perDisease)}`,
        itemsAffected: summary.inserted,
        status: "completed",
      });
    }
  } catch (err) {
    actions.push({
      category: "research",
      action: "pubmed_surveillance",
      details: `Surveillance failed: ${String(err).slice(0, 200)}`,
      itemsAffected: 0,
      status: "failed",
    });
  }

  const dur = Date.now() - start;
  for (const a of actions) await logAction(runDate, runType, a, dur);
  return { phase: "surveillance", actions, duration: dur };
}

// ═══ Phase 6: COMMUNITY ══════════════════════════════════════════════

async function communityPhase(runDate: Date, runType: string): Promise<PhaseResult> {
  const start = Date.now();
  const actions: ActionLog[] = [];

  try {
    const result = await buildSelfReportCommunityRWE();
    actions.push({
      category: "community",
      action: "aggregate_self_reports",
      details: `Aggregated ${result.checkInsProcessed} check-ins from ${result.consentingProfiles} consenting profiles. Top conditions: ${result.topConditions.map((c) => c.name).slice(0, 5).join(", ")}`,
      itemsAffected: result.checkInsProcessed,
      status: "completed",
    });

    if (result.checkInsProcessed > 0) {
      const existing = await prisma.researchReport.findFirst({
        where: { diseaseId: "community_aggregate", reportType: "community_rwe" },
      });
      if (existing) {
        await prisma.researchReport.update({
          where: { id: existing.id },
          data: { content: JSON.stringify(result), updatedAt: new Date() },
        });
      } else {
        await prisma.researchReport.create({
          data: {
            diseaseId: "community_aggregate",
            diseaseName: "Community Aggregate (Self-Reports)",
            reportType: "community_rwe",
            content: JSON.stringify(result),
          },
        });
      }
    }
  } catch (err) {
    actions.push({
      category: "community",
      action: "aggregate_self_reports",
      details: `Community aggregation failed: ${String(err)}`,
      itemsAffected: 0,
      status: "failed",
    });
  }

  const dur = Date.now() - start;
  for (const log of actions) await logAction(runDate, runType, log, dur);
  return { phase: "community", actions, duration: dur };
}

// ═══ Main Entry Point ════════════════════════════════════════════════

export async function runAutoImprovement(runType: string = "manual"): Promise<ImprovementResult> {
  const runDate = new Date();
  const totalStart = Date.now();

  const phases: PhaseResult[] = [];

  // Phase 1: Audit
  phases.push(await auditPhase(runDate, runType));

  // Phase 2: Fix
  phases.push(await fixPhase(runDate, runType));

  // Phase 3: Research
  phases.push(await researchPhase(runDate, runType));

  // Phase 4: Content
  phases.push(await contentPhase(runDate, runType));

  // Phase 5: Surveillance — weekly cadence only (network + LLM heavy).
  // Trigger with runType="weekly" (see scripts/weekly-improve.ts) or set
  // ENABLE_SURVEILLANCE=1 to include it in any run.
  if (runType === "weekly" || process.env.ENABLE_SURVEILLANCE === "1") {
    phases.push(await surveillancePhase(runDate, runType));
  }

  // Community phase: aggregate self-report data into RWE research reports
  phases.push(await communityPhase(runDate, runType));

  const totalDuration = Date.now() - totalStart;

  const allActions = phases.flatMap((p) => p.actions);
  const issuesFound = allActions.filter((a) => a.category === "audit" && a.itemsAffected > 0).length;
  const issuesFixed = allActions.filter((a) => a.category === "fix" && a.itemsAffected > 0).length;
  const researchUpdated = allActions.filter((a) => a.category === "research" && a.status === "completed").reduce((s, a) => s + a.itemsAffected, 0);
  const contentGaps = allActions.filter((a) => a.action === "identify_gaps").flatMap((a) => a.details.split("\n").filter((l) => l.trim()));
  const recommendations = allActions.filter((a) => a.action === "generate_recommendations").flatMap((a) => a.details.split("\n").filter((l) => l.trim()));

  // Log summary
  await logAction(runDate, runType, {
    category: "audit",
    action: "daily_summary",
    details: `Auto-improvement cycle complete. ${allActions.length} actions, ${issuesFound} audit issues, ${issuesFixed} fixes applied, ${researchUpdated} research reports updated. Duration: ${(totalDuration / 1000).toFixed(1)}s`,
    itemsAffected: allActions.length,
    status: "completed",
  }, totalDuration);

  return {
    runDate: runDate.toISOString(),
    runType,
    duration: totalDuration,
    phases,
    summary: {
      totalActions: allActions.length,
      totalItemsAffected: allActions.reduce((s, a) => s + a.itemsAffected, 0),
      issuesFound,
      issuesFixed,
      researchUpdated,
      contentGaps,
      recommendations,
    },
  };
}
