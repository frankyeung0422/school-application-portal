import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { GoldNumeral, InkDivider } from '@/components/chart';
import { SiteHeader } from '@/components/layout/site-header';
import { requireSession } from '@/lib/auth/session';
import { getOrCreateReferralCode } from '@/lib/engagement/referral';
import { prisma } from '@/lib/db/prisma';
import { publicEnv } from '@/lib/env';
import { ShareButtons } from './share-buttons';

export const metadata = { title: '邀請好友' };

export default async function ReferPage() {
  const session = await requireSession();
  const code = await getOrCreateReferralCode(session.sub);

  // Count how many redeemed referrals (= friends who actually subscribed)
  const redeemed = await prisma.referral.count({
    where: { referrerId: session.sub, refereeId: { not: null } },
  });

  const inviteUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/register?ref=${code}`;

  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        <header className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">邀請好友</p>
          <h1 className="font-display text-4xl font-semibold mb-3">兩人各得 1 個月免費</h1>
          <p className="text-[var(--color-fg-muted)] max-w-xl mx-auto">
            把紫微閣分享給朋友。當他們訂閱後, 你和他都會獲得 1 個月免費 (適用於下次扣款)。
          </p>
        </header>

        <Card variant="gold-rim" padding="xl" className="mb-8 text-center">
          <CardContent>
            <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-3">你的邀請碼</p>
            <GoldNumeral value={code} size="display" foil />
            <p className="mt-4 text-sm text-[var(--color-fg-muted)] break-all">
              {inviteUrl}
            </p>
            <InkDivider variant="subtle" />
            <ShareButtons code={code} url={inviteUrl} />
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="ink" padding="lg">
            <CardContent>
              <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">已成功邀請</p>
              <GoldNumeral value={redeemed} suffix=" 人" size="xl" />
            </CardContent>
          </Card>
          <Card variant="ink" padding="lg">
            <CardContent>
              <p className="text-xs uppercase tracking-widest text-[var(--color-fg-subtle)] mb-2">累積免費月份</p>
              <GoldNumeral value={redeemed} suffix=" 個月" size="xl" />
            </CardContent>
          </Card>
        </div>

        <InkDivider>適用規則</InkDivider>

        <ul className="text-sm text-[var(--color-fg-muted)] leading-relaxed space-y-3 max-w-xl mx-auto">
          <li>• 朋友須是新用戶 — 第一次註冊紫微閣</li>
          <li>• 朋友需以你的邀請連結開啟試用並完成首期扣款</li>
          <li>• 雙方各獲 1 個月免費, 自動套用於下次扣款</li>
          <li>• 無上限 — 邀請愈多, 免費愈久</li>
          <li>• 不可自我邀請 (系統會自動檢測)</li>
        </ul>

        <div className="mt-12 text-center">
          <Button asChild size="lg" variant="ghost">
            <Link href="/dashboard">← 返回儀表板</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
