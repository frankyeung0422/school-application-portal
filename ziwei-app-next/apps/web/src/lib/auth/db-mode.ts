import 'server-only';

/**
 * "Is the configured DATABASE_URL pointing at a real DB?"
 *
 * Path A bootstrap (`start-dev-pathA.bat`) writes a placeholder
 * `postgresql://placeholder@localhost:5432/placeholder` so the design pages
 * render without a real Postgres. Any Prisma call against that URL throws.
 *
 * Mirror the helper in `lib/chart/actions.ts` — keep both in sync.
 */
export function dbAvailable(): boolean {
  const url = process.env.DATABASE_URL || '';
  if (!url) return false;
  return !url.includes('placeholder');
}

/**
 * Demo mode is allowed only when (a) there's no real DB AND (b) we're not
 * in a production build. Production with a missing DB is a real outage and
 * should NOT silently accept logins.
 */
export function isDemoMode(): boolean {
  return !dbAvailable() && process.env.NODE_ENV !== 'production';
}

/**
 * Cheap deterministic hash for "synthetic user id" in demo mode.
 * Not security-relevant; only used as a stable session.sub for the cookie.
 */
export function demoUserId(email: string): string {
  let h = 5381;
  const e = email.toLowerCase();
  for (let i = 0; i < e.length; i++) h = ((h << 5) + h + e.charCodeAt(i)) | 0;
  return `demo_${(h >>> 0).toString(36)}`;
}
