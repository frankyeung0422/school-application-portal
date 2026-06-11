'use server';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { publicEnv } from '@/lib/env';
import { isDemoMode, dbAvailable } from '@/lib/auth/db-mode';
import { createCheckoutSession, createPortalSession } from './subscriptions';
import { isValidPlan } from './stripe';

/**
 * Begin a hosted Stripe Checkout for the chosen plan.
 * - Not signed in → send to /register?plan=X (registration finishes the checkout).
 * - Demo / no-DB → no Stripe configured; bounce to pricing with a flag.
 * On success this redirects to Stripe's hosted page; control does not return.
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const plan = formData.get('plan');
  if (!isValidPlan(plan)) redirect('/pricing');

  const session = await getSession();
  if (!session) redirect(`/register?plan=${plan}`);

  if (isDemoMode() || !dbAvailable()) redirect('/pricing?error=unconfigured');

  let url: string | null = null;
  try {
    url = await createCheckoutSession({
      userId: session.sub,
      email: session.email,
      plan,
      successUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${publicEnv.NEXT_PUBLIC_APP_URL}/pricing?canceled=1`,
    });
  } catch (err) {
    console.error('[billing/checkout] createCheckoutSession failed:', (err as Error).message);
    redirect('/pricing?error=checkout');
  }
  if (!url) redirect('/pricing?error=checkout');
  redirect(url);
}

/**
 * Open the Stripe Customer Portal (manage / cancel / payment method).
 */
export async function openBillingPortalAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect('/login');

  let url: string;
  try {
    url = await createPortalSession(session.sub);
  } catch (err) {
    console.error('[billing/portal] createPortalSession failed:', (err as Error).message);
    redirect('/account/billing?error=portal');
  }
  redirect(url);
}
