import Link from 'next/link';
import { Card, CardContent, Button } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { readActiveResetToken } from '@/lib/auth/password-reset';
import { dbAvailable } from '@/lib/auth/db-mode';
import { ResetForm } from './reset-form';

export const metadata = { title: '重設密碼' };

export default async function ResetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate server-side before rendering the form so an invalid token shows
  // a clear "expired" UI rather than a generic form-submission failure.
  const valid = dbAvailable() ? Boolean(await readActiveResetToken(token)) : false;

  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">重設密碼</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {valid ? '請設定你的新密碼。' : '此連結已失效。'}
          </p>
        </div>
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            {valid ? (
              <ResetForm token={token} />
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">
                  重設連結可能已過期 (1 小時有效) 或已被使用。請重新申請一個新連結。
                </p>
                <Button asChild size="lg" variant="gold">
                  <Link href="/forgot">重新申請重設連結</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
