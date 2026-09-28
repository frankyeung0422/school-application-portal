import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/auth";
import { cleanLines, getSavedBasket, saveBasket } from "@/lib/basket-service";
import { jsonError } from "@/lib/http";

// The signed-in shopper's list. Logged out, the basket stays in the browser only
// (signedIn: false — a 200, so every anonymous page view does not log a console error).
export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ signedIn: false, lines: [] });
  return NextResponse.json({ signedIn: true, ...(await getSavedBasket(me.id)) });
}

export async function PUT(req: Request) {
  try {
    const me = await currentCustomer();
    if (!me) return NextResponse.json({ error: "not signed in" }, { status: 401 });
    const body = (await req.json()) as { lines?: unknown; digestOptIn?: unknown };
    const lines = cleanLines(body.lines);
    await saveBasket(me.id, lines, typeof body.digestOptIn === "boolean" ? body.digestOptIn : undefined);
    return NextResponse.json({ saved: lines.length });
  } catch (e) {
    return jsonError(e);
  }
}
