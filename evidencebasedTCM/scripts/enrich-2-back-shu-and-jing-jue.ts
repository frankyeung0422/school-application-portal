/**
 * Content enrichment #2 — add 7 commonly-cited acupoints (back-Shu points
 * and key Liver/Spleen/Stomach points) referenced by patterns.
 *
 * Then backfill pattern-acupoint links for these new points.
 *
 * Idempotent — skips by code.
 *
 * Run: npx tsx scripts/enrich-2-back-shu-and-jing-jue.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface AP {
  code: string; p: string; c: string; eng: string; merid: string;
  loc: string; depth: string; act: string; ind: string;
}

const ACUPOINTS: AP[] = [
  { code: "BL15", p: "Xin Shu", c: "心俞", eng: "Heart Shu", merid: "Bladder",
    loc: "背部，第5胸椎棘突下，旁開1.5寸",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "理氣寧心，通絡安神",
    ind: "心痛、驚悸、失眠健忘、咳嗽吐血、夢遺、癲癇" },
  { code: "BL17", p: "Ge Shu", c: "膈俞", eng: "Diaphragm Shu / Blood Influential Point",
    merid: "Bladder",
    loc: "背部，第7胸椎棘突下，旁開1.5寸",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "理氣寬胸，活血化瘀，和血止血",
    ind: "嘔吐、呃逆、氣喘、咳嗽、吐血、便血、潮熱盜汗、瘀血諸證。為「血會」要穴。" },
  { code: "BL18", p: "Gan Shu", c: "肝俞", eng: "Liver Shu", merid: "Bladder",
    loc: "背部，第9胸椎棘突下，旁開1.5寸",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "疏肝利膽，理氣明目",
    ind: "黃疸、脅痛、吐血、目赤、目視不明、癲狂、脊背痛" },
  { code: "LV2", p: "Xing Jian", c: "行間", eng: "Walking Between", merid: "Liver",
    loc: "足背側，當第1、2趾間，趾蹼緣的後方赤白肉際處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清肝瀉熱，涼血安神，息風活絡",
    ind: "頭痛、目眩、目赤腫痛、青盲、口眼歪斜、脅痛、疝氣、小便不利、遺尿、月經不調、痛經、閉經、崩漏、帶下、中風、癲癇" },
  { code: "LV3", p: "Tai Chong", c: "太衝", eng: "Great Surge", merid: "Liver",
    loc: "足背側，當第1蹠骨間隙的後方凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "平肝息風，清熱利濕，通絡止痛",
    ind: "頭痛、眩暈、疝氣、月經不調、癃閉、遺尿、小兒驚風、癲狂癇、脅痛、腹脹、黃疸、嘔逆、咽痛嗌乾、目赤腫痛、膝股內側痛、足跗腫、下肢痿痺。為肝經原穴，「四關穴」之一（與合谷相配）。" },
  { code: "SP10", p: "Xue Hai", c: "血海", eng: "Sea of Blood", merid: "Spleen",
    loc: "屈膝，在髕骨內上緣上2寸，當股四頭肌內側頭的隆起處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "調經統血，健脾化濕",
    ind: "月經不調、痛經、經閉、崩漏、癮疹、濕疹、丹毒、膝痛" },
  { code: "ST21", p: "Liang Men", c: "梁門", eng: "Beam Gate", merid: "Stomach",
    loc: "上腹部，臍中上4寸，距前正中線2寸",
    depth: "0.8-1.2 cun, perpendicular insertion",
    act: "調中和胃，理氣消積",
    ind: "胃痛、嘔吐、食欲不振、腹脹、泄瀉" },
];

// Backfill pattern-acupoint links for patterns that reference these new codes.
const BACKFILL: Array<{ pattern: string; code: string; method?: string; notes?: string }> = [
  { pattern: "Xin Qi Xu", code: "BL15", method: "補法", notes: "心俞" },
  { pattern: "Xin Pi Liang Xu", code: "BL15", method: "補法", notes: "心俞" },
  { pattern: "Qi Zhi Xue Yu", code: "BL17", method: "瀉法", notes: "膈俞 — 血會" },
  { pattern: "Gan Xue Xu", code: "BL18", method: "補法", notes: "肝俞" },
  { pattern: "Gan Yang Shang Kang", code: "LV2", method: "瀉法", notes: "行間 — 滎穴清肝火" },
  { pattern: "Gan Yang Shang Kang", code: "LV3", method: "瀉法", notes: "太衝" },
  { pattern: "Gan Xue Xu", code: "SP10", method: "補法", notes: "血海" },
  { pattern: "Qi Zhi Xue Yu", code: "SP10", method: "瀉法", notes: "血海化瘀" },
  { pattern: "Shi Zhi Wei Wan", code: "ST21", method: "平補平瀉", notes: "梁門" },
];

async function main() {
  console.log(`\n[enrich-2] Add ${ACUPOINTS.length} acupoints + backfill ${BACKFILL.length} pattern-acupoint links\n`);

  let ac = 0;
  for (const a of ACUPOINTS) {
    const dup = await prisma.acupuncturePoint.findFirst({ where: { code: a.code } });
    if (dup) { console.log(`  ↷ acu: ${a.code}`); continue; }
    await prisma.acupuncturePoint.create({
      data: {
        code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng,
        meridian: a.merid, location: a.loc, depth: a.depth,
        actions: a.act, indications: a.ind, status: "PUBLISHED",
      },
    });
    console.log(`  ✓ acu: ${a.code} ${a.c} (${a.merid})`);
    ac++;
  }

  let bc = 0;
  for (const b of BACKFILL) {
    const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: b.pattern } });
    const acu = await prisma.acupuncturePoint.findFirst({ where: { code: b.code } });
    if (!pat || !acu) {
      console.log(`  ⚠ skip backfill: ${b.pattern} → ${b.code}`);
      continue;
    }
    try {
      await prisma.patternAcupoint.create({
        data: { patternId: pat.id, acupointId: acu.id, stimulationMethod: b.method, notes: b.notes },
      });
      bc++;
      console.log(`  ✓ link: ${b.pattern} → ${b.code}`);
    } catch { /* dup */ }
  }

  console.log(`\n[enrich-2] +${ac} acupoints · +${bc} pattern-acupoint backfill links`);

  const [aCount, paCount] = await Promise.all([
    prisma.acupuncturePoint.count(),
    prisma.patternAcupoint.count(),
  ]);
  console.log(`  Total acupoints: ${aCount} · pattern-acupoint links: ${paCount}`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
