import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { prisma } from '@/lib/db/prisma';
import { computeBazi, BAZI_ENGINE_VERSION, type BaziChart, type BirthInfo } from '@ziwei/engine';
import { generate } from '@/lib/ai/client';
import { getSession } from '@/lib/auth/session';
import { saveBaziChartAction } from '@/lib/chart/bazi-actions';

export const metadata = { title: '你的八字命盤' };
export const dynamic = 'force-dynamic';

function dbAvailable(): boolean {
  return !(process.env.DATABASE_URL || '').includes('placeholder');
}

interface ResultParams {
  h?: string;
  y?: string; m?: string; d?: string; hr?: string; mi?: string;
  g?: string; c?: string;
  save_error?: string;
}

export default async function BaziResultPage({
  searchParams,
}: {
  searchParams: Promise<ResultParams>;
}) {
  const sp = await searchParams;
  if (!sp.h && !sp.y) redirect('/bazi/sample');

  let chart: BaziChart | null = null;

  if (sp.h && dbAvailable()) {
    try {
      const cached = await prisma.chartCache.findUnique({ where: { chartHash: sp.h } });
      // Skip stale rows from older engines (no strength analysis) — the URL
      // fallback below recomputes with the current engine.
      if (cached && cached.engineVersion === BAZI_ENGINE_VERSION) chart = cached.chartJson as unknown as BaziChart;
    } catch (err) {
      console.warn('[bazi/result] cache read skipped:', (err as Error).message);
    }
  }

  if (!chart && sp.y) {
    const birth: BirthInfo = {
      year: Number(sp.y),
      month: Number(sp.m ?? 1),
      day: Number(sp.d ?? 1),
      hour: Number(sp.hr ?? 12),
      minute: Number(sp.mi ?? 0),
      gender: (sp.g === 'F' ? 'F' : 'M'),
      calendar: (sp.c === 'lunar' ? 'lunar' : 'solar'),
    };
    chart = computeBazi(birth);
  }

  if (!chart) redirect('/bazi/sample');

  const session = await getSession();
  const birth = chart.birthInfo;

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">八字 · 命盤試讀</p>
          <h1 className="font-display text-4xl font-semibold mb-2">你的八字四柱</h1>
          <p className="text-[var(--color-fg-muted)] text-sm">
            日主 <span className="text-[var(--color-gold-bright)]">{chart.dayMaster}</span> ({chart.dayMasterElement})
            ・最旺 <span className="text-[var(--color-gold-bright)]">{chart.dominantElement}</span>
            ・最弱 <span className="text-[var(--color-fg-subtle)]">{chart.weakestElement}</span>
          </p>
        </div>

        <PillarsTable chart={chart} />

        <FiveElements chart={chart} />

        <InkDivider>日主深度解讀</InkDivider>

        <Suspense fallback={
          <Card variant="paper" padding="xl" className="mb-8">
            <CardContent>
              <p className="text-[var(--color-paper-ink)] italic">為您撰寫日主解讀中, 約需 15-30 秒 ...</p>
            </CardContent>
          </Card>
        }>
          <FreeReading chart={chart} userId={session?.sub ?? null} />
        </Suspense>

        {session ? (
          <Card variant="gold-rim" padding="xl" className="text-center bg-gold-leaf">
            <CardContent>
              <h3 className="font-display text-2xl font-semibold mb-3 text-[var(--color-gold-bright)]">
                儲存這張命盤
              </h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                儲存後可隨時查看完整十神格局、大運走向、流年詳解。
              </p>
              {sp.save_error && (
                <p className="text-sm text-[var(--color-danger)] mb-3">儲存失敗, 請稍後再試。</p>
              )}
              <form action={saveBaziChartAction} className="flex flex-col gap-3 max-w-sm mx-auto">
                <input type="hidden" name="year" value={birth.year} />
                <input type="hidden" name="month" value={birth.month} />
                <input type="hidden" name="day" value={birth.day} />
                <input type="hidden" name="hour" value={birth.hour} />
                <input type="hidden" name="minute" value={birth.minute} />
                <input type="hidden" name="gender" value={birth.gender} />
                <input type="hidden" name="calendar" value={birth.calendar} />
                <input
                  type="text"
                  name="label"
                  placeholder="命盤標籤 (選填, 例如「我」、「妻子」)"
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
                解鎖完整八字 · 7 天免費試用
              </h3>
              <p className="text-[var(--color-fg-muted)] mb-6 max-w-md mx-auto">
                查看完整十神格局、大運走向、流年運勢, 並可儲存命盤、邀請好友。
              </p>
              <Button asChild size="xl" variant="gold">
                <Link href={`/register?intent=trial${sp.h ? `&chart=${sp.h}` : ''}`}>開始 7 天試用 →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

function PillarsTable({ chart }: { chart: BaziChart }) {
  const pillars: Array<['年柱' | '月柱' | '日柱' | '時柱', keyof BaziChart['pillars']]> = [
    ['年柱', 'year'], ['月柱', 'month'], ['日柱', 'day'], ['時柱', 'hour'],
  ];
  return (
    <div className="grid grid-cols-4 gap-3 mb-10">
      {pillars.map(([label, key]) => {
        const p = chart.pillars[key];
        const isDayMaster = key === 'day';
        return (
          <Card key={key} variant={isDayMaster ? 'gold-rim' : 'ink'} padding="md">
            <CardContent>
              <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">{label}</p>
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
  );
}

function FiveElements({ chart }: { chart: BaziChart }) {
  const order = ['木', '火', '土', '金', '水'] as const;
  const total = order.reduce((s, e) => s + chart.fiveElements[e], 0) || 1;
  return (
    <Card variant="ink" padding="lg" className="mb-10">
      <CardContent>
        <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">五行分佈</p>
        <div className="flex items-end gap-3 h-24">
          {order.map((el) => {
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
  );
}

async function FreeReading({ chart, userId }: { chart: BaziChart; userId: string | null }) {
  let text: string;
  let degraded: string | null = null;
  try {
    const res = await generate({
      promptId: 'bazi-free',
      userId,
      vars: {
        yearGanzhi: chart.pillars.year.ganzhi,
        yearNayin: chart.pillars.year.nayin,
        monthGanzhi: chart.pillars.month.ganzhi,
        monthNayin: chart.pillars.month.nayin,
        dayGanzhi: chart.pillars.day.ganzhi,
        dayNayin: chart.pillars.day.nayin,
        hourGanzhi: chart.pillars.hour.ganzhi,
        hourNayin: chart.pillars.hour.nayin,
        dayMaster: chart.dayMaster,
        dayMasterElement: chart.dayMasterElement,
        fiveElements: ['木', '火', '土', '金', '水'].map((e) => `${e}${chart.fiveElements[e as keyof typeof chart.fiveElements]}`).join(' '),
        dominantElement: chart.dominantElement,
        weakestElement: chart.weakestElement,
        gender: chart.birthInfo.gender === 'M' ? '男' : '女',
      },
    });
    text = res.text;
  } catch (err) {
    console.warn('[bazi/free] generate failed:', (err as Error).message);
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
