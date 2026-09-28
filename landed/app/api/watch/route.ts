import { NextResponse } from "next/server";
import { addWatch } from "@/lib/demand";
import { currentCustomer } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";
import { pushToken } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const customer = await currentCustomer();
    const target = body.target ? Math.round(Number(body.target) * 100) : null;
    if (target !== null && !(target > 0)) {
      return NextResponse.json({ error: "目標價要大過 0 Target must be positive" }, { status: 400 });
    }
    const w = await addWatch({
      productId: Number(body.productId),
      email: body.email || customer?.email || "",
      targetHkdCents: target,
      customerId: customer?.id ?? null,
      promo: body.promo === "on" || body.promo === "true",
    });
    // Lets this browser turn on push for the same email right away (lib/push.ts).
    return NextResponse.json({ ok: true, watchId: w.id, email: w.email, pushToken: pushToken(w.email) });
  } catch (e) {
    if (e instanceof Error && /Invalid email|not found/.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return jsonError(e);
  }
}
