import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@/components/ui';
import { ReadingSections, ZiweiPalaceGrid, BaziPillars } from '@/components/chart';
import { QizhengChartView } from '@/components/qizheng/qizheng-chart-view';
import { SiteHeader } from '@/components/layout/site-header';
import { MasterChat } from '@/components/chat/master-chat';
import { VoiceMaster } from '@/components/chat/voice-master';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { generate } from '@/lib/ai/client';
import { deriveArchetype } from '@/lib/chart/archetype';
import { buildUnifiedVars, type SubjectCharts } from '@/lib/chart/context';
import { getMasterChatQuota } from '@/lib/billing/access';
import { loadLatestConversation } from '@/lib/chat/actions';
import { computeAllSystems, ENGINE_VERSION, BAZI_ENGINE_VERSION } from '@ziwei/engine';
import type { Chart, BaziChart, QizhengChart, BirthInfo } from '@ziwei/engine';

export const metadata = { title: '三盤合參' };

interface ClassifiedChart { id: string; chart: Chart | BaziChart | QizhengChart; }

export default async function SubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const session = await requireSession();

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { charts: true },
  });
  if (!subject) notFound();
  if (subject.userId !== session.sub) redirect('/dashboard');

  const charts: SubjectCharts = {};
  const ids: { ziwei?: string; bazi?: string; qizheng?: string } = {};
  for (const c of subject.charts) {
    const cj = c.chartJson as { kind?: string };
    if (cj.kind === 'bazi') { charts.bazi = cj as unknown as BaziChart; ids.bazi = c.id; }
    else if (cj.kind === 'qizheng') { charts.qizheng = cj as unknown as QizhengChart; ids.qizheng = c.id; }
    else { charts.ziwei = cj as unknown as Chart; ids.ziwei = c.id; }
  }

  const birth = subject.birthInfo as unknown as BirthInfo;

  // Engine upgrade on read: saved charts from older engines lack newer layers
  // (minor stars, 大限, 日主強弱). Recompute from birth and persist back so the
  // grid, synthesis and 師傅 chat all see the current engine's output.
  const ziweiStale = charts.ziwei && charts.ziwei.engineVersion !== ENGINE_VERSION;
  const baziStale = charts.bazi && charts.bazi.engineVersion !== BAZI_ENGINE_VERSION;
  if (ziweiStale || baziStale) {
    try {
      const all = computeAllSystems(birth);
      const updates: Promise<unknown>[] = [];
      if (ziweiStale && ids.ziwei) {
        charts.ziwei = all.ziwei.chart;
        updates.push(prisma.chart.update({
          where: { id: ids.ziwei },
          data: { chartJson: all.ziwei.chart as unknown as object, engineVersion: ENGINE_VERSION },
        }));
      }
      if (baziStale && ids.bazi) {
        charts.bazi = all.bazi.chart;
        updates.push(prisma.chart.update({
          where: { id: ids.bazi },
          data: { chartJson: all.bazi.chart as unknown as object, engineVersion: BAZI_ENGINE_VERSION },
        }));
      }
      await Promise.all(updates);
    } catch (err) {
      console.warn('[reading/subject] engine upgrade-on-read skipped:', (err as Error).message);
    }
  }

  const label = subject.label || `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時`;
  const archetype = charts.ziwei ? deriveArchetype(charts.ziwei) : null;

  // Chat is anchored to the 紫微 chart row; because that row carries subjectId,
  // askMaster automatically upgrades to the three-system 師傅.
  const chatChartId = ids.ziwei ?? ids.bazi ?? ids.qizheng ?? null;
  const [quota, latestConv] = await Promise.all([
    getMasterChatQuota(session.sub),
    chatChartId ? loadLatestConversation(chatChartId) : Promise.resolve(null),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">三盤合參 · 紫微 · 八字 · 果老星宗</p>
          <h1 className="font-display text-4xl font-semibold mb-2">{label}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {charts.ziwei && <>五行局 <span className="text-[var(--color-gold-bright)]">{charts.ziwei.bureau.bureau}</span>　</>}
            {charts.bazi && <>日主 <span className="text-[var(--color-gold-bright)]">{charts.bazi.dayMaster}{charts.bazi.dayMasterElement}</span>　</>}
            {charts.qizheng && <>命度 <span className="text-[var(--color-gold-bright)]">{charts.qizheng.ascendant.sign}</span></>}
          </p>
        </header>

        <Tabs defaultValue="synthesis">
          <TabsList>
            <TabsTrigger value="synthesis">三盤合參</TabsTrigger>
            <TabsTrigger value="ziwei">紫微</TabsTrigger>
            <TabsTrigger value="bazi">八字</TabsTrigger>
            <TabsTrigger value="qizheng">果老</TabsTrigger>
            <TabsTrigger value="fortune">流年</TabsTrigger>
            <TabsTrigger value="voice">語音問師傅</TabsTrigger>
            <TabsTrigger value="master">問師傅</TabsTrigger>
          </TabsList>

          <TabsContent value="synthesis">
            <Suspense fallback={
              <Card variant="paper" padding="xl">
                <CardContent>
                  <p className="text-[var(--color-paper-ink)] italic">師傅正同時參照三套命盤, 撰寫合參報告中, 約需 30-60 秒 ...</p>
                </CardContent>
              </Card>
            }>
              <SynthesisPanel charts={charts} userId={session.sub} label={label} birth={birth} />
            </Suspense>
          </TabsContent>

          <TabsContent value="ziwei">
            {charts.ziwei ? (
              <>
                <ZiweiPalaceGrid chart={charts.ziwei} />
                {ids.ziwei && (
                  <div className="text-center mt-6">
                    <Button asChild variant="ghost" size="sm"><Link href={`/chart/${ids.ziwei}`}>紫微深度解讀、流年、命理預警 →</Link></Button>
                  </div>
                )}
              </>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="bazi">
            {charts.bazi ? (
              <>
                <BaziPillars chart={charts.bazi} />
                {ids.bazi && (
                  <div className="text-center mt-6">
                    <Button asChild variant="ghost" size="sm"><Link href={`/bazi/${ids.bazi}`}>八字完整解讀、流年 →</Link></Button>
                  </div>
                )}
              </>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="qizheng">
            {charts.qizheng ? (
              <>
                <QizhengChartView chart={charts.qizheng} />
                {ids.qizheng && (
                  <div className="text-center mt-2">
                    <Button asChild variant="ghost" size="sm"><Link href={`/qizheng/${ids.qizheng}`}>果老星宗真星象解讀 →</Link></Button>
                  </div>
                )}
              </>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="fortune">
            {(ids.ziwei || ids.bazi) ? (
              <>
                {ids.ziwei && <YearGrid id={ids.ziwei} basePath="chart" title="紫微流年" />}
                {ids.bazi && <YearGrid id={ids.bazi} basePath="bazi" title="八字流年" />}
                {ids.qizheng && (
                  <p className="text-xs text-[var(--color-fg-subtle)] text-center mt-2">
                    果老星宗行限流年屬完整版深度功能, 請於「果老」分頁深入解讀。
                  </p>
                )}
              </>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="voice">
            {chatChartId ? (
              <Card variant="paper" padding="lg">
                <CardContent>
                  <div className="flex justify-end mb-2">
                    <Button asChild variant="ghost" size="sm"><Link href={`/master/${chatChartId}`}>進入全螢幕面見師傅 →</Link></Button>
                  </div>
                  <VoiceMaster
                    chartId={chatChartId}
                    initialConversationId={latestConv?.id ?? null}
                    quota={{
                      unlimited: quota.unlimited,
                      used: quota.used,
                      limit: quota.unlimited ? -1 : quota.limit,
                      remaining: quota.unlimited ? -1 : quota.remaining,
                    }}
                  />
                </CardContent>
              </Card>
            ) : <Empty />}
          </TabsContent>

          <TabsContent value="master">
            {chatChartId ? (
              <Card variant="paper" padding="lg">
                <CardContent>
                  <MasterChat
                    chartId={chatChartId}
                    archetypeLabel={archetype ? `${archetype.label} · 三盤合參` : '三盤合參'}
                    quota={{
                      unlimited: quota.unlimited,
                      used: quota.used,
                      limit: quota.unlimited ? -1 : quota.limit,
                      remaining: quota.unlimited ? -1 : quota.remaining,
                    }}
                    initialConversationId={latestConv?.id ?? null}
                    initialMessages={latestConv?.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })) ?? []}
                  />
                </CardContent>
              </Card>
            ) : <Empty />}
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
          <Button asChild size="md" variant="ghost"><Link href="/dashboard">← 返回我的帳戶</Link></Button>
        </div>
      </main>
    </>
  );
}

function Empty() {
  return <Card variant="ink" padding="lg"><CardContent><p className="text-[var(--color-fg-muted)] text-sm">此盤未排算。</p></CardContent></Card>;
}

/** Year picker linking to a system's full 流年 detail page (matches the grid on /chart/[id]). */
function YearGrid({ id, basePath, title }: { id: string; basePath: 'chart' | 'bazi'; title: string }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
  return (
    <Card variant="ink" padding="md" className="mb-6">
      <CardContent>
        <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1">{title}</p>
        <p className="text-xs text-[var(--color-fg-subtle)] mb-3">點擊任一年份, 即可查看該年的完整流年詳解(事業、財運、感情、健康、關鍵月份、開運建議)。</p>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/${basePath}/${id}/year/${y}`}
              className={`px-3 py-1.5 rounded text-sm bg-[var(--color-bg-deep)] text-[var(--color-fg-muted)] hover:text-[var(--color-gold-bright)] hover:bg-[var(--color-gold)]/10 transition-colors ${y === currentYear ? 'ring-1 ring-[var(--color-gold)]/60' : ''}`}
            >
              {y}
              {y === currentYear && <span className="text-[10px] ml-1 text-[var(--color-gold)]">今年</span>}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

async function SynthesisPanel({
  charts, userId, label, birth,
}: {
  charts: SubjectCharts;
  userId: string;
  label: string;
  birth: BirthInfo;
}) {
  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'unified-synthesis',
      userId,
      vars: buildUnifiedVars(charts, { label, gender: birth.gender, birth }),
    });
    text = res.text;
  } catch (err) {
    console.warn('[reading/synthesis] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '三盤合參報告產生失敗 — 請稍後再試。';
  }
  return (
    <>
      <ReadingSections raw={text} />
      {degraded && <p className="mt-4 text-xs text-[var(--color-danger)]/70">服務暫時不可用: {degraded}</p>}
    </>
  );
}
