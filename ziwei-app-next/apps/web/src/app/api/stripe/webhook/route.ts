import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db/prisma';
import { env } from '@/lib/env';
import { sendEmail } from '@/lib/email/client';
import { renderTrialEndingEmail } from '@/emails/trial-ending';
import { renderPaymentFailedEmail } from '@/emails/payment-failed';

export const runtime = 'nodejs'; // need raw body
export const dynamic = 'force-dynamic';

/**
 * Stripe webhook handler.
 *
 * Steps:
 *  1. Read raw body + signature header, verify with STRIPE_WEBHOOK_SECRET
 *  2. Dedup via webhook_events table (event.id is the idempotency key)
 *  3. Dispatch on event.type → update local Subscription state
 *  4. Mark event processed (or store error)
 */
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('Missing stripe-signature', { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'sig failed';
    return new NextResponse(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  // Idempotency: skip if already processed
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.processedAt) {
    return NextResponse.json({ received: true, deduped: true });
  }
  await prisma.webhookEvent.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      source: 'stripe',
      eventType: event.type,
      payload: event as unknown as object,
    },
    update: {},
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialEnding(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Unknown event — stored but no-op.
        break;
    }

    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date() },
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.webhookEvent.update({
      where: { eventId: event.id },
      data: { error: msg },
    });
    // 500 lets Stripe retry per their schedule.
    return new NextResponse(`Handler error: ${msg}`, { status: 500 });
  }
}

// ── Handlers ────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string | null;
  if (!userId || !subscriptionId) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionToDb(userId, sub);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await syncSubscriptionToDb(userId, sub);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      stripeSubscriptionId: sub.id,
    },
  });
}

async function handleTrialEnding(sub: Stripe.Subscription) {
  // Fires ~3 days before trial_end. Best-effort reminder; never throw (email
  // failure must not block the webhook and trigger a Stripe retry storm).
  const userId = sub.metadata?.userId ?? (await userIdFromCustomer(sub.customer));
  const recipient = userId ? await loadRecipient(userId) : null;
  if (!recipient) {
    console.warn('[webhook] trial_will_end: no recipient for', sub.id);
    return;
  }

  const item = sub.items.data[0];
  const priceHKD = Math.round((item?.price?.unit_amount ?? 0) / 100);
  // Derive exact remaining days from trial_end (Stripe nominally fires at 3 days).
  const daysLeft = sub.trial_end
    ? Math.max(1, Math.ceil((sub.trial_end * 1000 - Date.now()) / 86_400_000))
    : 3;

  try {
    const { subject, html } = renderTrialEndingEmail({
      displayName: recipient.displayName,
      daysLeft,
      plan: planLowerFromPriceId(item?.price?.id ?? null),
      priceHKD,
    });
    await sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.warn('[webhook] trial-ending email failed:', (err as Error).message);
  }
}

async function handleInvoiceSucceeded(_invoice: Stripe.Invoice) {
  // Sync happens via customer.subscription.updated; this is a hook point for receipts.
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Dunning ladder — Stripe's smart retries drive attempt_count; the email copy
  // escalates across attempts 1→3 (see renderPaymentFailedEmail). Best-effort.
  const userId = await userIdFromCustomer(invoice.customer);
  const recipient = userId ? await loadRecipient(userId) : null;
  if (!recipient) {
    console.warn('[webhook] invoice.payment_failed: no recipient for', invoice.id);
    return;
  }

  const attemptNumber = Math.min(3, Math.max(1, invoice.attempt_count || 1)) as 1 | 2 | 3;
  const retryDate = invoice.next_payment_attempt
    ? new Date(invoice.next_payment_attempt * 1000)
    : undefined;

  try {
    const { subject, html } = renderPaymentFailedEmail({
      displayName: recipient.displayName,
      attemptNumber,
      retryDate,
    });
    await sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.warn('[webhook] payment-failed email failed:', (err as Error).message);
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function planFromPriceId(priceId: string | null): 'MONTHLY' | 'ANNUAL' | 'MASTER' | 'FREE' {
  if (!priceId) return 'FREE';
  if (priceId === env.STRIPE_PRICE_MONTHLY) return 'MONTHLY';
  if (priceId === env.STRIPE_PRICE_ANNUAL) return 'ANNUAL';
  if (priceId === env.STRIPE_PRICE_MASTER) return 'MASTER';
  return 'FREE';
}

/** Lowercase plan key for the email templates (default monthly when unknown). */
function planLowerFromPriceId(priceId: string | null): 'monthly' | 'annual' | 'master' {
  if (priceId === env.STRIPE_PRICE_ANNUAL) return 'annual';
  if (priceId === env.STRIPE_PRICE_MASTER) return 'master';
  return 'monthly';
}

/** Resolve our userId from a Stripe customer ref via the local subscription mirror. */
async function userIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const customerId = typeof customer === 'string' ? customer : customer?.id;
  if (!customerId) return null;
  const sub = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    select: { userId: true },
  });
  return sub?.userId ?? null;
}

/** Load the email recipient (transactional billing mail — no preference gate). */
async function loadRecipient(userId: string): Promise<{ email: string; displayName?: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, displayName: true },
  });
  if (!user) return null;
  return { email: user.email, displayName: user.displayName ?? undefined };
}

function mapStatus(s: Stripe.Subscription.Status): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'PAUSED' {
  switch (s) {
    case 'trialing': return 'TRIALING';
    case 'active': return 'ACTIVE';
    case 'past_due': return 'PAST_DUE';
    case 'canceled': return 'CANCELED';
    case 'unpaid': return 'PAST_DUE';
    case 'paused': return 'PAUSED';
    default: return 'INCOMPLETE';
  }
}

async function syncSubscriptionToDb(userId: string, sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  // Stripe's `current_period_start/end` live on the subscription, not the item,
  // in the SDK typings (v17+ / API 2025-09-30.basil).
  const subAny = sub as unknown as { current_period_start?: number; current_period_end?: number };
  const periodStart = subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : null;
  const periodEnd = subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : null;

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: sub.customer as string,
      stripeSubscriptionId: sub.id,
      plan: planFromPriceId(priceId),
      status: mapStatus(sub.status),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
    update: {
      stripeSubscriptionId: sub.id,
      plan: planFromPriceId(priceId),
      status: mapStatus(sub.status),
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    },
  });
}
