import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/jwt';

const PROTECTED_PREFIXES = ['/dashboard', '/chart', '/account', '/refer'];
const ADMIN_PREFIXES = ['/admin'];

/**
 * Edge proxy (Next.js 16+ convention; replaces `middleware.ts`):
 * gates protected pages by session cookie. Server Components also call
 * requireSession()/requireAdmin() as a second line of defense.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get(process.env.SESSION_COOKIE_NAME || 'ziwei_session')?.value;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAdmin) return NextResponse.next();

  if (!sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  const session = await verifySession(sessionToken);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAdmin && session.role !== 'ADMIN') {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/chart/:path*', '/account/:path*', '/refer/:path*', '/admin/:path*'],
};
