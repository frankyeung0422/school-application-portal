import { NextResponse } from "next/server";
import { createQuote } from "@/lib/orders";
import { currentCustomer } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";
import { safeJson } from "@/lib/format";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const customer = await currentCustomer();
    const q = await createQuote(Number(body.productId), Number(body.qty ?? 1), customer?.id ?? null);
    const b = safeJson<{ beatsBuyerRouteByCents?: number | null; buyerRouteCents?: number | null }>(q.breakdown, {});
    return NextResponse.json({
      quoteId: q.id,
      qty: q.qty,
      totalHkdCents: q.totalHkdCents,
      unitPriceHkdCents: q.unitPriceHkdCents,
      expiresAt: q.expiresAt.toISOString(),
      beatsBuyerRouteByCents: b.beatsBuyerRouteByCents ?? null,
      buyerRouteCents: b.buyerRouteCents ?? null,
      fxBufferPct: q.fxBufferPct,
    });
  } catch (e) {
    return jsonError(e);
  }
}
