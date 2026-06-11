import 'server-only';
import Stripe from 'stripe';
import { env } from '@/lib/env';

// Lazy singleton — constructed on first request, not at module-load.
// This lets `next build` (which has no STRIPE_SECRET_KEY in CI) succeed.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured (runtime env)');
  }
  _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.basil' as Stripe.LatestApiVersion,
    appInfo: { name: 'ziwei-pavilion', version: '0.1.0' },
  });
  return _stripe;
}

// Proxy keeps existing `stripe.x.y()` call sites working while staying lazy.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = (client as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});

export const PRICE_IDS = {
  get monthly() { return env.STRIPE_PRICE_MONTHLY; },
  get annual() { return env.STRIPE_PRICE_ANNUAL; },
  get master() { return env.STRIPE_PRICE_MASTER; },
} as const;

export type PlanKey = 'monthly' | 'annual' | 'master';

const VALID_PLANS = new Set<PlanKey>(['monthly', 'annual', 'master']);

/** Narrow arbitrary input (form value, query param) to a known PlanKey. */
export function isValidPlan(plan: unknown): plan is PlanKey {
  return typeof plan === 'string' && VALID_PLANS.has(plan as PlanKey);
}
