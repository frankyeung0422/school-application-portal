import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { getStripe, isStripeConfigured, priceIdForTier } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a Stripe Checkout session for the requested tier.
 *
 * POST /api/stripe/checkout
 *   body: { tier: "professional" | "clinic", trialDays?: number }
 * → { url: <stripe-checkout-url> }
 *
 * Anonymous users get redirected to /login first.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs in .env." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "auth_required", redirect: "/login" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  const { tier, trialDays } = (await req.json().catch(() => ({}))) as {
    tier?: "professional" | "clinic";
    trialDays?: number;
  };

  if (tier !== "professional" && tier !== "clinic") {
    return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
  }

  const stripe = getStripe();
  const priceId = priceIdForTier(tier);

  // Find or create the Stripe customer for this user
  let stripeCustomerId: string | null = null;
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing?.stripeCustomerId) {
    stripeCustomerId = existing.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      name: session.user.name ?? undefined,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    // Stub the local subscription row so we can find it on webhook
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        tier,
        status: "incomplete",
      },
      update: { stripeCustomerId },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4343";
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/subscription?status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing?status=cancelled`,
    subscription_data: {
      trial_period_days: typeof trialDays === "number" && trialDays > 0 ? Math.min(trialDays, 30) : 14,
      metadata: { userId, tier },
    },
    metadata: { userId, tier },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkout.url });
}
