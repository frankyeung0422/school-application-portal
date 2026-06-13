import { prisma } from "@/lib/db/prisma";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  patientId: string;
  locale: Locale;
}

interface Point {
  date: string;
  value: number;
}
interface Series {
  label: string;
  unit: string;
  color: string;
  normalLow?: number;
  normalHigh?: number;
  points: Point[];
}

/**
 * Server-rendered SVG trend chart for a patient's vitals across visits.
 * Shows BP, weight, fasting glucose, HbA1c if data exists.
 * No chart lib — keeps the bundle lean.
 */
export async function VitalsChart({ patientId, locale }: Props) {
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  // Pull vitals across all this patient's consultations.
  const vitals = await prisma.consultationVital.findMany({
    where: { consultation: { patientId } },
    include: { consultation: { select: { visitDate: true } } },
    orderBy: { measuredAt: "asc" },
  });
  if (vitals.length === 0) return null;

  const series: Series[] = [];
  const bpSys: Point[] = [];
  const bpDia: Point[] = [];
  const weight: Point[] = [];
  const fbg: Point[] = [];
  const hba1c: Point[] = [];

  for (const v of vitals) {
    const d = v.consultation.visitDate.toISOString().slice(0, 10);
    if (v.bpSystolic) bpSys.push({ date: d, value: v.bpSystolic });
    if (v.bpDiastolic) bpDia.push({ date: d, value: v.bpDiastolic });
    if (v.weightKg) weight.push({ date: d, value: v.weightKg });
    if (v.fastingGlucose) fbg.push({ date: d, value: v.fastingGlucose });
    if (v.hba1c) hba1c.push({ date: d, value: v.hba1c });
  }

  if (bpSys.length > 0) {
    series.push({ label: T("收縮壓", "Systolic BP"), unit: "mmHg", color: "#dc2626", normalLow: 90, normalHigh: 130, points: bpSys });
  }
  if (bpDia.length > 0) {
    series.push({ label: T("舒張壓", "Diastolic BP"), unit: "mmHg", color: "#ea580c", normalLow: 60, normalHigh: 85, points: bpDia });
  }
  if (weight.length > 0) {
    series.push({ label: T("體重", "Weight"), unit: "kg", color: "#0891b2", points: weight });
  }
  if (fbg.length > 0) {
    series.push({ label: T("空腹血糖", "Fasting glucose"), unit: "mmol/L", color: "#7c3aed", normalLow: 3.9, normalHigh: 6.1, points: fbg });
  }
  if (hba1c.length > 0) {
    series.push({ label: "HbA1c", unit: "%", color: "#059669", normalLow: 4, normalHigh: 6.5, points: hba1c });
  }

  if (series.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold mb-3">📈 {T("生命徵象趨勢", "Vitals Trend")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {series.map((s) => (
          <MiniChart key={s.label} series={s} isZh={isZh} />
        ))}
      </div>
    </section>
  );
}

function MiniChart({ series, isZh }: { series: Series; isZh: boolean }) {
  const W = 320, H = 110;
  const padL = 36, padR = 8, padT = 8, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = series.points.map((p) => p.value);
  let min = Math.min(...values, series.normalLow ?? Infinity);
  let max = Math.max(...values, series.normalHigh ?? -Infinity);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = Math.min(...values);
    max = Math.max(...values);
  }
  // Pad the range a bit.
  const range = Math.max(1, max - min);
  min -= range * 0.1;
  max += range * 0.1;

  const xs = series.points.map((_, i) =>
    series.points.length === 1 ? innerW / 2 : (i / (series.points.length - 1)) * innerW,
  );
  const ys = series.points.map((p) => innerH - ((p.value - min) / (max - min)) * innerH);

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${padL + x} ${padT + ys[i]}`).join(" ");

  // Normal band shading.
  const normalBandY1 = series.normalHigh !== undefined ? padT + (innerH - ((series.normalHigh - min) / (max - min)) * innerH) : null;
  const normalBandY2 = series.normalLow !== undefined ? padT + (innerH - ((series.normalLow - min) / (max - min)) * innerH) : null;

  const yTicks = 3;
  const tickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) tickValues.push(min + ((max - min) * i) / yTicks);

  const latest = series.points[series.points.length - 1];

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: series.color }}>{series.label}</span>
        <span className="text-xs">
          <span className="font-semibold">{latest.value}</span>
          <span className="text-muted text-[10px] ml-1">{series.unit}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Normal band */}
        {normalBandY1 !== null && normalBandY2 !== null && (
          <rect
            x={padL}
            y={normalBandY1}
            width={innerW}
            height={Math.max(0, normalBandY2 - normalBandY1)}
            fill="currentColor"
            className="text-green-200/30 dark:text-green-700/15"
          />
        )}
        {/* Y axis ticks */}
        {tickValues.map((tv, i) => {
          const y = padT + innerH - ((tv - min) / (max - min)) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="currentColor" strokeWidth={0.3} className="text-muted/30" />
              <text x={padL - 4} y={y + 3} textAnchor="end" fontSize={9} className="fill-muted">
                {tv.toFixed(tv >= 100 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {/* Line + points */}
        <path d={path} fill="none" stroke={series.color} strokeWidth={1.6} />
        {xs.map((x, i) => (
          <circle key={i} cx={padL + x} cy={padT + ys[i]} r={2.5} fill={series.color} />
        ))}
        {/* X axis dates (first + last) */}
        <text x={padL} y={H - 4} fontSize={9} className="fill-muted">{series.points[0].date.slice(5)}</text>
        {series.points.length > 1 && (
          <text x={W - padR} y={H - 4} fontSize={9} textAnchor="end" className="fill-muted">
            {series.points[series.points.length - 1].date.slice(5)}
          </text>
        )}
      </svg>
      <p className="text-[10px] text-muted mt-1">
        {series.points.length} {isZh ? "次測量" : "measurements"}
        {series.normalLow !== undefined && series.normalHigh !== undefined && (
          <> · {isZh ? "正常" : "normal"} {series.normalLow}–{series.normalHigh}</>
        )}
      </p>
    </div>
  );
}
