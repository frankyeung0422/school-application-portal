import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type { Locale } from "@/lib/i18n/types";

interface FormulaCardProps {
  id: string;
  primaryName: string;
  secondaryLine: string;
  englishLine?: string | null;
  categoryLabel: string;
  herbCountLabel: string;
  sourceLine?: string | null;
  highestGrade: string | null;
  locale: Locale;
}

export function FormulaCard({
  id,
  primaryName,
  secondaryLine,
  englishLine,
  categoryLabel,
  herbCountLabel,
  sourceLine,
  highestGrade,
  locale,
}: FormulaCardProps) {
  return (
    <Link
      href={`/formulas/${id}`}
      className="group rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:border-primary-light transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold group-hover:text-primary transition-colors">{primaryName}</h3>
          <p className="text-sm text-muted">{secondaryLine}</p>
          {englishLine && <p className="text-xs text-muted mt-0.5">{englishLine}</p>}
        </div>
        {highestGrade && (
          <EvidenceBadge grade={highestGrade as "A" | "B" | "C" | "D"} size="sm" locale={locale} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge label={categoryLabel} color="bg-violet-100 text-violet-800" />
        <Badge label={herbCountLabel} color="bg-slate-100 text-slate-700" />
      </div>

      {sourceLine && <p className="mt-2 text-xs text-muted line-clamp-1">{sourceLine}</p>}
    </Link>
  );
}
