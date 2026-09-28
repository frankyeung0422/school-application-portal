import type { JobType } from "../types";

// Every job gets a wall-clock ceiling. Without one, a single hung browser call
// (the heartbeat is a timer, so it keeps "beating") held the one serial queue
// for three days and froze the supermarket feed, FX and alerts behind it.

const MINUTES: Partial<Record<JobType, number>> = {
  REFRESH_OFFERS: 20,
  SEARCH_CRAWL: 15,
  DISCOVER: 15,
  CLUSTER: 10,
  SUPERMARKET_SYNC: 10,
  STORE_SYNC: 10,
  OFFICIAL_SYNC: 20,
  TRAVEL_SEARCH: 5,
  PASTE_FETCH: 5,
};
const DEFAULT_MINUTES = 5;

/** Max runtime for a job type; `JOB_TIMEOUT_<TYPE>_MIN` overrides. */
export function jobTimeoutMs(type: string, env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env[`JOB_TIMEOUT_${type}_MIN`]);
  const min = Number.isFinite(raw) && raw > 0 ? raw : (MINUTES[type as JobType] ?? DEFAULT_MINUTES);
  return min * 60_000;
}

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${Math.round(ms / 1000)}s`);
    this.name = "TimeoutError";
  }
}

/** Reject if `work` has not settled within `ms`. The loser keeps running — callers must tear down what it holds. */
export function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
