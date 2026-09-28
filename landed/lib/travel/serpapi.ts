// SerpApi Google Flights / Google Hotels: request building and response
// normalising. Pure — the fetch lives in lib/serpapi.ts; tests/travel.test.ts
// runs these against recorded-shape JSON. Keyless fixtures (./fixtures.ts)
// emit the same shape, so demo data goes through exactly this code.

import { sanitizeProviderText } from "./rank";
import { placeByCode } from "./places";
import {
  CABIN_CODE,
  hotelQueryText,
  nightsBetween,
  type BagsNote,
  type FlightDetails,
  type FlightLeg,
  type FlightParams,
  type HotelDetails,
  type HotelParams,
  type QuoteDraft,
} from "./types";

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Airport list Google accepts for a place code: "NRT,HND". */
export const airportsFor = (code: string) => (placeByCode(code)?.airports ?? [code]).join(",");

export function flightRequest(p: FlightParams): Record<string, string> {
  return {
    engine: "google_flights",
    departure_id: airportsFor(p.from),
    arrival_id: airportsFor(p.to),
    outbound_date: p.depart,
    ...(p.return ? { return_date: p.return, type: "1" } : { type: "2" }),
    adults: String(p.adults),
    travel_class: String(CABIN_CODE[p.cabin]),
    currency: "HKD",
    gl: "hk",
    hl: "zh-TW",
  };
}

export function hotelRequest(p: HotelParams): Record<string, string> {
  return {
    engine: "google_hotels",
    q: hotelQueryText(p),
    check_in_date: p.checkIn,
    check_out_date: p.checkOut,
    adults: String(p.adults),
    currency: "HKD",
    gl: "hk",
    hl: "zh-TW",
  };
}

/** "Checked baggage for a fee" / "寄艙行李需付費" → the fare excludes bags. */
const BAG_FEE_RE = /(check(ed)?\s*bag\w*[^.]*fee|bag\w*\s+for\s+a\s+fee|行李[^。]*(收費|付費|另計))/i;

export function normalizeFlights(json: unknown): { quotes: QuoteDraft<FlightDetails>[]; searchUrl: string | null } {
  const root = obj(json);
  const searchUrl = str(obj(root.search_metadata).google_flights_url) || null;
  const options = [...arr(root.best_flights), ...arr(root.other_flights)].map(obj);
  const quotes: QuoteDraft<FlightDetails>[] = [];
  for (const o of options) {
    const price = num(o.price);
    const segs = arr(o.flights).map(obj);
    if (price == null || price <= 0 || !segs.length) continue;
    const legs: FlightLeg[] = segs.map((s) => ({
      from: str(obj(s.departure_airport).id),
      to: str(obj(s.arrival_airport).id),
      depart: str(obj(s.departure_airport).time),
      arrive: str(obj(s.arrival_airport).time),
      airline: str(s.airline),
      flightNo: str(s.flight_number),
      durationMin: num(s.duration) ?? 0,
    }));
    const texts = [...arr(o.extensions), ...segs.flatMap((s) => arr(s.extensions))].map(str);
    const bags: BagsNote = texts.some((t) => BAG_FEE_RE.test(t)) ? "EXTRA" : "UNKNOWN";
    const airlines = [...new Set(legs.map((l) => l.airline).filter(Boolean))];
    const provider = sanitizeProviderText(airlines.join(" + ")) || "—";
    quotes.push({
      provider,
      title: `${legs[0].from} → ${legs[legs.length - 1].to} · ${legs.map((l) => l.flightNo).filter(Boolean).join(", ")}`,
      priceNative: price,
      currency: "HKD",
      bookingUrl: searchUrl,
      details: {
        legs,
        stops: Math.max(0, legs.length - 1),
        durationMin: num(o.total_duration) ?? legs.reduce((a, l) => a + l.durationMin, 0),
        layovers: arr(o.layovers).map((l) => sanitizeProviderText(str(obj(l).name) || str(obj(l).id))).filter(Boolean),
        bags,
        overnight: segs.some((s) => s.overnight === true),
        carbonKg: num(obj(o.carbon_emissions).this_flight) != null ? Math.round(num(obj(o.carbon_emissions).this_flight)! / 1000) : null,
      },
    });
  }
  return { quotes, searchUrl };
}

export function normalizeHotels(json: unknown, p: HotelParams): { quotes: QuoteDraft<HotelDetails>[]; searchUrl: string | null } {
  const root = obj(json);
  const searchUrl = str(obj(root.search_metadata).google_hotels_url) || null;
  const nights = Math.max(1, nightsBetween(p.checkIn, p.checkOut));
  const quotes: QuoteDraft<HotelDetails>[] = [];
  for (const h of arr(root.properties).map(obj)) {
    const nightly = num(obj(h.rate_per_night).extracted_lowest);
    const total = num(obj(h.total_rate).extracted_lowest);
    if (nightly == null && total == null) continue;
    const beforeTax = num(obj(h.rate_per_night).extracted_before_taxes_fees);
    const name = sanitizeProviderText(str(h.name));
    if (!name) continue;
    // Prefer Google's stay total (taxes + fees in); otherwise nightly × nights, flagged.
    const stayTotal = total ?? nightly! * nights;
    const gps = obj(h.gps_coordinates);
    quotes.push({
      provider: name,
      title: name,
      priceNative: stayTotal,
      currency: "HKD",
      bookingUrl: str(h.link) || searchUrl,
      details: {
        stars: num(h.extracted_hotel_class),
        rating: num(h.overall_rating),
        reviews: num(h.reviews),
        nightlyHkdCents: Math.round((nightly ?? stayTotal / nights) * 100),
        totalEstimated: total == null,
        // Google gives a separate before-taxes figure only when the headline includes them.
        taxesIncluded: beforeTax != null && nightly != null && nightly >= beforeTax,
        amenities: arr(h.amenities).map(str).map(sanitizeProviderText).filter(Boolean).slice(0, 6),
        sellers: arr(h.prices)
          .map(obj)
          .map((s) => ({ source: sanitizeProviderText(str(s.source)), nightly: num(obj(s.rate_per_night).extracted_lowest) }))
          .filter((s): s is { source: string; nightly: number } => Boolean(s.source) && s.nightly != null)
          .map((s) => ({ source: s.source, nightlyHkdCents: Math.round(s.nightly * 100) }))
          .slice(0, 5),
        lat: num(gps.latitude),
        lng: num(gps.longitude),
      },
    });
  }
  return { quotes, searchUrl };
}
