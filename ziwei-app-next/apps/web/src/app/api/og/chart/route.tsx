import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { freshChartFromCache } from '@/lib/chart/fresh';

export const runtime = 'edge';

const PALACE_GRID = [
  [3, 4, 5, 6],
  [2, null, null, 7],
  [1, null, null, 8],
  [0, 11, 10, 9],
];

/**
 * Render a chart as a 1200×1200 PNG for:
 *   (a) multimodal AI input ("visual reading" premium feature)
 *   (b) high-quality social share cards
 *
 * URL: /api/og/chart?h={chartHash}
 */
export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get('h');
  if (!hash) return new Response('h param required', { status: 400 });

  // Recompute stale rows in-memory (no persist on edge) so share cards never
  // render pre-0.5 star placements.
  const chart = await freshChartFromCache(hash, { persist: false });
  if (!chart) return new Response('not found', { status: 404 });

  const palacesByIndex = chart.palaces;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200, height: 1200, display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #070A1F 0%, #0E1330 50%, #1A1E36 100%)',
          padding: 40, fontFamily: 'serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 28, color: '#E8C36A', letterSpacing: '0.3em' }}>紫微閣</span>
          <span style={{ fontSize: 16, color: '#C9A14A', opacity: 0.7 }}>
            {chart.yearGanzhi} · {chart.bureau.bureau}
          </span>
        </div>

        {/* 4×4 chart grid (12 outer + 4 center cells) */}
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 4 }}>
          {PALACE_GRID.map((row, rIdx) => (
            <div key={rIdx} style={{ display: 'flex', flex: 1, gap: 4 }}>
              {row.map((paIdx, cIdx) => {
                if (paIdx === null) {
                  // Center 2×2 — solar/lunar info
                  if (rIdx === 1 && cIdx === 1) {
                    return (
                      <div key={cIdx} style={{
                        flex: 2, display: 'flex', flexDirection: 'column',
                        justifyContent: 'center', alignItems: 'center',
                        gridColumn: 'span 2', gridRow: 'span 2',
                        background: 'rgba(201,161,74,0.05)', borderRadius: 4,
                      }}>
                        <span style={{ fontSize: 32, color: '#E8C36A', fontWeight: 700 }}>命盤</span>
                        <span style={{ fontSize: 16, color: '#C5C0B0', marginTop: 8 }}>
                          {chart.birthInfo.year}年{chart.birthInfo.month}月{chart.birthInfo.day}日
                        </span>
                      </div>
                    );
                  }
                  return <div key={cIdx} style={{ flex: 1 }} />;
                }
                const p = palacesByIndex[paIdx];
                const highlight = p.isMingong;
                return (
                  <div key={cIdx} style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    padding: 12, borderRadius: 4,
                    background: highlight ? 'rgba(201,161,74,0.15)' : 'rgba(26,30,54,0.6)',
                    border: highlight ? '1px solid #C9A14A' : '1px solid rgba(201,161,74,0.15)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, color: '#E8C36A', fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: '#9F8550' }}>{p.branch}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9F8550', marginBottom: 4 }}>{p.ganzhi}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.stars.map((s) => (
                        <span key={s.name} style={{ fontSize: 13, color: '#F5EFE0', fontWeight: 500 }}>
                          {s.name}{s.transformation ? `化${s.transformation}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, fontSize: 12, color: '#C9A14A', opacity: 0.6 }}>
          AIFORTUNETELLING.ORG · 紫微閣命理引擎
        </div>
      </div>
    ),
    { width: 1200, height: 1200 },
  );
}
