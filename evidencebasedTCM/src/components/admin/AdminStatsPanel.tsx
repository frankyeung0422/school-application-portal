"use client";

import { useEffect, useState } from "react";

interface StatsData {
  studyTypeDistribution: Record<string, number>;
  entityCoverage: {
    herbsWithEvidence: number;
    formulasWithEvidence: number;
    acupointsWithEvidence: number;
    patternsWithEvidence: number;
  };
  topEvidenceHerbs: Array<{
    id: string;
    name: string;
    chineseName: string;
    count: number;
    bestGrade: string;
  }>;
}

interface TotalsProps {
  herbs: number;
  formulas: number;
  acupoints: number;
  patterns: number;
}

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-500", B: "bg-blue-500", C: "bg-amber-500", D: "bg-rose-500",
};

export function AdminStatsPanel({ totals }: { totals: TotalsProps }) {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setData(d as StatsData))
      .catch(() => null);
  }, []);

  if (!data) return null;

  const { studyTypeDistribution, entityCoverage, topEvidenceHerbs } = data;

  const studyEntries = Object.entries(studyTypeDistribution).sort((a, b) => b[1] - a[1]);
  const totalStudies = studyEntries.reduce((s, [, v]) => s + v, 0);

  const coverageRows: { label: string; with: number; total: number }[] = [
    { label: "Herbs", with: entityCoverage.herbsWithEvidence, total: totals.herbs },
    { label: "Formulas", with: entityCoverage.formulasWithEvidence, total: totals.formulas },
    { label: "Acupoints", with: entityCoverage.acupointsWithEvidence, total: totals.acupoints },
    { label: "Patterns", with: entityCoverage.patternsWithEvidence, total: totals.patterns },
  ];

  return (
    <div className="mt-6 grid md:grid-cols-3 gap-6">
      {/* Evidence coverage */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold mb-4">Evidence Coverage</h2>
        <div className="space-y-3">
          {coverageRows.map((row) => {
            const pct = row.total > 0 ? (row.with / row.total) * 100 : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted">{row.with} / {row.total} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-border">
                  <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study type breakdown */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold mb-4">Study Types</h2>
        <div className="space-y-2">
          {studyEntries.slice(0, 6).map(([type, count]) => {
            const pct = totalStudies > 0 ? (count / totalStudies) * 100 : 0;
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-muted w-28 truncate">{type.replace(/_/g, " ")}</span>
                <div className="flex-1 h-1.5 rounded-full bg-border">
                  <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-mono text-muted w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top herbs by evidence */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold mb-4">Top Herbs by Evidence</h2>
        <ol className="space-y-2">
          {topEvidenceHerbs.slice(0, 5).map((h, i) => (
            <li key={h.id} className="flex items-center gap-2">
              <span className="text-xs text-muted w-4">{i + 1}.</span>
              <span className="flex-1 text-xs font-medium truncate">{h.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded text-white ${GRADE_COLOR[h.bestGrade] ?? "bg-gray-400"}`}>
                {h.bestGrade}
              </span>
              <span className="text-xs text-muted">{h.count}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
