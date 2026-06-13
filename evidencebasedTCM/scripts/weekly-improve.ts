/**
 * Weekly auto-improvement runner.
 *
 * Same as daily-improve.ts but runType="weekly", which additionally runs the
 * literature-surveillance phase (PubMed fetch → GRADE → link). Network + LLM
 * heavy, so keep it on a weekly cadence. Requires OPENAI_API_KEY or
 * ANTHROPIC_API_KEY + NCBI access.
 *
 * Schedule examples (run from the project root):
 *   • Linux/macOS cron — Sundays 03:00:
 *       0 3 * * 0  cd /path/to/evidencebasedTCM && npx tsx scripts/weekly-improve.ts >> logs/weekly.log 2>&1
 *   • Windows Task Scheduler — weekly trigger, action:
 *       npx tsx scripts/weekly-improve.ts   (Start in: project root)
 *
 * Run manually: npx tsx scripts/weekly-improve.ts
 */
import "dotenv/config";
import { runAutoImprovement } from "../src/lib/engine/auto-improve";

async function main() {
  const now = new Date();
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  EBTCM Weekly Auto-Improvement (incl. surveillance)`);
  console.log(`  ${now.toISOString()}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const result = await runAutoImprovement("weekly");

  console.log(`\n──── SUMMARY ────`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
  console.log(`Total actions: ${result.summary.totalActions}`);
  console.log(`Research updated: ${result.summary.researchUpdated}`);

  const surveil = result.phases
    .find((p) => p.phase === "surveillance")
    ?.actions.find((a) => a.action === "pubmed_surveillance");
  if (surveil) {
    console.log(`\n──── SURVEILLANCE ────`);
    console.log(`  [${surveil.status}] ${surveil.details}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
