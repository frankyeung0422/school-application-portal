import type { Locale } from "@/lib/i18n/types";
import { NATURE_ACTIONS } from "@/lib/tcm/herb-action-heuristics";

interface Props {
  locale?: Locale;
}

// Cold → cool → neutral → warm → hot, with the swatch colors used elsewhere.
const NATURES: Array<{ key: string; zh: string; en: string; color: string }> = [
  { key: "COLD", zh: "寒", en: "Cold", color: "#3b82f6" },
  { key: "COOL", zh: "涼", en: "Cool", color: "#22d3ee" },
  { key: "NEUTRAL", zh: "平", en: "Neutral", color: "#9ca3af" },
  { key: "WARM", zh: "溫", en: "Warm", color: "#f59e0b" },
  { key: "HOT", zh: "熱", en: "Hot", color: "#ef4444" },
];

/** 四氣 thermal spectrum bar. Static SVG. */
export function FourNaturesSpectrum({ locale = "en" }: Props) {
  const isZh = locale === "zh-Hant";

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{isZh ? "四氣（藥性）" : "Four Natures"}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh
            ? "寒涼藥清熱瀉火、治陽熱證；溫熱藥溫陽散寒、治陰寒證。「療寒以熱藥，療熱以寒藥」。"
            : "Cold/cool herbs clear heat (treat heat patterns); warm/hot herbs warm Yang (treat cold patterns) — treat cold with heat, heat with cold."}
        </p>
      </figcaption>

      <svg viewBox="0 0 500 90" width="100%" role="img" aria-label={isZh ? "四氣光譜" : "Four natures spectrum"}>
        <defs>
          <linearGradient id="nature-grad" x1="0" y1="0" x2="1" y2="0">
            {NATURES.map((n, i) => (
              <stop key={n.key} offset={`${(i / (NATURES.length - 1)) * 100}%`} stopColor={n.color} />
            ))}
          </linearGradient>
        </defs>
        <rect x={10} y={20} width={480} height={24} rx={12} fill="url(#nature-grad)" />
        {NATURES.map((n, i) => {
          const x = 10 + (480 * (i + 0.5)) / NATURES.length;
          return (
            <g key={n.key}>
              <line x1={x} y1={20} x2={x} y2={44} stroke="#fff" strokeWidth={1} strokeOpacity={0.6} />
              <text x={x} y={14} textAnchor="middle" fontSize="14" fontWeight={700} fill={n.color}>
                {isZh ? n.zh : n.en}
              </text>
              <text x={x} y={62} textAnchor="middle" fontSize="9" fill="#64748b">
                {isZh ? NATURE_ACTIONS[n.key].actionZh : NATURE_ACTIONS[n.key].actionEn}
              </text>
            </g>
          );
        })}
        <text x={10} y={84} textAnchor="start" fontSize="9" fill="#3b82f6">
          {isZh ? "← 治熱證" : "← treats heat"}
        </text>
        <text x={490} y={84} textAnchor="end" fontSize="9" fill="#ef4444">
          {isZh ? "治寒證 →" : "treats cold →"}
        </text>
      </svg>
    </figure>
  );
}
