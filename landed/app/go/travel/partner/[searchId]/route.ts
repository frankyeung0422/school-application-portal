import { NextResponse } from "next/server";
import { partnerClickUrl } from "@/lib/travel/service";
import { isTravelPartner } from "@/lib/travel/partners";

// "Compare on Trip.com / Agoda": logged, then the partner's own search for the
// same trip (built server-side from the stored search, never from the visitor).
export async function GET(req: Request, { params }: { params: Promise<{ searchId: string }> }) {
  const { searchId } = await params;
  const id = Number(searchId);
  const partner = new URL(req.url).searchParams.get("p");
  if (!Number.isInteger(id) || !isTravelPartner(partner)) return new NextResponse("Not found", { status: 404 });
  const url = await partnerClickUrl(id, partner);
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, 302);
}
