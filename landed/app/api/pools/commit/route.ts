import { NextResponse } from "next/server";
import { commitToPool } from "@/lib/pools-service";
import { requireCustomer } from "@/lib/auth";
import { jsonError, originOf, readBody } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const customer = await requireCustomer();
    const body = await readBody(req);
    const r = await commitToPool({ slug: body.slug ?? "", customer, qty: Number(body.qty ?? 1), origin: originOf(req) });
    return NextResponse.json({ commitmentId: r.commitment.id, redirectUrl: r.redirectUrl });
  } catch (e) {
    return jsonError(e);
  }
}
