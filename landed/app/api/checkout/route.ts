import { NextResponse } from "next/server";
import { checkoutQuote } from "@/lib/orders";
import { requireCustomer } from "@/lib/auth";
import { jsonError, originOf, readBody } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const customer = await requireCustomer();
    const body = await readBody(req);
    const r = await checkoutQuote({
      quoteId: body.quoteId ?? "",
      customer,
      shipping: {
        name: (body.name ?? "").trim().slice(0, 80),
        phone: (body.phone ?? "").trim().slice(0, 30),
        address: (body.address ?? "").trim().slice(0, 300),
      },
      origin: originOf(req),
    });
    return NextResponse.json({ orderId: r.order.id, redirectUrl: r.redirectUrl });
  } catch (e) {
    return jsonError(e);
  }
}
