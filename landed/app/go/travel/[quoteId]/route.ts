import { NextResponse } from "next/server";
import { travelClickUrl } from "@/lib/travel/service";

// Outbound click on a flight or hotel: logged, then a redirect to the https URL
// stored with that quote (it came from the price source, never from the visitor).
export async function GET(_req: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const id = Number(quoteId);
  if (!Number.isInteger(id)) return new NextResponse("Not found", { status: 404 });
  const url = await travelClickUrl(id);
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url, 302);
}
