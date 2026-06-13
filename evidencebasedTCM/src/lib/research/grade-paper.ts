/**
 * Claude-based GRADE-style grading for a PubMed paper. Given the title +
 * abstract + study-type hint, returns a structured grading suitable for
 * inserting as an EvidenceEntry row.
 *
 * Uses Anthropic Claude (claude-sonnet-4-6 by default — fast and cheap
 * enough for batch grading 200+ papers). Outputs strict JSON.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { PubMedArticle } from "./pubmed";

type Provider = "openai" | "anthropic";
function pickProvider(): Provider | null {
  // Override via env if both keys are set: GRADE_PROVIDER=openai|anthropic
  const ovr = process.env.GRADE_PROVIDER?.toLowerCase();
  if (ovr === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (ovr === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
const OPENAI_MODEL = process.env.GRADE_OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.GRADE_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export interface GradedEvidence {
  evidenceLevel:
    | "LEVEL_1A"
    | "LEVEL_1B"
    | "LEVEL_2A"
    | "LEVEL_2B"
    | "LEVEL_3A"
    | "LEVEL_3B"
    | "LEVEL_4"
    | "LEVEL_5";
  evidenceGrade: "A" | "B" | "C" | "D";
  studyType:
    | "SYSTEMATIC_REVIEW"
    | "META_ANALYSIS"
    | "RCT"
    | "COHORT"
    | "CASE_CONTROL"
    | "CASE_SERIES"
    | "CASE_REPORT"
    | "EXPERT_OPINION"
    | "TRADITIONAL_USE";
  riskOfBias: "LOW" | "SOME_CONCERNS" | "HIGH" | null;
  qualityScore: number | null; // 0..100
  sampleSize: number | null;
  population: string | null;       // Traditional Chinese
  intervention: string | null;     // Traditional Chinese
  comparator: string | null;       // Traditional Chinese
  primaryOutcome: string | null;   // Traditional Chinese
  resultsSummary: string | null;   // Traditional Chinese, 1–2 sentences
  summary: string | null;          // Traditional Chinese, 1 sentence headline
  outcomeType: "EFFICACY" | "SAFETY" | "PHARMACOKINETICS" | "MECHANISM";
  effectDirection: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  // Primary quantitative effect size, if the abstract reports one.
  effectMetric: "OR" | "RR" | "HR" | "SMD" | "MD" | null;
  effectValue: number | null;
  ciLow: number | null;
  ciHigh: number | null;
  favorsTx: boolean | null; // does effectValue below the no-effect line favour the intervention?
}

const PROMPT_HEADER = `You are an evidence-grader for a TCM clinical decision support platform.
Given one PubMed paper (title + abstract), return a STRICT JSON object that
classifies the study and extracts key fields.

CRITICAL: enum-valued fields below must use the EXACT English codes
(uppercase with underscores). Do NOT translate them to Chinese. Only the
free-text fields (population / intervention / comparator / primaryOutcome /
resultsSummary / summary) should be in Traditional Chinese (繁體中文).

studyType MUST be exactly one of:
  "SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT", "COHORT", "CASE_CONTROL",
  "CASE_SERIES", "CASE_REPORT", "EXPERT_OPINION", "TRADITIONAL_USE"

evidenceLevel MUST be exactly one of (Oxford CEBM-like):
  "LEVEL_1A"  — high-quality SR/MA of RCTs (incl. network meta-analyses)
  "LEVEL_1B"  — individual high-quality RCT
  "LEVEL_2A"  — SR of cohort studies
  "LEVEL_2B"  — individual cohort study
  "LEVEL_3A"  — SR of case-control
  "LEVEL_3B"  — case-control
  "LEVEL_4"   — case series / poor cohort
  "LEVEL_5"   — expert opinion / mechanism only / clinical guideline

evidenceGrade MUST be exactly one of: "A", "B", "C", "D"
  A — strong recommendation, low risk of bias, consistent results
  B — moderate
  C — weak / inconsistent
  D — very low confidence

riskOfBias MUST be exactly one of: "LOW", "SOME_CONCERNS", "HIGH", or null
outcomeType MUST be exactly one of: "EFFICACY", "SAFETY", "PHARMACOKINETICS", "MECHANISM"
effectDirection MUST be exactly one of: "POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"

EFFECT SIZE — if the abstract reports a PRIMARY quantitative pooled/result effect
with a 95% CI, extract it; otherwise set all four effect fields to null:
  effectMetric: "OR" | "RR" | "HR" | "SMD" | "MD" (the reported measure)
  effectValue:  the point estimate (number)
  ciLow / ciHigh: the 95% confidence interval bounds (numbers)
  favorsTx: true if a value on the "intervention-better" side of the no-effect
    line (1 for OR/RR/HR, 0 for SMD/MD) indicates the TCM intervention helped.
    For symptom/risk reduction outcomes (lower = better) this is usually true.
Only extract ONE primary effect. Do not invent values.

Use null for unknown numeric/free-text values rather than guessing. Output
JSON only — no prose, no markdown fences, no surrounding text.

Output shape:
{
  "evidenceLevel": "LEVEL_1A" | ... ,
  "evidenceGrade": "A" | "B" | "C" | "D",
  "studyType": "RCT" | ... ,
  "riskOfBias": "LOW" | "SOME_CONCERNS" | "HIGH" | null,
  "qualityScore": number | null,
  "sampleSize": number | null,
  "population": "繁體中文描述",
  "intervention": "繁體中文描述",
  "comparator": "繁體中文描述",
  "primaryOutcome": "繁體中文描述",
  "resultsSummary": "繁體中文 1-2 sentences",
  "summary": "繁體中文 1 sentence headline",
  "outcomeType": "EFFICACY" | ... ,
  "effectDirection": "POSITIVE" | ... ,
  "effectMetric": "OR" | "RR" | "HR" | "SMD" | "MD" | null,
  "effectValue": number | null,
  "ciLow": number | null,
  "ciHigh": number | null,
  "favorsTx": true | false | null
}`;

const STUDY_TYPES = new Set([
  "SYSTEMATIC_REVIEW", "META_ANALYSIS", "RCT", "COHORT", "CASE_CONTROL",
  "CASE_SERIES", "CASE_REPORT", "EXPERT_OPINION", "TRADITIONAL_USE",
]);
const EVIDENCE_LEVELS = new Set([
  "LEVEL_1A", "LEVEL_1B", "LEVEL_2A", "LEVEL_2B",
  "LEVEL_3A", "LEVEL_3B", "LEVEL_4", "LEVEL_5",
]);
const GRADES = new Set(["A", "B", "C", "D"]);
const RISK = new Set(["LOW", "SOME_CONCERNS", "HIGH"]);
const OUTCOME_TYPES = new Set(["EFFICACY", "SAFETY", "PHARMACOKINETICS", "MECHANISM"]);
const EFFECTS = new Set(["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"]);
const EFFECT_METRICS = new Set(["OR", "RR", "HR", "SMD", "MD"]);

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// Chinese → enum fallback for when the model ignores instructions
const ZH_STUDY_MAP: Record<string, GradedEvidence["studyType"]> = {
  系統評價: "SYSTEMATIC_REVIEW",
  系統性回顧: "SYSTEMATIC_REVIEW",
  系統綜述: "SYSTEMATIC_REVIEW",
  Meta分析: "META_ANALYSIS",
  網絡Meta分析: "META_ANALYSIS",
  網狀Meta分析: "META_ANALYSIS",
  薈萃分析: "META_ANALYSIS",
  隨機對照試驗: "RCT",
  臨床指導方針: "SYSTEMATIC_REVIEW",
  臨床指引: "SYSTEMATIC_REVIEW",
  指導方針: "SYSTEMATIC_REVIEW",
  指引: "SYSTEMATIC_REVIEW",
  隊列研究: "COHORT",
  病例對照研究: "CASE_CONTROL",
  病例系列: "CASE_SERIES",
  病例報告: "CASE_REPORT",
  專家意見: "EXPERT_OPINION",
  傳統應用: "TRADITIONAL_USE",
};

function coerceStudyType(v: unknown, fallback: GradedEvidence["studyType"]): GradedEvidence["studyType"] {
  if (typeof v !== "string") return fallback;
  if (STUDY_TYPES.has(v)) return v as GradedEvidence["studyType"];
  for (const [zh, en] of Object.entries(ZH_STUDY_MAP)) {
    if (v.includes(zh)) return en;
  }
  return fallback;
}
function pickFromSet<T extends string>(v: unknown, allowed: Set<string>, fallback: T): T {
  return typeof v === "string" && allowed.has(v) ? (v as T) : fallback;
}
function pickFromSetOrNull<T extends string>(v: unknown, allowed: Set<string>): T | null {
  return typeof v === "string" && allowed.has(v) ? (v as T) : null;
}

function stripFence(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _anthropic;
}

async function gradeViaAnthropic(userBlock: string): Promise<string | null> {
  const res = await anthropicClient().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    temperature: 0,
    messages: [{ role: "user", content: `${PROMPT_HEADER}\n\n${userBlock}` }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && block.type === "text" ? block.text : null;
}

async function gradeViaOpenAI(userBlock: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: 1024,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: `${PROMPT_HEADER}\n\n${userBlock}` }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI grade failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? null;
}

export async function gradePaper(article: PubMedArticle): Promise<GradedEvidence | null> {
  if (!article.abstract || article.abstract.length < 50) {
    return null;
  }
  const userBlock = `Title: ${article.title}

Journal: ${article.journal ?? "(unknown)"}
Year: ${article.year ?? "(unknown)"}
PMID: ${article.pubmedId}
PublicationType hint: ${article.studyTypeHint ?? "(none)"}

Abstract:
${article.abstract}`;

  const provider = pickProvider();
  if (!provider) throw new Error("No grading API key — set OPENAI_API_KEY or ANTHROPIC_API_KEY");
  const text = provider === "openai"
    ? await gradeViaOpenAI(userBlock)
    : await gradeViaAnthropic(userBlock);
  if (!text) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(stripFence(text)) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Validate + coerce enums. If a required enum is unrecognized, fall back to
  // the PublicationType hint from PubMed (which we trust as a safe default).
  const fallbackStudyType: GradedEvidence["studyType"] = (() => {
    const h = article.studyTypeHint?.toLowerCase() ?? "";
    if (h.includes("meta-analysis")) return "META_ANALYSIS";
    if (h.includes("systematic review")) return "SYSTEMATIC_REVIEW";
    if (h.includes("randomized controlled trial") || h.includes("clinical trial")) return "RCT";
    if (h.includes("cohort")) return "COHORT";
    if (h.includes("case reports")) return "CASE_REPORT";
    return "CASE_SERIES";
  })();

  const qs = typeof raw.qualityScore === "number" ? raw.qualityScore : null;
  const ss = typeof raw.sampleSize === "number" ? raw.sampleSize : null;
  return {
    studyType: coerceStudyType(raw.studyType, fallbackStudyType),
    evidenceLevel: pickFromSet<GradedEvidence["evidenceLevel"]>(raw.evidenceLevel, EVIDENCE_LEVELS, "LEVEL_4"),
    evidenceGrade: pickFromSet<GradedEvidence["evidenceGrade"]>(raw.evidenceGrade, GRADES, "C"),
    riskOfBias: pickFromSetOrNull<NonNullable<GradedEvidence["riskOfBias"]>>(raw.riskOfBias, RISK),
    qualityScore: qs !== null && qs >= 0 && qs <= 100 ? qs : null,
    sampleSize: ss !== null && ss > 0 ? Math.round(ss) : null,
    population: typeof raw.population === "string" ? raw.population : null,
    intervention: typeof raw.intervention === "string" ? raw.intervention : null,
    comparator: typeof raw.comparator === "string" ? raw.comparator : null,
    primaryOutcome: typeof raw.primaryOutcome === "string" ? raw.primaryOutcome : null,
    resultsSummary: typeof raw.resultsSummary === "string" ? raw.resultsSummary : null,
    summary: typeof raw.summary === "string" ? raw.summary : null,
    outcomeType: pickFromSet<GradedEvidence["outcomeType"]>(raw.outcomeType, OUTCOME_TYPES, "EFFICACY"),
    effectDirection: pickFromSet<GradedEvidence["effectDirection"]>(raw.effectDirection, EFFECTS, "NEUTRAL"),
    ...extractEffect(raw),
  };
}

// Pull a coherent effect size only when metric + value + a valid CI are all present.
function extractEffect(raw: Record<string, unknown>): Pick<GradedEvidence, "effectMetric" | "effectValue" | "ciLow" | "ciHigh" | "favorsTx"> {
  const metric = typeof raw.effectMetric === "string" && EFFECT_METRICS.has(raw.effectMetric)
    ? (raw.effectMetric as NonNullable<GradedEvidence["effectMetric"]>) : null;
  const value = num(raw.effectValue);
  const lo = num(raw.ciLow);
  const hi = num(raw.ciHigh);
  const ratio = metric === "OR" || metric === "RR" || metric === "HR";
  const valid = metric != null && value != null && lo != null && hi != null
    && lo < hi && (!ratio || (lo > 0 && hi > 0 && value > 0)); // ratio measures must be positive
  if (!valid) return { effectMetric: null, effectValue: null, ciLow: null, ciHigh: null, favorsTx: null };
  return {
    effectMetric: metric,
    effectValue: value,
    ciLow: lo,
    ciHigh: hi,
    favorsTx: typeof raw.favorsTx === "boolean" ? raw.favorsTx : null,
  };
}
