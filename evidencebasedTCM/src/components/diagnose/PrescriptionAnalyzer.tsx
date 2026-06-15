"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";

interface AnalysisResult {
  ok: true;
  rawPrescription: string;
  extractedHerbs: Array<{ rawName?: string; name?: string; pinyin?: string; dosage?: string; notes?: string }>;
  matchedHerbs: Array<{ raw: string; herbId: string; chineseName: string; pinyinName: string; category: string; dosage?: string }>;
  unmatchedHerbs: string[];
  matchedFormulas: Array<{
    formulaId: string; chineseName: string; pinyinName: string; category: string;
    actions: string | null; indications: string | null;
    matchPct: number; matchedHerbCount: number; totalHerbCount: number;
  }>;
  suggestedConditions: Array<{
    conditionId: string;
    westernName: string;
    chineseName: string;
    tcmName: string | null;
    icd11Code: string | null;
    score: number;
  }>;
  suggestedPatterns: Array<{ patternId: string; chineseName: string; pinyinName: string; score: number }>;
  warnings: string[];
}

interface AnalysisError {
  ok: false;
  error: string;
  reason: string;
}

type AnalysisResponse = AnalysisResult | AnalysisError;

export interface HerbOption {
  id: string;
  chineseName: string;
  pinyinName: string;
  category: string;
}

interface Props {
  locale: Locale;
  herbs: HerbOption[];
  photoEnabled: boolean;
  providerLabel: string | null;
}

type Mode = "photo" | "manual";

export function PrescriptionAnalyzer({ locale, herbs, photoEnabled, providerLabel }: Props) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [mode, setMode] = useState<Mode>(photoEnabled ? "photo" : "manual");
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Photo mode state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual mode state
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Array<{ id: string; dosage: string }>>([]);

  const visibleHerbs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return herbs.slice(0, 30);
    return herbs
      .filter(
        (h) =>
          h.chineseName.includes(query) ||
          h.pinyinName.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [herbs, query]);

  const selectedSet = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const herbsById = useMemo(() => {
    const m = new Map<string, HerbOption>();
    for (const h of herbs) m.set(h.id, h);
    return m;
  }, [herbs]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setResult(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function resetPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addHerb(id: string) {
    if (selectedSet.has(id)) return;
    setSelected((prev) => [...prev, { id, dosage: "" }]);
    setResult(null);
  }
  function removeHerb(id: string) {
    setSelected((prev) => prev.filter((s) => s.id !== id));
    setResult(null);
  }
  function updateDosage(id: string, dosage: string) {
    setSelected((prev) => prev.map((s) => (s.id === id ? { ...s, dosage } : s)));
  }
  function clearSelection() {
    setSelected([]);
    setResult(null);
  }

  async function analyzePhoto() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/diagnose/prescription", { method: "POST", body: fd });
      const json: AnalysisResponse = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error", reason: "internal" });
    } finally {
      setLoading(false);
    }
  }

  async function analyzeManual() {
    if (selected.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/diagnose/herbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: selected.map((s) => ({
            herbId: s.id,
            dosage: s.dosage.trim() || undefined,
          })),
        }),
      });
      const json: AnalysisResponse = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error", reason: "internal" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => switchMode("photo")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mode === "photo"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
          disabled={!photoEnabled}
          title={!photoEnabled ? T("未設定 API Key", "API Key not configured") : undefined}
        >
          📷 {T("拍照識別", "Photo recognition")}
        </button>
        <button
          type="button"
          onClick={() => switchMode("manual")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            mode === "manual"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          ✏️ {T("手動選擇藥材", "Pick herbs manually")}
        </button>
      </div>

      {/* Photo mode */}
      {mode === "photo" && (
        <>
          {!photoEnabled ? (
            <div className="rounded-lg border border-border p-6 bg-surface">
              <h3 className="text-base font-semibold mb-2">
                {T("需設定 API Key", "API Key required")}
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-3">
                {T(
                  "拍照識別需要 OpenAI 或 Anthropic API Key。請在 .env 檔案中設定其一，並重新啟動伺服器。手動選擇藥材功能無需 API Key。",
                  "Photo recognition needs an OpenAI or Anthropic API key. Set one in your .env file and restart the dev server. Manual herb selection works without an API key.",
                )}
              </p>
              <pre className="text-xs bg-background border border-border rounded p-3 overflow-x-auto">
                <code>{`# .env (choose one)\nOPENAI_API_KEY="sk-..."\nANTHROPIC_API_KEY="sk-ant-..."`}</code>
              </pre>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-base font-semibold mb-1">{T("1. 上傳處方照片", "1. Upload prescription photo")}</h3>
              {providerLabel && (
                <p className="text-xs text-muted mb-3">
                  {T("使用視覺模型：", "Vision model: ")}<span className="font-medium">{providerLabel}</span>
                </p>
              )}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="rounded-md border border-border bg-background px-4 py-2 text-sm cursor-pointer hover:bg-surface">
                    {T("📁 選擇檔案", "📁 Choose file")}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <label className="rounded-md border border-border bg-background px-4 py-2 text-sm cursor-pointer hover:bg-surface">
                    {T("📷 用相機拍照", "📷 Use camera")}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {file && (
                    <button
                      onClick={resetPhoto}
                      className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-surface"
                    >
                      {T("✕ 重置", "✕ Reset")}
                    </button>
                  )}
                </div>
                {previewUrl && (
                  <div className="rounded-md border border-border overflow-hidden bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="prescription preview" className="block max-h-[420px] w-full object-contain" />
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4">
                  <button
                    onClick={analyzePhoto}
                    disabled={loading}
                    className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? T("分析中…", "Analyzing…") : T("2. 開始分析", "2. Start analysis")}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h3 className="text-base font-semibold mb-1">
            {T("1. 選擇處方中的藥材", "1. Pick the herbs in your prescription")}
          </h3>
          <p className="text-xs text-muted mb-3">
            {T(
              "在下方搜尋並點擊加入藥材。可填寫劑量（選填）。完成後按下「開始分析」對照可能的方劑與用途。",
              "Search below and click to add herbs. Dosage is optional. When done, hit “Start analysis” to match against known formulas and likely uses.",
            )}
          </p>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T("搜尋藥材（中文 / 拼音 / 分類）", "Search herbs (Chinese / pinyin / category)")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-3"
          />

          <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-3 max-h-72 overflow-y-auto mb-4 pr-1">
            {visibleHerbs.map((h) => {
              const isOn = selectedSet.has(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => (isOn ? removeHerb(h.id) : addHerb(h.id))}
                  className={`text-left text-xs rounded-md border px-2 py-1.5 transition-colors ${
                    isOn
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:border-primary-light"
                  }`}
                >
                  <div className="font-medium text-sm">{h.chineseName}</div>
                  <div className="text-xs text-muted">{h.pinyinName} · {h.category}</div>
                </button>
              );
            })}
            {visibleHerbs.length === 0 && (
              <p className="text-xs text-muted col-span-full">{T("無相符藥材", "No matching herbs.")}</p>
            )}
          </div>

          {selected.length > 0 && (
            <div className="rounded-md border border-border bg-background p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">
                  {T("已選藥材", "Selected herbs")} · {selected.length}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-muted hover:text-foreground"
                >
                  {T("清除全部", "Clear all")}
                </button>
              </div>
              <div className="space-y-1.5">
                {selected.map((s) => {
                  const h = herbsById.get(s.id);
                  if (!h) return null;
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">
                        <span className="font-medium">{h.chineseName}</span>{" "}
                        <span className="text-xs text-muted">{h.pinyinName}</span>
                      </span>
                      <input
                        value={s.dosage}
                        onChange={(e) => updateDosage(s.id, e.target.value)}
                        placeholder={T("劑量 (選填)", "dosage")}
                        className="w-24 rounded border border-border bg-surface px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => removeHerb(s.id)}
                        className="text-xs text-muted hover:text-red-500"
                        aria-label="remove"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={analyzeManual}
            disabled={loading || selected.length === 0}
            className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? T("分析中…", "Analyzing…")
              : T("2. 開始分析", "2. Start analysis")}
          </button>
        </div>
      )}

      {/* Results (shared for both modes) */}
      {result && !result.ok && (
        <div className="rounded-lg border border-red-400/40 bg-red-50/60 dark:bg-red-900/10 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            ❌ {result.error}
          </p>
        </div>
      )}

      {result && result.ok && (
        <div className="space-y-6">
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-yellow-400/40 bg-yellow-50/40 dark:bg-yellow-900/10 p-4">
              <h4 className="text-sm font-semibold mb-1">⚠ {T("注意事項", "Cautions")}</h4>
              <ul className="text-xs text-muted leading-relaxed list-disc pl-5 space-y-0.5">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Transcription (photo mode) */}
          {result.rawPrescription && (
            <details className="rounded-lg border border-border bg-surface p-4">
              <summary className="text-sm font-semibold cursor-pointer">
                {T("AI 識別原文", "AI Transcription")}
              </summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap text-muted leading-relaxed">{result.rawPrescription}</pre>
            </details>
          )}

          {/* Matched herbs */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h4 className="text-sm font-semibold mb-3">
              {T("組成藥材", "Herb Composition")}{" "}
              <span className="text-xs text-muted font-normal">
                ({result.matchedHerbs.length} {T("味", "matched")}
                {result.unmatchedHerbs.length > 0 && ` · ${result.unmatchedHerbs.length} ${T("未匹配", "unmatched")}`})
              </span>
            </h4>
            {result.matchedHerbs.length === 0 ? (
              <p className="text-xs text-muted">{T("無匹配", "No matches.")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {result.matchedHerbs.map((h) => (
                  <Link
                    key={h.herbId}
                    href={`/herbs/${h.herbId}`}
                    className="block rounded-md border border-border bg-background p-2 hover:border-primary-light"
                  >
                    <div className="font-medium text-sm">
                      {h.chineseName}
                      {h.dosage && <span className="ml-2 text-xs text-primary">{h.dosage}</span>}
                    </div>
                    <div className="text-xs text-muted">{h.pinyinName} · {h.category}</div>
                  </Link>
                ))}
              </div>
            )}
            {result.unmatchedHerbs.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                <span className="font-medium">{T("未匹配藥物：", "Unmatched: ")}</span>
                {result.unmatchedHerbs.join("、")}
              </p>
            )}
          </div>

          {/* Matched formulas */}
          {result.matchedFormulas.length > 0 && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
              <h4 className="text-sm font-semibold mb-3">
                💊 {T("可能對應方劑", "Likely Formula Match")}
              </h4>
              <div className="space-y-3">
                {result.matchedFormulas.slice(0, 3).map((f) => (
                  <Link
                    key={f.formulaId}
                    href={`/formulas/${f.formulaId}`}
                    className="block rounded-md border border-border bg-background p-3 hover:border-primary"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-semibold">{f.chineseName} <span className="text-xs text-muted font-normal">{f.pinyinName}</span></div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                        {f.matchPct}% · {f.matchedHerbCount}/{f.totalHerbCount}
                      </span>
                    </div>
                    {f.actions && (
                      <p className="text-xs text-muted mb-1">
                        <span className="font-medium text-foreground">{T("功效：", "Actions: ")}</span>{f.actions}
                      </p>
                    )}
                    {f.indications && (
                      <p className="text-xs text-muted">
                        <span className="font-medium text-foreground">{T("主治：", "Indications: ")}</span>{f.indications}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Suggested conditions */}
          {result.suggestedConditions.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="text-sm font-semibold mb-3">
                🎯 {T("可能適用病症", "Likely Conditions Treated")}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.suggestedConditions.map((c) => {
                  const primary = isZh ? c.chineseName : c.westernName;
                  const secondary = isZh ? c.westernName : c.chineseName;
                  return (
                    <Link
                      key={c.conditionId}
                      href={`/conditions/${c.conditionId}`}
                      className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-2 hover:border-primary-light"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{primary}</div>
                        {c.tcmName && (
                          <div className="text-xs text-primary truncate">
                            {T("中醫病名：", "TCM term: ")}{c.tcmName}
                          </div>
                        )}
                        <div className="text-xs text-muted truncate">
                          {secondary}
                          {c.icd11Code && <span className="ml-1">· ICD-11 {c.icd11Code}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted whitespace-nowrap">★ {c.score}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested patterns */}
          {result.suggestedPatterns.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h4 className="text-sm font-semibold mb-3">
                {T("可能對應證型", "Likely TCM Patterns")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.suggestedPatterns.map((p) => (
                  <Link
                    key={p.patternId}
                    href={`/patterns/${p.patternId}`}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary-light"
                  >
                    {p.chineseName} <span className="text-muted">· {p.pinyinName} · ★{p.score}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Final reminder */}
          <p className="text-xs text-muted leading-relaxed text-center">
            {T(
              "📌 以上為 AI 推論結果，僅供參考。實際用途以您的中醫師處方說明為準。",
              "📌 The above is AI-inferred. Always defer to your TCM physician's prescription explanation for actual use.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
