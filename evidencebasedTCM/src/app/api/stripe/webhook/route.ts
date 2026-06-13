import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { getStripe, tierFromPriceId, roleForSubscription } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook handler — receives subscription lifecycle events and
 * synchronizes our local Subscription row + flips User.role accordingly.
 *
 * Configure this URL in Stripe Dashboard → Developers → Webhooks:
 *   https://your-domain.example/api/stripe/webhook
 *
 * Listen for:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `signature_verify_failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        await syncSubscriptionFromEvent(event);
        break;
      default:
        // Ignore other event types
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function syncSubscriptionFromEvent(event: Stripe.Event) {
  const stripe = getStripe();

  // Resolve the Stripe subscription object from the event payload
  let stripeSubId: string | null = null;
  let customerId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const sess = event.data.object as Stripe.Checkout.Session;
    stripeSubId = typeof sess.subscription === "string" ? sess.subscription : sess.subscription?.id ?? null;
    customerId = typeof sess.customer === "string" ? sess.customer : sess.customer?.id ?? null;
  } else if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    stripeSubId = sub.id;
    customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  } else if (event.type.startsWith("invoice.")) {
    const inv = event.data.object as Stripe.Invoice;
    // Stripe types: invoice.subscription is on legacy types but always present in real payloads
    const subRef = (inv as unknown as { subscription?: string | { id: string } | null }).subscription;
    stripeSubId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
    customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
  }

  if (!stripeSubId) {
    console.warn(`[stripe webhook] no subscription id resolved for event ${event.type}`);
    return;
  }

  // Pull the current state of the subscription from Stripe (source of truth)
  const sub = await stripe.subscriptions.retrieve(stripeSubId);
  const priceId = sub.items.data[0]?.price.id ?? null;
  const tier = priceId ? tierFromPriceId(priceId) : null;

  // Find the local user — first by stripeCustomerId on Subscription table,
  // fall back to userId stored in subscription metadata.
  let userId: string | null = null;
  const local = customerId
    ? await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } })
    : null;
  if (local) userId = local.userId;
  else if (sub.metadata?.userId) userId = sub.metadata.userId;

  if (!userId) {
    console.warn(`[stripe webhook] could not resolve userId for sub ${stripeSubId}`);
    return;
  }

  // Compute current_period_end (typed as number on Stripe.Subscription.items)
  const periodEndUnix = sub.items.data[0]?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  // Upsert the local subscription row
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      tier: tier ?? "professional",
      status: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      tier: tier ?? "professional",
      status: sub.status,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });

  // Sync the User.role to match the subscription state
  const newRole = roleForSubscription(sub.status, tier);
  await prisma.user.update({ where: { id: userId }, data: { role: newRole } });

  console.log(`[stripe webhook] synced user=${userId} sub=${sub.id} status=${sub.status} role=${newRole}`);
}
