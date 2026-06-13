import type { Locale } from "@/lib/i18n/types";

type Element = "wood" | "fire" | "earth" | "metal" | "water";

interface FiveElementCycleProps {
  highlight?: Element;
  /** Show 生 generating cycle (default), 剋 controlling cycle, or both. */
  cycle?: "generating" | "controlling" | "both";
  locale?: Locale;
  /** Size in px (square). Default 360. */
  size?: number;
}

const ELEMENTS: Array<{
  key: Element; ch: string; en: string;
  zang: string; fu: string; emotion: string; color: string;
  /** Position on the regular pentagon (clockwise starting top). */
  pos: number;
}> = [
  { key: "fire",  ch: "火", en: "Fire",  zang: "心",   fu: "小腸",   emotion: "喜 / Joy",        color: "#ef4444", pos: 0 },
  { key: "earth", ch: "土", en: "Earth", zang: "脾",   fu: "胃",     emotion: "思 / Pensiveness", color: "#ca8a04", pos: 1 },
  { key: "metal", ch: "金", en: "Metal", zang: "肺",   fu: "大腸",   emotion: "悲 / Grief",       color: "#a3a3a3", pos: 2 },
  { key: "water", ch: "水", en: "Water", zang: "腎",   fu: "膀胱",   emotion: "恐 / Fear",        color: "#1e3a8a", pos: 3 },
  { key: "wood",  ch: "木", en: "Wood",  zang: "肝",   fu: "膽",     emotion: "怒 / Anger",       color: "#16a34a", pos: 4 },
];

// Generating sequence (相生): wood → fire → earth → metal → water → wood
const GENERATING_ORDER: Element[] = ["wood", "fire", "earth", "metal", "water"];

export function FiveElementCycle({
  highlight, cycle = "generating", locale = "en", size = 360,
}: FiveElementCycleProps) {
  const isZh = locale === "zh-Hant";
  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = 130;

  // Compute coordinates by pentagon position (5 nodes, top first)
  const angleAt = (pos: number) => -Math.PI / 2 + (pos * 2 * Math.PI) / 5;
  const coordOf = (key: Element) => {
    const e = ELEMENTS.find((x) => x.key === key)!;
    const a = angleAt(e.pos);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), e };
  };

  // Generating cycle: wood→fire→earth→metal→water→wood
  const generatingEdges = GENERATING_ORDER.map((from, i) => {
    const to = GENERATING_ORDER[(i + 1) % GENERATING_ORDER.length]!;
    return { from: coordOf(from), to: coordOf(to) };
  });

  // Controlling cycle: wood→earth→water→fire→metal→wood (skip one)
  const controllingEdges = GENERATING_ORDER.map((from, i) => {
    const to = GENERATING_ORDER[(i + 2) % GENERATING_ORDER.length]!;
    return { from: coordOf(from), to: coordOf(to) };
  });

  const showGen = cycle === "generating" || cycle === "both";
  const showCtl = cycle === "controlling" || cycle === "both";

  const titleText = isZh ? "五行相生相剋" : "Five Element Cycle";
  const subtitleText = isZh
    ? "綠色實線：相生（木→火→土→金→水）。紅色虛線：相剋（木→土，土→水，水→火，火→金，金→木）。"
    : "Solid green: Generating (Wood → Fire → Earth → Metal → Water). Dashed red: Controlling (skip-one).";

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">{titleText}</h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">{subtitleText}</p>
      </figcaption>

      <div className="grid gap-4 sm:grid-cols-[auto,1fr] items-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={size}
          height={size}
          role="img"
          aria-label={titleText}
          className="block mx-auto"
        >
          <defs>
            <marker id="arrow-gen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#16a34a" />
            </marker>
            <marker id="arrow-ctl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Controlling edges (drawn first, behind) */}
          {showCtl && controllingEdges.map((edge, i) => {
            // Trim line so it doesn't go inside node circles
            const dx = edge.to.x - edge.from.x;
            const dy = edge.to.y - edge.from.y;
            const len = Math.hypot(dx, dy);
            const nodeR = 32;
            const x1 = edge.from.x + (dx / len) * nodeR;
            const y1 = edge.from.y + (dy / len) * nodeR;
            const x2 = edge.to.x - (dx / len) * nodeR;
            const y2 = edge.to.y - (dy / len) * nodeR;
            return (
              <line
                key={`ctl-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#dc2626" strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.7}
                markerEnd="url(#arrow-ctl)"
              />
            );
          })}

          {/* Generating edges (drawn on top of controlling) */}
          {showGen && generatingEdges.map((edge, i) => {
            const dx = edge.to.x - edge.from.x;
            const dy = edge.to.y - edge.from.y;
            const len = Math.hypot(dx, dy);
            const nodeR = 32;
            const x1 = edge.from.x + (dx / len) * nodeR;
            const y1 = edge.from.y + (dy / len) * nodeR;
            const x2 = edge.to.x - (dx / len) * nodeR;
            const y2 = edge.to.y - (dy / len) * nodeR;
            return (
              <line
                key={`gen-${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="#16a34a" strokeWidth={2.5}
                markerEnd="url(#arrow-gen)"
              />
            );
          })}

          {/* Element nodes */}
          {ELEMENTS.map((e) => {
            const a = angleAt(e.pos);
            const x = cx + R * Math.cos(a);
            const y = cy + R * Math.sin(a);
            const isH = highlight === e.key;
            return (
              <g key={e.key}>
                <circle
                  cx={x} cy={y} r={isH ? 36 : 32}
                  fill={e.color}
                  fillOpacity={isH ? 1 : 0.92}
                  stroke="#fff" strokeWidth={isH ? 4 : 2}
                />
                <text
                  x={x} y={y - 2} textAnchor="middle" fontSize="22" fontWeight={700}
                  fill="#fff" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.25)", strokeWidth: 0.6 }}
                >
                  {e.ch}
                </text>
                <text
                  x={x} y={y + 14} textAnchor="middle" fontSize="9" fill="#fff" fontWeight={600}
                >
                  {e.zang}/{e.fu}
                </text>
              </g>
            );
          })}
        </svg>

        <ul className="space-y-2 text-xs">
          {ELEMENTS.map((e) => {
            const isH = highlight === e.key;
            return (
              <li
                key={e.key}
                className={`flex items-start gap-2 rounded-md p-2 ${isH ? "bg-surface ring-1 ring-foreground/30" : ""}`}
              >
                <span aria-hidden className="inline-block w-3 h-3 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: e.color }} />
                <span>
                  <span className="font-semibold">{e.ch} {isZh ? "" : e.en}</span>
                  <span className="block text-muted">
                    {isZh
                      ? `臟：${e.zang} · 腑：${e.fu} · ${e.emotion}`
                      : `Zang: ${e.zang} · Fu: ${e.fu} · ${e.emotion}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </figure>
  );
}
