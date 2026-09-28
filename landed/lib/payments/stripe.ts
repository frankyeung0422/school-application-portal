import type Stripe from "stripe";
import type { PaymentProvider } from "./types";

// Stripe (HKD). Hosted Checkout for card entry (no card data touches us), a
// setup-mode Checkout to save a card for pools, then off-session manual-capture
// PaymentIntents at pool unlock.

let client: Stripe | null = null;

async function stripe(): Promise<Stripe> {
  if (!client) {
    const StripeCtor = (await import("stripe")).default;
    client = new StripeCtor(process.env.STRIPE_SECRET_KEY as string);
  }
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeIsLiveKey(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live_");
}

function metaStrings(m: Stripe.Metadata | null | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, String(v)]));
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(input) {
    const s = await stripe();
    const session = await s.checkout.sessions.create({
      mode: "payment",
      customer_email: input.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "hkd",
            unit_amount: input.amountHkdCents,
            product_data: { name: input.description.slice(0, 250) },
          },
        },
      ],
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      payment_intent_data: { metadata: { orderId: input.orderId, orderNumber: input.orderNumber } },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { sessionId: session.id, redirectUrl: session.url as string };
  },

  async createSetup(input) {
    const s = await stripe();
    const customerRef = input.customerRef ?? (await s.customers.create({ email: input.email })).id;
    const session = await s.checkout.sessions.create({
      mode: "setup",
      currency: "hkd",
      customer: customerRef,
      payment_method_types: ["card"],
      metadata: { commitmentId: String(input.commitmentId) },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    return { sessionId: session.id, redirectUrl: session.url as string, customerRef };
  },

  async authorize(input) {
    const s = await stripe();
    try {
      const pi = await s.paymentIntents.create(
        {
          amount: input.amountHkdCents,
          currency: "hkd",
          customer: input.customerRef ?? undefined,
          payment_method: input.paymentMethodRef,
          off_session: true,
          confirm: true,
          capture_method: "manual",
          metadata: input.metadata,
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return pi.status === "requires_capture"
        ? { ref: pi.id, status: "AUTHORIZED" }
        : { ref: pi.id, status: "DECLINED", message: `status ${pi.status}` };
    } catch (e) {
      const err = e as { type?: string; code?: string; message?: string; raw?: { payment_intent?: { id?: string } } };
      if (err.type === "StripeCardError") {
        return { ref: err.raw?.payment_intent?.id ?? "declined", status: "DECLINED", message: err.code ?? err.message };
      }
      throw e;
    }
  },

  async capture(ref, amountHkdCents) {
    const s = await stripe();
    try {
      const pi = await s.paymentIntents.capture(ref, { amount_to_capture: amountHkdCents });
      return pi.status === "succeeded" ? { status: "SUCCEEDED" } : { status: "FAILED", message: pi.status };
    } catch (e) {
      return { status: "FAILED", message: e instanceof Error ? e.message : String(e) };
    }
  },

  async cancelAuthorization(ref) {
    const s = await stripe();
    await s.paymentIntents.cancel(ref);
  },

  async refund(paymentRef, amountHkdCents) {
    const s = await stripe();
    const r = await s.refunds.create({ payment_intent: paymentRef, amount: amountHkdCents });
    return { ref: r.id, status: r.status === "succeeded" ? "SUCCEEDED" : r.status === "failed" ? "FAILED" : "PENDING" };
  },

  async verifyWebhook(rawBody, headers) {
    const s = await stripe();
    let event: Stripe.Event;
    try {
      event = s.webhooks.constructEvent(rawBody, headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET as string);
    } catch {
      return null;
    }
    const realness = event.livemode ? "REAL" : "TEST";
    const base = { eventId: event.id, realness, metadata: {} } as const;

    if (event.type === "checkout.session.completed") {
      const cs = event.data.object;
      if (cs.mode === "payment") {
        const piId = typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id;
        const metadata = metaStrings(cs.metadata);
        if (piId) {
          // Book the processor's actual fee, never our estimate of it.
          const pi = await s.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
          const charge = pi.latest_charge;
          const bt = charge && typeof charge !== "string" ? charge.balance_transaction : null;
          if (bt && typeof bt !== "string" && bt.currency === "hkd") metadata.feeHkdCents = String(bt.fee);
        }
        return {
          ...base,
          type: "CHECKOUT_PAID",
          sessionId: cs.id,
          paymentRef: typeof cs.payment_intent === "string" ? cs.payment_intent : cs.payment_intent?.id,
          amountHkdCents: cs.amount_total ?? undefined,
          metadata,
        };
      }
      if (cs.mode === "setup" && cs.setup_intent) {
        const si = await s.setupIntents.retrieve(typeof cs.setup_intent === "string" ? cs.setup_intent : cs.setup_intent.id);
        return {
          ...base,
          type: "SETUP_COMPLETED",
          sessionId: cs.id,
          customerRef: typeof cs.customer === "string" ? cs.customer : cs.customer?.id,
          paymentMethodRef: typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id,
          metadata: metaStrings(cs.metadata),
        };
      }
    }
    if (event.type === "charge.dispute.created") {
      const d = event.data.object;
      return {
        ...base,
        type: "DISPUTE_OPENED",
        paymentRef: typeof d.payment_intent === "string" ? d.payment_intent : d.payment_intent?.id,
        amountHkdCents: d.amount,
      };
    }
    return { ...base, type: "IGNORED" };
  },
};
