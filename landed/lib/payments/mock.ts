import { randomUUID } from "node:crypto";
import type { PaymentProvider } from "./types";

// Keyless provider. Everything it produces is TEST money.
//
// Checkout and setup "redirect" to our own /api/payments/mock/complete route,
// which feeds a normalized event through the same webhook pipeline Stripe
// uses — so the order/pool code paths exercised in dev are the real ones.
//
// Deterministic declines for tests: a payment method whose ref contains
// "decline" (created when the buyer's email contains "+decline") is declined.

export const mockProvider: PaymentProvider = {
  id: "mock",

  async createCheckout(input) {
    const sessionId = `mock_cs_${randomUUID()}`;
    const qs = new URLSearchParams({
      session: sessionId,
      kind: "checkout",
      orderId: input.orderId,
      amount: String(input.amountHkdCents),
      next: input.successUrl,
    });
    return { sessionId, redirectUrl: `/api/payments/mock/complete?${qs}` };
  },

  async createSetup(input) {
    const sessionId = `mock_ss_${randomUUID()}`;
    const customerRef = input.customerRef ?? `mock_cus_${randomUUID().slice(0, 8)}`;
    const pm = input.email.includes("+decline") ? `pm_mock_decline_${input.commitmentId}` : `pm_mock_${input.commitmentId}`;
    const qs = new URLSearchParams({
      session: sessionId,
      kind: "setup",
      commitmentId: String(input.commitmentId),
      customerRef,
      pm,
      next: input.successUrl,
    });
    return { sessionId, redirectUrl: `/api/payments/mock/complete?${qs}`, customerRef };
  },

  async authorize(input) {
    if (input.paymentMethodRef.includes("decline")) {
      return { ref: `mock_pi_declined_${randomUUID().slice(0, 8)}`, status: "DECLINED", message: "card_declined (mock)" };
    }
    return { ref: `mock_pi_${randomUUID().slice(0, 12)}`, status: "AUTHORIZED" };
  },

  async capture() {
    return { status: "SUCCEEDED" };
  },

  async cancelAuthorization() {},

  async refund() {
    return { ref: `mock_re_${randomUUID().slice(0, 12)}`, status: "SUCCEEDED" };
  },

  async verifyWebhook(rawBody) {
    try {
      const b = JSON.parse(rawBody) as Record<string, unknown>;
      return {
        eventId: String(b.eventId ?? `mock_evt_${randomUUID()}`),
        type: (b.type as never) ?? "IGNORED",
        realness: "TEST",
        sessionId: b.sessionId as string | undefined,
        paymentRef: b.paymentRef as string | undefined,
        customerRef: b.customerRef as string | undefined,
        paymentMethodRef: b.paymentMethodRef as string | undefined,
        amountHkdCents: b.amountHkdCents as number | undefined,
        metadata: (b.metadata as Record<string, string>) ?? {},
      };
    } catch {
      return null;
    }
  },
};
