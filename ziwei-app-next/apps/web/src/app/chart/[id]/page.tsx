import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Button } from '@/components/ui';
import { PalaceCell, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateReading } from '@/lib/chart/reading-cache';
import { deriveArchetype } from '@/lib/chart/archetype';
import { getMasterChatQuota } from '@/lib/billing/access';
import { loadLatestConversation } from '@/lib/chat/actions';
import { MasterChat } from '@/components/chat/master-chat';
import { VoiceMaster } from '@/components/chat/voice-master';
import { ShareArchetype } from '@/components/chat/share-archetype';
import { computeChart, ENGINE_VERSION } from '@ziwei/engine';
import type { Chart, PlacedStar } from '@ziwei/engine';

export const metadata = { title: '命盤詳解' };

function YearSelector({ chartId, basePath }: { chartId: string; basePath: 'chart' | 'bazi' }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
  return (
    <Card variant="ink" padding="md" className="mb-6">
      <CardContent>
        <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1">深入指定年份</p>
        <p className="text-xs text-[var(--color-fg-subtle)] mb-3">點擊任一年份, 即可查看該年的完整流年詳解(事業、財運、感情、健康、關鍵月份、開運建議)。</p>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y}
              href={`/${basePath}/${chartId}/year/${y}`}
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

export default async function ChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const record = await prisma.chart.findUnique({ where: { id } });
  if (!record) notFound();
  if (record.userId !== session.sub) redirect('/dashboard');

  let chart = record.chartJson as unknown as Chart;
  const birth = record.birthInfo as { year: number; month: number; day: number; hour: number; minute: number; gender: 'M' | 'F'; calendar: 'solar' | 'lunar' };

  // Engine upgrade on read: older saved charts lack minor stars / 大限 layers.
  if (chart.engineVersion !== ENGINE_VERSION) {
    try {
      chart = computeChart(birth);
      await prisma.chart.update({
        where: { id },
        data: { chartJson: chart as unknown as object, engineVersion: ENGINE_VERSION },
      });
    } catch (err) {
      console.warn('[chart/page] engine upgrade-on-read skipped:', (err as Error).message);
    }
  }
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;

  const archetype = deriveArchetype(chart);
  const [quota, latestConv] = await Promise.all([
    getMasterChatQuota(session.sub),
    loadLatestConversation(id),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">紫微斗數 · 命盤</p>
            <h1 className="font-display text-4xl font-semibold mb-2">{record.label || birthSummary}</h1>
            <p className="text-sm text-[var(--color-fg-muted)]">
              五行局 <span className="text-[var(--color-gold-bright)]">{chart.bureau.bureau}</span>
              ・年柱 <span className="text-[var(--color-gold-bright)]">{chart.yearGanzhi}</span>
              ・農曆 {chart.lunarDate.year}年{chart.lunarDate.isLeap ? '閏' : ''}{chart.lunarDate.month}月{chart.lunarDate.day}日
            </p>
          </div>
          <ShareArchetype chartHash={record.chartHash} archetype={archetype} />
        </header>

        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">命盤圖</TabsTrigger>
            <TabsTrigger value="reading">深度解讀</TabsTrigger>
            <TabsTrigger value="fortune">流年</TabsTrigger>
            <TabsTrigger value="alerts">命理預警</TabsTrigger>
            <TabsTrigger value="voice">語音問師傅</TabsTrigger>
            <TabsTrigger value="master">問師傅</TabsTrigger>
          </TabsList>

          <TabsContent value="chart">
            <div className="grid grid-cols-4 gap-3">
              {chart.palaces.map((p) => (
                <PalaceCell
                  key={p.name}
                  name={p.name}
                  branch={p.branch}
                  ganzhi={p.ganzhi}
                  stars={p.stars as PlacedStar[]}
                  highlight={p.isMingong ? 'mingong' : 'none'}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reading">
            <Suspense fallback={
              <Card variant="paper" padding="xl">
                <CardContent>
                  <p className="text-[var(--color-paper-ink)] italic">為您撰寫十二宮完整解讀中, 約需 20-40 秒 ...</p>
                </CardContent>
              </Card>
            }>
              <InterpretationPanel chart={chart} chartId={id} userId={session.sub} birthSummary={birthSummary} gender={birth.gender} />
            </Suspense>
          </TabsContent>

          <TabsContent value="fortune">
            <YearSelector chartId={id} basePath="chart" />
            <Suspense fallback={
              <Card variant="paper" padding="xl">
                <CardContent>
                  <p className="text-[var(--color-paper-ink)] italic">為您推演未來 10 年流年, 約需 30-50 秒 ...</p>
                </CardContent>
              </Card>
            }>
              <AnnualFortunePanel chart={chart} chartId={id} userId={session.sub} birthSummary={birthSummary} gender={birth.gender} birthYear={birth.year} />
            </Suspense>
          </TabsContent>

          <TabsContent value="alerts">
            <Suspense fallback={
              <Card variant="paper" padding="xl">
                <CardContent>
                  <p className="text-[var(--color-paper-ink)] italic">分析命盤煞星組合中 ...</p>
                </CardContent>
              </Card>
            }>
              <AlertsPanel chart={chart} userId={session.sub} birthYear={birth.year} />
            </Suspense>
          </TabsContent>

          <TabsContent value="voice">
            <Card variant="paper" padding="lg">
              <CardContent>
                <div className="flex justify-end mb-2">
                  <Button asChild variant="ghost" size="sm"><Link href={`/master/${id}`}>進入全螢幕面見師傅 →</Link></Button>
                </div>
                <VoiceMaster
                  chartId={id}
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
          </TabsContent>

          <TabsContent value="master">
            <Card variant="paper" padding="lg">
              <CardContent>
                <MasterChat
                  chartId={id}
                  archetypeLabel={archetype.label}
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
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
          <Button asChild size="md" variant="ghost">
            <Link href="/dashboard">← 返回我的帳戶</Link>
          </Button>
        </div>
      </main>
    </>
  );
}

async function InterpretationPanel({
  chart, chartId, userId, birthSummary, gender,
}: {
  chart: Chart;
  chartId: string;
  userId: string;
  birthSummary: string;
  gender: 'M' | 'F';
}) {
  const palacesSummary = chart.palaces.map((p) => {
    const stars = p.stars.length === 0
      ? '空宮'
      : p.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、');
    return `${p.name} (${p.branch}, ${p.ganzhi}): ${stars}`;
  }).join('\n');

  let text: string;
  let degraded: string | null = null;
  try {
    const res = await getOrCreateReading({
      userId,
      cacheKey: `chart-interp-${chartId}@${ENGINE_VERSION}`,
      promptId: 'chart-interpretation',
      vars: {
        bureau: chart.bureau.bureau,
        yearGanzhi: chart.yearGanzhi,
        birthSummary,
        gender: gender === 'M' ? '男' : '女',
        palaces: palacesSummary,
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[chart] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '深度解讀產生失敗 — 請稍後再試, 或檢查管理員是否已配置 AI 服務。';
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

async function AnnualFortunePanel({
  chart, chartId, userId, birthSummary, gender, birthYear,
}: {
  chart: Chart;
  chartId: string;
  userId: string;
  birthSummary: string;
  gender: 'M' | 'F';
  birthYear: number;
}) {
  const palacesSummary = chart.palaces.map((p) => {
    const stars = p.stars.length === 0
      ? '空宮'
      : p.stars.map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`).join('、');
    return `${p.name} (${p.branch}, ${p.ganzhi}): ${stars}`;
  }).join('\n');

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  let text: string;
  let degraded: string | null = null;
  try {
    // Year-dependent — fold the start year into the key so it refreshes annually.
    const res = await getOrCreateReading({
      userId,
      cacheKey: `chart-annual-${chartId}-${currentYear}@${ENGINE_VERSION}`,
      promptId: 'chart-annual-fortune',
      vars: {
        birthSummary,
        gender: gender === 'M' ? '男' : '女',
        age,
        bureau: chart.bureau.bureau,
        yearGanzhi: chart.yearGanzhi,
        palaces: palacesSummary,
        firstYear: currentYear,
        lastYear: currentYear + 9,
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[chart/fortune] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '流年推演產生失敗 — 請稍後再試。';
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

async function AlertsPanel({
  chart, userId, birthYear,
}: {
  chart: Chart;
  userId: string;
  birthYear: number;
}) {
  const { analyzeZiweiAlerts, analyzeHealthTimeline } = await import('@ziwei/engine');
  const alerts = analyzeZiweiAlerts(chart, birthYear);
  const timeline = analyzeHealthTimeline(chart, birthYear);
  void userId;

  const severityLabel = (n: number) =>
    n >= 5 ? '極為凶險' : n >= 4 ? '高度警示' : n >= 3 ? '中度提醒' : '輕度留意';
  const severityClass = (n: number) =>
    n >= 5 ? 'border-l-4 border-[var(--color-vermilion)]'
    : n >= 4 ? 'border-l-4 border-[var(--color-danger)]'
    : n >= 3 ? 'border-l-4 border-[var(--color-gold)]'
    : 'border-l-4 border-[var(--color-fg-subtle)]';

  const decadeLabel = (n: number) =>
    n >= 5 ? '高度關注' : n >= 4 ? '加強留意' : n >= 3 ? '須要觀察' : n >= 2 ? '常規維護' : '相對平穩';

  return (
    <div className="flex flex-col gap-8">
      {/* ── 高風險組合 ── */}
      <div className="flex flex-col gap-4">
        <Card variant="paper" padding="md">
          <CardContent>
            <h2 className="font-display text-2xl text-[var(--color-gold-bright)] mb-2">煞星與沖刑預警</h2>
            <p className="text-sm text-[var(--color-paper-ink)]">
              {alerts.length === 0
                ? '本盤未檢出明顯凶險組合。系統持續監測您命盤中的煞星、化忌、太歲沖刑等高風險配置;一旦發現, 將於此處以卡片形式列出建議的化解方法。'
                : '基於您命盤中煞星、化忌、太歲沖刑配置的命理預警, 按嚴重程度排序。每條附化解建議, 僅供參考。'}
            </p>
          </CardContent>
        </Card>
        {alerts.map((a) => (
          <Card key={a.id} variant="paper" padding="lg" className={severityClass(a.severity)}>
            <CardContent>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-display text-xl text-[var(--color-gold-bright)]">{a.title}</h3>
                <span className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] whitespace-nowrap pt-1">
                  {severityLabel(a.severity)} · {a.severity}/5
                </span>
              </div>
              <p className="text-[var(--color-paper-ink)] leading-relaxed mb-3">{a.description}</p>
              {a.palace && (
                <p className="text-xs text-[var(--color-fg-subtle)] mb-3">
                  關聯宮位 · {a.palace}{a.stars.length > 0 && ` · 涉及星曜 ${a.stars.join('、')}`}
                </p>
              )}
              {a.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-gold)]/20">
                  <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-2">化解建議</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {a.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-[var(--color-paper-ink)] leading-relaxed">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 分齡健康時間軸 ── */}
      <div className="flex flex-col gap-4">
        <Card variant="paper" padding="md">
          <CardContent>
            <h2 className="font-display text-2xl text-[var(--color-gold-bright)] mb-2">分齡健康預警</h2>
            <p className="text-sm text-[var(--color-paper-ink)] mb-1">
              以下為根據您命盤中疾厄宮、命宮主星推導的「分齡健康關注點」, 按十年分段。每段標示該年齡層宜重點留意的器官系統與行動建議。
            </p>
            <p className="text-xs text-[var(--color-fg-subtle)] italic">
              ※ 此非疾病診斷, 亦不預測壽元。命理僅供參考, 實際健康狀況請以正規醫療檢查為準。
            </p>
          </CardContent>
        </Card>
        {timeline.map((d) => (
          <Card
            key={d.ageStart}
            variant="paper"
            padding="lg"
            className={severityClass(d.severity)}
          >
            <CardContent>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-display text-xl text-[var(--color-gold-bright)]">
                  {d.ageEnd === 999 ? `${d.ageStart} 歲以上` : `${d.ageStart}-${d.ageEnd} 歲`}
                  <span className="text-sm text-[var(--color-fg-subtle)] ml-3">
                    {d.yearStart}{d.ageEnd === 999 ? ' 起' : `-${d.yearEnd}`}
                  </span>
                </h3>
                <span className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] whitespace-nowrap pt-1">
                  {decadeLabel(d.severity)} · {d.severity}/5
                </span>
              </div>
              <p className="text-[var(--color-paper-ink)] leading-relaxed mb-3">{d.headline}</p>
              {d.focusAreas.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-2">關注器官系統</p>
                  <div className="flex flex-wrap gap-2">
                    {d.focusAreas.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-[var(--color-gold)]/10 text-[var(--color-paper-ink)]">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {d.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[var(--color-gold)]/20">
                  <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-2">行動建議</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {d.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-[var(--color-paper-ink)] leading-relaxed">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {d.rationale.length > 0 && (
                <details className="mt-3 pt-3 border-t border-[var(--color-gold)]/20">
                  <summary className="text-xs uppercase tracking-widest text-[var(--color-gold)] cursor-pointer">命理依據</summary>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    {d.rationale.map((r, i) => (
                      <li key={i} className="text-xs text-[var(--color-fg-subtle)]">{r}</li>
                    ))}
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
