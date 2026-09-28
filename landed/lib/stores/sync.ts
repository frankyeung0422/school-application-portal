import { prisma } from "../prisma";
import { setFlag } from "../settings";
import { normalizeOverpass, OVERPASS_QUERY, OVERPASS_URL } from "./overpass";

// Shop locations change slowly; this runs weekly. Overpass is a shared free
// service, so we ask for the whole city once and store it, never per visitor.

export async function fetchStores(): Promise<unknown> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "landed-price-compare/1.0" },
    body: new URLSearchParams({ data: OVERPASS_QUERY }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  return res.json();
}

export async function syncStores(opts: { raw?: unknown } = {}) {
  const raw = opts.raw ?? (await fetchStores());
  const { stores, skipped } = normalizeOverpass(raw);
  if (stores.length < 20 && !opts.raw) {
    // A partial Overpass answer must not wipe the map.
    throw new Error(`Overpass returned only ${stores.length} matching shops — refusing to sync`);
  }
  let written = 0;
  for (let i = 0; i < stores.length; i += 100) {
    await prisma.$transaction(
      stores.slice(i, i + 100).map((s) =>
        prisma.storeLocation.upsert({
          where: { osmType_osmId: { osmType: s.osmType, osmId: s.osmId } },
          create: s,
          update: { retailer: s.retailer, name: s.name, address: s.address, lat: s.lat, lng: s.lng },
        }),
      ),
    );
    written += Math.min(100, stores.length - i);
  }
  await setFlag("stores.lastSyncAt", new Date().toISOString());
  const byRetailer = await prisma.storeLocation.groupBy({ by: ["retailer"], _count: true });
  return { matched: stores.length, written, skipped, byRetailer: Object.fromEntries(byRetailer.map((r) => [r.retailer, r._count])) };
}
