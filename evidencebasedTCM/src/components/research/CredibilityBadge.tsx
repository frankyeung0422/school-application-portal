import { TIER_META, type CredibilityTier } from "@/lib/research/credibility";

/**
 * Credibility tier chip (HIGH / MODERATE / LOW / HYPOTHESIS). `title` carries
 * the score rationale for hover detail.
 */
export function CredibilityBadge({
  tier,
  score,
  locale,
  title,
}: {
  tier: CredibilityTier;
  score?: number;
  locale: string;
  title?: string;
}) {
  const m = TIER_META[tier] ?? TIER_META["LOW"];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.chip}`}
    >
      {locale === "zh-Hant" ? m.zh : m.en}
      {score != null && <span className="tabular-nums opacity-70">{Math.round(score)}</span>}
    </span>
  );
}
