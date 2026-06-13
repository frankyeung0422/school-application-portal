import { prisma } from "@/lib/db/prisma";

/**
 * Real-World Evidence (RWE) aggregation.
 *
 * Turns the platform's clinical records (Consultation + ConsultationVital +
 * ConsultationPrescription) into per-formula and per-pattern effectiveness
 * signals — the kind of routine-practice evidence that regulators now accept
 * as a complement to RCTs.
 *
 * Primary outcome = the paired 0–10 symptom VAS recorded on a consultation
 * (`symptomScoreBefore` / `symptomScoreAfter`; lower = better). We also track
 * adverse-effect rate and per-patient vital trajectories (HbA1c, BP, BMI).
 *
 * All computation is in-memory over a single fetch — clinical volume is small.
 */

// Clinically meaningful improvement on a 0–10 VAS.
const RESPONDER_DELTA = 2;

export interface OutcomeStats {
  /** consultations with a paired before/after score */
  n: number;
  /** all consultations in the cohort (adverse-rate denominator) */
  totalConsults: number;
  meanBefore: number | null;
  meanAfter: number | null;
  /** before − after; positive = improvement */
  meanDelta: number | null;
  /** % of paired consultations with delta ≥ RESPONDER_DELTA */
  responderRate: number | null;
  /** % of cohort consultations recording any adverse effect */
  adverseRate: number;
}

export interface VitalDelta {
  label: string;
  unit: string;
  /** patients with both a baseline and a later reading */
  n: number;
  meanBaseline: number;
  meanLatest: number;
  meanDelta: number; // latest − baseline
}

export interface FormulaRWE {
  formulaId: string;
  chineseName: string;
  pinyinName: string;
  stats: OutcomeStats;
  vitals: VitalDelta[];
  topPatterns: { name: string; count: number }[];
}

export interface PatternRWE {
  patternId: string;
  chineseName: string;
  pathologyType: string;
  stats: OutcomeStats;
  topFormulas: { name: string; count: number }[];
}

export interface SelfReportStats {
  totalProfiles: number;
  consentingProfiles: number;
  totalCheckIns: number;
  meanOverallScore: number | null;
  topConditions: { name: string; count: number }[];
}

export interface RWESummary {
  totalPatients: number;
  totalConsultations: number;
  pairedConsultations: number;
  overall: OutcomeStats;
  formulas: FormulaRWE[];
  patterns: PatternRWE[];
  selfReport?: SelfReportStats;
}

// ── Internal shapes ──────────────────────────────────────────────────

type ConsultationRow = {
  id: string;
  patientId: string;
  visitDate: Date;
  symptomScoreBefore: number | null;
  symptomScoreAfter: number | null;
  adverseEffects: string | null;
  patternId: string | null;
  pattern: { chineseName: string; pathologyType: string } | null;
  prescription: { formulaId: string | null; baseFormula: { chineseName: string; pinyinName: string } | null } | null;
  vitals: { bpSystolic: number | null; bpDiastolic: number | null; hba1c: number | null; bmi: number | null; fastingGlucose: number | null; measuredAt: Date }[];
};

function computeStats(cohort: ConsultationRow[]): OutcomeStats {
  const paired = cohort.filter((c) => c.symptomScoreBefore != null && c.symptomScoreAfter != null);
  const n = paired.length;
  const totalConsults = cohort.length;
  const adverse = cohort.filter((c) => (c.adverseEffects ?? "").trim().length > 0).length;
  const adverseRate = totalConsults ? (adverse / totalConsults) * 100 : 0;

  if (n === 0) {
    return { n: 0, totalConsults, meanBefore: null, meanAfter: null, meanDelta: null, responderRate: null, adverseRate };
  }
  const sumBefore = paired.reduce((s, c) => s + (c.symptomScoreBefore as number), 0);
  const sumAfter = paired.reduce((s, c) => s + (c.symptomScoreAfter as number), 0);
  const responders = paired.filter((c) => (c.symptomScoreBefore as number) - (c.symptomScoreAfter as number) >= RESPONDER_DELTA).length;
  const meanBefore = sumBefore / n;
  const meanAfter = sumAfter / n;
  return {
    n,
    totalConsults,
    meanBefore: round1(meanBefore),
    meanAfter: round1(meanAfter),
    meanDelta: round1(meanBefore - meanAfter),
    responderRate: round1((responders / n) * 100),
    adverseRate: round1(adverseRate),
  };
}

/** Per-patient baseline (first reading) vs latest reading for one numeric vital. */
function vitalTrajectory(
  cohort: ConsultationRow[],
  pick: (v: ConsultationRow["vitals"][number]) => number | null,
  label: string,
  unit: string,
): VitalDelta | null {
  const byPatient = new Map<string, { date: Date; value: number }[]>();
  for (const c of cohort) {
    for (const v of c.vitals) {
      const val = pick(v);
      if (val == null) continue;
      const arr = byPatient.get(c.patientId) ?? [];
      arr.push({ date: v.measuredAt ?? c.visitDate, value: val });
      byPatient.set(c.patientId, arr);
    }
  }
  const deltas: { baseline: number; latest: number }[] = [];
  for (const readings of byPatient.values()) {
    if (readings.length < 2) continue;
    readings.sort((a, b) => a.date.getTime() - b.date.getTime());
    deltas.push({ baseline: readings[0].value, latest: readings[readings.length - 1].value });
  }
  if (deltas.length === 0) return null;
  const n = deltas.length;
  const meanBaseline = deltas.reduce((s, d) => s + d.baseline, 0) / n;
  const meanLatest = deltas.reduce((s, d) => s + d.latest, 0) / n;
  return {
    label,
    unit,
    n,
    meanBaseline: round1(meanBaseline),
    meanLatest: round1(meanLatest),
    meanDelta: round1(meanLatest - meanBaseline),
  };
}

function vitalsFor(cohort: ConsultationRow[]): VitalDelta[] {
  const out: VitalDelta[] = [];
  const sbp = vitalTrajectory(cohort, (v) => v.bpSystolic, "收縮壓 SBP", "mmHg");
  const dbp = vitalTrajectory(cohort, (v) => v.bpDiastolic, "舒張壓 DBP", "mmHg");
  const hba1c = vitalTrajectory(cohort, (v) => v.hba1c, "糖化血紅蛋白 HbA1c", "%");
  const glu = vitalTrajectory(cohort, (v) => v.fastingGlucose, "空腹血糖 FPG", "mmol/L");
  const bmi = vitalTrajectory(cohort, (v) => v.bmi, "體質指數 BMI", "kg/m²");
  for (const v of [hba1c, glu, sbp, dbp, bmi]) if (v) out.push(v);
  return out;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Self-report aggregation (PATIENT role, consented) ────────────────

async function buildSelfReportStats(): Promise<SelfReportStats> {
  const [totalProfiles, consentingProfiles, checkIns, conditions] = await Promise.all([
    prisma.userHealthProfile.count(),
    prisma.userHealthProfile.count({ where: { researchConsent: true } }),
    prisma.healthCheckIn.findMany({
      where: { profile: { researchConsent: true } },
      select: { overallScore: true },
    }),
    prisma.userConditionLog.findMany({
      where: { profile: { researchConsent: true }, status: "ACTIVE" },
      select: { westernName: true },
    }),
  ]);

  const totalCheckIns = checkIns.length;
  const meanOverallScore = totalCheckIns > 0
    ? round1(checkIns.reduce((s, c) => s + c.overallScore, 0) / totalCheckIns)
    : null;

  const conditionCounts = new Map<string, number>();
  for (const c of conditions) {
    conditionCounts.set(c.westernName, (conditionCounts.get(c.westernName) ?? 0) + 1);
  }
  const topConditions = [...conditionCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalProfiles, consentingProfiles, totalCheckIns, meanOverallScore, topConditions };
}

// ── Public API ───────────────────────────────────────────────────────

export async function buildRWESummary(includeSelfReport = false): Promise<RWESummary> {
  const consults = (await prisma.consultation.findMany({
    select: {
      id: true,
      patientId: true,
      visitDate: true,
      symptomScoreBefore: true,
      symptomScoreAfter: true,
      adverseEffects: true,
      patternId: true,
      pattern: { select: { chineseName: true, pathologyType: true } },
      prescription: {
        select: {
          formulaId: true,
          baseFormula: { select: { chineseName: true, pinyinName: true } },
        },
      },
      vitals: {
        select: { bpSystolic: true, bpDiastolic: true, hba1c: true, bmi: true, fastingGlucose: true, measuredAt: true },
      },
    },
  })) as ConsultationRow[];

  const totalPatients = new Set(consults.map((c) => c.patientId)).size;
  const totalConsultations = consults.length;
  const pairedConsultations = consults.filter((c) => c.symptomScoreBefore != null && c.symptomScoreAfter != null).length;

  // ── By formula ──
  const byFormula = new Map<string, ConsultationRow[]>();
  for (const c of consults) {
    const fid = c.prescription?.formulaId;
    if (!fid) continue;
    const arr = byFormula.get(fid) ?? [];
    arr.push(c);
    byFormula.set(fid, arr);
  }
  const formulas: FormulaRWE[] = [];
  for (const [formulaId, cohort] of byFormula) {
    const meta = cohort.find((c) => c.prescription?.baseFormula)?.prescription?.baseFormula;
    const patternCounts = countBy(cohort.map((c) => c.pattern?.chineseName).filter(Boolean) as string[]);
    formulas.push({
      formulaId,
      chineseName: meta?.chineseName ?? formulaId,
      pinyinName: meta?.pinyinName ?? "",
      stats: computeStats(cohort),
      vitals: vitalsFor(cohort),
      topPatterns: patternCounts,
    });
  }
  formulas.sort((a, b) => b.stats.n - a.stats.n || b.stats.totalConsults - a.stats.totalConsults);

  // ── By pattern ──
  const byPattern = new Map<string, ConsultationRow[]>();
  for (const c of consults) {
    if (!c.patternId) continue;
    const arr = byPattern.get(c.patternId) ?? [];
    arr.push(c);
    byPattern.set(c.patternId, arr);
  }
  const patterns: PatternRWE[] = [];
  for (const [patternId, cohort] of byPattern) {
    const meta = cohort.find((c) => c.pattern)?.pattern;
    const formulaCounts = countBy(
      cohort.map((c) => c.prescription?.baseFormula?.chineseName).filter(Boolean) as string[],
    );
    patterns.push({
      patternId,
      chineseName: meta?.chineseName ?? patternId,
      pathologyType: meta?.pathologyType ?? "",
      stats: computeStats(cohort),
      topFormulas: formulaCounts,
    });
  }
  patterns.sort((a, b) => b.stats.n - a.stats.n || b.stats.totalConsults - a.stats.totalConsults);

  const selfReport = includeSelfReport ? await buildSelfReportStats() : undefined;

  return {
    totalPatients,
    totalConsultations,
    pairedConsultations,
    overall: computeStats(consults),
    formulas,
    patterns,
    selfReport,
  };
}

/** RWE for a single formula's cohort, or null if no consultations used it. */
export async function buildFormulaRWE(formulaId: string): Promise<FormulaRWE | null> {
  const cohort = (await prisma.consultation.findMany({
    where: { prescription: { formulaId } },
    select: {
      id: true,
      patientId: true,
      visitDate: true,
      symptomScoreBefore: true,
      symptomScoreAfter: true,
      adverseEffects: true,
      patternId: true,
      pattern: { select: { chineseName: true, pathologyType: true } },
      prescription: {
        select: { formulaId: true, baseFormula: { select: { chineseName: true, pinyinName: true } } },
      },
      vitals: {
        select: { bpSystolic: true, bpDiastolic: true, hba1c: true, bmi: true, fastingGlucose: true, measuredAt: true },
      },
    },
  })) as ConsultationRow[];

  if (cohort.length === 0) return null;
  const meta = cohort.find((c) => c.prescription?.baseFormula)?.prescription?.baseFormula;
  return {
    formulaId,
    chineseName: meta?.chineseName ?? formulaId,
    pinyinName: meta?.pinyinName ?? "",
    stats: computeStats(cohort),
    vitals: vitalsFor(cohort),
    topPatterns: countBy(cohort.map((c) => c.pattern?.chineseName).filter(Boolean) as string[]),
  };
}

function countBy(items: string[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4);
}
