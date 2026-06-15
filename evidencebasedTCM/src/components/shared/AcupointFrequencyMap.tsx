import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { MERIDIAN_THEME } from "./MeridianBadge";

/**
 * Render a horizontal bar-chart-style frequency map of acupoints used for a
 * given condition or pattern. Each bar shows the acupoint code, name,
 * meridian-themed color, and frequency-of-recommendation count.
 *
 * Higher frequency = recommended in more patterns mapped to this condition.
 */

export interface FrequencyEntry {
  acupointId: string;
  code: string;
  chineseName: string;
  pinyinName: string;
  meridian: string;
  frequency: number;
}

interface Props {
  entries: FrequencyEntry[];
  locale?: Locale;
  title?: string;
  /** Cap rows shown; default 12. Set 0 for unlimited. */
  limit?: number;
}

export function AcupointFrequencyMap({ entries, locale = "en", title, limit = 12 }: Props) {
  const isZh = locale === "zh-Hant";
  const sorted = [...entries].sort((a, b) => b.frequency - a.frequency);
  const shown = limit > 0 ? sorted.slice(0, limit) : sorted;
  const max = sorted.length > 0 ? Math.max(...sorted.map((e) => e.frequency)) : 1;

  const headingText = title ?? (isZh ? "推薦穴位頻次" : "Recommended Acupoints by Frequency");

  if (shown.length === 0) {
    return (
      <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
        <figcaption className="text-sm font-semibold tracking-tight mb-2">{headingText}</figcaption>
        <p className="text-xs text-muted">{isZh ? "暫無關聯穴位" : "No acupoint associations available."}</p>
      </figure>
    );
  }

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{headingText}</h3>
        <p className="mt-1 text-xs text-muted">
          {isZh
            ? `根據關聯證型推導出的常用穴位（共 ${sorted.length} 穴）。色彩對應經絡。`
            : `Derived from associated patterns (${sorted.length} unique points). Bar colors map to meridians.`}
        </p>
      </figcaption>

      <ul className="space-y-1.5">
        {shown.map((e) => {
          const pct = (e.frequency / max) * 100;
          const theme = MERIDIAN_THEME[e.meridian] ?? { fg: "#475569", bg: "#f1f5f9", ring: "#cbd5e1", abbr: "?", ch: e.meridian };
          return (
            <li key={e.acupointId}>
              <Link
                href={`/acupuncture/${e.acupointId}`}
                className="block rounded-md hover:bg-surface transition-colors px-2 py-1.5"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-semibold w-12 text-foreground">{e.code}</span>
                  <span className="font-medium w-20 truncate">{e.chineseName}</span>
                  <span className="text-muted w-24 truncate">{e.pinyinName}</span>
                  <div className="flex-1 relative h-4 rounded bg-background border border-border overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-l"
                      style={{ width: `${pct}%`, backgroundColor: theme.fg, opacity: 0.85 }}
                    />
                    <span className="absolute inset-y-0 right-1 flex items-center text-xs font-semibold text-foreground">
                      {e.frequency}×
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className="text-xs font-mono font-semibold w-7 text-center px-1 rounded"
                    style={{ color: theme.fg, backgroundColor: theme.bg }}
                    title={e.meridian}
                  >
                    {theme.abbr}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {limit > 0 && sorted.length > limit && (
        <p className="mt-2 text-xs text-muted text-center">
          {isZh
            ? `顯示前 ${limit} 個（共 ${sorted.length} 個）`
            : `Showing top ${limit} of ${sorted.length}`}
        </p>
      )}
    </figure>
  );
}
