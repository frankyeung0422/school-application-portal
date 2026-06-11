import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

/**
 * Auth rate limiters (Upstash Redis sliding window).
 *
 * Keying strategy: `IP + email-lowercase` so the same email tried from many
 * IPs AND the same IP trying many emails both get caught. Empty email
 * (e.g. malformed input) falls back to IP-only — still useful against bots.
 *
 * Soft-fail: when UPSTASH_REDIS_REST_URL is unset (Path A, local dev), all
 * checks return `{ ok: true }` so the action still proceeds. In production,
 * unset Upstash logs a warning every call but still permits.
 */

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  _redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _redis;
}

function makeLimiter(prefix: string, limit: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    prefix: `auth:${prefix}`,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    analytics: false,
  });
}

let _login: Ratelimit | null | undefined;
let _forgot: Ratelimit | null | undefined;
let _magic: Ratelimit | null | undefined;

export function loginLimiter() {
  if (_login !== undefined) return _login;
  _login = makeLimiter('login', 5, 10 * 60); // 5 / 10min
  return _login;
}
export function forgotLimiter() {
  if (_forgot !== undefined) return _forgot;
  _forgot = makeLimiter('forgot', 3, 60 * 60); // 3 / hour
  return _forgot;
}
export function magicLimiter() {
  if (_magic !== undefined) return _magic;
  _magic = makeLimiter('magic', 3, 60 * 60); // 3 / hour
  return _magic;
}

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Check a limiter. Soft-fails open when Upstash is not configured (Path A).
 * In production, a warning is logged so the operator notices.
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<LimitResult> {
  if (!limiter) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[auth/rate-limit] Upstash not configured — open-failing in production');
    }
    return { ok: true };
  }
  const r = await limiter.limit(key);
  if (r.success) return { ok: true };
  const retryAfterSec = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return { ok: false, retryAfterSec };
}

/**
 * Helper to derive a rate-limit key from an incoming request + optional email.
 * Server Actions don't get a Request object directly; pass headers from
 * `headers()` in the action wrapper.
 */
export function rateLimitKey(ip: string | null, email: string | null): string {
  const i = ip ?? 'unknown';
  const e = (email ?? '').toLowerCase().trim();
  return `${i}|${e}`;
}
