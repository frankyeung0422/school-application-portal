// Distance maths for "cheapest at Wellcome — the nearest one is 260 m away".
// Pure; tests/stores.test.ts.

export interface StorePoint {
  id: number;
  retailer: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export interface NearbyStore extends StorePoint {
  metres: number;
}

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineMetres(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

export function isPlausibleCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
  );
}

/** Nearest stores to a point, optionally limited to one chain. */
export function nearestStores(
  lat: number,
  lng: number,
  stores: StorePoint[],
  opts: { retailer?: string; limit?: number; maxMetres?: number } = {},
): NearbyStore[] {
  const max = opts.maxMetres ?? 20_000;
  return stores
    .filter((s) => (opts.retailer ? s.retailer === opts.retailer : true) && isPlausibleCoord(s.lat, s.lng))
    .map((s) => ({ ...s, metres: haversineMetres(lat, lng, s.lat, s.lng) }))
    .filter((s) => s.metres <= max)
    .sort((a, b) => a.metres - b.metres)
    .slice(0, opts.limit ?? 3);
}

export function formatDistance(metres: number): string {
  if (metres < 950) return `${Math.round(metres / 10) * 10} 米 m`;
  return `${(metres / 1000).toFixed(1)} 公里 km`;
}

/** Rough walking time at 80 m/min — stated as approximate, never as a promise. */
export function walkMinutes(metres: number): number {
  return Math.max(1, Math.round(metres / 80));
}

export function mapsUrl(s: { name: string; lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;
}
