import { getFlag } from "../settings";
import { mockProvider } from "./mock";
import { stripeConfigured, stripeIsLiveKey, stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

export * from "./types";

/**
 * Stripe when configured, else the mock. Production never silently falls back
 * to mock payments.
 */
export function getProvider(): PaymentProvider {
  const wanted = process.env.PAYMENT_DRIVER ?? "mock";
  if (wanted === "stripe" && stripeConfigured()) return stripeProvider;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error(`Payment driver '${wanted}' is not configured`);
  }
  return mockProvider;
}

export function getProviderById(id: string): PaymentProvider {
  return id === "stripe" ? stripeProvider : mockProvider;
}

/**
 * Real cards are charged only when a live key is present AND an operator has
 * flipped `payments.liveUnlocked` — a pasted key alone must never start taking
 * real money (clonecompany's canChargeRealCards rule).
 */
export async function assertChargeAllowed(provider: PaymentProvider) {
  if (provider.id !== "stripe" || !stripeIsLiveKey()) return;
  if ((await getFlag("payments.liveUnlocked", "NO")) !== "YES") {
    throw new Error("Live Stripe key present but payments.liveUnlocked is not YES — refusing to charge real cards");
  }
}
