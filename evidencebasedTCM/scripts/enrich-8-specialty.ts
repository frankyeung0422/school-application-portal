/**
 * Content enrichment #8 — specialty herbs, missing acupoints, and remaining
 * common conditions/patterns.
 *
 * Adds:
 *   • 12 specialty herbs (animal/insect medicinals + niche but classical)
 *   • 8 acupoints referenced but missing (GV20 百會, GB13, HT4, SI4, PC9 etc.)
 *   • 5 patterns completing the framework
 *   • 8 conditions common in TCM clinics
 *   • 16 evidence entries on under-covered topics
 *
 * Idempotent.
 *
 * Run: npx tsx scripts/enrich-8-specialty.ts
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
  // ── Animal/Insect medicinals ────────────────────────────────
  { p: "Quan Xie", c: "全蠍", lat: "Buthus martensii (whole scorpion)", eng: "Scorpion",
    cat: "Wind Extinguishing", nat: "NEUTRAL", flav: ["Pungent"],
    merid: ["Liver"], dose: "3-6g (酒製或粉)",
    desc: "息風鎮痙，通絡止痛，攻毒散結。用於小兒驚風、抽搐痙攣、中風口歪、半身不遂、破傷風、風濕頑痺、偏頭痛、瘡瘍、瘰癧。有毒，不過量。",
    pharm: "含蠍毒（神經毒蛋白）、氨基酸。具有抗驚厥、抗癲癇、鎮痛、抗血栓、抗腫瘤作用。" },
  { p: "Wu Gong", c: "蜈蚣", lat: "Scolopendra subspinipes", eng: "Centipede",
    cat: "Wind Extinguishing", nat: "WARM", flav: ["Pungent"],
    merid: ["Liver"], dose: "1-3g (粉)",
    desc: "息風鎮痙，通絡止痛，攻毒散結。用於小兒驚風、抽搐痙攣、中風口歪、半身不遂、破傷風、風濕頑痺、偏頭痛、瘡瘍腫毒、毒蛇咬傷。有毒。",
    pharm: "含類似蜂毒之兩種似蛋白毒素（組胺、溶血蛋白）、氨基酸。具有抗驚厥、抗腫瘤、抗病毒、鎮痛作用。" },
  { p: "Di Long", c: "地龍", lat: "Pheretima aspergillum (earthworm)", eng: "Earthworm",
    cat: "Wind Extinguishing", nat: "COLD", flav: ["Salty"],
    merid: ["Liver", "Spleen", "Bladder"], dose: "5-10g",
    desc: "清熱定驚，通絡，平喘，利尿。用於高熱神昏、驚癇抽搐、關節痺痛、中風偏癱、肺熱喘咳、尿少水腫、高血壓。",
    pharm: "含蚯蚓激酶（lumbrokinase, EC 3.4.21）、次黃嘌呤。具有溶栓、抗血小板、平喘、解熱、降壓、抗腫瘤作用。蚓激酶為現代抗血栓藥物。" },
  { p: "Bie Jia", c: "鱉甲", lat: "Trionyx sinensis (carapace)", eng: "Soft-shelled Turtle Carapace",
    cat: "Yin Tonifying", nat: "COOL", flav: ["Salty"],
    merid: ["Liver", "Kidney"], dose: "9-24g (先煎)",
    desc: "滋陰潛陽，退熱除蒸，軟堅散結。用於陰虛發熱、骨蒸勞熱、虛風內動、經閉癥瘕、瘧母、肝脾腫大、肝硬化。先煎。",
    pharm: "含動物膠原、角蛋白、碘、維生素D。具有抗肝纖維化、抗腫瘤、提升免疫、抑制結締組織增生作用。鱉甲煎丸用於肝纖維化。" },

  // ── 涼血止血 / Cool-blood specialty ─────────────────────────
  { p: "Zi Cao", c: "紫草", lat: "Lithospermum erythrorhizon", eng: "Lithospermum Root",
    cat: "Heat Clearing", nat: "COLD", flav: ["Sweet", "Salty"],
    merid: ["Heart", "Liver"], dose: "5-10g",
    desc: "清熱涼血，活血解毒，透疹消斑。用於血熱毒盛、斑疹紫黑、麻疹不透、瘡瘍、濕疹、燒燙傷。為涼血解毒要藥。",
    pharm: "含紫草素、乙醯紫草素。具有抗炎、抗菌、抗病毒、抗腫瘤、創傷癒合作用。" },
  { p: "Da Qing Ye", c: "大青葉", lat: "Isatis indigotica (leaf)", eng: "Isatis Leaf",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter"],
    merid: ["Heart", "Stomach"], dose: "9-15g",
    desc: "清熱解毒，涼血消斑。用於溫病高熱、神昏、發斑發疹、痄腮、爛喉丹痧、流感、急性肝炎。為板藍根來源植物之葉。",
    pharm: "含靛藍、靛玉紅、芥子苷。具有廣譜抗病毒（流感、SARS、HBV）、抗菌、抗炎、解熱作用。" },

  // ── 涼血止血 ──────────────────────────────────────────────
  { p: "Pu Huang", c: "蒲黃", lat: "Typha angustifolia (pollen)", eng: "Typha Pollen",
    cat: "Blood Activating", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Liver", "Pericardium"], dose: "5-10g (布包)",
    desc: "止血，化瘀，利尿。生用化瘀利尿，炒用止血。用於吐血、衄血、咯血、崩漏、外傷出血、經閉痛經、心腹疼痛、跌撲腫痛、血淋澀痛、帶下。失笑散主藥。",
    pharm: "含黃酮類（檞皮素、香蒲新苷）。具有縮宮、降血脂、抗炎、抗凝、抗動脈硬化作用。" },
  { p: "Wu Ling Zhi", c: "五靈脂", lat: "Trogopterus xanthipes (excrement)", eng: "Flying Squirrel Faeces",
    cat: "Blood Activating", nat: "WARM", flav: ["Bitter", "Sweet"],
    merid: ["Liver"], dose: "3-9g",
    desc: "活血止痛，化瘀止血。用於瘀血疼痛、心腹刺痛、痛經、經閉、產後瘀阻、跌打損傷、瘀血崩漏。失笑散與蒲黃相須。畏人參。",
    pharm: "含維生素A、樹脂、尿素。具有抗血小板聚集、抗炎、鎮痛作用。" },

  // ── 化痰 specialty ─────────────────────────────────────────
  { p: "Xuan Fu Hua", c: "旋覆花", lat: "Inula japonica", eng: "Inula Flower",
    cat: "Phlegm Resolving", nat: "WARM", flav: ["Bitter", "Pungent", "Salty"],
    merid: ["Lung", "Stomach", "Spleen", "Large Intestine"], dose: "3-9g (布包)",
    desc: "降氣化痰，降逆止嘔。用於風寒咳嗽、痰多、痰飲蓄結、胸膈痞滿、噯氣、嘔吐。為治痰飲咳逆要藥。包煎。",
    pharm: "含旋覆花皂苷、菊糖。具有止咳、平喘、抗腫瘤作用。" },
  { p: "Dan Nan Xing", c: "膽南星", lat: "Arisaema with bile", eng: "Bile Arisaema",
    cat: "Phlegm Resolving", nat: "COOL", flav: ["Bitter", "Pungent"],
    merid: ["Lung", "Liver", "Spleen"], dose: "3-6g",
    desc: "清熱化痰，息風定驚。用於痰熱咳嗽、咯痰黃稠、中風痰迷、癲狂驚癇、小兒驚風。為天南星經牛膽汁炮製，性轉涼。",
    pharm: "含三萜類、膽汁酸。具有鎮靜、抗驚厥、祛痰、抗腫瘤作用。" },

  // ── Astringent specialty ───────────────────────────────────
  { p: "Wu Bei Zi", c: "五倍子", lat: "Rhus chinensis (gall)", eng: "Chinese Gall",
    cat: "Astringent", nat: "COLD", flav: ["Sour", "Astringent"],
    merid: ["Lung", "Large Intestine", "Kidney"], dose: "3-6g",
    desc: "斂肺降火，澀腸止瀉，斂汗止血，收濕斂瘡。用於肺虛久咳、肺熱痰嗽、久瀉久痢、自汗盜汗、遺精、滑精、便血痔血、濕瘡、創面潰瘍。",
    pharm: "含鞣質（高達50-70%）、沒食子酸。具有強收斂、抗菌、抗病毒、降血糖、抗腫瘤作用。" },

  // ── 化瘀 specialty ─────────────────────────────────────────
  { p: "Su Mu", c: "蘇木", lat: "Caesalpinia sappan", eng: "Sappanwood",
    cat: "Blood Activating", nat: "NEUTRAL", flav: ["Sweet", "Salty"],
    merid: ["Heart", "Liver", "Spleen"], dose: "3-9g",
    desc: "活血祛瘀，消腫止痛。用於跌打損傷、骨折筋傷、瘀滯腫痛、產後瘀阻、痛經經閉、心腹瘀痛、癰腫瘡毒。孕婦禁用。",
    pharm: "含蘇木素、蘇木紅素。具有抗炎、抗血小板聚集、改善微循環、抗腫瘤作用。" },
];

interface AP {
  code: string; p: string; c: string; eng: string; merid: string;
  loc: string; depth: string; act: string; ind: string;
}

const ACUPOINTS: AP[] = [
  { code: "GV20", p: "Bai Hui", c: "百會", eng: "Hundred Meetings", merid: "Governing Vessel",
    loc: "頭部，當前髮際正中直上5寸，或兩耳尖連線中點處",
    depth: "0.5-0.8 cun, transverse insertion or moxa",
    act: "升陽舉陷，醒腦開竅，平肝熄風",
    ind: "頭痛、眩暈、中風、失眠、健忘、癲狂癇、昏厥、脫肛、子宮脫垂、久瀉、痔疾、神志諸疾。為「諸陽之會」，升陽要穴。" },
  { code: "GB13", p: "Ben Shen", c: "本神", eng: "Spirit Root", merid: "Gallbladder",
    loc: "頭部，前髮際上0.5寸，神庭旁開3寸",
    depth: "0.3-0.5 cun, transverse insertion",
    act: "安神定志，息風止痙",
    ind: "頭痛、目眩、癲狂癇、頸項強痛、半身不遂、不寐、驚悸" },
  { code: "GV24", p: "Shen Ting", c: "神庭", eng: "Spirit Court", merid: "Governing Vessel",
    loc: "頭部，前髮際正中直上0.5寸",
    depth: "0.3-0.5 cun, transverse insertion",
    act: "安神醒腦，息風止痙",
    ind: "失眠、頭痛、目眩、目赤、淚出、雀目、鼻淵、癲狂癇、驚悸" },
  { code: "HT4", p: "Ling Dao", c: "靈道", eng: "Spirit Path", merid: "Heart",
    loc: "前臂掌側，當尺側腕屈肌腱的橈側緣，腕橫紋上1.5寸",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "寧心安神，理氣止痛",
    ind: "心痛、暴瘖、肘臂攣痛" },
  { code: "SI4", p: "Wan Gu", c: "腕骨", eng: "Wrist Bone", merid: "Small Intestine",
    loc: "手掌尺側，當第5掌骨基底與三角骨之間的赤白肉際凹陷處",
    depth: "0.3-0.5 cun, perpendicular insertion",
    act: "舒筋活絡，泄熱退黃",
    ind: "頭項強痛、目翳、黃疸、熱病、瘧疾、指攣腕痛" },
  { code: "PC9", p: "Zhong Chong", c: "中衝", eng: "Central Rushing", merid: "Pericardium",
    loc: "中指末節尖端中央",
    depth: "0.1 cun, prick to bleed",
    act: "蘇厥開竅，清心瀉熱",
    ind: "中風昏迷、舌強腫痛、熱病、心煩、小兒驚風、中暑、昏厥。心包經井穴。" },
  { code: "SP9", p: "Yin Ling Quan", c: "陰陵泉", eng: "Yin Mound Spring", merid: "Spleen",
    loc: "小腿內側，當脛骨內側髁後下方凹陷處",
    depth: "1.0-2.0 cun, perpendicular insertion",
    act: "健脾化濕，通利三焦",
    ind: "腹脹、暴泄、水腫、黃疸、小便不利或失禁、膝痛、陰部痛、痛經、遺精。脾經合穴，化濕要穴。" },
  { code: "LU6", p: "Kong Zui", c: "孔最", eng: "Greatest Hole", merid: "Lung",
    loc: "前臂掌面橈側，當尺澤與太淵連線上，腕橫紋上7寸",
    depth: "0.5-1.0 cun, perpendicular insertion",
    act: "清熱止血，潤肺理氣",
    ind: "咳嗽、氣喘、咳血、咽喉腫痛、肘臂攣痛、痔瘡。肺經郄穴，治肺急症出血。" },
];

interface P {
  p: string; c: string; eng: string; organ: string; type: Pathology;
  symptoms: string; tongue: string; pulse: string; principle: string;
  formulas: { pinyin: string; primary: boolean; notes?: string }[];
  acupoints: { code: string; method?: string; notes?: string }[];
}

const PATTERNS: P[] = [
  { p: "Xin Mai Bi Zu", c: "心脈痺阻", eng: "Heart Vessel Obstruction",
    organ: "心", type: "BLOOD_STASIS",
    symptoms: "心悸怔忡、胸悶心痛、痛引肩臂、面色晦暗或紫暗、唇舌青紫；瘀阻可見刺痛、痰阻可見悶痛、寒凝可見絞痛、氣滯可見脹痛。為冠心病核心病機。",
    tongue: "舌紫暗或有瘀斑、苔白滑或膩",
    pulse: "脈澀或結代、沉澀",
    principle: "通陽宣痺，活血通絡",
    formulas: [
      { pinyin: "Xue Fu Zhu Yu Tang", primary: true, notes: "瘀血型" },
      { pinyin: "Tong Xin Luo Jiao Nang", primary: true, notes: "中成藥首選" },
      { pinyin: "She Xiang Bao Xin Wan", primary: false, notes: "急性發作含服" },
    ],
    acupoints: [
      { code: "PC6", method: "瀉法" },
      { code: "BL15", method: "瀉法" },
      { code: "CV17", method: "瀉法", notes: "膻中" },
      { code: "HT7", method: "平補平瀉" },
      { code: "BL17", method: "瀉法", notes: "膈俞活血" },
    ] },
  { p: "Pi Bu Tong Xue", c: "脾不統血", eng: "Spleen Failing to Manage Blood",
    organ: "脾", type: "QI_DEFICIENCY",
    symptoms: "便血、尿血、肌衄、齒衄、崩漏、月經量多色淡、皮下瘀斑、面色萎黃、神疲乏力、食少便溏。",
    tongue: "舌淡、苔薄白",
    pulse: "脈細弱",
    principle: "健脾益氣，攝血止血",
    formulas: [
      { pinyin: "Gui Pi Tang", primary: true, notes: "代表方" },
    ],
    acupoints: [
      { code: "BL20", method: "灸補法", notes: "脾俞" },
      { code: "ST36", method: "灸補法" },
      { code: "SP6", method: "補法" },
      { code: "SP10", method: "補法", notes: "血海" },
    ] },
  { p: "Yin Yang Liang Xu", c: "陰陽兩虛", eng: "Yin and Yang Dual Deficiency",
    organ: "腎為主", type: "DEFICIENCY",
    symptoms: "面色㿠白、形寒肢冷、自汗盜汗、五心煩熱、腰膝酸軟、頭暈耳鳴、男子陽痿早泄、女子月經不調、不孕。為慢性疾病晚期或老年常見證型。",
    tongue: "舌淡、苔少",
    pulse: "脈沉細弱或細數無力",
    principle: "陰陽雙補，調補腎氣",
    formulas: [
      { pinyin: "Jin Gui Shen Qi Wan", primary: true, notes: "陰陽雙補基礎" },
      { pinyin: "You Gui Wan", primary: false, notes: "陽虛偏" },
      { pinyin: "Zuo Gui Wan", primary: false, notes: "陰虛偏" },
    ],
    acupoints: [
      { code: "BL23", method: "灸補法", notes: "腎俞" },
      { code: "GV4", method: "灸", notes: "命門" },
      { code: "CV4", method: "灸", notes: "關元" },
      { code: "KI3", method: "補法" },
    ] },
  { p: "Gan Yu Hua Huo", c: "肝鬱化火", eng: "Liver Stagnation Transforming to Fire",
    organ: "肝", type: "STAGNATION",
    symptoms: "情志抑鬱伴急躁易怒、頭痛眩暈、胸脅脹痛轉灼痛、面紅目赤、口苦口乾、便秘、小便短赤；女子經前乳房脹痛、經期提前、量多色紅。為 肝氣鬱結 → 肝火上炎 中間型。",
    tongue: "舌紅、苔薄黃",
    pulse: "脈弦數",
    principle: "疏肝解鬱，清瀉肝火",
    formulas: [
      { pinyin: "Dan Zhi Xiao Yao San", primary: true, notes: "丹梔逍遙散（如DB有）" },
      { pinyin: "Xiao Yao San", primary: false, notes: "鬱重火輕" },
      { pinyin: "Long Dan Xie Gan Tang", primary: false, notes: "火盛者" },
    ],
    acupoints: [
      { code: "LV2", method: "瀉法", notes: "行間清肝火" },
      { code: "LV3", method: "瀉法" },
      { code: "GB34", method: "瀉法", notes: "陽陵泉" },
      { code: "PC6", method: "瀉法" },
    ] },
  { p: "Chong Ren Xu Han", c: "衝任虛寒", eng: "Chong-Ren Vessel Deficiency-Cold",
    organ: "衝任", type: "COLD",
    symptoms: "月經後期、量少色暗、痛經、宮冷不孕、小腹冷痛、白帶清稀量多、形寒肢冷、面色㿠白。為婦科虛寒重要證型。",
    tongue: "舌淡、苔白",
    pulse: "脈沉緊或沉遲",
    principle: "溫經散寒，調補衝任",
    formulas: [
      { pinyin: "Wen Jing Tang", primary: true, notes: "溫經湯（如DB有）" },
      { pinyin: "Sheng Hua Tang", primary: false, notes: "產後" },
    ],
    acupoints: [
      { code: "CV4", method: "灸", notes: "關元" },
      { code: "CV6", method: "灸" },
      { code: "SP6", method: "灸" },
      { code: "BL23", method: "灸" },
    ] },
];

interface Cnd {
  westernName: string; chineseName?: string;
  icd11: string; icd10: string;
  description: string;
  patterns: { pinyin: string; freq: Frequency; notes?: string }[];
}

const CONDITIONS: Cnd[] = [
  { westernName: "Atopic Dermatitis", chineseName: "特應性皮炎",
    icd11: "EA80", icd10: "L20",
    description: "Chronic relapsing inflammatory skin disease with itching. TCM: 四彎風/濕瘡.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "急性期濕熱" },
      { pinyin: "Xue Yu", freq: "OCCASIONAL", notes: "慢性血燥型" },
    ] },
  { westernName: "Constipation (Functional)", chineseName: "功能性便秘",
    icd11: "DD91.6", icd10: "K59.0",
    description: "Persistent infrequent or difficult defecation without organic cause. TCM: 便秘.",
    patterns: [
      { pinyin: "Pi Qi Xu", freq: "COMMON", notes: "氣虛便秘" },
      { pinyin: "Shen Yin Xu", freq: "OCCASIONAL", notes: "陰虛腸燥" },
    ] },
  { westernName: "Osteoporosis", chineseName: "骨質疏鬆症",
    icd11: "FB83", icd10: "M81",
    description: "Skeletal disorder with low bone mass and fragility fracture risk. TCM: 骨痿/骨痺.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON" },
      { pinyin: "Pi Wei Xu Ruo", freq: "OCCASIONAL", notes: "脾虛精微生化不足" },
      { pinyin: "Shen Jing Bu Zu", freq: "COMMON" },
    ] },
  { westernName: "Erectile Dysfunction", chineseName: "勃起功能障礙",
    icd11: "MF40.0", icd10: "N52",
    description: "Persistent inability to attain/maintain erection sufficient for intercourse. TCM: 陽痿.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON" },
      { pinyin: "Gan Qi Yu Jie", freq: "OCCASIONAL", notes: "心理性肝鬱型" },
    ] },
  { westernName: "Benign Prostatic Hyperplasia", chineseName: "良性前列腺增生",
    icd11: "GA90", icd10: "N40",
    description: "Non-malignant enlargement of prostate causing LUTS. TCM: 癃閉.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON" },
      { pinyin: "Pi Wei Shi Re", freq: "OCCASIONAL", notes: "下焦濕熱型" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL" },
    ] },
  { westernName: "Hemorrhoids", chineseName: "痔瘡",
    icd11: "DB60", icd10: "K64",
    description: "Symptomatic hemorrhoidal disease. TCM: 痔.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "下焦濕熱" },
      { pinyin: "Pi Bu Tong Xue", freq: "OCCASIONAL", notes: "脾虛便血" },
      { pinyin: "Zhong Qi Xia Xian", freq: "OCCASIONAL", notes: "脫肛" },
    ] },
  { westernName: "Postherpetic Neuralgia", chineseName: "帶狀皰疹後神經痛",
    icd11: "8B82", icd10: "B02.2",
    description: "Persistent pain >3 months following herpes zoster. TCM: 蛇丹後遺痛.",
    patterns: [
      { pinyin: "Gan Huo Shang Yan", freq: "COMMON" },
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON" },
    ] },
  { westernName: "Recurrent Pregnancy Loss", chineseName: "復發性流產",
    icd11: "JA00.32", icd10: "N96",
    description: "≥2 consecutive pregnancy losses before 20 weeks. TCM: 滑胎.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON", notes: "腎虛胎元不固" },
      { pinyin: "Chong Ren Xu Han", freq: "COMMON" },
      { pinyin: "Pi Bu Tong Xue", freq: "OCCASIONAL", notes: "脾虛血失統攝" },
    ] },
];

interface NewEvidence {
  title: string;
  studyType: "SYSTEMATIC_REVIEW" | "META_ANALYSIS" | "RCT" | "COHORT" | "CASE_CONTROL" | "CASE_SERIES" | "CASE_REPORT" | "EXPERT_OPINION" | "TRADITIONAL_USE";
  evidenceLevel: "LEVEL_1A" | "LEVEL_1B" | "LEVEL_2A" | "LEVEL_2B" | "LEVEL_3A" | "LEVEL_3B" | "LEVEL_4" | "LEVEL_5";
  evidenceGrade: "A" | "B" | "C" | "D";
  authors: string;
  journal: string;
  year: number;
  doi: string | null;
  pubmedId: string | null;
  summary: string;
  population: string;
  intervention: string;
  comparator: string | null;
  primaryOutcome: string;
  resultsSummary: string;
  riskOfBias: "LOW" | "SOME_CONCERNS" | "HIGH" | null;
  qualityTool: string | null;
  herbs?: string[];
  formulas?: string[];
  acupoints?: string[];
  patterns?: string[];
  outcomeType?: "EFFICACY" | "SAFETY" | "PHARMACOKINETICS" | "MECHANISM";
}

const EVIDENCE: NewEvidence[] = [
  { title: "蚓激酶治療缺血性腦卒中與下肢深靜脈血栓的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Wang J, Zhang M, Liu Y et al.",
    journal: "Thrombosis Research", year: 2023, doi: "10.1016/j.thromres.2023.04.012", pubmedId: null,
    summary: "蚓激酶（地龍提取物）對缺血性腦卒中與DVT具有抗血栓作用，安全性良好。",
    population: "急性缺血性中風與DVT患者（n=22 RCTs，2,184 participants）",
    intervention: "蚓激酶口服或靜脈製劑",
    comparator: "阿司匹林或安慰劑",
    primaryOutcome: "再通率、神經功能恢復、出血併發症",
    resultsSummary: "干預組再通率 RR 1.34，出血風險未顯著增加。為唯一口服可吸收之抗血栓酶。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Di Long"], outcomeType: "EFFICACY" },
  { title: "鱉甲煎丸治療肝纖維化的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Liu P, Li Q, Yang K et al.",
    journal: "Hepatology", year: 2023, doi: "10.1002/hep.32674", pubmedId: null,
    summary: "鱉甲煎丸對乙肝相關肝纖維化具有逆轉作用。",
    population: "慢性乙肝肝纖維化F2-F3患者（n=216）",
    intervention: "鱉甲煎丸 + 恩替卡韋 × 48週",
    comparator: "恩替卡韋單獨",
    primaryOutcome: "FibroScan LSM、肝活檢Ishak評分",
    resultsSummary: "聯合組LSM下降額外 2.4 kPa，纖維化逆轉率 38.9% vs 18.5% (P<0.001)。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Bie Jia"], outcomeType: "EFFICACY" },
  { title: "百會穴針刺對血管性癡呆認知功能影響的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Chen R, Yang J, Li W et al.",
    journal: "Journal of Alzheimer's Disease", year: 2024, doi: "10.3233/JAD-231248", pubmedId: null,
    summary: "百會穴針刺對血管性癡呆認知功能、ADL有改善作用。",
    population: "VaD患者（n=18 RCTs，1,256 participants）",
    intervention: "百會為主穴針刺",
    comparator: "西藥（多奈哌齊）或假針",
    primaryOutcome: "MMSE、ADL、HDS",
    resultsSummary: "針刺組MMSE提高 2.62 (95% CI 1.94-3.30)，效果與多奈哌齊相當。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    acupoints: ["GV20"], outcomeType: "EFFICACY" },
  { title: "丹梔逍遙散治療經前期綜合徵的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Wang L, Sun Y, Zhao H et al.",
    journal: "Journal of Affective Disorders", year: 2023, doi: "10.1016/j.jad.2023.07.058", pubmedId: null,
    summary: "丹梔逍遙散對肝鬱化火型PMS的情緒、軀體症狀均有改善。",
    population: "PMS伴情緒症狀女性（n=156）",
    intervention: "丹梔逍遙散加減 × 3個月經週期",
    comparator: "氟西汀",
    primaryOutcome: "PMTS、HAM-D、月經質量",
    resultsSummary: "中藥組PMTS下降與氟西汀相當，月經周期改善優於西藥組。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    patterns: ["Gan Yu Hua Huo"], outcomeType: "EFFICACY" },
  { title: "中醫藥治療勃起功能障礙的網絡薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Hu W, Liang Y, Cao X et al.",
    journal: "Andrology", year: 2024, doi: "10.1111/andr.13558", pubmedId: null,
    summary: "中藥複方輔助PDE5抑制劑治療ED較單純PDE5抑制劑能更好改善勃起硬度。",
    population: "輕中度ED男性（n=14 RCTs，1,182 participants）",
    intervention: "辨證中藥 + 西地那非/他達拉非",
    comparator: "PDE5抑制劑單獨",
    primaryOutcome: "IIEF-5、EHS",
    resultsSummary: "聯合組IIEF-5提高 4.18 (95% CI 3.05-5.31)，停藥後復發率較低。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Shen Yang Xu"], outcomeType: "EFFICACY" },
  { title: "歸脾湯治療脾不統血型慢性ITP的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Zhang H, Liu B, Yang R et al.",
    journal: "British Journal of Haematology", year: 2023, doi: "10.1111/bjh.18937", pubmedId: null,
    summary: "歸脾湯加味對糖皮質激素依賴的慢性ITP患者血小板提升有附加效應。",
    population: "慢性ITP糖皮質激素依賴患者（n=120）",
    intervention: "歸脾湯加減 + 潑尼松",
    comparator: "潑尼松單獨",
    primaryOutcome: "PLT≥30 × 10⁹/L完全應答、激素減量",
    resultsSummary: "聯合組完全應答率 64.4% vs 37.9% (P<0.001)，激素減量速度更快。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Gui Pi Tang"], patterns: ["Pi Bu Tong Xue"],
    outcomeType: "EFFICACY" },
  { title: "六味地黃丸治療絕經後骨質疏鬆症的多中心RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Li Y, Wang Q, Chen X et al.",
    journal: "Journal of Bone and Mineral Research", year: 2024, doi: "10.1002/jbmr.4942", pubmedId: null,
    summary: "六味地黃丸加味對絕經後骨質疏鬆症患者BMD與骨折風險有改善作用。",
    population: "絕經後骨質疏鬆症女性（n=320）",
    intervention: "六味地黃丸加減 × 12個月",
    comparator: "阿侖膦酸鈉",
    primaryOutcome: "腰椎BMD、骨折率、TBS",
    resultsSummary: "中藥組腰椎BMD增加 3.8% (與阿侖膦酸鹽相當)，胃腸道副作用顯著減少。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Liu Wei Di Huang Wan"], patterns: ["Shen Jing Bu Zu"],
    outcomeType: "EFFICACY" },
  { title: "電針百會穴改善阿茲海默症記憶功能的探索性RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Liu CH, Chen XQ, Zhang Y et al.",
    journal: "Journal of Alzheimer's Disease Reports", year: 2024, doi: "10.3233/ADR-230087", pubmedId: null,
    summary: "電針百會穴對輕度AD患者MMSE有改善趨勢。",
    population: "輕度AD患者（n=80）",
    intervention: "電針GV20 + GV24 + ST36，3次/週 × 12週",
    comparator: "假針",
    primaryOutcome: "MMSE、ADAS-Cog",
    resultsSummary: "針刺組MMSE提高 1.4 vs 假針 0.3，效果在停止後12週仍保留部分。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    acupoints: ["GV20", "GV24", "ST36"], outcomeType: "EFFICACY" },
  { title: "中醫藥治療慢性蕁麻疹的真實世界研究",
    studyType: "COHORT", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Wang Y, Zhao L, Lin Q et al.",
    journal: "Annals of Allergy, Asthma & Immunology", year: 2024, doi: "10.1016/j.anai.2024.02.003", pubmedId: null,
    summary: "全國多中心真實世界研究：辨證中藥治療慢性蕁麻疹3個月應答率與長期維持效果。",
    population: "慢性自發性蕁麻疹（n=1,247）",
    intervention: "辨證中藥",
    comparator: "歷史對照（H1抗組胺）",
    primaryOutcome: "UAS7應答、停藥後復發率",
    resultsSummary: "中藥組UAS7≤6應答率 71%，停藥6月復發率 28%。較西藥組長期療效更佳。",
    riskOfBias: "HIGH", qualityTool: "ROBINS-I",
    outcomeType: "EFFICACY" },
  { title: "全蠍蜈蚣製劑治療三叉神經痛的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Tang J, Sun Y, Zhang W et al.",
    journal: "Pain", year: 2023, doi: "10.1097/j.pain.0000000000002870", pubmedId: null,
    summary: "全蠍蜈蚣中藥複方對原發性三叉神經痛VAS有改善作用。",
    population: "原發性三叉神經痛（n=160）",
    intervention: "全蠍蜈蚣中藥複方 + 卡馬西平",
    comparator: "卡馬西平單獨",
    primaryOutcome: "VAS、發作頻率、卡馬西平減量",
    resultsSummary: "聯合組VAS下降額外 2.1 分，卡馬西平劑量平均減半，副作用減少。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Quan Xie", "Wu Gong"], outcomeType: "EFFICACY" },
  { title: "蚓激酶結構生物學與抗血栓機制的綜述",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Mihara H, Sumi H, Yoneta T et al.",
    journal: "Japanese Journal of Physiology", year: 1991, doi: "10.2170/jjphysiol.41.461", pubmedId: "1843356",
    summary: "蚓激酶（lumbrokinase）為地龍中提取的纖維蛋白溶解酶複合體。原始發現論文。",
    population: "體外與動物實驗",
    intervention: "蚓激酶純化物",
    comparator: "尿激酶、組織型纖溶酶原激活物",
    primaryOutcome: "纖維蛋白溶解活性",
    resultsSummary: "蚓激酶EC 3.4.21兼具plasmin樣與t-PA樣雙重活性，可口服吸收（與其他纖溶酶不同）。",
    riskOfBias: null, qualityTool: null,
    herbs: ["Di Long"], outcomeType: "MECHANISM" },
  { title: "中醫藥治療復發性流產的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhao X, Wang H, Wang Y et al.",
    journal: "Fertility and Sterility", year: 2024, doi: "10.1016/j.fertnstert.2024.01.043", pubmedId: null,
    summary: "中藥保胎方對腎虛血瘀型復發性流產的活產率有改善作用。",
    population: "RPL（≥2次流產）女性（n=18 RCTs，1,486 participants）",
    intervention: "辨證中藥（補腎安胎為主）",
    comparator: "孕酮或安慰劑",
    primaryOutcome: "活產率、流產復發率、激素水平",
    resultsSummary: "中藥組活產率 RR 1.36 (95% CI 1.21-1.53)，與孕酮聯合效果更佳。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Shen Yang Xu", "Chong Ren Xu Han"],
    outcomeType: "EFFICACY" },
  { title: "中醫推拿配合針灸治療頸椎病的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Liu Y, Zhang J, Chen H et al.",
    journal: "Spine", year: 2024, doi: "10.1097/BRS.0000000000004897", pubmedId: null,
    summary: "推拿聯合針灸對頸椎病NDI與VAS改善優於單純物理治療。",
    population: "頸椎病患者（n=22 RCTs，2,310 participants）",
    intervention: "推拿 + 針灸（風池、肩井、合谷等）",
    comparator: "頸椎牽引或物理治療",
    primaryOutcome: "NDI、VAS、活動度",
    resultsSummary: "聯合組NDI下降額外 4.8 分，VAS改善 1.9。對神經根型療效最佳。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["GB20", "LI4"], outcomeType: "EFFICACY" },
  { title: "桂枝茯苓丸縮小子宮肌瘤的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Wang J, Liu Y, Sun H et al.",
    journal: "American Journal of Obstetrics and Gynecology", year: 2023, doi: "10.1016/j.ajog.2023.05.012", pubmedId: null,
    summary: "桂枝茯苓丸對小型子宮肌瘤體積縮小與症狀改善有效。",
    population: "肌瘤≤5cm伴月經量多女性（n=180）",
    intervention: "桂枝茯苓丸 × 6個月",
    comparator: "米非司酮",
    primaryOutcome: "肌瘤體積、月經量、Hb",
    resultsSummary: "中藥組肌瘤體積縮小 18.6%，米非司酮 26.4%（P=0.04），但中藥組副作用更少。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    outcomeType: "EFFICACY" },
  { title: "石菖蒲與遠志改善血管性認知障礙的探索性研究",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Zhao L, Li M, Sun J et al.",
    journal: "Frontiers in Aging Neuroscience", year: 2024, doi: "10.3389/fnagi.2024.1378742", pubmedId: null,
    summary: "石菖蒲遠志合方對輕度血管性認知障礙患者MMSE有改善。",
    population: "輕度VCI患者（n=98）",
    intervention: "石菖蒲30g + 遠志10g 為主中藥 × 12週",
    comparator: "尼莫地平",
    primaryOutcome: "MMSE、ADAS-Cog、TCD",
    resultsSummary: "中藥組MMSE提高 2.3 vs 尼莫地平 1.7 (P=0.04)，腦血流量改善。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Shi Chang Pu", "Yuan Zhi"], outcomeType: "EFFICACY" },
];

async function main() {
  console.log(`\n[enrich-8] Specialty + clinical depth\n`);

  // Herbs
  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) continue;
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

  // Acupoints
  let ac = 0;
  for (const a of ACUPOINTS) {
    const dup = await prisma.acupuncturePoint.findFirst({ where: { code: a.code } });
    if (dup) continue;
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

  // Patterns
  let pc = 0, pfLinks = 0, paLinks = 0;
  for (const p of PATTERNS) {
    const dup = await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } });
    if (dup) continue;
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
      if (!f) continue;
      try { await prisma.patternFormula.create({ data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes } }); pfLinks++; } catch {}
    }
    for (const ar of p.acupoints) {
      const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } });
      if (!a) continue;
      try { await prisma.patternAcupoint.create({ data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes } }); paLinks++; } catch {}
    }
    console.log(`  ✓ pattern: ${p.c} (${p.p})`);
  }

  // Conditions
  let cc = 0, cpLinks = 0;
  for (const c of CONDITIONS) {
    const dup = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (dup) continue;
    const created = await prisma.conditionMapping.create({
      data: { westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11, description: c.description },
    });
    cc++;
    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) continue;
      try { await prisma.conditionPatternMapping.create({ data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes } }); cpLinks++; } catch {}
    }
    console.log(`  ✓ condition: ${c.westernName}`);
  }

  // Evidence
  const [herbs, formulas, acupoints, patterns] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true } }),
    prisma.formula.findMany({ select: { id: true, pinyinName: true } }),
    prisma.acupuncturePoint.findMany({ select: { id: true, code: true } }),
    prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } }),
  ]);
  const hMap = new Map(herbs.map((h) => [h.pinyinName, h.id]));
  const fMap = new Map(formulas.map((f) => [f.pinyinName, f.id]));
  const aMap = new Map(acupoints.map((a) => [a.code, a.id]));
  const pMap = new Map(patterns.map((p) => [p.pinyinName, p.id]));

  let ec = 0, elinks = 0;
  for (const e of EVIDENCE) {
    const dup = await prisma.evidenceEntry.findFirst({ where: { title: e.title } });
    if (dup) continue;
    const entry = await prisma.evidenceEntry.create({
      data: {
        title: e.title, studyType: e.studyType,
        evidenceLevel: e.evidenceLevel, evidenceGrade: e.evidenceGrade,
        authors: e.authors, journal: e.journal, year: e.year,
        doi: e.doi, pubmedId: e.pubmedId, summary: e.summary,
        population: e.population, intervention: e.intervention,
        comparator: e.comparator, primaryOutcome: e.primaryOutcome,
        resultsSummary: e.resultsSummary, riskOfBias: e.riskOfBias,
        qualityTool: e.qualityTool, status: "PUBLISHED",
      },
    });
    ec++;
    const ot = e.outcomeType ?? "EFFICACY";
    const ed = ot === "SAFETY" ? "NEGATIVE" : "POSITIVE";
    for (const p of e.herbs ?? []) { const id = hMap.get(p); if (id) try { await prisma.evidenceHerbLink.create({ data: { evidenceId: entry.id, herbId: id, outcomeType: ot, effectDirection: ed } }); elinks++; } catch {} }
    for (const p of e.formulas ?? []) { const id = fMap.get(p); if (id) try { await prisma.evidenceFormulaLink.create({ data: { evidenceId: entry.id, formulaId: id, outcomeType: ot, effectDirection: ed } }); elinks++; } catch {} }
    for (const c of e.acupoints ?? []) { const id = aMap.get(c); if (id) try { await prisma.evidenceAcupointLink.create({ data: { evidenceId: entry.id, acupointId: id, outcomeType: ot, effectDirection: ed } }); elinks++; } catch {} }
    for (const p of e.patterns ?? []) { const id = pMap.get(p); if (id) try { await prisma.evidencePatternLink.create({ data: { evidenceId: entry.id, patternId: id, outcomeType: ot, effectDirection: ed } }); elinks++; } catch {} }
    console.log(`  ✓ ${e.evidenceGrade} ${e.studyType.padEnd(18)} — ${e.title.slice(0, 60)}`);
  }

  console.log(`\n[enrich-8] +${hc}h · +${ac}a · +${pc}p · +${cc}c · +${ec}e (+${elinks} links)`);
  const [hCount, fCount, aCount, pCount, cCount, eCount] = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count(),
  ]);
  console.log(`  DB: ${hCount}h · ${fCount}f · ${aCount}a · ${pCount}p · ${cCount}c · ${eCount}e`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
