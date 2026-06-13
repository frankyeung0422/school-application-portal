"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DRUGS, searchDrugs, type DrugRecord } from "@/lib/safety/rxnorm-subset";
import type { Locale } from "@/lib/i18n/types";

interface HerbOpt {
  id: string;
  chineseName: string;
  pinyinName: string;
  englishName: string | null;
  category: string;
}

interface SafetyByHerb {
  herbId: string;
  chineseName: string;
  pinyinName: string;
  englishName: string | null;
  category: string;
  pregnancy: string | null;
  lactation: string | null;
  pediatric: string | null;
  contraindicationCount: number;
}

interface Interaction {
  herbId: string;
  herbChineseName: string;
  herbPinyinName: string;
  drugGeneric: string;
  drugDisplay: string;
  drugClass: string;
  severity: "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL" | string;
  mechanism: string | null;
  clinicalEffect: string | null;
  management: string | null;
}

interface HerbHerbConflict {
  herbAId: string;
  herbAChineseName: string;
  herbBId: string;
  herbBChineseName: string;
  interactionType: string;
  severity: string;
  description: string | null;
  classicalSource: string | null;
}

interface PredictedInteraction {
  herbId: string;
  herbChineseName: string;
  herbPinyinName: string;
  drugGeneric: string;
  drugDisplay: string;
  enzyme: string;
  direction: "inhibits" | "induces";
  effect: "INCREASE" | "DECREASE";
  severity: "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL" | string;
  basis: "curated" | "network";
  mechanism: string;
  management: string;
}

interface CheckResponse {
  ok: true;
  herbs: SafetyByHerb[];
  interactions: Interaction[];
  predictedInteractions: PredictedInteraction[];
  herbHerbConflicts: HerbHerbConflict[];
  drugs: Array<{ generic: string; display: string; className: string }>;
}

const SEV_CLASS: Record<string, string> = {
  MAJOR: "bg-red-100 text-red-800 border-red-400 dark:bg-red-900/30 dark:text-red-300",
  MODERATE: "bg-orange-100 text-orange-800 border-orange-400 dark:bg-orange-900/30 dark:text-orange-300",
  MINOR: "bg-yellow-100 text-yellow-800 border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-300",
  THEORETICAL: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300",
};

const SAFETY_CLASS: Record<string, string> = {
  CONTRAINDICATED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CAUTION: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CAUTION_OVER_2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CAUTION_OVER_6: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  SAFE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  UNKNOWN: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

export function InteractionChecker({ locale }: { locale: Locale }) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const [herbQuery, setHerbQuery] = useState("");
  const [herbSuggestions, setHerbSuggestions] = useState<HerbOpt[]>([]);
  const [herbsSelected, setHerbsSelected] = useState<HerbOpt[]>([]);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugsSelected, setDrugsSelected] = useState<DrugRecord[]>([]);

  const [result, setResult] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live herb autocomplete (debounced).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (herbQuery.trim().length === 0) {
      setHerbSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/safety/herbs?q=${encodeURIComponent(herbQuery)}`);
        const j = await res.json();
        if (j.ok) setHerbSuggestions(j.herbs as HerbOpt[]);
      } catch {
        /* ignore */
      }
    }, 200);
  }, [herbQuery]);

  const drugSuggestions = useMemo(() => searchDrugs(drugQuery, 12), [drugQuery]);

  const selectedHerbIds = useMemo(() => new Set(herbsSelected.map((h) => h.id)), [herbsSelected]);
  const selectedDrugGenerics = useMemo(() => new Set(drugsSelected.map((d) => d.generic)), [drugsSelected]);

  function addHerb(h: HerbOpt) {
    if (selectedHerbIds.has(h.id)) return;
    setHerbsSelected((prev) => [...prev, h]);
    setHerbQuery("");
    setHerbSuggestions([]);
    setResult(null);
  }
  function removeHerb(id: string) {
    setHerbsSelected((prev) => prev.filter((h) => h.id !== id));
    setResult(null);
  }
  function addDrug(d: DrugRecord) {
    if (selectedDrugGenerics.has(d.generic)) return;
    setDrugsSelected((prev) => [...prev, d]);
    setDrugQuery("");
    setResult(null);
  }
  function removeDrug(generic: string) {
    setDrugsSelected((prev) => prev.filter((d) => d.generic !== generic));
    setResult(null);
  }

  async function runCheck() {
    if (herbsSelected.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/safety/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          herbIds: herbsSelected.map((h) => h.id),
          drugGenerics: drugsSelected.map((d) => d.generic),
        }),
      });
      const j = (await res.json()) as CheckResponse;
      setResult(j);
    } finally {
      setLoading(false);
    }
  }

  // Auto-run when selections change (debounced).
  useEffect(() => {
    if (herbsSelected.length === 0) {
      setResult(null);
      return;
    }
    const t = setTimeout(runCheck, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [herbsSelected.length, drugsSelected.length]);

  const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const chipCls = "inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 px-3 py-1 text-xs";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Herb picker */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold mb-3">
            🌿 {T("中藥（必填）", "Herbs (required)")}
          </h2>
          <div className="relative">
            <input
              className={inputCls}
              value={herbQuery}
              onChange={(e) => setHerbQuery(e.target.value)}
              placeholder={T("搜尋中文 / 拼音 / 英文 / 拉丁名", "Search by Chinese / pinyin / English / Latin name")}
            />
            {herbSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                {herbSuggestions.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => addHerb(h)}
                      disabled={selectedHerbIds.has(h.id)}
                      className="w-full text-left px-3 py-2 hover:bg-surface text-sm disabled:opacity-40"
                    >
                      <span className="font-medium">{h.chineseName}</span>{" "}
                      <span className="text-xs text-muted">
                        {h.pinyinName}{h.englishName ? ` · ${h.englishName}` : ""} · {h.category}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {herbsSelected.length === 0 ? (
              <p className="text-xs text-muted">{T("尚未選擇藥材", "No herbs selected")}</p>
            ) : (
              herbsSelected.map((h) => (
                <span key={h.id} className={chipCls}>
                  {h.chineseName}
                  <span className="text-[10px] opacity-60">{h.pinyinName}</span>
                  <button onClick={() => removeHerb(h.id)} className="hover:text-red-500" aria-label="remove">✕</button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Drug picker */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold mb-3">
            💊 {T("西藥 / 補充品（選填）", "Western drugs / supplements (optional)")}
          </h2>
          <div className="relative">
            <input
              className={inputCls}
              value={drugQuery}
              onChange={(e) => setDrugQuery(e.target.value)}
              placeholder={T(
                "搜尋通用名、商品名或中文（如 warfarin、阿司匹林）",
                "Search generic, brand, or Chinese name (e.g. warfarin, Coumadin)",
              )}
            />
            {drugQuery.trim().length > 0 && drugSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-background shadow-lg">
                {drugSuggestions.map((d) => (
                  <li key={d.generic}>
                    <button
                      type="button"
                      onClick={() => addDrug(d)}
                      disabled={selectedDrugGenerics.has(d.generic)}
                      className="w-full text-left px-3 py-2 hover:bg-surface text-sm disabled:opacity-40"
                    >
                      <span className="font-medium">{d.display}</span>{" "}
                      <span className="text-xs text-muted">· {d.className}</span>
                      {d.chineseNames && d.chineseNames.length > 0 && (
                        <div className="text-[10px] text-muted">{d.chineseNames.join("、")}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {drugsSelected.length === 0 ? (
              <p className="text-xs text-muted">
                {T("選填 — 留空只檢查中藥內部禁忌與安全標籤", "Optional — leave blank to check herb-internal incompatibilities + safety only")}
              </p>
            ) : (
              drugsSelected.map((d) => (
                <span key={d.generic} className={chipCls}>
                  {d.display}
                  <span className="text-[10px] opacity-60">{d.className}</span>
                  <button onClick={() => removeDrug(d.generic)} className="hover:text-red-500">✕</button>
                </span>
              ))
            )}
            <p className="basis-full text-[10px] text-muted">
              {T(
                `字典涵蓋 ${DRUGS.length} 種常用藥，包括抗凝、降壓、降糖、抗鬱、免疫抑制等。`,
                `Dictionary covers ${DRUGS.length} common Rx incl. anticoagulants, antihypertensives, antidiabetics, antidepressants, immunosuppressants.`,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <p className="text-sm text-muted text-center py-2">{T("分析中…", "Analyzing…")}</p>
      )}

      {result && result.ok && (
        <div className="space-y-5">
          {/* Severity ribbon */}
          {result.interactions.length === 0 && (result.predictedInteractions?.length ?? 0) === 0 && result.herbHerbConflicts.length === 0 && herbsSelected.length > 0 ? (
            <div className="rounded-lg border border-green-400/50 bg-green-50/60 dark:bg-green-900/10 p-4 text-sm">
              ✅ {T("此組合在本資料庫中未找到已知交互作用。", "No known interactions found for this combination in our database.")}
              <span className="block text-xs text-muted mt-1">
                {T(
                  "「無記錄」≠「絕對安全」。請結合臨床判斷與最新文獻。",
                  "\"No record\" does not mean \"safe\". Always integrate with clinical judgment.",
                )}
              </span>
            </div>
          ) : (
            result.interactions.length > 0 && (
              <div className="rounded-lg border border-red-400/40 bg-red-50/40 dark:bg-red-900/10 p-4">
                <h3 className="text-sm font-semibold mb-3">
                  ⚠ {T(`發現 ${result.interactions.length} 項中藥-西藥交互`, `${result.interactions.length} herb-drug interaction(s)`)}
                </h3>
                <ul className="space-y-3">
                  {result.interactions.map((i, idx) => (
                    <li key={idx} className={`rounded border-l-4 ${SEV_CLASS[i.severity] ?? SEV_CLASS.THEORETICAL} pl-3 py-1`}>
                      <div className="text-sm font-medium">
                        {i.herbChineseName} <span className="text-xs opacity-70">({i.herbPinyinName})</span>
                        {" × "}
                        {i.drugDisplay}
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase">{i.severity}</span>
                      </div>
                      {i.clinicalEffect && (
                        <p className="text-xs mt-1">
                          <span className="font-medium">{T("臨床效應：", "Effect: ")}</span>{i.clinicalEffect}
                        </p>
                      )}
                      {i.mechanism && (
                        <p className="text-xs">
                          <span className="font-medium">{T("機轉：", "Mechanism: ")}</span>{i.mechanism}
                        </p>
                      )}
                      {i.management && (
                        <p className="text-xs">
                          <span className="font-medium">{T("處置：", "Management: ")}</span>{i.management}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Predicted pharmacokinetic interactions (CYP/transporter-based) */}
          {result.predictedInteractions && result.predictedInteractions.length > 0 && (
            <div className="rounded-lg border border-purple-400/40 bg-purple-50/40 dark:bg-purple-900/10 p-4">
              <h3 className="text-sm font-semibold mb-1">
                🧪 {T(`預測藥動學交互（CYP/轉運體）— ${result.predictedInteractions.length} 項`, `Predicted pharmacokinetic interactions (CYP/transporter) — ${result.predictedInteractions.length}`)}
              </h3>
              <p className="text-[11px] text-muted mb-3">
                {T(
                  "由酶代謝路徑推斷，非直接臨床記錄；用以提示需留意的代謝層面交互。",
                  "Inferred from enzyme-metabolism pathways (not direct clinical records) — flags metabolism-level interactions to watch.",
                )}
              </p>
              <ul className="space-y-3">
                {result.predictedInteractions.map((p, idx) => (
                  <li key={idx} className={`rounded border-l-4 ${SEV_CLASS[p.severity] ?? SEV_CLASS.THEORETICAL} pl-3 py-1`}>
                    <div className="text-sm font-medium flex flex-wrap items-center gap-x-2">
                      <span>
                        {p.herbChineseName} <span className="text-xs opacity-70">({p.herbPinyinName})</span>
                        {" × "}
                        {p.drugDisplay}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase">{p.severity}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-mono">{p.enzyme}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.effect === "INCREASE" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                        {p.effect === "INCREASE" ? T("↑ 藥物濃度", "↑ drug level") : T("↓ 藥物濃度", "↓ drug level")}
                      </span>
                      {p.basis === "network" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-slate-400 text-slate-600 dark:text-slate-300">
                          {T("網絡推斷·未驗證", "network · unverified")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1">{p.mechanism}</p>
                    {p.management && (
                      <p className="text-xs"><span className="font-medium">{T("處置：", "Management: ")}</span>{p.management}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Herb-herb classical conflicts */}
          {result.herbHerbConflicts.length > 0 && (
            <div className="rounded-lg border border-orange-400/40 bg-orange-50/40 dark:bg-orange-900/10 p-4">
              <h3 className="text-sm font-semibold mb-3">
                🔀 {T(`中藥內部禁忌 — ${result.herbHerbConflicts.length} 項`, `Herb-herb classical incompatibilities — ${result.herbHerbConflicts.length}`)}
              </h3>
              <ul className="space-y-2 text-xs">
                {result.herbHerbConflicts.map((c, idx) => (
                  <li key={idx} className="border-l-2 border-orange-400 pl-3">
                    <span className="font-medium">{c.herbAChineseName} × {c.herbBChineseName}</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                      {c.interactionType} / {c.severity}
                    </span>
                    {c.description && <div className="text-muted">{c.description}</div>}
                    {c.classicalSource && <div className="text-muted opacity-70 text-[10px]">出處：{c.classicalSource}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-herb safety summary */}
          {result.herbs.length > 0 && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-sm font-semibold mb-3">
                🧬 {T("安全性概覽", "Safety Summary")}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted">
                    <tr>
                      <th className="text-left px-2 py-1 font-medium">{T("藥材", "Herb")}</th>
                      <th className="text-left px-2 py-1 font-medium">{T("孕期", "Pregnancy")}</th>
                      <th className="text-left px-2 py-1 font-medium">{T("哺乳期", "Lactation")}</th>
                      <th className="text-left px-2 py-1 font-medium">{T("兒童", "Pediatric")}</th>
                      <th className="text-right px-2 py-1 font-medium">{T("詳情", "")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.herbs.map((h) => (
                      <tr key={h.herbId} className="border-t border-border">
                        <td className="px-2 py-2">
                          <Link href={`/herbs/${h.herbId}`} className="font-medium text-primary hover:underline">
                            {h.chineseName}
                          </Link>
                          <span className="ml-1 text-[10px] text-muted">{h.pinyinName}</span>
                        </td>
                        <td className="px-2 py-2"><SafetyChip value={h.pregnancy} isZh={isZh} kind="preg" /></td>
                        <td className="px-2 py-2"><SafetyChip value={h.lactation} isZh={isZh} kind="lact" /></td>
                        <td className="px-2 py-2"><SafetyChip value={h.pediatric} isZh={isZh} kind="ped" /></td>
                        <td className="px-2 py-2 text-right">
                          <Link href={`/herbs/${h.herbId}`} className="text-[10px] text-muted hover:text-primary">
                            {T("詳情 →", "Details →")}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SafetyChip({ value, isZh, kind }: { value: string | null; isZh: boolean; kind: "preg" | "lact" | "ped" }) {
  if (!value) return <span className="text-muted">—</span>;
  const labels: Record<string, { zh: string; en: string }> = {
    SAFE: { zh: "安全", en: "Safe" },
    CAUTION: { zh: "慎用", en: "Caution" },
    CAUTION_OVER_2: { zh: "2 歲以上慎用", en: "≥ 2 yrs caution" },
    CAUTION_OVER_6: { zh: "6 歲以上慎用", en: "≥ 6 yrs caution" },
    CONTRAINDICATED: { zh: "禁用", en: "Contraindicated" },
    UNKNOWN: { zh: "不詳", en: "Unknown" },
  };
  const cls = SAFETY_CLASS[value] ?? SAFETY_CLASS.UNKNOWN;
  const lbl = labels[value] ?? { zh: value, en: value };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${cls}`} aria-label={kind}>
      {isZh ? lbl.zh : lbl.en}
    </span>
  );
}
