import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { DemoBanner } from '@/components/auth/demo-banner';
import { MagicForm } from './magic-form';

export const metadata = { title: '電郵連結登入' };

export default function MagicLoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">電郵連結登入</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            輸入電郵,我們將寄出一鍵登入連結 — 無需記憶密碼。
          </p>
        </div>
        <DemoBanner />
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <MagicForm />
            <div className="mt-6 flex items-center justify-between text-sm">
              <Link href="/login" className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
                ← 用密碼登入
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
