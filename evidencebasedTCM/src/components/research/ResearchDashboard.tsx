"use client";

import { useState } from "react";
import Link from "next/link";

interface Report {
  id: string;
  diseaseId: string;
  diseaseName: string;
  reportType: string;
  formulaName: string | null;
  score: number | null;
  version: number;
  updatedAt: string;
  content: string;
}

interface Props {
  locale: "zh-Hant" | "en";
  dbStats: {
    totalEvidence: number;
    totalLinks: number;
    gradeA: number;
    gradeB: number;
    gradeC: number;
    gradeD: number;
  };
  reports: Report[];
}

export function ResearchDashboard({ locale, dbStats, reports }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const runEngine = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/research/auto", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setRunning(false);
    }
  };

  const discoveries = reports.find((r) => r.reportType === "discovery");
  let discoveryData: {
    universalHerbs?: { name: string; evidenceCount: number; diseases: string[] }[];
    universalAcupoints?: { code: string; evidenceCount: number; diseases: string[] }[];
    multiDiseaseFormulas?: { name: string; evidenceCount: number; diseases: string[] }[];
    insight?: string;
  } | null = null;
  try {
    if (discoveries) discoveryData = JSON.parse(discoveries.content);
  } catch { /* ignore */ }

  const innovationReports = reports.filter((r) => r.reportType === "innovation");
  const proposalReports = reports.filter((r) => r.reportType === "proposal");

  return (
    <div className="space-y-6">
      {/* DB Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: S("總證據", "Evidence"), value: dbStats.totalEvidence, color: "text-primary" },
          { label: S("總連結", "Links"), value: dbStats.totalLinks, color: "text-teal-700" },
          { label: "Grade A", value: dbStats.gradeA, color: "text-green-700" },
          { label: "Grade B", value: dbStats.gradeB, color: "text-blue-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Engine Control */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-center">
        <h2 className="text-xl font-bold mb-2">{S("深度研究引擎", "Deep Research Engine")}</h2>
        <p className="text-sm text-muted mb-4">
          {S(
            "一鍵啟動全自動研究循環：挖掘證據 → 分析病機 → AI組方 → 跨疾病發現 → 儲存報告",
            "One-click full auto cycle: mine evidence → analyze pathology → AI formulas → cross-disease discovery → store reports",
          )}
        </p>
        <button
          type="button"
          onClick={runEngine}
          disabled={running}
          className={`rounded-lg px-8 py-3 text-sm font-semibold text-white transition-colors ${
            running ? "bg-gray-400 cursor-wait" : "bg-primary hover:bg-primary-dark"
          }`}
        >
          {running
            ? S("研究引擎運行中…", "Engine running…")
            : S("啟動深度研究引擎", "Launch Deep Research Engine")}
        </button>
        {running && (
          <p className="mt-2 text-xs text-muted animate-pulse">
            {S("正在分析8種疾病、挖掘250+條證據、架構創新處方…", "Analyzing 8 diseases, mining 250+ evidence entries, crafting novel formulas…")}
          </p>
        )}
      </div>

      {/* Live Result */}
      {result && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold mb-3">
            {S("最新運行結果", "Latest Run Result")}
            {"elapsed" in result && <span className="ml-2 text-muted font-normal">{String(result.elapsed)}</span>}
          </h3>
          {"results" in result && Array.isArray(result.results) && (
            <div className="space-y-2 mb-4">
              {(result.results as { disease: string; formulaName: string; score: number; evidenceCount: number }[]).map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <span className="font-medium">{r.disease}</span>
                  <span className="text-primary">{r.formulaName}</span>
                  <span className="text-muted">ev:{r.evidenceCount}</span>
                  <div className="w-16 h-2 bg-border rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${r.score}%` }} />
                  </div>
                  <span className="font-mono">{r.score}</span>
                </div>
              ))}
            </div>
          )}
          {"discoveries" in result && (result.discoveries as { insight?: string })?.insight && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
              <h4 className="font-semibold text-amber-800 mb-1">{S("跨疾病發現", "Cross-Disease Discovery")}</h4>
              <p className="text-amber-700">{String((result.discoveries as { insight: string }).insight)}</p>
            </div>
          )}
        </div>
      )}

      {/* Cross-Disease Discoveries */}
      {discoveryData && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-lg font-bold mb-3">{S("跨疾病發現", "Cross-Disease Discoveries")}</h3>
          {discoveryData.insight && <p className="text-sm mb-4">{discoveryData.insight}</p>}

          <div className="grid gap-4 md:grid-cols-3 text-xs">
            <div>
              <h4 className="font-semibold mb-2">{S("廣譜核心中藥", "Universal Core Herbs")}</h4>
              <ul className="space-y-1">
                {discoveryData.universalHerbs?.map((h) => (
                  <li key={h.name} className="flex justify-between">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-muted">{h.diseases.length} diseases · {h.evidenceCount} ev</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{S("通用穴位", "Universal Points")}</h4>
              <ul className="space-y-1">
                {discoveryData.universalAcupoints?.map((a) => (
                  <li key={a.code} className="flex justify-between">
                    <span className="font-mono font-medium">{a.code}</span>
                    <span className="text-muted">{a.diseases.length} diseases · {a.evidenceCount} ev</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{S("多疾病方劑", "Multi-Disease Formulas")}</h4>
              <ul className="space-y-1">
                {discoveryData.multiDiseaseFormulas?.map((f) => (
                  <li key={f.name} className="flex justify-between">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted">{f.diseases.length} diseases</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Innovation Reports */}
      {innovationReports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">{S("AI 創新處方報告", "AI Formula Innovation Reports")}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {innovationReports.map((r) => (
              <Link
                key={r.id}
                href={`/research/${r.diseaseId}/innovate`}
                className="rounded-lg border border-border bg-surface p-4 hover:border-primary-light transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold">{r.diseaseName}</h4>
                  <span className="text-xs font-mono text-muted">v{r.version} · {r.score ?? 0}pt</span>
                </div>
                <p className="text-sm text-primary">{r.formulaName ?? "—"}</p>
                <p className="text-[11px] text-muted mt-1">
                  {S("更新", "Updated")}: {new Date(r.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Proposal Reports */}
      {proposalReports.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">{S("治療建議報告", "Treatment Proposal Reports")}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {proposalReports.map((r) => (
              <Link
                key={r.id}
                href={`/research/${r.diseaseId}`}
                className="rounded-lg border border-border bg-surface p-4 hover:border-primary-light transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{r.diseaseName}</h4>
                  <span className="text-xs font-mono text-muted">v{r.version} · {r.score ?? 0}pt</span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  {S("更新", "Updated")}: {new Date(r.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
