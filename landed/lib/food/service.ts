import { prisma } from "../prisma";
import { safeJson } from "../format";
import { serpApiGet, serpApiLive, serpApiUsage, type Fetcher } from "../serpapi";
import { CUISINES, gridCell, rankFood, type FoodFilter, type FoodPlace, type FoodSource, type RankedPlace } from "./rank";
import { MAPS_ATTRIBUTION, OSM_FOOD_ATTRIBUTION, OVERPASS_URLS, fixtureFood, mapsRequest, normalizeMaps, normalizeOsmFood, overpassFoodQuery } from "./sources";

// Nearby food for a point the browser supplied. The point itself is used for
// distances in this request only; everything cached or sent out is the ~500 m
// grid cell around it (see gridCell). One cell + cuisine costs at most one
// paid Maps call a day, however many people ask.

export const FOOD_CACHE_HOURS = 24;

export interface NearbyFood {
  places: RankedPlace[];
  source: FoodSource;
  fetchedAt: Date;
  attribution: string;
  /** Why the richer source was not used, when it was not. */
  note: string | null;
}

async function fetchOsm(cell: { lat: number; lng: number }, cuisine: (typeof CUISINES)[number], fetcher: Fetcher): Promise<FoodPlace[]> {
  let lastError = "";
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "landed-price-compare/1.0" },
        body: new URLSearchParams({ data: overpassFoodQuery(cell) }),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return normalizeOsmFood(await res.json(), cuisine.osm ? new RegExp(cuisine.osm, "i") : null);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`OpenStreetMap busy (${lastError}) — try again shortly`);
}

async function loadCell(
  cell: { key: string; lat: number; lng: number },
  cuisine: (typeof CUISINES)[number],
  fetcher: Fetcher,
): Promise<{ places: FoodPlace[]; source: FoodSource; fetchedAt: Date; note: string | null }> {
  const wanted: FoodSource = process.env.ADAPTER_MODE === "fixture" ? "FIXTURE" : serpApiLive() ? "SERPAPI" : "OSM";
  const since = new Date(Date.now() - FOOD_CACHE_HOURS * 3600_000);
  const cached = await prisma.foodPlaceCache.findMany({ where: { cellKey: cell.key, cuisine: cuisine.code, fetchedAt: { gte: since } } });
  const hit = cached.find((c) => c.source === wanted) ?? (wanted === "SERPAPI" ? cached.find((c) => c.source === "OSM") : undefined);
  if (hit && (hit.source === wanted || (await serpApiUsage()).left <= 0)) {
    return { places: safeJson<FoodPlace[]>(hit.places, []), source: hit.source as FoodSource, fetchedAt: hit.fetchedAt, note: null };
  }

  let places: FoodPlace[];
  let source: FoodSource = wanted;
  let note: string | null = null;
  if (wanted === "FIXTURE") {
    places = fixtureFood(cell);
  } else {
    try {
      if (wanted !== "SERPAPI") throw new Error("no key");
      places = normalizeMaps(await serpApiGet(mapsRequest(cell, cuisine.q), { fetcher }));
    } catch (e) {
      // No key, budget spent or Maps down: fall back to keyless OSM and say so.
      if (wanted === "SERPAPI") note = `Google 地圖暫時用唔到（${e instanceof Error ? e.message.slice(0, 80) : "error"}）— 改用 OpenStreetMap`;
      source = "OSM";
      places = await fetchOsm(cell, cuisine, fetcher);
    }
  }
  const fetchedAt = new Date();
  await prisma.foodPlaceCache.upsert({
    where: { cellKey_cuisine_source: { cellKey: cell.key, cuisine: cuisine.code, source } },
    create: { cellKey: cell.key, cuisine: cuisine.code, source, places: JSON.stringify(places), fetchedAt },
    update: { places: JSON.stringify(places), fetchedAt },
  });
  return { places, source, fetchedAt, note };
}

export async function nearbyFood(
  point: { lat: number; lng: number },
  opts: { cuisine?: string; filter?: FoodFilter; fetcher?: Fetcher } = {},
): Promise<NearbyFood> {
  const cuisine = CUISINES.find((c) => c.code === (opts.cuisine ?? "")) ?? CUISINES[0];
  const cell = gridCell(point.lat, point.lng);
  const loaded = await loadCell(cell, cuisine, opts.fetcher ?? fetch);
  return {
    places: rankFood(loaded.places, point, opts.filter),
    source: loaded.source,
    fetchedAt: loaded.fetchedAt,
    attribution: loaded.source === "OSM" ? OSM_FOOD_ATTRIBUTION : loaded.source === "SERPAPI" ? MAPS_ATTRIBUTION : "示範數據 Demo data — 餐廳名、評分同價錢都係虛構。",
    note: loaded.note,
  };
}
