import { EVIDENCE_GRADE_CONFIG } from "@/lib/utils/evidence-grades";
import { gradeQualityLabel } from "@/lib/i18n/data-labels";
import type { Locale } from "@/lib/i18n/types";

interface EvidenceBadgeProps {
  grade: keyof typeof EVIDENCE_GRADE_CONFIG;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  locale?: Locale;
}

export function EvidenceBadge({ grade, showLabel = true, size = "sm", locale = "en" }: EvidenceBadgeProps) {
  const config = EVIDENCE_GRADE_CONFIG[grade];
  const quality = gradeQualityLabel(locale, grade);
  const gradeWord = locale === "zh-Hant" ? "等級" : "Grade";
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${config.color} ${sizeClasses}`}
      title={`${grade} (${quality})`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {gradeWord} {grade}
      {showLabel && <span className="font-normal">({quality})</span>}
    </span>
  );
}
