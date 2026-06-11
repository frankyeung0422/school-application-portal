import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { DemoBanner } from '@/components/auth/demo-banner';
import { ForgotForm } from './forgot-form';

export const metadata = { title: '忘記密碼' };

export default function ForgotPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">忘記密碼</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            輸入註冊時使用的電郵,我們將寄出重設連結。
          </p>
        </div>
        <DemoBanner />
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <ForgotForm />
            <div className="mt-6 flex items-center justify-between text-sm">
              <Link href="/login" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
                ← 返回登入
              </Link>
              <Link href="/register" className="text-[var(--color-gold)] hover:underline">
                新用戶註冊
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
