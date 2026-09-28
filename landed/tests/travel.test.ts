import { describe, expect, it } from "vitest";
import { matchPlace, resolvePlace } from "../lib/travel/places";
import { parseFlightParams, parseHotelParams, paramsKey, nightsBetween, type FlightParams, type HotelParams } from "../lib/travel/types";
import { flightRequest, hotelRequest, normalizeFlights, normalizeHotels } from "../lib/travel/serpapi";
import { filterFlights, filterHotels, rankFlights, rankHotels, sanitizeProviderText } from "../lib/travel/rank";
import { fixtureFlightsJson, fixtureHotelsJson } from "../lib/travel/fixtures";
import { detectTravelIntent } from "../lib/travel/intent";

const TODAY = "2026-09-18";
const MIDS = { USD: 7.8, CNY: 1.08, JPY: 0.052 };

describe("resolvePlace", () => {
  it("resolves Chinese (both scripts), English, city and airport codes", () => {
    for (const t of ["東京", "东京", "tokyo", "TYO", "nrt", "Haneda"]) expect(resolvePlace(t)?.code).toBe("TYO");
    expect(resolvePlace("曼谷")?.code).toBe("BKK");
  });
  it("tolerates typos", () => {
    expect(resolvePlace("bangkock")?.code).toBe("BKK");
    expect(resolvePlace("singapor")?.code).toBe("SIN");
  });
  it("never guesses a destination it does not know", () => {
    expect(resolvePlace("atlantis")).toBeNull();
    expect(resolvePlace("")).toBeNull();
  });
  it("treats a name, a code or a typo of a name as the place, but not a district of it", () => {
    expect(matchPlace("東京")?.exact).toBe(true);
    expect(matchPlace("bangkock")?.exact).toBe(true);
    // A district is searched as typed, never collapsed to its city.
    expect(matchPlace("東京新宿")?.exact ?? false).toBe(false);
  });
});

describe("parseFlightParams", () => {
  it("parses a valid round trip", () => {
    const r = parseFlightParams({ to: "東京", depart: "2026-10-10", return: "2026-10-15", adults: "2", cabin: "BUSINESS" }, TODAY);
    expect(r.ok && r.params).toMatchObject({ from: "HKG", to: "TYO", adults: 2, cabin: "BUSINESS", return: "2026-10-15" });
  });
  it("rejects past dates, reversed dates and unknown places", () => {
    expect(parseFlightParams({ to: "TYO", depart: "2026-09-01" }, TODAY).ok).toBe(false);
    expect(parseFlightParams({ to: "TYO", depart: "2026-10-10", return: "2026-10-01" }, TODAY).ok).toBe(false);
    expect(parseFlightParams({ to: "atlantis", depart: "2026-10-10" }, TODAY).ok).toBe(false);
    expect(parseFlightParams({ from: "HKG", to: "香港", depart: "2026-10-10" }, TODAY).ok).toBe(false);
  });
  it("clamps passengers and defaults the cabin", () => {
    const r = parseFlightParams({ to: "TPE", depart: "2026-10-10", adults: "99", cabin: "SPACESHIP" }, TODAY);
    expect(r.ok && r.params.adults).toBe(9);
    expect(r.ok && r.params.cabin).toBe("ECONOMY");
  });
});

describe("parseHotelParams", () => {
  it("uses the city code for a city, the typed text for a district", () => {
    const city = parseHotelParams({ city: "東京", checkin: "2026-10-10", checkout: "2026-10-12" }, TODAY);
    expect(city.ok && city.params.place).toBe("TYO");
    const district = parseHotelParams({ city: "Shinjuku", checkin: "2026-10-10", checkout: "2026-10-12" }, TODAY);
    expect(district.ok && district.params.place).toBe("Shinjuku");
    const typo = parseHotelParams({ city: "bangkock", checkin: "2026-10-10", checkout: "2026-10-12" }, TODAY);
    expect(typo.ok && typo.params.place).toBe("BKK");
  });
  it("rejects zero-night and backwards stays", () => {
    expect(parseHotelParams({ city: "Tokyo", checkin: "2026-10-10", checkout: "2026-10-10" }, TODAY).ok).toBe(false);
  });
});

describe("paramsKey", () => {
  it("is stable for the same trip", () => {
    const a = parseFlightParams({ to: "東京", depart: "2026-10-10" }, TODAY);
    const b = parseFlightParams({ to: "tokyo", depart: "2026-10-10" }, TODAY);
    expect(a.ok && b.ok && paramsKey(a.params) === paramsKey(b.params)).toBe(true);
  });
});

const flight: FlightParams = { kind: "FLIGHT", from: "HKG", to: "TYO", depart: "2026-10-10", return: null, adults: 1, cabin: "ECONOMY" };
const hotel: HotelParams = { kind: "HOTEL", place: "TYO", checkIn: "2026-10-10", checkOut: "2026-10-13", adults: 2 };

describe("SerpApi requests", () => {
  it("asks Google Flights for every airport of a city, in HKD", () => {
    const r = flightRequest(flight);
    expect(r).toMatchObject({ engine: "google_flights", departure_id: "HKG", arrival_id: "NRT,HND", type: "2", currency: "HKD", gl: "hk" });
    expect(flightRequest({ ...flight, return: "2026-10-15" })).toMatchObject({ type: "1", return_date: "2026-10-15" });
  });
  it("asks Google Hotels by city name", () => {
    expect(hotelRequest(hotel)).toMatchObject({ engine: "google_hotels", q: "Tokyo", check_in_date: "2026-10-10", currency: "HKD" });
  });
});

// Shape recorded from SerpApi's google_flights documentation.
const FLIGHTS_JSON = {
  search_metadata: { google_flights_url: "https://www.google.com/travel/flights?q=x" },
  best_flights: [
    {
      flights: [
        { departure_airport: { id: "HKG", time: "2026-10-10 08:00" }, arrival_airport: { id: "NRT", time: "2026-10-10 13:05" }, duration: 245, airline: "Airline A", flight_number: "AA 1" },
      ],
      total_duration: 245,
      price: 2400,
      extensions: [],
      carbon_emissions: { this_flight: 312000 },
    },
  ],
  other_flights: [
    {
      flights: [
        { departure_airport: { id: "HKG", time: "2026-10-10 01:00" }, arrival_airport: { id: "TPE", time: "2026-10-10 02:50" }, duration: 110, airline: "Airline B", flight_number: "BB 2" },
        { departure_airport: { id: "TPE", time: "2026-10-10 06:00" }, arrival_airport: { id: "HND", time: "2026-10-10 10:10" }, duration: 190, airline: "Airline B", flight_number: "BB 3" },
      ],
      layovers: [{ id: "TPE", name: "Taoyuan International Airport", duration: 190 }],
      total_duration: 490,
      price: 1800,
      extensions: ["Checked baggage for a fee"],
    },
    { flights: [], price: 100 }, // malformed: no legs
    { flights: [{ airline: "X" }], price: null }, // unpriced
  ],
};

describe("normalizeFlights + rankFlights", () => {
  const { quotes, searchUrl } = normalizeFlights(FLIGHTS_JSON);
  it("keeps priced itineraries with legs and drops malformed ones", () => {
    expect(quotes).toHaveLength(2);
    expect(searchUrl).toContain("google.com/travel/flights");
  });
  it("reads stops, layovers and bag fees", () => {
    const oneStop = quotes.find((q) => q.provider === "Airline B")!;
    expect(oneStop.details.stops).toBe(1);
    expect(oneStop.details.layovers[0]).toContain("Taoyuan");
    expect(oneStop.details.bags).toBe("EXTRA");
    expect(quotes.find((q) => q.provider === "Airline A")!.details.bags).toBe("UNKNOWN");
  });
  it("ranks by total in HKD cents, cheapest first", () => {
    const ranked = rankFlights(quotes, MIDS);
    expect(ranked.map((q) => q.totalHkdCents)).toEqual([180000, 240000]);
    expect(ranked[0].rank).toBe(1);
  });
  it("breaks price ties on stops", () => {
    const tie = rankFlights(quotes.map((q) => ({ ...q, priceNative: 2000 })), MIDS);
    expect(tie[0].details.stops).toBe(0);
  });
  it("filters nonstop-only", () => {
    expect(filterFlights(rankFlights(quotes, MIDS), { nonstopOnly: true })).toHaveLength(1);
  });
  it("leaves a quote unpriced rather than guessing an FX rate", () => {
    expect(rankFlights([{ ...quotes[0], currency: "XYZ" }], MIDS)).toHaveLength(0);
  });
});

const HOTELS_JSON = {
  search_metadata: { google_hotels_url: "https://www.google.com/travel/search?q=x" },
  properties: [
    { name: "Hotel Total", link: "https://hotel-total.example", rate_per_night: { extracted_lowest: 1100, extracted_before_taxes_fees: 1000 }, total_rate: { extracted_lowest: 3300 }, overall_rating: 4.4, reviews: 900, extracted_hotel_class: 4 },
    { name: "Hotel Nightly", rate_per_night: { extracted_lowest: 1000 }, overall_rating: 3.9, reviews: 50, prices: [{ source: "OTA", rate_per_night: { extracted_lowest: 1000 } }] },
    { name: "Only 2 rooms left!", rate_per_night: { extracted_lowest: 10 } },
    { name: "Unpriced Hotel" },
  ],
};

describe("normalizeHotels + rankHotels", () => {
  expect(nightsBetween(hotel.checkIn, hotel.checkOut)).toBe(3);
  const { quotes } = normalizeHotels(HOTELS_JSON, hotel);
  it("prefers Google's stay total, else nightly × nights flagged as estimated", () => {
    const total = quotes.find((q) => q.provider === "Hotel Total")!;
    expect(total.priceNative).toBe(3300);
    expect(total.details.totalEstimated).toBe(false);
    expect(total.details.taxesIncluded).toBe(true);
    const nightly = quotes.find((q) => q.provider === "Hotel Nightly")!;
    expect(nightly.priceNative).toBe(3000);
    expect(nightly.details.totalEstimated).toBe(true);
    expect(nightly.bookingUrl).toContain("google.com/travel");
  });
  it("drops scarcity text and unpriced hotels", () => {
    expect(quotes.map((q) => q.provider)).toEqual(["Hotel Total", "Hotel Nightly"]);
  });
  it("ranks by stay total and filters by rating", () => {
    const ranked = rankHotels(quotes, MIDS);
    expect(ranked[0].provider).toBe("Hotel Nightly");
    expect(filterHotels(ranked, { minRating: 4 }).map((q) => q.provider)).toEqual(["Hotel Total"]);
  });
});

describe("sanitizeProviderText", () => {
  it("drops fake-urgency and unsubstantiated-cheapest wording", () => {
    expect(sanitizeProviderText("Only 3 left at this price")).toBe("");
    expect(sanitizeProviderText("全港最平酒店")).toBe("");
    expect(sanitizeProviderText("  Cathay   Pacific ")).toBe("Cathay Pacific");
  });
});

describe("fixtures", () => {
  it("run through the same normalisers and are deterministic", () => {
    const a = normalizeFlights(fixtureFlightsJson(flight)).quotes;
    const b = normalizeFlights(fixtureFlightsJson(flight)).quotes;
    expect(a.length).toBe(8);
    expect(a.map((q) => q.priceNative)).toEqual(b.map((q) => q.priceNative));
    expect(a.every((q) => q.provider.includes("Demo"))).toBe(true);
    const h = normalizeHotels(fixtureHotelsJson(hotel), hotel).quotes;
    expect(h.length).toBe(10);
    expect(h.every((q) => q.provider.includes("Demo"))).toBe(true);
    expect(h.some((q) => q.details.totalEstimated)).toBe(true);
  });
  it("price a round trip above a one-way", () => {
    const oneWay = normalizeFlights(fixtureFlightsJson(flight)).quotes;
    const round = normalizeFlights(fixtureFlightsJson({ ...flight, return: "2026-10-15" })).quotes;
    const min = (qs: { priceNative: number }[]) => Math.min(...qs.map((q) => q.priceNative));
    expect(min(round)).toBeGreaterThan(min(oneWay));
  });
});

describe("detectTravelIntent", () => {
  it("spots flight and hotel searches typed into product search", () => {
    expect(detectTravelIntent("東京機票")).toMatchObject({ kind: "FLIGHT", place: { code: "TYO" } });
    expect(detectTravelIntent("cheap flights to bangkok")).toMatchObject({ kind: "FLIGHT", place: { code: "BKK" } });
    expect(detectTravelIntent("大阪酒店")).toMatchObject({ kind: "HOTEL", place: { code: "OSA" } });
    expect(detectTravelIntent("tokyo hotel")).toMatchObject({ kind: "HOTEL", place: { code: "TYO" } });
  });
  it("ignores product searches", () => {
    expect(detectTravelIntent("xiaomi band 9")).toBeNull();
    expect(detectTravelIntent("travel adapter")).toBeNull();
    expect(detectTravelIntent("機票")).toBeNull();
  });
});
