"use client";

import { useState } from "react";

interface LogEntry {
  id: string;
  runDate: string;
  runType: string;
  category: string;
  action: string;
  details: string | null;
  itemsAffected: number;
  status: string;
  duration: number | null;
}

interface Props {
  locale: "zh-Hant" | "en";
  totalRuns: number;
  dbStats: {
    herbs: number;
    formulas: number;
    acupoints: number;
    patterns: number;
    evidence: number;
    lessons: number;
    reports: number;
    links: number;
  };
  categoryCounts: { category: string; count: number }[];
  recentLogs: LogEntry[];
}

const CAT_COLORS: Record<string, string> = {
  audit: "bg-blue-100 text-blue-800",
  fix: "bg-green-100 text-green-800",
  research: "bg-violet-100 text-violet-800",
  content: "bg-amber-100 text-amber-800",
};
const CAT_ICONS: Record<string, string> = {
  audit: "🔍", fix: "🔧", research: "🧪", content: "📊",
};

export function ImprovementDashboard({ locale, totalRuns, dbStats, categoryCounts, recentLogs }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<string>("");
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const runEngine = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/improve?type=manual", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setRunning(false);
    }
  };

  const filtered = filter
    ? recentLogs.filter((l) => l.category === filter)
    : recentLogs;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{S("自動改進引擎", "Auto-Improvement Engine")}</h1>
      <p className="text-sm text-muted">
        {S(
          "每日自動審計資料庫完整性、修復缺失連結、刷新研究報告、識別內容缺口並生成改進建議。",
          "Daily automated audit of database completeness, fix missing links, refresh research reports, identify content gaps, and generate improvement recommendations.",
        )}
      </p>

      {/* DB Overview */}
      <div className="grid gap-2 grid-cols-4 md:grid-cols-8">
        {[
          { label: S("中藥", "Herbs"), value: dbStats.herbs, color: "text-green-700" },
          { label: S("方劑", "Formulas"), value: dbStats.formulas, color: "text-violet-700" },
          { label: S("穴位", "Acu"), value: dbStats.acupoints, color: "text-teal-700" },
          { label: S("證型", "Patterns"), value: dbStats.patterns, color: "text-amber-700" },
          { label: S("證據", "Evidence"), value: dbStats.evidence, color: "text-blue-700" },
          { label: S("課程", "Lessons"), value: dbStats.lessons, color: "text-pink-700" },
          { label: S("報告", "Reports"), value: dbStats.reports, color: "text-indigo-700" },
          { label: S("連結", "Links"), value: dbStats.links, color: "text-red-700" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface p-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Run Engine */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">{S("執行改進循環", "Run Improvement Cycle")}</h2>
          <p className="text-xs text-muted">{S(`已完成 ${totalRuns} 次循環`, `${totalRuns} cycles completed`)}</p>
        </div>
        <button
          type="button"
          onClick={runEngine}
          disabled={running}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold text-white ${
            running ? "bg-gray-400 cursor-wait" : "bg-primary hover:bg-primary-dark"
          }`}
        >
          {running ? S("運行中…", "Running…") : S("啟動", "Launch")}
        </button>
      </div>

      {/* Live Result */}
      {result && "summary" in result && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <h3 className="font-bold">{S("最新運行結果", "Latest Result")}</h3>
          <div className="grid gap-2 md:grid-cols-4 text-xs">
            <div className="rounded bg-blue-50 p-2 text-center">
              <div className="font-bold text-blue-800">{(result.summary as Record<string, number>).totalActions}</div>
              <div className="text-blue-600">{S("操作", "Actions")}</div>
            </div>
            <div className="rounded bg-green-50 p-2 text-center">
              <div className="font-bold text-green-800">{(result.summary as Record<string, number>).issuesFixed}</div>
              <div className="text-green-600">{S("修復", "Fixed")}</div>
            </div>
            <div className="rounded bg-violet-50 p-2 text-center">
              <div className="font-bold text-violet-800">{(result.summary as Record<string, number>).researchUpdated}</div>
              <div className="text-violet-600">{S("研究更新", "Research")}</div>
            </div>
            <div className="rounded bg-amber-50 p-2 text-center">
              <div className="font-bold text-amber-800">{((result.summary as Record<string, string[]>).contentGaps ?? []).length}</div>
              <div className="text-amber-600">{S("缺口", "Gaps")}</div>
            </div>
          </div>
          {((result.summary as Record<string, string[]>).recommendations ?? []).length > 0 && (
            <div className="rounded bg-amber-50 border border-amber-200 p-3 text-xs">
              <h4 className="font-semibold text-amber-900 mb-1">{S("改進建議", "Recommendations")}</h4>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                {((result.summary as Record<string, string[]>).recommendations).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 items-center">
        <span className="text-xs text-muted">{S("篩選", "Filter")}:</span>
        <button
          type="button"
          onClick={() => setFilter("")}
          className={`rounded-full px-2.5 py-1 text-xs border ${!filter ? "bg-primary text-white border-primary" : "border-border text-muted"}`}
        >
          {S("全部", "All")}
        </button>
        {categoryCounts.map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => setFilter(c.category)}
            className={`rounded-full px-2.5 py-1 text-xs border ${
              filter === c.category ? "bg-primary text-white border-primary" : "border-border text-muted"
            }`}
          >
            {CAT_ICONS[c.category] ?? ""} {c.category} ({c.count})
          </button>
        ))}
      </div>

      {/* Changelog / Log table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-2 font-medium">{S("時間", "Time")}</th>
              <th className="text-left p-2 font-medium">{S("類別", "Cat")}</th>
              <th className="text-left p-2 font-medium">{S("操作", "Action")}</th>
              <th className="text-left p-2 font-medium hidden md:table-cell">{S("詳情", "Details")}</th>
              <th className="text-right p-2 font-medium">{S("影響", "Items")}</th>
              <th className="text-right p-2 font-medium">{S("狀態", "Status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 50).map((l) => (
              <tr key={l.id} className="hover:bg-primary/5">
                <td className="p-2 text-muted whitespace-nowrap">
                  {new Date(l.runDate).toLocaleDateString()}
                </td>
                <td className="p-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${CAT_COLORS[l.category] ?? "bg-gray-100"}`}>
                    {l.category}
                  </span>
                </td>
                <td className="p-2 font-medium">{l.action}</td>
                <td className="p-2 text-muted hidden md:table-cell max-w-xs truncate">
                  {l.details?.slice(0, 100)}
                </td>
                <td className="p-2 text-right font-mono">{l.itemsAffected}</td>
                <td className="p-2 text-right">
                  <span className={`text-[10px] ${l.status === "completed" ? "text-green-700" : l.status === "failed" ? "text-red-700" : "text-muted"}`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            {S("尚無改進記錄。點擊「啟動」開始第一次循環。", "No improvement logs yet. Click Launch to start the first cycle.")}
          </div>
        )}
      </div>
    </div>
  );
}
