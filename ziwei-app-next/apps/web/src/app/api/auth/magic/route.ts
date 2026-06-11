import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { consumeMagicLinkToken } from '@/lib/auth/magic-link';
import { dbAvailable } from '@/lib/auth/db-mode';
import { publicEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Magic-link callback. The link emailed to the user lands here:
 *   GET /api/auth/magic?t=<rawToken>
 *
 * Token is consumed atomically; on success we create a session cookie and
 * redirect to /dashboard. On failure (invalid / expired / used / no DB) the
 * user is sent to /login/magic with an error code.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('t');

  if (!token) {
    return NextResponse.redirect(new URL('/login/magic?err=missing', publicEnv.NEXT_PUBLIC_APP_URL));
  }
  if (!dbAvailable()) {
    return NextResponse.redirect(new URL('/login/magic?err=unavailable', publicEnv.NEXT_PUBLIC_APP_URL));
  }

  const result = await consumeMagicLinkToken(token);
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login/magic?err=${encodeURIComponent(result.error)}`, publicEnv.NEXT_PUBLIC_APP_URL));
  }

  await createSession({ sub: result.user.id, email: result.user.email, role: result.user.role });
  return NextResponse.redirect(new URL('/dashboard?welcome=magic', publicEnv.NEXT_PUBLIC_APP_URL));
}
