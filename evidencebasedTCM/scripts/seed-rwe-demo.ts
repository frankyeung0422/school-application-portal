/**
 * Real-World Evidence demo data seed.
 *
 * The clinical tables (patients / consultations / vitals / prescriptions) ship
 * empty, so the RWE dashboard would have nothing to aggregate. This seeds
 * CLEARLY-MARKED synthetic data — every patient name is prefixed 【示範】 and
 * notes carry the [RWE-DEMO] marker — so the dashboard is demonstrable without
 * polluting real records. Idempotent: skips if demo patients already exist
 * (pass --force to wipe and reseed).
 *
 * Dry run: npx tsx scripts/seed-rwe-demo.ts
 * Apply:   npx tsx scripts/seed-rwe-demo.ts --apply
 * Reseed:  npx tsx scripts/seed-rwe-demo.ts --apply --force
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const DEMO_MARKER = "[RWE-DEMO]";

type VitalKind = "hba1c" | "bp" | "bmi" | null;

interface Cohort {
  key: string;
  label: string;
  complaint: string;
  formulaKeys: string[];
  patternKeys: string[];
  vital: VitalKind;
  patients: number;
  responderRate: number; // fraction of patients who clinically respond
}

const COHORTS: Cohort[] = [
  { key: "t2dm", label: "消渴/2型糖尿病", complaint: "口渴多飲、易疲倦、血糖偏高", formulaKeys: ["知柏地黃", "白虎", "六味地黃"], patternKeys: ["腎陰虛", "肝腎陰虛", "濕熱"], vital: "hba1c", patients: 12, responderRate: 0.8 },
  { key: "htn", label: "眩暈/原發性高血壓", complaint: "頭暈、頭脹、血壓升高", formulaKeys: ["天麻鉤藤", "半夏白朮天麻"], patternKeys: ["痰濕內阻", "肝腎陰虛"], vital: "bp", patients: 12, responderRate: 0.78 },
  { key: "insomnia", label: "不寐/慢性失眠", complaint: "入睡困難、多夢易醒", formulaKeys: ["酸棗仁", "天王補心", "甘麥大棗"], patternKeys: ["心血虛", "腎陰虛"], vital: null, patients: 12, responderRate: 0.82 },
  { key: "depression", label: "鬱證/情志不舒", complaint: "情緒低落、胸悶善太息", formulaKeys: ["逍遙", "甘麥大棗"], patternKeys: ["肝氣鬱結"], vital: null, patients: 10, responderRate: 0.6 },
  { key: "cfs", label: "虛勞/慢性疲勞", complaint: "倦怠乏力、氣短懶言", formulaKeys: ["補中益氣", "參苓白朮"], patternKeys: ["脾氣虛", "氣血兩虛"], vital: "bmi", patients: 10, responderRate: 0.75 },
  { key: "rhinitis", label: "鼻鼽/過敏性鼻炎", complaint: "陣發性噴嚏、鼻塞流清涕", formulaKeys: ["玉屏風"], patternKeys: ["肺氣虛"], vital: null, patients: 8, responderRate: 0.8 },
  { key: "bloodstasis", label: "血瘀/偏頭痛", complaint: "反覆頭痛、痛處固定", formulaKeys: ["血府逐瘀", "桃紅四物"], patternKeys: ["血瘀"], vital: null, patients: 8, responderRate: 0.58 },
];

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const randInt = (lo: number, hi: number) => Math.floor(rand(lo, hi + 1));
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

async function resolveFormula(keys: string[]) {
  for (const k of keys) {
    const f = await prisma.formula.findFirst({ where: { chineseName: { contains: k } }, select: { id: true, chineseName: true } });
    if (f) return f;
  }
  return null;
}
async function resolvePattern(keys: string[]) {
  for (const k of keys) {
    const p = await prisma.tcmPattern.findFirst({ where: { chineseName: { contains: k } }, select: { id: true, chineseName: true } });
    if (p) return p;
  }
  return null;
}

async function main() {
  const practitioner = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!practitioner) {
    console.error("No user found to own demo patients — seed a user first.");
    process.exitCode = 1;
    return;
  }

  const existing = await prisma.patient.count({ where: { notes: { contains: DEMO_MARKER } } });
  if (existing > 0) {
    if (!FORCE) {
      console.log(`${existing} demo patients already exist. Use --force to wipe and reseed. Nothing to do.`);
      return;
    }
    if (APPLY) {
      const demo = await prisma.patient.findMany({ where: { notes: { contains: DEMO_MARKER } }, select: { id: true } });
      await prisma.patient.deleteMany({ where: { id: { in: demo.map((d) => d.id) } } }); // cascades consultations/vitals/Rx
      console.log(`Wiped ${demo.length} existing demo patients (cascade).`);
    }
  }

  let patientsCreated = 0;
  let consultsCreated = 0;

  for (const cohort of COHORTS) {
    const formula = await resolveFormula(cohort.formulaKeys);
    const pattern = await resolvePattern(cohort.patternKeys);
    if (!formula || !pattern) {
      console.warn(`  ⚠ ${cohort.label}: missing ${!formula ? "formula" : "pattern"} — skipping cohort`);
      continue;
    }
    if (!APPLY) {
      console.log(`  [dry] ${cohort.label}: ${cohort.patients} patients → formula ${formula.chineseName}, pattern ${pattern.chineseName}`);
      continue;
    }

    for (let p = 0; p < cohort.patients; p++) {
      const responder = Math.random() < cohort.responderRate;
      const visits = randInt(2, 3);
      const baselineSeverity = randInt(6, 9); // 0–10 VAS at first visit
      // baseline vital values per kind
      let hba1c = rand(7.8, 9.2);
      let sbp = randInt(146, 162);
      let dbp = randInt(92, 100);
      let bmi = rand(26, 30);

      const patient = await prisma.patient.create({
        data: {
          practitionerId: practitioner.id,
          name: `【示範】${cohort.key.toUpperCase()}-${String(p + 1).padStart(2, "0")}`,
          notes: `${DEMO_MARKER} 合成資料，用於真實世界證據儀表板示範（${cohort.label}）。`,
          chronicConditions: cohort.label,
        },
      });
      patientsCreated++;

      // weeks ago for the first visit, then ~4-week intervals forward
      const firstWeeksAgo = visits * 4 + randInt(0, 3);
      for (let v = 0; v < visits; v++) {
        const weeksAgo = firstWeeksAgo - v * 4;
        const visitDate = new Date(Date.now() - weeksAgo * 7 * 24 * 3600 * 1000);

        // symptom score: improves over visits if responder, else flat-ish
        const progress = visits > 1 ? v / (visits - 1) : 1; // 0..1
        const totalDrop = responder ? randInt(3, 5) : randInt(0, 1);
        const before = Math.max(1, Math.round(baselineSeverity - totalDrop * progress * 0.6));
        const afterDrop = responder ? rand(1.5, 2.8) : rand(0.2, 1.0);
        const after = Math.max(0, Math.round(before - afterDrop));

        const adverse = Math.random() < 0.06 ? "輕度胃部不適，調整服法後緩解。" : null;

        const consult = await prisma.consultation.create({
          data: {
            patientId: patient.id,
            practitionerId: practitioner.id,
            visitDate,
            chiefComplaint: cohort.complaint,
            patternId: pattern.id,
            treatmentPrinciple: "辨證論治",
            symptomScoreBefore: before,
            symptomScoreAfter: after,
            adverseEffects: adverse,
            outcomeNotes: responder ? "症狀較前改善。" : "症狀變化不明顯，續觀察。",
          },
        });
        consultsCreated++;

        await prisma.consultationPrescription.create({
          data: {
            consultationId: consult.id,
            formulaId: formula.id,
            dosesPerDay: 2,
            daysSupply: 28,
            preparation: "水煎服，分早晚兩次溫服。",
          },
        });

        // vitals — trend the cohort-relevant measure downward over visits
        const vitalData: Record<string, number> = {};
        if (cohort.vital === "hba1c") {
          vitalData.hba1c = round1(hba1c - (responder ? 0.6 : 0.1) * v);
          vitalData.fastingGlucose = round1(8.5 - (responder ? 0.7 : 0.1) * v);
        } else if (cohort.vital === "bp") {
          vitalData.bpSystolic = Math.round(sbp - (responder ? 7 : 1) * v);
          vitalData.bpDiastolic = Math.round(dbp - (responder ? 4 : 1) * v);
        } else if (cohort.vital === "bmi") {
          vitalData.bmi = round1(bmi - (responder ? 0.5 : 0.1) * v);
          vitalData.weightKg = round1(rand(60, 80));
        }
        if (Object.keys(vitalData).length > 0) {
          await prisma.consultationVital.create({
            data: { consultationId: consult.id, measuredAt: visitDate, ...vitalData },
          });
        }
      }
      void hba1c; void sbp; void dbp; void bmi;
    }
    console.log(`  ✓ ${cohort.label}: ${cohort.patients} patients (formula ${formula.chineseName}, pattern ${pattern.chineseName})`);
  }

  if (APPLY) console.log(`\n✓ Applied. patientsCreated=${patientsCreated} consultationsCreated=${consultsCreated}`);
  else console.log(`\n(dry run) Re-run with --apply.`);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
