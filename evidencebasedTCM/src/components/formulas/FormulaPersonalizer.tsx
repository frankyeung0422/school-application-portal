"use client";

import { useState } from "react";

interface InteractionWarning {
  herbChineseName: string;
  drugDisplay: string;
  enzyme: string;
  severity: "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL";
  mechanism: string;
  management: string;
}

interface ConstitutionFlag {
  herbChinese: string;
  herbPinyin: string;
  issue: string;
  severity: "warn" | "info";
}

interface PersonalizeResult {
  formulaName: string;
  herbCount: number;
  interactionWarnings: InteractionWarning[];
  constitutionFlags: ConstitutionFlag[];
  constitutionTip: string | null;
  unrecognisedDrugs: string[];
  medicationCount: number;
}

const SEV_STYLE: Record<string, string> = {
  MAJOR: "bg-red-50 border-red-300 text-red-900",
  MODERATE: "bg-orange-50 border-orange-300 text-orange-900",
  MINOR: "bg-yellow-50 border-yellow-300 text-yellow-900",
  THEORETICAL: "bg-slate-50 border-slate-300 text-slate-700",
};

const SEV_LABEL: Record<string, string> = {
  MAJOR: "重大",
  MODERATE: "中度",
  MINOR: "輕度",
  THEORETICAL: "理論性",
};

const CONSTITUTION_TYPES = [
  "平和質", "氣虛質", "陽虛質", "陰虛質",
  "痰濕質", "濕熱質", "血瘀質", "氣鬱質", "特稟質",
];

interface Props {
  formulaId: string;
}

export function FormulaPersonalizer({ formulaId }: Props) {
  const [medicationInput, setMedicationInput] = useState("");
  const [constitution, setConstitution] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PersonalizeResult | null>(null);
  const [error, setError] = useState("");

  const handleAnalyse = async () => {
    const meds = medicationInput.split(/[,，\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!meds.length && !constitution) {
      setError("請至少輸入正在服用的西藥或選擇體質類型。");
      return;
    }
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/prescribe/personalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formulaId, medications: meds, constitutionType: constitution || undefined }),
      });
      const d = await res.json();
      if (!d.ok) { setError(d.error ?? "分析失敗"); return; }
      setResult(d);
    } catch {
      setError("網絡錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const hasIssues = result && (result.interactionWarnings.length > 0 || result.constitutionFlags.length > 0);
  const majorCount = result?.interactionWarnings.filter((w) => w.severity === "MAJOR").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">🔬 個人化藥物交互分析</p>
        <p className="text-xs text-blue-800">輸入您的西藥清單及體質類型，系統將即時分析本方草藥與西藥的 CYP 代謝酶相互作用，並根據體質標記潛在不適宜藥物。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            正在服用的西藥 <span className="font-normal text-muted">（以逗號或換行分隔）</span>
          </label>
          <textarea
            value={medicationInput}
            onChange={(e) => setMedicationInput(e.target.value)}
            rows={3}
            placeholder="如：warfarin, metformin, amlodipine"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">中醫體質類型 <span className="font-normal text-muted">（選填）</span></label>
          <select
            value={constitution}
            onChange={(e) => setConstitution(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">——未選擇——</option>
            {CONSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-xs text-muted mt-1">可從「<a href="/diagnose/constitution" className="text-primary hover:underline" target="_blank">體質評估</a>」頁面取得結果。</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleAnalyse}
        disabled={loading}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        {loading ? "分析中……" : "立即分析"}
      </button>

      {result && (
        <div className="space-y-4 pt-2">
          {/* Summary banner */}
          <div className={`rounded-xl border p-4 ${hasIssues ? (majorCount > 0 ? "border-red-300 bg-red-50" : "border-orange-200 bg-orange-50") : "border-green-200 bg-green-50"}`}>
            <p className={`font-semibold text-sm ${hasIssues ? (majorCount > 0 ? "text-red-800" : "text-orange-800") : "text-green-800"}`}>
              {hasIssues
                ? `⚠ 發現 ${result.interactionWarnings.length} 項藥物交互作用、${result.constitutionFlags.length} 項體質注意事項`
                : "✓ 本次分析未發現顯著交互作用或體質禁忌"}
            </p>
            <p className="text-xs text-muted mt-1">
              已分析本方 {result.herbCount} 味藥材 × {result.medicationCount} 種西藥
              {constitution && `，體質類型：${constitution}`}
            </p>
          </div>

          {/* CYP interaction warnings */}
          {result.interactionWarnings.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">藥物代謝交互作用（CYP/轉運體）</h4>
              <div className="space-y-2">
                {result.interactionWarnings.map((w, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${SEV_STYLE[w.severity]}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wide">{SEV_LABEL[w.severity]}</span>
                      <span className="font-medium text-sm">{w.herbChineseName} × {w.drugDisplay}</span>
                      <span className="text-xs font-mono opacity-70">{w.enzyme}</span>
                    </div>
                    <p className="text-xs leading-relaxed mb-1">{w.mechanism}</p>
                    <p className="text-xs opacity-80">💡 {w.management}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constitution flags */}
          {result.constitutionFlags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">體質適用性提示</h4>
              <div className="space-y-2">
                {result.constitutionFlags.map((f, i) => (
                  <div key={i} className={`rounded-lg border p-3 flex items-start gap-2 ${f.severity === "warn" ? "border-orange-200 bg-orange-50" : "border-blue-200 bg-blue-50"}`}>
                    <span>{f.severity === "warn" ? "⚠" : "ℹ"}</span>
                    <div>
                      <span className="font-medium text-sm">{f.herbChinese}</span>
                      <span className="text-muted text-xs ml-1">({f.herbPinyin})</span>
                      <p className="text-xs mt-0.5">{f.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constitution general tip */}
          {result.constitutionTip && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
              <span className="font-medium">{constitution} 體質用藥建議：</span>{result.constitutionTip}
            </div>
          )}

          {/* Unrecognised drugs */}
          {result.unrecognisedDrugs.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-medium">以下藥物不在 CYP 資料庫中，未能分析：</span>{" "}
              {result.unrecognisedDrugs.join("、")}。建議向藥劑師查詢。
            </div>
          )}

          <p className="text-xs text-muted border-t border-border pt-3">
            ⚕ 本分析僅供執業參考，不替代完整的藥物審查。CYP 預測基於文獻策展數據（MAJOR/MODERATE/MINOR）及靶點圖譜推斷（THEORETICAL）；建議重大交互作用案例諮詢藥劑師或臨床藥理師。
          </p>
        </div>
      )}
    </div>
  );
}
