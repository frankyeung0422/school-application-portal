/**
 * Content enrichment #4 — fill two missing TCM herb categories plus
 * additional patterns/conditions/patent medicines.
 *
 * Adds:
 *   • 7 astringent herbs (收澀藥) — completely missing category
 *   • 4 aromatic reviving herbs (開竅藥) — completely missing category
 *   • 5 misc commonly-cited herbs
 *   • 3 emergency / critical-care patent medicines (安宮牛黃丸, 蘇合香丸, 速效救心丸)
 *   • 3 new patterns (心陽虛, 肺脾兩虛, 衝任不調)
 *   • 4 new conditions (哮喘, 帕金森病, 慢性鼻竇炎, 阿茲海默症)
 *
 * Idempotent.
 *
 * Run: npx tsx scripts/enrich-4-astringent-revive.ts
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
  // ── 收澀藥 (Astringent Herbs) — 7 entries ──────────────────────
  { p: "Wu Wei Zi", c: "五味子", lat: "Schisandra chinensis", eng: "Schisandra Berry",
    cat: "Astringent", nat: "WARM", flav: ["Sour", "Sweet"],
    merid: ["Lung", "Heart", "Kidney"], dose: "2-6g",
    desc: "收斂固澀，益氣生津，補腎寧心。用於久嗽虛喘、夢遺滑精、遺尿尿頻、久瀉不止、自汗盜汗、津傷口渴、內熱消渴、心悸失眠。為生脈散主藥，具五味（酸甘苦辛鹹）皆備之特性。",
    pharm: "含五味子素A-G、五味子醇甲、五味子酯。具有保肝（降ALT/AST）、抗氧化、抗疲勞、適應原樣作用、增強記憶、鎮靜、止咳。聯苯雙酯、雙環醇即從本品開發。" },
  { p: "Wu Mei", c: "烏梅", lat: "Prunus mume (smoked)", eng: "Smoked Plum / Mume Fruit",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sour", "Astringent"],
    merid: ["Liver", "Spleen", "Lung", "Large Intestine"], dose: "6-12g",
    desc: "斂肺，澀腸，生津，安蛔。用於肺虛久咳、久痢滑腸、虛熱消渴、蛔厥嘔吐腹痛。烏梅丸主藥；現代用於膽道蛔蟲、慢性腹瀉。",
    pharm: "含枸櫞酸、蘋果酸、琥珀酸。具有抗菌（廣譜抑菌）、抗過敏、增強免疫、利膽、抗腫瘤作用。" },
  { p: "He Zi", c: "訶子", lat: "Terminalia chebula", eng: "Chebulic Myrobalan",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Bitter", "Sour", "Astringent"],
    merid: ["Lung", "Large Intestine"], dose: "3-10g",
    desc: "澀腸止瀉，斂肺止咳，利咽開音。用於久瀉久痢、便血脫肛、肺虛喘咳、久嗽不止、咽痛音啞。「金嗓子」喉片主要原料之一。",
    pharm: "含訶子鞣質、訶黎勒酸、訶子酸。具有抗菌、抗病毒、抗腫瘤、降血脂、強心作用。" },
  { p: "Lian Zi", c: "蓮子", lat: "Nelumbo nucifera (seed)", eng: "Lotus Seed",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sweet", "Astringent"],
    merid: ["Spleen", "Kidney", "Heart"], dose: "6-15g",
    desc: "補脾止瀉，益腎澀精，養心安神。用於脾虛久瀉、遺精滑精、心悸失眠、婦女崩漏帶下。為平補脾腎心三臟之佳品，藥食兩用。",
    pharm: "含蓮子鹼、棉子糖、蛋白質、磷、鈣。具有降壓、強心、抗氧化、改善睡眠作用。" },
  { p: "Qian Shi", c: "芡實", lat: "Euryale ferox", eng: "Euryale Seed / Foxnut",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sweet", "Astringent"],
    merid: ["Spleen", "Kidney"], dose: "9-15g",
    desc: "益腎固精，補脾止瀉，除濕止帶。用於遺精滑精、遺尿尿頻、脾虛久瀉、白帶不止。性平和，補而不滯，固而不留邪。",
    pharm: "含澱粉、蛋白質、脂肪、無機鹽。具有抗氧化、調節腸道、增強消化吸收作用。" },
  { p: "Sang Piao Xiao", c: "桑螵蛸", lat: "Mantis Egg Case (Paratenodera sinensis)", eng: "Mantis Egg Case",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sweet", "Salty"],
    merid: ["Liver", "Kidney"], dose: "5-10g",
    desc: "固精縮尿，補腎助陽。用於遺精滑精、遺尿尿頻、小便白濁、陽痿早泄。為螳螂卵塊。",
    pharm: "含蛋白質、磷脂、鐵、鈣。具有止咳平喘、抗利尿作用。" },
  { p: "Jin Ying Zi", c: "金櫻子", lat: "Rosa laevigata", eng: "Cherokee Rose Hip",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sour", "Sweet", "Astringent"],
    merid: ["Kidney", "Bladder", "Large Intestine"], dose: "6-12g",
    desc: "固精縮尿，澀腸止瀉。用於遺精滑精、遺尿尿頻、白帶過多、久瀉久痢。常與芡實相須為用（水陸二仙丹）。",
    pharm: "含金櫻子苷、蘋果酸、檸檬酸、鞣質。具有降血脂、抗菌、增強免疫作用。" },

  // ── 開竅藥 (Aromatic Reviving) — 4 entries ─────────────────────
  { p: "Bing Pian", c: "冰片", lat: "Borneolum / Dryobalanops aromatica", eng: "Borneol",
    cat: "Aromatic Reviving", nat: "COOL", flav: ["Pungent", "Bitter"],
    merid: ["Heart", "Spleen", "Lung"], dose: "0.15-0.3g (沖服或入丸散)",
    desc: "開竅醒神，清熱止痛。用於熱病神昏、驚厥；目赤、口瘡、咽喉腫痛、耳道流膿；瘡瘍腫痛、潰後不斂、水火燙傷。「諸藥不治者，得此皆通」。不入煎，研末沖服或外用。孕婦慎用。",
    pharm: "主要成分為d-龍腦。具有開竅醒腦（增加血腦屏障通透性）、抗炎、鎮痛、抗菌、促進其他藥物吸收作用。安宮牛黃丸主要成分之一。" },
  { p: "Su He Xiang", c: "蘇合香", lat: "Liquidambar orientalis (resin)", eng: "Storax",
    cat: "Aromatic Reviving", nat: "WARM", flav: ["Pungent"],
    merid: ["Heart", "Spleen"], dose: "0.3-1g (入丸散)",
    desc: "開竅醒神，辟穢，止痛。用於中風痰厥、猝然昏倒、痰壅氣閉、寒閉神昏、心腹突痛。為涼開（冰片）的對應，主寒閉。蘇合香丸主藥。不入煎。",
    pharm: "含蘇合香脂、桂皮酸。具有抗心肌缺血、抗血栓、增強冠脈血流、鎮靜、抗菌作用。" },
  { p: "Shi Chang Pu", c: "石菖蒲", lat: "Acorus tatarinowii", eng: "Grass-leaf Sweetflag Rhizome",
    cat: "Aromatic Reviving", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Heart", "Stomach"], dose: "3-10g",
    desc: "開竅豁痰，醒神益智，化濕開胃。用於神昏癲癇、健忘失眠、耳鳴耳聾、脘痞不飢、噤口下痢。安神益智類常用藥。",
    pharm: "含石菖蒲揮發油（β-細辛醚、α-細辛醚）。具有抗驚厥、改善學習記憶、抗抑鬱、抗心律失常作用。對阿茲海默症有研究價值。" },
  { p: "An Xi Xiang", c: "安息香", lat: "Styrax tonkinensis (resin)", eng: "Benzoin",
    cat: "Aromatic Reviving", nat: "NEUTRAL", flav: ["Pungent", "Bitter"],
    merid: ["Heart", "Spleen"], dose: "0.6-1.5g (入丸散)",
    desc: "開竅清神，行氣活血，止痛。用於中風痰厥、驚癇昏迷、產後血暈、心腹疼痛、風痺肢節痛。",
    pharm: "含松柏苷、香蘭素。具有祛痰、防腐、抗菌、刺激呼吸道分泌作用。" },

  // ── 補陰藥補充 (additional Yin Tonifying) ───────────────────────
  { p: "Bai He", c: "百合", lat: "Lilium lancifolium / brownii", eng: "Lily Bulb",
    cat: "Yin Tonifying", nat: "COOL", flav: ["Sweet"],
    merid: ["Heart", "Lung"], dose: "6-12g",
    desc: "養陰潤肺，清心安神。用於陰虛燥咳、勞嗽咯血、虛煩驚悸、失眠多夢、精神恍惚。百合病主藥（金匱要略）。",
    pharm: "含秋水仙鹼、多糖、皂苷。具有止咳祛痰、鎮靜、抗抑鬱、抗腫瘤、降血糖作用。" },
  { p: "Yu Zhu", c: "玉竹", lat: "Polygonatum odoratum", eng: "Solomon's Seal Rhizome",
    cat: "Yin Tonifying", nat: "COOL", flav: ["Sweet"],
    merid: ["Lung", "Stomach"], dose: "6-12g",
    desc: "養陰潤燥，生津止渴。用於肺胃陰傷、燥熱咳嗽、咽乾口渴、內熱消渴。性平和，補而不膩。",
    pharm: "含玉竹多糖、玉竹甾體皂苷。具有降血糖、降血脂、抗氧化、強心、提高免疫作用。" },
  { p: "Huang Jing", c: "黃精", lat: "Polygonatum sibiricum", eng: "Siberian Solomon's Seal",
    cat: "Yin Tonifying", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Spleen", "Lung", "Kidney"], dose: "9-15g",
    desc: "補氣養陰，健脾潤肺，益腎。用於脾胃虛弱、體倦乏力、口乾食少、肺虛燥咳、勞嗽咳血、精血不足、腰膝酸軟、鬚髮早白、內熱消渴。為氣陰雙補佳品。",
    pharm: "含黃精多糖、黃精皂苷、煙酸。具有降血糖、降血脂、抗動脈粥樣硬化、增強免疫、抗疲勞、延緩衰老作用。" },
  { p: "Shi Hu", c: "石斛", lat: "Dendrobium nobile", eng: "Dendrobium",
    cat: "Yin Tonifying", nat: "COOL", flav: ["Sweet"],
    merid: ["Stomach", "Kidney"], dose: "6-12g",
    desc: "益胃生津，滋陰清熱。用於熱病津傷、口乾煩渴、胃陰不足、食少乾嘔、病後虛熱不退、陰虛火旺、骨蒸勞熱、目暗不明、筋骨痿軟。",
    pharm: "含石斛鹼、毛蘭素、石斛酚。具有抗腫瘤、降血糖、抗白內障、增強免疫、護肝作用。" },

  // ── 平肝安神補充 ─────────────────────────────────────────────
  { p: "Suan Zao Ren", c: "酸棗仁", lat: "Ziziphus jujuba var. spinosa", eng: "Sour Jujube Seed",
    cat: "Spirit Calming", nat: "NEUTRAL", flav: ["Sweet", "Sour"],
    merid: ["Heart", "Liver", "Gallbladder"], dose: "9-15g",
    desc: "養心益肝，安神，斂汗，生津。用於虛煩不眠、驚悸多夢、體虛多汗、津傷口渴。為養心安神之要藥，酸棗仁湯主藥。",
    pharm: "含酸棗仁皂苷A/B、白樺脂酸、黃酮類。具有鎮靜催眠（GABA能增強）、抗焦慮、抗心律失常、降血壓、保護腦神經作用。" },
];

interface FH { pinyin: string; role: "JUN" | "CHEN" | "ZUO" | "SHI"; dose?: string; notes?: string }
interface F {
  p: string; c: string; eng: string; src: string; cat: string;
  actions: string; indications: string; modifications?: string;
  herbs: FH[];
}

const FORMULAS: F[] = [
  { p: "An Gong Niu Huang Wan", c: "安宮牛黃丸", eng: "Calming the Palace Pill with Bovine Bezoar",
    src: "溫病條辨 / 國藥准字 Z11020151",
    cat: "Patent Medicine",
    actions: "清熱解毒，鎮驚開竅",
    indications: "熱病、邪入心包、高熱驚厥、神昏譫語；中風昏迷、腦炎、腦膜炎、中毒性腦病、腦出血急性期、敗血症等屬熱閉證者。「涼開三寶」之首。為急症名方。",
    modifications: "Zhang et al. RCT 2024 — 急性腦出血聯合常規治療顯著改善GCS評分。需注意硃砂（汞）、雄黃（砷）含量，不宜久服。妊娠禁用。",
    herbs: [
      { pinyin: "Bing Pian", role: "JUN", dose: "—", notes: "開竅醒神" },
      { pinyin: "Huang Lian", role: "CHEN", dose: "—" },
      { pinyin: "Huang Qin", role: "CHEN", dose: "—" },
      { pinyin: "Zhi Zi", role: "ZUO", dose: "—" },
    ] },
  { p: "Su He Xiang Wan", c: "蘇合香丸", eng: "Storax Pill",
    src: "太平惠民和劑局方",
    cat: "Patent Medicine",
    actions: "芳香開竅，行氣止痛",
    indications: "中風、中暑、痰厥昏迷、心胃氣痛、寒閉證。為「溫開三寶」之首，與安宮牛黃丸（涼開）相對。",
    modifications: "現代用於冠心病心絞痛急性發作、急性中風寒閉證。",
    herbs: [
      { pinyin: "Su He Xiang", role: "JUN", dose: "—" },
      { pinyin: "An Xi Xiang", role: "CHEN", dose: "—" },
      { pinyin: "Bing Pian", role: "CHEN", dose: "—" },
      { pinyin: "Mu Xiang", role: "ZUO", dose: "—" },
    ] },
  { p: "Su Xiao Jiu Xin Wan", c: "速效救心丸", eng: "Quick-Acting Heart-Saving Pill",
    src: "天津第六製藥廠 / 國藥准字 Z12020025",
    cat: "Patent Medicine",
    actions: "行氣活血，祛瘀止痛",
    indications: "氣滯血瘀型冠心病心絞痛急性發作；舌下含服可在5分鐘內緩解胸痛。為冠心病急救常備藥。",
    modifications: "多項RCT顯示緩解心絞痛效果與硝酸甘油相當而頭痛副作用更少；適合對硝酸酯耐受不良者。",
    herbs: [
      { pinyin: "Chuan Xiong", role: "JUN", dose: "—" },
      { pinyin: "Bing Pian", role: "CHEN", dose: "—" },
    ] },
];

interface P {
  p: string; c: string; eng: string; organ: string; type: Pathology;
  symptoms: string; tongue: string; pulse: string; principle: string;
  formulas: { pinyin: string; primary: boolean; notes?: string }[];
  acupoints: { code: string; method?: string; notes?: string }[];
}

const PATTERNS: P[] = [
  { p: "Xin Yang Xu", c: "心陽虛", eng: "Heart Yang Deficiency",
    organ: "心", type: "YANG_DEFICIENCY",
    symptoms: "心悸怔忡、胸悶氣短、活動後加重、形寒肢冷、面色蒼白或晦暗、自汗、甚則胸痛胸痺。",
    tongue: "舌淡胖或紫暗、苔白",
    pulse: "脈沉細弱或結代",
    principle: "溫補心陽，益氣安神",
    formulas: [
      { pinyin: "Zhi Gan Cao Tang", primary: true, notes: "炙甘草湯（如DB有）" },
      { pinyin: "Si Ni Tang", primary: false, notes: "陽衰甚者" },
    ],
    acupoints: [
      { code: "BL15", method: "灸補法", notes: "心俞" },
      { code: "PC6", method: "補法", notes: "內關" },
      { code: "CV17", method: "灸", notes: "膻中" },
      { code: "ST36", method: "補法" },
    ] },
  { p: "Fei Pi Liang Xu", c: "肺脾兩虛", eng: "Lung-Spleen Dual Deficiency",
    organ: "肺脾", type: "QI_DEFICIENCY",
    symptoms: "久咳痰多色白、氣短乏力、食少便溏、面色萎黃、自汗易感冒、四肢倦怠。",
    tongue: "舌淡、苔白",
    pulse: "脈細弱",
    principle: "補益肺脾",
    formulas: [
      { pinyin: "Liu Jun Zi Tang", primary: true, notes: "標準方" },
      { pinyin: "Bu Zhong Yi Qi Tang", primary: false, notes: "中氣下陷型" },
    ],
    acupoints: [
      { code: "BL13", method: "補法", notes: "肺俞" },
      { code: "BL20", method: "補法", notes: "脾俞" },
      { code: "ST36", method: "補法" },
      { code: "LU9", method: "補法", notes: "太淵" },
    ] },
  { p: "Chong Ren Bu Tiao", c: "衝任不調", eng: "Disharmony of Chong and Ren Vessels",
    organ: "肝腎沖任", type: "STAGNATION",
    symptoms: "月經不調、經期紊亂、量多或量少、痛經、不孕、胎動不安、流產、更年期諸證；可伴情志不暢、腰膝酸軟、頭暈耳鳴。",
    tongue: "舌淡或暗、苔薄",
    pulse: "脈弦細或沉細",
    principle: "調補衝任，疏肝補腎",
    formulas: [
      { pinyin: "Si Wu Tang", primary: true, notes: "經期不調基礎" },
      { pinyin: "Xiao Yao San", primary: false, notes: "兼肝鬱" },
      { pinyin: "Liu Wei Di Huang Wan", primary: false, notes: "兼腎陰虛" },
    ],
    acupoints: [
      { code: "SP6", method: "平補平瀉", notes: "三陰交" },
      { code: "CV4", method: "灸", notes: "關元" },
      { code: "BL23", method: "補法", notes: "腎俞" },
      { code: "LV3", method: "平補平瀉", notes: "太衝疏肝" },
    ] },
];

interface Cnd {
  westernName: string; chineseName?: string;
  icd11: string; icd10: string;
  description: string;
  patterns: { pinyin: string; freq: Frequency; notes?: string }[];
}

const CONDITIONS: Cnd[] = [
  { westernName: "Asthma", chineseName: "支氣管哮喘",
    icd11: "CA23", icd10: "J45",
    description: "Chronic inflammatory airway disease with bronchospasm and reversible airflow obstruction. TCM: 哮病/喘證.",
    patterns: [
      { pinyin: "Tan Shi Zu Fei", freq: "COMMON", notes: "痰濁阻肺型" },
      { pinyin: "Fei Pi Liang Xu", freq: "COMMON", notes: "緩解期肺脾兩虛" },
      { pinyin: "Shen Yang Xu", freq: "OCCASIONAL", notes: "腎不納氣型" },
    ] },
  { westernName: "Parkinson Disease", chineseName: "帕金森病",
    icd11: "8A00.0", icd10: "G20",
    description: "Neurodegenerative disorder with bradykinesia, tremor, rigidity. TCM: 顫證/痙證.",
    patterns: [
      { pinyin: "Gan Yang Shang Kang", freq: "COMMON", notes: "肝風內動型" },
      { pinyin: "Gan Shen Yin Xu", freq: "COMMON", notes: "肝腎陰虛型" },
      { pinyin: "Qi Xue Liang Xu", freq: "OCCASIONAL", notes: "晚期氣血兩虛" },
    ] },
  { westernName: "Chronic Sinusitis", chineseName: "慢性鼻竇炎",
    icd11: "CA0A.1", icd10: "J32",
    description: "Persistent sinus inflammation >12 weeks. TCM: 鼻淵.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "脾胃濕熱上蒸" },
      { pinyin: "Fei Pi Liang Xu", freq: "OCCASIONAL", notes: "肺脾氣虛遷延" },
    ] },
  { westernName: "Alzheimer Disease", chineseName: "阿茲海默症",
    icd11: "8A20", icd10: "G30",
    description: "Progressive neurodegenerative dementia. TCM: 癡呆/善忘.",
    patterns: [
      { pinyin: "Shen Yin Xu", freq: "COMMON", notes: "腎精不足型" },
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "痰濁蒙竅型" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL", notes: "瘀血阻絡型" },
    ] },
];

async function main() {
  console.log(`\n[enrich-4] Astringent + reviving herbs + critical-care patent meds + new patterns/conditions\n`);

  // ── Step 1: herbs ────────────────────────────────────────
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

  // ── Step 2: formulas (patent meds) ───────────────────────
  let fc = 0, fhLinks = 0;
  const missingHerbs = new Set<string>();
  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({
      where: { pinyinName: f.p }, include: { herbs: { select: { herbId: true } } },
    });
    let formulaId: string;
    let preexisting = false;
    if (existing) { formulaId = existing.id; preexisting = true; }
    else {
      const created = await prisma.formula.create({
        data: {
          pinyinName: f.p, chineseName: f.c, englishName: f.eng,
          sourceText: f.src, category: f.cat,
          actions: f.actions, indications: f.indications, modifications: f.modifications,
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
    fhLinks += linked;
    console.log(`  ${preexisting ? "↻" : "✓"} formula: ${f.c} (${f.p}) [+${linked} herbs]`);
  }

  // ── Step 3: patterns ─────────────────────────────────────
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
        treatmentPrinciple: p.principle, status: "PUBLISHED",
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

  // ── Step 4: conditions ───────────────────────────────────
  let cc = 0, cpLinks = 0;
  const missingPatterns = new Set<string>();
  for (const c of CONDITIONS) {
    const dup = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (dup) { console.log(`  ↷ condition: ${c.westernName}`); continue; }
    const created = await prisma.conditionMapping.create({
      data: {
        westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11,
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

  console.log(`\n[enrich-4] +${hc} herbs · +${fc} formulas (+${fhLinks} herb links) · +${pc} patterns · +${cc} conditions`);
  console.log(`           +${pfLinks} pattern→formula · +${paLinks} pattern→acupoint · +${cpLinks} condition→pattern`);
  if (missingHerbs.size > 0) console.log(`  ⚠ Missing herbs (formulas): ${[...missingHerbs].sort().join(", ")}`);
  if (missingFormulas.size > 0) console.log(`  ⚠ Missing formulas (patterns): ${[...missingFormulas].sort().join(", ")}`);
  if (missingAcupoints.size > 0) console.log(`  ⚠ Missing acupoints (patterns): ${[...missingAcupoints].sort().join(", ")}`);
  if (missingPatterns.size > 0) console.log(`  ⚠ Missing patterns (conditions): ${[...missingPatterns].sort().join(", ")}`);

  const [hCount, fCount, aCount, pCount, cCount] = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(),
  ]);
  console.log(`\n  DB: ${hCount} herbs · ${fCount} formulas · ${aCount} acupoints · ${pCount} patterns · ${cCount} conditions`);

  const cats = await prisma.herb.groupBy({ by: ["category"], _count: true, orderBy: { _count: { category: "desc" } } });
  console.log(`  Herb categories now (${cats.length}):`);
  for (const c of cats) console.log(`    ${c.category.padEnd(36)} ${c._count}`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
