import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { tokenHash } from './password';
import { sendEmail } from '@/lib/email/client';
import { renderMagicLinkEmail } from '@/emails/magic-link';

const MAGIC_TOKEN_BYTES = 32;
const MAGIC_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateToken(): string {
  return randomBytes(MAGIC_TOKEN_BYTES).toString('base64url');
}

/**
 * Generate magic-link token, store SHA-256 hash, email raw token.
 * No enumeration: caller never tells the user whether their email was sent to.
 */
export async function sendMagicLinkEmail(email: string): Promise<void> {
  // Always issue a token even for non-existent emails, so timing is uniform.
  // The /api/auth/magic callback will create a User row on first successful click.
  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_TTL_MS);
  await prisma.magicLinkToken.create({
    data: { email, tokenHash: tokenHash(token), expiresAt },
  });

  const { subject, html } = renderMagicLinkEmail({ email, token });
  await sendEmail({ to: email, subject, html });
}

export type ConsumeMagicResult =
  | { ok: true; user: { id: string; email: string; role: 'USER' | 'ADMIN' } }
  | { ok: false; error: string };

/**
 * Atomic single-use consume. Upserts the User by email (creates one with
 * passwordHash=null on first link click — fully passwordless flow).
 */
export async function consumeMagicLinkToken(rawToken: string): Promise<ConsumeMagicResult> {
  const hash = tokenHash(rawToken);
  const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash: hash } });
  if (!row) return { ok: false, error: '連結無效' };
  if (row.usedAt) return { ok: false, error: '連結已使用' };
  if (row.expiresAt < new Date()) return { ok: false, error: '連結已過期' };

  // Race-safe mark-used
  const claim = await prisma.magicLinkToken.updateMany({
    where: { tokenHash: hash, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return { ok: false, error: '連結已被使用' };

  // Upsert user by email — first magic-link click creates the account
  const user = await prisma.user.upsert({
    where: { email: row.email },
    create: {
      email: row.email,
      role: 'USER',
      emailPrefs: { create: {} },
    },
    update: { lastSeenAt: new Date() },
    select: { id: true, email: true, role: true },
  });
  return { ok: true, user };
}
