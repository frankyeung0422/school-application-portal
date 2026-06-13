import Link from "next/link";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { MeridianBadge } from "@/components/shared/MeridianBadge";
import type { Locale } from "@/lib/i18n/types";

interface AcupointCardProps {
  id: string;
  code: string;
  primaryName: string;
  secondaryLine: string;
  englishLine?: string | null;
  /** Canonical meridian English name (e.g. "Lung", "Large Intestine"). */
  meridianKey: string;
  highestGrade: string | null;
  locale: Locale;
}

export function AcupointCard({
  id,
  code,
  primaryName,
  secondaryLine,
  englishLine,
  meridianKey,
  highestGrade,
  locale,
}: AcupointCardProps) {
  return (
    <Link
      href={`/acupuncture/${id}`}
      className="group rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:border-primary-light transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{code}</span>
            <h3 className="font-semibold group-hover:text-primary transition-colors">{primaryName}</h3>
          </div>
          <p className="text-sm text-muted mt-0.5">{secondaryLine}</p>
          {englishLine && <p className="text-xs text-muted mt-0.5">{englishLine}</p>}
        </div>
        {highestGrade && (
          <EvidenceBadge grade={highestGrade as "A" | "B" | "C" | "D"} size="sm" locale={locale} />
        )}
      </div>

      <div className="mt-3">
        <MeridianBadge meridian={meridianKey} locale={locale} />
      </div>
    </Link>
  );
}
