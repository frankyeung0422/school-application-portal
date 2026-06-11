import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, tokenHash } from './password';
import { sendEmail } from '@/lib/email/client';
import { renderPasswordResetEmail } from '@/emails/password-reset';

const RESET_TOKEN_BYTES = 32;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a raw URL-safe token; store ONLY its SHA-256 hash in the DB.
 * The raw token is emailed to the user and is the lookup key on /reset/[token].
 */
function generateToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString('base64url');
}

/**
 * Look up user by email; if found, create a PasswordReset row + send email.
 * Always succeeds silently if user is missing (callers must not leak that
 * distinction to the user; see forgotPasswordAction).
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // intentionally silent

  const token = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.passwordReset.create({
    data: { userId: user.id, token: tokenHash(token), expiresAt },
  });

  const { subject, html } = renderPasswordResetEmail({ email, token });
  await sendEmail({ to: email, subject, html });
}

/**
 * Read-side check used by /reset/[token] Server Component before rendering
 * the form. Returns the token row if still valid, null otherwise.
 */
export async function readActiveResetToken(rawToken: string) {
  const row = await prisma.passwordReset.findUnique({
    where: { token: tokenHash(rawToken) },
  });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt < new Date()) return null;
  return row;
}

export type ConsumeResult =
  | { ok: true; user: { id: string; email: string; role: 'USER' | 'ADMIN' } }
  | { ok: false; error: string };

/**
 * Atomic consume: mark token used, hash + write new password.
 * Race-safe via updateMany with where clauses that check usedAt + expiresAt.
 */
export async function consumePasswordResetToken(
  rawToken: string,
  newPassword: string,
): Promise<ConsumeResult> {
  const hash = tokenHash(rawToken);
  const row = await prisma.passwordReset.findUnique({ where: { token: hash } });
  if (!row) return { ok: false, error: '連結無效或已使用,請重新申請' };
  if (row.usedAt) return { ok: false, error: '連結已使用,請重新申請' };
  if (row.expiresAt < new Date()) return { ok: false, error: '連結已過期,請重新申請' };

  const passwordHash = await hashPassword(newPassword);

  // Atomic mark-used; updateMany returns count, lets us detect race losers.
  const claim = await prisma.passwordReset.updateMany({
    where: { token: hash, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, error: '連結已被使用,請重新申請' };

  const user = await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash, lastSeenAt: new Date() },
    select: { id: true, email: true, role: true },
  });
  return { ok: true, user };
}
