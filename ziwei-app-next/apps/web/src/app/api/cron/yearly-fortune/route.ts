import { NextResponse } from 'next/server';
import { runPeriodSweep } from '@/lib/cron/period-sweep';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Yearly personalized fortune sweep. Scheduled daily but SELF-GUARDED by the
 * Fortune cache keyed on the 立春-year ganzhi — fires once per new 流年 (around
 * 立春, early Feb) and skips the rest of the year.
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('unauthorized', { status: 401 });
    }
  }
  const result = await runPeriodSweep('year');
  return NextResponse.json({ ok: true, ...result });
}
