/**
 * Content enrichment #6 — fill out acupoint coverage across all 14 meridians.
 *
 * Adds 22 essential acupoints clinicians use daily, focusing on meridians
 * currently under-represented (LI, KI, GB, LV, GV, CV, BL extremities).
 *
 * Idempotent — skips by code.
 *
 * Run: npx tsx scripts/enrich-6-acupoints.ts
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
  // ── Large Intestine ──────────────────────────────────────────
  { code: "LI20", p: "Ying Xiang", c: "迎香", eng: "Welcome Fragrance", merid: "Large Intestine",
    loc: "鼻翼外緣中點旁，當鼻唇溝中",
    depth: "0.3-0.5 cun, oblique towards Bitong",
    act: "通鼻竅，散風熱",
    ind: "鼻塞、鼻流清涕、鼻衄、口眼歪斜、面癢、面浮腫" },
  { code: "LI15", p: "Jian Yu", c: "肩髃", eng: "Shoulder Bone", merid: "Large Intestine",
    loc: "肩部三角肌上，臂外展或平舉時，肩峰前下方凹陷處",
    depth: "0.8-1.5 cun, perpendicular insertion",
    act: "通利關節，疏散風熱",
    ind: "肩臂攣痛不遂、隱疹、瘰癧" },

  // ── Spleen ───────────────────────────────────────────────────
  { code: "SP3", p: "Tai Bai", c: "太白", eng: "Supreme White", merid: "Spleen",
    loc: "足內側緣，第1蹠骨小頭後下方赤白肉際凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "健脾化濕，理氣和胃",
    ind: "胃痛、腹脹、腸鳴、泄瀉、便秘、痔漏、腳氣、體重節痛" },
  { code: "SP4", p: "Gong Sun", c: "公孫", eng: "Yellow Emperor", merid: "Spleen",
    loc: "足內側緣，第1蹠骨基底部的前下方",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "健脾胃，調沖任",
    ind: "胃痛、嘔吐、腹痛、泄瀉、痢疾、心煩失眠、狂證、嗜臥、足腫。八脈交會穴通沖脈。" },
  { code: "SP21", p: "Da Bao", c: "大包", eng: "Great Embracing", merid: "Spleen",
    loc: "側胸部腋中線上，第6肋間隙處",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "統血養經，寬胸利脅",
    ind: "氣喘、胸脅痛、全身疼痛、四肢無力。脾之大絡。" },

  // ── Heart ────────────────────────────────────────────────────
  { code: "HT8", p: "Shao Fu", c: "少府", eng: "Lesser Mansion", merid: "Heart",
    loc: "手掌面，第4、5掌骨之間，握拳時當小指尖處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "清心瀉火，理氣活絡",
    ind: "心悸、胸痛、小指攣痛、掌中熱、陰癢陰痛、癰瘍、遺尿、小便不利、小便赤痛" },

  // ── Small Intestine ──────────────────────────────────────────
  { code: "SI11", p: "Tian Zong", c: "天宗", eng: "Heavenly Ancestor", merid: "Small Intestine",
    loc: "肩胛部，岡下窩中央凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "舒筋活絡，理氣消腫",
    ind: "肩胛疼痛、肘臂外後側痛、氣喘、乳癰" },

  // ── Bladder ──────────────────────────────────────────────────
  { code: "BL21", p: "Wei Shu", c: "胃俞", eng: "Stomach Shu", merid: "Bladder",
    loc: "背部，第12胸椎棘突下，旁開1.5寸",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "和胃健脾，理氣消滯",
    ind: "胃脘痛、腹脹、嘔吐、胸脅痛、腸鳴、泄瀉" },
  { code: "BL40", p: "Wei Zhong", c: "委中", eng: "Bend Middle", merid: "Bladder",
    loc: "膕橫紋中點，當股二頭肌腱與半腱肌腱的中間",
    depth: "0.5-1.0 cun, perpendicular or prick to bleed",
    act: "舒筋通絡，散瘀活血，清熱解毒",
    ind: "腰背痛、下肢痿痺、中風昏迷、半身不遂、腹痛、急性吐瀉、小便不利、遺尿、丹毒。為「腰背委中求」要穴。" },
  { code: "BL57", p: "Cheng Shan", c: "承山", eng: "Mountain Support", merid: "Bladder",
    loc: "小腿後面正中，委中與崑崙之間，當伸直小腿或足跟上提時，腓腸肌肌腹下出現凹陷處",
    depth: "0.7-1.0 cun, perpendicular insertion",
    act: "舒筋通絡，理腸療痔",
    ind: "腰腿拘急疼痛、痔疾、便秘、腳氣、霍亂轉筋、脫肛、癲疾、鼻衄" },
  { code: "BL60", p: "Kun Lun", c: "崑崙", eng: "Kunlun Mountain", merid: "Bladder",
    loc: "外踝後方，當外踝尖與跟腱之間的凹陷處",
    depth: "0.5-0.8 cun, perpendicular insertion",
    act: "安神清熱，舒筋活絡，催產",
    ind: "頭痛、項強、目眩、鼻衄、腰痛、腳跟腫痛、難產、癲癇、瘧疾。孕婦禁針。" },

  // ── Kidney ───────────────────────────────────────────────────
  { code: "KI1", p: "Yong Quan", c: "涌泉", eng: "Bubbling Spring", merid: "Kidney",
    loc: "足底前部凹陷處，當第2、3趾趾縫紋頭端與足跟連線的前1/3與後2/3交點上",
    depth: "0.5-0.8 cun, perpendicular insertion",
    act: "蘇厥開竅，滋陰益腎，平肝熄風",
    ind: "頭頂痛、頭暈眼花、咽喉腫痛、舌乾、失音、小便不利、大便難、小兒驚風、足心熱、癲疾、霍亂轉筋、昏厥、中暑。為腎經井穴，引火歸元。" },
  { code: "KI6", p: "Zhao Hai", c: "照海", eng: "Shining Sea", merid: "Kidney",
    loc: "足內側，內踝尖下方凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "滋陰清熱，調經止痛",
    ind: "咽喉乾燥、癇證、失眠、嗜臥、驚恐不寧、目赤腫痛、月經不調、痛經、赤白帶下、陰挺、疝氣、小便頻數、不寐、腳氣。八脈交會穴通陰蹻脈。" },
  { code: "KI7", p: "Fu Liu", c: "復溜", eng: "Returning Current", merid: "Kidney",
    loc: "小腿內側，太溪直上2寸，跟腱的前方",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "補腎益陰，溫陽利水",
    ind: "水腫、腹脹、泄瀉、盜汗、自汗、熱病無汗或汗出不止、下肢痿痺" },

  // ── Gallbladder ──────────────────────────────────────────────
  { code: "GB30", p: "Huan Tiao", c: "環跳", eng: "Jumping Circle", merid: "Gallbladder",
    loc: "股外側部，側臥屈股，當股骨大轉子最凸點與骶管裂孔連線的外1/3與中1/3交點處",
    depth: "2.0-3.0 cun, perpendicular insertion",
    act: "祛風除濕，強健腰膝",
    ind: "腰胯疼痛、半身不遂、下肢痿痺、遍身風疹、挫閃腰疼、膝踝腫痛不能轉側" },
  { code: "GB39", p: "Xuan Zhong", c: "懸鐘", eng: "Suspended Bell", merid: "Gallbladder",
    loc: "小腿外側，外踝尖上3寸，腓骨前緣",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "舒筋活絡，平肝熄風",
    ind: "半身不遂、頸項強痛、胸腹脹滿、脅痛、膝腿痛、腳氣、痔疾。為「髓會」，治骨髓相關疾病要穴。" },
  { code: "GB34", p: "Yang Ling Quan", c: "陽陵泉", eng: "Yang Mound Spring", merid: "Gallbladder",
    loc: "小腿外側，當腓骨頭前下方凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "舒肝利膽，強健腰膝",
    ind: "半身不遂、下肢痿痺、麻木、膝臏腫痛、腳氣、脅肋痛、口苦、嘔吐、黃疸、小兒驚風。為「筋會」，治筋骨疾患要穴。" },

  // ── Liver ────────────────────────────────────────────────────
  { code: "LR8", p: "Qu Quan", c: "曲泉", eng: "Spring at the Bend", merid: "Liver",
    loc: "膝內側，屈膝，當膝關節內側端，股骨內上髁的後緣，半腱肌、半膜肌止端的前緣凹陷處",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "清濕熱，疏肝氣",
    ind: "月經不調、痛經、白帶、陰挺、陰癢、產後腹痛、遺精、陽痿、疝氣、小便不利、頭痛、目眩、癲狂、膝臏腫痛、下肢痿痺" },
  { code: "LR14", p: "Qi Men", c: "期門", eng: "Cycle Gate", merid: "Liver",
    loc: "胸部，當乳頭直下，第6肋間隙",
    depth: "0.5-0.8 cun, oblique insertion",
    act: "疏肝健脾，理氣活血",
    ind: "胸脅脹痛、腹脹、呃逆、吞酸、嘔吐、乳癰、鬱症。為肝之募穴。" },

  // ── Governing Vessel ─────────────────────────────────────────
  { code: "GV4", p: "Ming Men", c: "命門", eng: "Life Gate", merid: "Governing Vessel",
    loc: "腰部，後正中線上，第2腰椎棘突下凹陷中",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "補腎壯陽，固精止帶",
    ind: "虛損腰痛、脊強反折、遺精、白濁、陽痿、早泄、遺尿、尿頻、泄瀉、腎虛頭暈、耳鳴、瘛瘲" },
  { code: "GV14", p: "Da Zhui", c: "大椎", eng: "Great Vertebra", merid: "Governing Vessel",
    loc: "後正中線上，第7頸椎棘突下凹陷中",
    depth: "0.5-1.0 cun, oblique insertion",
    act: "解表退熱，清心安神，通絡止痛",
    ind: "熱病、瘧疾、咳嗽、氣喘、骨蒸潮熱、項強、肩背痛、腰脊強、角弓反張、小兒驚風、癲癇、五勞虛損。為「諸陽之會」，免疫提升要穴。" },
  { code: "GV26", p: "Shui Gou", c: "水溝", eng: "Water Trough / Renzhong", merid: "Governing Vessel",
    loc: "面部，當人中溝的上1/3與中1/3交點處",
    depth: "0.3-0.5 cun, oblique upward",
    act: "醒神開竅，清熱熄風",
    ind: "昏迷、暈厥、暑病、癲狂、癇證、急慢驚風、鼻塞、鼻衄、面腫、唇動、牙關緊閉、消渴、黃疸、霍亂、急性腰扭傷。為急救要穴。" },

  // ── Conception Vessel ────────────────────────────────────────
  { code: "CV3", p: "Zhong Ji", c: "中極", eng: "Central Pole", merid: "Conception Vessel",
    loc: "下腹部，前正中線上，當臍中下4寸",
    depth: "0.5-1.0 cun, perpendicular insertion (empty bladder)",
    act: "益腎興陽，調經止帶",
    ind: "遺尿、小便不利、尿閉、疝氣、遺精、陽痿、月經不調、崩漏、帶下、陰挺、不孕、產後惡露不止。為膀胱募穴。" },
  { code: "CV8", p: "Shen Que", c: "神闕", eng: "Spirit Gate / Navel", merid: "Conception Vessel",
    loc: "腹中部，臍中央",
    depth: "禁針，灸之",
    act: "溫陽救逆，利水固脫",
    ind: "中風脫證、四肢厥冷、屍厥、風癇、形憊體乏、繞臍腹痛、水腫鼓脹、脫肛、泄痢、便秘、小便不禁、五淋、婦人血冷不受胎。隔鹽/隔薑灸常用。" },
];

async function main() {
  console.log(`\n[enrich-6] Add ${ACUPOINTS.length} essential acupoints across 14 meridians\n`);

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

  // Backfill pattern-acupoint links for new acupoints referenced in patterns
  const BACKFILL: Array<{ pattern: string; code: string; method?: string; notes?: string }> = [
    { pattern: "Pi Yang Xu", code: "SP4", method: "補法", notes: "公孫" },
    { pattern: "Xin Huo Kang Sheng", code: "HT8", method: "瀉法", notes: "少府" },
    { pattern: "Wei Yin Xu", code: "BL21", method: "平補平瀉", notes: "胃俞" },
  ];

  let bc = 0;
  for (const b of BACKFILL) {
    const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: b.pattern } });
    const acu = await prisma.acupuncturePoint.findFirst({ where: { code: b.code } });
    if (!pat || !acu) continue;
    try {
      await prisma.patternAcupoint.create({
        data: { patternId: pat.id, acupointId: acu.id, stimulationMethod: b.method, notes: b.notes },
      });
      console.log(`  ✓ link: ${b.pattern} → ${b.code}`);
      bc++;
    } catch { /* dup */ }
  }

  console.log(`\n[enrich-6] +${ac} acupoints · +${bc} pattern-acupoint backfill\n`);

  const aCount = await prisma.acupuncturePoint.count();
  console.log(`  Total acupoints: ${aCount}`);

  const merids = await prisma.acupuncturePoint.groupBy({ by: ["meridian"], _count: true, orderBy: { _count: { meridian: "desc" } } });
  console.log(`  Meridian distribution (${merids.length} meridians):`);
  for (const m of merids) console.log(`    ${m.meridian.padEnd(22)} ${m._count}`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
