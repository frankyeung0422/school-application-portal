// Restaurant data in, FoodPlace out. Pure normalisers; tests/food.test.ts.
//   • SerpApi Google Maps: rating, reviews, price band, open-now.
//   • OpenStreetMap (keyless): names, cuisine and location only — never rated,
//     so never called good value.
//   • Fixtures: generic demo places for offline runs, labelled as demo.

import { sanitizeProviderText } from "../travel/rank";
import { isPlausibleCoord } from "../stores/nearest";
import type { FoodPlace } from "./rank";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

export const MAPS_ATTRIBUTION = "餐廳資料來自 Google 地圖（經 SerpApi）— 評分同價錢以 Google 顯示為準。";
export const OSM_FOOD_ATTRIBUTION = "餐廳位置 © OpenStreetMap contributors (ODbL) — 冇評分同價錢，可能過時或不完整。";

export function mapsRequest(cell: { lat: number; lng: number }, q: string): Record<string, string> {
  return { engine: "google_maps", type: "search", q, ll: `@${cell.lat},${cell.lng},16z`, hl: "zh-TW", gl: "hk" };
}

/** "營業中" / "Open ⋅ Closes 10 PM" → true; "已打烊" / "Closed" → false; otherwise unknown. */
export function parseOpenState(s: string): boolean | null {
  if (/closed|已打烊|休息|暫停營業|永久停業|即將打烊/i.test(s)) return /即將打烊|closes soon/i.test(s) ? true : false;
  if (/open|營業中|24 小時/i.test(s)) return true;
  return null;
}

const mapsLink = (name: string, lat: number, lng: number, placeId: string) =>
  placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export function normalizeMaps(json: unknown): FoodPlace[] {
  const out: FoodPlace[] = [];
  for (const r of arr(obj(json).local_results).map(obj)) {
    const gps = obj(r.gps_coordinates);
    const lat = num(gps.latitude);
    const lng = num(gps.longitude);
    const name = sanitizeProviderText(str(r.title));
    if (!name || lat == null || lng == null || !isPlausibleCoord(lat, lng)) continue;
    const placeId = str(r.place_id);
    out.push({
      id: `g:${placeId || str(r.data_id) || `${lat},${lng}`}`,
      name,
      lat,
      lng,
      rating: num(r.rating),
      reviews: num(r.reviews),
      priceBand: str(r.price) || null,
      cuisine: sanitizeProviderText(str(r.type)) || null,
      address: sanitizeProviderText(str(r.address)) || null,
      openNow: parseOpenState(str(r.open_state) || str(r.hours)),
      mapsUrl: mapsLink(name, lat, lng, placeId),
    });
  }
  return out;
}

/** Overpass is a shared free service that rate-limits; a mirror answers when the main one will not. */
export const OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

export function overpassFoodQuery(cell: { lat: number; lng: number }, radiusM = 1000): string {
  return `[out:json][timeout:25];
nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${radiusM},${cell.lat},${cell.lng});
out center tags 300;`;
}

export function normalizeOsmFood(json: unknown, cuisineRe: RegExp | null = null): FoodPlace[] {
  const out: FoodPlace[] = [];
  for (const e of arr(obj(json).elements).map(obj)) {
    const tags = obj(e.tags);
    const center = obj(e.center);
    const lat = num(e.lat) ?? num(center.lat);
    const lng = num(e.lon) ?? num(center.lon);
    const name = sanitizeProviderText(str(tags["name:zh"]) || str(tags.name) || str(tags["name:en"]));
    if (!name || lat == null || lng == null || !isPlausibleCoord(lat, lng)) continue;
    const cuisine = str(tags.cuisine) || str(tags.amenity);
    if (cuisineRe && !cuisineRe.test(cuisine)) continue;
    const street = [str(tags["addr:street"]), str(tags["addr:housenumber"])].filter(Boolean).join(" ");
    out.push({
      id: `osm:${str(e.type)}/${String(e.id)}`,
      name,
      lat,
      lng,
      rating: null,
      reviews: null,
      priceBand: null,
      cuisine: cuisine.replace(/_/g, " ").replace(/;/g, " · ") || null,
      address: street || null,
      openNow: null,
      mapsUrl: mapsLink(name, lat, lng, ""),
    });
  }
  return out;
}

/** Deterministic demo places scattered around a cell. Generic names — no real restaurant gets a made-up rating. */
export function fixtureFood(cell: { lat: number; lng: number }): FoodPlace[] {
  const kinds = ["茶餐廳", "粉麵店", "點心", "日本菜", "泰國菜", "咖啡室", "快餐", "車仔麵"];
  const bands = ["HK$50–100", "HK$1–50", "HK$100–200", "$$", "HK$50–100", "HK$200–400", "HK$1–50", "HK$50–100"];
  return Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 137.5 * Math.PI) / 180;
    const r = 0.0012 + (i % 5) * 0.0011;
    const lat = Number((cell.lat + r * Math.cos(angle)).toFixed(5));
    const lng = Number((cell.lng + r * Math.sin(angle)).toFixed(5));
    const kind = kinds[i % kinds.length];
    return {
      id: `demo:${i}`,
      name: `示範${kind} Demo ${i + 1}`,
      lat,
      lng,
      rating: Math.round((3.4 + ((i * 7) % 15) / 10) * 10) / 10,
      reviews: [8, 45, 320, 1200, 15, 600, 90, 2100][i % 8],
      priceBand: bands[i % bands.length],
      cuisine: kind,
      address: null,
      openNow: i % 6 === 5 ? false : true,
      mapsUrl: mapsLink(`Demo ${i + 1}`, lat, lng, ""),
    };
  });
}
