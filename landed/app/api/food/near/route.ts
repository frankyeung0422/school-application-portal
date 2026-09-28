import { NextResponse } from "next/server";
import { isPlausibleCoord } from "@/lib/stores/nearest";
import { nearbyFood } from "@/lib/food/service";

export const dynamic = "force-dynamic";

// Nearby food for a point the visitor's browser supplied. The point is used for
// distances in this request only — never stored, never logged; caches and API
// calls use the ~500 m grid cell around it.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  if (!isPlausibleCoord(lat, lng)) return NextResponse.json({ error: "bad coordinates" }, { status: 400 });
  const maxWalk = Number(q.get("maxWalk"));
  const maxPrice = Number(q.get("maxPrice"));
  try {
    const r = await nearbyFood(
      { lat, lng },
      {
        cuisine: q.get("cuisine") ?? "",
        filter: {
          maxWalkMin: [5, 10, 15, 20].includes(maxWalk) ? maxWalk : 15,
          maxPriceCents: maxPrice > 0 ? Math.round(maxPrice * 100) : undefined,
          openNow: q.get("openNow") === "1",
        },
      },
    );
    return NextResponse.json({ ...r, places: r.places.slice(0, 30) });
  } catch (e) {
    return NextResponse.json({ error: `暫時搵唔到附近餐廳 — ${e instanceof Error ? e.message.slice(0, 120) : "error"}` }, { status: 502 });
  }
}
