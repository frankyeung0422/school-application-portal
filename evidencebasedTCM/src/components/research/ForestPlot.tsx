import type { MetaGroup } from "@/lib/research/meta-analysis";

/**
 * Compact forest plot for one pooled metric group. Ratio metrics (OR/RR/HR)
 * are positioned on a log scale; SMD/MD on a linear scale. Each row shows the
 * study's CI bar + point marker (size ∝ weight); the pooled estimate is a
 * highlighted diamond row. No-effect reference line is drawn vertically.
 */
export function ForestPlot({ group, locale }: { group: MetaGroup; locale: string }) {
  const zh = locale === "zh-Hant";
  const { pooled, studies } = group;
  const ratio = pooled.noEffectLine === 1;
  const pos = (v: number) => (ratio ? Math.log(v) : v);

  // Domain across all CIs + pooled, with a little padding.
  const lows = [...studies.map((s) => s.ciLow), pooled.ciLow, pooled.noEffectLine];
  const highs = [...studies.map((s) => s.ciHigh), pooled.ciHigh, pooled.noEffectLine];
  let dLow = Math.min(...lows);
  let dHigh = Math.max(...highs);
  if (ratio) { dLow = Math.max(dLow, 0.01); }
  const pLow = pos(dLow), pHigh = pos(dHigh);
  const span = pHigh - pLow || 1;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((pos(v) - pLow) / span) * 100))}%`;

  const nullPct = pct(pooled.noEffectLine);

  const Row = ({ label, sub, value, ciLow, ciHigh, weight, pooledRow }: {
    label: string; sub?: string; value: number; ciLow: number; ciHigh: number; weight?: number; pooledRow?: boolean;
  }) => (
    <div className={`flex items-center gap-2 py-1 ${pooledRow ? "font-semibold" : ""}`}>
      <div className="w-44 shrink-0 truncate text-xs" title={label}>
        {label}{sub && <span className="text-muted"> · {sub}</span>}
      </div>
      <div className="relative h-5 flex-1 rounded bg-surface">
        {/* no-effect line */}
        <div className="absolute top-0 bottom-0 w-px bg-muted/50" style={{ left: nullPct }} />
        {/* CI segment */}
        <div
          className={`absolute top-1/2 h-0.5 -translate-y-1/2 ${pooledRow ? "bg-primary" : "bg-foreground/50"}`}
          style={{ left: pct(ciLow), right: `calc(100% - ${pct(ciHigh)})` }}
        />
        {/* point / diamond */}
        {pooledRow ? (
          <div className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-primary" style={{ left: pct(value) }} />
        ) : (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-foreground/80"
            style={{ left: pct(value), width: `${6 + (weight ?? 5) / 6}px`, height: `${6 + (weight ?? 5) / 6}px` }}
          />
        )}
      </div>
      <div className="w-28 shrink-0 text-right text-[11px] tabular-nums text-muted">
        {value} [{ciLow}, {ciHigh}]
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-semibold">
          {zh ? "合併" : "Pooled"} {pooled.metric} · {zh ? `${pooled.k} 項研究` : `${pooled.k} studies`}
        </span>
        <span className="text-muted">
          I² = {pooled.i2}%
          <span className={`ml-2 ${pooled.significant ? "text-emerald-700 font-medium" : "text-muted"}`}>
            {pooled.significant ? (zh ? "顯著" : "significant") : (zh ? "未達顯著" : "n.s.")}
          </span>
        </span>
      </div>
      {studies.map((s) => (
        <Row key={s.id} label={s.title} sub={s.year ? String(s.year) : undefined} value={s.value} ciLow={s.ciLow} ciHigh={s.ciHigh} weight={s.weightPct} />
      ))}
      <div className="my-1 border-t border-border" />
      <Row label={zh ? "合併估計（隨機效應）" : "Pooled (random-effects)"} value={pooled.pooledValue} ciLow={pooled.ciLow} ciHigh={pooled.ciHigh} pooledRow />
      <p className="mt-1 text-[10px] text-muted">
        {zh
          ? `無效線 = ${pooled.noEffectLine}；DerSimonian–Laird 隨機效應模型。`
          : `No-effect line = ${pooled.noEffectLine}; DerSimonian–Laird random-effects.`}
      </p>
    </div>
  );
}
