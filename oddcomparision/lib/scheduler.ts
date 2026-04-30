/**
 * In-process cron scheduler. Called by the standalone daemon (scheduler-standalone.ts)
 * or bootstrapped from Next's instrumentation hook so scrapes run while the server is up.
 *
 * Uses a mutex so overlapping runs (if a scrape exceeds the configured interval) are skipped
 * rather than queued — we'd rather miss a beat than pile up.
 */
import cron from "node-cron";
import { runScrapeCycle } from "./scrape";
import { prisma } from "./db";
import { auditPanCoverage, formatAuditSummary, auditOddsHealth, formatHealthSummary } from "./audit";
import { runQcAgent, formatQcSummary } from "./qc-agent";

let started = false;
let running = false;
let pending = false;

/**
 * Mark any SiteScrape / ScrapeRun rows still flagged "running" but older than
 * `staleMs` as "failed". Runs once at scheduler startup so a previous crashed
 * process doesn't leave the dashboard showing a perpetually-running scrape.
 */
async function reapStaleRuns(staleMs = 20 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - staleMs);
  const sites = await prisma.siteScrape.updateMany({
    where: { status: "running", startedAt: { lt: cutoff } },
    data: { status: "failed", error: "reaped on startup (stale)", finishedAt: new Date() },
  });
  const runs = await prisma.scrapeRun.updateMany({
    where: { status: "running", startedAt: { lt: cutoff } },
    data: { status: "failed", error: "reaped on startup (stale)", finishedAt: new Date() },
  });
  if (sites.count || runs.count) {
    console.log(
      `[scheduler] reaped ${sites.count} stale SiteScrape + ${runs.count} stale ScrapeRun rows`
    );
  }
}

export function startScheduler() {
  if (started) return;
  if (process.env.SCRAPE_ENABLED !== "true") {
    console.log("[scheduler] SCRAPE_ENABLED!=true — scheduler not started");
    return;
  }
  const spec = process.env.SCRAPE_INTERVAL_CRON || "*/15 * * * *";
  if (!cron.validate(spec)) {
    console.error(`[scheduler] invalid cron spec: ${spec}`);
    return;
  }

  // Fire-and-forget reaper so startup isn't blocked.
  reapStaleRuns().catch((e) => console.warn("[scheduler] reaper failed:", e?.message || e));

  const runTick = async (source: "cron" | "catchup") => {
    if (running) {
      pending = true;
      console.warn(`[scheduler] previous run still active — queueing ${source} catch-up tick`);
      return;
    }
    running = true;
    const t0 = Date.now();
    console.log(`[scheduler] tick start (${source}) ${new Date().toISOString()}`);
    try {
      const summary = await runScrapeCycle();
      console.log(`[scheduler] tick done in ${((Date.now() - t0) / 1000).toFixed(1)}s`, summary);
      // Pan-coverage audit on the run we just produced. Read-only and fast
      // (~one query); failures here must not poison the scrape result.
      try {
        const report = await auditPanCoverage(summary.runId);
        if (report) console.log(formatAuditSummary(report));
      } catch (e: any) {
        console.warn(`[audit] failed:`, e?.message || e);
      }
      // Continuous odds-health check: orphan matches, AH sign inversions, run
      // failures. One concise line per tick; only worth investigating when not
      // all-clean.
      try {
        const health = await auditOddsHealth();
        console.log(formatHealthSummary(health));
      } catch (e: any) {
        console.warn(`[health] failed:`, e?.message || e);
      }
      // QC sweep — detects unavailable / "off" odds and applies known-safe
      // auto-fixes (reap stale rows, merge orphans, fix inverted AH, clear
      // browser locks for failed sites). Runs LAST so it sees this tick's
      // SiteScrape rows.
      try {
        const qc = await runQcAgent(summary.runId);
        console.log(formatQcSummary(qc));
      } catch (e: any) {
        console.warn(`[qc] failed:`, e?.message || e);
      }
    } catch (e: any) {
      console.error(`[scheduler] tick failed:`, e?.message || e);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        setTimeout(() => {
          void runTick("catchup");
        }, 1000);
      }
    }
  };

  const scheduleOptions = { recoverMissedExecutions: true } as any;
  cron.schedule(spec, () => {
    void runTick("cron");
  }, scheduleOptions);

  started = true;
  console.log(`[scheduler] started with cron="${spec}"`);
}
