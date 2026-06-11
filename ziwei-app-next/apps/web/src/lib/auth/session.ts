import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { signSession, verifySession, type SessionClaims } from './jwt';
import { resolveScheme } from '@/lib/http/origin';
import { env } from '@/lib/env';

const COOKIE_NAME = env.SESSION_COOKIE_NAME;

export async function createSession(claims: Pick<SessionClaims, 'sub' | 'email' | 'role'>) {
  const token = await signSession(claims);
  const cookieStore = await cookies();
  // Secure must follow the actual request scheme, not NODE_ENV: a prod build
  // served over http://localhost would set a Secure cookie the browser never
  // sends back, leaving the user perpetually logged out. See lib/http/origin.
  const secure = resolveScheme(await headers()) === 'https';
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read the current session (if any). Returns null when not signed in.
 * Safe to call from Server Components.
 */
export async function getSession(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Require a signed-in user; redirect to /login if not.
 * Use in protected Server Components and Server Actions.
 */
export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/**
 * Require an admin user; redirect to / if not.
 */
export async function requireAdmin(): Promise<SessionClaims> {
  const session = await requireSession();
  if (session.role !== 'ADMIN') redirect('/');
  return session;
}
