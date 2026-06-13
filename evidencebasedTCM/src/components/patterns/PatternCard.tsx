import Link from "next/link";
import { Badge } from "@/components/shared/Badge";

const PATHOLOGY_COLORS: Record<string, string> = {
  DEFICIENCY: "bg-amber-100 text-amber-800",
  EXCESS: "bg-red-100 text-red-800",
  STAGNATION: "bg-purple-100 text-purple-800",
  HEAT: "bg-orange-100 text-orange-800",
  COLD: "bg-blue-100 text-blue-800",
  DAMPNESS: "bg-teal-100 text-teal-800",
  PHLEGM: "bg-slate-100 text-slate-800",
  WIND: "bg-cyan-100 text-cyan-800",
  BLOOD_STASIS: "bg-rose-100 text-rose-800",
  YIN_DEFICIENCY: "bg-indigo-100 text-indigo-800",
  YANG_DEFICIENCY: "bg-yellow-100 text-yellow-800",
  QI_DEFICIENCY: "bg-lime-100 text-lime-800",
  BLOOD_DEFICIENCY: "bg-pink-100 text-pink-800",
};

interface PatternCardProps {
  id: string;
  primaryName: string;
  secondaryLine: string;
  englishLine?: string | null;
  organSystemLabel?: string | null;
  pathologyLabel: string;
  pathologyType: string;
  formulaCountLabel: string;
}

export function PatternCard({
  id,
  primaryName,
  secondaryLine,
  englishLine,
  organSystemLabel,
  pathologyLabel,
  pathologyType,
  formulaCountLabel,
}: PatternCardProps) {
  return (
    <Link
      href={`/patterns/${id}`}
      className="group rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md hover:border-primary-light transition-all"
    >
      <div>
        <h3 className="font-semibold group-hover:text-primary transition-colors">{primaryName}</h3>
        <p className="text-sm text-muted">{secondaryLine}</p>
        {englishLine && <p className="text-xs text-muted mt-0.5">{englishLine}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge
          label={pathologyLabel}
          color={PATHOLOGY_COLORS[pathologyType] || "bg-gray-100 text-gray-800"}
        />
        {organSystemLabel && <Badge label={organSystemLabel} color="bg-emerald-100 text-emerald-800" />}
        <Badge label={formulaCountLabel} color="bg-slate-100 text-slate-700" />
      </div>
    </Link>
  );
}
