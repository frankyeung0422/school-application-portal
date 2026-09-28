// OpenStreetMap shop locations for the chains we compare. Pure normalizer;
// tests/stores.test.ts. Fetch/sync lives in sync.ts.

import { isPlausibleCoord } from "./nearest";
import type { Retailer } from "../supermarket/retailers";

export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const OSM_ATTRIBUTION = "店舖位置 © OpenStreetMap contributors (ODbL) — 可能過時或不完整，請以店舖實際營業為準。";

/** Hong Kong bounding box (the query is bbox-based; mainland brands are filtered out by brand). */
export const HK_BBOX = "22.15,113.82,22.58,114.45";

export const OVERPASS_QUERY = `[out:json][timeout:180];
nwr["shop"~"^(supermarket|chemist|convenience|department_store|cosmetics|perfumery|health_food|confectionery|deli|grocery|food)$"](${HK_BBOX});
out center tags 6000;`;

/** Brand text → our retailer code. Only the chains Price Watch actually prices. */
const BRAND_PATTERNS: [RegExp, Retailer][] = [
  [/惠康|wellcome/i, "WELLCOME"],
  [/百佳|parknshop|park'?n shop/i, "PARKNSHOP"],
  [/market ?place|jasons/i, "JASONS"],
  [/\baeon\b|永旺/i, "AEON"],
  [/萬寧|万宁|mannings/i, "MANNINGS"],
  [/屈臣氏|watsons/i, "WATSONS"],
  [/莎莎|sa ?sa/i, "SASA"],
  [/大昌|dch/i, "DCHFOOD"],
  [/龍豐|龙丰|lung ?fung/i, "LUNGFUNG"],
  // Chains with no published prices: locations still matter, and shoppers
  // report their in-store prices to us.
  [/優之良品|优之良品|aji ?ichiban/i, "AJI"],
  [/優品\s?360|优品\s?360|best ?mart/i, "BESTMART360"],
  [/759|阿信屋/i, "STORE759"],
];

export function retailerOfBrand(text: string): Retailer | null {
  for (const [re, retailer] of BRAND_PATTERNS) if (re.test(text)) return retailer;
  return null;
}

export interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface NormalizedStore {
  retailer: Retailer;
  osmType: string;
  osmId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

function addressOf(t: Record<string, string>): string | null {
  const parts = [
    [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
    t["addr:suburb"] ?? t["addr:district"] ?? t["addr:city"],
  ].filter(Boolean);
  const line = parts.join(", ").trim();
  return line || t["addr:full"] || null;
}

export function normalizeOverpass(raw: unknown): { stores: NormalizedStore[]; skipped: number } {
  const elements = (raw as { elements?: OverpassElement[] })?.elements;
  if (!Array.isArray(elements)) throw new Error("Overpass response has no elements");
  const stores: NormalizedStore[] = [];
  let skipped = 0;
  for (const e of elements) {
    const t = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    const retailer = retailerOfBrand([t.brand, t["brand:en"], t.operator, t.name, t["name:en"]].filter(Boolean).join(" "));
    if (!retailer || !isPlausibleCoord(lat, lng)) {
      skipped++;
      continue;
    }
    stores.push({
      retailer,
      osmType: e.type,
      osmId: String(e.id),
      name: (t.name ?? t.brand ?? retailer).slice(0, 120),
      address: addressOf(t),
      lat: lat as number,
      lng: lng as number,
    });
  }
  return { stores, skipped };
}
