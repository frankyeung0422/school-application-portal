import Stripe from "stripe";

/**
 * Lazily-initialized Stripe SDK client.
 * Throws if STRIPE_SECRET_KEY is missing — callers should handle the
 * absence (e.g. show "checkout not configured" UI) rather than crash.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PROFESSIONAL_PRICE_ID &&
    process.env.STRIPE_CLINIC_PRICE_ID,
  );
}

/** Map a tier name to its Stripe Price ID from env. */
export function priceIdForTier(tier: "professional" | "clinic"): string {
  const id = tier === "professional"
    ? process.env.STRIPE_PROFESSIONAL_PRICE_ID
    : process.env.STRIPE_CLINIC_PRICE_ID;
  if (!id) throw new Error(`Stripe price ID missing for tier: ${tier}`);
  return id;
}

/** Map a Stripe Price ID back to a tier (used in webhook handlers). */
export function tierFromPriceId(priceId: string): "professional" | "clinic" | null {
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) return "professional";
  if (priceId === process.env.STRIPE_CLINIC_PRICE_ID) return "clinic";
  return null;
}

/** Map a Stripe subscription status + tier to the local UserRole. */
export function roleForSubscription(
  status: string,
  tier: "professional" | "clinic" | null,
): "PUBLIC" | "PRACTITIONER" | "EDITOR" {
  // Active or trialing subscriptions grant access; everything else reverts to PUBLIC.
  if (status === "active" || status === "trialing") {
    if (tier === "clinic") return "EDITOR";
    if (tier === "professional") return "PRACTITIONER";
  }
  return "PUBLIC";
}
