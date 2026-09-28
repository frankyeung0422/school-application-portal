import type { JobType } from "../types";

export interface ScheduleEntry {
  type: JobType;
  env: string;
  hours: number;
}

/** Recurring jobs: hours between runs, overridable via env (0 disables). */
export const SCHEDULE: ScheduleEntry[] = [
  { type: "FETCH_FX", env: "FX_INTERVAL_HOURS", hours: 6 },
  { type: "REFRESH_OFFERS", env: "REFRESH_INTERVAL_HOURS", hours: 1 },
  { type: "ALERTS", env: "ALERTS_INTERVAL_HOURS", hours: 1 },
  { type: "GUARD_LISTINGS", env: "GUARD_INTERVAL_HOURS", hours: 6 },
  { type: "POOL_SWEEP", env: "POOL_SWEEP_INTERVAL_HOURS", hours: 0.25 },
  { type: "CLEAR_LEDGER", env: "CLEAR_LEDGER_INTERVAL_HOURS", hours: 24 },
  { type: "DISCOVER", env: "DISCOVER_INTERVAL_HOURS", hours: 24 },
  // The feed republishes daily (~13:00 HKT); ETag makes the extra checks free.
  { type: "SUPERMARKET_SYNC", env: "SUPERMARKET_SYNC_INTERVAL_HOURS", hours: 3 },
  // Shop locations move slowly, and Overpass is a shared free service.
  { type: "STORE_SYNC", env: "STORE_SYNC_INTERVAL_HOURS", hours: 168 },
  // Boutique prices change a few times a year; daily is already generous.
  { type: "OFFICIAL_SYNC", env: "OFFICIAL_SYNC_INTERVAL_HOURS", hours: 24 },
  // Checks hourly; the digest itself only goes out to a basket once a week (lib/digest.ts).
  { type: "BASKET_DIGEST", env: "BASKET_DIGEST_INTERVAL_HOURS", hours: 1 },
  // Purge analytics older than 180 days.
  { type: "HOUSEKEEPING", env: "HOUSEKEEPING_INTERVAL_HOURS", hours: 24 },
  // One public Telegram channel post a day (idempotent per HK date).
  { type: "CHANNEL_DIGEST", env: "CHANNEL_DIGEST_INTERVAL_HOURS", hours: 24 },
];

/** Effective interval in hours, or null when disabled (env set to 0 or garbage). */
export function scheduleHours(s: ScheduleEntry, env: Record<string, string | undefined> = process.env): number | null {
  const raw = env[s.env];
  const hours = raw === undefined || raw === "" ? s.hours : Number(raw);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}
