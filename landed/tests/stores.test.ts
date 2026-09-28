import { describe, expect, it } from "vitest";
import { formatDistance, haversineMetres, isPlausibleCoord, mapsUrl, nearestStores, walkMinutes } from "../lib/stores/nearest";
import { normalizeOverpass, retailerOfBrand } from "../lib/stores/overpass";

const store = (id: number, retailer: string, lat: number, lng: number) => ({
  id,
  retailer,
  name: `${retailer} ${id}`,
  address: null,
  lat,
  lng,
});

describe("distance", () => {
  it("measures real Hong Kong distances", () => {
    // Central (22.2819, 114.1583) → Tsim Sha Tsui (22.2976, 114.1722): ~2.2 km
    const m = haversineMetres(22.2819, 114.1583, 22.2976, 114.1722);
    expect(m).toBeGreaterThan(1900);
    expect(m).toBeLessThan(2600);
  });
  it("formats distance and walking time sensibly", () => {
    expect(formatDistance(240)).toBe("240 米 m");
    expect(formatDistance(1500)).toBe("1.5 公里 km");
    expect(walkMinutes(240)).toBe(3);
    expect(walkMinutes(10)).toBe(1);
  });
  it("rejects impossible coordinates, including 0,0", () => {
    expect(isPlausibleCoord(22.3, 114.2)).toBe(true);
    expect(isPlausibleCoord(0, 0)).toBe(false);
    expect(isPlausibleCoord(91, 114)).toBe(false);
    expect(isPlausibleCoord("22.3", 114)).toBe(false);
  });
});

describe("nearestStores", () => {
  const stores = [
    store(1, "WELLCOME", 22.2825, 114.1585), // ~70 m from Central
    store(2, "WELLCOME", 22.3964, 114.1095), // Tsuen Wan, ~13 km
    store(3, "PARKNSHOP", 22.282, 114.159),
    store(4, "WELLCOME", 22.5, 113.9), // far
  ];
  it("returns the closest branches of one chain, nearest first", () => {
    const near = nearestStores(22.2819, 114.1583, stores, { retailer: "WELLCOME" });
    expect(near.map((s) => s.id)).toEqual([1, 2]);
    expect(near[0].metres).toBeLessThan(200);
  });
  it("respects the distance cap and the limit", () => {
    expect(nearestStores(22.2819, 114.1583, stores, { retailer: "WELLCOME", maxMetres: 1000 }).map((s) => s.id)).toEqual([1]);
    expect(nearestStores(22.2819, 114.1583, stores, { limit: 1 })).toHaveLength(1);
  });
  it("builds a maps link for the exact point", () => {
    expect(mapsUrl(stores[0])).toContain("22.2825,114.1585");
  });
});

describe("overpass normalizer", () => {
  it("maps chain brands in both languages", () => {
    expect(retailerOfBrand("惠康 Wellcome")).toBe("WELLCOME");
    expect(retailerOfBrand("百佳超級市場 PARKnSHOP")).toBe("PARKNSHOP");
    expect(retailerOfBrand("Market Place by Jasons")).toBe("JASONS");
    expect(retailerOfBrand("屈臣氏 Watsons")).toBe("WATSONS");
    expect(retailerOfBrand("7-Eleven")).toBeNull();
    expect(retailerOfBrand("华润万家")).toBeNull();
  });

  it("keeps only chains we price, with coordinates and an address", () => {
    const { stores, skipped } = normalizeOverpass({
      elements: [
        {
          type: "node",
          id: 288745329,
          lat: 22.2822653,
          lon: 114.1511083,
          tags: { brand: "惠康 Wellcome", name: "惠康 Wellcome", "addr:housenumber": "70", "addr:street": "堅道 Caine Road", shop: "supermarket" },
        },
        { type: "way", id: 5, center: { lat: 22.3, lon: 114.2 }, tags: { brand: "AEON", name: "AEON Kornhill" } },
        { type: "node", id: 6, lat: 22.3, lon: 114.2, tags: { brand: "7-Eleven" } },
        { type: "node", id: 7, tags: { brand: "惠康 Wellcome" } },
      ],
    });
    expect(stores).toHaveLength(2);
    expect(stores[0]).toMatchObject({ retailer: "WELLCOME", osmType: "node", osmId: "288745329", address: "70 堅道 Caine Road" });
    expect(stores[1]).toMatchObject({ retailer: "AEON", lat: 22.3, lng: 114.2 });
    expect(skipped).toBe(2);
  });

  it("refuses a response with no elements array", () => {
    expect(() => normalizeOverpass({ error: "timeout" })).toThrow();
  });
});
