import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { requireSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { openBillingPortalAction } from '@/lib/billing/actions';

export const metadata = { title: '訂閱與帳單' };

const PLAN_LABEL: Record<string, string> = {
  FREE: '免費',
  MONTHLY: '月度',
  ANNUAL: '年度',
  MASTER: '大師',
};

const STATUS_LABEL: Record<string, string> = {
  TRIALING: '試用中',
  ACTIVE: '生效中',
  PAST_DUE: '逾期未付',
  CANCELED: '已取消',
  INCOMPLETE: '待完成',
  PAUSED: '已暫停',
};

function fmt(d: Date | null): string {
  if (!d) return '—';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const sub = await prisma.subscription.findUnique({ where: { userId: session.sub } });

  const isPaid = sub && sub.plan !== 'FREE' && sub.status !== 'CANCELED';

  return (
    <>
      <SiteHeader />
      <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-2">帳戶中心</p>
          <h1 className="font-display text-4xl font-semibold">訂閱與帳單</h1>
        </header>

        {sp.error === 'portal' && (
          <p className="mb-6 rounded-[var(--radius)] border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-4 py-2 text-sm text-[var(--color-danger)]">
            無法開啟帳單管理頁面, 請稍後再試。
          </p>
        )}

        <Card variant={isPaid ? 'gold-rim' : 'ink'} padding="xl">
          <CardContent>
            {isPaid ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-6">
                  <h2 className="font-display text-2xl font-semibold">
                    {PLAN_LABEL[sub!.plan]}方案
                  </h2>
                  <span className="text-sm text-[var(--color-gold-bright)]">{STATUS_LABEL[sub!.status]}</span>
                </div>
                <dl className="space-y-3 text-sm mb-8">
                  {sub!.status === 'TRIALING' && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-fg-muted)]">試用結束</dt>
                      <dd className="text-[var(--color-fg)]">{fmt(sub!.trialEndsAt)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-fg-muted)]">本期帳單到期</dt>
                    <dd className="text-[var(--color-fg)]">{fmt(sub!.currentPeriodEnd)}</dd>
                  </div>
                  {sub!.cancelAt && (
                    <div className="flex justify-between">
                      <dt className="text-[var(--color-fg-muted)]">將於此日取消</dt>
                      <dd className="text-[var(--color-fg)]">{fmt(sub!.cancelAt)}</dd>
                    </div>
                  )}
                </dl>
                <form action={openBillingPortalAction}>
                  <Button type="submit" size="lg" variant="gold" className="w-full">
                    管理訂閱 · 更新付款方式 · 取消 →
                  </Button>
                </form>
                <p className="text-xs text-[var(--color-fg-subtle)] text-center mt-3">
                  將前往 Stripe 安全帳單頁面。
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold mb-3">您目前是免費會員</h2>
                <p className="text-sm text-[var(--color-fg-muted)] mb-8">
                  升級後即可解鎖無限命盤、完整十二宮解讀、流年提醒、語音問師傅等會員功能。所有方案均含 7 天免費試用。
                </p>
                <Button asChild size="lg" variant="gold" className="w-full">
                  <Link href="/pricing">查看訂閱方案 →</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button asChild size="md" variant="ghost"><Link href="/dashboard">← 返回我的帳戶</Link></Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
