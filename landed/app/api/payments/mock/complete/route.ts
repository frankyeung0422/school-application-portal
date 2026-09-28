import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getProvider, type NormalizedEvent } from "@/lib/payments";
import { processPaymentEvent } from "@/lib/orders";
import { originOf } from "@/lib/http";

// Stands in for the hosted payment page when the mock provider is active: it
// turns the "customer paid / saved a card" moment into the same normalized
// event a Stripe webhook produces, so the real order and pool code runs.
// Unreachable whenever a real provider is configured.
export async function GET(req: Request) {
  if (getProvider().id !== "mock") return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind");
  let event: NormalizedEvent;
  if (kind === "checkout") {
    event = {
      eventId: `mock_evt_${q.get("session")}`,
      type: "CHECKOUT_PAID",
      realness: "TEST",
      sessionId: q.get("session") ?? undefined,
      paymentRef: `mock_pi_${randomUUID().slice(0, 12)}`,
      amountHkdCents: Number(q.get("amount")),
      metadata: { orderId: q.get("orderId") ?? "" },
    };
  } else if (kind === "setup") {
    event = {
      eventId: `mock_evt_${q.get("session")}`,
      type: "SETUP_COMPLETED",
      realness: "TEST",
      sessionId: q.get("session") ?? undefined,
      customerRef: q.get("customerRef") ?? undefined,
      paymentMethodRef: q.get("pm") ?? undefined,
      metadata: { commitmentId: q.get("commitmentId") ?? "" },
    };
  } else {
    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  }
  try {
    await processPaymentEvent("mock", event, JSON.stringify(event));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
  const origin = originOf(req);
  const next = q.get("next") ?? "/account";
  // Follow `next` only when it points back at this site.
  let target = new URL("/account", origin);
  try {
    const parsed = new URL(next, origin);
    if (parsed.origin === new URL(origin).origin) target = parsed;
  } catch {
    // keep /account
  }
  return NextResponse.redirect(target, 303);
}
