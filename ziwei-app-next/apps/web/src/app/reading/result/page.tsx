import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, Field, Input, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { InkDivider, ReadingSections, ZiweiPalaceGrid, BaziPillars } from '@/components/chart';
import { QizhengChartView } from '@/components/qizheng/qizheng-chart-view';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { computeAllSystems, type BirthInfo, type Chart, type BaziChart, type QizhengChart } from '@ziwei/engine';
import { getSession } from '@/lib/auth/session';
import { saveUnifiedReadingAction } from '@/lib/chart/unified-actions';
import { generate } from '@/lib/ai/client';
import { buildUnifiedVars } from '@/lib/chart/context';

export const metadata = { title: '三盤合參 · 結果' };

interface ResultParams {
  y?: string; m?: string; d?: string; hr?: string; mi?: string;
  g?: string; c?: string; lat?: string; lon?: string;
  save_error?: string;
}

function birthFromParams(sp: ResultParams): BirthInfo | null {
  if (!sp.y) return null;
  const birth: BirthInfo = {
    year: Number(sp.y),
    month: Number(sp.m ?? 1),
    day: Number(sp.d ?? 1),
    hour: Number(sp.hr ?? 12),
    minute: Number(sp.mi ?? 0),
    gender: sp.g === 'F' ? 'F' : 'M',
    calendar: sp.c === 'lunar' ? 'lunar' : 'solar',
  };
  if (sp.lat) birth.latitude = Number(sp.lat);
  if (sp.lon) birth.longitude = Number(sp.lon);
  return birth;
}

export default async function UnifiedResultPage({
  searchParams,
}: {
  searchParams: Promise<ResultParams>;
}) {
  const sp = await searchParams;
  const birth = birthFromParams(sp);

  if (!birth) {
    return (
      <>
        <SiteHeader />
        <main className="max-w-2xl mx-auto px-6 pt-24 pb-24 text-center">
          <p className="text-[var(--color-fg-muted)] mb-6">缺少出生資料, 請重新排盤。</p>
          <Button asChild variant="gold"><Link href="/reading">回到排盤</Link></Button>
        </main>
        <SiteFooter />
      </>
    );
  }

  const all = computeAllSystems(birth);
  const session = await getSession();
  const birthSummary = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時 (${birth.calendar === 'lunar' ? '農曆' : '陽曆'})`;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">三盤合參 · 免費預覽</p>
          <h1 className="font-display text-4xl font-semibold mb-2">{birthSummary}</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            五行局 <span className="text-[var(--color-gold-bright)]">{all.ziwei.chart.bureau.bureau}</span>
            ・日主 <span className="text-[var(--color-gold-bright)]">{all.bazi.chart.dayMaster}{all.bazi.chart.dayMasterElement}</span>
            ・命度 <span className="text-[var(--color-gold-bright)]">{all.qizheng.chart.ascendant.sign}</span>
          </p>
        </header>

        <Tabs defaultValue="ziwei">
          <TabsList>
            <TabsTrigger value="ziwei">紫微斗數</TabsTrigger>
            <TabsTrigger value="bazi">八字</TabsTrigger>
            <TabsTrigger value="qizheng">果老星宗</TabsTrigger>
          </TabsList>
          <TabsContent value="ziwei"><ZiweiPalaceGrid chart={all.ziwei.chart} /></TabsContent>
          <TabsContent value="bazi"><BaziPillars chart={all.bazi.chart} /></TabsContent>
          <TabsContent value="qizheng"><QizhengChartView chart={all.qizheng.chart} /></TabsContent>
        </Tabs>

        <InkDivider>三盤合參 · 跨系統解讀</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl" className="mb-6">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">師傅正同時參照三套命盤, 為您寫下合參預告 ...</p>
            </CardContent>
          </Card>
        }>
          <TeaserPanel birth={birth} all={all} />
        </Suspense>

        <Card variant="gold-rim" padding="lg" className="mt-2">
          <CardContent>
            {sp.save_error && (
              <p className="mb-3 text-sm text-[var(--color-danger)]">儲存失敗, 請稍後再試。</p>
            )}
            <p className="text-[var(--color-fg-muted)] mb-5 text-sm leading-relaxed">
              以上只是預告。儲存後即可解鎖完整「三盤合參」報告 —— 師傅會展開三盤共識與分歧(各自依據與權衡),
              以及性格、事業、財富、感情、健康五大面向, 並可就三盤開口向師傅提問。
            </p>
            <form action={saveUnifiedReadingAction} method="POST" className="grid gap-4 max-w-md">
              <input type="hidden" name="year" value={birth.year} />
              <input type="hidden" name="month" value={birth.month} />
              <input type="hidden" name="day" value={birth.day} />
              <input type="hidden" name="hour" value={birth.hour} />
              <input type="hidden" name="minute" value={birth.minute} />
              <input type="hidden" name="gender" value={birth.gender} />
              <input type="hidden" name="calendar" value={birth.calendar} />
              {birth.latitude !== undefined && <input type="hidden" name="latitude" value={birth.latitude} />}
              {birth.longitude !== undefined && <input type="hidden" name="longitude" value={birth.longitude} />}
              <Field label="命主稱呼" htmlFor="label" hint="選填, 例如「我」「妻子」「孩子」">
                <Input id="label" name="label" placeholder="我" maxLength={20} />
              </Field>
              <Button type="submit" size="lg" variant="gold">
                {session ? '儲存並解鎖三盤合參 →' : '登入並儲存三盤 →'}
              </Button>
            </form>
            {!session && (
              <p className="mt-3 text-xs text-[var(--color-fg-subtle)]">尚未登入 — 點擊後會先帶你登入, 再回到此處儲存。</p>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-12">
          <Button asChild size="md" variant="ghost"><Link href="/reading">← 重新排盤</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function TeaserPanel({
  birth, all,
}: {
  birth: BirthInfo;
  all: { ziwei: { chart: Chart }; bazi: { chart: BaziChart }; qizheng: { chart: QizhengChart } };
}) {
  const label = `${birth.year}年${birth.month}月${birth.day}日${birth.hour}時`;
  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'unified-teaser',
      vars: buildUnifiedVars(
        { ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart },
        { label, gender: birth.gender, birth },
      ),
    });
    text = res.text;
  } catch (err) {
    console.warn('[reading/teaser] generate failed:', (err as Error).message);
    degraded = (err as Error).message;
    text = '';
  }
  if (!text) {
    return degraded ? (
      <p className="mb-6 text-xs text-[var(--color-danger)]/70">合參預告暫時無法產生: {degraded}</p>
    ) : null;
  }
  return (
    <Card variant="paper" padding="xl" className="mb-6">
      <CardContent>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">完整解讀預告</p>
        <ReadingSections raw={text} />
      </CardContent>
    </Card>
  );
}
