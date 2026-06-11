import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { QizhengChartView } from '@/components/qizheng/qizheng-chart-view';
import { prisma } from '@/lib/db/prisma';
import { computeQizhengChart, type QizhengChart, type BirthInfo } from '@ziwei/engine';
import { generate } from '@/lib/ai/client';
import { getSession } from '@/lib/auth/session';
import { buildQizhengReadingVars, ensureTeaser } from '@/lib/chart/qizheng-vars';
import { saveQizhengChartAction } from '@/lib/chart/qizheng-actions';

export const metadata = { title: '你的七政四餘星盤' };
export const dynamic = 'force-dynamic';

function dbAvailable(): boolean {
  return !(process.env.DATABASE_URL || '').includes('placeholder');
}

interface ResultParams {
  h?: string;
  y?: string; m?: string; d?: string; hr?: string; mi?: string;
  g?: string; c?: string; lat?: string; lon?: string;
  save_error?: string;
}

export default async function QizhengResultPage({
  searchParams,
}: {
  searchParams: Promise<ResultParams>;
}) {
  const sp = await searchParams;
  if (!sp.h && !sp.y) redirect('/qizheng/sample');

  let chart: QizhengChart | null = null;

  if (sp.h && dbAvailable()) {
    try {
      const cached = await prisma.qizhengCache.findUnique({ where: { qizhengHash: sp.h } });
      if (cached) chart = cached.chartJson as unknown as QizhengChart;
    } catch (err) {
      console.warn('[qizheng/result] cache read skipped:', (err as Error).message);
    }
  }

  if (!chart && sp.y) {
    const birth: BirthInfo = {
      year: Number(sp.y),
      month: Number(sp.m ?? 1),
      day: Number(sp.d ?? 1),
      hour: Number(sp.hr ?? 12),
      minute: Number(sp.mi ?? 0),
      gender: sp.g === 'F' ? 'F' : 'M',
      calendar: sp.c === 'lunar' ? 'lunar' : 'solar',
      latitude: sp.lat ? Number(sp.lat) : undefined,
      longitude: sp.lon ? Number(sp.lon) : undefined,
    };
    chart = computeQizhengChart(birth);
  }

  if (!chart) redirect('/qizheng/sample');

  const session = await getSession();
  const birth = chart.birthInfo;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">果老星宗 · 星盤試讀</p>
          <h1 className="font-display text-4xl font-semibold mb-2">你的七政四餘星盤</h1>
          <p className="text-[var(--color-fg-muted)] text-sm">
            命度 <span className="text-[var(--color-gold-bright)]">{chart.ascendant.sign}</span>
            ・命主星 <span className="text-[var(--color-gold-bright)]">{chart.mingLord}</span>
            ・身主星 <span className="text-[var(--color-fg-subtle)]">{chart.shenLord}</span>
          </p>
        </div>

        <QizhengChartView chart={chart} />

        <InkDivider>真星象獨門解讀</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl" className="mb-8">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為您推步七政四餘、撰寫星命解讀中, 約需 15-30 秒 ...</p>
            </CardContent>
          </Card>
        }>
          <FreeReading chart={chart} userId={session?.sub ?? null} />
        </Suspense>

        {session ? (
          <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
            <CardContent>
              <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">儲存這張星盤</h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                儲存後可查看行限流年、七政過宮, 並與你的紫微、八字三盤合參。
              </p>
              {sp.save_error && (
                <p className="text-sm text-[var(--color-danger)] mb-3">儲存失敗, 請稍後再試。</p>
              )}
              <form action={saveQizhengChartAction} className="flex flex-col gap-3 max-w-sm mx-auto">
                <input type="hidden" name="year" value={birth.year} />
                <input type="hidden" name="month" value={birth.month} />
                <input type="hidden" name="day" value={birth.day} />
                <input type="hidden" name="hour" value={birth.hour} />
                <input type="hidden" name="minute" value={birth.minute} />
                <input type="hidden" name="gender" value={birth.gender} />
                <input type="hidden" name="calendar" value={birth.calendar} />
                {birth.latitude !== undefined && <input type="hidden" name="latitude" value={birth.latitude} />}
                {birth.longitude !== undefined && <input type="hidden" name="longitude" value={birth.longitude} />}
                <input
                  type="text"
                  name="label"
                  placeholder="星盤標籤 (選填, 例如「我」、「妻子」)"
                  className="h-11 px-4 rounded-[var(--radius)] bg-[var(--color-bg-deep)] text-[var(--color-fg)] shadow-[var(--shadow-rim-gold)] focus:outline-none focus:shadow-[var(--shadow-rim-strong),var(--shadow-glow-gold)]"
                />
                <Button type="submit" size="lg" variant="gold">儲存到我的帳戶 →</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
            <CardContent>
              <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
                解鎖完整果老星宗 · 7 天免費試用
              </h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                查看行限流年、七政過宮的精準時機, 並與紫微、八字三盤合參找出共識。
              </p>
              <Button asChild size="xl" variant="gold">
                <Link href={`/register?intent=trial${sp.h ? `&qizheng=${sp.h}` : ''}`}>開始 7 天試用 →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function FreeReading({ chart, userId }: { chart: QizhengChart; userId: string | null }) {
  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'qizheng-reading',
      userId,
      vars: buildQizhengReadingVars(chart),
    });
    text = ensureTeaser(res.text);
  } catch (err) {
    console.warn('[qizheng/free] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '解讀產生失敗 — 請稍後再試。';
  }

  return (
    <div className="mb-8">
      <ReadingSections raw={text} />
      {degraded && (
        <p className="mt-4 text-xs text-[var(--color-danger)]/70">服務暫時不可用: {degraded}</p>
      )}
    </div>
  );
}
