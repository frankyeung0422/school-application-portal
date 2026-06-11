import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';
import { RegisterForm } from '@/components/auth/register-form';
import { DemoBanner } from '@/components/auth/demo-banner';

export const metadata = { title: '註冊' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string; plan?: string; email?: string; password?: string }>;
}) {
  const params = await searchParams;
  if (params.password !== undefined) redirect('/register');
  const { email, plan } = params;
  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold mb-2">建立帳戶</h1>
          <p className="text-sm text-[var(--color-fg-muted)]">選擇方案 · 免費試用 7 天 · 隨時取消</p>
        </div>
        <DemoBanner />
        <Card variant="gold-rim" padding="lg">
          <CardContent>
            <RegisterForm defaultEmail={email} plan={plan} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
