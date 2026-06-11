import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { solarToLunar } from '@ziwei/engine';
import { generate } from '@/lib/ai/client';
import type { Chart } from '@ziwei/engine';

export const metadata = { title: '今日運勢' };
// Daily reading is date-specific — never cache across the day boundary.
export const dynamic = 'force-dynamic';

export default async function DailyPage() {
  const session = await requireSession();

  // Daily reading is ziwei-oriented (uses 命宮主星 + today's ganzhi). Prefer the
  // most-recent ZIWEI chart; if the user only has bazi charts, treat as "no
  // chart yet" so we don't crash on chart.palaces.
  const candidates = await prisma.chart.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });
  // Must be a genuine 紫微 chart (no `kind`): bazi has no palaces, and 果老
  // (kind:'qizheng') also lacks palaces/bureau — selecting either would crash
  // the 命宮-based daily reading.
  const latestChart = candidates.find((c) => {
    const cj = c.chartJson as { kind?: string };
    return cj.kind == null;
  }) ?? null;

  const today = new Date();
  const dateStr = today.toLocaleDateString('zh-Hant-TW', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  if (!latestChart) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
          <header className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">每日運勢</p>
            <h1 className="font-display text-4xl font-semibold mb-2">{dateStr}</h1>
          </header>
          <Card variant="gold-rim" padding="lg">
            <CardContent>
              <p className="text-[var(--color-fg-muted)] mb-6 leading-relaxed">
                個人化每日運勢需要你的命盤。先排算一份, 我們便會根據你的命宮主星與今日流年, 為你撰寫專屬解析。
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="gold">
                  <Link href="/sample">排算紫微斗數命盤</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/bazi/sample">排算八字命盤</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const chart = latestChart.chartJson as unknown as Chart;
  const mingong = chart.palaces.find((p) => p.isMingong);

  // Today's lunar/ganzhi context — neutral solar position to derive the
  // current date's ganzhi (not the user's birth chart's).
  const todayCtx = solarToLunar(
    today.getFullYear(), today.getMonth() + 1, today.getDate(), 12, 0,
  );

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">每日運勢</p>
          <h1 className="font-display text-4xl font-semibold mb-2">{dateStr}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            農曆 {todayCtx.lunar.year}年{todayCtx.lunar.isLeap ? '閏' : ''}{todayCtx.lunar.month}月{todayCtx.lunar.day}日
            ・干支 <span className="text-[var(--color-gold-bright)]">{todayCtx.ganzhi.dayGanzhi}</span>
          </p>
        </header>

        <Card variant="ink" padding="md" className="mb-6">
          <CardContent>
            <p className="text-xs text-[var(--color-fg-subtle)]">
              基於你的命盤 ·{' '}
              <span className="text-[var(--color-gold-bright)]">{latestChart.label || '個人命盤'}</span>
              {mingong && (
                <> ・命宮在 {mingong.branch}({mingong.ganzhi}) · {mingong.stars.length === 0 ? '空宮' : mingong.stars.map((s) => s.name).join('、')}</>
              )}
            </p>
          </CardContent>
        </Card>

        <Suspense fallback={
          <Card variant="paper" padding="xl">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為你撰寫今日運勢中, 請稍候 ...</p>
            </CardContent>
          </Card>
        }>
          <ReadingPanel chart={chart} userId={session.sub} todayCtx={todayCtx} dateStr={dateStr} />
        </Suspense>

        <InkDivider variant="subtle" />

        <div className="text-center mt-8">
          <Button asChild size="md" variant="ghost">
            <Link href="/dashboard">← 返回我的帳戶</Link>
          </Button>
        </div>
      </main>
    </>
  );
}

async function ReadingPanel({
  chart, userId, todayCtx, dateStr,
}: {
  chart: Chart;
  userId: string;
  todayCtx: ReturnType<typeof solarToLunar>;
  dateStr: string;
}) {
  const mingong = chart.palaces.find((p) => p.isMingong);
  const mingongStars = mingong?.stars.length
    ? mingong.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、')
    : '空宮';

  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'personal-daily',
      userId,
      vars: {
        date: dateStr,
        lunarDate: `${todayCtx.lunar.year}年${todayCtx.lunar.isLeap ? '閏' : ''}${todayCtx.lunar.month}月${todayCtx.lunar.day}日`,
        ganzhi: todayCtx.ganzhi.dayGanzhi,
        mingongBranch: mingong?.branch ?? '未知',
        mingongGanzhi: mingong?.ganzhi ?? '未知',
        mingongStars,
        bureau: chart.bureau.bureau,
        yearGanzhi: chart.yearGanzhi,
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[daily] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '今日運勢產生失敗 — 請稍後再試, 或檢查管理員是否已配置 AI 服務。';
  }

  return (
    <>
      <ReadingSections raw={text} />
      {degraded && (
        <p className="mt-4 text-xs text-[var(--color-danger)]/70">服務暫時不可用: {degraded}</p>
      )}
    </>
  );
}
