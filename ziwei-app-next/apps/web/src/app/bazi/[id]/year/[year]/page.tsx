import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { ReadingSections, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { baziMangpaiContext } from '@/lib/chart/context';
import { baziYearFlow } from '@ziwei/engine';
import type { BaziChart } from '@ziwei/engine';

export const metadata = { title: '八字流年詳解' };

export default async function BaziYearPage({
  params,
}: {
  params: Promise<{ id: string; year: string }>;
}) {
  const { id, year: yearStr } = await params;
  const targetYear = Number(yearStr);
  if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 2100) notFound();

  const session = await requireSession();
  const record = await prisma.chart.findUnique({ where: { id } });
  if (!record) notFound();
  if (record.userId !== session.sub) redirect('/dashboard');

  const raw = record.chartJson as unknown as { kind?: string } & BaziChart;
  if (raw.kind !== 'bazi') redirect(`/chart/${id}/year/${targetYear}`);
  const chart = raw;
  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };
  const flow = baziYearFlow(birth.year, chart.dayMaster, chart.luckPillars, targetYear);

  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">
            八字 · {targetYear} 年流年詳解
          </p>
          <h1 className="font-display text-4xl font-semibold mb-2">
            {record.label || `${birth.year}年命主`} · {targetYear}年運勢
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            流年干支 <span className="text-[var(--color-gold-bright)]">{flow.ganzhi}</span>
            ・流年十神 <span className="text-[var(--color-gold-bright)]">{flow.yearTenGod}</span>
            ・命主時年 <span className="text-[var(--color-gold-bright)]">{flow.age}</span> 歲
          </p>
          {flow.activeLuckPillar && (
            <p className="text-sm text-[var(--color-fg-muted)] mt-1">
              所行大運 <span className="text-[var(--color-gold-bright)]">{flow.activeLuckPillar.ganzhi}</span>
              ({flow.activeLuckPillar.startAge} 歲起,{flow.activeLuckPillar.startYear}-{flow.activeLuckPillar.endYear})
            </p>
          )}
        </header>

        {/* Year selector */}
        <Card variant="ink" padding="md" className="mb-8">
          <CardContent>
            <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-3">切換年份</p>
            <div className="flex flex-wrap gap-2">
              {yearRange.map((y) => (
                <Link
                  key={y}
                  href={`/bazi/${id}/year/${y}`}
                  className={`px-3 py-1.5 rounded text-sm transition-colors ${
                    y === targetYear
                      ? 'bg-[var(--color-gold)] text-[var(--color-bg-deep)]'
                      : 'bg-[var(--color-bg-deep)] text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)]'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <InkDivider>{targetYear} 年深度推演</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為您推演 {targetYear} 年命運中, 約需 30-50 秒 ...</p>
            </CardContent>
          </Card>
        }>
          <YearReading chart={chart} userId={session.sub} flow={flow} birth={birth} />
        </Suspense>

        <div className="text-center mt-12 flex flex-wrap gap-3 justify-center">
          <Button asChild size="md" variant="ghost">
            <Link href={`/bazi/${id}`}>← 返回八字總覽</Link>
          </Button>
          <Button asChild size="md" variant="ghost">
            <Link href="/dashboard">我的帳戶</Link>
          </Button>
        </div>
      </main>
    </>
  );
}

async function YearReading({
  chart, userId, flow, birth,
}: {
  chart: BaziChart;
  userId: string;
  flow: ReturnType<typeof baziYearFlow>;
  birth: { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };
}) {
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;
  const fiveElementsStr = ['木','火','土','金','水'].map((e) => `${e}${chart.fiveElements[e as keyof typeof chart.fiveElements]}`).join(' ');
  const activeLuckPillarStr = flow.activeLuckPillar
    ? `${flow.activeLuckPillar.ganzhi} (${flow.activeLuckPillar.startAge}歲起,${flow.activeLuckPillar.startYear}-${flow.activeLuckPillar.endYear})`
    : '(超出計算範圍)';

  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'bazi-year-detail',
      userId,
      vars: {
        birthSummary,
        age: flow.age,
        gender: birth.gender === 'M' ? '男' : '女',
        yearGanzhi: chart.pillars.year.ganzhi,
        monthGanzhi: chart.pillars.month.ganzhi,
        dayGanzhi: chart.pillars.day.ganzhi,
        hourGanzhi: chart.pillars.hour.ganzhi,
        dayMaster: chart.dayMaster,
        dayMasterElement: chart.dayMasterElement,
        fiveElements: fiveElementsStr,
        dominantElement: chart.dominantElement,
        weakestElement: chart.weakestElement,
        targetYear: flow.year,
        targetGanzhi: flow.ganzhi,
        yearTenGod: flow.yearTenGod,
        activeLuckPillarStr,
        baziMangpai: baziMangpaiContext(chart),
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[bazi-year] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '流年深度推演產生失敗 — 請稍後再試。';
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
