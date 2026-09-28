import { describe, expect, it } from "vitest";
import { MIN_REVIEWS, bayesRating, gridCell, parsePriceBand, rankFood, type FoodPlace } from "../lib/food/rank";
import { fixtureFood, normalizeMaps, normalizeOsmFood, parseOpenState } from "../lib/food/sources";

const ORIGIN = { lat: 22.3193, lng: 114.1694 }; // Mong Kok

const place = (over: Partial<FoodPlace>): FoodPlace => ({
  id: "x",
  name: "Place",
  lat: 22.3195,
  lng: 114.1696,
  rating: 4.4,
  reviews: 500,
  priceBand: "HK$50–100",
  cuisine: null,
  address: null,
  openNow: true,
  mapsUrl: "https://www.google.com/maps",
  ...over,
});

describe("parsePriceBand", () => {
  it("reads ranges as a mid-price", () => {
    expect(parsePriceBand("HK$50–100")).toEqual({ midCents: 7500, approx: false });
    expect(parsePriceBand("$1-50")).toEqual({ midCents: 2550, approx: false });
    expect(parsePriceBand("HK$1,000–2,000")?.midCents).toBe(150000);
  });
  it("reads open-ended and dollar-sign bands as approximate", () => {
    expect(parsePriceBand("HK$400+")).toEqual({ midCents: 48000, approx: true });
    expect(parsePriceBand("$$")).toEqual({ midCents: 15000, approx: true });
  });
  it("returns null when there is no price", () => {
    expect(parsePriceBand(null)).toBeNull();
    expect(parsePriceBand("Cantonese")).toBeNull();
  });
});

describe("bayesRating", () => {
  it("does not let a handful of 5-star reviews beat a well-reviewed 4.4", () => {
    expect(bayesRating(5, 3)).toBeLessThan(bayesRating(4.4, 2000));
  });
  it("converges to the raw rating with many reviews", () => {
    expect(bayesRating(4.6, 100000)).toBeCloseTo(4.6, 2);
  });
});

describe("gridCell", () => {
  it("rounds to a ~500 m cell so the exact point is never stored", () => {
    const c = gridCell(22.31934, 114.16941);
    expect(c.key).toBe("22.320,114.170");
    expect(gridCell(22.3199, 114.1702).key).toBe(c.key);
    expect(c.key).not.toContain("22.3193");
  });
});

describe("rankFood", () => {
  it("labels good value only with enough reviews, a real price and a strong rating", () => {
    const r = rankFood(
      [
        place({ id: "good", rating: 4.5, reviews: 800, priceBand: "HK$50–100" }),
        place({ id: "few", rating: 5, reviews: MIN_REVIEWS - 1, priceBand: "HK$50–100" }),
        place({ id: "dear", rating: 4.7, reviews: 900, priceBand: "HK$400–800" }),
        place({ id: "noprice", rating: 4.6, reviews: 900, priceBand: null }),
        place({ id: "osm", rating: null, reviews: null, priceBand: null }),
      ],
      ORIGIN,
    );
    const good = Object.fromEntries(r.map((p) => [p.id, p.goodValue]));
    expect(good).toEqual({ good: true, few: false, dear: false, noprice: false, osm: false });
    expect(r[0].id).toBe("good");
  });
  it("filters by walking time, budget and open-now", () => {
    const far = place({ id: "far", lat: 22.35, lng: 114.2 });
    const shut = place({ id: "shut", openNow: false });
    const dear = place({ id: "dear", priceBand: "HK$200–400" });
    const ids = (f: Parameters<typeof rankFood>[2]) => rankFood([place({ id: "ok" }), far, shut, dear], ORIGIN, f).map((p) => p.id);
    expect(ids({ maxWalkMin: 10 })).not.toContain("far");
    expect(ids({ openNow: true })).not.toContain("shut");
    expect(ids({ maxPriceCents: 12000 })).not.toContain("dear");
  });
});

describe("sources", () => {
  it("normalises Google Maps results and drops rows without a location", () => {
    const places = normalizeMaps({
      local_results: [
        { title: "Kam Wah Cafe", place_id: "abc", gps_coordinates: { latitude: 22.32, longitude: 114.17 }, rating: 4.1, reviews: 3200, price: "HK$50–100", type: "茶餐廳", open_state: "營業中 ⋅ 晚上10:00 打烊" },
        { title: "No GPS" },
        { title: "Only 2 tables left!", gps_coordinates: { latitude: 22.32, longitude: 114.17 } },
      ],
    });
    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({ name: "Kam Wah Cafe", rating: 4.1, reviews: 3200, openNow: true });
    expect(places[0].mapsUrl).toContain("query_place_id=abc");
  });
  it("normalises OSM, keeping it unrated and filtering by cuisine", () => {
    const json = {
      elements: [
        { type: "node", id: 1, lat: 22.32, lon: 114.17, tags: { amenity: "restaurant", name: "麵家", cuisine: "noodle" } },
        { type: "way", id: 2, center: { lat: 22.32, lon: 114.17 }, tags: { amenity: "cafe", name: "Cafe", cuisine: "coffee_shop" } },
        { type: "node", id: 3, lat: 22.32, lon: 114.17, tags: { amenity: "restaurant" } },
      ],
    };
    expect(normalizeOsmFood(json)).toHaveLength(2);
    const noodles = normalizeOsmFood(json, /noodle/);
    expect(noodles.map((p) => p.name)).toEqual(["麵家"]);
    expect(noodles[0].rating).toBeNull();
  });
  it("reads open state in Chinese and English", () => {
    expect(parseOpenState("Open ⋅ Closes 10 PM")).toBe(true);
    expect(parseOpenState("已打烊 ⋅ 上午11:00 開始營業")).toBe(false);
    expect(parseOpenState("Closed")).toBe(false);
    expect(parseOpenState("")).toBeNull();
  });
  it("fixtures are generic and deterministic", () => {
    const a = fixtureFood({ lat: 22.32, lng: 114.17 });
    expect(a.every((p) => p.name.includes("Demo"))).toBe(true);
    expect(fixtureFood({ lat: 22.32, lng: 114.17 })).toEqual(a);
  });
});
