import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * Dynamic OG card generator. URL examples:
 *   /api/og/home
 *   /api/og/celebrity?name=周潤發&mingong=紫微天府
 *   /api/og/zodiac?sign=龍&year=2026
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  const { type } = await ctx.params;
  const { searchParams } = req.nextUrl;

  const title = searchParams.get('name') ?? searchParams.get('title') ?? '紫微閣';
  const explicitSubtitle = searchParams.get('subtitle');
  let subtitle = '命理引擎';
  if (explicitSubtitle) {
    subtitle = explicitSubtitle;
  } else if (type === 'celebrity') {
    subtitle = `命宮 · ${searchParams.get('mingong') ?? '紫微'}`;
  } else if (type === 'zodiac') {
    subtitle = `${searchParams.get('year') ?? ''} 流年運勢`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #070A1F 0%, #0E1330 50%, #1A1E36 100%)',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Gold corner accents */}
        <div style={{ position: 'absolute', top: 40, left: 40, fontSize: 24, color: '#C9A14A', letterSpacing: '0.3em' }}>
          紫微閣
        </div>
        <div style={{ position: 'absolute', top: 40, right: 40, fontSize: 14, color: '#C9A14A', opacity: 0.5, letterSpacing: '0.3em' }}>
          AIFORTUNETELLING.ORG
        </div>

        <div style={{ display: 'flex', fontSize: 88, color: '#E8C36A', fontWeight: 700, marginBottom: 20 }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#F5EFE0', opacity: 0.8, letterSpacing: '0.1em' }}>
          {subtitle}
        </div>

        {/* Bottom gold divider */}
        <div style={{
          position: 'absolute', bottom: 50, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(to right, transparent, #C9A14A, transparent)',
        }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
