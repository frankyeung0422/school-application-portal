import Link from 'next/link';
import { Button } from '@/components/ui';
import { SiteHeader } from '@/components/layout/site-header';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-md mx-auto px-6 pt-32 pb-24 text-center">
        <p className="font-display text-8xl font-bold text-gold-foil mb-4">404</p>
        <h1 className="font-display text-2xl mb-3">此頁未在命盤之中</h1>
        <p className="text-[var(--color-fg-muted)] mb-8">
          你尋找的頁面或已遷移, 或從未存在。
        </p>
        <Button asChild size="lg" variant="gold">
          <Link href="/">回到首頁</Link>
        </Button>
      </main>
    </>
  );
}
