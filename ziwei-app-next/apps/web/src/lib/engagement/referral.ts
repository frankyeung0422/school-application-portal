import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { stripe } from '@/lib/billing/stripe';

/**
 * Generate a friendly referral code for a user. Codes are 6 chars,
 * uppercase alphanumeric, avoiding ambiguous 0/O/1/I.
 */
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referral.findFirst({
    where: { referrerId: userId, refereeId: null },
  });
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const row = await prisma.referral.create({
        data: { code, referrerId: userId },
      });
      return row.code;
    } catch {
      // unique collision — retry
    }
  }
  throw new Error('Failed to generate unique referral code after 5 attempts');
}

/**
 * Mark a referral as redeemed by the referee, and create a one-month
 * Stripe coupon that both sides can use against their next invoice.
 *
 * Coupon is created with duration: 'once' and 100% off — applied via the
 * Stripe Customer object's `coupon` field. Because Stripe applies a
 * customer-level coupon to the next invoice only, this naturally caps the
 * value at exactly one month per side.
 *
 * Idempotent: re-running with the same code is a no-op after the first call.
 */
export async function redeemReferral(code: string, refereeUserId: string): Promise<boolean> {
  const ref = await prisma.referral.findUnique({ where: { code } });
  if (!ref || ref.refereeId) return false;
  if (ref.referrerId === refereeUserId) return false; // self-refer guard

  // Create a one-time 100%-off coupon shared by both sides.
  let couponId: string | null = null;
  try {
    const coupon = await stripe.coupons.create({
      duration: 'once',
      percent_off: 100,
      max_redemptions: 2,
      name: `Referral ${code}`,
      metadata: { referralCode: code, referrerId: ref.referrerId, refereeId: refereeUserId },
    });
    couponId = coupon.id;

    // Apply to referrer's customer (if any) — discount lands on their next invoice
    const referrerSub = await prisma.subscription.findUnique({
      where: { userId: ref.referrerId },
    });
    if (referrerSub?.stripeCustomerId) {
      await stripe.customers.update(referrerSub.stripeCustomerId, { coupon: couponId });
    }

    // Apply to referee's customer (if exists yet — they may register first then checkout)
    const refereeSub = await prisma.subscription.findUnique({
      where: { userId: refereeUserId },
    });
    if (refereeSub?.stripeCustomerId) {
      await stripe.customers.update(refereeSub.stripeCustomerId, { coupon: couponId });
    }
  } catch (err) {
    console.error('[referral] Stripe coupon create failed:', (err as Error).message);
    // Continue: mark redeemed anyway so re-redemption is blocked. Manual ops can retry.
  }

  await prisma.referral.update({
    where: { code },
    data: {
      refereeId: refereeUserId,
      redeemedAt: new Date(),
      rewardApplied: couponId !== null,
      stripeCouponId: couponId,
    },
  });

  return true;
}
