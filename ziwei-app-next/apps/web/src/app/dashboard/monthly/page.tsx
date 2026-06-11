import Link from 'next/link';
import { Suspense } from 'react';
import { Card, CardContent, Button } from '@/components/ui';
import { InkDivider, ReadingSections } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { hasActivePlan } from '@/lib/billing/access';
import { loadPrimarySubject, getOrCreatePeriodFortune, type PrimarySubject } from '@/lib/chart/period-fortune';

export const metadata = { title: '本月運勢' };
export const dynamic = 'force-dynamic';

export default async function MonthlyPage() {
  const session = await requireSession();
  const [premium, subject] = await Promise.all([
    hasActivePlan(session.sub),
    loadPrimarySubject(session.sub),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-12 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">每月運勢 · 三盤合參</p>
          <h1 className="font-display text-4xl font-semibold mb-2">本月流盤</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">紫微流月 · 八字流月(兼盲派) · 果老行運，三盤互參</p>
        </header>

        {!premium ? (
          <UpsellCard />
        ) : !subject ? (
          <NeedChartCard />
        ) : (
          <Suspense fallback={<LoadingCard />}>
            <MonthlyReading userId={session.sub} subject={subject} />
          </Suspense>
        )}

        <InkDivider variant="subtle" />
        <div className="text-center mt-8 flex flex-wrap gap-3 justify-center">
          <Button asChild size="md" variant="ghost"><Link href="/dashboard/daily">今日</Link></Button>
          <Button asChild size="md" variant="ghost"><Link href="/dashboard/yearly">流年</Link></Button>
          <Button asChild size="md" variant="ghost"><Link href="/dashboard">← 返回帳戶</Link></Button>
        </div>
      </main>
    </>
  );
}

async function MonthlyReading({ userId, subject }: { userId: string; subject: PrimarySubject }) {
  let body: string;
  let periodLabel = '';
  let degraded: string | null = null;
  try {
    const f = await getOrCreatePeriodFortune({ userId, subject, scope: 'month', date: new Date() });
    body = f.body;
    periodLabel = f.periodLabel;
  } catch (err) {
    degraded = (err as Error).message;
    body = '本月運勢產生失敗 — 請稍後再試。';
  }
  return (
    <>
      {periodLabel && (
        <Card variant="ink" padding="md" className="mb-6">
          <CardContent>
            <p className="text-xs text-[var(--color-fg-subtle)]">
              週期 · <span className="text-[var(--color-gold-bright)]">{periodLabel}</span>
              {subject.label ? <> · {subject.label}</> : null}
            </p>
          </CardContent>
        </Card>
      )}
      <ReadingSections raw={body} />
      {degraded && <p className="mt-4 text-xs text-[var(--color-danger)]/70">服務暫時不可用: {degraded}</p>}
    </>
  );
}

function LoadingCard() {
  return (
    <Card variant="paper" padding="xl">
      <CardContent>
        <p className="text-[var(--color-paper-ink)] italic">三盤合參，為您撰寫本月流運中，請稍候 ...</p>
      </CardContent>
    </Card>
  );
}

function UpsellCard() {
  return (
    <Card variant="gold-rim" padding="lg">
      <CardContent>
        <p className="text-[var(--color-fg-muted)] mb-6 leading-relaxed">
          每月三盤合參流運是訂閱會員專屬功能。升級後，我們會在每個節氣月為您合參紫微流月、八字流月與果老行運，並可選擇電郵接收。
        </p>
        <Button asChild size="lg" variant="gold"><Link href="/pricing">升級解鎖</Link></Button>
      </CardContent>
    </Card>
  );
}

function NeedChartCard() {
  return (
    <Card variant="gold-rim" padding="lg">
      <CardContent>
        <p className="text-[var(--color-fg-muted)] mb-6 leading-relaxed">
          個人化流運需要您的三盤命盤。先排算一份三盤合參，我們便能為您逐月推演。
        </p>
        <Button asChild size="lg" variant="gold"><Link href="/reading">排算三盤命盤</Link></Button>
      </CardContent>
    </Card>
  );
}
