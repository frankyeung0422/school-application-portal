import { prisma } from "@/lib/db/prisma";

interface Props {
  /** Single herb. Provide this OR herbIds. */
  herbId?: string;
  /** Worst-of aggregation across multiple herbs (e.g. all herbs in a formula). */
  herbIds?: string[];
  locale: "zh-Hant" | "en";
  compact?: boolean; // smaller pill set when used inline in a list
}

const CLS: Record<string, string> = {
  CONTRAINDICATED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CAUTION: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CAUTION_OVER_2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CAUTION_OVER_6: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  SAFE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  UNKNOWN: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

const LABEL: Record<string, { zh: string; en: string }> = {
  SAFE: { zh: "安全", en: "Safe" },
  CAUTION: { zh: "慎用", en: "Caution" },
  CAUTION_OVER_2: { zh: "2 歲以上慎用", en: "≥ 2 yrs caution" },
  CAUTION_OVER_6: { zh: "6 歲以上慎用", en: "≥ 6 yrs caution" },
  CONTRAINDICATED: { zh: "禁用", en: "Contraindicated" },
  UNKNOWN: { zh: "不詳", en: "Unknown" },
};

function worst(values: (string | null | undefined)[], order: string[]): string | null {
  const present = values.filter(Boolean) as string[];
  for (const o of order) if (present.includes(o)) return o;
  return null;
}

/**
 * Server component — surfaces pregnancy / lactation / pediatric safety
 * badges for a given herb. Aggregates worst-of across all
 * HerbContraindication rows.
 */
export async function SafetyBadges({ herbId, herbIds, locale, compact = false }: Props) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const ids = herbIds ?? (herbId ? [herbId] : []);
  if (ids.length === 0) return null;
  const rows = await prisma.herbContraindication.findMany({
    where: { herbId: { in: ids } },
    select: { pregnancyCategory: true, lactationSafety: true, pediatricSafety: true },
  });
  if (rows.length === 0) return null;

  const preg = worst(rows.map((r) => r.pregnancyCategory), ["CONTRAINDICATED", "CAUTION", "UNKNOWN", "SAFE"]);
  const lact = worst(rows.map((r) => r.lactationSafety), ["CONTRAINDICATED", "CAUTION", "UNKNOWN", "SAFE"]);
  const ped = worst(
    rows.map((r) => r.pediatricSafety),
    ["CONTRAINDICATED", "CAUTION_OVER_6", "CAUTION_OVER_2", "UNKNOWN", "SAFE"],
  );

  const items: Array<{ key: string; icon: string; label: string; value: string }> = [];
  if (preg) items.push({ key: "preg", icon: "🤰", label: T("孕期", "Pregnancy"), value: preg });
  if (lact) items.push({ key: "lact", icon: "🤱", label: T("哺乳", "Lactation"), value: lact });
  if (ped) items.push({ key: "ped", icon: "👶", label: T("兒童", "Pediatric"), value: ped });
  if (items.length === 0) return null;

  const sizeCls = compact ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => {
        const lbl = LABEL[i.value] ?? { zh: i.value, en: i.value };
        return (
          <span
            key={i.key}
            className={`${CLS[i.value] ?? CLS.UNKNOWN} ${sizeCls} rounded-full font-medium inline-flex items-center gap-1`}
            title={`${i.label}: ${isZh ? lbl.zh : lbl.en}`}
          >
            <span aria-hidden>{i.icon}</span>
            {!compact && <span>{i.label}: </span>}
            <span>{isZh ? lbl.zh : lbl.en}</span>
          </span>
        );
      })}
    </div>
  );
}
