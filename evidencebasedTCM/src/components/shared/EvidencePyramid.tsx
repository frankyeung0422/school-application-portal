import type { Locale } from "@/lib/i18n/types";

interface EvidencePyramidProps {
  /** If set, the matching tier gets a highlighted outline. */
  highlight?: "A" | "B" | "C" | "D";
  locale?: Locale;
  /** Compact = pyramid only; Full = pyramid + per-tier study-type labels on the right. */
  variant?: "compact" | "full";
}

const TIERS = [
  { grade: "A", widthPct: 30, fill: "var(--ep-a, #22c55e)", labelEn: "High",      labelZh: "高",  studyEn: "Systematic Reviews · Meta-Analyses · RCTs (low RoB)", studyZh: "系統評價、薈萃分析、低偏倚 RCT" },
  { grade: "B", widthPct: 55, fill: "var(--ep-b, #3b82f6)", labelEn: "Moderate",  labelZh: "中",  studyEn: "RCTs (some concerns) · Quasi-experimental",         studyZh: "RCT（中度偏倚）、類實驗研究" },
  { grade: "C", widthPct: 80, fill: "var(--ep-c, #f97316)", labelEn: "Low",       labelZh: "低",  studyEn: "Cohort · Case-Control · Case Series",               studyZh: "佇列研究、病例對照、病例系列" },
  { grade: "D", widthPct: 100, fill: "var(--ep-d, #ef4444)", labelEn: "Very Low", labelZh: "極低", studyEn: "Expert Opinion · Traditional Use · Bench Research", studyZh: "專家意見、傳統用法、體外研究" },
] as const;

export function EvidencePyramid({ highlight, locale = "en", variant = "full" }: EvidencePyramidProps) {
  const isZh = locale === "zh-Hant";
  const titleText = isZh ? "GRADE 證據金字塔" : "GRADE Evidence Pyramid";
  const captionText = isZh
    ? "頂端為高質量證據，底部為傳統用法或專家意見。本平台所有證據條目均使用 GRADE A–D 評級。"
    : "Top = highest-quality evidence; bottom = traditional use / expert opinion. Every entry on this platform is assessed on the GRADE A–D scale.";

  const W = 360;
  const H = 220;
  const TOP = 16;
  const BOTTOM = H - 16;
  const ROW_H = (BOTTOM - TOP) / 4;

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{titleText}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">{captionText}</p>
      </figcaption>

      <div className={variant === "full" ? "grid gap-4 sm:grid-cols-[auto,1fr] items-center" : ""}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={titleText}
          className="block w-full max-w-[360px] mx-auto h-auto"
        >
          {TIERS.map((tier, i) => {
            const halfTop = (W * (i === 0 ? tier.widthPct : TIERS[i - 1]!.widthPct)) / 200;
            const halfBot = (W * tier.widthPct) / 200;
            const yTop = TOP + i * ROW_H;
            const yBot = TOP + (i + 1) * ROW_H;
            const cx = W / 2;
            const points = [
              `${cx - halfTop},${yTop}`,
              `${cx + halfTop},${yTop}`,
              `${cx + halfBot},${yBot}`,
              `${cx - halfBot},${yBot}`,
            ].join(" ");
            const isHighlight = highlight === tier.grade;
            return (
              <g key={tier.grade}>
                <polygon
                  points={points}
                  fill={tier.fill}
                  fillOpacity={isHighlight ? 1 : 0.85}
                  stroke={isHighlight ? "#0f172a" : "#ffffff"}
                  strokeOpacity={isHighlight ? 1 : 0.5}
                  strokeWidth={isHighlight ? 2.5 : 1}
                />
                <text
                  x={cx}
                  y={(yTop + yBot) / 2 + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="#fff"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.25)", strokeWidth: 0.5 }}
                >
                  {tier.grade}
                </text>
                {isHighlight && (
                  <text
                    x={cx + halfBot + 6}
                    y={(yTop + yBot) / 2 + 4}
                    fontSize="11"
                    fill="currentColor"
                    className="fill-foreground"
                  >
                    ◀ {isZh ? "本條目" : "this entry"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {variant === "full" && (
          <ul className="space-y-2 text-xs">
            {TIERS.map((tier) => {
              const isHighlight = highlight === tier.grade;
              return (
                <li
                  key={tier.grade}
                  className={`flex items-start gap-2 rounded-md p-2 ${isHighlight ? "bg-surface ring-1 ring-foreground/30" : ""}`}
                >
                  <span
                    aria-hidden
                    className="inline-block w-3 h-3 rounded-sm mt-0.5 shrink-0"
                    style={{ backgroundColor: tier.fill }}
                  />
                  <span className="flex-1">
                    <span className="font-semibold">{tier.grade}</span>{" "}
                    <span className="text-muted">— {isZh ? tier.labelZh : tier.labelEn}</span>
                    <span className="block text-muted leading-snug">
                      {isZh ? tier.studyZh : tier.studyEn}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </figure>
  );
}
