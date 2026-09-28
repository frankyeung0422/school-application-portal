import { NextResponse } from "next/server";
import { compareSupermarketBasket } from "@/lib/supermarket/view";
import { jsonError } from "@/lib/http";

// Stateless: the basket lives in the visitor's browser; this only prices it.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: { productId: unknown; qty: unknown }[]; includeDelivery?: boolean };
    const lines = (body.lines ?? [])
      .map((l) => ({ productId: Number(l.productId), qty: Number(l.qty) }))
      .filter((l) => Number.isInteger(l.productId) && Number.isInteger(l.qty) && l.qty > 0);
    if (lines.length === 0) return NextResponse.json({ error: "購物清單係空嘅 Basket is empty" }, { status: 400 });
    if (lines.length > 100) return NextResponse.json({ error: "最多 100 項 At most 100 lines" }, { status: 400 });
    return NextResponse.json(await compareSupermarketBasket(lines, Boolean(body.includeDelivery)));
  } catch (e) {
    return jsonError(e);
  }
}
