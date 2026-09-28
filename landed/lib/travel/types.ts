// Flights + hotels: compare and link out, never book. Pure; tests/travel.test.ts.
// SQLite has no enums — String columns hold these unions (see lib/types.ts).

import { matchPlace, placeByCode, resolvePlace, type Place } from "./places";

export const TRAVEL_KINDS = ["FLIGHT", "HOTEL"] as const;
export type TravelKind = (typeof TRAVEL_KINDS)[number];

export const TRAVEL_SOURCES = ["SERPAPI", "FIXTURE"] as const;
export type TravelSource = (typeof TRAVEL_SOURCES)[number];

export const TRAVEL_STATUSES = ["PENDING", "DONE", "FAILED"] as const;
export type TravelStatus = (typeof TRAVEL_STATUSES)[number];

export const CABINS = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] as const;
export type Cabin = (typeof CABINS)[number];
export const CABIN_LABELS: Record<Cabin, string> = {
  ECONOMY: "經濟艙 Economy",
  PREMIUM_ECONOMY: "特選經濟 Premium economy",
  BUSINESS: "商務艙 Business",
  FIRST: "頭等 First",
};
/** Google Flights `travel_class` codes. */
export const CABIN_CODE: Record<Cabin, number> = { ECONOMY: 1, PREMIUM_ECONOMY: 2, BUSINESS: 3, FIRST: 4 };
const isCabin = (v: unknown): v is Cabin => typeof v === "string" && (CABINS as readonly string[]).includes(v);

export interface FlightParams {
  kind: "FLIGHT";
  from: string; // place code
  to: string;
  depart: string; // YYYY-MM-DD
  return: string | null;
  adults: number;
  cabin: Cabin;
}

export interface HotelParams {
  kind: "HOTEL";
  /** Place code when the city is known, else the text as typed (e.g. "Shinjuku"). */
  place: string;
  checkIn: string;
  checkOut: string;
  adults: number;
}

export type TravelParams = FlightParams | HotelParams;

// ── What a result looks like after normalising ──────────────────────────────

export interface FlightLeg {
  from: string;
  to: string;
  depart: string;
  arrive: string;
  airline: string;
  flightNo: string;
  durationMin: number;
}

/** "EXTRA" = the fare says checked bags cost more; "UNKNOWN" = it does not say. */
export type BagsNote = "EXTRA" | "UNKNOWN";

export interface FlightDetails {
  legs: FlightLeg[];
  stops: number;
  durationMin: number;
  layovers: string[];
  bags: BagsNote;
  overnight: boolean;
  carbonKg: number | null;
}

export interface HotelDetails {
  stars: number | null;
  rating: number | null;
  reviews: number | null;
  nightlyHkdCents: number;
  /** True when we multiplied nightly × nights because no total incl. taxes was given. */
  totalEstimated: boolean;
  taxesIncluded: boolean;
  amenities: string[];
  /** Other sellers of the same room and their nightly price. */
  sellers: { source: string; nightlyHkdCents: number }[];
  lat: number | null;
  lng: number | null;
}

export interface QuoteDraft<D> {
  provider: string;
  title: string;
  priceNative: number;
  currency: string;
  bookingUrl: string | null;
  details: D;
}

// ── Params from a query string ──────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: unknown): s is string => typeof s === "string" && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function hkToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400_000);
}

const clampAdults = (v: unknown) => Math.min(9, Math.max(1, Math.floor(Number(v)) || 1));

export type ParseResult<T> = { ok: true; params: T; place?: Place } | { ok: false; error: string };

export function parseFlightParams(q: Record<string, string | undefined>, today = hkToday()): ParseResult<FlightParams> {
  const from = resolvePlace(q.from ?? "HKG");
  const to = resolvePlace(q.to ?? "");
  if (!from) return { ok: false, error: "搵唔到出發地 Unknown departure city" };
  if (!to) return { ok: false, error: "搵唔到目的地 — 試下城市名或機場代號（例如 東京 / TYO）Unknown destination" };
  if (from.code === to.code) return { ok: false, error: "出發地同目的地一樣 Same origin and destination" };
  if (!validDate(q.depart) || q.depart < today) return { ok: false, error: "出發日期要係今日或之後 Pick a departure date from today" };
  const ret = q.return ? q.return : null;
  if (ret && (!validDate(ret) || ret < q.depart)) return { ok: false, error: "回程日期要喺出發之後 Return must be after departure" };
  if (q.depart > addDays(today, 330)) return { ok: false, error: "航空公司通常只賣 11 個月內嘅機票 Airlines sell up to ~11 months ahead" };
  return {
    ok: true,
    params: { kind: "FLIGHT", from: from.code, to: to.code, depart: q.depart, return: ret, adults: clampAdults(q.adults), cabin: isCabin(q.cabin) ? q.cabin : "ECONOMY" },
    place: to,
  };
}

export function parseHotelParams(q: Record<string, string | undefined>, today = hkToday()): ParseResult<HotelParams> {
  const text = (q.city ?? "").trim().slice(0, 60);
  if (text.length < 2) return { ok: false, error: "請輸入城市或地區 Enter a city or area" };
  const match = matchPlace(text);
  const place = match?.place;
  if (!validDate(q.checkin) || q.checkin < today) return { ok: false, error: "入住日期要係今日或之後 Check-in must be today or later" };
  if (!validDate(q.checkout) || q.checkout <= q.checkin) return { ok: false, error: "退房日期要喺入住之後 Check-out must be after check-in" };
  if (nightsBetween(q.checkin, q.checkout) > 30) return { ok: false, error: "最多 30 晚 Up to 30 nights" };
  return {
    ok: true,
    // A city typed as itself searches by its code; "東京新宿" or "Shinjuku" searches as typed.
    params: { kind: "HOTEL", place: match?.exact ? match.place.code : text, checkIn: q.checkin, checkOut: q.checkout, adults: clampAdults(q.adults) },
    place: place ?? undefined,
  };
}

/** Stable cache key: the same trip searched twice is one search. */
export function paramsKey(p: TravelParams): string {
  return p.kind === "FLIGHT"
    ? `F:${p.from}-${p.to}:${p.depart}:${p.return ?? "-"}:${p.adults}:${p.cabin}`
    : `H:${p.place.toLowerCase()}:${p.checkIn}:${p.checkOut}:${p.adults}`;
}

/** Human query for a hotel search: "Tokyo" for a known city, the typed text otherwise. */
export function hotelQueryText(p: HotelParams): string {
  return placeByCode(p.place)?.name ?? p.place;
}

/** Results go stale: fares move hourly, room rates a little slower. */
export const TRAVEL_FRESH_HOURS: Record<TravelKind, number> = { FLIGHT: 6, HOTEL: 12 };
