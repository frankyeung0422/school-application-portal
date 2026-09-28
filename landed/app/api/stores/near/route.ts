import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDistance, isPlausibleCoord, mapsUrl, nearestStores, walkMinutes } from "@/lib/stores/nearest";
import { isRetailer } from "@/lib/supermarket/retailers";
import { OSM_ATTRIBUTION } from "@/lib/stores/overpass";

export const dynamic = "force-dynamic";

// Nearest branches of one chain to a point the visitor's browser supplied.
// Coordinates are used for this request only — never stored, never logged.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lat = Number(q.get("lat"));
  const lng = Number(q.get("lng"));
  const retailer = q.get("retailer") ?? "";
  if (!isPlausibleCoord(lat, lng)) return NextResponse.json({ error: "bad coordinates" }, { status: 400 });
  if (!isRetailer(retailer)) return NextResponse.json({ error: "unknown retailer" }, { status: 400 });

  // Pre-filter by a generous bounding box so we don't load every shop in town.
  const d = 0.25; // ≈ 27 km
  const candidates = await prisma.storeLocation.findMany({
    where: { retailer, lat: { gte: lat - d, lte: lat + d }, lng: { gte: lng - d, lte: lng + d } },
    select: { id: true, retailer: true, name: true, address: true, lat: true, lng: true },
  });
  const near = nearestStores(lat, lng, candidates, { retailer, limit: 3 });
  return NextResponse.json({
    stores: near.map((s) => ({
      name: s.name,
      address: s.address,
      metres: s.metres,
      distance: formatDistance(s.metres),
      walkMinutes: walkMinutes(s.metres),
      mapsUrl: mapsUrl(s),
    })),
    known: candidates.length,
    attribution: OSM_ATTRIBUTION,
  });
}
