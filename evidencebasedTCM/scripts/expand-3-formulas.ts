/**
 * Batch expansion #3 — fill formula gap (30 → 50+).
 *
 * Steps:
 *   1. Normalize formula category names (strip hyphens, unify variants).
 *   2. Add 22 classical formulas with herb compositions (Jun/Chen/Zuo/Shi roles).
 *
 * Idempotent — skips by pinyinName.
 *
 * Run: npx tsx scripts/expand-3-formulas.ts
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

const FORMULAS: F[] = [
  // ── Exterior Releasing ─────────────────────────────────────
  { p: "Ma Huang Tang", c: "麻黃湯", eng: "Ephedra Decoction", src: "傷寒論",
    cat: "Exterior Releasing (Wind-Cold)",
    actions: "發汗解表，宣肺平喘",
    indications: "外感風寒表實證。惡寒發熱、頭身疼痛、無汗而喘、舌苔薄白、脈浮緊。",
    modifications: "兼濕邪，加蒼朮、薏苡仁；表寒肺熱，加石膏、黃芩。",
    herbs: [
      { pinyin: "Ma Huang", role: "JUN", dose: "9g" },
      { pinyin: "Gui Zhi", role: "CHEN", dose: "6g" },
      { pinyin: "Xing Ren", role: "ZUO", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },
  { p: "Sang Ju Yin", c: "桑菊飲", eng: "Mulberry Leaf and Chrysanthemum Drink", src: "溫病條辨",
    cat: "Exterior Releasing (Wind-Heat)",
    actions: "疏風清熱，宣肺止咳",
    indications: "風溫初起，咳嗽，身熱不甚，口微渴，脈浮數。",
    herbs: [
      { pinyin: "Sang Ye", role: "JUN", dose: "7.5g" },
      { pinyin: "Ju Hua", role: "JUN", dose: "3g" },
      { pinyin: "Xing Ren", role: "CHEN", dose: "6g" },
      { pinyin: "Jie Geng", role: "CHEN", dose: "6g" },
      { pinyin: "Lian Qiao", role: "ZUO", dose: "5g" },
      { pinyin: "Bo He", role: "ZUO", dose: "2.5g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "2.5g" },
    ] },

  // ── Heat Clearing ──────────────────────────────────────────
  { p: "Bai Hu Tang", c: "白虎湯", eng: "White Tiger Decoction", src: "傷寒論",
    cat: "Heat Clearing",
    actions: "清熱生津",
    indications: "陽明氣分熱盛證。壯熱面赤、煩渴引飲、汗出惡熱、脈洪大有力。",
    modifications: "氣津兩傷，加人參，名白虎加人參湯。",
    herbs: [
      { pinyin: "Shi Gao", role: "JUN", dose: "30g" },
      { pinyin: "Zhi Mu", role: "CHEN", dose: "9g" },
      { pinyin: "Geng Mi", role: "ZUO", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },
  { p: "Long Dan Xie Gan Tang", c: "龍膽瀉肝湯", eng: "Gentian Liver-Draining Decoction",
    src: "蘭室秘藏",
    cat: "Heat Clearing",
    actions: "清瀉肝膽實火，清利肝經濕熱",
    indications: "肝膽實火上炎證；肝經濕熱下注證。脅痛口苦、目赤耳聾、陰腫陰癢、尿赤帶下。",
    herbs: [
      { pinyin: "Long Dan Cao", role: "JUN", dose: "6g" },
      { pinyin: "Huang Qin", role: "CHEN", dose: "9g" },
      { pinyin: "Zhi Zi", role: "CHEN", dose: "9g" },
      { pinyin: "Ze Xie", role: "ZUO", dose: "12g" },
      { pinyin: "Mu Tong", role: "ZUO", dose: "9g" },
      { pinyin: "Che Qian Zi", role: "ZUO", dose: "9g" },
      { pinyin: "Dang Gui", role: "ZUO", dose: "3g" },
      { pinyin: "Sheng Di Huang", role: "ZUO", dose: "9g" },
      { pinyin: "Chai Hu", role: "SHI", dose: "6g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "6g" },
    ] },

  // ── Interior Warming ───────────────────────────────────────
  { p: "Li Zhong Tang", c: "理中湯", eng: "Regulate the Middle Decoction", src: "傷寒論",
    cat: "Interior Warming",
    actions: "溫中祛寒，補氣健脾",
    indications: "脾胃虛寒證。脘腹冷痛、嘔吐泄瀉、口淡不渴、舌淡苔白潤。",
    modifications: "若虛甚加附子，名附子理中湯。",
    herbs: [
      { pinyin: "Gan Jiang", role: "JUN", dose: "9g" },
      { pinyin: "Ren Shen", role: "CHEN", dose: "9g" },
      { pinyin: "Bai Zhu", role: "ZUO", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "9g" },
    ] },
  { p: "Si Ni Tang", c: "四逆湯", eng: "Frigid Extremities Decoction", src: "傷寒論",
    cat: "Interior Warming",
    actions: "回陽救逆",
    indications: "心腎陽衰寒厥證。四肢厥逆、惡寒蜷臥、神疲欲寐、面色蒼白、脈微欲絕。",
    herbs: [
      { pinyin: "Fu Zi", role: "JUN", dose: "15g" },
      { pinyin: "Gan Jiang", role: "CHEN", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "6g" },
    ] },

  // ── Tonifying ──────────────────────────────────────────────
  { p: "Dang Gui Bu Xue Tang", c: "當歸補血湯", eng: "Tangkuei Decoction to Tonify Blood",
    src: "內外傷辨惑論",
    cat: "Qi-and-Blood Tonifying",
    actions: "補氣生血",
    indications: "血虛陽浮發熱證。肌熱面赤、煩渴欲飲、脈洪大而虛、重按無力。",
    herbs: [
      { pinyin: "Huang Qi", role: "JUN", dose: "30g" },
      { pinyin: "Dang Gui", role: "CHEN", dose: "6g" },
    ] },
  { p: "Jin Gui Shen Qi Wan", c: "金匱腎氣丸", eng: "Kidney Qi Pill from the Golden Cabinet",
    src: "金匱要略",
    cat: "Yang Tonifying",
    actions: "溫補腎陽",
    indications: "腎陽不足證。腰膝酸軟、肢體畏寒、小便不利或反多、痰飲喘咳、消渴。",
    herbs: [
      { pinyin: "Fu Zi", role: "JUN", dose: "3g" },
      { pinyin: "Gui Zhi", role: "JUN", dose: "3g" },
      { pinyin: "Shu Di Huang", role: "CHEN", dose: "24g" },
      { pinyin: "Shan Yao", role: "CHEN", dose: "12g" },
      { pinyin: "Shan Zhu Yu", role: "CHEN", dose: "12g" },
      { pinyin: "Ze Xie", role: "ZUO", dose: "9g" },
      { pinyin: "Fu Ling", role: "ZUO", dose: "9g" },
      { pinyin: "Mu Dan Pi", role: "ZUO", dose: "9g" },
    ] },
  { p: "You Gui Wan", c: "右歸丸", eng: "Restore the Right Pill", src: "景岳全書",
    cat: "Yang Tonifying",
    actions: "溫補腎陽，填精止遺",
    indications: "腎陽不足、命門火衰。年老或久病氣衰神疲、畏寒肢冷、腰膝酸軟、陽痿遺精、大便溏薄、尿頻而清。",
    herbs: [
      { pinyin: "Fu Zi", role: "JUN", dose: "6g" },
      { pinyin: "Rou Gui", role: "JUN", dose: "6g" },
      { pinyin: "Lu Rong", role: "CHEN", dose: "12g" },
      { pinyin: "Shu Di Huang", role: "CHEN", dose: "24g" },
      { pinyin: "Shan Yao", role: "CHEN", dose: "12g" },
      { pinyin: "Shan Zhu Yu", role: "CHEN", dose: "9g" },
      { pinyin: "Gou Qi Zi", role: "ZUO", dose: "12g" },
      { pinyin: "Du Zhong", role: "ZUO", dose: "12g" },
      { pinyin: "Tu Si Zi", role: "ZUO", dose: "12g" },
      { pinyin: "Dang Gui", role: "ZUO", dose: "9g" },
    ] },
  { p: "Zuo Gui Wan", c: "左歸丸", eng: "Restore the Left Pill", src: "景岳全書",
    cat: "Yin Tonifying",
    actions: "滋陰補腎，填精益髓",
    indications: "真陰不足。頭目眩暈、腰酸腿軟、遺精滑泄、自汗盜汗、口燥舌乾、舌紅少苔。",
    herbs: [
      { pinyin: "Shu Di Huang", role: "JUN", dose: "24g" },
      { pinyin: "Shan Yao", role: "CHEN", dose: "12g" },
      { pinyin: "Shan Zhu Yu", role: "CHEN", dose: "12g" },
      { pinyin: "Gou Qi Zi", role: "ZUO", dose: "12g" },
      { pinyin: "Tu Si Zi", role: "ZUO", dose: "12g" },
      { pinyin: "Niu Xi", role: "ZUO", dose: "9g" },
    ] },
  { p: "Yi Guan Jian", c: "一貫煎", eng: "Linking Decoction", src: "柳州醫話",
    cat: "Yin Tonifying",
    actions: "滋陰疏肝",
    indications: "肝腎陰虛、肝氣鬱滯證。胸脘脅痛、吞酸吐苦、咽乾口燥、舌紅少津、脈細弱或虛弦。",
    herbs: [
      { pinyin: "Sheng Di Huang", role: "JUN", dose: "30g" },
      { pinyin: "Sha Shen", role: "CHEN", dose: "9g" },
      { pinyin: "Mai Dong", role: "CHEN", dose: "9g" },
      { pinyin: "Dang Gui", role: "CHEN", dose: "9g" },
      { pinyin: "Gou Qi Zi", role: "CHEN", dose: "18g" },
      { pinyin: "Chuan Lian Zi", role: "ZUO", dose: "5g" },
    ] },

  // ── Dampness Draining / Aromatic Damp-Dissolving ───────────
  { p: "Wu Ling San", c: "五苓散", eng: "Five-Ingredient Powder with Poria",
    src: "傷寒論",
    cat: "Dampness Draining",
    actions: "利水滲濕，溫陽化氣",
    indications: "膀胱氣化不利之蓄水證。小便不利、頭痛微熱、煩渴欲飲，或水入即吐；水濕內停之水腫、泄瀉。",
    herbs: [
      { pinyin: "Ze Xie", role: "JUN", dose: "15g" },
      { pinyin: "Fu Ling", role: "CHEN", dose: "9g" },
      { pinyin: "Zhu Ling", role: "CHEN", dose: "9g" },
      { pinyin: "Bai Zhu", role: "ZUO", dose: "9g" },
      { pinyin: "Gui Zhi", role: "SHI", dose: "6g" },
    ] },
  { p: "Ping Wei San", c: "平胃散", eng: "Calm the Stomach Powder",
    src: "簡要濟眾方",
    cat: "Aromatic Damp-Dissolving",
    actions: "燥濕運脾，行氣和胃",
    indications: "濕滯脾胃證。脘腹脹滿、不思飲食、口淡無味、噁心嘔吐、噯氣吞酸、肢體沉重、怠惰嗜臥。",
    herbs: [
      { pinyin: "Cang Zhu", role: "JUN", dose: "9g" },
      { pinyin: "Hou Po", role: "CHEN", dose: "9g" },
      { pinyin: "Chen Pi", role: "ZUO", dose: "6g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },
  { p: "Yin Chen Hao Tang", c: "茵陳蒿湯", eng: "Artemisia Yinchenhao Decoction",
    src: "傷寒論",
    cat: "Dampness Draining",
    actions: "清熱利濕退黃",
    indications: "濕熱黃疸。一身面目俱黃、黃色鮮明、發熱、無汗或頭汗出、口渴欲飲、噁心嘔吐、腹微滿、小便短赤、大便不爽或秘結。",
    herbs: [
      { pinyin: "Yin Chen Hao", role: "JUN", dose: "18g" },
      { pinyin: "Zhi Zi", role: "CHEN", dose: "12g" },
      { pinyin: "Da Huang", role: "ZUO", dose: "6g" },
    ] },

  // ── Purgatives ─────────────────────────────────────────────
  { p: "Da Cheng Qi Tang", c: "大承氣湯", eng: "Major Order the Qi Decoction", src: "傷寒論",
    cat: "Purgatives",
    actions: "峻下熱結",
    indications: "陽明腑實證。大便不通、頻轉矢氣、脘腹痞滿、腹痛拒按、按之硬、潮熱譫語、舌苔焦黃起刺、脈沉實。",
    herbs: [
      { pinyin: "Da Huang", role: "JUN", dose: "12g", notes: "後下" },
      { pinyin: "Mang Xiao", role: "CHEN", dose: "9g", notes: "沖服" },
      { pinyin: "Hou Po", role: "ZUO", dose: "24g" },
      { pinyin: "Zhi Shi", role: "ZUO", dose: "12g" },
    ] },
  { p: "Ma Zi Ren Wan", c: "麻子仁丸", eng: "Hemp Seed Pill", src: "傷寒論",
    cat: "Purgatives",
    actions: "潤腸瀉熱，行氣通便",
    indications: "脾約證。腸胃燥熱、津液不足、大便乾結、小便頻數。",
    herbs: [
      { pinyin: "Huo Ma Ren", role: "JUN", dose: "20g" },
      { pinyin: "Bai Shao", role: "CHEN", dose: "9g" },
      { pinyin: "Da Huang", role: "ZUO", dose: "12g" },
      { pinyin: "Hou Po", role: "ZUO", dose: "9g" },
      { pinyin: "Zhi Shi", role: "ZUO", dose: "9g" },
      { pinyin: "Xing Ren", role: "ZUO", dose: "10g" },
    ] },

  // ── Harmonizing ────────────────────────────────────────────
  { p: "Da Chai Hu Tang", c: "大柴胡湯", eng: "Major Bupleurum Decoction", src: "傷寒論",
    cat: "Harmonizing",
    actions: "和解少陽，內瀉熱結",
    indications: "少陽陽明合病。往來寒熱、胸脅苦滿、嘔不止、鬱鬱微煩、心下痞硬或心下滿痛、大便不解或協熱下利、舌苔黃、脈弦數有力。",
    herbs: [
      { pinyin: "Chai Hu", role: "JUN", dose: "12g" },
      { pinyin: "Huang Qin", role: "CHEN", dose: "9g" },
      { pinyin: "Da Huang", role: "CHEN", dose: "6g" },
      { pinyin: "Zhi Shi", role: "ZUO", dose: "9g" },
      { pinyin: "Ban Xia", role: "ZUO", dose: "9g" },
      { pinyin: "Bai Shao", role: "ZUO", dose: "9g" },
      { pinyin: "Sheng Jiang", role: "SHI", dose: "15g" },
      { pinyin: "Da Zao", role: "SHI", dose: "12g" },
    ] },

  // ── Blood Activating ───────────────────────────────────────
  { p: "Tao Hong Si Wu Tang", c: "桃紅四物湯", eng: "Four-Substance Decoction with Peach Pit and Safflower",
    src: "醫宗金鑒",
    cat: "Blood Activating",
    actions: "養血活血逐瘀",
    indications: "血虛兼血瘀證。婦女經期超前、血多有塊、色紫稠粘、腹痛等。",
    herbs: [
      { pinyin: "Shu Di Huang", role: "JUN", dose: "12g" },
      { pinyin: "Dang Gui", role: "JUN", dose: "9g" },
      { pinyin: "Bai Shao", role: "CHEN", dose: "9g" },
      { pinyin: "Chuan Xiong", role: "CHEN", dose: "6g" },
      { pinyin: "Tao Ren", role: "ZUO", dose: "6g" },
      { pinyin: "Hong Hua", role: "ZUO", dose: "6g" },
    ] },
  { p: "Sheng Hua Tang", c: "生化湯", eng: "Generation and Transformation Decoction",
    src: "傅青主女科",
    cat: "Blood Activating",
    actions: "養血祛瘀，溫經止痛",
    indications: "血虛寒凝、瘀血阻滯證。產後惡露不行、小腹冷痛。",
    herbs: [
      { pinyin: "Dang Gui", role: "JUN", dose: "24g" },
      { pinyin: "Chuan Xiong", role: "CHEN", dose: "9g" },
      { pinyin: "Tao Ren", role: "ZUO", dose: "9g" },
      { pinyin: "Pao Jiang", role: "ZUO", dose: "2g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "2g" },
    ] },

  // ── Phlegm Resolving ───────────────────────────────────────
  { p: "Wen Dan Tang", c: "溫膽湯", eng: "Warm the Gallbladder Decoction", src: "三因極一病證方論",
    cat: "Phlegm Resolving",
    actions: "理氣化痰，和胃利膽",
    indications: "膽鬱痰擾證。膽虛氣怯，觸事易驚，虛煩不眠，或嘔吐呃逆，眩暈，癲癇等。",
    herbs: [
      { pinyin: "Ban Xia", role: "JUN", dose: "6g" },
      { pinyin: "Zhu Ru", role: "JUN", dose: "6g" },
      { pinyin: "Zhi Shi", role: "CHEN", dose: "6g" },
      { pinyin: "Chen Pi", role: "ZUO", dose: "9g" },
      { pinyin: "Fu Ling", role: "ZUO", dose: "5g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },

  // ── Spirit Calming ─────────────────────────────────────────
  { p: "Zhu Sha An Shen Wan", c: "硃砂安神丸", eng: "Cinnabar Spirit-Settling Pill",
    src: "蘭室秘藏",
    cat: "Spirit Calming",
    actions: "鎮心安神，清熱養血",
    indications: "心火亢盛、陰血不足證。失眠多夢、驚悸怔忡、心煩神亂、或胸中懊憹、舌尖紅、脈細數。",
    herbs: [
      { pinyin: "Zhu Sha", role: "JUN", dose: "1.5g", notes: "另研沖服" },
      { pinyin: "Huang Lian", role: "CHEN", dose: "18g" },
      { pinyin: "Sheng Di Huang", role: "ZUO", dose: "9g" },
      { pinyin: "Dang Gui", role: "ZUO", dose: "7.5g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "16.5g" },
    ] },

  // ── Aromatic Damp-Dissolving (Summer-Heat) ─────────────────
  { p: "Huo Xiang Zheng Qi San", c: "藿香正氣散", eng: "Agastache Powder to Rectify the Qi",
    src: "太平惠民和劑局方",
    cat: "Aromatic Damp-Dissolving",
    actions: "解表化濕，理氣和中",
    indications: "外感風寒、內傷濕滯證。霍亂吐瀉、發熱惡寒、頭痛、胸膈滿悶、脘腹疼痛；山嵐瘴瘧。",
    herbs: [
      { pinyin: "Huo Xiang", role: "JUN", dose: "9g" },
      { pinyin: "Zi Su Ye", role: "CHEN", dose: "3g" },
      { pinyin: "Bai Zhi", role: "CHEN", dose: "3g" },
      { pinyin: "Hou Po", role: "ZUO", dose: "6g" },
      { pinyin: "Da Fu Pi", role: "ZUO", dose: "3g" },
      { pinyin: "Bai Zhu", role: "ZUO", dose: "6g" },
      { pinyin: "Chen Pi", role: "ZUO", dose: "6g" },
      { pinyin: "Ban Xia", role: "ZUO", dose: "6g" },
      { pinyin: "Fu Ling", role: "ZUO", dose: "3g" },
      { pinyin: "Jie Geng", role: "ZUO", dose: "6g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "6g" },
    ] },
];

async function main() {
  console.log(`\n[expand-3] Normalize formula categories + add ${FORMULAS.length} classical formulas\n`);

  // ── Step 1: normalize formula category names ───────────────
  const renames: Array<[string, string]> = [
    ["Heat-Clearing", "Heat Clearing"],
    ["Heat-Clearing and Toxin-Resolving", "Heat Clearing and Toxin Resolving"],
    ["Qi-Tonifying", "Qi Tonifying"],
    ["Blood-Tonifying", "Blood Tonifying"],
    ["Yin-Tonifying", "Yin Tonifying"],
    ["Yin-Tonifying (Heart-Nourishing)", "Yin Tonifying"],
    ["Spirit-Calming", "Spirit Calming"],
    ["Phlegm-Resolving", "Phlegm Resolving"],
    ["Blood-Invigorating", "Blood Activating"],
    ["Wind-Dampness Dispelling", "Wind-Dampness Expelling"],
  ];
  for (const [from, to] of renames) {
    const r = await prisma.formula.updateMany({
      where: { category: from },
      data: { category: to },
    });
    if (r.count > 0) console.log(`  ↻ category: "${from}" → "${to}" — ${r.count} formulas`);
  }

  // ── Step 2: add formulas with herb compositions ────────────
  let fc = 0;
  let totalLinks = 0;
  let missingHerbs = new Set<string>();

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

    const alreadyLinkedHerbIds = new Set(existing?.herbs.map((h) => h.herbId) ?? []);

    let linked = 0;
    for (const fh of f.herbs) {
      const herb = await prisma.herb.findFirst({ where: { pinyinName: fh.pinyin } });
      if (!herb) {
        missingHerbs.add(fh.pinyin);
        continue;
      }
      if (alreadyLinkedHerbIds.has(herb.id)) continue;
      try {
        await prisma.formulaHerb.create({
          data: {
            formulaId, herbId: herb.id,
            role: fh.role, dosage: fh.dose, notes: fh.notes,
          },
        });
        linked++;
      } catch { /* dup */ }
    }
    totalLinks += linked;
    const tag = preexisting ? "↻ existing" : "✓ formula";
    console.log(`  ${tag}: ${f.c} (${f.p}) — ${f.cat} [+${linked} herbs linked${preexisting ? " (backfill)" : ""}]`);
  }

  if (missingHerbs.size > 0) {
    console.log(`\n  ⚠ Herbs referenced but not in DB (skipped): ${[...missingHerbs].sort().join(", ")}`);
  }

  console.log(`\n[expand-3] +${fc} formulas, +${totalLinks} formula-herb links\n`);

  // ── Final stats ────────────────────────────────────────────
  const [formulaCount, herbCount, acuCount] = await Promise.all([
    prisma.formula.count(),
    prisma.herb.count(),
    prisma.acupuncturePoint.count(),
  ]);
  console.log(`  DB totals: ${herbCount} herbs · ${formulaCount} formulas · ${acuCount} acupoints`);

  const cats = await prisma.formula.groupBy({ by: ["category"], _count: true });
  console.log(`  Formula categories now (${cats.length} distinct):`);
  for (const c of cats.sort((a, b) => b._count - a._count)) {
    console.log(`    ${c.category}: ${c._count}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
