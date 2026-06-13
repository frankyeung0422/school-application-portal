import type { Locale } from "@/lib/i18n/types";

type TongueColor = "pale" | "normal" | "red" | "crimson" | "purple";
type Coating = "none" | "thin-white" | "thick-white" | "yellow" | "greasy" | "peeled";

interface TongueDiagramProps {
  /** Free-text from pattern.tongue. If supplied and color/coating not given, we try to infer. */
  description?: string | null;
  color?: TongueColor;
  coating?: Coating;
  /** Optional zone callout for diagnostic emphasis. */
  highlightZone?: "tip" | "sides" | "middle" | "root";
  locale?: Locale;
  /** Size in px (square). Default 280. */
  size?: number;
}

const COLOR_FILL: Record<TongueColor, string> = {
  pale:    "#fde7e7", // 淡白
  normal:  "#f4a3a3", // 淡紅 (healthy)
  red:     "#dc2626", // 紅
  crimson: "#7f1d1d", // 絳
  purple:  "#581c87", // 紫
};

const COATING_FILL: Record<Coating, { fill: string; opacity: number; label: { en: string; zh: string } }> = {
  none:          { fill: "transparent", opacity: 0,    label: { en: "no coating",     zh: "無苔" } },
  "thin-white":  { fill: "#ffffff",     opacity: 0.45, label: { en: "thin white",     zh: "薄白苔" } },
  "thick-white": { fill: "#ffffff",     opacity: 0.85, label: { en: "thick white",    zh: "厚白苔" } },
  yellow:        { fill: "#fde047",     opacity: 0.65, label: { en: "yellow",         zh: "黃苔" } },
  greasy:        { fill: "#a8a29e",     opacity: 0.55, label: { en: "greasy",         zh: "膩苔" } },
  peeled:        { fill: "#fda4af",     opacity: 0.25, label: { en: "peeled / patchy", zh: "剝苔" } },
};

const ZONE_LABELS = {
  tip:    { en: "Tip — Heart / Lung",       zh: "舌尖 — 心、肺" },
  sides:  { en: "Sides — Liver / Gallbladder", zh: "舌邊 — 肝、膽" },
  middle: { en: "Middle — Spleen / Stomach", zh: "舌中 — 脾、胃" },
  root:   { en: "Root — Kidney",            zh: "舌根 — 腎" },
} as const;

function inferFromText(text: string): { color?: TongueColor; coating?: Coating } {
  const out: { color?: TongueColor; coating?: Coating } = {};
  // Color heuristics
  if (/淡白|舌淡(?!紅)/.test(text)) out.color = "pale";
  else if (/絳/.test(text)) out.color = "crimson";
  else if (/紫|瘀斑|瘀點/.test(text)) out.color = "purple";
  else if (/舌紅|舌尖紅|紅(?!潤)/.test(text)) out.color = "red";
  else if (/淡紅|舌淡紅/.test(text)) out.color = "normal";
  // Coating heuristics
  if (/苔黃|黃膩|黃厚/.test(text)) out.coating = /膩/.test(text) ? "greasy" : "yellow";
  else if (/苔白膩|白膩/.test(text)) out.coating = "greasy";
  else if (/苔白厚|厚白/.test(text)) out.coating = "thick-white";
  else if (/苔薄白|薄白苔|苔白/.test(text)) out.coating = "thin-white";
  else if (/少苔|無苔|剝苔|花剝/.test(text)) out.coating = "peeled";
  return out;
}

export function TongueDiagram({
  description,
  color: colorProp,
  coating: coatingProp,
  highlightZone,
  locale = "en",
  size = 280,
}: TongueDiagramProps) {
  const isZh = locale === "zh-Hant";
  const inferred = description ? inferFromText(description) : {};
  const color: TongueColor = colorProp ?? inferred.color ?? "normal";
  const coating: Coating = coatingProp ?? inferred.coating ?? "thin-white";

  const W = 240;
  const H = 280;

  // Tongue body path — symmetric oval, slightly tapered at tip (bottom)
  const tonguePath = `
    M 120 30
    C 60 30, 24 80, 24 140
    C 24 200, 60 250, 120 262
    C 180 250, 216 200, 216 140
    C 216 80, 180 30, 120 30
    Z
  `;

  // Coating layer path (slightly inset)
  const coatingPath = `
    M 120 50
    C 70 50, 44 92, 44 150
    C 44 200, 78 240, 120 250
    C 162 240, 196 200, 196 150
    C 196 92, 170 50, 120 50
    Z
  `;

  // Zone areas as approximate paths
  const ZONE_REGIONS = {
    tip:    "M 60 232 C 80 252, 160 252, 180 232 C 160 246, 80 246, 60 232 Z",
    sides:  "M 30 96 C 24 140, 24 200, 60 232 L 60 132 C 60 112, 50 100, 30 96 Z M 210 96 C 196 100, 180 112, 180 132 L 180 232 C 216 200, 216 140, 210 96 Z",
    middle: "M 60 132 C 80 124, 160 124, 180 132 L 180 196 C 160 188, 80 188, 60 196 Z",
    root:   "M 60 50 C 70 35, 170 35, 180 50 L 180 124 C 160 116, 80 116, 60 124 Z",
  } as const;

  const titleText = isZh ? "舌診示意" : "Tongue Diagnosis";

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{titleText}</h3>
        {description && (
          <p className="mt-1 text-xs text-muted leading-relaxed">
            <span className="font-medium text-foreground">{isZh ? "本證舌象：" : "This pattern: "}</span>
            {description}
          </p>
        )}
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] items-start">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={titleText}
          width={size}
          height={size}
          className="block mx-auto"
        >
          {/* Mouth shadow */}
          <ellipse cx={120} cy={272} rx={84} ry={6} fill="rgba(0,0,0,0.08)" />

          {/* Tongue body */}
          <path d={tonguePath} fill={COLOR_FILL[color]} stroke="#7c2d12" strokeOpacity={0.35} strokeWidth={1.5} />

          {/* Subtle midline groove */}
          <path d="M 120 50 Q 122 145 120 240" stroke="#7c2d12" strokeOpacity={0.18} strokeWidth={1.5} fill="none" />

          {/* Coating layer */}
          {coating !== "none" && (
            <path d={coatingPath} fill={COATING_FILL[coating].fill} fillOpacity={COATING_FILL[coating].opacity} />
          )}

          {/* Zone highlight (if any) */}
          {highlightZone && (
            <path
              d={ZONE_REGIONS[highlightZone]}
              fill="rgba(59,130,246,0.18)"
              stroke="#3b82f6"
              strokeOpacity={0.85}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}

          {/* Zone labels */}
          <g fontSize="9" fill="#0f172a" className="dark:fill-slate-200" fontWeight={600}>
            <text x={120} y={244} textAnchor="middle">{isZh ? "尖" : "Tip"}</text>
            <text x={120} y={166} textAnchor="middle">{isZh ? "中" : "Mid"}</text>
            <text x={120} y={86}  textAnchor="middle">{isZh ? "根" : "Root"}</text>
            <text x={42}  y={170} textAnchor="middle">{isZh ? "邊" : "L"}</text>
            <text x={198} y={170} textAnchor="middle">{isZh ? "邊" : "R"}</text>
          </g>
        </svg>

        <div className="text-xs space-y-2">
          <div className="flex items-start gap-2">
            <span aria-hidden className="inline-block w-3 h-3 rounded-sm mt-0.5" style={{ backgroundColor: COLOR_FILL[color] }} />
            <span>
              <span className="font-medium">{isZh ? "舌色" : "Tongue color"}:</span>{" "}
              <span className="text-muted">
                {isZh
                  ? { pale: "淡白", normal: "淡紅", red: "紅", crimson: "絳", purple: "紫" }[color]
                  : { pale: "Pale", normal: "Pink (normal)", red: "Red", crimson: "Crimson", purple: "Purple" }[color]}
              </span>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-sm mt-0.5 ring-1 ring-foreground/15"
              style={{ backgroundColor: COATING_FILL[coating].fill, opacity: COATING_FILL[coating].opacity || 1 }}
            />
            <span>
              <span className="font-medium">{isZh ? "舌苔" : "Coating"}:</span>{" "}
              <span className="text-muted">
                {isZh ? COATING_FILL[coating].label.zh : COATING_FILL[coating].label.en}
              </span>
            </span>
          </div>
          <hr className="border-border my-2" />
          <ul className="space-y-1 text-muted">
            <li>
              <span className="font-medium text-foreground">{isZh ? "區位映射：" : "Zone mapping:"}</span>
            </li>
            {(["tip", "middle", "sides", "root"] as const).map((z) => (
              <li
                key={z}
                className={highlightZone === z ? "text-foreground font-medium" : ""}
              >
                {isZh ? ZONE_LABELS[z].zh : ZONE_LABELS[z].en}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
