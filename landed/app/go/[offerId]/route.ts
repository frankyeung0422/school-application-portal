import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logClick } from "@/lib/demand";

// Outbound click: logged (demand evidence + affiliate reconciliation), then a
// redirect to an allow-listed retailer host only.
export async function GET(req: Request, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const id = Number(offerId);
  if (!Number.isInteger(id)) return new NextResponse("Not found", { status: 404 });
  const jar = await cookies();
  let sid = jar.get("landed_sid")?.value;
  if (!sid) {
    sid = randomUUID();
    jar.set("landed_sid", sid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const url = await logClick(id, { sessionId: sid, referrer: req.headers.get("referer") });
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, 302);
}
