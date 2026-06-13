import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { MERIDIAN_THEME, MeridianBadge } from "./MeridianBadge";

interface MeridianBodyMapProps {
  locale?: Locale;
  /** If set, that meridian is highlighted; others fade to ~30% opacity. */
  highlight?: string;
  /** Path users click to filter (e.g. "/acupuncture"). Default "/acupuncture". */
  hrefBase?: string;
}

// Each meridian represented as one or more polyline segments.
// Coordinates designed for a simple symmetric humanoid silhouette in
// viewBox 0 0 800 620 with a FRONT figure (cx=200) and BACK figure (cx=600).
// Stylized — matches clinical pedagogy for orientation, not a topographic chart.

interface MPath {
  meridian: string;
  side: "front" | "back" | "both";
  d: string;
}

const FRONT_CX = 200;
const BACK_CX = 600;

const PATHS: MPath[] = [
  // ── Lung 肺經 LU — chest → arm front-medial → thumb (right side shown)
  { meridian: "Lung", side: "front",
    d: `M ${FRONT_CX + 36} 178 C ${FRONT_CX + 80} 200, ${FRONT_CX + 110} 260, ${FRONT_CX + 130} 330 C ${FRONT_CX + 138} 380, ${FRONT_CX + 130} 420, ${FRONT_CX + 124} 440` },

  // ── Large Intestine 大腸經 LI — index finger → arm back-lateral → face → nose
  { meridian: "Large Intestine", side: "front",
    d: `M ${FRONT_CX + 142} 446 L ${FRONT_CX + 150} 420 C ${FRONT_CX + 160} 380, ${FRONT_CX + 158} 320, ${FRONT_CX + 138} 260 C ${FRONT_CX + 110} 200, ${FRONT_CX + 70} 170, ${FRONT_CX + 40} 138 L ${FRONT_CX + 12} 110` },

  // ── Stomach 胃經 ST — face → front-lateral → outer leg → 2nd toe
  { meridian: "Stomach", side: "front",
    d: `M ${FRONT_CX + 18} 96 L ${FRONT_CX + 22} 132 L ${FRONT_CX + 36} 180 L ${FRONT_CX + 56} 280 L ${FRONT_CX + 68} 380 L ${FRONT_CX + 76} 440 L ${FRONT_CX + 84} 530 L ${FRONT_CX + 86} 590` },

  // ── Spleen 脾經 SP — big toe → inner leg → abdomen → flank
  { meridian: "Spleen", side: "front",
    d: `M ${FRONT_CX + 52} 590 L ${FRONT_CX + 50} 530 L ${FRONT_CX + 40} 440 L ${FRONT_CX + 28} 380 L ${FRONT_CX + 18} 280 C ${FRONT_CX + 30} 230, ${FRONT_CX + 60} 200, ${FRONT_CX + 76} 192` },

  // ── Heart 心經 HT — chest → arm front-medial → little finger
  { meridian: "Heart", side: "front",
    d: `M ${FRONT_CX + 30} 200 C ${FRONT_CX + 60} 230, ${FRONT_CX + 90} 290, ${FRONT_CX + 110} 360 C ${FRONT_CX + 124} 410, ${FRONT_CX + 132} 440, ${FRONT_CX + 138} 460` },

  // ── Pericardium 心包經 PC — chest → arm front-middle → middle finger
  { meridian: "Pericardium", side: "front",
    d: `M ${FRONT_CX + 26} 188 C ${FRONT_CX + 70} 220, ${FRONT_CX + 100} 280, ${FRONT_CX + 120} 360 C ${FRONT_CX + 132} 410, ${FRONT_CX + 134} 445, ${FRONT_CX + 132} 458` },

  // ── Kidney 腎經 KI — sole → inner leg → abdomen → chest (close to midline)
  { meridian: "Kidney", side: "front",
    d: `M ${FRONT_CX + 32} 596 L ${FRONT_CX + 30} 540 L ${FRONT_CX + 22} 440 L ${FRONT_CX + 14} 380 L ${FRONT_CX + 8} 290 L ${FRONT_CX + 6} 200 L ${FRONT_CX + 4} 150` },

  // ── Liver 肝經 LV — big toe → inner leg → genital → flank
  { meridian: "Liver", side: "front",
    d: `M ${FRONT_CX + 56} 596 L ${FRONT_CX + 48} 540 L ${FRONT_CX + 36} 440 L ${FRONT_CX + 22} 360 L ${FRONT_CX + 30} 290 L ${FRONT_CX + 60} 240` },

  // ── Conception Vessel 任脈 CV — midline front
  { meridian: "Conception Vessel", side: "front",
    d: `M ${FRONT_CX} 86 L ${FRONT_CX} 168 L ${FRONT_CX} 240 L ${FRONT_CX} 320 L ${FRONT_CX} 380 L ${FRONT_CX} 430` },

  // ── Bladder 膀胱經 BL — inner canthus → over head → back paraspinal → leg → little toe
  { meridian: "Bladder", side: "back",
    d: `M ${BACK_CX - 10} 96 L ${BACK_CX - 18} 80 L ${BACK_CX - 30} 70 L ${BACK_CX - 30} 130 L ${BACK_CX - 30} 200 L ${BACK_CX - 32} 280 L ${BACK_CX - 36} 360 L ${BACK_CX - 46} 440 L ${BACK_CX - 56} 530 L ${BACK_CX - 64} 596` },
  { meridian: "Bladder", side: "back",
    d: `M ${BACK_CX + 10} 96 L ${BACK_CX + 18} 80 L ${BACK_CX + 30} 70 L ${BACK_CX + 30} 130 L ${BACK_CX + 30} 200 L ${BACK_CX + 32} 280 L ${BACK_CX + 36} 360 L ${BACK_CX + 46} 440 L ${BACK_CX + 56} 530 L ${BACK_CX + 64} 596` },

  // ── Governing Vessel 督脈 GV — coccyx → spine → over head → upper lip
  { meridian: "Governing Vessel", side: "back",
    d: `M ${BACK_CX} 596 L ${BACK_CX} 540 L ${BACK_CX} 440 L ${BACK_CX} 320 L ${BACK_CX} 200 L ${BACK_CX} 70 L ${BACK_CX} 50 L ${BACK_CX} 96` },

  // ── Small Intestine 小腸經 SI — little finger → arm back-medial → shoulder → ear
  { meridian: "Small Intestine", side: "back",
    d: `M ${BACK_CX + 142} 446 L ${BACK_CX + 130} 420 L ${BACK_CX + 120} 360 L ${BACK_CX + 110} 290 L ${BACK_CX + 80} 220 L ${BACK_CX + 50} 170 L ${BACK_CX + 22} 110` },

  // ── Triple Energizer 三焦經 TE — ring finger → arm back-middle → shoulder → ear
  { meridian: "Triple Energizer", side: "back",
    d: `M ${BACK_CX + 138} 458 L ${BACK_CX + 124} 425 L ${BACK_CX + 116} 380 L ${BACK_CX + 100} 320 L ${BACK_CX + 80} 240 L ${BACK_CX + 56} 180 L ${BACK_CX + 32} 130` },

  // ── Gallbladder 膽經 GB — outer canthus → side of head → side of body → 4th toe (lateral)
  { meridian: "Gallbladder", side: "back",
    d: `M ${BACK_CX + 26} 100 L ${BACK_CX + 50} 140 L ${BACK_CX + 70} 240 L ${BACK_CX + 80} 360 L ${BACK_CX + 90} 440 L ${BACK_CX + 96} 530 L ${BACK_CX + 100} 596` },
  { meridian: "Gallbladder", side: "back",
    d: `M ${BACK_CX - 26} 100 L ${BACK_CX - 50} 140 L ${BACK_CX - 70} 240 L ${BACK_CX - 80} 360 L ${BACK_CX - 90} 440 L ${BACK_CX - 96} 530 L ${BACK_CX - 100} 596` },
];

/** Simple humanoid silhouette path for either FRONT (cx=200) or BACK (cx=600). */
function silhouettePath(cx: number) {
  return `
    M ${cx - 22} 60
    A 22 26 0 1 1 ${cx + 22} 60
    A 22 26 0 1 1 ${cx - 22} 60
    Z

    M ${cx - 14} 84
    L ${cx - 8} 94
    L ${cx - 70} 130
    L ${cx - 110} 230
    L ${cx - 100} 240
    L ${cx - 60} 200
    L ${cx - 60} 280
    L ${cx - 70} 380
    L ${cx - 60} 430
    L ${cx - 80} 530
    L ${cx - 70} 600
    L ${cx - 30} 600
    L ${cx - 22} 530
    L ${cx - 12} 430
    L ${cx + 12} 430
    L ${cx + 22} 530
    L ${cx + 30} 600
    L ${cx + 70} 600
    L ${cx + 80} 530
    L ${cx + 60} 430
    L ${cx + 70} 380
    L ${cx + 60} 280
    L ${cx + 60} 200
    L ${cx + 100} 240
    L ${cx + 110} 230
    L ${cx + 70} 130
    L ${cx + 8} 94
    L ${cx + 14} 84
    Z
  `;
}

export function MeridianBodyMap({ locale = "en", highlight, hrefBase = "/acupuncture" }: MeridianBodyMapProps) {
  const isZh = locale === "zh-Hant";
  const titleText = isZh ? "經絡循行示意（前後人身圖）" : "Meridian Pathway Map (Front & Back)";
  const subtitleText = isZh
    ? "經絡循行為示意性簡化圖，僅供方位參考；確切走行請見針灸學圖譜。點擊下方經絡名可篩選對應穴位。"
    : "Simplified pathway sketch for orientation only — consult an acupuncture atlas for precise routing. Click any meridian below to filter its points.";

  const isHighlighted = (m: string) => !highlight || highlight === m;

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{titleText}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">{subtitleText}</p>
      </figcaption>

      <svg
        viewBox="0 0 800 620"
        role="img"
        aria-label={titleText}
        className="block w-full max-w-[760px] mx-auto h-auto"
      >
        {/* Section labels */}
        <text x={FRONT_CX} y={28} textAnchor="middle" fontSize="11" fontWeight={600} fill="currentColor" className="fill-muted">
          {isZh ? "正面 Front" : "Front"}
        </text>
        <text x={BACK_CX} y={28} textAnchor="middle" fontSize="11" fontWeight={600} fill="currentColor" className="fill-muted">
          {isZh ? "背面 Back" : "Back"}
        </text>

        {/* Body silhouettes */}
        <path d={silhouettePath(FRONT_CX)} fill="rgba(148,163,184,0.18)" stroke="rgba(100,116,139,0.55)" strokeWidth={1.5} fillRule="evenodd" />
        <path d={silhouettePath(BACK_CX)}  fill="rgba(148,163,184,0.18)" stroke="rgba(100,116,139,0.55)" strokeWidth={1.5} fillRule="evenodd" />

        {/* Meridian paths */}
        {PATHS.map((m, i) => {
          const theme = MERIDIAN_THEME[m.meridian]!;
          const active = isHighlighted(m.meridian);
          return (
            <path
              key={i}
              d={m.d}
              fill="none"
              stroke={theme.fg}
              strokeOpacity={active ? 0.9 : 0.18}
              strokeWidth={active ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Mirror front meridians to the left side of the body */}
        {PATHS.filter((m) => m.side === "front").map((m, i) => {
          const theme = MERIDIAN_THEME[m.meridian]!;
          const active = isHighlighted(m.meridian);
          return (
            <path
              key={`mirror-${i}`}
              d={m.d}
              transform={`translate(${FRONT_CX * 2}, 0) scale(-1, 1)`}
              fill="none"
              stroke={theme.fg}
              strokeOpacity={active ? 0.9 : 0.18}
              strokeWidth={active ? 3 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* Clickable legend / filter chips */}
      <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
        {Object.keys(MERIDIAN_THEME).map((m) => (
          <Link
            key={m}
            href={`${hrefBase}?meridian=${encodeURIComponent(m)}`}
            className={`transition-opacity ${highlight && highlight !== m ? "opacity-40 hover:opacity-100" : ""}`}
          >
            <MeridianBadge meridian={m} locale={locale} />
          </Link>
        ))}
      </div>
    </figure>
  );
}
