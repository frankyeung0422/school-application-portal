import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open the Stripe Customer Portal — lets the user update payment method,
 * cancel/resume subscription, change plan, view invoices.
 *
 * POST /api/stripe/portal → { url }
 */
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "auth_required", redirect: "/login" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4343";
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/subscription`,
  });

  return NextResponse.json({ url: portal.url });
}
