import { NextResponse } from 'next/server';
import { z } from 'zod';
import { synthesize } from '@/lib/voice/elevenlabs';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({ text: z.string().min(1).max(2000) });

/**
 * On-demand voice synthesis. Premium-only.
 * Returns audio/mpeg bytes directly.
 *
 * Caching: cacheKey is returned in the X-Cache-Key header. Cloudflare R2
 * upload happens in a follow-up commit (storage adapter not yet wired).
 */
export async function POST(req: Request) {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const sub = await prisma.subscription.findUnique({ where: { userId: session.sub } });
  if (!sub || !['TRIALING', 'ACTIVE'].includes(sub.status)) {
    return NextResponse.json({ error: 'premium-only' }, { status: 403 });
  }

  try {
    const result = await synthesize({ text: parsed.data.text });
    return new Response(new Uint8Array(result.audio), {
      headers: {
        'Content-Type': result.mimeType,
        'X-Cache-Key': result.cacheKey,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
