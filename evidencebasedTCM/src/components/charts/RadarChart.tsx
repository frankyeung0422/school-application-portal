"use client";

// Minimal SVG radar chart — no dependencies.
interface Props {
  axes: { label: string; value: number; max?: number }[];
  size?: number;
  color?: string;
}

export function RadarChart({ axes, size = 220, color = "#0d9488" }: Props) {
  const n = axes.length;
  if (n < 3) return null;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;

  const pointFor = (i: number, v: number, maxV: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / maxV) * radius;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r] as const;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const polyPoints = axes
    .map((a, i) => {
      const max = a.max ?? Math.max(1, ...axes.map((x) => x.max ?? 1));
      const [x, y] = pointFor(i, a.value, max);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-xs mx-auto">
      {gridLevels.map((lv, li) => (
        <polygon
          key={li}
          points={axes
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
              return `${cx + Math.cos(angle) * radius * lv},${cy + Math.sin(angle) * radius * lv}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={0.6}
        />
      ))}
      {axes.map((a, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * radius;
        const ly = cy + Math.sin(angle) * radius;
        const tx = cx + Math.cos(angle) * (radius + 14);
        const ty = cy + Math.sin(angle) * (radius + 14);
        return (
          <g key={a.label}>
            <line x1={cx} y1={cy} x2={lx} y2={ly} stroke="#e5e7eb" strokeWidth={0.5} />
            <text
              x={tx}
              y={ty}
              fontSize={9}
              fill="#374151"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {a.label}
            </text>
          </g>
        );
      })}
      <polygon points={polyPoints} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} />
      {axes.map((a, i) => {
        const max = a.max ?? Math.max(1, ...axes.map((x) => x.max ?? 1));
        const [x, y] = pointFor(i, a.value, max);
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />;
      })}
    </svg>
  );
}
