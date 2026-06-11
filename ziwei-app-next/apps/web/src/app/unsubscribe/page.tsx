import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { confirmUnsubscribeAction } from '@/lib/email/preferences-actions';

export const metadata = { title: '取消訂閱' };
export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<string, string> = {
  daily_fortune: '每日運勢',
  weekly_horoscope: '每週運程',
  monthly_fortune: '每月運勢',
  yearly_fortune: '流年運勢',
  alert: '特別預警',
  marketing: '產品與優惠資訊',
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; kind?: string; done?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const email = sp.email ?? '';
  const kind = sp.kind ?? '';
  const kindLabel = KIND_LABEL[kind] ?? '所有運勢電郵';

  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <h1 className="font-display text-2xl font-semibold mb-4">取消訂閱</h1>

            {sp.done ? (
              <>
                <p className="text-[var(--color-fg-muted)] leading-relaxed mb-6">
                  已為您關閉「{kindLabel}」電郵。您隨時可在帳戶設定中重新開啟。
                </p>
                <Button asChild size="md" variant="gold"><Link href="/account/settings">前往帳戶設定</Link></Button>
              </>
            ) : sp.error || !email ? (
              <p className="text-[var(--color-fg-muted)] leading-relaxed">
                連結無效或缺少電郵資訊。請改於 <Link href="/account/settings" className="text-[var(--color-gold-bright)] underline">帳戶設定</Link> 中管理電郵偏好。
              </p>
            ) : (
              <>
                <p className="text-[var(--color-fg-muted)] leading-relaxed mb-6">
                  確認要為 <span className="text-[var(--color-gold-bright)]">{email}</span> 取消「{kindLabel}」電郵嗎？
                </p>
                <form action={confirmUnsubscribeAction} className="flex gap-3">
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="kind" value={kind} />
                  <Button type="submit" size="md" variant="gold">確認取消訂閱</Button>
                  <Button asChild size="md" variant="ghost"><Link href="/account/settings">改為管理偏好</Link></Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
