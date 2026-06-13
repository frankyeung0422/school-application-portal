import Anthropic from "@anthropic-ai/sdk";
import { retrievePatterns, type DiagnoseInput, type RetrievedPattern } from "./rag-retrieve";

/**
 * RAG-grounded syndrome differentiation (辨證) reasoner.
 *
 * Retrieves candidate patterns from the knowledge base, then asks an LLM to
 * reason through the differential — constrained to ONLY cite the retrieved
 * patterns/formulas (hallucinated IDs are dropped). Returns ranked
 * differentials with supporting features + a recommended formula + red flags.
 */

export interface Differential {
  patternId: string | null;
  patternName: string;
  pathologyType: string | null;
  confidence: number; // 0..100
  supportingFeatures: string[];
  reasoning: string;
}

export interface RecommendedFormula {
  formulaId: string | null;
  name: string;
  rationale: string;
}

export interface SyndromeReasoning {
  differentials: Differential[];
  treatmentPrinciple: string;
  recommendedFormulas: RecommendedFormula[];
  redFlags: string[];
  summary: string;
  grounding: RetrievedPattern[];
  model: string;
}

function pickProvider(): "openai" | "anthropic" | null {
  const ovr = process.env.DIAGNOSE_PROVIDER?.toLowerCase();
  if (ovr === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (ovr === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}
const OPENAI_MODEL = process.env.DIAGNOSE_OPENAI_MODEL ?? "gpt-4o-mini";
const ANTHROPIC_MODEL = process.env.DIAGNOSE_ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

function buildPrompt(input: DiagnoseInput, patterns: RetrievedPattern[]): string {
  const candidates = patterns
    .map(
      (p, i) =>
        `${i + 1}. 證型【${p.chineseName}】id=${p.id} 病性=${p.pathologyType}\n` +
        `   主症：${p.keySymptoms ?? "—"}\n` +
        `   舌：${p.tongue ?? "—"}｜脈：${p.pulse ?? "—"}｜治法：${p.treatmentPrinciple ?? "—"}\n` +
        `   代表方：${p.formulas.map((f) => `${f.chineseName}(id=${f.id})`).join("、") || "—"}`,
    )
    .join("\n");

  return `你是中醫辨證推理助理。根據病人四診資料，從「候選證型」中進行鑑別辨證（differential diagnosis）。

【嚴格規則】
- 只能從下方候選證型與其代表方中選擇；patternId 與 formulaId 必須來自候選清單，禁止杜撰。
- 以病人實際症狀、舌、脈為依據，逐項說明支持該證型的特徵。
- 信心值 confidence 為 0–100。
- 所有自由文字以繁體中文輸出；JSON 鍵名維持英文。
- 僅輸出 JSON，無其他文字、無 markdown 圍欄。

【病人四診】
主訴/症狀：${input.symptomsText || "（未提供）"}
舌質：${input.tongueBody ?? "—"}｜舌苔：${input.tongueCoat ?? "—"}｜脈象：${input.pulse ?? "—"}

【候選證型（知識庫檢索）】
${candidates}

【輸出 JSON 結構】
{
  "differentials": [
    { "patternId": "候選id", "patternName": "證型名", "confidence": 0-100,
      "supportingFeatures": ["支持此證的具體症狀/舌/脈"], "reasoning": "辨證推理（繁中）" }
  ],
  "treatmentPrinciple": "總體治法（繁中）",
  "recommendedFormulas": [ { "formulaId": "候選方id", "name": "方名", "rationale": "選方理由（繁中）" } ],
  "redFlags": ["需警惕/轉診的危險徵象（繁中）"],
  "summary": "一句話總結（繁中）"
}`;
}

function stripFence(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
}

let _anthropic: Anthropic | null = null;
async function callLLM(provider: "openai" | "anthropic", prompt: string): Promise<string | null> {
  if (provider === "anthropic") {
    if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const res = await _anthropic.messages.create({
      model: ANTHROPIC_MODEL, max_tokens: 1500, temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });
    const b = res.content.find((c) => c.type === "text");
    return b && b.type === "text" ? b.text : null;
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY!}` },
    body: JSON.stringify({
      model: OPENAI_MODEL, max_tokens: 1500, temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? null;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const asStrArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export async function reasonSyndrome(input: DiagnoseInput): Promise<SyndromeReasoning | null> {
  const provider = pickProvider();
  if (!provider) return null;
  if (!input.symptomsText || input.symptomsText.trim().length < 2) return null;

  const grounding = await retrievePatterns(input, 12);
  if (grounding.length === 0) return null;

  const text = await callLLM(provider, buildPrompt(input, grounding)).catch(() => null);
  if (!text) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(stripFence(text)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const patternById = new Map(grounding.map((p) => [p.id, p]));
  const formulaIds = new Set(grounding.flatMap((p) => p.formulas.map((f) => f.id)));

  const differentials: Differential[] = (Array.isArray(raw.differentials) ? raw.differentials : [])
    .map((d): Differential | null => {
      if (!d || typeof d !== "object") return null;
      const o = d as Record<string, unknown>;
      const pid = typeof o.patternId === "string" && patternById.has(o.patternId) ? o.patternId : null;
      const name = typeof o.patternName === "string" ? o.patternName : pid ? patternById.get(pid)!.chineseName : "";
      if (!name) return null;
      return {
        patternId: pid,
        patternName: name,
        pathologyType: pid ? patternById.get(pid)!.pathologyType : null,
        confidence: clamp(typeof o.confidence === "number" ? o.confidence : 0, 0, 100),
        supportingFeatures: asStrArr(o.supportingFeatures),
        reasoning: typeof o.reasoning === "string" ? o.reasoning : "",
      };
    })
    .filter((x): x is Differential => x !== null)
    .sort((a, b) => b.confidence - a.confidence);

  const recommendedFormulas: RecommendedFormula[] = (Array.isArray(raw.recommendedFormulas) ? raw.recommendedFormulas : [])
    .map((f): RecommendedFormula | null => {
      if (!f || typeof f !== "object") return null;
      const o = f as Record<string, unknown>;
      const fid = typeof o.formulaId === "string" && formulaIds.has(o.formulaId) ? o.formulaId : null;
      const name = typeof o.name === "string" ? o.name : "";
      if (!name) return null;
      return { formulaId: fid, name, rationale: typeof o.rationale === "string" ? o.rationale : "" };
    })
    .filter((x): x is RecommendedFormula => x !== null);

  return {
    differentials,
    treatmentPrinciple: typeof raw.treatmentPrinciple === "string" ? raw.treatmentPrinciple : "",
    recommendedFormulas,
    redFlags: asStrArr(raw.redFlags),
    summary: typeof raw.summary === "string" ? raw.summary : "",
    grounding,
    model: provider === "openai" ? OPENAI_MODEL : ANTHROPIC_MODEL,
  };
}
