import 'server-only';
import { stripe, PRICE_IDS, type PlanKey } from './stripe';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';
import { publicEnv } from '@/lib/env';
import type { SubscriptionPlan as PrismaPlan } from '@prisma/client';

const PLAN_TO_PRISMA: Record<PlanKey, PrismaPlan> = {
  monthly: 'MONTHLY',
  annual: 'ANNUAL',
  master: 'MASTER',
};

/**
 * Get-or-create the Stripe customer for a user. Mirrors id into local DB.
 */
export async function ensureStripeCustomer(userId: string, email: string): Promise<string> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customer.id,
      plan: 'FREE',
      status: 'INCOMPLETE',
    },
    update: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a hosted Checkout Session for a plan with the configured trial.
 * Returns the Stripe-hosted URL to redirect the customer to.
 */
export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  plan: PlanKey;
  successUrl: string;
  cancelUrl: string;
}): Promise<string | null> {
  const customerId = await ensureStripeCustomer(params.userId, params.email);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: PRICE_IDS[params.plan], quantity: 1 }],
    subscription_data: {
      trial_period_days: env.STRIPE_TRIAL_DAYS,
      trial_settings: {
        end_behavior: { missing_payment_method: 'cancel' },
      },
      metadata: { userId: params.userId, plan: PLAN_TO_PRISMA[params.plan] },
    },
    payment_method_collection: 'always', // card required for trial
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { userId: params.userId, plan: PLAN_TO_PRISMA[params.plan] },
  });

  return session.url;
}

/**
 * Customer Portal session for self-serve cancel/upgrade/payment-method.
 */
export async function createPortalSession(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeCustomerId) throw new Error('No Stripe customer for user');

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/account/billing`,
  });
  return session.url;
}

/**
 * Mark a subscription as canceled (or scheduled to cancel at period end).
 */
export async function cancelSubscription(userId: string, immediately = false) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub?.stripeSubscriptionId) throw new Error('No active Stripe subscription');

  if (immediately) {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
  } else {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }
}
