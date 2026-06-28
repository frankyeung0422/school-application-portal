"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  locale: string;
  isPro: boolean;
}

type Step = 1 | 2 | 3 | 4;

// Step 1 state
interface SymptomsInput {
  symptoms: string;
  tongue: string;
  pulse: string;
  notes: string;
}

// Step 2 state — AI reason result
interface Differential {
  patternId: string;
  patternName: string;
  confidence: number;
  reasoning: string;
  supportingFeatures: string[];
}

interface ReasonResult {
  differentials: Differential[];
  treatmentPrinciple: string;
  recommendedFormulas: { formulaId: string; formulaName: string; rationale: string }[];
  redFlags: string[];
}

// Step 3 state — safety check result (mirrors /api/safety/check response)
interface SafetyResult {
  interactions: { herbChinese: string; drug: string; severity: string; description: string }[];
  predictedInteractions: { herbChinese: string; drug: string; severity: string; mechanism: string }[];
  herbHerbConflicts: { herbA: string; herbB: string; description: string }[];
}

const STEPS = [
  { num: 1 as Step, zh: "症狀輸入", en: "Symptoms" },
  { num: 2 as Step, zh: "AI 辨證", en: "AI Diagnosis" },
  { num: 3 as Step, zh: "安全評估", en: "Safety Check" },
  { num: 4 as Step, zh: "決策結果", en: "Summary" },
];

const SEVERITY_COLOR: Record<string, string> = {
  MAJOR: "border-rose-300 bg-rose-50 text-rose-900",
  MODERATE: "border-amber-300 bg-amber-50 text-amber-900",
  MINOR: "border-blue-200 bg-blue-50 text-blue-900",
};

export function ClinicalWorkflowClient({ locale, isPro }: Props) {
  const zh = locale === "zh-Hant";
  const T = (zh_: string, en: string) => (zh ? zh_ : en);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [symptomsInput, setSymptomsInput] = useState<SymptomsInput>({
    symptoms: "",
    tongue: "",
    pulse: "",
    notes: "",
  });

  // Step 2
  const [reasonResult, setReasonResult] = useState<ReasonResult | null>(null);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [selectedFormulaName, setSelectedFormulaName] = useState<string | null>(null);

  // Step 3
  const [medications, setMedications] = useState<string>("");
  const [safetyResult, setSafetyResult] = useState<SafetyResult | null>(null);

  async function runDiagnosis() {
    if (!symptomsInput.symptoms.trim()) {
      setError(T("請輸入症狀", "Please enter symptoms"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/diagnose/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(symptomsInput),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "診斷失敗");
      setReasonResult(data);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : T("診斷時出現錯誤", "Diagnosis error"));
    } finally {
      setLoading(false);
    }
  }

  async function runSafetyCheck() {
    if (!selectedFormulaId) {
      setError(T("請先選擇方劑", "Please select a formula first"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const drugList = medications
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/safety/formula-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formulaId: selectedFormulaId, medications: drugList }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "安全評估失敗");
      setSafetyResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : T("安全評估出現錯誤", "Safety check error"));
    } finally {
      setLoading(false);
    }
  }

  const hasMajorIssue = safetyResult && (
    safetyResult.interactions.some((i) => i.severity === "MAJOR") ||
    safetyResult.predictedInteractions?.some((i) => i.severity === "MAJOR") ||
    safetyResult.herbHerbConflicts?.length > 0
  );

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                step === s.num
                  ? "bg-primary text-white"
                  : step > s.num
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-surface border border-border text-muted"
              }`}
            >
              <span>{step > s.num ? "✓" : s.num}</span>
              <span className="hidden sm:inline">{T(s.zh, s.en)}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 ${step > s.num ? "bg-emerald-300" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* ========== STEP 1: Symptoms ========== */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{T("第一步：輸入患者症狀", "Step 1: Enter Patient Symptoms")}</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              {T("主訴症狀 *", "Chief Complaints *")}
            </label>
            <textarea
              rows={4}
              placeholder={T(
                "例如：失眠多夢，心悸健忘，神疲乏力，食少便溏…",
                "e.g. insomnia with vivid dreams, palpitations, poor memory, fatigue, poor appetite…"
              )}
              value={symptomsInput.symptoms}
              onChange={(e) => setSymptomsInput((p) => ({ ...p, symptoms: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">{T("舌象", "Tongue")}</label>
              <input
                type="text"
                placeholder={T("例如：舌淡苔白", "e.g. pale tongue, white coating")}
                value={symptomsInput.tongue}
                onChange={(e) => setSymptomsInput((p) => ({ ...p, tongue: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{T("脈象", "Pulse")}</label>
              <input
                type="text"
                placeholder={T("例如：脈細弱", "e.g. thin weak pulse")}
                value={symptomsInput.pulse}
                onChange={(e) => setSymptomsInput((p) => ({ ...p, pulse: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{T("其他備註", "Additional notes")}</label>
            <input
              type="text"
              placeholder={T("病程、過往病史、用藥情況…", "Duration, history, current medications…")}
              value={symptomsInput.notes}
              onChange={(e) => setSymptomsInput((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={runDiagnosis}
              disabled={loading || !symptomsInput.symptoms.trim()}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? T("AI 分析中…", "Analysing…") : T("AI 辨證分析 →", "Analyse with AI →")}
            </button>
          </div>

          <p className="text-xs text-muted">
            {T(
              "* AI 辨證基於平台收錄的中醫證型庫及檢索增強生成（RAG）技術，結果僅供參考，不能取代持牌中醫師的臨床判斷。",
              "* AI diagnosis uses RAG over the platform's TCM pattern library. Results are for reference only and do not replace clinical judgement."
            )}
          </p>
        </div>
      )}

      {/* ========== STEP 2: AI Diagnosis results + formula selection ========== */}
      {step === 2 && reasonResult && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">{T("第二步：AI 辨證結果", "Step 2: AI Differential Diagnosis")}</h2>
            <button onClick={() => setStep(1)} className="text-xs text-muted hover:text-foreground underline">
              {T("重新輸入", "Edit symptoms")}
            </button>
          </div>

          {/* Treatment principle */}
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4">
            <p className="text-xs font-semibold text-teal-800 mb-1">{T("治療原則", "Treatment Principle")}</p>
            <p className="text-sm text-teal-900">{reasonResult.treatmentPrinciple}</p>
          </div>

          {/* Red flags */}
          {reasonResult.redFlags?.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-300 p-4">
              <p className="text-xs font-semibold text-rose-800 mb-1">⚠️ {T("警示（需緊急評估）", "Red Flags")}</p>
              <ul className="text-sm text-rose-900 list-disc list-inside space-y-0.5">
                {reasonResult.redFlags.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}

          {/* Differentials */}
          <div>
            <p className="text-sm font-semibold mb-2">{T("辨證鑑別", "Differential Diagnoses")}</p>
            <div className="space-y-2">
              {reasonResult.differentials.map((d) => (
                <div key={d.patternId} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/patterns/${d.patternId}`} className="font-semibold hover:text-primary text-base">
                        {d.patternName}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-sm font-bold tabular-nums text-primary">{d.confidence}%</div>
                      <div className="w-20 h-2 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${d.confidence}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  {d.supportingFeatures?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {d.supportingFeatures.map((f, i) => (
                        <span key={i} className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">{f}</span>
                      ))}
                    </div>
                  )}
                  {d.reasoning && (
                    <p className="text-xs text-muted leading-relaxed">{d.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recommended formulas */}
          {reasonResult.recommendedFormulas?.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">
                {T("推薦方劑（選擇一首進行安全評估）", "Recommended Formulas — select one for safety check")}
              </p>
              <div className="space-y-2">
                {reasonResult.recommendedFormulas.map((rf) => (
                  <label
                    key={rf.formulaId}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
                      selectedFormulaId === rf.formulaId
                        ? "border-primary bg-primary/5"
                        : "border-border bg-surface hover:border-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name="formula"
                      value={rf.formulaId}
                      checked={selectedFormulaId === rf.formulaId}
                      onChange={() => {
                        setSelectedFormulaId(rf.formulaId);
                        setSelectedFormulaName(rf.formulaName);
                      }}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-base">
                        <Link href={`/formulas/${rf.formulaId}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {rf.formulaName}
                        </Link>
                      </p>
                      {rf.rationale && (
                        <p className="text-xs text-muted mt-0.5 leading-relaxed">{rf.rationale}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Medications for safety check */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {T("現服西藥（可空白略過安全評估）", "Current medications (leave blank to skip safety check)")}
            </label>
            <textarea
              rows={2}
              placeholder={T(
                "例如：warfarin, metformin, amlodipine（以逗號或換行分隔）",
                "e.g. warfarin, metformin, amlodipine (comma or newline separated)"
              )}
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!selectedFormulaId}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
              title={!isPro ? T("需要執業醫師版", "Professional plan required") : ""}
            >
              {loading ? T("評估中…", "Checking…") : T("安全評估 →", "Safety Check →")}
            </button>
          </div>
        </div>
      )}

      {/* ========== STEP 3: Safety + summary ========== */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {T("第三步：安全評估", "Step 3: Safety Check")}
              {selectedFormulaName && <span className="ml-2 text-primary">— {selectedFormulaName}</span>}
            </h2>
            <button onClick={() => setStep(2)} className="text-xs text-muted hover:text-foreground underline">
              {T("重新選方", "Change formula")}
            </button>
          </div>

          {/* Run safety check */}
          {!safetyResult && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-muted mb-4">
                {T(
                  `即將對「${selectedFormulaName}」進行安全評估，包括藥物交互作用及古典配伍禁忌。`,
                  `Run safety check for ${selectedFormulaName}: herb-drug interactions and classical incompatibilities.`
                )}
              </p>
              <button
                type="button"
                onClick={runSafetyCheck}
                disabled={loading}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {loading ? T("評估中…", "Checking…") : T("開始安全評估", "Run Safety Check")}
              </button>
              <div className="mt-3">
                <button onClick={() => setStep(4)} className="text-xs text-muted hover:text-foreground underline">
                  {T("略過，直接查看結果", "Skip, go to summary")}
                </button>
              </div>
            </div>
          )}

          {safetyResult && (
            <>
              {/* Safety summary banner */}
              <div className={`rounded-xl border p-4 ${hasMajorIssue ? "border-rose-300 bg-rose-50" : "border-emerald-300 bg-emerald-50"}`}>
                <p className={`font-semibold ${hasMajorIssue ? "text-rose-800" : "text-emerald-800"}`}>
                  {hasMajorIssue
                    ? T("⚠️ 發現重要交互作用，請謹慎評估", "⚠️ Major interactions found — review carefully")
                    : T("✓ 未發現重大安全疑慮", "✓ No major safety concerns found")}
                </p>
              </div>

              {/* Drug interactions */}
              {(safetyResult.interactions?.length > 0 || safetyResult.predictedInteractions?.length > 0) && (
                <div>
                  <p className="text-sm font-semibold mb-2">{T("藥物交互作用", "Drug Interactions")}</p>
                  <div className="space-y-2">
                    {[...(safetyResult.interactions ?? []), ...(safetyResult.predictedInteractions ?? []).map((p) => ({
                      herbChinese: p.herbChinese,
                      drug: p.drug,
                      severity: p.severity,
                      description: p.mechanism,
                    }))].map((i, idx) => (
                      <div key={idx} className={`rounded-lg border p-3 text-sm ${SEVERITY_COLOR[i.severity] ?? "border-border bg-surface"}`}>
                        <span className="font-semibold">{i.herbChinese}</span> × <span className="font-semibold">{i.drug}</span>
                        <span className={`ml-2 text-xs rounded px-1.5 py-0.5 font-medium ${
                          i.severity === "MAJOR" ? "bg-rose-200 text-rose-900" :
                          i.severity === "MODERATE" ? "bg-amber-200 text-amber-900" : "bg-blue-200 text-blue-900"
                        }`}>
                          {i.severity}
                        </span>
                        <p className="text-xs mt-1 opacity-90">{i.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Classical incompatibilities */}
              {safetyResult.herbHerbConflicts?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">{T("古典配伍禁忌", "Classical Incompatibilities")}</p>
                  <div className="space-y-2">
                    {safetyResult.herbHerbConflicts.map((c, i) => (
                      <div key={i} className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
                        <span className="font-semibold">{c.herbA}</span> × <span className="font-semibold">{c.herbB}</span>
                        <p className="text-xs mt-1">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {safetyResult.interactions?.length === 0 &&
               (safetyResult.predictedInteractions?.length ?? 0) === 0 &&
               safetyResult.herbHerbConflicts?.length === 0 && (
                <p className="text-sm text-muted">{T("本次評估未發現已知交互作用。", "No known interactions found for this evaluation.")}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
                >
                  {T("查看決策摘要 →", "View Summary →")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== STEP 4: Final summary + actions ========== */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold">{T("第四步：臨床決策摘要", "Step 4: Clinical Decision Summary")}</h2>

          {/* Patient summary box */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <h3 className="font-semibold text-primary">{T("本次診治摘要", "Session Summary")}</h3>

            <div>
              <p className="text-xs text-muted">{T("主訴症狀", "Symptoms")}</p>
              <p className="text-sm">{symptomsInput.symptoms}</p>
            </div>

            {reasonResult?.differentials?.[0] && (
              <div>
                <p className="text-xs text-muted">{T("主要診斷", "Primary Diagnosis")}</p>
                <p className="text-sm font-semibold">
                  {reasonResult.differentials[0].patternName}
                  <span className="ml-2 text-xs text-muted font-normal">({reasonResult.differentials[0].confidence}%)</span>
                </p>
                {reasonResult.treatmentPrinciple && (
                  <p className="text-xs text-muted mt-0.5">治則：{reasonResult.treatmentPrinciple}</p>
                )}
              </div>
            )}

            {selectedFormulaName && (
              <div>
                <p className="text-xs text-muted">{T("建議方劑", "Selected Formula")}</p>
                <p className="text-sm font-semibold">{selectedFormulaName}</p>
              </div>
            )}

            {safetyResult && (
              <div>
                <p className="text-xs text-muted">{T("安全評估", "Safety Status")}</p>
                <p className={`text-sm font-semibold ${hasMajorIssue ? "text-rose-700" : "text-emerald-700"}`}>
                  {hasMajorIssue
                    ? T("⚠️ 有重要交互作用，需臨床判斷", "⚠️ Major interactions — clinical review required")
                    : T("✓ 未發現重大疑慮", "✓ No major issues")}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div>
            <p className="text-sm font-semibold mb-3">{T("下一步行動", "Next Actions")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedFormulaId && (
                <>
                  <Link
                    href={`/formulas/${selectedFormulaId}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary-light hover:bg-primary/5 transition-colors text-center"
                  >
                    <div className="text-2xl mb-1">📖</div>
                    <p className="text-sm font-semibold">{T("查看方劑詳情", "View Formula Detail")}</p>
                    <p className="text-xs text-muted mt-0.5">{T("組成、機制、實證", "Composition, mechanism, evidence")}</p>
                  </Link>

                  <Link
                    href={`/handouts/${selectedFormulaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary-light hover:bg-primary/5 transition-colors text-center"
                  >
                    <div className="text-2xl mb-1">📋</div>
                    <p className="text-sm font-semibold">{T("生成患者資料", "Generate Patient Handout")}</p>
                    <p className="text-xs text-muted mt-0.5">{T("雙語列印資料", "Bilingual printable sheet")}</p>
                    {!isPro && <span className="text-xs text-amber-600">Pro</span>}
                  </Link>

                  <Link
                    href={`/formulas/${selectedFormulaId}?tab=personalize`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary-light hover:bg-primary/5 transition-colors text-center"
                  >
                    <div className="text-2xl mb-1">⚕️</div>
                    <p className="text-sm font-semibold">{T("個人化分析", "Personalise")}</p>
                    <p className="text-xs text-muted mt-0.5">{T("體質 + CYP 評估", "Constitution + CYP analysis")}</p>
                    {!isPro && <span className="text-xs text-amber-600">Pro</span>}
                  </Link>

                  <Link
                    href={`/prescription?formula=${selectedFormulaId}`}
                    className="rounded-xl border border-border bg-surface p-4 hover:border-primary-light hover:bg-primary/5 transition-colors text-center"
                  >
                    <div className="text-2xl mb-1">🖊️</div>
                    <p className="text-sm font-semibold">{T("建立處方", "Create Prescription")}</p>
                    <p className="text-xs text-muted mt-0.5">{T("正式處方記錄", "Formal prescription record")}</p>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSymptomsInput({ symptoms: "", tongue: "", pulse: "", notes: "" });
                  setReasonResult(null);
                  setSelectedFormulaId(null);
                  setSelectedFormulaName(null);
                  setSafetyResult(null);
                  setMedications("");
                  setError(null);
                }}
                className="rounded-xl border border-dashed border-border bg-surface p-4 hover:border-primary-light hover:bg-primary/5 transition-colors text-center"
              >
                <div className="text-2xl mb-1">🔄</div>
                <p className="text-sm font-semibold">{T("開始新診次", "Start New Case")}</p>
                <p className="text-xs text-muted mt-0.5">{T("重置所有輸入", "Reset all fields")}</p>
              </button>
            </div>
          </div>

          <p className="text-xs text-muted border-t border-border pt-3">
            {T(
              "* 本流程由 AI 輔助，僅供持牌中醫師參考。AI 辨證結果及安全評估均可能存在誤差，最終臨床決策須由醫師自行判斷。",
              "* This workflow is AI-assisted and is for reference by licensed TCM practitioners only. AI diagnosis and safety checks may contain errors; final clinical decisions rest with the practitioner."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
