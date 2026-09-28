// Keyless demo data in SerpApi's response shape, so it runs through the same
// normalisers as live data. Deterministic per search (seeded by its params).
// Names are deliberately generic ("示範航空 Demo Air A") — a made-up price must
// never be attached to a real airline or hotel. Pure; tests/travel.test.ts.

import { placeByCode, type Region } from "./places";
import { flightRequest, hotelRequest } from "./serpapi";
import { CABIN_CODE, hotelQueryText, nightsBetween, paramsKey, type FlightParams, type HotelParams } from "./types";

/** Typical one-way economy fare (HKD) and flight time (min) from HK, by region. */
const REGION_FARE: Record<Region, { fare: number; minutes: number }> = {
  HK: { fare: 0, minutes: 0 },
  GBA: { fare: 700, minutes: 60 },
  CN: { fare: 1300, minutes: 170 },
  TW: { fare: 1100, minutes: 105 },
  JP: { fare: 2000, minutes: 250 },
  KR: { fare: 1800, minutes: 225 },
  SEA: { fare: 1300, minutes: 180 },
  SA: { fare: 3200, minutes: 330 },
  ME: { fare: 3600, minutes: 520 },
  OC: { fare: 4200, minutes: 560 },
  EU: { fare: 5200, minutes: 800 },
  NA: { fare: 5600, minutes: 760 },
};
const REGION_ROOM: Record<Region, number> = { HK: 900, GBA: 550, CN: 500, TW: 700, JP: 900, KR: 750, SEA: 500, SA: 600, ME: 1100, OC: 1200, EU: 1300, NA: 1400 };
const CABIN_MULT = [0, 1, 1.7, 3.8, 6.5];

/** Small deterministic PRNG (mulberry32) seeded from a string. */
function rng(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const googleUrl = (base: string, params: Record<string, string>) => `${base}?${new URLSearchParams(params)}`;
const time = (day: string, minutesFromMidnight: number) => {
  const m = ((minutesFromMidnight % 1440) + 1440) % 1440;
  return `${day} ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export function fixtureFlightsJson(p: FlightParams): unknown {
  const r = rng(paramsKey(p));
  const dest = placeByCode(p.to);
  const base = REGION_FARE[dest?.region ?? "SEA"];
  const from = placeByCode(p.from)?.airports[0] ?? p.from;
  const toAirports = dest?.airports ?? [p.to];
  const options = Array.from({ length: 8 }, (_, i) => {
    const stops = i < 3 ? 0 : i < 6 ? 1 : 2;
    const airline = `示範航空 Demo Air ${String.fromCharCode(65 + i)}`;
    const departMin = 6 * 60 + Math.floor(r() * 16 * 60);
    const flightMin = Math.round(base.minutes * (0.9 + r() * 0.2));
    const layoverMin = stops ? 60 + Math.floor(r() * 180) : 0;
    const legs = Array.from({ length: stops + 1 }, (_, k) => {
      const start = departMin + k * (Math.round(flightMin / (stops + 1)) + layoverMin);
      const dur = Math.round(flightMin / (stops + 1));
      return {
        departure_airport: { id: k === 0 ? from : `DX${k}`, name: k === 0 ? from : `Demo Hub ${k}`, time: time(p.depart, start) },
        arrival_airport: { id: k === stops ? toAirports[i % toAirports.length] : `DX${k + 1}`, name: "", time: time(p.depart, start + dur) },
        duration: dur,
        airline,
        flight_number: `DA ${100 + i * 7 + k}`,
        overnight: start + dur > 1440,
      };
    });
    // Stops usually cost less; long-haul nonstops cost more.
    const stopDiscount = [1, 0.85, 0.75][stops];
    const price = Math.round(base.fare * CABIN_MULT[CABIN_CODE[p.cabin]] * (p.return ? 1.8 : 1) * p.adults * stopDiscount * (0.8 + r() * 0.6));
    return {
      flights: legs,
      layovers: legs.slice(1).map((l) => ({ id: l.departure_airport.id, name: l.departure_airport.name, duration: layoverMin })),
      total_duration: flightMin + stops * layoverMin,
      price,
      extensions: i % 3 === 1 ? ["Checked baggage for a fee"] : [],
      carbon_emissions: { this_flight: Math.round(base.minutes * 1400 * (1 + stops * 0.15)) },
    };
  });
  return {
    search_metadata: { google_flights_url: googleUrl("https://www.google.com/travel/flights", { hl: "zh-TW", curr: "HKD", q: `Flights from ${flightRequest(p).departure_id} to ${flightRequest(p).arrival_id} on ${p.depart}${p.return ? ` returning ${p.return}` : ""}` }) },
    best_flights: options.slice(0, 3),
    other_flights: options.slice(3),
  };
}

export function fixtureHotelsJson(p: HotelParams): unknown {
  const r = rng(paramsKey(p));
  const region = placeByCode(p.place)?.region ?? "JP";
  const nights = Math.max(1, nightsBetween(p.checkIn, p.checkOut));
  const city = hotelQueryText(p);
  const properties = Array.from({ length: 10 }, (_, i) => {
    const stars = 2 + (i % 4);
    const nightly = Math.round(REGION_ROOM[region] * (0.6 + stars * 0.25) * (0.8 + r() * 0.6) * Math.ceil(p.adults / 2));
    const withTax = Math.round(nightly * 1.1);
    // Some listings give a stay total, some only a nightly rate — both paths get exercised.
    const hasTotal = i % 3 !== 2;
    return {
      type: "hotel",
      name: `示範酒店 Demo Hotel ${city} ${i + 1}`,
      link: "",
      rate_per_night: { extracted_lowest: withTax, extracted_before_taxes_fees: nightly },
      ...(hasTotal ? { total_rate: { extracted_lowest: withTax * nights } } : {}),
      extracted_hotel_class: stars,
      overall_rating: Math.round((3.4 + r() * 1.5) * 10) / 10,
      reviews: Math.floor(40 + r() * 3000),
      amenities: ["Free Wi-Fi", "Air conditioning", ...(stars >= 4 ? ["Pool", "Fitness centre"] : [])],
      prices: [
        { source: "Demo OTA 1", rate_per_night: { extracted_lowest: withTax } },
        { source: "Demo OTA 2", rate_per_night: { extracted_lowest: Math.round(withTax * (1 + r() * 0.15)) } },
      ],
    };
  });
  return {
    search_metadata: {
      google_hotels_url: googleUrl("https://www.google.com/travel/search", { q: `hotels in ${hotelRequest(p).q}`, hl: "zh-TW", curr: "HKD" }),
    },
    properties,
  };
}
