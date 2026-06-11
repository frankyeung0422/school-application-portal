'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, verifyPassword, isLegacyBcryptHash } from './password';
import { createSession, destroySession } from './session';
import { isDemoMode, dbAvailable, demoUserId } from './db-mode';
import { checkLimit, loginLimiter, forgotLimiter, magicLimiter, rateLimitKey } from './rate-limit';

async function clientIp(): Promise<string | null> {
  const h = await headers();
  // x-forwarded-for has priority on Vercel/most proxies; fall back to x-real-ip
  return (h.get('x-forwarded-for')?.split(',')[0]?.trim()) || h.get('x-real-ip') || null;
}

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

const emailOnlySchema = z.object({
  email: z.string().email().max(254),
});

export type AuthState = { error?: string; ok?: boolean; message?: string };

const INVALID_CREDENTIALS = '電郵或密碼錯誤';
const GENERIC_FAIL = '登入失敗,請稍後再試';
const GENERIC_RESET_SENT = '若該電郵已註冊,我們已寄出重設連結。請檢查收件匣 (及垃圾郵件)。';

/**
 * Login. Survives Path A (no DB) via demo mode, structured-errors on any
 * unexpected throw.
 */
export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: '請輸入有效的電郵與至少 8 字符密碼' };

  const email = parsed.data.email.toLowerCase();

  // Rate limit: 5 attempts / 10min / (IP+email)
  const limit = await checkLimit(loginLimiter(), rateLimitKey(await clientIp(), email));
  if (!limit.ok) return { error: `太多嘗試,請於 ${limit.retryAfterSec} 秒後再試` };

  // Path A: no real DB — synthetic session
  if (isDemoMode()) {
    try {
      await createSession({ sub: demoUserId(email), email, role: 'USER' });
    } catch (err) {
      console.warn('[auth/login] demo session create failed:', (err as Error).message);
      return { error: GENERIC_FAIL };
    }
    redirect('/dashboard?welcome=demo');
  }

  if (!dbAvailable()) {
    console.error('[auth/login] DATABASE_URL not configured in production build');
    return { error: '服務暫時無法使用,請稍後再試' };
  }

  let resolvedUser: { id: string; email: string; role: 'USER' | 'ADMIN' } | null = null;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return { error: INVALID_CREDENTIALS };

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) return { error: INVALID_CREDENTIALS };

    // Migrated bcrypt → upgrade to scrypt on first successful login
    const passwordHash = isLegacyBcryptHash(user.passwordHash)
      ? await hashPassword(parsed.data.password)
      : undefined;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), ...(passwordHash ? { passwordHash } : {}) },
    });
    resolvedUser = { id: user.id, email: user.email, role: user.role };
  } catch (err) {
    console.warn('[auth/login] failed:', (err as Error).message);
    return { error: GENERIC_FAIL };
  }

  await createSession({ sub: resolvedUser.id, email: resolvedUser.email, role: resolvedUser.role });
  redirect('/dashboard');
}

/**
 * Register. Same Path A + structured-error treatment.
 */
export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: '密碼至少需 8 個字符,並請輸入有效電郵' };
  const email = parsed.data.email.toLowerCase();

  if (isDemoMode()) {
    try {
      await createSession({ sub: demoUserId(email), email, role: 'USER' });
    } catch (err) {
      console.warn('[auth/register] demo session create failed:', (err as Error).message);
      return { error: '註冊失敗,請稍後再試' };
    }
    redirect('/dashboard?welcome=demo');
  }

  if (!dbAvailable()) {
    console.error('[auth/register] DATABASE_URL not configured in production build');
    return { error: '服務暫時無法使用,請稍後再試' };
  }

  let resolvedUser: { id: string; email: string; role: 'USER' | 'ADMIN' } | null = null;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: '此電郵已註冊,請直接登入' };

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: 'USER', emailPrefs: { create: {} } },
    });
    resolvedUser = { id: user.id, email: user.email, role: user.role };
  } catch (err) {
    console.warn('[auth/register] failed:', (err as Error).message);
    return { error: '註冊失敗,請稍後再試' };
  }

  await createSession({ sub: resolvedUser.id, email: resolvedUser.email, role: resolvedUser.role });

  // If the user picked a plan (register form selector, or a /register?plan=X
  // pricing CTA), continue straight into Stripe checkout instead of dropping
  // them on the dashboard. The "略過,先用免費版" button submits intent=free,
  // which skips checkout and lands on the dashboard as a free account.
  const skipPlan = formData.get('intent') === 'free';
  const planRaw = skipPlan ? null : formData.get('plan');
  const { isValidPlan } = await import('@/lib/billing/stripe');
  if (isValidPlan(planRaw)) {
    let checkoutUrl: string | null = null;
    try {
      const { createCheckoutSession } = await import('@/lib/billing/subscriptions');
      const { publicEnv } = await import('@/lib/env');
      checkoutUrl = await createCheckoutSession({
        userId: resolvedUser.id,
        email: resolvedUser.email,
        plan: planRaw,
        successUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
      });
    } catch (err) {
      console.warn('[auth/register] post-register checkout failed:', (err as Error).message);
    }
    if (checkoutUrl) redirect(checkoutUrl);
  }

  redirect('/dashboard?welcome=1');
}

export async function logoutAction(_formData?: FormData) {
  await destroySession();
  redirect('/');
}

/**
 * Forgot-password — always returns the same generic message so attackers
 * can't enumerate registered emails.
 */
export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: '請輸入有效的電郵' };
  const email = parsed.data.email.toLowerCase();

  const limit = await checkLimit(forgotLimiter(), rateLimitKey(await clientIp(), email));
  if (!limit.ok) return { error: `太多嘗試,請於 ${limit.retryAfterSec} 秒後再試` };

  if (isDemoMode() || !dbAvailable()) {
    return { ok: true, message: GENERIC_RESET_SENT };
  }

  try {
    const { sendPasswordResetEmail } = await import('./password-reset');
    await sendPasswordResetEmail(email);
  } catch (err) {
    console.warn('[auth/forgot] failed (returning generic message anyway):', (err as Error).message);
  }
  return { ok: true, message: GENERIC_RESET_SENT };
}

/**
 * Reset-password — token already validated server-side in the page; here
 * we accept (token, newPassword), consume the token atomically, sign in.
 */
const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
});

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { error: '密碼至少需 8 個字符' };

  if (isDemoMode() || !dbAvailable()) {
    return { error: '示範模式下無此功能 — 請改用正式註冊' };
  }

  let resolvedUser: { id: string; email: string; role: 'USER' | 'ADMIN' } | null = null;
  try {
    const { consumePasswordResetToken } = await import('./password-reset');
    const result = await consumePasswordResetToken(parsed.data.token, parsed.data.password);
    if (!result.ok) return { error: result.error };
    resolvedUser = result.user;
  } catch (err) {
    console.warn('[auth/reset] failed:', (err as Error).message);
    return { error: '重設失敗,請重新申請連結' };
  }

  await createSession({ sub: resolvedUser.id, email: resolvedUser.email, role: resolvedUser.role });
  redirect('/dashboard?welcome=reset');
}

/**
 * Magic-link request — emails a 10-min single-use login link.
 * In Path A demo mode, signs in immediately (skips email).
 */
export async function magicLinkRequestAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailOnlySchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: '請輸入有效的電郵' };
  const email = parsed.data.email.toLowerCase();

  const limit = await checkLimit(magicLimiter(), rateLimitKey(await clientIp(), email));
  if (!limit.ok) return { error: `太多嘗試,請於 ${limit.retryAfterSec} 秒後再試` };

  if (isDemoMode() || !dbAvailable()) {
    try {
      await createSession({ sub: demoUserId(email), email, role: 'USER' });
    } catch (err) {
      console.warn('[auth/magic] demo session create failed:', (err as Error).message);
      return { error: '示範模式下登入失敗' };
    }
    redirect('/dashboard?welcome=demo');
  }

  try {
    const { sendMagicLinkEmail } = await import('./magic-link');
    await sendMagicLinkEmail(email);
  } catch (err) {
    console.warn('[auth/magic] failed (returning generic message anyway):', (err as Error).message);
  }
  return {
    ok: true,
    message: '若該電郵有效,登入連結已寄出。連結 10 分鐘內有效。',
  };
}
