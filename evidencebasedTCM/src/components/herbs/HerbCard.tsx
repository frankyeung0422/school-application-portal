import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { HerbCategoryIcon } from "@/components/shared/HerbCategoryIcon";
import type { Locale } from "@/lib/i18n/types";

interface HerbCardProps {
  id: string;
  primaryName: string;
  secondaryLine: string;
  categoryLabel: string;
  /** Canonical English category key for icon lookup (e.g. "Heat Clearing"). Optional. */
  categoryKey?: string;
  natureLabel: string;
  natureColor: string;
  meridianLabels: string[];
  flavorBadges: { label: string; color: string }[];
  highestGrade?: string | null;
  locale: Locale;
}

export function HerbCard({
  id,
  primaryName,
  secondaryLine,
  categoryLabel,
  categoryKey,
  natureLabel,
  natureColor,
  meridianLabels,
  flavorBadges,
  highestGrade,
  locale,
}: HerbCardProps) {
  return (
    <Link
      href={`/herbs/${id}`}
      className="block rounded-lg border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:border-primary-light transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {categoryKey && <HerbCategoryIcon category={categoryKey} size={28} />}
          <div>
            <h3 className="font-semibold text-foreground">{primaryName}</h3>
            <p className="text-sm text-muted">{secondaryLine}</p>
          </div>
        </div>
        {highestGrade && (
          <EvidenceBadge
            grade={highestGrade as "A" | "B" | "C" | "D"}
            showLabel={false}
            locale={locale}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <Badge label={categoryLabel} color="bg-emerald-100 text-emerald-800" />
        <Badge label={natureLabel} color={natureColor} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {flavorBadges.map((f) => (
          <Badge key={f.label} label={f.label} color={f.color} />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {meridianLabels.slice(0, 3).map((m) => (
          <Badge key={m} label={m} color="bg-violet-100 text-violet-800" />
        ))}
        {meridianLabels.length > 3 && (
          <Badge label={`+${meridianLabels.length - 3}`} color="bg-gray-100 text-gray-600" />
        )}
      </div>
    </Link>
  );
}
