/**
 * Run auto-synthesis for every disease in the research catalog and print proposals.
 */
import "dotenv/config";
import { DISEASE_CATALOG } from "../src/lib/research/disease-catalog";
import { buildProposal } from "../src/lib/research/synthesize";

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("   EBTCM — AUTO RESEARCH — INNOVATIVE TREATMENT SYNTHESIS");
  console.log("═══════════════════════════════════════════════════════════════\n");

  for (const disease of DISEASE_CATALOG) {
    const proposal = await buildProposal(disease);
    console.log("\n┌─────────────────────────────────────────────────────────────┐");
    console.log(`│ ${disease.nameZh} · ${disease.nameEn} · ICD-11 ${disease.icd11}`.padEnd(62) + "│");
    console.log("└─────────────────────────────────────────────────────────────┘");
    console.log(`▸ TCM terms: ${disease.tcmTermsZh.join("、")}`);
    console.log(`▸ Evidence found: ${proposal.evidence.length}`);
    console.log(`▸ Top formulas: ${proposal.formulas.slice(0, 3).map((f) => `${f.chineseName}(A:${f.gradeA} B:${f.gradeB})`).join(", ") || "—"}`);
    console.log(`▸ Top herbs:    ${proposal.herbs.slice(0, 5).map((h) => `${h.chineseName}(A:${h.gradeA})`).join(", ") || "—"}`);
    console.log(`▸ Top acupoints: ${proposal.acupoints.slice(0, 6).map((a) => a.code).join(", ") || "—"}`);
    console.log(`▸ Matching patterns: ${proposal.patterns.map((p) => p.chineseName).join(", ") || "—"}`);
    console.log(`\n◆ HEADLINE: ${proposal.synthesis.headline}`);
    console.log(`\n◆ RATIONALE:\n   ${proposal.synthesis.rationale.replace(/\. /g, ".\n   ")}`);
    console.log(`\n◆ REGIMEN:`);
    for (const r of proposal.synthesis.regimen) console.log(`   • ${r}`);
    console.log(`\n◆ MONITORING:`);
    for (const r of proposal.synthesis.monitoring) console.log(`   • ${r}`);
    console.log(`\n◆ External deep search:`);
    console.log(`   PubMed:   ${proposal.externalQueries.pubmed.slice(0, 90)}…`);
    console.log(`   Cochrane: ${proposal.externalQueries.cochrane.slice(0, 90)}…`);
    console.log("");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`   ${DISEASE_CATALOG.length} disease proposals generated.`);
  console.log("   Visit /research in the app for the interactive version.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
