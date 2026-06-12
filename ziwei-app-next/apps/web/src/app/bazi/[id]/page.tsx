import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateReading } from '@/lib/chart/reading-cache';
import { baziMangpaiContext } from '@/lib/chart/context';
import { BAZI_ENGINE_VERSION, type BaziChart } from '@ziwei/engine';

export const metadata = { title: '八字命盤詳解' };

export default async function BaziChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const record = await prisma.chart.findUnique({ where: { id } });
  if (!record) notFound();
  if (record.userId !== session.sub) redirect('/dashboard');

  const raw = record.chartJson as unknown as { kind?: string } & BaziChart;
  if (raw.kind !== 'bazi') {
    // Not a bazi chart — likely a ziwei one. Send the user there.
    redirect(`/chart/${id}`);
  }
  const chart = raw;
  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">八字 · 命盤</p>
          <h1 className="font-display text-4xl font-semibold mb-2">{record.label || birthSummary}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            日主 <span className="text-[var(--color-gold-bright)]">{chart.dayMaster}</span> ({chart.dayMasterElement})
            ・最旺 <span className="text-[var(--color-gold-bright)]">{chart.dominantElement}</span>
            ・最弱 <span className="text-[var(--color-fg-subtle)]">{chart.weakestElement}</span>
          </p>
        </header>

        {/* 4 pillars */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {(['year', 'month', 'day', 'hour'] as const).map((key) => {
            const labels = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' } as const;
            const p = chart.pillars[key];
            const isDayMaster = key === 'day';
            return (
              <Card key={key} variant={isDayMaster ? 'gold-rim' : 'ink'} padding="md">
                <CardContent>
                  <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">{labels[key]}</p>
                  <p className="font-display text-3xl text-[var(--color-gold-bright)] mb-1">{p.stem}</p>
                  <p className="font-display text-3xl text-[var(--color-gold-bright)] mb-3">{p.branch}</p>
                  <p className="text-xs text-[var(--color-fg-muted)] mb-1">納音 · {p.nayin}</p>
                  <p className="text-xs text-[var(--color-fg-muted)]">
                    十神 · {p.stemTenGod}
                    {p.branchTenGods.length > 0 && ` / ${p.branchTenGods.join('、')}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 5-element bars */}
        <Card variant="ink" padding="lg" className="mb-10">
          <CardContent>
            <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">五行分佈</p>
            <div className="flex items-end gap-3 h-24">
              {(['木','火','土','金','水'] as const).map((el) => {
                const total = Object.values(chart.fiveElements).reduce((a, b) => a + b, 0) || 1;
                const n = chart.fiveElements[el];
                const pct = (n / total) * 100;
                return (
                  <div key={el} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-[var(--color-fg-muted)]">{n}</div>
                    <div className="w-full bg-[var(--color-bg-deep)] rounded-sm overflow-hidden" style={{ height: '100%' }}>
                      <div className="bg-[var(--color-gold)]" style={{ height: `${pct}%`, width: '100%', transition: 'height .3s' }} />
                    </div>
                    <div className="font-display text-lg text-[var(--color-fg)]">{el}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Luck pillars */}
        {chart.luckPillars.length > 0 && (
          <>
            <InkDivider>大運</InkDivider>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-10">
              {chart.luckPillars.map((lp, i) => (
                <Card key={i} variant="ink" padding="sm">
                  <CardContent>
                    <p className="text-[10px] text-[var(--color-fg-subtle)] mb-1">{lp.startAge}歲起</p>
                    <p className="font-display text-xl text-[var(--color-gold-bright)]">{lp.ganzhi}</p>
                    <p className="text-[10px] text-[var(--color-fg-muted)] mt-1">{lp.startYear}-{lp.endYear}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <InkDivider>深入指定年份</InkDivider>

        <Card variant="ink" padding="md" className="mb-10">
          <CardContent>
            <p className="text-xs text-[var(--color-fg-subtle)] mb-3">點擊任一年份, 即可查看該年的完整流年詳解(流年十神、事業、財運、感情、健康、關鍵月份)。</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => {
                const isThisYear = y === new Date().getFullYear();
                return (
                  <Link
                    key={y}
                    href={`/bazi/${id}/year/${y}`}
                    className={`px-3 py-1.5 rounded text-sm bg-[var(--color-bg-deep)] text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)] hover:bg-[var(--color-gold)]/10 transition-colors ${isThisYear ? 'ring-1 ring-[var(--color-gold)]/60' : ''}`}
                  >
                    {y}
                    {isThisYear && <span className="text-[10px] ml-1 text-[var(--color-gold)]">今年</span>}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <InkDivider>深度解讀</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為您撰寫完整八字解讀中, 約需 30-60 秒 ...</p>
            </CardContent>
          </Card>
        }>
          <FullReading chart={chart} chartId={id} userId={session.sub} birthSummary={birthSummary} />
        </Suspense>

        <div className="text-center mt-12">
          <Button asChild size="md" variant="ghost">
            <Link href="/dashboard">← 返回我的帳戶</Link>
          </Button>
        </div>
      </main>
    </>
  );
}

async function FullReading({
  chart, chartId, userId, birthSummary,
}: {
  chart: BaziChart;
  chartId: string;
  userId: string;
  birthSummary: string;
}) {
  const luckPillarsStr = chart.luckPillars.length === 0
    ? '(無法計算)'
    : chart.luckPillars.map((lp) => `${lp.startAge}歲 ${lp.ganzhi} (${lp.startYear}-${lp.endYear})`).join(';');

  let text: string;
  let degraded: string | null = null;
  try {
    const res = await getOrCreateReading({
      userId,
      cacheKey: `bazi-full-${chartId}@${BAZI_ENGINE_VERSION}`,
      promptId: 'bazi-full',
      vars: {
        birthSummary,
        gender: chart.birthInfo.gender === 'M' ? '男' : '女',
        yearGanzhi: chart.pillars.year.ganzhi,
        yearNayin: chart.pillars.year.nayin,
        yearStemTenGod: chart.pillars.year.stemTenGod,
        yearBranchTenGods: chart.pillars.year.branchTenGods.join('、') || '無',
        monthGanzhi: chart.pillars.month.ganzhi,
        monthNayin: chart.pillars.month.nayin,
        monthStemTenGod: chart.pillars.month.stemTenGod,
        monthBranchTenGods: chart.pillars.month.branchTenGods.join('、') || '無',
        dayGanzhi: chart.pillars.day.ganzhi,
        dayNayin: chart.pillars.day.nayin,
        dayBranchTenGods: chart.pillars.day.branchTenGods.join('、') || '無',
        hourGanzhi: chart.pillars.hour.ganzhi,
        hourNayin: chart.pillars.hour.nayin,
        hourStemTenGod: chart.pillars.hour.stemTenGod,
        hourBranchTenGods: chart.pillars.hour.branchTenGods.join('、') || '無',
        dayMaster: chart.dayMaster,
        dayMasterElement: chart.dayMasterElement,
        fiveElements: ['木','火','土','金','水'].map((e) => `${e}${chart.fiveElements[e as keyof typeof chart.fiveElements]}`).join(' '),
        dominantElement: chart.dominantElement,
        weakestElement: chart.weakestElement,
        luckPillars: luckPillarsStr,
        baziMangpai: baziMangpaiContext(chart),
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[bazi/full] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '深度解讀產生失敗 — 請稍後再試。';
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
