import { prisma } from "./prisma";

// The one door to SerpApi (Google Flights, Google Hotels, Google Maps). Every
// call is counted per calendar month against SERPAPI_MONTHLY_LIMIT, because a
// paid API behind a public search box is a bill anyone can run up. When the
// budget is spent, callers fall back to cached or keyless data and say so.

export const SERPAPI_URL = "https://serpapi.com/search.json";

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

export class SerpApiQuotaError extends Error {
  constructor(used: number, limit: number) {
    super(`SerpApi monthly budget used (${used}/${limit}) — showing cached or demo data`);
    this.name = "SerpApiQuotaError";
  }
}

export function serpApiKey(): string | null {
  return process.env.SERPAPI_KEY?.trim() || null;
}

/** Demo data when there is no key, or when the whole app runs on fixtures. */
export function serpApiLive(): boolean {
  return Boolean(serpApiKey()) && process.env.ADAPTER_MODE !== "fixture";
}

export function serpApiLimit(): number {
  const n = Number(process.env.SERPAPI_MONTHLY_LIMIT);
  return Number.isFinite(n) && n >= 0 && process.env.SERPAPI_MONTHLY_LIMIT !== "" && process.env.SERPAPI_MONTHLY_LIMIT !== undefined ? n : 100;
}

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export async function serpApiUsage(): Promise<{ used: number; limit: number; left: number }> {
  const used = await prisma.serpApiCall.count({ where: { createdAt: { gte: monthStart() } } });
  const limit = serpApiLimit();
  return { used, limit, left: Math.max(0, limit - used) };
}

/** SerpApi's "no results" is an empty answer, not a failure. */
const NO_RESULTS_RE = /hasn't returned any results|no results/i;

export async function serpApiGet(params: Record<string, string>, opts: { fetcher?: Fetcher } = {}): Promise<Record<string, unknown>> {
  const key = serpApiKey();
  if (!key) throw new Error("SERPAPI_KEY is not set");
  const usage = await serpApiUsage();
  if (usage.left <= 0) throw new SerpApiQuotaError(usage.used, usage.limit);
  const url = `${SERPAPI_URL}?${new URLSearchParams({ ...params, api_key: key })}`;
  const fetcher = opts.fetcher ?? fetch;
  let ok = false;
  try {
    const res = await fetcher(url, { signal: AbortSignal.timeout(45_000) });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const error = typeof json.error === "string" ? json.error : null;
    if (error && NO_RESULTS_RE.test(error)) {
      ok = true;
      return {};
    }
    // Never echo the URL: it carries the key.
    if (!res.ok || error) throw new Error(`SerpApi ${params.engine}: ${error ?? `HTTP ${res.status}`}`);
    ok = true;
    return json;
  } finally {
    await prisma.serpApiCall.create({ data: { engine: params.engine ?? "unknown", ok } });
  }
}
