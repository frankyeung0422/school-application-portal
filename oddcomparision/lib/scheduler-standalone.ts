/**
 * Standalone daemon — runs the scheduler without needing Next.js server up.
 * Useful for dev or if deploying scraper separately. Also runs a cycle immediately
 * on start so the DB has data within seconds of boot.
 */
import "dotenv/config";
import { startScheduler } from "./scheduler";
import { runScrapeCycle } from "./scrape";
import {
  auditPanCoverage,
  formatAuditSummary,
  auditOddsHealth,
  formatHealthSummary,
} from "./audit";
import { runQcAgent, formatQcSummary } from "./qc-agent";

(async () => {
  console.log("[standalone] starting — will run immediately then every interval");
  startScheduler();
  try {
    const first = await runScrapeCycle();
    console.log("[standalone] first cycle:", first);
    // Run the same audit + health checks the cron tick path runs, so the very
    // first cycle after a restart isn't a blind spot.
    try {
      const report = await auditPanCoverage(first.runId);
      if (report) console.log(formatAuditSummary(report));
    } catch (e: any) {
      console.warn(`[audit] failed:`, e?.message || e);
    }
    try {
      console.log(formatHealthSummary(await auditOddsHealth()));
    } catch (e: any) {
      console.warn(`[health] failed:`, e?.message || e);
    }
    try {
      console.log(formatQcSummary(await runQcAgent(first.runId)));
    } catch (e: any) {
      console.warn(`[qc] failed:`, e?.message || e);
    }
  } catch (e: any) {
    console.error("[standalone] first cycle error:", e?.message || e);
  }
  // Keep process alive forever
  setInterval(() => {}, 1 << 30);
})();
