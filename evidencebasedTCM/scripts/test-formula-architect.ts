import "dotenv/config";
import { DISEASE_CATALOG } from "../src/lib/research/disease-catalog";
import { craftInnovativeFormulas } from "../src/lib/research/formula-architect";

async function main() {
  // Test with diabetes (most complex)
  const disease = DISEASE_CATALOG.find((d) => d.id === "t2dm")!;
  console.log(`\n🧠 AI Medical Mind — ${disease.nameZh} (${disease.nameEn})\n`);

  const report = await craftInnovativeFormulas(disease);

  console.log("═══ DEEP ANALYSIS ═══");
  console.log(`Primary pathology: ${report.analysis.primaryPathology}`);
  console.log(`Secondary: ${report.analysis.secondaryPathologies.join(", ")}`);
  console.log(`Organs: ${report.analysis.affectedOrgans.join(", ")}`);
  console.log(`Principles: ${report.analysis.treatmentPrinciples.join("、")}`);
  console.log(`Strategy: ${report.analysis.therapeuticStrategy}\n`);

  console.log("═══ PRIMARY NOVEL FORMULA ═══");
  console.log(`Name: ${report.primaryFormula.chineseName}`);
  console.log(`Principle: ${report.primaryFormula.treatmentPrinciple}`);
  console.log(`Rationale: ${report.primaryFormula.rationale}`);
  console.log(`\nComposition (${report.primaryFormula.herbs.length} herbs):`);
  for (const h of report.primaryFormula.herbs) {
    console.log(`  [${h.role}] ${h.chineseName} (${h.pinyinName}) ${h.roleDosage} — score:${h.score} — ${h.roleRationale}`);
  }
  console.log(`\nNature: warm=${report.primaryFormula.natureBalance.warm} cool=${report.primaryFormula.natureBalance.cool} neutral=${report.primaryFormula.natureBalance.neutral}`);
  console.log(`Meridians: ${report.primaryFormula.meridianCoverage.join(", ")}`);
  console.log(`Modifications: ${report.primaryFormula.modifications.length}`);
  console.log(`Safety: ${report.primaryFormula.safetyWarnings.join("; ") || "none"}`);

  console.log(`\n═══ ALTERNATES: ${report.alternateFormulas.length} ═══`);
  for (const f of report.alternateFormulas) {
    console.log(`  ${f.chineseName} — ${f.herbs.length} herbs — ${f.treatmentPrinciple}`);
  }

  console.log(`\n═══ PROTOCOL: ${report.combinationProtocol.name} ═══`);
  for (const phase of report.combinationProtocol.phases) {
    console.log(`  ${phase.phase} (${phase.duration}) — ${phase.formula.chineseName} + ${phase.acupoints.join(",")}`);
  }

  console.log(`\n═══ INSIGHTS (${report.innovativeInsights.length}) ═══`);
  for (const ins of report.innovativeInsights) {
    console.log(`  • ${ins.slice(0, 120)}…`);
  }

  console.log(`\n═══ MECHANISMS (${report.mechanismHypotheses.length}) ═══`);
  for (const h of report.mechanismHypotheses) {
    console.log(`  H: ${h.slice(0, 120)}…`);
  }

  console.log("\n✅ Formula Architect test complete.\n");
}
main().catch((err) => { console.error(err); process.exit(1); });
