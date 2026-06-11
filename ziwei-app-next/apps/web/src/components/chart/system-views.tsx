import { Card, CardContent } from '@/components/ui';
import { PalaceCell } from './palace-cell';
import { InkDivider } from './ink-divider';
import type { Chart, BaziChart, PlacedStar } from '@ziwei/engine';

/** 紫微 — the 12-palace 4-column grid, shared by /chart, /reading/result, /reading/[id]. */
export function ZiweiPalaceGrid({ chart }: { chart: Chart }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {chart.palaces.map((p) => (
        <PalaceCell
          key={p.name}
          name={p.name}
          branch={p.branch}
          ganzhi={p.ganzhi}
          stars={p.stars as PlacedStar[]}
          highlight={p.isMingong ? 'mingong' : 'none'}
        />
      ))}
    </div>
  );
}

/** 八字 — four pillars + 五行 bars + 大運, shared by /bazi and the unified views. */
export function BaziPillars({ chart }: { chart: BaziChart }) {
  const labels = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' } as const;
  const total = Object.values(chart.fiveElements).reduce((a, b) => a + b, 0) || 1;
  return (
    <div>
      <div className="grid grid-cols-4 gap-3 mb-8">
        {(['year', 'month', 'day', 'hour'] as const).map((key) => {
          const p = chart.pillars[key];
          const isDayMaster = key === 'day';
          return (
            <Card key={key} variant={isDayMaster ? 'gold-rim' : 'ink'} padding="md">
              <CardContent>
                <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">{labels[key]}</p>
                <p className="font-display text-3xl text-[var(--color-gold-bright)] mb-1">{p.stem}</p>
                <p className="font-display text-3xl text-[var(--color-gold-bright)] mb-3">{p.branch}</p>
                <p className="text-xs text-[var(--color-fg-muted)] mb-1">納音 · {p.nayin}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  十神 · {p.stemTenGod}
                  {p.branchTenGods.length > 0 && ` / ${p.branchTenGods.join('、')}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card variant="ink" padding="lg" className="mb-8">
        <CardContent>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">五行分佈</p>
          <div className="flex items-end gap-3 h-24">
            {(['木', '火', '土', '金', '水'] as const).map((el) => {
              const n = chart.fiveElements[el];
              const pct = (n / total) * 100;
              return (
                <div key={el} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs text-[var(--color-fg-muted)]">{n}</div>
                  <div className="w-full bg-[var(--color-bg-deep)] rounded-sm overflow-hidden" style={{ height: '100%' }}>
                    <div className="bg-[var(--color-gold)]" style={{ height: `${pct}%`, width: '100%', transition: 'height .3s' }} />
                  </div>
                  <div className="font-display text-lg text-[var(--color-fg)]">{el}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {chart.luckPillars.length > 0 && (
        <>
          <InkDivider>大運</InkDivider>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {chart.luckPillars.map((lp, i) => (
              <Card key={i} variant="ink" padding="sm">
                <CardContent>
                  <p className="text-[10px] text-[var(--color-fg-subtle)] mb-1">{lp.startAge}歲起</p>
                  <p className="font-display text-xl text-[var(--color-gold-bright)]">{lp.ganzhi}</p>
                  <p className="text-[10px] text-[var(--color-fg-muted)] mt-1">{lp.startYear}-{lp.endYear}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
