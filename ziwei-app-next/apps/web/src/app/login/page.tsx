import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { LoginForm } from '@/components/auth/login-form';
import { DemoBanner } from '@/components/auth/demo-banner';

export const metadata = { title: '登入' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; password?: string }>;
}) {
  const params = await searchParams;
  // Belt-and-suspenders: if a pre-hydration form submit ever lands credentials
  // in the URL, scrub them before rendering so nothing reaches browser history,
  // referer headers, or downstream logs.
  if (params.password !== undefined) redirect('/login');
  const { email } = params;
  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">登入</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">歡迎回到紫微閣</p>
        </div>
        <DemoBanner />
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <LoginForm defaultEmail={email} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
