"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface Differential {
  patternId: string | null;
  patternName: string;
  pathologyType: string | null;
  confidence: number;
  supportingFeatures: string[];
  reasoning: string;
}
interface RecommendedFormula { formulaId: string | null; name: string; rationale: string }
interface Grounding { id: string; chineseName: string; pathologyType: string; matched: string[] }
interface ReasonResponse {
  ok: boolean;
  error?: string;
  differentials?: Differential[];
  treatmentPrinciple?: string;
  recommendedFormulas?: RecommendedFormula[];
  redFlags?: string[];
  summary?: string;
  grounding?: Grounding[];
  model?: string;
}

export function AiSyndromeReasoner({ locale }: { locale: Locale }) {
  const zh = locale === "zh-Hant";
  const T = (z: string, e: string) => (zh ? z : e);

  const [symptoms, setSymptoms] = useState("");
  const [tongueBody, setTongueBody] = useState("");
  const [tongueCoat, setTongueCoat] = useState("");
  const [pulse, setPulse] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<ReasonResponse | null>(null);

  async function run() {
    if (symptoms.trim().length < 2) return;
    setLoading(true);
    setRes(null);
    try {
      const r = await fetch("/api/diagnose/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptomsText: symptoms, tongueBody, tongueCoat, pulse }),
      });
      setRes((await r.json()) as ReasonResponse);
    } catch {
      setRes({ ok: false, error: "network" });
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-indigo-700">{T("AI 辨證推理", "AI Syndrome Differentiation")}</h2>
        <p className="text-xs text-muted mt-0.5">
          {T(
            "輸入四診資料，AI 以知識庫檢索到的證型為依據進行鑑別辨證（僅供臨床參考，須醫師覆核）。",
            "Enter the four-exam findings; the AI performs differential 辨證 grounded in retrieved knowledge-base patterns (clinical reference only — requires practitioner review).",
          )}
        </p>
      </div>

      <textarea
        className={`${input} min-h-20`}
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        placeholder={T("主訴與症狀，如：失眠多夢、心悸健忘、神疲乏力、食少便溏…", "Symptoms, e.g. insomnia, palpitations, fatigue, poor appetite, loose stool…")}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={input} value={tongueBody} onChange={(e) => setTongueBody(e.target.value)} placeholder={T("舌質（如 淡紅）", "Tongue body")} />
        <input className={input} value={tongueCoat} onChange={(e) => setTongueCoat(e.target.value)} placeholder={T("舌苔（如 薄白）", "Tongue coat")} />
        <input className={input} value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder={T("脈象（如 細弱）", "Pulse")} />
      </div>
      <button
        onClick={run}
        disabled={loading || symptoms.trim().length < 2}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {loading ? T("辨證分析中…", "Reasoning…") : T("開始辨證", "Run differentiation")}
      </button>

      {res && !res.ok && (
        <p className="text-sm text-amber-700">
          {res.error === "no_result"
            ? T("未取得結果（未配置 AI 金鑰，或無相符證型）。", "No result (no AI key configured, or no matching patterns).")
            : T("分析失敗，請重試。", "Analysis failed, please retry.")}
        </p>
      )}

      {res && res.ok && (
        <div className="space-y-4">
          {res.summary && <p className="text-sm font-medium">{res.summary}</p>}

          {/* Differentials */}
          <div className="space-y-2">
            {(res.differentials ?? []).map((d, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {d.patternId ? (
                      <Link href={`/patterns/${d.patternId}`} className="hover:text-primary">{d.patternName}</Link>
                    ) : (
                      d.patternName
                    )}
                    {d.pathologyType && <span className="ml-2 text-xs text-muted">{d.pathologyType}</span>}
                  </div>
                  <span className="text-xs tabular-nums text-muted">{d.confidence}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded bg-muted/20">
                  <div className="h-1.5 rounded bg-indigo-500" style={{ width: `${d.confidence}%` }} />
                </div>
                {d.supportingFeatures.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {d.supportingFeatures.map((f, j) => (
                      <span key={j} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-xs text-indigo-700">{f}</span>
                    ))}
                  </div>
                )}
                {d.reasoning && <p className="mt-1 text-xs text-muted leading-relaxed">{d.reasoning}</p>}
              </div>
            ))}
          </div>

          {res.treatmentPrinciple && (
            <p className="text-sm"><span className="font-semibold">{T("治法：", "Treatment principle: ")}</span>{res.treatmentPrinciple}</p>
          )}

          {(res.recommendedFormulas ?? []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-1">{T("建議方劑", "Recommended formulas")}</h3>
              <ul className="space-y-1">
                {res.recommendedFormulas!.map((f, i) => (
                  <li key={i} className="text-sm">
                    {f.formulaId ? (
                      <Link href={`/formulas/${f.formulaId}`} className="font-medium text-primary hover:underline">{f.name}</Link>
                    ) : (
                      <span className="font-medium">{f.name}</span>
                    )}
                    {f.rationale && <span className="text-muted"> — {f.rationale}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(res.redFlags ?? []).length > 0 && (
            <div className="rounded-lg border border-red-400/40 bg-red-50/40 dark:bg-red-900/10 p-3">
              <h3 className="text-sm font-semibold text-red-700 mb-1">⚠ {T("危險徵象 / 轉診提示", "Red flags / referral")}</h3>
              <ul className="list-disc pl-5 text-xs space-y-0.5">
                {res.redFlags!.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {(res.grounding ?? []).length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">{T(`檢索依據（${res.grounding!.length} 個候選證型）`, `Grounding (${res.grounding!.length} retrieved patterns)`)}</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {res.grounding!.map((g) => (
                  <Link key={g.id} href={`/patterns/${g.id}`} className="rounded border border-border px-2 py-0.5 hover:border-primary-light">
                    {g.chineseName}
                  </Link>
                ))}
              </div>
            </details>
          )}

          <p className="text-xs text-muted border-t border-border pt-2">
            {T(
              `由 ${res.model} 依知識庫檢索結果生成，為臨床決策輔助，非診斷結論；最終辨證與處方須由合資格中醫師判斷。`,
              `Generated by ${res.model} from knowledge-base retrieval — clinical decision support, not a diagnosis; final differentiation and prescription require a licensed practitioner.`,
            )}
          </p>
        </div>
      )}
    </div>
  );
}
