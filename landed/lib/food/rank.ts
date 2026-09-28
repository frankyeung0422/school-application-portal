// "Cheap and good near me", made honest. Pure; tests/food.test.ts.
//
// A 5.0 from 3 reviews is not better than a 4.4 from 2,000, so ratings are
// shrunk towards a prior before they count. "抵食 good value" is only said
// when there is a real price band and enough reviews to mean something;
// everything else is listed, never praised.

import { haversineMetres, walkMinutes } from "../stores/nearest";

export type FoodSource = "SERPAPI" | "OSM" | "FIXTURE";

export interface FoodPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviews: number | null;
  /** As published, e.g. "HK$50–100" or "$$". */
  priceBand: string | null;
  cuisine: string | null;
  address: string | null;
  openNow: boolean | null;
  mapsUrl: string;
}

/** Rating prior: what an unknown HK restaurant is assumed to be until reviews say otherwise. */
export const PRIOR_RATING = 4.0;
export const PRIOR_WEIGHT = 30;
/** Fewer reviews than this and we will not call a place good value. */
export const MIN_REVIEWS = 20;
/** Per-head mid-price at or below which a well-rated place counts as cheap (HK$). */
export const CHEAP_MAX_CENTS = 12_000;
export const MIN_GOOD_RATING = 4.0;

export function bayesRating(rating: number, reviews: number, prior = PRIOR_RATING, weight = PRIOR_WEIGHT): number {
  const n = Math.max(0, reviews);
  return (rating * n + prior * weight) / (n + weight);
}

/** Google's "$" bands, as a rough HK per-head figure. Always flagged approximate. */
const DOLLAR_BANDS: Record<number, number> = { 1: 60, 2: 150, 3: 350, 4: 700 };

/** "HK$50–100" → HK$75 mid; "$$" → ~HK$150 (approximate); "HK$400+" → ~HK$480. */
export function parsePriceBand(band: string | null | undefined): { midCents: number; approx: boolean } | null {
  if (!band) return null;
  const s = band.replace(/,/g, "").trim();
  const range = s.match(/(\d+)\s*[-–~至]\s*(?:HK)?\$?\s*(\d+)/i);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
    return { midCents: Math.round(((a + b) / 2) * 100), approx: false };
  }
  const plus = s.match(/(\d+)\s*\+/);
  if (plus) return { midCents: Math.round(Number(plus[1]) * 1.2 * 100), approx: true };
  const single = s.match(/(?:HK)?\$\s*(\d+)/i);
  if (single) return { midCents: Number(single[1]) * 100, approx: true };
  const dollars = s.match(/^(?:HK)?(\$+)$/i);
  if (dollars && DOLLAR_BANDS[dollars[1].length]) return { midCents: DOLLAR_BANDS[dollars[1].length] * 100, approx: true };
  return null;
}

/**
 * Round a point to a ~500 m grid cell. Caches and API calls use the cell, so
 * a visitor's exact position is never stored or sent anywhere.
 */
export const GRID_STEP = 0.005;
export function gridCell(lat: number, lng: number): { key: string; lat: number; lng: number } {
  const snap = (v: number) => Math.round(v / GRID_STEP) * GRID_STEP;
  const cLat = Number(snap(lat).toFixed(3));
  const cLng = Number(snap(lng).toFixed(3));
  return { key: `${cLat.toFixed(3)},${cLng.toFixed(3)}`, lat: cLat, lng: cLng };
}

export interface RankedPlace extends FoodPlace {
  metres: number;
  walkMin: number;
  adjustedRating: number | null;
  priceMidCents: number | null;
  priceApprox: boolean;
  /** Only true with a real price band, ≥ MIN_REVIEWS, a strong adjusted rating and a cheap mid-price. */
  goodValue: boolean;
  score: number;
}

export interface FoodFilter {
  maxWalkMin?: number;
  maxPriceCents?: number;
  openNow?: boolean;
}

export function rankFood(places: FoodPlace[], origin: { lat: number; lng: number }, f: FoodFilter = {}): RankedPlace[] {
  const maxWalk = f.maxWalkMin ?? 15;
  return places
    .map((p) => {
      const metres = haversineMetres(origin.lat, origin.lng, p.lat, p.lng);
      const price = parsePriceBand(p.priceBand);
      const adjusted = p.rating != null && p.reviews != null ? bayesRating(p.rating, p.reviews) : null;
      const goodValue =
        adjusted != null &&
        price != null &&
        (p.reviews ?? 0) >= MIN_REVIEWS &&
        adjusted >= MIN_GOOD_RATING &&
        price.midCents <= CHEAP_MAX_CENTS;
      // Quality per dollar, fading with distance; unrated or unpriced places sort after, by distance.
      const score =
        adjusted != null && price != null
          ? ((adjusted - 3) / Math.log10(Math.max(20, price.midCents / 100))) * Math.exp(-metres / 1500)
          : -metres / 1e6;
      return { ...p, metres, walkMin: walkMinutes(metres), adjustedRating: adjusted, priceMidCents: price?.midCents ?? null, priceApprox: price?.approx ?? false, goodValue, score };
    })
    .filter((p) => p.walkMin <= maxWalk)
    .filter((p) => !f.maxPriceCents || p.priceMidCents == null || p.priceMidCents <= f.maxPriceCents)
    .filter((p) => !f.openNow || p.openNow !== false)
    .sort((a, b) => Number(b.goodValue) - Number(a.goodValue) || b.score - a.score || a.metres - b.metres);
}

/** Hong Kong's 18 districts: a fallback when the browser will not share a location. */
export const HK_DISTRICTS: { code: string; zh: string; en: string; lat: number; lng: number }[] = [
  { code: "CW", zh: "中西區（中環）", en: "Central & Western", lat: 22.2826, lng: 114.1552 },
  { code: "WC", zh: "灣仔", en: "Wan Chai", lat: 22.2776, lng: 114.1728 },
  { code: "EA", zh: "東區（北角）", en: "Eastern", lat: 22.2911, lng: 114.2005 },
  { code: "SO", zh: "南區（香港仔）", en: "Southern", lat: 22.2480, lng: 114.1550 },
  { code: "YTM", zh: "油尖旺（旺角）", en: "Yau Tsim Mong", lat: 22.3193, lng: 114.1694 },
  { code: "SSP", zh: "深水埗", en: "Sham Shui Po", lat: 22.3303, lng: 114.1622 },
  { code: "KC", zh: "九龍城", en: "Kowloon City", lat: 22.3282, lng: 114.1916 },
  { code: "WTS", zh: "黃大仙", en: "Wong Tai Sin", lat: 22.3420, lng: 114.1950 },
  { code: "KT", zh: "觀塘", en: "Kwun Tong", lat: 22.3104, lng: 114.2257 },
  { code: "TW", zh: "荃灣", en: "Tsuen Wan", lat: 22.3707, lng: 114.1142 },
  { code: "TM", zh: "屯門", en: "Tuen Mun", lat: 22.3916, lng: 113.9770 },
  { code: "YL", zh: "元朗", en: "Yuen Long", lat: 22.4445, lng: 114.0222 },
  { code: "N", zh: "北區（上水）", en: "North", lat: 22.5010, lng: 114.1280 },
  { code: "TP", zh: "大埔", en: "Tai Po", lat: 22.4501, lng: 114.1688 },
  { code: "ST", zh: "沙田", en: "Sha Tin", lat: 22.3830, lng: 114.1880 },
  { code: "SK", zh: "西貢（將軍澳）", en: "Sai Kung", lat: 22.3072, lng: 114.2600 },
  { code: "KWT", zh: "葵青", en: "Kwai Tsing", lat: 22.3570, lng: 114.1290 },
  { code: "IS", zh: "離島（東涌）", en: "Islands", lat: 22.2890, lng: 113.9430 },
];

/** Cuisines people ask for, with the words Google Maps and OSM use. */
export const CUISINES: { code: string; zh: string; q: string; osm: string | null }[] = [
  { code: "", zh: "全部 Any", q: "餐廳", osm: null },
  { code: "chachaanteng", zh: "茶餐廳", q: "茶餐廳", osm: "chinese|cantonese|hong_kong" },
  { code: "noodles", zh: "粉麵", q: "粉麵", osm: "noodle|noodles" },
  { code: "dimsum", zh: "點心", q: "點心", osm: "dim_sum|cantonese" },
  { code: "japanese", zh: "日本菜", q: "日本菜", osm: "japanese|sushi|ramen" },
  { code: "thai", zh: "泰國菜", q: "泰國菜", osm: "thai" },
  { code: "cafe", zh: "咖啡室", q: "咖啡", osm: "coffee_shop|cafe" },
  { code: "fastfood", zh: "快餐", q: "快餐", osm: "burger|fast_food|chicken" },
];
