import { Card, CardContent } from '@/components/ui';
import type { QizhengChart, Dignity } from '@ziwei/engine';

function dignityClass(d: Dignity): string {
  if (d === '廟' || d === '旺') return 'text-[var(--color-gold-bright)]';
  if (d === '落' || d === '陷') return 'text-[var(--color-danger)]';
  return 'text-[var(--color-fg-muted)]';
}

/** Presentational 果老星宗 chart — ascendant header, 七政四餘 placements, 十二宮 grid. */
export function QizhengChartView({ chart }: { chart: QizhengChart }) {
  return (
    <div className="mb-10">
      {/* 命度 header */}
      <Card variant="gold-rim" padding="lg" className="mb-6">
        <CardContent>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">命度 · 上升</p>
          <p className="font-display text-2xl text-[var(--color-gold-bright)] mb-2">
            {chart.ascendant.sign}座 · {chart.ascendant.mansion}宿 {chart.ascendant.degIntoMansion.toFixed(1)}度
          </p>
          <p className="text-sm text-[var(--color-fg-muted)]">
            命主星 <span className="text-[var(--color-gold-bright)]">{chart.mingLord}</span>
            ・身主星 <span className="text-[var(--color-gold-bright)]">{chart.shenLord}</span>
          </p>
        </CardContent>
      </Card>

      {/* 七政四餘 placements */}
      <Card variant="ink" padding="lg" className="mb-6">
        <CardContent>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">七政四餘 落點</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[var(--color-fg-subtle)] text-xs">
                  <th className="text-left py-1 pr-3">曜</th>
                  <th className="text-left py-1 pr-3">星座</th>
                  <th className="text-left py-1 pr-3">宿度</th>
                  <th className="text-left py-1 pr-3">廟旺落陷</th>
                  <th className="text-left py-1 pr-3">宮位</th>
                </tr>
              </thead>
              <tbody>
                {chart.bodies.map((b) => (
                  <tr key={b.name} className="border-t border-[var(--color-border)]/30">
                    <td className="py-1.5 pr-3 font-display text-[var(--color-gold-bright)]">
                      {b.name}{b.retrograde ? <span className="text-[var(--color-danger)] text-xs"> ℞</span> : null}
                    </td>
                    <td className="py-1.5 pr-3">{b.sign}</td>
                    <td className="py-1.5 pr-3 text-[var(--color-fg-muted)]">{b.mansion}{b.degIntoMansion.toFixed(1)}°</td>
                    <td className={`py-1.5 pr-3 ${dignityClass(b.dignity)}`}>{b.dignity}</td>
                    <td className="py-1.5 pr-3 text-[var(--color-fg-muted)]">{b.houseName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 十二宮 grid */}
      <Card variant="ink" padding="lg">
        <CardContent>
          <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">十二宮</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {chart.houses.map((h) => (
              <div
                key={h.index}
                className={`rounded-[var(--radius)] p-3 ${h.index === 1 ? 'bg-gold-leaf shadow-[var(--shadow-rim-gold)]' : 'bg-[var(--color-bg-deep)]'}`}
              >
                <p className="text-xs text-[var(--color-fg-subtle)] mb-1">
                  {h.name} · {h.sign}
                </p>
                <p className="font-display text-sm text-[var(--color-gold-bright)] min-h-[1.25rem]">
                  {h.bodies.length ? h.bodies.join(' ') : '—'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
