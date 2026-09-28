import { NextResponse } from "next/server";
import { stripeConfigured, stripeProvider } from "@/lib/payments/stripe";
import { processPaymentEvent } from "@/lib/orders";

export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "stripe not configured" }, { status: 404 });
  const raw = await req.text();
  const event = await stripeProvider.verifyWebhook(raw, req.headers);
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  try {
    const r = await processPaymentEvent("stripe", event, raw);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    // 500 makes Stripe retry; WebhookEvent dedupe keeps the retry idempotent.
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
