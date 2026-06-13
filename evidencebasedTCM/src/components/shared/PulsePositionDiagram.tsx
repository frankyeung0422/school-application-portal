import type { Locale } from "@/lib/i18n/types";

/**
 * Standard TCM pulse position diagram showing 寸關尺 (Cun-Guan-Chi) on both wrists,
 * with each position mapped to its associated organ system.
 *
 * Reference assignments (most common contemporary mapping):
 *   Left wrist:   Cun=Heart    Guan=Liver        Chi=Kidney(Yin)
 *   Right wrist:  Cun=Lung     Guan=Spleen       Chi=Kidney(Yang)/Mingmen
 */

interface Props {
  locale?: Locale;
  /** Highlight a specific position. */
  highlight?: { hand: "left" | "right"; position: "cun" | "guan" | "chi" };
}

const POSITIONS = {
  left: {
    cun:  { ch: "寸", organ: { zh: "心", en: "Heart" } },
    guan: { ch: "關", organ: { zh: "肝", en: "Liver" } },
    chi:  { ch: "尺", organ: { zh: "腎陰", en: "Kidney (Yin)" } },
  },
  right: {
    cun:  { ch: "寸", organ: { zh: "肺", en: "Lung" } },
    guan: { ch: "關", organ: { zh: "脾", en: "Spleen" } },
    chi:  { ch: "尺", organ: { zh: "腎陽 / 命門", en: "Kidney (Yang) / Mingmen" } },
  },
} as const;

export function PulsePositionDiagram({ locale = "en", highlight }: Props) {
  const isZh = locale === "zh-Hant";
  const titleText = isZh ? "脈診部位（寸關尺）" : "Pulse Positions (Cun-Guan-Chi)";
  const subtitleText = isZh
    ? "兩手橈動脈寸口分三部診脈：寸（遠心端）、關（橈骨莖突內側）、尺（近心端）。"
    : "The radial pulse is palpated at three positions on each wrist: Cun (distal), Guan (over styloid), Chi (proximal).";

  const renderHand = (hand: "left" | "right", x0: number) => {
    const isLeft = hand === "left";
    const pos = POSITIONS[hand];
    const handLabel = isZh
      ? (isLeft ? "左手 (Left Hand)" : "右手 (Right Hand)")
      : (isLeft ? "Left Hand" : "Right Hand");
    return (
      <g transform={`translate(${x0}, 0)`}>
        {/* Hand label */}
        <text x={120} y={20} textAnchor="middle" fontSize="11" fontWeight={700} fill="currentColor" className="fill-foreground">
          {handLabel}
        </text>

        {/* Forearm shape */}
        <path
          d="M 20 60 L 220 60 L 230 100 L 220 140 L 20 140 L 10 100 Z"
          fill="rgba(254, 226, 226, 0.5)"
          stroke="rgba(127, 29, 29, 0.5)"
          strokeWidth={1.5}
        />
        {/* Wrist crease line */}
        <line x1={40} y1={60} x2={40} y2={140} stroke="rgba(127, 29, 29, 0.4)" strokeWidth={1} strokeDasharray="3 2" />
        <text x={40} y={155} textAnchor="middle" fontSize="9" fill="currentColor" className="fill-muted">
          {isZh ? "腕橫紋" : "wrist"}
        </text>

        {/* Three positions: Cun (closest to wrist), Guan (middle), Chi (farthest) */}
        {(["cun", "guan", "chi"] as const).map((p, i) => {
          const cx = 70 + i * 55;
          const isHighlighted = highlight?.hand === hand && highlight.position === p;
          return (
            <g key={p}>
              <circle
                cx={cx} cy={100} r={isHighlighted ? 26 : 22}
                fill={isHighlighted ? "rgba(220, 38, 38, 0.85)" : "rgba(220, 38, 38, 0.18)"}
                stroke="#dc2626" strokeWidth={isHighlighted ? 2.5 : 1.5}
              />
              <text x={cx} y={97} textAnchor="middle" fontSize="14" fontWeight={700} fill={isHighlighted ? "#fff" : "#7f1d1d"}>
                {pos[p].ch}
              </text>
              <text x={cx} y={108} textAnchor="middle" fontSize="7" fill={isHighlighted ? "#fff" : "#7f1d1d"} fontWeight={600}>
                {p.toUpperCase()}
              </text>
              <text x={cx} y={170} textAnchor="middle" fontSize="10" fontWeight={600} fill="currentColor" className="fill-foreground">
                {isZh ? pos[p].organ.zh : pos[p].organ.en}
              </text>
            </g>
          );
        })}

        {/* Direction marker */}
        <text x={120} y={195} textAnchor="middle" fontSize="9" fill="currentColor" className="fill-muted" fontStyle="italic">
          {isZh ? "← 寸（遠心）  關  尺（近心）→" : "← Cun (distal)  Guan  Chi (proximal) →"}
        </text>
      </g>
    );
  };

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{titleText}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">{subtitleText}</p>
      </figcaption>

      <svg viewBox="0 0 720 220" className="block w-full max-w-[720px] mx-auto h-auto" role="img" aria-label={titleText}>
        {renderHand("left", 0)}
        {renderHand("right", 360)}
      </svg>

      <p className="mt-2 text-xs text-muted leading-relaxed text-center">
        {isZh
          ? "三部所主臟腑為當代主流配對；古籍另有左尺主小腸、右尺主大腸等說法。"
          : "Position-organ assignments shown follow contemporary mainstream mapping. Classical sources include alternative variants."}
      </p>
    </figure>
  );
}
