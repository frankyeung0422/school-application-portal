/**
 * Unified credibility scoring.
 *
 * Fuses the platform's separate signals — GRADE clinical evidence, network-
 * pharmacology target overlap (provenance-discounted), and real-world outcomes
 * — into one transparent 0–100 score + tier per herb/formula↔disease
 * recommendation. Pure function; callers supply the already-computed inputs.
 *
 * Tiering carries a clinical guard: with NO clinical evidence a recommendation
 * is never HIGH/MODERATE — at best a LOW (strong curated network) or
 * HYPOTHESIS lead — matching how network-pharmacology leads should be read.
 */

// ── Tunable weights (documented; keep the component caps summing to 100) ──
const EVIDENCE_CAP = 50;
const NETWORK_CAP = 35;
const RWE_CAP = 15;

const GRADE_A_PTS = 15;
const GRADE_B_PTS = 7;
const OTHER_EVIDENCE_PTS = 2;
const PER_TARGET_PTS = 4; // each shared molecular target
const RWE_MIN_N = 10; // min consultations before RWE counts

const TIER_HIGH = 70;
const TIER_MODERATE = 45;
const TIER_LOW = 25;

export type CredibilityTier = "HIGH" | "MODERATE" | "LOW" | "HYPOTHESIS";

export interface CredibilityInputs {
  gradeA: number;
  gradeB: number;
  totalEvidence: number;
  targetOverlap: number;
  diseaseGeneCount: number;
  /** fraction (0..1) of shared targets supported ONLY by LLM-inferred edges */
  llmOnlyShare: number;
  rweResponderRate?: number | null;
  rweN?: number;
}

export interface CredibilityScore {
  score: number; // 0..100
  tier: CredibilityTier;
  components: { evidence: number; network: number; rwe: number };
  rationale: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function scoreCredibility(input: CredibilityInputs): CredibilityScore {
  const otherEvidence = Math.max(0, input.totalEvidence - input.gradeA - input.gradeB);
  const evidence = Math.min(
    input.gradeA * GRADE_A_PTS + input.gradeB * GRADE_B_PTS + otherEvidence * OTHER_EVIDENCE_PTS,
    EVIDENCE_CAP,
  );

  const provenanceFactor = 1 - 0.5 * clamp(input.llmOnlyShare, 0, 1);
  const network = Math.min(input.targetOverlap * PER_TARGET_PTS, NETWORK_CAP) * provenanceFactor;

  const rwe =
    input.rweN != null && input.rweN >= RWE_MIN_N && input.rweResponderRate != null
      ? (clamp(input.rweResponderRate, 0, 100) / 100) * RWE_CAP
      : 0;

  const score = round1(clamp(evidence + network + rwe, 0, 100));

  // Tier from score, then apply the no-evidence clinical guard.
  let tier: CredibilityTier =
    score >= TIER_HIGH ? "HIGH" : score >= TIER_MODERATE ? "MODERATE" : score >= TIER_LOW ? "LOW" : "HYPOTHESIS";

  if (input.totalEvidence === 0) {
    // No clinical evidence ⇒ never HIGH/MODERATE. Strong, mostly-curated network
    // overlap earns LOW; otherwise it is a HYPOTHESIS-grade lead.
    const strongCuratedNetwork = network >= 16 && input.llmOnlyShare <= 0.5;
    tier = strongCuratedNetwork ? "LOW" : "HYPOTHESIS";
  }

  const parts: string[] = [];
  if (input.gradeA || input.gradeB) parts.push(`${input.gradeA} A / ${input.gradeB} B 級實證`);
  else if (input.totalEvidence) parts.push(`${input.totalEvidence} 篇實證（無 A/B）`);
  else parts.push("無直接臨床實證");
  if (input.targetOverlap > 0) {
    const prov = input.llmOnlyShare >= 0.5 ? "（多為 AI 推斷靶點）" : input.llmOnlyShare > 0 ? "（部分 AI 推斷）" : "（策展靶點）";
    parts.push(`命中 ${input.targetOverlap} 個疾病靶點${prov}`);
  }
  if (rwe > 0) parts.push(`真實世界有效率 ${input.rweResponderRate}%（n=${input.rweN}）`);

  return {
    score,
    tier,
    components: { evidence: round1(evidence), network: round1(network), rwe: round1(rwe) },
    rationale: parts.join("；"),
  };
}

export const TIER_META: Record<CredibilityTier, { zh: string; en: string; chip: string }> = {
  HIGH: { zh: "高可信", en: "High", chip: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30" },
  MODERATE: { zh: "中可信", en: "Moderate", chip: "bg-lime-500/15 text-lime-700 border border-lime-500/30" },
  LOW: { zh: "低可信", en: "Low", chip: "bg-amber-500/15 text-amber-700 border border-amber-500/30" },
  HYPOTHESIS: { zh: "假設級", en: "Hypothesis", chip: "border border-dashed border-slate-400 bg-slate-400/10 text-slate-600" },
};
