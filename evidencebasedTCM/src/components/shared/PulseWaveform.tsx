import type { Locale } from "@/lib/i18n/types";

type PulseType =
  | "floating"     // 浮 — high near surface
  | "sinking"      // 沉 — only deep
  | "slow"         // 遲 — < 60 bpm
  | "rapid"        // 數 — > 90 bpm
  | "wiry"         // 弦 — taut, long, like guitar string
  | "slippery"     // 滑 — smooth, rolling
  | "choppy"       // 澀 — rough, hesitant, irregular
  | "knotted"      // 結 — slow with intermittent skip
  | "intermittent" // 代 — regular pause at intervals
  | "deficient"    // 虛 — empty, weak, low amplitude
  | "excess"       // 實 — full, forceful
  | "thin"         // 細 — like thread
  | "normal";      // 平 — moderate

interface PulseWaveformProps {
  description?: string | null;
  type?: PulseType;
  locale?: Locale;
  /** Width in px. Default 320. */
  width?: number;
  height?: number;
}

const PULSE_LABELS: Record<PulseType, { zh: string; en: string; meaning: { zh: string; en: string } }> = {
  floating:     { zh: "浮", en: "Floating",     meaning: { zh: "表證 / 外感", en: "Exterior pattern / superficial pathogen" } },
  sinking:      { zh: "沉", en: "Sinking",      meaning: { zh: "裡證", en: "Interior pattern" } },
  slow:         { zh: "遲", en: "Slow",         meaning: { zh: "寒證", en: "Cold pattern" } },
  rapid:        { zh: "數", en: "Rapid",        meaning: { zh: "熱證", en: "Heat pattern" } },
  wiry:         { zh: "弦", en: "Wiry",         meaning: { zh: "肝鬱 / 痰飲 / 痛證", en: "Liver qi stagnation / phlegm-fluid / pain" } },
  slippery:     { zh: "滑", en: "Slippery",     meaning: { zh: "痰濕 / 食積 / 妊娠", en: "Phlegm-damp / food retention / pregnancy" } },
  choppy:       { zh: "澀", en: "Choppy",       meaning: { zh: "血虛 / 血瘀 / 精傷", en: "Blood deficiency / blood stasis / essence depletion" } },
  knotted:      { zh: "結", en: "Knotted",      meaning: { zh: "陰盛氣結 / 寒痰瘀血", en: "Yin excess with qi stagnation" } },
  intermittent: { zh: "代", en: "Intermittent", meaning: { zh: "臟氣衰微", en: "Severe organ deficiency" } },
  deficient:    { zh: "虛", en: "Deficient",    meaning: { zh: "氣血兩虛", en: "Qi and blood deficiency" } },
  excess:       { zh: "實", en: "Excess",       meaning: { zh: "邪盛正實", en: "Strong pathogen with strong qi" } },
  thin:         { zh: "細", en: "Thin",         meaning: { zh: "陰血虛 / 濕困", en: "Yin/blood deficiency / dampness" } },
  normal:       { zh: "平", en: "Normal",       meaning: { zh: "和緩有力，一息四至", en: "Moderate, even, ~75 bpm" } },
};

/**
 * Generate an SVG path describing the pulse waveform for a given type.
 * Coordinate space: x in [0, len], y centered at 30 with amplitude varying by type.
 */
function pathFor(type: PulseType, width: number, midY: number): string {
  const cycles = (() => {
    switch (type) {
      case "slow": return 3;
      case "rapid": return 8;
      case "knotted": return 4;
      case "intermittent": return 6;
      default: return 5;
    }
  })();
  const stepX = width / cycles;
  const segments: string[] = [];
  for (let i = 0; i < cycles; i++) {
    const x0 = i * stepX;
    const x1 = x0 + stepX;
    const xMid = (x0 + x1) / 2;

    // Amplitude per type
    let amp = 16;
    if (type === "deficient" || type === "thin") amp = 6;
    if (type === "excess" || type === "wiry") amp = 22;
    if (type === "floating") amp = 20;
    if (type === "sinking") amp = 8;

    // Skip beat for knotted/intermittent
    const skipKnot = type === "knotted" && i === 2;
    const skipInt  = type === "intermittent" && (i + 1) % 3 === 0;
    if (skipKnot || skipInt) {
      // Flatline through this cycle
      segments.push(`L ${x1} ${midY}`);
      continue;
    }

    if (type === "slippery") {
      // Smooth rolling waves
      segments.push(`Q ${xMid} ${midY - amp}, ${x1} ${midY}`);
    } else if (type === "choppy") {
      // Irregular jagged
      const jag1 = midY - amp + Math.sin(i) * 4;
      const jag2 = midY + amp / 2 + Math.cos(i * 1.3) * 4;
      segments.push(`L ${x0 + stepX * 0.25} ${jag1} L ${x0 + stepX * 0.55} ${jag2} L ${x1} ${midY}`);
    } else if (type === "wiry") {
      // Taut, sharp peaks (string-like)
      segments.push(`L ${x0 + stepX * 0.3} ${midY - amp} L ${x0 + stepX * 0.7} ${midY - amp} L ${x1} ${midY}`);
    } else if (type === "floating") {
      // Crests near top of strip
      segments.push(`Q ${xMid} ${midY - amp - 6}, ${x1} ${midY - 4}`);
    } else if (type === "sinking") {
      // Crests near bottom (offset down)
      segments.push(`Q ${xMid} ${midY + 12}, ${x1} ${midY + 4}`);
    } else {
      // Normal sinusoidal
      segments.push(`Q ${xMid} ${midY - amp}, ${x1} ${midY}`);
    }
  }
  return `M 0 ${midY} ${segments.join(" ")}`;
}

function inferType(text: string): PulseType | undefined {
  if (/結代/.test(text)) return "knotted";
  if (/弦/.test(text)) return "wiry";
  if (/滑/.test(text) && !/澀/.test(text)) return "slippery";
  if (/澀/.test(text)) return "choppy";
  if (/沉/.test(text)) return "sinking";
  if (/浮/.test(text)) return "floating";
  if (/數/.test(text)) return "rapid";
  if (/遲|緩/.test(text)) return "slow";
  if (/虛|細弱|微/.test(text)) return "deficient";
  if (/實|有力/.test(text)) return "excess";
  if (/細/.test(text)) return "thin";
  return undefined;
}

export function PulseWaveform({
  description, type: typeProp, locale = "en", width = 320, height = 90,
}: PulseWaveformProps) {
  const isZh = locale === "zh-Hant";
  const inferred = description ? inferType(description) : undefined;
  const type: PulseType = typeProp ?? inferred ?? "normal";
  const meta = PULSE_LABELS[type];
  const midY = height / 2;

  const titleText = isZh ? "脈象示意" : "Pulse Waveform";

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {titleText} — <span className="text-base">{meta.zh}</span> {!isZh && <span className="text-muted">({meta.en})</span>}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-muted leading-relaxed">
            <span className="font-medium text-foreground">{isZh ? "本證脈象：" : "This pattern: "}</span>
            {description}
          </p>
        )}
      </figcaption>

      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-md border border-border/60 bg-background">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height={height}
            role="img"
            aria-label={`${titleText} ${meta.en}`}
            preserveAspectRatio="none"
            className="block ebt-pulse-svg"
          >
            {/* Center reference line */}
            <line x1={0} y1={midY} x2={width * 3} y2={midY} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
            {/* Animated waveform: render path 3x and translate left across one width */}
            <g className="ebt-pulse-flow" style={{ color: type === "rapid" ? "#dc2626" : type === "slow" ? "#1d4ed8" : "#0f766e" }}>
              <path d={pathFor(type, width, midY)} fill="none" stroke="currentColor" strokeWidth={2} />
              <path d={pathFor(type, width, midY)} transform={`translate(${width}, 0)`} fill="none" stroke="currentColor" strokeWidth={2} />
              <path d={pathFor(type, width, midY)} transform={`translate(${width * 2}, 0)`} fill="none" stroke="currentColor" strokeWidth={2} />
            </g>
          </svg>
        </div>

        <p className="text-xs text-muted">
          <span className="font-medium text-foreground">{isZh ? "主病：" : "Indications: "}</span>
          {isZh ? meta.meaning.zh : meta.meaning.en}
        </p>
      </div>

      <style>{`
        .ebt-pulse-flow {
          animation: ebt-pulse-scroll ${type === "rapid" ? 1.5 : type === "slow" ? 4.5 : 3}s linear infinite;
        }
        @keyframes ebt-pulse-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${width}px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ebt-pulse-flow { animation: none; }
        }
      `}</style>
    </figure>
  );
}
