import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Archetype share card — 1080×1350 portrait, designed for IG Story / 小紅書 /
 * WhatsApp status. Brushed-gold on deep-midnight gradient with a clean
 * label + tagline + 3-trait trio.
 *
 * URL: /api/og/archetype?h={chartHash}&n={label}&t={tagline}&a={t1}|{t2}|{t3}
 *
 * All content arrives as query params so this route doesn't need a DB lookup
 * (keeps it edge-runnable and cacheable by hash). The chart hash is only used
 * as a cache key — the URL is otherwise stateless.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const label = (sp.get('n') ?? '紫微命格').slice(0, 8);
  const tagline = (sp.get('t') ?? '命定如此, 知命隨緣').slice(0, 24);
  const traitsStr = sp.get('a') ?? '深藏|善借勢|後發者';
  const traits = traitsStr.split('|').slice(0, 3).map((s) => s.slice(0, 6));
  while (traits.length < 3) traits.push('');

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1350,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '80px 60px',
          background: 'linear-gradient(160deg, #050717 0%, #0E1330 45%, #1A1E36 100%)',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Top brand */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 24, color: '#C9A14A', letterSpacing: '0.4em' }}>紫 微 閣</div>
          <div style={{ width: 80, height: 1, background: 'linear-gradient(to right, transparent, #C9A14A, transparent)' }} />
          <div style={{ fontSize: 14, color: '#9F8550', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Purple Star Archetype
          </div>
        </div>

        {/* Center — label + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
          <div style={{ fontSize: 22, color: '#9F8550', letterSpacing: '0.4em' }}>命格</div>
          <div
            style={{
              fontSize: 156,
              color: '#E8C36A',
              fontWeight: 700,
              lineHeight: 1.05,
              textShadow: '0 0 40px rgba(232,195,106,0.4)',
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#F5EFE0',
              opacity: 0.92,
              letterSpacing: '0.06em',
              textAlign: 'center',
              maxWidth: 880,
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Traits trio */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <div style={{ width: 200, height: 1, background: 'linear-gradient(to right, transparent, #C9A14A, transparent)' }} />
          <div style={{ display: 'flex', gap: 48 }}>
            {traits.map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 32, color: '#E8C36A', letterSpacing: '0.08em' }}>{t}</div>
                <div style={{ width: 4, height: 4, background: '#9F8550', borderRadius: 4 }} />
              </div>
            ))}
          </div>

          {/* Bottom callout */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 32 }}>
            <div style={{ fontSize: 16, color: '#F5EFE0', opacity: 0.7 }}>免費生成您的紫微命盤</div>
            <div style={{ fontSize: 14, color: '#C9A14A', letterSpacing: '0.2em' }}>AIFORTUNETELLING.ORG</div>
          </div>
        </div>

        {/* Corner accents — thin gold rules */}
        <div style={{ position: 'absolute', top: 70, left: 60, width: 40, height: 1, background: '#C9A14A', opacity: 0.6 }} />
        <div style={{ position: 'absolute', top: 70, right: 60, width: 40, height: 1, background: '#C9A14A', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: 70, left: 60, width: 40, height: 1, background: '#C9A14A', opacity: 0.6 }} />
        <div style={{ position: 'absolute', bottom: 70, right: 60, width: 40, height: 1, background: '#C9A14A', opacity: 0.6 }} />
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        // Cache for 1 day by hash — content is fully derived from query params
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
