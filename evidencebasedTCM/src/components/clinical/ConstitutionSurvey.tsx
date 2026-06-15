"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  SURVEY_ITEMS,
  CONSTITUTION_TYPES,
  type ConstitutionKey,
  type SurveyItem,
} from "@/lib/clinical/constitution-survey";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  locale: Locale;
  patientId: string | null;
}

interface Result {
  scores: Record<ConstitutionKey, number>;
  primary: ConstitutionKey;
  secondary: ConstitutionKey | null;
  presentTypes: ConstitutionKey[];
  tendencyTypes: ConstitutionKey[];
  saved: boolean;
}

const LIKERT = [1, 2, 3, 4, 5] as const;
const LIKERT_LABELS: Record<number, { zh: string; en: string }> = {
  1: { zh: "從不", en: "Never" },
  2: { zh: "很少", en: "Seldom" },
  3: { zh: "有時", en: "Sometimes" },
  4: { zh: "經常", en: "Often" },
  5: { zh: "總是", en: "Always" },
};

export function ConstitutionSurvey({ locale, patientId }: Props) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const groupedByType = useMemo(() => {
    const m = new Map<ConstitutionKey, SurveyItem[]>();
    for (const item of SURVEY_ITEMS) {
      if (!m.has(item.type)) m.set(item.type, []);
      m.get(item.type)!.push(item);
    }
    return m;
  }, []);

  const totalItems = SURVEY_ITEMS.length;
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / totalItems) * 100);

  function setAnswer(id: string, v: number) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  async function submit() {
    if (answered < totalItems) {
      setError(T(`還剩 ${totalItems - answered} 題未作答`, `${totalItems - answered} questions remaining`));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/diagnose/constitution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, patientId, notes: notes.trim() || null }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? T("提交失敗", "Submit failed"));
        setSubmitting(false);
        return;
      }
      setResult(j as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network_error");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ResultView result={result} locale={locale} patientId={patientId} onRetake={() => { setResult(null); setAnswers({}); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mx-4 px-4 border-b border-border">
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>{T(`進度 ${answered} / ${totalItems}`, `Progress ${answered} / ${totalItems}`)}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {Array.from(groupedByType.entries()).map(([type, items]) => {
        const ct = CONSTITUTION_TYPES.find((c) => c.key === type)!;
        return (
          <fieldset key={type} className="rounded-lg border border-border bg-surface p-4">
            <legend className="text-xs font-semibold text-muted px-2">
              {ct.chineseName}{!isZh && ` · ${ct.englishName}`}
            </legend>
            <ul className="space-y-3 mt-2">
              {items.map((it) => (
                <li key={it.id}>
                  <p className="text-sm mb-1.5">{isZh ? it.zh : it.en}</p>
                  <div className="flex flex-wrap gap-1">
                    {LIKERT.map((v) => {
                      const on = answers[it.id] === v;
                      const lbl = LIKERT_LABELS[v];
                      return (
                        <button
                          type="button"
                          key={v}
                          onClick={() => setAnswer(it.id, v)}
                          className={`flex-1 min-w-[3.5rem] rounded border px-2 py-1 text-xs transition-colors ${
                            on
                              ? "border-primary bg-primary text-white"
                              : "border-border bg-background hover:border-primary-light"
                          }`}
                        >
                          <div className="font-semibold">{v}</div>
                          <div className="text-xs opacity-80">{isZh ? lbl.zh : lbl.en}</div>
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}

      {patientId && (
        <div>
          <label className="block text-xs text-muted mb-1">{T("備註 (選填)", "Notes (optional)")}</label>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={T("如：本次受測背景、近期生活狀況", "e.g. context of this assessment, recent life events")}
          />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-50/60 px-3 py-2 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-md bg-primary text-white py-3 font-semibold disabled:opacity-50"
      >
        {submitting ? T("分析中…", "Scoring…") : T("提交並查看結果", "Submit & see results")}
      </button>
    </div>
  );
}

function ResultView({ result, locale, patientId, onRetake }: { result: Result; locale: Locale; patientId: string | null; onRetake: () => void }) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const primary = CONSTITUTION_TYPES.find((c) => c.key === result.primary)!;
  const secondary = result.secondary ? CONSTITUTION_TYPES.find((c) => c.key === result.secondary) : null;
  const sortedByScore = (Object.entries(result.scores) as Array<[ConstitutionKey, number]>)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-5">
        <div className="text-xs text-muted mb-1">{T("主要體質", "Primary constitution")}</div>
        <h2 className="text-2xl font-bold mb-1">
          {primary.chineseName}{!isZh && ` · ${primary.englishName}`}
          <span className="ml-3 text-base font-medium text-primary">
            {result.scores[primary.key]} / 100
          </span>
        </h2>
        <p className="text-sm leading-relaxed">{isZh ? primary.description.zh : primary.description.en}</p>
        <p className="text-xs text-muted mt-2">
          <span className="font-medium">{T("調養建議：", "Recommendations: ")}</span>
          {isZh ? primary.recommendations.zh : primary.recommendations.en}
        </p>
      </div>

      {secondary && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted mb-1">{T("次要體質", "Secondary tendency")}</div>
          <h3 className="text-lg font-semibold">
            {secondary.chineseName}{!isZh && ` · ${secondary.englishName}`}
            <span className="ml-2 text-sm text-primary">{result.scores[secondary.key]} / 100</span>
          </h3>
          <p className="text-xs text-muted mt-1">{isZh ? secondary.description.zh : secondary.description.en}</p>
        </div>
      )}

      {/* All-types bar chart */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold mb-3">{T("9 體質得分", "All 9 type scores")}</h3>
        <div className="space-y-1.5">
          {sortedByScore.map(([key, score]) => {
            const ct = CONSTITUTION_TYPES.find((c) => c.key === key)!;
            const present = result.presentTypes.includes(key);
            const tendency = result.tendencyTypes.includes(key);
            const barColor = key === result.primary
              ? "bg-primary"
              : present ? "bg-orange-500" : tendency ? "bg-yellow-400" : "bg-gray-300";
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate">{ct.chineseName}{!isZh && ` ${ct.englishName}`}</span>
                <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums">{score}</span>
                {present && <span className="text-orange-600 w-12">{T("傾向", "Present")}</span>}
                {tendency && <span className="text-yellow-600 w-12">{T("輕度", "Tendency")}</span>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-3">
          {T(
            "判讀：≥ 60 為「平和質」典型；其他體質 ≥ 40 為「傾向」，30–39 為「輕度傾向」。",
            "Reading: 平和 ≥ 60 = balanced; other types ≥ 40 = present, 30–39 = tendency.",
          )}
        </p>
      </div>

      {result.saved && (
        <p className="text-sm text-green-700 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-md p-3">
          ✓ {T("已儲存至病人檔案。", "Saved to patient chart.")}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetake}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-surface"
        >
          {T("重新評估", "Retake")}
        </button>
        {patientId && (
          <Link
            href={`/patients/${patientId}`}
            className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-light"
          >
            {T("返回病人檔案", "Back to patient")}
          </Link>
        )}
      </div>
    </div>
  );
}
