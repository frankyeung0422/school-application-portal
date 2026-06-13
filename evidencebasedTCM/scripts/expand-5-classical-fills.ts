/**
 * Batch expansion #5 — add classical formulas and herbs referenced by orphan
 * evidence entries (so auto-link can attach them).
 *
 * Adds: 三仁湯, 鎮肝熄風湯, 麥門冬湯 (classical formulas in unlinked evidence titles)
 *       青蒿 (Sweet Wormwood — source of artemisinin, Nobel Prize 2015)
 *
 * Idempotent — skips by pinyinName.
 *
 * Run: npx tsx scripts/expand-5-classical-fills.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

const HERBS: H[] = [
  { p: "Qing Hao", c: "青蒿", lat: "Artemisia annua", eng: "Sweet Wormwood / Sweet Annie",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter", "Pungent"],
    merid: ["Liver", "Gallbladder"], dose: "6-12g (後下)",
    desc: "清虛熱，除骨蒸，解暑熱，截瘧，退黃。用於溫邪傷陰、夜熱早涼、陰虛發熱、勞熱骨蒸、暑邪發熱、瘧疾寒熱、濕熱黃疸。為治瘧之要藥。後下，不宜久煎。",
    pharm: "含青蒿素（artemisinin）、青蒿琥酯及衍生物。青蒿素為過氧橋倍半萜內酯，通過Fe²⁺活化產生自由基殺滅瘧原蟲與腫瘤細胞。屠呦呦因發現青蒿素獲2015年諾貝爾生理或醫學獎。WHO推薦ACT為瘧疾一線治療。" },
  { p: "Zhi Mu", c: "知母", lat: "Anemarrhena asphodeloides", eng: "Anemarrhena Rhizome",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter", "Sweet"],
    merid: ["Lung", "Stomach", "Kidney"], dose: "6-12g",
    desc: "清熱瀉火，滋陰潤燥。用於外感熱病、高熱煩渴、肺熱燥咳、骨蒸潮熱、內熱消渴、腸燥便秘。為白虎湯之要藥。",
    pharm: "含知母皂苷、芒果苷、菝葜皂苷元。具有解熱、降血糖、抗炎、抗菌、抗腫瘤作用。" },
  { p: "Shi Gao", c: "石膏", lat: "Gypsum Fibrosum", eng: "Gypsum",
    cat: "Heat Clearing", nat: "COLD", flav: ["Sweet", "Pungent"],
    merid: ["Lung", "Stomach"], dose: "15-60g (先煎)",
    desc: "清熱瀉火，除煩止渴。煅用斂瘡生肌，收濕，止血。用於外感熱病、高熱煩渴、肺熱喘咳、胃火亢盛、頭痛、牙痛；煅用治潰瘍不斂、濕疹瘙癢、水火燙傷、外傷出血。先煎。",
    pharm: "主要成分為CaSO₄·2H₂O。具有解熱、抗炎、降低神經肌肉興奮性作用。" },
];

interface FH { pinyin: string; role: "JUN" | "CHEN" | "ZUO" | "SHI"; dose?: string; notes?: string }
interface F {
  p: string; c: string; eng: string; src: string; cat: string;
  actions: string; indications: string; modifications?: string;
  herbs: FH[];
}

const FORMULAS: F[] = [
  { p: "San Ren Tang", c: "三仁湯", eng: "Three-Seed Decoction", src: "溫病條辨",
    cat: "Aromatic Damp-Dissolving",
    actions: "宣暢氣機，清利濕熱",
    indications: "濕溫初起及暑溫夾濕，邪在氣分，濕重於熱證。頭痛惡寒、身重疼痛、肢體倦怠、面色淡黃、胸悶不飢、午後身熱、苔白不渴、脈弦細而濡。",
    herbs: [
      { pinyin: "Xing Ren", role: "JUN", dose: "15g" },
      { pinyin: "Bai Dou Kou", role: "JUN", dose: "6g" },
      { pinyin: "Yi Yi Ren", role: "JUN", dose: "18g" },
      { pinyin: "Hua Shi", role: "CHEN", dose: "18g" },
      { pinyin: "Tong Cao", role: "CHEN", dose: "6g" },
      { pinyin: "Zhu Ye", role: "ZUO", dose: "6g" },
      { pinyin: "Hou Po", role: "ZUO", dose: "6g" },
      { pinyin: "Ban Xia", role: "ZUO", dose: "15g" },
    ] },
  { p: "Zhen Gan Xi Feng Tang", c: "鎮肝熄風湯", eng: "Sedate the Liver and Extinguish Wind Decoction",
    src: "醫學衷中參西錄",
    cat: "Wind Extinguishing",
    actions: "鎮肝熄風，滋陰潛陽",
    indications: "類中風。頭目眩暈、目脹耳鳴、腦部熱痛、面色如醉、心中煩熱，或時常噫氣，或肢體漸覺不利、口角漸形㖞斜，甚或眩暈顛仆、昏不知人、移時始醒，或醒後不能復原，脈弦長有力。",
    herbs: [
      { pinyin: "Niu Xi", role: "JUN", dose: "30g" },
      { pinyin: "Dai Zhe Shi", role: "JUN", dose: "30g" },
      { pinyin: "Long Gu", role: "CHEN", dose: "15g" },
      { pinyin: "Mu Li", role: "CHEN", dose: "15g" },
      { pinyin: "Gui Ban", role: "CHEN", dose: "15g" },
      { pinyin: "Bai Shao", role: "ZUO", dose: "15g" },
      { pinyin: "Xuan Shen", role: "ZUO", dose: "15g" },
      { pinyin: "Tian Dong", role: "ZUO", dose: "15g" },
      { pinyin: "Chuan Lian Zi", role: "ZUO", dose: "6g" },
      { pinyin: "Mai Ya", role: "ZUO", dose: "6g" },
      { pinyin: "Yin Chen Hao", role: "ZUO", dose: "6g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "5g" },
    ] },
  { p: "Mai Men Dong Tang", c: "麥門冬湯", eng: "Ophiopogon Decoction",
    src: "金匱要略",
    cat: "Yin Tonifying",
    actions: "潤肺益胃，降逆下氣",
    indications: "虛熱肺痿。咳唾涎沫、短氣喘促、咽喉不利、咳逆上氣、口乾咽燥、手足心熱、舌紅少苔、脈虛數。亦治胃陰不足之氣逆嘔吐、口渴咽乾。",
    herbs: [
      { pinyin: "Mai Dong", role: "JUN", dose: "60g" },
      { pinyin: "Ban Xia", role: "CHEN", dose: "9g" },
      { pinyin: "Ren Shen", role: "ZUO", dose: "6g" },
      { pinyin: "Geng Mi", role: "ZUO", dose: "6g" },
      { pinyin: "Da Zao", role: "ZUO", dose: "12 pieces" },
      { pinyin: "Gan Cao", role: "SHI", dose: "4g" },
    ] },
];

async function main() {
  console.log(`\n[expand-5] Add ${HERBS.length} herbs + ${FORMULAS.length} classical formulas\n`);

  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) { console.log(`  ↷ herb: ${h.p}`); continue; }
    await prisma.herb.create({
      data: {
        pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng,
        category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid,
        dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm,
        status: "PUBLISHED",
      },
    });
    console.log(`  ✓ herb: ${h.c} (${h.p}) — ${h.cat}`);
    hc++;
  }

  let fc = 0, totalLinks = 0;
  const missingHerbs = new Set<string>();

  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({
      where: { pinyinName: f.p },
      include: { herbs: { select: { herbId: true } } },
    });

    let formulaId: string;
    let preexisting = false;
    if (existing) {
      formulaId = existing.id;
      preexisting = true;
    } else {
      const created = await prisma.formula.create({
        data: {
          pinyinName: f.p, chineseName: f.c, englishName: f.eng,
          sourceText: f.src, category: f.cat,
          actions: f.actions, indications: f.indications,
          modifications: f.modifications,
          status: "PUBLISHED",
        },
      });
      formulaId = created.id;
      fc++;
    }

    const alreadyLinked = new Set(existing?.herbs.map((h) => h.herbId) ?? []);

    let linked = 0;
    for (const fh of f.herbs) {
      const herb = await prisma.herb.findFirst({ where: { pinyinName: fh.pinyin } });
      if (!herb) { missingHerbs.add(fh.pinyin); continue; }
      if (alreadyLinked.has(herb.id)) continue;
      try {
        await prisma.formulaHerb.create({
          data: { formulaId, herbId: herb.id, role: fh.role, dosage: fh.dose, notes: fh.notes },
        });
        linked++;
      } catch { /* dup */ }
    }
    totalLinks += linked;
    const tag = preexisting ? "↻ existing" : "✓ formula";
    console.log(`  ${tag}: ${f.c} (${f.p}) [+${linked} herbs]`);
  }

  if (missingHerbs.size > 0) {
    console.log(`\n  ⚠ Missing herbs (skipped): ${[...missingHerbs].sort().join(", ")}`);
  }

  console.log(`\n[expand-5] +${hc} herbs · +${fc} formulas · +${totalLinks} formula-herb links`);

  const [hCount, fCount, aCount, eCount] = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
    prisma.evidenceEntry.count(),
  ]);
  console.log(`  DB totals: ${hCount} herbs · ${fCount} formulas · ${aCount} acupoints · ${eCount} evidence`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
