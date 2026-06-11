import Link from 'next/link';
import { Button, Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export const metadata = { title: '訂閱成功' };

/**
 * Stripe redirects here after a successful hosted checkout. The actual
 * subscription state is written by the webhook (checkout.session.completed),
 * so this page only confirms — it does not grant access itself.
 */
export default function CheckoutSuccessPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-lg mx-auto px-6 pt-24 pb-24 text-center">
        <Card variant="gold-rim" padding="xl">
          <CardContent>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3">訂閱成功</p>
            <h1 className="font-display text-3xl font-semibold mb-4">歡迎成為紫微閣會員</h1>
            <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed mb-8">
              您的 7 天免費試用已開始, 試用期內可隨時於帳戶中心取消, 不會扣款。
              訂閱狀態會在數秒內同步; 若功能尚未解鎖, 請稍候片刻並重新整理。
            </p>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" variant="gold"><Link href="/dashboard">前往我的帳戶 →</Link></Button>
              <Button asChild size="md" variant="ghost"><Link href="/account/billing">查看訂閱詳情</Link></Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
