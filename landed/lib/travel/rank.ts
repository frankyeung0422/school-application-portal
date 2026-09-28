// Rank flights and hotels by what the trip really costs. Pure;
// tests/travel.test.ts.
//
// The number that matters is the total for the whole party and the whole stay,
// with taxes in. A HK$899 "from" fare that adds bags, or a HK$600 room that
// adds 20% tax at checkout, is not cheaper than a HK$950 one that includes them.
// We cannot always price bags, so we flag them rather than guess a fee.

import { lintClaims } from "../claims";
import { toCents, toHkd, type FxMids } from "../money/fx";
import type { FlightDetails, HotelDetails, QuoteDraft } from "./types";

export interface RankedQuote<D> extends QuoteDraft<D> {
  totalHkdCents: number;
  rank: number;
}

/**
 * Provider-supplied text (airline, hotel name, amenity) is published on our
 * page, so it obeys our claims rules: urgency like "only 2 rooms left" is
 * dropped rather than repeated as fact.
 */
export function sanitizeProviderText(s: string): string {
  const t = s.replace(/\s+/g, " ").trim().slice(0, 120);
  return lintClaims(t).length ? "" : t;
}

export function quoteTotalCents(q: { priceNative: number; currency: string }, mids: FxMids): number | null {
  try {
    return toCents(toHkd(q.priceNative, q.currency, mids));
  } catch {
    return null; // no FX mid for this currency: unpriced, never guessed
  }
}

function withTotals<D>(quotes: QuoteDraft<D>[], mids: FxMids) {
  return quotes
    .map((q) => ({ ...q, totalHkdCents: quoteTotalCents(q, mids) }))
    .filter((q): q is QuoteDraft<D> & { totalHkdCents: number } => q.totalHkdCents != null && q.totalHkdCents > 0);
}

/** Cheapest total first; on a tie, fewer stops, then the shorter trip. */
export function rankFlights(quotes: QuoteDraft<FlightDetails>[], mids: FxMids): RankedQuote<FlightDetails>[] {
  return withTotals(quotes, mids)
    .sort((a, b) => a.totalHkdCents - b.totalHkdCents || a.details.stops - b.details.stops || a.details.durationMin - b.details.durationMin)
    .map((q, i) => ({ ...q, rank: i + 1 }));
}

/** Cheapest stay total first; on a tie, the better-rated hotel. */
export function rankHotels(quotes: QuoteDraft<HotelDetails>[], mids: FxMids): RankedQuote<HotelDetails>[] {
  return withTotals(quotes, mids)
    .sort((a, b) => a.totalHkdCents - b.totalHkdCents || (b.details.rating ?? 0) - (a.details.rating ?? 0))
    .map((q, i) => ({ ...q, rank: i + 1 }));
}

export interface FlightFilter {
  nonstopOnly?: boolean;
  maxStops?: number;
}

export function filterFlights<T extends { details: FlightDetails }>(quotes: T[], f: FlightFilter): T[] {
  const max = f.nonstopOnly ? 0 : f.maxStops ?? Infinity;
  return quotes.filter((q) => q.details.stops <= max);
}

export interface HotelFilter {
  minRating?: number;
  minStars?: number;
}

export function filterHotels<T extends { details: HotelDetails }>(quotes: T[], f: HotelFilter): T[] {
  return quotes.filter(
    (q) => (!f.minRating || (q.details.rating ?? 0) >= f.minRating) && (!f.minStars || (q.details.stars ?? 0) >= f.minStars),
  );
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}小時${m ? ` ${m}分` : ""}` : `${m}分`;
}
