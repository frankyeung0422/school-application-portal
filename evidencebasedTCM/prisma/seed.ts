import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

import { herbsData } from "./seeds/herbs";
import { formulasData, formulaCompositions } from "./seeds/formulas";
import { acupointsData } from "./seeds/acupoints";
import {
  patternsData,
  patternFormulasData,
  patternAcupointsData,
} from "./seeds/patterns";
import { conditionsData, conditionPatternMappingsData } from "./seeds/conditions";
import { evidenceData, evidenceLinkData } from "./seeds/evidence";
import {
  herbDrugInteractionsData,
  herbHerbInteractionsData,
  herbContraindicationsData,
} from "./seeds/interactions";

// ---------------------------------------------------------------------------
// Prisma client with PrismaPg adapter
// ---------------------------------------------------------------------------
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a created herb by pinyinName */
function findHerb(herbs: { id: string; pinyinName: string }[], pinyin: string) {
  const h = herbs.find((h) => h.pinyinName === pinyin);
  if (!h) throw new Error(`Herb not found: ${pinyin}`);
  return h;
}

/** Look up a created formula by pinyinName */
function findFormula(
  formulas: { id: string; pinyinName: string }[],
  pinyin: string,
) {
  const f = formulas.find((f) => f.pinyinName === pinyin);
  if (!f) throw new Error(`Formula not found: ${pinyin}`);
  return f;
}

/** Look up a created pattern by pinyinName */
function findPattern(
  patterns: { id: string; pinyinName: string }[],
  pinyin: string,
) {
  const p = patterns.find((p) => p.pinyinName === pinyin);
  if (!p) throw new Error(`Pattern not found: ${pinyin}`);
  return p;
}

/** Look up a created acupoint by code */
function findAcupoint(
  acupoints: { id: string; code: string }[],
  code: string,
) {
  const a = acupoints.find((a) => a.code === code);
  if (!a) throw new Error(`Acupoint not found: ${code}`);
  return a;
}

/** Look up a created condition by icd10Code */
function findCondition(
  conditions: { id: string; icd10Code: string | null }[],
  icd10: string,
) {
  const c = conditions.find((c) => c.icd10Code === icd10);
  if (!c) throw new Error(`Condition not found: ${icd10}`);
  return c;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Starting seed…\n");

  // ── 0. Clear all tables in reverse-dependency order ──────────────
  console.log("Clearing existing data…");
  await prisma.bookmark.deleteMany();
  await prisma.conditionPatternMapping.deleteMany();
  await prisma.conditionMapping.deleteMany();
  await prisma.evidencePatternLink.deleteMany();
  await prisma.evidenceAcupointLink.deleteMany();
  await prisma.evidenceFormulaLink.deleteMany();
  await prisma.evidenceHerbLink.deleteMany();
  await prisma.evidenceEntry.deleteMany();
  await prisma.herbContraindication.deleteMany();
  await prisma.herbHerbInteraction.deleteMany();
  await prisma.herbDrugInteraction.deleteMany();
  await prisma.patternAcupoint.deleteMany();
  await prisma.patternFormula.deleteMany();
  await prisma.tcmPattern.deleteMany();
  await prisma.formulaHerb.deleteMany();
  await prisma.formula.deleteMany();
  await prisma.herbActiveCompound.deleteMany();
  await prisma.acupuncturePoint.deleteMany();
  await prisma.herb.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ All tables cleared\n");

  // ── 1. Seed Users ────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 12);
  const demoHash = await bcrypt.hash("demo123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@ebtcm.org",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      credentials: "System administrator",
    },
  });

  const practitioner = await prisma.user.create({
    data: {
      email: "demo@ebtcm.org",
      name: "Demo Practitioner",
      passwordHash: demoHash,
      role: "PRACTITIONER",
      credentials: "Licensed Acupuncturist, DACM",
    },
  });

  console.log(`Users: 2 created (admin: ${admin.id}, practitioner: ${practitioner.id})`);

  // ── 2. Seed Herbs ───────────────────────────────────────────────
  const createdHerbs: { id: string; pinyinName: string }[] = [];

  for (const h of herbsData) {
    const herb = await prisma.herb.create({
      data: {
        pinyinName: h.pinyinName,
        chineseName: h.chineseName,
        latinName: h.latinName ?? null,
        englishName: h.englishName ?? null,
        category: h.category,
        nature: h.nature as any,
        flavor: h.flavor,
        meridianTropism: h.meridianTropism,
        dosageRange: h.dosageRange ?? null,
        description: h.description ?? null,
        modernPharmacology: h.modernPharmacology ?? null,
        status: (h.status as any) ?? "PUBLISHED",
      },
    });
    createdHerbs.push({ id: herb.id, pinyinName: herb.pinyinName });
  }

  console.log(`Herbs: ${createdHerbs.length} created`);

  // ── 3. Seed Formulas ────────────────────────────────────────────
  const createdFormulas: { id: string; pinyinName: string }[] = [];

  for (const f of formulasData) {
    const formula = await prisma.formula.create({
      data: {
        pinyinName: f.pinyinName,
        chineseName: f.chineseName,
        englishName: f.englishName ?? null,
        sourceText: f.sourceText ?? null,
        category: f.category,
        actions: f.actions ?? null,
        indications: f.indications ?? null,
        modifications: f.modifications ?? null,
        status: (f.status as any) ?? "PUBLISHED",
      },
    });
    createdFormulas.push({ id: formula.id, pinyinName: formula.pinyinName });
  }

  console.log(`Formulas: ${createdFormulas.length} created`);

  // ── 3b. Seed FormulaHerb relationships ──────────────────────────
  let formulaHerbCount = 0;

  for (const comp of formulaCompositions) {
    const formula = findFormula(createdFormulas, comp.formulaPinyin);
    for (const entry of comp.herbs) {
      const herb = findHerb(createdHerbs, entry.herbPinyin);
      await prisma.formulaHerb.create({
        data: {
          formulaId: formula.id,
          herbId: herb.id,
          role: entry.role as any,
          dosage: entry.dosage,
          notes: entry.notes,
        },
      });
      formulaHerbCount++;
    }
  }

  console.log(`FormulaHerb relationships: ${formulaHerbCount} created`);

  // ── 4. Seed Acupuncture Points ──────────────────────────────────
  const createdAcupoints: { id: string; code: string }[] = [];

  for (const a of acupointsData) {
    const acupoint = await prisma.acupuncturePoint.create({
      data: {
        code: a.code,
        pinyinName: a.pinyinName,
        chineseName: a.chineseName,
        englishName: a.englishName ?? null,
        meridian: a.meridian,
        location: a.location ?? null,
        depth: a.depth ?? null,
        actions: a.actions ?? null,
        indications: a.indications ?? null,
        contraindications: a.contraindications ?? null,
        status: (a.status as any) ?? "PUBLISHED",
      },
    });
    createdAcupoints.push({ id: acupoint.id, code: acupoint.code });
  }

  console.log(`AcupuncturePoints: ${createdAcupoints.length} created`);

  // ── 5. Seed TcmPatterns ─────────────────────────────────────────
  const createdPatterns: { id: string; pinyinName: string }[] = [];

  for (const p of patternsData) {
    const pattern = await prisma.tcmPattern.create({
      data: {
        pinyinName: p.pinyinName,
        chineseName: p.chineseName,
        englishName: p.englishName ?? null,
        organSystem: p.organSystem ?? null,
        pathologyType: p.pathologyType as any,
        keySymptoms: p.keySymptoms ?? null,
        tongue: p.tongue ?? null,
        pulse: p.pulse ?? null,
        treatmentPrinciple: p.treatmentPrinciple ?? null,
        status: (p.status as any) ?? "PUBLISHED",
      },
    });
    createdPatterns.push({ id: pattern.id, pinyinName: pattern.pinyinName });
  }

  console.log(`TcmPatterns: ${createdPatterns.length} created`);

  // ── 5b. Seed PatternFormula relationships ───────────────────────
  let patternFormulaCount = 0;

  for (const pf of patternFormulasData) {
    const pattern = findPattern(createdPatterns, pf.patternPinyin);
    const formula = findFormula(createdFormulas, pf.formulaPinyin);
    await prisma.patternFormula.create({
      data: {
        patternId: pattern.id,
        formulaId: formula.id,
        isPrimary: pf.isPrimary,
        notes: pf.notes,
      },
    });
    patternFormulaCount++;
  }

  console.log(`PatternFormula relationships: ${patternFormulaCount} created`);

  // ── 5c. Seed PatternAcupoint relationships ──────────────────────
  let patternAcupointCount = 0;

  for (const pa of patternAcupointsData) {
    const pattern = findPattern(createdPatterns, pa.patternPinyin);
    // Some acupoints in the mapping data may not exist in our seed set (e.g. SP3, BL15, etc.)
    const acupoint = createdAcupoints.find((a) => a.code === pa.acupointCode);
    if (!acupoint) {
      // Skip acupoints not in our seed data
      continue;
    }
    await prisma.patternAcupoint.create({
      data: {
        patternId: pattern.id,
        acupointId: acupoint.id,
        stimulationMethod: pa.stimulationMethod,
        notes: pa.notes,
      },
    });
    patternAcupointCount++;
  }

  console.log(`PatternAcupoint relationships: ${patternAcupointCount} created`);

  // ── 6. Seed ConditionMappings ───────────────────────────────────
  const createdConditions: { id: string; icd10Code: string | null }[] = [];

  for (const c of conditionsData) {
    const condition = await prisma.conditionMapping.create({
      data: {
        westernName: c.westernName,
        icd10Code: c.icd10Code ?? null,
        icd11Code: c.icd11Code ?? null,
        snomedCode: c.snomedCode ?? null,
        description: c.description ?? null,
      },
    });
    createdConditions.push({ id: condition.id, icd10Code: condition.icd10Code });
  }

  console.log(`ConditionMappings: ${createdConditions.length} created`);

  // ── 6b. Seed ConditionPatternMapping relationships ──────────────
  let conditionPatternCount = 0;

  for (const cpm of conditionPatternMappingsData) {
    const condition = findCondition(createdConditions, cpm.conditionIcd10);
    const pattern = findPattern(createdPatterns, cpm.patternPinyin);
    await prisma.conditionPatternMapping.create({
      data: {
        conditionId: condition.id,
        patternId: pattern.id,
        frequency: cpm.frequency as any,
        notes: cpm.notes,
      },
    });
    conditionPatternCount++;
  }

  console.log(`ConditionPatternMapping relationships: ${conditionPatternCount} created`);

  // ── 7. Seed EvidenceEntries (from evidence.ts) ─────────────────
  const createdEvidence: { id: string; index: number }[] = [];

  for (let i = 0; i < evidenceData.length; i++) {
    const e = evidenceData[i];
    const entry = await prisma.evidenceEntry.create({
      data: {
        title: e.title,
        studyType: e.studyType as any,
        evidenceLevel: e.evidenceLevel as any,
        evidenceGrade: e.evidenceGrade as any,
        authors: e.authors ?? null,
        journal: e.journal ?? null,
        year: e.year ?? null,
        doi: e.doi ?? null,
        pubmedId: e.pubmedId ?? null,
        abstract: e.abstract ?? null,
        summary: e.summary ?? null,
        sampleSize: e.sampleSize ?? null,
        population: e.population ?? null,
        intervention: e.intervention ?? null,
        comparator: e.comparator ?? null,
        primaryOutcome: e.primaryOutcome ?? null,
        resultsSummary: e.resultsSummary ?? null,
        riskOfBias: (e.riskOfBias as any) ?? null,
        qualityScore: e.qualityScore ?? null,
        qualityTool: e.qualityTool ?? null,
        status: "PUBLISHED",
      },
    });
    createdEvidence.push({ id: entry.id, index: i });
  }

  console.log(`EvidenceEntries: ${createdEvidence.length} created`);

  // ── 7b. Create Evidence links from evidenceLinkData ─────────────
  let evidenceLinkCount = 0;

  const seenLink = new Set<string>();
  for (const link of evidenceLinkData) {
    const ev = createdEvidence.find((e) => e.index === link.evidenceIndex);
    if (!ev) continue;

    if ("herbPinyin" in link && link.herbPinyin) {
      const herb = createdHerbs.find((h) => h.pinyinName === link.herbPinyin);
      const key = `h|${ev.id}|${herb?.id}`;
      if (herb && !seenLink.has(key)) {
        seenLink.add(key);
        await prisma.evidenceHerbLink.create({
          data: { evidenceId: ev.id, herbId: herb.id, outcomeType: link.outcomeType as any, effectDirection: link.effectDirection as any },
        });
        evidenceLinkCount++;
      }
    }
    if ("formulaPinyin" in link && link.formulaPinyin) {
      const formula = createdFormulas.find((f) => f.pinyinName === link.formulaPinyin);
      const key = `f|${ev.id}|${formula?.id}`;
      if (formula && !seenLink.has(key)) {
        seenLink.add(key);
        await prisma.evidenceFormulaLink.create({
          data: { evidenceId: ev.id, formulaId: formula.id, outcomeType: link.outcomeType as any, effectDirection: link.effectDirection as any },
        });
        evidenceLinkCount++;
      }
    }
    if ("acupointCode" in link && link.acupointCode) {
      const acupoint = createdAcupoints.find((a) => a.code === link.acupointCode);
      const key = `a|${ev.id}|${acupoint?.id}`;
      if (acupoint && !seenLink.has(key)) {
        seenLink.add(key);
        await prisma.evidenceAcupointLink.create({
          data: { evidenceId: ev.id, acupointId: acupoint.id, outcomeType: link.outcomeType as any, effectDirection: link.effectDirection as any },
        });
        evidenceLinkCount++;
      }
    }
    if ("patternPinyin" in link && link.patternPinyin) {
      const pattern = createdPatterns.find((p) => p.pinyinName === link.patternPinyin);
      const key = `p|${ev.id}|${pattern?.id}`;
      if (pattern && !seenLink.has(key)) {
        seenLink.add(key);
        await prisma.evidencePatternLink.create({
          data: { evidenceId: ev.id, patternId: pattern.id, outcomeType: link.outcomeType as any, effectDirection: link.effectDirection as any },
        });
        evidenceLinkCount++;
      }
    }
  }

  console.log(`Evidence links: ${evidenceLinkCount} created`);

  // ── 8. Seed HerbDrugInteractions (from interactions.ts) ────────
  let herbDrugCount = 0;
  for (const hdi of herbDrugInteractionsData) {
    const herb = createdHerbs.find((h) => h.pinyinName === hdi.herbPinyin);
    if (!herb) continue;
    await prisma.herbDrugInteraction.create({
      data: {
        herbId: herb.id, drugName: hdi.drugName, drugClass: hdi.drugClass ?? null,
        interactionType: hdi.interactionType as any, severity: hdi.severity as any,
        mechanism: hdi.mechanism ?? null, clinicalEffect: hdi.clinicalEffect ?? null,
        management: hdi.management ?? null, evidenceQuality: hdi.evidenceQuality as any,
      },
    });
    herbDrugCount++;
  }
  console.log(`HerbDrugInteractions: ${herbDrugCount} created`);

  // ── 9. Seed HerbHerbInteractions (from interactions.ts) ────────
  let herbHerbCount = 0;
  for (const hhi of herbHerbInteractionsData) {
    const herbA = createdHerbs.find((h) => h.pinyinName === hhi.herbAPinyin);
    const herbB = createdHerbs.find((h) => h.pinyinName === hhi.herbBPinyin);
    if (!herbA || !herbB) continue;
    await prisma.herbHerbInteraction.create({
      data: {
        herbAId: herbA.id, herbBId: herbB.id,
        interactionType: hhi.interactionType as any, classicalSource: hhi.classicalSource ?? null,
        severity: hhi.severity as any, description: hhi.description ?? null,
      },
    });
    herbHerbCount++;
  }
  console.log(`HerbHerbInteractions: ${herbHerbCount} created`);

  // ── 10. Seed HerbContraindications (from interactions.ts) ──────
  let herbContraCount = 0;
  for (const hc of herbContraindicationsData) {
    const herb = createdHerbs.find((h) => h.pinyinName === hc.herbPinyin);
    if (!herb) continue;
    await prisma.herbContraindication.create({
      data: {
        herbId: herb.id, condition: hc.condition, severity: hc.severity as any,
        description: hc.description ?? null, pregnancyCategory: hc.pregnancyCategory as any,
      },
    });
    herbContraCount++;
  }
  console.log(`HerbContraindications: ${herbContraCount} created`);

  // ── Done ────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
