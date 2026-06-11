import Link from 'next/link';
import { Button } from '@/components/ui';
import { getSession } from '@/lib/auth/session';
import { logoutAction } from '@/lib/auth/actions';

export async function SiteHeader() {
  const session = await getSession();
  const loggedIn = !!session;
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[var(--color-border)] bg-[var(--color-bg-deep)]/80 backdrop-blur-md">
      <div className="max-w-[var(--max-w-content)] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href={loggedIn ? '/dashboard' : '/'} className="flex items-center gap-2 group">
          <span className="font-display text-2xl font-semibold text-gold-foil group-hover:opacity-80 transition-opacity">
            紫微閣
          </span>
          <span className="hidden md:inline text-xs text-[var(--color-fg-subtle)] tracking-widest border-l border-[var(--color-border)] pl-2">
            命理引擎
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-fg-muted)]">
          {loggedIn ? (
            <>
              <Link href="/reading" className="text-[var(--color-gold-bright)] hover:opacity-80 transition-opacity font-medium">
                三盤合參
              </Link>
              <Link href="/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                紫微斗數
              </Link>
              <Link href="/bazi/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                八字
              </Link>
              <Link href="/qizheng/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                果老星宗
              </Link>
              <Link href="/dashboard/daily" className="hover:text-[var(--color-gold-bright)] transition-colors">
                今日運勢
              </Link>
              <Link href="/pricing" className="hover:text-[var(--color-gold-bright)] transition-colors">
                升級
              </Link>
              <Link href="/dashboard" className="hover:text-[var(--color-gold-bright)] transition-colors">
                我的帳戶
              </Link>
            </>
          ) : (
            <>
              <Link href="/reading" className="text-[var(--color-gold-bright)] hover:opacity-80 transition-opacity font-medium">
                三盤合參
              </Link>
              <Link href="/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                紫微試讀
              </Link>
              <Link href="/bazi/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                八字試讀
              </Link>
              <Link href="/qizheng/sample" className="hover:text-[var(--color-gold-bright)] transition-colors">
                果老星宗
              </Link>
              <Link href="/pricing" className="hover:text-[var(--color-gold-bright)] transition-colors">
                訂閱方案
              </Link>
              <Link href="/login" className="hover:text-[var(--color-gold-bright)] transition-colors">
                登入
              </Link>
            </>
          )}
        </nav>
        {loggedIn ? (
          <form action={logoutAction}>
            <Button type="submit" size="md" variant="ghost">登出</Button>
          </form>
        ) : (
          <Button asChild size="md" variant="primary">
            <Link href="/register">開始試用</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
