import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { ReadingSections, InkDivider, PalaceCell } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { ziweiYearFlow } from '@ziwei/engine';
import type { Chart, PlacedStar } from '@ziwei/engine';

export const metadata = { title: '流年詳解' };

export default async function ZiweiYearPage({
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

  const raw = record.chartJson as unknown as { kind?: string } & Chart;
  if (raw.kind === 'bazi') redirect(`/bazi/${id}/year/${targetYear}`);
  const chart = raw;
  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };
  const flow = ziweiYearFlow(chart, targetYear, birth.year);

  const currentYear = new Date().getFullYear();
  const yearRange = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">
            紫微斗數 · {targetYear} 年流年詳解
          </p>
          <h1 className="font-display text-4xl font-semibold mb-2">
            {record.label || `${birth.year}年命主`} · {targetYear}年運勢
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            流年干支 <span className="text-[var(--color-gold-bright)]">{flow.ganzhi}</span>
            ・地支落入 <span className="text-[var(--color-gold-bright)]">{flow.hostPalace?.name ?? '未知'}</span> 宮
            ・命主時年 <span className="text-[var(--color-gold-bright)]">{flow.age}</span> 歲
          </p>
        </header>

        {/* Year selector */}
        <Card variant="ink" padding="md" className="mb-6">
          <CardContent>
            <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-3">切換年份</p>
            <div className="flex flex-wrap gap-2">
              {yearRange.map((y) => (
                <Link
                  key={y}
                  href={`/chart/${id}/year/${y}`}
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

        {/* Host palace highlight */}
        {flow.hostPalace && (
          <div className="mb-8">
            <InkDivider>流年落宮</InkDivider>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md">
              <PalaceCell
                name={flow.hostPalace.name}
                branch={flow.hostPalace.branch}
                ganzhi={flow.hostPalace.ganzhi}
                stars={flow.hostPalace.stars as PlacedStar[]}
                highlight="mingong"
              />
            </div>
          </div>
        )}

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
            <Link href={`/chart/${id}`}>← 返回命盤總覽</Link>
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
  chart: Chart;
  userId: string;
  flow: ReturnType<typeof ziweiYearFlow>;
  birth: { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };
}) {
  const palacesSummary = chart.palaces.map((p) => {
    const stars = p.stars.length === 0
      ? '空宮'
      : p.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、');
    return `${p.name} (${p.branch}, ${p.ganzhi}): ${stars}`;
  }).join('\n');

  const hostStars = flow.hostPalace
    ? (flow.hostPalace.stars.length === 0
        ? '空宮'
        : flow.hostPalace.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、'))
    : '無';

  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;

  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'ziwei-year-detail',
      userId,
      vars: {
        birthSummary,
        age: flow.age,
        gender: birth.gender === 'M' ? '男' : '女',
        bureau: chart.bureau.bureau,
        yearGanzhi: chart.yearGanzhi,
        targetYear: flow.year,
        targetGanzhi: flow.ganzhi,
        hostPalaceName: flow.hostPalace?.name ?? '未知',
        hostPalaceGanzhi: flow.hostPalace?.ganzhi ?? '未知',
        hostPalaceStars: hostStars,
        palaces: palacesSummary,
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[ziwei-year] generate failed:', (err as Error).message);
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
