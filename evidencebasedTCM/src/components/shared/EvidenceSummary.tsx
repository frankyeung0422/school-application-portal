import { EVIDENCE_GRADE_CONFIG } from "@/lib/utils/evidence-grades";

interface EvidenceSummaryProps {
  counts: { A: number; B: number; C: number; D: number };
  total: number;
}

const GRADE_KEYS = ["A", "B", "C", "D"] as const;

export function EvidenceSummary({ counts, total }: EvidenceSummaryProps) {
  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">循證醫學摘要</h4>
        <span className="text-xs text-muted">共 {total} 項研究</span>
      </div>

      {/* Grade bar visualization */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3">
        {GRADE_KEYS.map((grade) => {
          const pct = total > 0 ? (counts[grade] / total) * 100 : 0;
          if (pct === 0) return null;
          const config = EVIDENCE_GRADE_CONFIG[grade];
          return (
            <div
              key={grade}
              className={`${config.dot} transition-all`}
              style={{ width: `${pct}%` }}
              title={`Grade ${grade}: ${counts[grade]}`}
            />
          );
        })}
      </div>

      {/* Grade pills */}
      <div className="flex flex-wrap gap-2">
        {GRADE_KEYS.map((grade) => {
          if (counts[grade] === 0) return null;
          const config = EVIDENCE_GRADE_CONFIG[grade];
          return (
            <span
              key={grade}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${config.color}`}
            >
              <span className={`h-2 w-2 rounded-full ${config.dot}`} />
              Grade {grade}: {counts[grade]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
