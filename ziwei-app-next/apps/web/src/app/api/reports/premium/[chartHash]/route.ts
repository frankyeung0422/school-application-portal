import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Polled by the client after the streaming narrative finishes.
 * Returns the polished version once pass-3 has persisted it.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ chartHash: string }> }) {
  const session = await requireSession();
  const { chartHash } = await ctx.params;

  const event = await prisma.event.findFirst({
    where: {
      userId: session.sub,
      eventName: 'premium_report_generated',
      properties: { path: ['chartHash'], equals: chartHash },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!event) return NextResponse.json({ status: 'pending' });
  const props = event.properties as { polished?: string; polishedLength?: number } | null;
  if (!props?.polished) return NextResponse.json({ status: 'failed' });

  return NextResponse.json({ status: 'ready', polished: props.polished });
}
