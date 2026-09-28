import type { Job } from "@prisma/client";
import { prisma } from "../prisma";
import { enqueueJob } from "../jobs/queue";
import { loadMids } from "../settings";
import { safeJson } from "../format";
import { SerpApiQuotaError, serpApiGet, serpApiLive, serpApiUsage, type Fetcher } from "../serpapi";
import { fixtureFlightsJson, fixtureHotelsJson } from "./fixtures";
import { rankFlights, rankHotels } from "./rank";
import { flightRequest, hotelRequest, normalizeFlights, normalizeHotels } from "./serpapi";
import { TRAVEL_FRESH_HOURS, paramsKey, type FlightDetails, type HotelDetails, type TravelParams, type TravelSource } from "./types";
import { partnerEnv, partnerSearchUrl, type TravelPartner } from "./partners";

// Flights + hotels: the web app asks, the worker fetches (like SEARCH_CRAWL).
// A search is cached by its parameters, so ten people looking at the same
// trip cost one API call, and a page view never triggers a paid request on
// its own once results are fresh.

export const currentTravelSource = (): TravelSource => (serpApiLive() ? "SERPAPI" : "FIXTURE");

export interface TravelRequestResult {
  searchId: number | null;
  jobId: number | null;
  /** The monthly API budget is spent; any results shown are older ones. */
  quotaExhausted: boolean;
}

export async function requestTravelSearch(params: TravelParams): Promise<TravelRequestResult> {
  const key = paramsKey(params);
  const source = currentTravelSource();
  const existing = await prisma.travelSearch.findUnique({ where: { paramsKey: key } });

  if (existing?.status === "PENDING" && existing.jobId) {
    const job = await prisma.job.findUnique({ where: { id: existing.jobId } });
    if (job && (job.status === "PENDING" || job.status === "RUNNING")) return { searchId: existing.id, jobId: job.id, quotaExhausted: false };
  }
  const fresh =
    existing?.status === "DONE" &&
    existing.source === source &&
    existing.fetchedAt != null &&
    Date.now() - existing.fetchedAt.getTime() < TRAVEL_FRESH_HOURS[params.kind] * 3600_000;
  if (fresh) return { searchId: existing.id, jobId: null, quotaExhausted: false };

  if (source === "SERPAPI" && (await serpApiUsage()).left <= 0) {
    return { searchId: existing?.status === "DONE" ? existing.id : null, jobId: null, quotaExhausted: true };
  }

  // Older results stay visible while the refresh runs.
  const search = await prisma.travelSearch.upsert({
    where: { paramsKey: key },
    create: { kind: params.kind, paramsKey: key, params: JSON.stringify(params), status: "PENDING" },
    update: { status: "PENDING", error: null },
  });
  const job = await enqueueJob("TRAVEL_SEARCH", { searchId: search.id }, { dedupeKey: `travel:${key}` });
  await prisma.travelSearch.update({ where: { id: search.id }, data: { jobId: job.id } });
  return { searchId: search.id, jobId: job.id, quotaExhausted: false };
}

/** Worker handler for TRAVEL_SEARCH. `fetcher` is injectable for tests. */
export async function handleTravelSearch(job: Job, opts: { fetcher?: Fetcher; source?: TravelSource } = {}) {
  const { searchId } = safeJson<{ searchId?: number }>(job.payload, {});
  const search = searchId ? await prisma.travelSearch.findUnique({ where: { id: searchId } }) : null;
  if (!search) throw new Error(`TravelSearch ${searchId} not found`);
  const params = JSON.parse(search.params) as TravelParams;
  const source = opts.source ?? currentTravelSource();
  try {
    const { mids } = await loadMids();
    let ranked: { provider: string; title: string; priceNative: number; currency: string; totalHkdCents: number; rank: number; bookingUrl: string | null; details: FlightDetails | HotelDetails }[];
    let searchUrl: string | null;
    if (params.kind === "FLIGHT") {
      const json = source === "FIXTURE" ? fixtureFlightsJson(params) : await serpApiGet(flightRequest(params), opts);
      const n = normalizeFlights(json);
      ranked = rankFlights(n.quotes, mids);
      searchUrl = n.searchUrl;
    } else {
      const json = source === "FIXTURE" ? fixtureHotelsJson(params) : await serpApiGet(hotelRequest(params), opts);
      const n = normalizeHotels(json, params);
      ranked = rankHotels(n.quotes, mids);
      searchUrl = n.searchUrl;
    }
    await prisma.$transaction([
      prisma.travelQuote.deleteMany({ where: { searchId: search.id } }),
      prisma.travelQuote.createMany({
        data: ranked.slice(0, 40).map((q) => ({
          searchId: search.id,
          rank: q.rank,
          provider: q.provider,
          title: q.title,
          priceNative: q.priceNative,
          currency: q.currency,
          totalHkdCents: q.totalHkdCents,
          details: JSON.stringify(q.details),
          bookingUrl: q.bookingUrl,
        })),
      }),
      prisma.travelSearch.update({
        where: { id: search.id },
        data: { status: "DONE", source, searchUrl, resultCount: ranked.length, fetchedAt: new Date(), error: null },
      }),
    ]);
    return { searchId: search.id, source, results: ranked.length };
  } catch (e) {
    const msg = e instanceof SerpApiQuotaError ? e.message : e instanceof Error ? e.message : String(e);
    await prisma.travelSearch.update({ where: { id: search.id }, data: { status: "FAILED", error: msg.slice(0, 300) } });
    throw e;
  }
}

export interface TravelView<D> {
  search: { id: number; status: string; source: string | null; searchUrl: string | null; fetchedAt: Date | null; error: string | null; resultCount: number };
  quotes: { id: number; rank: number; provider: string; title: string; totalHkdCents: number; bookingUrl: string | null; details: D }[];
}

export async function travelResults<D extends FlightDetails | HotelDetails>(searchId: number): Promise<TravelView<D> | null> {
  const search = await prisma.travelSearch.findUnique({ where: { id: searchId }, include: { quotes: { orderBy: { rank: "asc" } } } });
  if (!search) return null;
  return {
    search,
    quotes: search.quotes.map((q) => ({ ...q, details: JSON.parse(q.details) as D })),
  };
}

/** Outbound click on a quote: logged, then the stored (never user-supplied) https URL. */
export async function travelClickUrl(quoteId: number): Promise<string | null> {
  const quote = await prisma.travelQuote.findUnique({ where: { id: quoteId }, include: { search: true } });
  const url = quote?.bookingUrl ?? quote?.search.searchUrl ?? null;
  if (!quote || !url || !/^https:\/\//i.test(url)) return null;
  await prisma.travelClick.create({ data: { quoteId } });
  return url;
}

/** "Compare on <partner>": logged against the search, then the partner's own search for the same trip. */
export async function partnerClickUrl(searchId: number, partner: TravelPartner): Promise<string | null> {
  const search = await prisma.travelSearch.findUnique({ where: { id: searchId } });
  if (!search) return null;
  const url = partnerSearchUrl(partner, JSON.parse(search.params) as TravelParams, partnerEnv());
  if (!url) return null;
  await prisma.travelClick.create({ data: { searchId, partner } });
  return url;
}
