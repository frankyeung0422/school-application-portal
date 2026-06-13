/**
 * Content enrichment #1 — patterns + conditions + missing herbs.
 *
 * Adds:
 *   • 2 herbs (赤芍 Chi Shao, 山楂 Shan Zha) referenced by patent medicines.
 *   • 12 TCM patterns with formula + acupoint cross-references.
 *   • 12 condition mappings with pattern cross-references.
 *
 * Idempotent — skips by pinyinName / westernName.
 *
 * Run: npx tsx scripts/enrich-1-patterns-conditions.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Pathology =
  | "DEFICIENCY" | "EXCESS" | "STAGNATION" | "HEAT" | "COLD" | "DAMPNESS"
  | "PHLEGM" | "WIND" | "BLOOD_STASIS" | "YIN_DEFICIENCY" | "YANG_DEFICIENCY"
  | "QI_DEFICIENCY" | "BLOOD_DEFICIENCY";

type Frequency = "COMMON" | "OCCASIONAL" | "RARE";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

const HERBS: H[] = [
  { p: "Chi Shao", c: "赤芍", lat: "Paeonia lactiflora (red)", eng: "Red Peony Root",
    cat: "Heat Clearing", nat: "COOL", flav: ["Bitter"],
    merid: ["Liver"], dose: "6-12g",
    desc: "清熱涼血，散瘀止痛。用於溫毒發斑、吐血衄血、目赤腫痛、肝鬱脅痛、經閉痛經、癥瘕腹痛、跌撲損傷、癰腫瘡瘍。與白芍同源異效：白芍養血斂陰，赤芍涼血散瘀。",
    pharm: "含芍藥苷、苯甲酸。具有抗血小板聚集、改善微循環、抗炎、保肝、解痙作用。血必淨注射液主要成分之一。" },
  { p: "Shan Zha", c: "山楂", lat: "Crataegus pinnatifida", eng: "Chinese Hawthorn",
    cat: "Food Stagnation Resolving", nat: "WARM", flav: ["Sour", "Sweet"],
    merid: ["Spleen", "Stomach", "Liver"], dose: "9-12g",
    desc: "消食健胃，行氣散瘀，化濁降脂。用於肉食積滯、胃脘脹滿、瀉痢腹痛、瘀血經閉、產後瘀阻、心腹刺痛、胸痺心痛、疝氣疼痛、高脂血症。為消食化積要藥，尤善消肉食油膩之積。",
    pharm: "含黃酮類、有機酸、三萜類。具有降血脂、降血壓、強心、抗氧化、助消化作用。" },
];

interface P {
  p: string; c: string; eng: string; organ: string; type: Pathology;
  symptoms: string; tongue: string; pulse: string; principle: string;
  formulas: { pinyin: string; primary: boolean; notes?: string }[];
  acupoints: { code: string; method?: string; notes?: string }[];
}

const PATTERNS: P[] = [
  { p: "Pi Wei Xu Ruo", c: "脾胃虛弱", eng: "Spleen-Stomach Deficiency", organ: "脾胃", type: "QI_DEFICIENCY",
    symptoms: "面色萎黃、神疲乏力、食欲不振、食後腹脹、大便溏薄、四肢倦怠、形體消瘦或虛胖。",
    tongue: "舌淡胖、邊有齒痕、苔白",
    pulse: "脈細弱或濡緩",
    principle: "健脾益氣，和胃化濕",
    formulas: [
      { pinyin: "Si Jun Zi Tang", primary: true, notes: "基礎方" },
      { pinyin: "Liu Jun Zi Tang", primary: false, notes: "兼痰濕加二陳" },
      { pinyin: "Xiang Sha Liu Jun Zi Tang", primary: false, notes: "兼氣滯" },
    ],
    acupoints: [
      { code: "ST36", method: "補法", notes: "胃經合穴，健脾要穴" },
      { code: "SP6", method: "補法", notes: "脾肝腎三陰交會" },
      { code: "CV12", method: "灸", notes: "胃募穴" },
      { code: "BL20", method: "補法", notes: "脾俞" },
    ] },
  { p: "Pi Wei Shi Re", c: "脾胃濕熱", eng: "Spleen-Stomach Damp-Heat", organ: "脾胃", type: "DAMPNESS",
    symptoms: "脘腹痞悶、肢體困重、口苦口黏、納呆嘔噁、大便溏臭、小便短黃、身熱不揚、面目發黃。",
    tongue: "舌紅、苔黃膩",
    pulse: "脈濡數或滑數",
    principle: "清熱利濕，健脾和胃",
    formulas: [
      { pinyin: "Yin Chen Hao Tang", primary: true, notes: "黃疸顯著者" },
      { pinyin: "San Ren Tang", primary: false, notes: "濕重於熱" },
    ],
    acupoints: [
      { code: "ST44", method: "瀉法", notes: "胃經滎穴清熱" },
      { code: "SP9", method: "瀉法", notes: "陰陵泉利濕" },
      { code: "ST36", method: "平補平瀉" },
    ] },
  { p: "Shi Zhi Wei Wan", c: "食滯胃脘", eng: "Food Stagnation in Stomach", organ: "胃", type: "STAGNATION",
    symptoms: "脘腹脹滿疼痛、噯腐吞酸、噁心嘔吐、不思飲食、矢氣酸臭、大便不爽。",
    tongue: "舌苔厚膩",
    pulse: "脈滑或弦滑",
    principle: "消食導滯，行氣和胃",
    formulas: [
      { pinyin: "Ping Wei San", primary: true, notes: "兼濕滯" },
      { pinyin: "Da Cheng Qi Tang", primary: false, notes: "陽明腑實便秘者" },
    ],
    acupoints: [
      { code: "ST36", method: "瀉法" },
      { code: "ST44" },
      { code: "ST21", method: "平補平瀉", notes: "梁門" },
    ] },
  { p: "Feng Re Fan Fei", c: "風熱犯肺", eng: "Wind-Heat Invading Lung", organ: "肺", type: "HEAT",
    symptoms: "咳嗽痰黃、咽痛、發熱、頭痛、口渴、鼻塞流黃涕、惡風或微惡寒。",
    tongue: "舌尖紅、苔薄黃",
    pulse: "脈浮數",
    principle: "疏風清熱，宣肺止咳",
    formulas: [
      { pinyin: "Sang Ju Yin", primary: true, notes: "輕證" },
      { pinyin: "Yin Qiao San", primary: true, notes: "重證、咽痛顯著" },
      { pinyin: "Ma Xing Shi Gan Tang", primary: false, notes: "肺熱壅盛喘咳" },
    ],
    acupoints: [
      { code: "LU7", method: "瀉法", notes: "列缺，肺經絡穴" },
      { code: "LI4", method: "瀉法", notes: "合谷" },
      { code: "LI11", method: "瀉法", notes: "曲池" },
      { code: "LU11", method: "點刺出血", notes: "少商" },
    ] },
  { p: "Tan Shi Zu Fei", c: "痰濕阻肺", eng: "Phlegm-Damp Obstructing Lung", organ: "肺", type: "PHLEGM",
    symptoms: "咳嗽痰多、痰白黏稠或泡沫狀、胸悶、氣喘、噁心、納呆、形體肥胖、晨起咳痰尤甚。",
    tongue: "舌淡胖、苔白膩",
    pulse: "脈滑或濡滑",
    principle: "燥濕化痰，理氣止咳",
    formulas: [
      { pinyin: "Er Chen Tang", primary: true, notes: "基礎方" },
      { pinyin: "Wen Dan Tang", primary: false, notes: "兼膽胃不和" },
    ],
    acupoints: [
      { code: "LU5", method: "平補平瀉", notes: "尺澤" },
      { code: "ST40", method: "瀉法", notes: "豐隆 — 化痰要穴" },
      { code: "CV17", method: "平補平瀉", notes: "膻中 — 氣會" },
    ] },
  { p: "Fei Yin Xu", c: "肺陰虛", eng: "Lung Yin Deficiency", organ: "肺", type: "YIN_DEFICIENCY",
    symptoms: "乾咳少痰、痰中帶血、午後潮熱、盜汗、咽乾聲嘶、形體消瘦、五心煩熱。",
    tongue: "舌紅少津、少苔",
    pulse: "脈細數",
    principle: "養陰潤肺，止咳化痰",
    formulas: [
      { pinyin: "Mai Men Dong Tang", primary: true, notes: "胃陰虛兼肺燥" },
      { pinyin: "Sheng Mai San", primary: false, notes: "氣陰兩傷" },
    ],
    acupoints: [
      { code: "LU9", method: "補法", notes: "太淵 — 肺經原穴" },
      { code: "BL13", method: "補法", notes: "肺俞" },
      { code: "KI3", method: "補法", notes: "太溪 — 補腎滋陰" },
    ] },
  { p: "Xin Qi Xu", c: "心氣虛", eng: "Heart Qi Deficiency", organ: "心", type: "QI_DEFICIENCY",
    symptoms: "心悸氣短、活動後加重、胸悶、神疲乏力、自汗、面色淡白。",
    tongue: "舌淡、苔薄白",
    pulse: "脈虛或結代",
    principle: "補益心氣",
    formulas: [
      { pinyin: "Sheng Mai San", primary: true, notes: "氣陰兩虛" },
      { pinyin: "Gui Pi Tang", primary: false, notes: "心脾兩虛兼證" },
    ],
    acupoints: [
      { code: "HT5", method: "補法", notes: "通里" },
      { code: "PC6", method: "補法", notes: "內關" },
      { code: "CV17", method: "補法", notes: "膻中" },
      { code: "BL15", method: "補法", notes: "心俞" },
    ] },
  { p: "Gan Yang Shang Kang", c: "肝陽上亢", eng: "Liver Yang Hyperactivity", organ: "肝", type: "EXCESS",
    symptoms: "頭暈目眩、頭痛且脹、煩躁易怒、面紅目赤、口苦咽乾、耳鳴如潮、失眠多夢、腰膝痠軟。",
    tongue: "舌紅、苔黃",
    pulse: "脈弦有力或弦細數",
    principle: "平肝潛陽，滋陰息風",
    formulas: [
      { pinyin: "Tian Ma Gou Teng Yin", primary: true, notes: "頭目眩暈為主" },
      { pinyin: "Zhen Gan Xi Feng Tang", primary: true, notes: "肝陽化風或欲中風" },
    ],
    acupoints: [
      { code: "LV2", method: "瀉法", notes: "行間 — 滎穴清肝火" },
      { code: "LV3", method: "瀉法", notes: "太衝 — 肝經原穴" },
      { code: "GB20", method: "瀉法", notes: "風池" },
      { code: "KI3", method: "補法", notes: "滋水涵木" },
    ] },
  { p: "Gan Xue Xu", c: "肝血虛", eng: "Liver Blood Deficiency", organ: "肝", type: "BLOOD_DEFICIENCY",
    symptoms: "面色無華、視物模糊或夜盲、爪甲不榮、肢體麻木、筋脈拘急、月經量少色淡或閉經、頭暈耳鳴。",
    tongue: "舌淡",
    pulse: "脈細",
    principle: "補血養肝",
    formulas: [
      { pinyin: "Si Wu Tang", primary: true, notes: "養血基礎方" },
      { pinyin: "Yi Guan Jian", primary: false, notes: "肝陰肝血兩虛" },
    ],
    acupoints: [
      { code: "BL18", method: "補法", notes: "肝俞" },
      { code: "SP10", method: "補法", notes: "血海" },
      { code: "SP6", method: "補法", notes: "三陰交" },
    ] },
  { p: "Han Shi Kun Pi", c: "寒濕困脾", eng: "Cold-Damp Encumbering Spleen", organ: "脾", type: "DAMPNESS",
    symptoms: "脘腹脹悶冷痛、口淡不渴、頭身困重、肢冷便溏、納呆嘔噁、面色晦黃、女子白帶清稀。",
    tongue: "舌淡胖、苔白膩",
    pulse: "脈濡緩或沉細",
    principle: "溫中散寒，健脾化濕",
    formulas: [
      { pinyin: "Li Zhong Tang", primary: true, notes: "中焦虛寒" },
      { pinyin: "Huo Xiang Zheng Qi San", primary: false, notes: "外感風寒兼內傷濕滯" },
    ],
    acupoints: [
      { code: "ST36", method: "灸", notes: "足三里" },
      { code: "CV12", method: "灸", notes: "中脘" },
      { code: "SP9", method: "灸", notes: "陰陵泉" },
    ] },
  { p: "Xin Pi Liang Xu", c: "心脾兩虛", eng: "Heart-Spleen Dual Deficiency", organ: "心脾", type: "QI_DEFICIENCY",
    symptoms: "心悸怔忡、健忘失眠、多夢易驚、神疲食少、腹脹便溏、面色萎黃、月經量少色淡或淋漓不盡。",
    tongue: "舌淡、苔薄白",
    pulse: "脈細弱",
    principle: "益氣補血，健脾養心",
    formulas: [
      { pinyin: "Gui Pi Tang", primary: true, notes: "心脾兩虛之代表方" },
      { pinyin: "Ba Zhen Tang", primary: false, notes: "氣血兩虛兼證" },
    ],
    acupoints: [
      { code: "HT7", method: "補法", notes: "神門" },
      { code: "BL15", method: "補法", notes: "心俞" },
      { code: "BL20", method: "補法", notes: "脾俞" },
      { code: "ST36", method: "補法" },
      { code: "SP6", method: "補法" },
    ] },
  { p: "Qi Zhi Xue Yu", c: "氣滯血瘀", eng: "Qi Stagnation with Blood Stasis", organ: "肝心", type: "BLOOD_STASIS",
    symptoms: "胸脅脹痛或刺痛、痛處固定不移、夜間加重、情志不遂則加劇、面色晦暗、肌膚甲錯、女子經閉痛經、經色紫暗夾血塊。",
    tongue: "舌紫暗或有瘀斑、苔白",
    pulse: "脈弦澀或結代",
    principle: "行氣活血，化瘀止痛",
    formulas: [
      { pinyin: "Xue Fu Zhu Yu Tang", primary: true, notes: "胸中血瘀代表方" },
      { pinyin: "Tao Hong Si Wu Tang", primary: false, notes: "婦科血虛血瘀" },
    ],
    acupoints: [
      { code: "LV3", method: "瀉法", notes: "太衝行氣" },
      { code: "SP10", method: "瀉法", notes: "血海化瘀" },
      { code: "BL17", method: "瀉法", notes: "膈俞 — 血會" },
    ] },
];

interface Cnd {
  westernName: string; chineseName?: string;
  icd11: string; icd10: string;
  description: string;
  patterns: { pinyin: string; freq: Frequency; notes?: string }[];
}

const CONDITIONS: Cnd[] = [
  { westernName: "Acute Myocardial Infarction", chineseName: "急性心肌梗死",
    icd11: "BA41", icd10: "I21",
    description: "Acute ischemic necrosis of myocardium due to coronary artery occlusion. TCM 真心痛/胸痺/厥心痛 corresponds to clinical syndrome.",
    patterns: [
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON", notes: "胸痛 + 氣滯血瘀為核心病機" },
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "痰濁壅塞胸陽" },
      { pinyin: "Shen Yang Xu", freq: "OCCASIONAL", notes: "心腎陽虛型" },
    ] },
  { westernName: "Ischemic Stroke", chineseName: "缺血性中風",
    icd11: "8B11", icd10: "I63",
    description: "Cerebral infarction from arterial occlusion. TCM corresponds to 中風 (中經絡 / 中臟腑).",
    patterns: [
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON" },
      { pinyin: "Gan Yang Shang Kang", freq: "COMMON", notes: "肝陽化風型" },
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "風痰阻絡型" },
    ] },
  { westernName: "Gastroesophageal Reflux Disease", chineseName: "胃食管反流病",
    icd11: "DA22", icd10: "K21",
    description: "Reflux of gastric contents causing symptoms or complications. TCM corresponds to 吞酸/嘈雜/反胃.",
    patterns: [
      { pinyin: "Gan Pi Bu He", freq: "COMMON" },
      { pinyin: "Pi Wei Shi Re", freq: "COMMON" },
      { pinyin: "Pi Wei Xu Ruo", freq: "OCCASIONAL" },
    ] },
  { westernName: "Peptic Ulcer Disease", chineseName: "消化性潰瘍",
    icd11: "DA60", icd10: "K27",
    description: "Mucosal ulceration of stomach or duodenum. TCM corresponds to 胃脘痛.",
    patterns: [
      { pinyin: "Han Shi Kun Pi", freq: "OCCASIONAL", notes: "脾胃虛寒型潰瘍" },
      { pinyin: "Pi Wei Shi Re", freq: "COMMON" },
      { pinyin: "Gan Qi Yu Jie", freq: "COMMON", notes: "肝胃不和型" },
    ] },
  { westernName: "Premenstrual Syndrome", chineseName: "經前綜合徵",
    icd11: "GA34.40", icd10: "N94.3",
    description: "Cyclical physical/emotional symptoms before menses. TCM corresponds to 經前期諸證.",
    patterns: [
      { pinyin: "Gan Qi Yu Jie", freq: "COMMON", notes: "情志症狀為主" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL", notes: "經前痛經" },
      { pinyin: "Pi Qi Xu", freq: "OCCASIONAL", notes: "水腫乳脹" },
    ] },
  { westernName: "Cervical Spondylosis", chineseName: "頸椎病",
    icd11: "FA02", icd10: "M47",
    description: "Degenerative disorder of cervical vertebrae. TCM corresponds to 項痺/項強.",
    patterns: [
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON", notes: "氣滯血瘀型" },
      { pinyin: "Shen Yang Xu", freq: "OCCASIONAL", notes: "肝腎不足型" },
    ] },
  { westernName: "Lumbar Disc Herniation", chineseName: "腰椎間盤突出",
    icd11: "FA80", icd10: "M51.2",
    description: "Displacement of intervertebral disc compressing nerve root. TCM corresponds to 腰痛/痺證.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON", notes: "腎虛腰痛" },
      { pinyin: "Han Shi Kun Pi", freq: "OCCASIONAL", notes: "寒濕腰痛" },
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON", notes: "外傷瘀血型" },
    ] },
  { westernName: "Chronic Kidney Disease", chineseName: "慢性腎臟病",
    icd11: "GB61", icd10: "N18",
    description: "Progressive loss of kidney function over months/years. TCM corresponds to 水腫/虛勞.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON" },
      { pinyin: "Shen Yin Xu", freq: "COMMON" },
      { pinyin: "Pi Wei Shi Re", freq: "OCCASIONAL", notes: "濕熱蘊腎型" },
    ] },
  { westernName: "Uterine Fibroids", chineseName: "子宮肌瘤",
    icd11: "GA11.0", icd10: "D25",
    description: "Benign smooth muscle tumors of uterus. TCM corresponds to 癥瘕/石瘕.",
    patterns: [
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON", notes: "瘀血內阻為核心" },
      { pinyin: "Gan Qi Yu Jie", freq: "COMMON" },
      { pinyin: "Tan Shi Nei Zu", freq: "OCCASIONAL", notes: "痰瘀互結型" },
    ] },
  { westernName: "Psoriasis", chineseName: "牛皮癬（銀屑病）",
    icd11: "EA90", icd10: "L40",
    description: "Chronic immune-mediated skin disease with scaly plaques. TCM corresponds to 白疕/松皮癬.",
    patterns: [
      { pinyin: "Xue Yu", freq: "COMMON", notes: "血燥血瘀型" },
      { pinyin: "Pi Wei Shi Re", freq: "OCCASIONAL", notes: "濕熱蘊膚" },
    ] },
  { westernName: "Chronic Urticaria", chineseName: "慢性蕁麻疹",
    icd11: "EB05", icd10: "L50.8",
    description: "Recurrent wheals lasting >6 weeks. TCM corresponds to 癮疹.",
    patterns: [
      { pinyin: "Feng Re", freq: "COMMON", notes: "風熱搏於肌膚" },
      { pinyin: "Feng Han", freq: "OCCASIONAL", notes: "寒冷誘發型" },
      { pinyin: "Qi Xue Liang Xu", freq: "OCCASIONAL", notes: "氣血兩虛型反復發作" },
    ] },
  { westernName: "Acute Pancreatitis", chineseName: "急性胰腺炎",
    icd11: "DC31", icd10: "K85",
    description: "Acute inflammation of pancreas. TCM corresponds to 腹痛/胰癉.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "肝膽濕熱犯胃" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL", notes: "重症期" },
    ] },
];

async function main() {
  console.log(`\n[enrich-1] Patterns + conditions + missing herbs\n`);

  // ── Step 1: add herbs ─────────────────────────────────────
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
    console.log(`  ✓ herb: ${h.c} (${h.p})`);
    hc++;
  }

  // ── Step 2: add patterns + cross-refs ─────────────────────
  let pc = 0, pfLinks = 0, paLinks = 0;
  const missingFormulas = new Set<string>();
  const missingAcupoints = new Set<string>();

  for (const p of PATTERNS) {
    const dup = await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } });
    if (dup) { console.log(`  ↷ pattern: ${p.p}`); continue; }

    const created = await prisma.tcmPattern.create({
      data: {
        pinyinName: p.p, chineseName: p.c, englishName: p.eng,
        organSystem: p.organ, pathologyType: p.type,
        keySymptoms: p.symptoms, tongue: p.tongue, pulse: p.pulse,
        treatmentPrinciple: p.principle,
        status: "PUBLISHED",
      },
    });
    pc++;

    for (const fr of p.formulas) {
      const f = await prisma.formula.findFirst({ where: { pinyinName: fr.pinyin } });
      if (!f) { missingFormulas.add(fr.pinyin); continue; }
      try {
        await prisma.patternFormula.create({
          data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes },
        });
        pfLinks++;
      } catch { /* dup */ }
    }
    for (const ar of p.acupoints) {
      const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } });
      if (!a) { missingAcupoints.add(ar.code); continue; }
      try {
        await prisma.patternAcupoint.create({
          data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes },
        });
        paLinks++;
      } catch { /* dup */ }
    }

    console.log(`  ✓ pattern: ${p.c} (${p.p}) [+${p.formulas.length}f +${p.acupoints.length}a]`);
  }

  // ── Step 3: add conditions + cross-refs ───────────────────
  let cc = 0, cpLinks = 0;
  const missingPatterns = new Set<string>();

  for (const c of CONDITIONS) {
    const dup = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (dup) { console.log(`  ↷ condition: ${c.westernName}`); continue; }

    const created = await prisma.conditionMapping.create({
      data: {
        westernName: c.westernName,
        icd10Code: c.icd10, icd11Code: c.icd11,
        description: c.description,
      },
    });
    cc++;

    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) { missingPatterns.add(pr.pinyin); continue; }
      try {
        await prisma.conditionPatternMapping.create({
          data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes },
        });
        cpLinks++;
      } catch { /* dup */ }
    }

    console.log(`  ✓ condition: ${c.westernName} [+${c.patterns.length}p]`);
  }

  console.log(`\n[enrich-1] +${hc} herbs · +${pc} patterns · +${cc} conditions`);
  console.log(`           +${pfLinks} pattern→formula · +${paLinks} pattern→acupoint · +${cpLinks} condition→pattern links`);
  if (missingFormulas.size > 0) console.log(`  ⚠ Missing formulas: ${[...missingFormulas].sort().join(", ")}`);
  if (missingAcupoints.size > 0) console.log(`  ⚠ Missing acupoints: ${[...missingAcupoints].sort().join(", ")}`);
  if (missingPatterns.size > 0) console.log(`  ⚠ Missing patterns: ${[...missingPatterns].sort().join(", ")}`);

  const [hCount, fCount, aCount, pCount, cCount] = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(),
    prisma.conditionMapping.count(),
  ]);
  console.log(`\n  DB totals: ${hCount} herbs · ${fCount} formulas · ${aCount} acupoints · ${pCount} patterns · ${cCount} conditions`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
