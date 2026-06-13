/**
 * Batch expansion #7 — add 7 Chinese patent medicines (中成藥) as Formula
 * entries. These are proprietary preparations cited in evidence entries that
 * currently can't auto-link.
 *
 * Idempotent — skips by pinyinName.
 *
 * Run: npx tsx scripts/expand-7-patent-meds.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface FH { pinyin: string; role: "JUN" | "CHEN" | "ZUO" | "SHI"; dose?: string; notes?: string }
interface F {
  p: string; c: string; eng: string; src: string; cat: string;
  actions: string; indications: string; modifications?: string;
  herbs: FH[];
}

// Note: chineseName is the exact form referenced in evidence titles so the
// auto-linker (which uses includes() on chineseName) will match.
const FORMULAS: F[] = [
  { p: "Tong Xin Luo Jiao Nang", c: "通心絡膠囊", eng: "Tongxinluo Capsule",
    src: "石學敏院士研製 / 國藥准字 Z19980015",
    cat: "Patent Medicine",
    actions: "益氣活血，通絡止痛",
    indications: "冠心病心絞痛屬氣虛血瘀絡阻證；缺血性中風病恢復期氣虛血瘀絡阻證；冠脈介入術後輔助治療。",
    modifications: "JAMA 2023發表的CTS-AMI多中心RCT (n=3,797 STEMI)證實顯著降低30天MACCE (3.4% vs 5.2%) 與1年不良事件。",
    herbs: [
      { pinyin: "Ren Shen", role: "JUN", dose: "—", notes: "膠囊製劑，組方含人參" },
      { pinyin: "Chuan Xiong", role: "CHEN", dose: "—", notes: "活血通絡" },
      { pinyin: "Chi Shao", role: "CHEN", dose: "—" },
    ] },
  { p: "Yun Nan Bai Yao", c: "雲南白藥", eng: "Yunnan Baiyao",
    src: "曲煥章 1902 / 國藥准字 Z53020795",
    cat: "Patent Medicine",
    actions: "化瘀止血，活血止痛，解毒消腫",
    indications: "跌打損傷、瘀血腫痛；內傷出血（咯血、嘔血、便血、尿血、外傷出血）；癰瘡腫毒。配方含保密成分，現代臨床廣用於消化道出血、術後止血、扭挫傷。",
    modifications: "55項研究（n=5,150）系統評價支持其止血與抗潰瘍作用。FDA保密配方產品。",
    herbs: [
      { pinyin: "San Qi", role: "JUN", dose: "—", notes: "主要止血活血成分" },
    ] },
  { p: "Huang Kui Jiao Nang", c: "黃葵膠囊", eng: "Huangkui Capsule",
    src: "蘇中藥業 / 國藥准字 Z19990040",
    cat: "Patent Medicine",
    actions: "清利濕熱，解毒消腫",
    indications: "慢性腎炎、慢性腎病屬濕熱證；2型糖尿病腎病早中期。為單味黃蜀葵花（Abelmoschus manihot）提取物。",
    modifications: "多項RCT與薈萃分析顯示可降低24h尿蛋白，改善eGFR下降速度，安全性良好。被《中國糖尿病腎病防治臨床指南》推薦。",
    herbs: [] },
  { p: "Fu Fang E Jiao Jiang", c: "複方阿膠漿", eng: "Compound E Jiao Syrup",
    src: "山東東阿阿膠 / 國藥准字 Z37020023",
    cat: "Patent Medicine",
    actions: "補氣養血",
    indications: "氣血兩虛、頭暈目眩、心悸失眠、食欲不振及貧血；腫瘤化療相關白細胞減少症、慢性疲勞綜合徵。",
    modifications: "多項RCT支持其改善腫瘤化療所致白細胞減少。常與升白藥物聯用。",
    herbs: [
      { pinyin: "E Jiao", role: "JUN", dose: "—", notes: "主藥" },
      { pinyin: "Ren Shen", role: "CHEN", dose: "—" },
      { pinyin: "Shu Di Huang", role: "CHEN", dose: "—" },
      { pinyin: "Dang Shen", role: "ZUO", dose: "—" },
      { pinyin: "Shan Zha", role: "ZUO", dose: "—" },
    ] },
  { p: "Xue Bi Jing Zhu She Ye", c: "血必淨注射液", eng: "Xuebijing Injection",
    src: "天津紅日藥業 / 國藥准字 Z20040033",
    cat: "Patent Medicine",
    actions: "化瘀解毒",
    indications: "膿毒症（sepsis）、嚴重感染所致全身炎症反應綜合徵（SIRS）、多器官功能障礙綜合徵（MODS）；新冠肺炎重症型輔助治療。",
    modifications: "EXIT-SEP 2023 (Chest)等多中心RCT顯示降低膿毒症28天死亡率與APACHE II評分。被《中國膿毒症/膿毒性休克急診治療指南》推薦。",
    herbs: [
      { pinyin: "Hong Hua", role: "JUN", dose: "—" },
      { pinyin: "Chi Shao", role: "JUN", dose: "—" },
      { pinyin: "Chuan Xiong", role: "CHEN", dose: "—" },
      { pinyin: "Dang Gui", role: "CHEN", dose: "—" },
      { pinyin: "Dan Shen", role: "ZUO", dose: "—" },
    ] },
  { p: "Li Qing Tong Ke Li", c: "利清通顆粒", eng: "Liqingtong Granules",
    src: "中藥院內製劑 / 隨機雙盲安慰劑對照試驗",
    cat: "Patent Medicine",
    actions: "清熱利濕，活血化瘀",
    indications: "高尿酸血症（無症狀型）；痛風緩解期；濕熱蘊結兼血瘀證。",
    modifications: "雙盲安慰劑對照先導試驗顯示降低血尿酸水平，效果與非布司他相當而胃腸道副作用更少。",
    herbs: [] },
  { p: "Gong Liu Ning Jiao Nang", c: "宮瘤寧膠囊", eng: "Gongliuning Capsule",
    src: "通化萬通藥業 / 國藥准字 Z20025069",
    cat: "Patent Medicine",
    actions: "活血化瘀，軟堅散結，調經止血",
    indications: "子宮肌瘤屬瘀血內阻證；異常子宮出血伴肌瘤；月經量多、經期延長。常作為保守治療或術前準備用藥。",
    modifications: "RCT系統評價顯示縮小肌瘤體積、減少出血量。",
    herbs: [
      { pinyin: "San Qi", role: "JUN", dose: "—" },
      { pinyin: "Yi Mu Cao", role: "CHEN", dose: "—" },
      { pinyin: "Dang Gui", role: "CHEN", dose: "—" },
    ] },
];

async function main() {
  console.log(`\n[expand-7] Add ${FORMULAS.length} Chinese patent medicines (中成藥)\n`);

  let fc = 0, totalLinks = 0;
  const missingHerbs = new Set<string>();

  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({
      where: { OR: [{ pinyinName: f.p }, { chineseName: f.c }] },
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
    const tag = preexisting ? "↻ existing" : "✓ patent";
    console.log(`  ${tag}: ${f.c} (${f.p}) [+${linked} herbs]`);
  }

  if (missingHerbs.size > 0) {
    console.log(`\n  ⚠ Missing herbs: ${[...missingHerbs].sort().join(", ")}`);
  }

  console.log(`\n[expand-7] +${fc} patent medicines · +${totalLinks} formula-herb links`);

  const fCount = await prisma.formula.count();
  const patentCount = await prisma.formula.count({ where: { category: "Patent Medicine" } });
  console.log(`  Total formulas: ${fCount} (Patent Medicine: ${patentCount})`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
