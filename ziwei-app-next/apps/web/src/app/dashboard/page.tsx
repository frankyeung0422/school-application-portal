import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { GoldNumeral, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { getStreak } from '@/lib/engagement/streak';
import { prisma } from '@/lib/db/prisma';
import { startCheckoutAction } from '@/lib/billing/actions';
import { PLAN_DISPLAY } from '@/lib/billing/plans';

export const metadata = { title: '我的帳戶' };

function nextMilestone(current: number): number {
  const breakpoints = [7, 14, 30, 60, 100, 365];
  for (const m of breakpoints) if (current < m) return m;
  return 365 * 2;
}

export default async function DashboardPage() {
  const session = await requireSession();

  const [streak, charts, subjects, sub] = await Promise.all([
    getStreak(session.sub),
    prisma.chart.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
    prisma.subject.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    prisma.subscription.findUnique({ where: { userId: session.sub } }),
  ]);
  // Charts grouped under a 三盤合參 Subject are shown in that section; the
  // individual list shows only standalone (single-system) charts.
  const standaloneCharts = charts.filter((c) => !c.subjectId);

  const next = nextMilestone(streak.current);
  // A user is "paid" only on a real plan that hasn't been canceled; everyone
  // else (FREE, no subscription row, or canceled) sees the upgrade card.
  const isPaid = !!sub && sub.plan !== 'FREE' && sub.status !== 'CANCELED';

  return (
    <>
      <SiteHeader />
      <main className="max-w-[var(--max-w-content)] mx-auto px-6 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-semibold mb-2">我的帳戶</h1>
          <p className="text-[var(--color-fg-muted)]">
            歡迎回來。
            {sub?.status === 'TRIALING' && sub.trialEndsAt && (
              <span className="text-[var(--color-gold-bright)]">
                {' '}試用至 {sub.trialEndsAt.toLocaleDateString('zh-Hant-TW')}。
              </span>
            )}
            {sub?.status === 'ACTIVE' && (
              <span className="text-[var(--color-gold-bright)]"> 訂閱中。</span>
            )}
          </p>
        </div>

        {/* Upgrade — shown to free/canceled users so the payment path is always
            reachable from the dashboard. Each button POSTs straight into Stripe
            checkout (user is already signed in). */}
        {!isPaid && (
          <Card variant="gold-rim" padding="lg" className="mb-10">
            <CardContent>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">升級會員</p>
              <h2 className="font-display text-2xl font-semibold mb-2">解鎖完整命理體驗</h2>
              <p className="text-[var(--color-fg-muted)] mb-6 text-sm">
                無限命盤、完整十二宮解讀、每日運勢電郵、語音問師傅與更多會員功能。所有方案均含 7 天免費試用,隨時取消。
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {PLAN_DISPLAY.map((p) => (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-[var(--radius)] border px-4 py-4 ${
                      p.id === 'annual'
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-display text-lg text-[var(--color-gold-bright)]">{p.name}</span>
                      {p.badge && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--color-gold)]">{p.badge}</span>
                      )}
                    </div>
                    <div className="mb-1">
                      <span className="font-display text-xl text-[var(--color-fg)]">HK${p.price.toLocaleString()}</span>
                      <span className="text-xs text-[var(--color-fg-muted)]">{p.period}</span>
                    </div>
                    <p className="text-xs text-[var(--color-fg-muted)] mb-4 flex-1">{p.tagline}</p>
                    <form action={startCheckoutAction}>
                      <input type="hidden" name="plan" value={p.id} />
                      <Button type="submit" size="sm" variant={p.id === 'annual' ? 'gold' : 'primary'} className="w-full">
                        選擇{p.name}方案
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--color-fg-subtle)] mt-4">
                <Link href="/pricing" className="hover:text-[var(--color-gold-bright)] underline">比較完整方案功能 →</Link>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Primary CTAs — always visible so user can start a new reading at any time */}
        <Card variant="gold-rim" padding="lg" className="mb-10">
          <CardContent>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">開始新命盤</p>
            <p className="text-[var(--color-fg-muted)] mb-5 text-sm">一次生辰即可三盤合參, 或單獨排算其中一套系統。完成後可儲存到此帳戶, 隨時回看。</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/reading">三盤合參 (紫微+八字+果老)</Link>
              </Button>
              <Button asChild size="md" variant="primary">
                <Link href="/sample">單排紫微斗數</Link>
              </Button>
              <Button asChild size="md" variant="primary">
                <Link href="/bazi/sample">單排八字</Link>
              </Button>
              <Button asChild size="md" variant="primary">
                <Link href="/qizheng/sample">單排果老星宗</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          <Card variant="gold-rim" padding="lg">
            <CardHeader>
              <CardTitle>今日運勢</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-fg-muted)] mb-4 leading-relaxed">
                根據你的命盤與今日干支, 由 AI 命理顧問為你撰寫的個人化每日運勢。
              </p>
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard/daily">查看今日運勢 →</Link>
              </Button>
            </CardContent>
          </Card>

          <Card variant="ink" padding="lg">
            <CardHeader>
              <CardTitle>連續紀錄</CardTitle>
            </CardHeader>
            <CardContent>
              <GoldNumeral value={streak.current} suffix=" 天" size="display" foil />
              <p className="text-xs text-[var(--color-fg-subtle)] mt-2">
                {streak.current < next
                  ? `下一徽章 · ${next} 天`
                  : '你已達成最高徽章 ✦'}
              </p>
              {streak.longest > streak.current && (
                <p className="text-xs text-[var(--color-fg-subtle)] mt-1">
                  最長紀錄 · {streak.longest} 天
                </p>
              )}
            </CardContent>
          </Card>

          <Card variant="ink" padding="lg">
            <CardHeader>
              <CardTitle>邀請好友</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--color-fg-muted)] mb-4">
                每位成功邀請的好友, 雙方各獲免費 1 個月。
              </p>
              <Button asChild size="sm" variant="primary">
                <Link href="/refer">取得邀請碼 →</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {subjects.length > 0 && (
          <>
            <InkDivider>三盤合參紀錄</InkDivider>
            <div className="grid gap-4 md:grid-cols-2 mb-10">
              {subjects.map((s) => {
                const birth = s.birthInfo as { year: number; month: number; day: number; hour: number };
                return (
                  <Card key={s.id} variant="gold-rim" padding="md">
                    <CardContent>
                      <Link href={`/reading/${s.id}`} className="block hover:opacity-90">
                        <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1">紫微 · 八字 · 果老星宗</p>
                        <p className="font-display text-lg text-[var(--color-gold-bright)] mb-1">
                          {s.label || `${birth.year}年${birth.month}月${birth.day}日`}
                        </p>
                        <p className="text-xs text-[var(--color-fg-subtle)]">
                          儲存於 {s.createdAt.toLocaleDateString('zh-Hant-TW')}
                        </p>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <InkDivider>單一命盤紀錄</InkDivider>

        {standaloneCharts.length === 0 ? (
          <Card variant="ink" padding="lg">
            <CardContent>
              <p className="text-[var(--color-fg-muted)] text-center py-6">
                {subjects.length > 0
                  ? '沒有單獨排算的命盤。'
                  : '你還沒有儲存的命盤。從上面選擇三盤合參或單排一套系統, 完成後即可儲存。'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {standaloneCharts.map((c) => {
              const birth = c.birthInfo as { year: number; month: number; day: number; hour: number };
              const cj = c.chartJson as { kind?: 'bazi' | 'qizheng' | 'ziwei' };
              const system =
                cj.kind === 'bazi' ? { label: '八字', href: `/bazi/${c.id}` }
                : cj.kind === 'qizheng' ? { label: '果老星宗', href: `/qizheng/${c.id}` }
                : { label: '紫微斗數', href: `/chart/${c.id}` };
              return (
                <Card key={c.id} variant="ink" padding="md">
                  <CardContent>
                    <Link href={system.href} className="block hover:opacity-90">
                      <p className="text-xs uppercase tracking-widest text-[var(--color-gold)] mb-1">
                        {system.label}
                      </p>
                      <p className="font-display text-lg text-[var(--color-gold-bright)] mb-1">
                        {c.label || `${birth.year}年${birth.month}月${birth.day}日`}
                      </p>
                      <p className="text-xs text-[var(--color-fg-subtle)]">
                        儲存於 {c.createdAt.toLocaleDateString('zh-Hant-TW')}
                      </p>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
