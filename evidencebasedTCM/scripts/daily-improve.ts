/**
 * Daily auto-improvement runner — standalone CLI version.
 * Can be triggered by Task Scheduler, cron, or manually.
 *
 * Run: npx tsx scripts/daily-improve.ts
 */
import "dotenv/config";

// Import the engine directly (bypasses HTTP)
import { runAutoImprovement } from "../src/lib/engine/auto-improve";

async function main() {
  const now = new Date();
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  EBTCM Daily Auto-Improvement Engine`);
  console.log(`  ${now.toISOString()}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const result = await runAutoImprovement("daily");

  console.log(`\n──── SUMMARY ────`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Total actions: ${result.summary.totalActions}`);
  console.log(`Issues found: ${result.summary.issuesFound}`);
  console.log(`Issues fixed: ${result.summary.issuesFixed}`);
  console.log(`Research updated: ${result.summary.researchUpdated}`);
  console.log(`Content gaps: ${result.summary.contentGaps.length}`);

  if (result.summary.recommendations.length > 0) {
    console.log(`\n──── RECOMMENDATIONS ────`);
    for (const r of result.summary.recommendations) {
      console.log(`  • ${r}`);
    }
  }

  if (result.summary.contentGaps.length > 0) {
    console.log(`\n──── CONTENT GAPS ────`);
    for (const g of result.summary.contentGaps.slice(0, 10)) {
      console.log(`  ⚠ ${g}`);
    }
  }

  // Per-phase breakdown
  for (const phase of result.phases) {
    console.log(`\n──── Phase: ${phase.phase} (${(phase.duration / 1000).toFixed(1)}s) ────`);
    for (const a of phase.actions) {
      const icon = a.status === "completed" ? "✓" : a.status === "failed" ? "✗" : "↷";
      console.log(`  ${icon} [${a.category}] ${a.action} — ${a.itemsAffected} items`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  Cycle complete. Logs saved to improvement_logs table.`);
  console.log(`  View at /improve in the web app.`);
  console.log(`═══════════════════════════════════════════════════\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Auto-improvement failed:", err);
  process.exit(1);
});
