import { prisma } from "../prisma";
import type { JobType } from "../types";

export async function enqueueJob(
  type: JobType,
  payload: unknown,
  opts?: { dedupeKey?: string },
) {
  if (opts?.dedupeKey) {
    // One queued/running job per key: a double-clicked search or an overlapping
    // scheduler tick must not crawl the same thing twice.
    const existing = await prisma.job.findFirst({
      where: { type, dedupeKey: opts.dedupeKey, status: { in: ["PENDING", "RUNNING"] } },
    });
    if (existing) return existing;
  }
  return prisma.job.create({
    data: {
      type,
      payload: JSON.stringify(payload ?? {}),
      dedupeKey: opts?.dedupeKey,
    },
  });
}

/** Jobs a visitor is watching a spinner for; they go ahead of scheduled syncs. */
export const INTERACTIVE_JOB_TYPES: JobType[] = ["SEARCH_CRAWL", "CLUSTER", "PASTE_FETCH", "TRAVEL_SEARCH"];

/** HTTP/DB-only jobs that finish in seconds: never left behind a queue of browser crawls. */
export const LIGHT_JOB_TYPES: JobType[] = ["FETCH_FX", "ALERTS", "POOL_SWEEP", "CLEAR_LEDGER", "GUARD_LISTINGS", "SUPERMARKET_SYNC", "BASKET_DIGEST", "HOUSEKEEPING", "CHANNEL_DIGEST"];

/**
 * Atomically claim the next job: visitor-facing first, then light syncs, then
 * everything else (background crawls, refreshes) oldest first. updateMany's
 * count tells us whether we won the claim, so a doubled worker is still safe.
 */
export async function claimNextJob() {
  const candidate =
    (await prisma.job.findFirst({
      where: { status: "PENDING", type: { in: INTERACTIVE_JOB_TYPES }, NOT: { payload: { contains: '"background":true' } } },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.job.findFirst({
      where: { status: "PENDING", type: { in: LIGHT_JOB_TYPES } },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.job.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }));
  if (!candidate) return null;
  const claimed = await prisma.job.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      heartbeatAt: new Date(),
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return null;
  return prisma.job.findUnique({ where: { id: candidate.id } });
}

export async function heartbeat(jobId: number) {
  await prisma.job.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: { heartbeatAt: new Date() },
  });
}

export async function completeJob(jobId: number, result: unknown) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "DONE",
      result: JSON.stringify(result ?? {}),
      finishedAt: new Date(),
    },
  });
}

/**
 * Thrown by a handler whose every source failed: the job is FAILED (so admin
 * and health checks see it) but still keeps the per-source detail as its result.
 */
export class JobFailure extends Error {
  constructor(message: string, readonly result: unknown) {
    super(message);
    this.name = "JobFailure";
  }
}

export async function failJob(jobId: number, error: unknown, result?: unknown) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      error: error instanceof Error ? `${error.message}\n${error.stack}` : String(error),
      result: result === undefined ? undefined : JSON.stringify(result),
      finishedAt: new Date(),
    },
  });
}

/**
 * On worker boot: any RUNNING job whose heartbeat is older than 5 minutes
 * belongs to a dead worker — retry once, then fail.
 */
export async function reapStaleJobs() {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const stale = await prisma.job.findMany({
    where: { status: "RUNNING", heartbeatAt: { lt: cutoff } },
  });
  for (const job of stale) {
    if (job.attempts < 2) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "PENDING", heartbeatAt: null },
      });
    } else {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: "worker died (stale heartbeat)",
          finishedAt: new Date(),
        },
      });
    }
  }
  return stale.length;
}
