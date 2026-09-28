import "dotenv/config";
import type { Job } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { claimNextJob, completeJob, enqueueJob, failJob, heartbeat, JobFailure, reapStaleJobs } from "../lib/jobs/queue";
import {
  handleAlerts,
  handleClearLedger,
  handleCluster,
  handleDiscover,
  handleFetchFx,
  handleGuardListings,
  handlePoolSweep,
  handleRefreshOffers,
  handleSearchCrawl,
} from "../lib/jobs/handlers";
import type { JobType } from "../lib/types";
import { syncSupermarkets } from "../lib/supermarket/sync";
import { syncStores } from "../lib/stores/sync";
import { syncOfficialPrices } from "../lib/official/sync";
import { screenLuxuryOffers } from "../lib/luxury/screen";
import { handlePasteFetch } from "../lib/paste";
import { handleTravelSearch } from "../lib/travel/service";
import { runBasketDigests } from "../lib/basket-service";
import { runChannelDigest } from "../lib/channel-service";
import { SCHEDULE, scheduleHours } from "../lib/jobs/schedule";
import { jobTimeoutMs, TimeoutError, withTimeout } from "../lib/jobs/timeout";

// The only process that crawls, clusters, re-prices and sweeps. The web app
// just enqueues Job rows. Never run two workers against one SQLite file.

const POLL_MS = 2000;
const HEARTBEAT_MS = 30000;
const SCHEDULE_CHECK_MS = 60000;

const log = (msg: string) => console.log(`[worker ${new Date().toISOString()}] ${msg}`);

const HANDLERS: Record<JobType, (job: Job) => Promise<unknown>> = {
  SEARCH_CRAWL: handleSearchCrawl,
  CLUSTER: handleCluster,
  REFRESH_OFFERS: handleRefreshOffers,
  FETCH_FX: () => handleFetchFx(),
  DISCOVER: handleDiscover,
  ALERTS: () => handleAlerts(),
  GUARD_LISTINGS: () => handleGuardListings(),
  POOL_SWEEP: () => handlePoolSweep(),
  CLEAR_LEDGER: () => handleClearLedger(),
  SUPERMARKET_SYNC: (job) => syncSupermarkets({ force: job.payload.includes('"force":true') }),
  STORE_SYNC: () => syncStores(),
  PASTE_FETCH: handlePasteFetch,
  // On demand only (a visitor searched a trip); cached by its parameters.
  TRAVEL_SEARCH: (job) => handleTravelSearch(job),
  // New boutique prices change which listings can be genuine, so re-screen after.
  BASKET_DIGEST: () => runBasketDigests(),
  CHANNEL_DIGEST: () => runChannelDigest(),
  // Analytics are kept 180 days, then dropped.
  HOUSEKEEPING: async () => ({
    pageEventsPurged: (await prisma.pageEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 180 * 86400_000) } } })).count,
  }),
  OFFICIAL_SYNC: async () => ({ ...(await syncOfficialPrices()), screened: await screenLuxuryOffers() }),
};


async function enqueueDue() {
  for (const s of SCHEDULE) {
    const hours = scheduleHours(s);
    if (hours == null) continue;
    const latest = await prisma.job.findFirst({ where: { type: s.type }, orderBy: { createdAt: "desc" } });
    if (latest) {
      if (latest.status === "PENDING" || latest.status === "RUNNING") continue;
      if (Date.now() - latest.createdAt.getTime() < hours * 3600_000) continue;
    }
    await enqueueJob(s.type, {}, { dedupeKey: `schedule:${s.type}` });
    log(`scheduled ${s.type}`);
  }
}

async function runJob(job: Job) {
  const hb = setInterval(() => void heartbeat(job.id), HEARTBEAT_MS);
  try {
    log(`job #${job.id} ${job.type} started`);
    const handler = HANDLERS[job.type as JobType];
    if (!handler) throw new Error(`Unknown job type ${job.type}`);
    const ms = jobTimeoutMs(job.type);
    const result = await withTimeout(handler(job), ms, `job #${job.id} ${job.type}`);
    await completeJob(job.id, result);
    log(`job #${job.id} ${job.type} done: ${JSON.stringify(result).slice(0, 400)}`);
  } catch (e) {
    await failJob(job.id, e, e instanceof JobFailure ? e.result : undefined);
    log(`job #${job.id} ${job.type} FAILED: ${e instanceof Error ? e.message : e}`);
    if (e instanceof TimeoutError) {
      // The overrunning handler still holds its browser; closing it makes the hung call reject.
      const { closeAllContexts } = await import("../lib/sources/browser");
      const closed = await closeAllContexts();
      log(`watchdog closed ${closed} browser context(s)`);
    }
  } finally {
    clearInterval(hb);
  }
}

async function main() {
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  const reaped = await reapStaleJobs();
  if (reaped) log(`reaped ${reaped} stale job(s)`);
  log(`worker started (ADAPTER_MODE=${process.env.ADAPTER_MODE ?? "playwright"})`);
  let lastSchedule = 0;
  const once = process.argv.includes("--drain");
  for (;;) {
    try {
      if (!once && Date.now() - lastSchedule > SCHEDULE_CHECK_MS) {
        lastSchedule = Date.now();
        // Also on every tick, not just boot: a job orphaned by a crashed --drain run must not block its schedule.
        const reapedNow = await reapStaleJobs();
        if (reapedNow) log(`reaped ${reapedNow} stale job(s)`);
        await enqueueDue();
      }
      const job = await claimNextJob();
      if (job) {
        await runJob(job);
        continue;
      }
      if (once) break;
    } catch (e) {
      log(`loop error: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
