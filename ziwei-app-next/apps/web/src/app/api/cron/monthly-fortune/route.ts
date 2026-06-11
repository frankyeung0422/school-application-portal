import { NextResponse } from 'next/server';
import { runPeriodSweep } from '@/lib/cron/period-sweep';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Monthly personalized fortune sweep. Scheduled daily but SELF-GUARDED: the
 * Fortune cache is keyed by the 節氣-month ganzhi, so this only generates +
 * emails once per 節氣 month (later days find emailSent=true and skip). This
 * avoids encoding drifting 節氣 dates in cron syntax.
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new NextResponse('unauthorized', { status: 401 });
    }
  }
  const result = await runPeriodSweep('month');
  return NextResponse.json({ ok: true, ...result });
}
