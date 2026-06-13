/**
 * Batch expansion #2 — fill audit-identified gaps.
 *
 * Steps:
 *   1. Normalize duplicate category names (Blood Invigorating → Blood Activating,
 *      Wind-Damp Dispelling → Wind-Dampness Expelling) so the audit stops
 *      reporting false gaps for the same TCM concept under two names.
 *   2. Add herbs to genuinely under-represented categories (Yang Tonifying,
 *      Purgatives, Blood Activating) plus 薑黃 (referenced in evidence).
 *   3. Add acupoints for under-represented meridians (Heart, Small Intestine,
 *      Pericardium, Triple Energizer) plus BL67 至陰 (referenced in evidence).
 *
 * Idempotent — skips by pinyinName/code.
 *
 * Run: npx tsx scripts/expand-2-fill-gaps.ts
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
  // ── Yang Tonifying ──────────────────────────────────────────
  { p: "Lu Rong", c: "鹿茸", lat: "Cervus nippon", eng: "Deer Antler Velvet", cat: "Yang Tonifying", nat: "WARM",
    flav: ["Sweet", "Salty"], merid: ["Liver", "Kidney"], dose: "1-2g (powder)",
    desc: "壯腎陽，益精血，強筋骨，調沖任，托瘡毒。用於陽痿滑精、宮冷不孕、羸瘦神疲、畏寒、眩暈耳鳴耳聾、腰脊冷痛、筋骨痿軟、崩漏帶下、陰疽不斂。為峻補腎陽要藥。研末沖服，從小量開始。",
    pharm: "含鹿茸多胺、鹿茸多肽、神經節苷脂、卵磷脂。具有促進生長、性激素樣作用、增強免疫、抗疲勞、促進骨折癒合、改善心血管功能。" },
  { p: "Ba Ji Tian", c: "巴戟天", lat: "Morinda officinalis", eng: "Morinda Root", cat: "Yang Tonifying", nat: "WARM",
    flav: ["Sweet", "Pungent"], merid: ["Liver", "Kidney"], dose: "3-10g",
    desc: "補腎陽，強筋骨，祛風濕。用於陽痿遺精、宮冷不孕、月經不調、少腹冷痛、風濕痺痛、筋骨痿軟。性質平和，補陽而不燥。",
    pharm: "含蒽醌類、環烯醚萜苷、多糖。具有抗抑鬱、增強免疫、抗骨質疏鬆、雄激素樣作用、抗炎。現代用於骨質疏鬆與抗抑鬱。" },
  { p: "Xian Mao", c: "仙茅", lat: "Curculigo orchioides", eng: "Curculigo Rhizome", cat: "Yang Tonifying", nat: "HOT",
    flav: ["Pungent"], merid: ["Liver", "Kidney"], dose: "3-10g",
    desc: "補腎陽，強筋骨，祛寒濕。用於陽痿精冷、筋骨痿軟、腰膝冷痛、陽虛冷瀉。有小毒，不宜久服。",
    pharm: "含仙茅苷、石蒜鹼、酚醛苷類。具有性激素樣作用、抗骨質疏鬆、免疫調節、抗炎、保護心肌。" },
  { p: "Bu Gu Zhi", c: "補骨脂", lat: "Psoralea corylifolia", eng: "Psoralea Fruit", cat: "Yang Tonifying", nat: "WARM",
    flav: ["Bitter", "Pungent"], merid: ["Kidney", "Spleen"], dose: "6-10g",
    desc: "溫腎助陽，納氣，止瀉。用於腎陽不足、陽痿遺精、遺尿尿頻、腰膝冷痛、腎不納氣之虛喘、五更泄瀉。外用治白癜風、斑禿。",
    pharm: "含補骨脂素、異補骨脂素（光敏物質）、補骨脂酚。具有雌激素樣作用、抗骨質疏鬆、光敏（治白癜風）、抗腫瘤。注意肝毒性風險。" },

  // ── Blood Activating ───────────────────────────────────────
  { p: "Jiang Huang", c: "薑黃", lat: "Curcuma longa", eng: "Turmeric Rhizome", cat: "Blood Activating", nat: "WARM",
    flav: ["Pungent", "Bitter"], merid: ["Spleen", "Liver"], dose: "3-10g",
    desc: "破血行氣，通經止痛。用於胸脅刺痛、胸痺心痛、經閉、癥瘕、風濕肩臂疼痛、跌撲腫痛。為現代研究最廣泛之中藥之一。",
    pharm: "含薑黃素（curcumin）、揮發油（薑黃酮）。具有抗炎（NF-κB抑制）、抗氧化、抗腫瘤、保肝、降脂、抗阿茲海默、抗抑鬱。生物利用度低，常與胡椒鹼合用。已有大量GRADE系統評價支持其抗炎抗氧化效果。" },
  { p: "Yi Mu Cao", c: "益母草", lat: "Leonurus japonicus", eng: "Chinese Motherwort", cat: "Blood Activating", nat: "COOL",
    flav: ["Pungent", "Bitter"], merid: ["Liver", "Pericardium", "Bladder"], dose: "9-30g",
    desc: "活血調經，利尿消腫，清熱解毒。用於月經不調、痛經經閉、惡露不盡、水腫尿少、瘡瘍腫毒。為婦科經產要藥。孕婦慎用。",
    pharm: "含益母草鹼、水蘇鹼。具有興奮子宮、改善微循環、抗血小板聚集、利尿、降壓、抗炎。" },
  { p: "San Qi", c: "三七", lat: "Panax notoginseng", eng: "Notoginseng Root", cat: "Blood Activating", nat: "WARM",
    flav: ["Sweet", "Slightly Bitter"], merid: ["Liver", "Stomach"], dose: "3-9g (decoction); 1-3g (powder)",
    desc: "散瘀止血，消腫定痛。用於咯血、吐血、衄血、便血、崩漏、外傷出血、胸腹刺痛、跌撲腫痛。止血而不留瘀，活血而不傷正，為「血證之要藥」。",
    pharm: "含三七皂苷R1、人參皂苷Rb1/Rg1、三七素。具有止血（縮短出血時間）、活血（抗血小板）雙向作用、保護心肌、抗動脈粥樣硬化、神經保護。雲南白藥主要成分之一。" },
  { p: "Yu Jin", c: "鬱金", lat: "Curcuma aromatica", eng: "Curcuma Tuber", cat: "Blood Activating", nat: "COLD",
    flav: ["Pungent", "Bitter"], merid: ["Liver", "Heart", "Lung"], dose: "3-10g",
    desc: "活血止痛，行氣解鬱，清心涼血，利膽退黃。用於胸脅刺痛、胸痺心痛、經閉痛經、乳房脹痛、熱病神昏、癲癇發狂、血熱吐衄、黃疸尿赤。",
    pharm: "含薑黃素類、揮發油。具有保肝利膽、抗炎、抗氧化、抗血小板、抗抑鬱作用。" },

  // ── Purgatives ─────────────────────────────────────────────
  { p: "Mang Xiao", c: "芒硝", lat: "Mirabilitum (Sodium sulfate)", eng: "Mirabilite", cat: "Purgatives", nat: "COLD",
    flav: ["Salty", "Bitter"], merid: ["Stomach", "Large Intestine"], dose: "6-12g (dissolved)",
    desc: "瀉下通便，潤燥軟堅，清火消腫。用於實熱便秘、大便燥結、腹滿脹痛、停痰積聚；外治乳癰、痔瘡腫痛。沖入藥汁內服，外用適量化水點眼或塗敷。孕婦及哺乳期忌用。",
    pharm: "主要成分硫酸鈉。具有滲透性瀉下作用，腸道內形成高滲狀態使水分滯留，刺激腸蠕動。" },
  { p: "Fan Xie Ye", c: "番瀉葉", lat: "Cassia angustifolia", eng: "Senna Leaf", cat: "Purgatives", nat: "COLD",
    flav: ["Sweet", "Bitter"], merid: ["Large Intestine"], dose: "1.5-3g (infusion); 2-6g (decoction)",
    desc: "瀉熱行滯，通便利水。用於熱結積滯便秘、腹水腫脹。小劑量緩瀉，大劑量峻瀉。後下或開水泡服。孕婦、月經期及哺乳期忌用。",
    pharm: "含番瀉苷A、B、C、D。在腸道由腸菌轉化為大黃酸蒽酮，刺激結腸促進蠕動。長期使用可致結腸黑變病。" },
  { p: "Huo Ma Ren", c: "火麻仁", lat: "Cannabis sativa", eng: "Hemp Seed", cat: "Purgatives", nat: "NEUTRAL",
    flav: ["Sweet"], merid: ["Spleen", "Stomach", "Large Intestine"], dose: "9-15g",
    desc: "潤腸通便。用於血虛津虧、腸燥便秘、產後便秘、老年及體虛便秘。為潤下藥之代表，性質平和。打碎入煎。",
    pharm: "含脂肪油（亞麻酸、亞油酸）、植物蛋白、卵磷脂。具有潤滑腸道、軟化糞便、降血脂、降血壓作用。" },

  // ── (additional) Yin Tonifying ─────────────────────────────
  { p: "Gou Qi Zi", c: "枸杞子", lat: "Lycium barbarum", eng: "Goji Berry", cat: "Yin Tonifying", nat: "NEUTRAL",
    flav: ["Sweet"], merid: ["Liver", "Kidney"], dose: "6-12g",
    desc: "滋補肝腎，益精明目。用於虛勞精虧、腰膝酸痛、眩暈耳鳴、陽痿遺精、內熱消渴、血虛萎黃、目昏不明。為平補肝腎要藥，藥食兩用。",
    pharm: "含枸杞多糖（LBP）、玉米黃質、甜菜鹼。具有免疫調節、抗氧化、保護視網膜、降血糖、保肝、抗疲勞、神經保護。" },
];

interface AP {
  code: string; p: string; c: string; eng: string; merid: string;
  loc: string; depth: string; act: string; ind: string;
}

const ACUPOINTS: AP[] = [
  // Heart meridian
  { code: "HT3", p: "Shao Hai", c: "少海", eng: "Lesser Sea", merid: "Heart",
    loc: "屈肘成直角，當肘橫紋內側端與肱骨內上髁連線之中點處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "理氣通絡，益心安神",
    ind: "心痛、肘臂攣痛、瘰癧、頭項痛、腋脅痛" },
  { code: "HT5", p: "Tong Li", c: "通里", eng: "Connecting Li", merid: "Heart",
    loc: "腕橫紋上1寸，尺側腕屈肌腱橈側緣",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清熱安神，通經活絡",
    ind: "心悸怔忡、暴瘖、舌強不語、腕臂痛、心痛" },
  { code: "HT9", p: "Shao Chong", c: "少衝", eng: "Lesser Surge", merid: "Heart",
    loc: "小指末節橈側，距指甲角0.1寸",
    depth: "0.1 cun, prick to bleed",
    act: "清熱開竅，回陽救逆",
    ind: "心悸、心痛、癲狂、熱病昏迷、中風昏迷" },

  // Small Intestine meridian
  { code: "SI8", p: "Xiao Hai", c: "小海", eng: "Small Sea", merid: "Small Intestine",
    loc: "屈肘，當尺骨鷹嘴與肱骨內上髁之間凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "安神定志，清熱通絡",
    ind: "肘臂疼痛、麻木、癲癇、頸項痛、肩臂外側後緣痛" },
  { code: "SI19", p: "Ting Gong", c: "聽宮", eng: "Palace of Hearing", merid: "Small Intestine",
    loc: "面部，耳屏前，下頜骨髁狀突的後方，張口時呈凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion (mouth open)",
    act: "聰耳開竅",
    ind: "耳鳴、耳聾、聤耳、齒痛、癲狂" },

  // Pericardium meridian
  { code: "PC3", p: "Qu Ze", c: "曲澤", eng: "Marsh at the Bend", merid: "Pericardium",
    loc: "肘橫紋中，肱二頭肌腱的尺側緣",
    depth: "0.5-1.0 cun, perpendicular insertion or prick to bleed",
    act: "清熱寧心，和胃降逆",
    ind: "心痛、心悸、善驚、熱病、煩躁、胃痛、嘔吐、肘臂攣痛" },
  { code: "PC7", p: "Da Ling", c: "大陵", eng: "Great Mound", merid: "Pericardium",
    loc: "腕橫紋的中點處，掌長肌腱與橈側腕屈肌腱之間",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清心寧神，和胃寬胸",
    ind: "心痛、心悸、胃痛、嘔吐、驚悸、癲狂、胸脅痛、腕關節痛" },
  { code: "PC8", p: "Lao Gong", c: "勞宮", eng: "Palace of Toil", merid: "Pericardium",
    loc: "握拳時中指尖所指處，第2、3掌骨間",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清心瀉熱，開竅醒神",
    ind: "中風昏迷、中暑、心痛、癲狂、口瘡、口臭、鵝掌風" },

  // Triple Energizer (San Jiao)
  { code: "TE3", p: "Zhong Zhu", c: "中渚", eng: "Central Islet", merid: "Triple Energizer",
    loc: "手背部，當無名指本節（掌指關節）的後方，第4、5掌骨間凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清熱通絡，開竅益聰",
    ind: "頭痛、目赤、耳鳴耳聾、咽喉腫痛、肩背肘臂痠痛、手指不能屈伸" },
  { code: "TE17", p: "Yi Feng", c: "翳風", eng: "Wind Screen", merid: "Triple Energizer",
    loc: "耳垂後方，當乳突與下頜角之間的凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "聰耳通竅，散內泄熱",
    ind: "耳鳴、耳聾、口眼歪斜、牙關緊閉、頰腫、瘰癧、面神經麻痹" },
  { code: "TE21", p: "Er Men", c: "耳門", eng: "Ear Gate", merid: "Triple Energizer",
    loc: "面部，耳屏上切跡的前方，下頜骨髁狀突後緣，張口呈凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion (mouth open)",
    act: "開竅聰耳",
    ind: "耳鳴、耳聾、聤耳、齒痛、頸頷痛、唇吻強" },

  // Bladder — BL67 (referenced in evidence: moxa for breech presentation)
  { code: "BL67", p: "Zhi Yin", c: "至陰", eng: "Reaching Yin", merid: "Bladder",
    loc: "足小趾末節外側，距趾甲角0.1寸",
    depth: "0.1 cun, perpendicular insertion or moxibustion",
    act: "正胎催產，清頭明目",
    ind: "胎位不正、難產、滯產、頭痛、目痛、鼻塞、鼻衄。為矯正胎位首選穴，孕婦可灸。" },
];

async function main() {
  console.log(`\n[expand-2] Fill audit gaps — normalize categories + add herbs/acupoints\n`);

  // ── Step 1: normalize duplicate category names ─────────────
  const renames: Array<[string, string]> = [
    ["Blood Invigorating", "Blood Activating"],
    ["Wind-Damp Dispelling", "Wind-Dampness Expelling"],
  ];
  for (const [from, to] of renames) {
    const r = await prisma.herb.updateMany({
      where: { category: from },
      data: { category: to },
    });
    console.log(`  ↻ category: "${from}" → "${to}" — ${r.count} herbs`);
  }

  // ── Step 2: add herbs ──────────────────────────────────────
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

  // ── Step 3: add acupoints ──────────────────────────────────
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

  console.log(`\n[expand-2] +${hc} herbs +${ac} acupoints\n`);

  // ── Final stats ────────────────────────────────────────────
  const [herbCount, acuCount] = await Promise.all([
    prisma.herb.count(),
    prisma.acupuncturePoint.count(),
  ]);
  console.log(`  DB totals: ${herbCount} herbs · ${acuCount} acupoints`);

  // Show new category & meridian distributions for the previously sparse ones
  const cats = await prisma.herb.groupBy({ by: ["category"], _count: true });
  console.log(`  Categories now:`, cats.map((c) => `${c.category}:${c._count}`).join(" "));

  const merids = await prisma.acupuncturePoint.groupBy({ by: ["meridian"], _count: true });
  console.log(`  Meridians now:`, merids.map((m) => `${m.meridian}:${m._count}`).join(" "));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
