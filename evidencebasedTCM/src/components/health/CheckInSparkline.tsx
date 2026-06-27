"use client";

interface Props {
  values: number[];
  max?: number;
  label: string;
  color?: string;
  fillColor?: string;
  width?: number;
  height?: number;
  inverted?: boolean;
}

export function CheckInSparkline({
  values,
  max = 10,
  label,
  color = "#0d9488",
  fillColor,
  width = 120,
  height = 48,
  inverted = false,
}: Props) {
  if (values.length < 2) return null;

  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const normalize = (v: number) => {
    const pct = Math.max(0, Math.min(1, v / max));
    return inverted ? 1 - pct : pct;
  };

  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - normalize(v)) * innerH;
    return [x, y] as const;
  });

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const lastPt = pts[pts.length - 1];
  const lastVal = values[values.length - 1];

  const fill = fillColor ?? color + "1a";

  const areaPath = [
    `M ${pts[0][0]},${pad + innerH}`,
    ...pts.map(([x, y]) => `L ${x},${y}`),
    `L ${pts[pts.length - 1][0]},${pad + innerH}`,
    "Z",
  ].join(" ");

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-xs font-medium text-muted">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="overflow-visible">
        <path d={areaPath} fill={fill} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2" fill={color} />
        ))}
        {lastPt && (
          <text
            x={lastPt[0] + 5}
            y={lastPt[1] + 4}
            fontSize="9"
            fill={color}
            fontWeight="600"
          >
            {lastVal}
          </text>
        )}
      </svg>
    </div>
  );
}
