import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { QizhengChartView } from '@/components/qizheng/qizheng-chart-view';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { buildQizhengReadingVars, ensureTeaser } from '@/lib/chart/qizheng-vars';
import type { QizhengChart } from '@ziwei/engine';

export const metadata = { title: '果老星宗星盤詳解' };

export default async function QizhengChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const record = await prisma.chart.findUnique({ where: { id } });
  if (!record) notFound();
  if (record.userId !== session.sub) redirect('/dashboard');

  const raw = record.chartJson as unknown as { kind?: string } & QizhengChart;
  if (raw.kind !== 'qizheng') {
    // Not a 果老 chart — route to the matching system.
    redirect(raw.kind === 'bazi' ? `/bazi/${id}` : `/chart/${id}`);
  }
  const chart = raw;
  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number; calendar: 'solar' | 'lunar' };
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">果老星宗 · 七政四餘</p>
          <h1 className="font-display text-4xl font-semibold mb-2">{record.label || birthSummary}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            命度 <span className="text-[var(--color-gold-bright)]">{chart.ascendant.sign}</span>
            ・命主星 <span className="text-[var(--color-gold-bright)]">{chart.mingLord}</span>
            ・身主星 <span className="text-[var(--color-fg-subtle)]">{chart.shenLord}</span>
          </p>
        </header>

        <QizhengChartView chart={chart} />

        <InkDivider>真星象獨門解讀</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl" className="mb-8">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為您推步七政四餘、撰寫星命解讀中 ...</p>
            </CardContent>
          </Card>
        }>
          <Reading chart={chart} userId={session.sub} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Reading({ chart, userId }: { chart: QizhengChart; userId: string }) {
  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({ promptId: 'qizheng-reading', userId, vars: buildQizhengReadingVars(chart) });
    text = ensureTeaser(res.text);
  } catch (err) {
    degraded = (err as Error).message;
    text = '解讀產生失敗 — 請稍後再試。';
  }
  return (
    <div className="mb-8">
      <ReadingSections raw={text} />
      {degraded && <p className="mt-4 text-xs text-[var(--color-danger)]/70">服務暫時不可用: {degraded}</p>}
    </div>
  );
}
