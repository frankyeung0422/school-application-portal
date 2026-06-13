import type { Locale } from "@/lib/i18n/types";

/**
 * Standard meridian color system. Used as visual chrome wherever a meridian
 * is referenced (acupoint cards, pattern detail, search results).
 *
 * Colors follow common pedagogical conventions:
 *  - Yin organs (zang) use saturated colors
 *  - Yang organs (fu) use lighter / shifted variants
 *  - Vessels (Ren/Du) use purples
 */
export const MERIDIAN_THEME: Record<string, { fg: string; bg: string; ring: string; abbr: string; ch: string }> = {
  "Lung":              { fg: "#475569", bg: "#f1f5f9", ring: "#cbd5e1", abbr: "LU", ch: "肺" },
  "Large Intestine":   { fg: "#a16207", bg: "#fef3c7", ring: "#fde68a", abbr: "LI", ch: "大腸" },
  "Stomach":           { fg: "#854d0e", bg: "#fef9c3", ring: "#fde047", abbr: "ST", ch: "胃" },
  "Spleen":            { fg: "#9a3412", bg: "#ffedd5", ring: "#fdba74", abbr: "SP", ch: "脾" },
  "Heart":             { fg: "#991b1b", bg: "#fee2e2", ring: "#fca5a5", abbr: "HT", ch: "心" },
  "Small Intestine":   { fg: "#9d174d", bg: "#fce7f3", ring: "#f9a8d4", abbr: "SI", ch: "小腸" },
  "Bladder":           { fg: "#1e3a8a", bg: "#dbeafe", ring: "#93c5fd", abbr: "BL", ch: "膀胱" },
  "Kidney":            { fg: "#1e1b4b", bg: "#e0e7ff", ring: "#a5b4fc", abbr: "KI", ch: "腎" },
  "Pericardium":       { fg: "#9f1239", bg: "#ffe4e6", ring: "#fda4af", abbr: "PC", ch: "心包" },
  "Triple Energizer":  { fg: "#9a3412", bg: "#fff7ed", ring: "#fdba74", abbr: "TE", ch: "三焦" },
  "Gallbladder":       { fg: "#166534", bg: "#dcfce7", ring: "#86efac", abbr: "GB", ch: "膽" },
  "Liver":             { fg: "#14532d", bg: "#bbf7d0", ring: "#4ade80", abbr: "LV", ch: "肝" },
  "Governing Vessel":  { fg: "#581c87", bg: "#f3e8ff", ring: "#d8b4fe", abbr: "GV", ch: "督脈" },
  "Conception Vessel": { fg: "#6b21a8", bg: "#faf5ff", ring: "#e9d5ff", abbr: "CV", ch: "任脈" },
};

interface MeridianBadgeProps {
  meridian: string;
  locale?: Locale;
  size?: "sm" | "md";
  /** Show only the colored dot + abbreviation (no full name). */
  compact?: boolean;
}

export function MeridianBadge({ meridian, locale = "en", size = "sm", compact = false }: MeridianBadgeProps) {
  const isZh = locale === "zh-Hant";
  const theme = MERIDIAN_THEME[meridian] ?? { fg: "#475569", bg: "#f1f5f9", ring: "#cbd5e1", abbr: "?", ch: meridian };
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass}`}
      style={{ color: theme.fg, backgroundColor: theme.bg, borderColor: theme.ring }}
      title={meridian}
    >
      <span
        aria-hidden
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: theme.fg }}
      />
      <span className="font-mono font-semibold text-[0.85em]">{theme.abbr}</span>
      {!compact && (
        <span>{isZh ? theme.ch : meridian}</span>
      )}
    </span>
  );
}

/** Get meridian color for use in custom rendering (e.g. SVG paths). */
export function meridianColor(meridian: string) {
  return MERIDIAN_THEME[meridian]?.fg ?? "#475569";
}
