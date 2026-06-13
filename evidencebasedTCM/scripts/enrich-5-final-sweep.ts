/**
 * Content enrichment #5 — final comprehensive sweep.
 *
 * Adds:
 *   • ~22 herbs filling sparse categories (Heat Clearing, Phlegm Resolving,
 *     Qi Regulating, Purgatives, Wind Extinguishing, etc.)
 *   • ~14 classical formulas (玉屏風散, 小青龍湯, 炙甘草湯, 二妙散 etc.)
 *   • 5 patterns (肺氣虛兼陽虛, 腎精不足, 肝火上炎, 脾陽虛, 心火亢盛)
 *   • 5 conditions (慢性蕁麻疹細分, 失眠 alt, 焦慮症, 慢性咽炎, 子宮內膜異位症)
 *   • 5 patent medicines (板藍根顆粒, 銀翹解毒丸, 牛黃解毒片, 連花清瘟膠囊, 麝香保心丸)
 *
 * Idempotent.
 *
 * Run: npx tsx scripts/enrich-5-final-sweep.ts
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
  // ── Heat Clearing additions ────────────────────────────────────
  { p: "Huang Bai", c: "黃柏", lat: "Phellodendron chinense", eng: "Phellodendron Bark",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter"],
    merid: ["Kidney", "Bladder"], dose: "3-12g",
    desc: "清熱燥濕，瀉火除蒸，解毒療瘡。用於濕熱瀉痢、黃疸尿赤、帶下陰癢、熱淋澀痛、腳氣痿躄、骨蒸勞熱、盜汗遺精、瘡瘍腫毒、濕疹濕瘡。善清下焦濕熱。",
    pharm: "含小檗鹼、黃柏鹼、藥根鹼。具有抗菌、抗病毒、降血糖、降血壓、抗腫瘤、抗炎作用。" },
  { p: "Ku Shen", c: "苦參", lat: "Sophora flavescens", eng: "Sophora Root",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter"],
    merid: ["Heart", "Liver", "Stomach", "Large Intestine", "Bladder"], dose: "4.5-9g",
    desc: "清熱燥濕，殺蟲，利尿。用於熱痢、便血、黃疸尿閉、赤白帶下、陰腫陰癢、濕疹濕瘡、皮膚瘙癢、疥癬麻風；外治滴蟲性陰道炎。",
    pharm: "含苦參鹼、氧化苦參鹼。具有抗心律失常、抗腫瘤、抗炎、免疫調節、抗病毒（HBV）、保肝作用。已開發為苦參素注射液。" },
  { p: "Ban Lan Gen", c: "板藍根", lat: "Isatis indigotica", eng: "Isatis Root",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter"],
    merid: ["Heart", "Stomach"], dose: "9-15g",
    desc: "清熱解毒，涼血利咽。用於溫疫時毒、發熱咽痛、溫毒發斑、痄腮、爛喉丹痧、大頭瘟疫、丹毒、癰腫。為流感、咽炎常用要藥。",
    pharm: "含靛玉紅、表告依春、芥子苷。具有抗病毒（流感、SARS、HBV）、抗菌、抗內毒素、增強免疫作用。COVID-19中藥治療常用。" },
  { p: "Pu Gong Ying", c: "蒲公英", lat: "Taraxacum mongolicum", eng: "Dandelion",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter", "Sweet"],
    merid: ["Liver", "Stomach"], dose: "9-15g",
    desc: "清熱解毒，消腫散結，利尿通淋。用於疔瘡腫毒、乳癰、瘰癧、目赤、咽痛、肺癰、腸癰、濕熱黃疸、熱淋澀痛。為治乳癰要藥，藥食兩用。",
    pharm: "含蒲公英醇、蒲公英賽醇、菊糖、膽鹼。具有抗菌（廣譜）、保肝利膽、抗腫瘤、利尿、催乳作用。" },
  { p: "Bai Tou Weng", c: "白頭翁", lat: "Pulsatilla chinensis", eng: "Chinese Pulsatilla Root",
    cat: "Heat Clearing", nat: "COLD", flav: ["Bitter"],
    merid: ["Stomach", "Large Intestine"], dose: "9-15g",
    desc: "清熱解毒，涼血止痢。用於熱毒血痢、陰癢帶下、阿米巴痢疾。白頭翁湯主藥。",
    pharm: "含白頭翁皂苷、原白頭翁素。具有抗阿米巴、抗陰道毛滴蟲、抗菌、抗腫瘤作用。" },

  // ── Phlegm Resolving additions ─────────────────────────────────
  { p: "Zhe Bei Mu", c: "浙貝母", lat: "Fritillaria thunbergii", eng: "Zhejiang Fritillaria",
    cat: "Phlegm Resolving", nat: "COLD", flav: ["Bitter"],
    merid: ["Lung", "Heart"], dose: "5-10g",
    desc: "清熱化痰，散結消癰。用於風熱、痰熱咳嗽、肺癰吐膿、瘰癧、癭瘤、瘡瘍腫毒。與川貝相對：浙貝清熱力強、川貝潤肺力強。",
    pharm: "含浙貝甲素、乙素。具有鎮咳、祛痰、平喘、降壓、抗潰瘍作用。" },
  { p: "Gua Lou", c: "瓜蔞", lat: "Trichosanthes kirilowii", eng: "Snake Gourd Fruit",
    cat: "Phlegm Resolving", nat: "COLD", flav: ["Sweet", "Bitter"],
    merid: ["Lung", "Stomach", "Large Intestine"], dose: "9-15g",
    desc: "清熱化痰，寬胸散結，潤腸通便。用於肺熱咳嗽、痰濁黃稠、胸痺心痛、結胸痞滿、乳癰、肺癰、腸癰腫痛、大便秘結。",
    pharm: "含瓜蔞籽脂肪油、皂苷、氨基酸。具有擴張冠脈、抗血小板、降血脂、潤腸通便、抗腫瘤作用。" },
  { p: "Tian Nan Xing", c: "天南星", lat: "Arisaema heterophyllum (processed)", eng: "Arisaema Rhizome (processed)",
    cat: "Phlegm Resolving", nat: "WARM", flav: ["Bitter", "Pungent"],
    merid: ["Lung", "Liver", "Spleen"], dose: "3-9g",
    desc: "燥濕化痰，祛風止痙，散結消腫。用於頑痰咳嗽、風痰眩暈、中風口眼歪斜、半身不遂、癲癇、驚風、破傷風；外治癰腫、蛇蟲咬傷。生品有毒，內服宜製用。",
    pharm: "含三萜皂苷、生物鹼。具有祛痰、鎮靜、抗驚厥、抗腫瘤作用。" },

  // ── Qi Regulating additions ────────────────────────────────────
  { p: "Chen Pi", c: "陳皮", lat: "Citrus reticulata (aged peel)", eng: "Aged Tangerine Peel",
    cat: "Qi Regulating", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Lung", "Spleen"], dose: "3-10g",
    desc: "理氣健脾，燥濕化痰。用於脘腹脹滿、食少吐瀉、咳嗽痰多。為理氣健脾常用藥，越陳越好（六陳之一）。二陳湯主藥。",
    pharm: "含揮發油（檸檬烯）、橙皮苷、川陳皮素。具有調節胃腸蠕動、祛痰平喘、抗炎、抗氧化、抗血栓作用。" },
  { p: "Mu Xiang", c: "木香", lat: "Aucklandia lappa", eng: "Costus Root",
    cat: "Qi Regulating", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Spleen", "Stomach", "Large Intestine", "Triple Energizer", "Gallbladder"], dose: "1.5-6g",
    desc: "行氣止痛，健脾消食。用於胸脘脹痛、瀉痢後重、食積不消、不思飲食。後下宜小量。",
    pharm: "含木香烴內酯、二氫木香烴內酯。具有調節胃腸運動、抗潰瘍、利膽、抗菌作用。" },
  { p: "Xiang Fu", c: "香附", lat: "Cyperus rotundus", eng: "Nutgrass Rhizome",
    cat: "Qi Regulating", nat: "NEUTRAL", flav: ["Pungent", "Slightly Bitter", "Slightly Sweet"],
    merid: ["Liver", "Spleen", "Triple Energizer"], dose: "6-10g",
    desc: "疏肝解鬱，理氣寬中，調經止痛。用於肝鬱氣滯、胸脅脹痛、疝氣疼痛、月經不調、經閉痛經、寒凝氣滯、脘腹脹痛。為「氣病之總司，女科之主帥」。",
    pharm: "含揮發油（α-香附酮）、生物鹼、黃酮。具有解痙、抗炎、雌激素樣作用、鎮痛、抗抑鬱作用。" },

  // ── Wind Extinguishing additions ───────────────────────────────
  { p: "Tian Ma", c: "天麻", lat: "Gastrodia elata", eng: "Gastrodia Rhizome",
    cat: "Wind Extinguishing", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Liver"], dose: "3-10g",
    desc: "息風止痙，平抑肝陽，祛風通絡。用於小兒驚風、癲癇抽搐、破傷風、頭痛眩暈、手足不遂、肢體麻木、風濕痺痛。為治眩暈頭痛要藥。",
    pharm: "含天麻素、天麻苷元。具有鎮靜、抗驚厥、抗眩暈、保護腦神經、改善記憶、抗心律失常作用。" },
  { p: "Gou Teng", c: "鉤藤", lat: "Uncaria rhynchophylla", eng: "Gambir Vine Stem",
    cat: "Wind Extinguishing", nat: "COOL", flav: ["Sweet"],
    merid: ["Liver", "Pericardium"], dose: "3-12g (後下)",
    desc: "息風定驚，清熱平肝。用於肝風內動、驚癇抽搐、高熱驚厥、感冒夾驚、頭痛眩暈、肝陽上亢之頭脹頭痛、目赤。後下，不宜久煎。",
    pharm: "含鉤藤鹼、異鉤藤鹼。具有降血壓、鎮靜、抗驚厥、保護腦神經、抗血小板聚集作用。" },

  // ── Spirit Calming additions ───────────────────────────────────
  { p: "Bai Zi Ren", c: "柏子仁", lat: "Platycladus orientalis (seed)", eng: "Arborvitae Seed",
    cat: "Spirit Calming", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Heart", "Kidney", "Large Intestine"], dose: "3-10g",
    desc: "養心安神，潤腸通便，止汗。用於陰血不足、虛煩失眠、心悸怔忡、腸燥便秘、陰虛盜汗。性質平和，補心而不燥。",
    pharm: "含脂肪油、皂苷、揮發油。具有鎮靜安神、潤腸、改善睡眠作用。" },
  { p: "Yuan Zhi", c: "遠志", lat: "Polygala tenuifolia", eng: "Polygala Root",
    cat: "Spirit Calming", nat: "WARM", flav: ["Bitter", "Pungent"],
    merid: ["Heart", "Kidney", "Lung"], dose: "3-10g",
    desc: "安神益智，交通心腎，祛痰開竅，消散癰腫。用於心腎不交所致失眠多夢、健忘驚悸、神志恍惚、咳痰不爽、瘡瘍腫毒、乳房腫痛。",
    pharm: "含遠志皂苷、遠志酮。具有鎮靜催眠、抗痴呆、增強記憶、祛痰、抗驚厥作用。" },

  // ── Blood Activating additions ─────────────────────────────────
  { p: "E Zhu", c: "莪朮", lat: "Curcuma zedoaria", eng: "Zedoary Rhizome",
    cat: "Blood Activating", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Liver", "Spleen"], dose: "6-9g",
    desc: "破血行氣，消積止痛。用於癥瘕痞塊、瘀血經閉、食積脹痛；早期宮頸癌。常與三棱相須為用。",
    pharm: "含莪朮醇、莪朮酮。具有抗腫瘤（特別宮頸癌、肝癌）、抗血栓、抗炎、增強免疫作用。" },
  { p: "San Leng", c: "三棱", lat: "Sparganium stoloniferum", eng: "Bur-reed Rhizome",
    cat: "Blood Activating", nat: "NEUTRAL", flav: ["Bitter", "Pungent"],
    merid: ["Liver", "Spleen"], dose: "5-10g",
    desc: "破血行氣，消積止痛。用於癥瘕痞塊、瘀血經閉、痛經、食積脹痛。常與莪朮配伍。孕婦禁用。",
    pharm: "含揮發油、有機酸、黃酮。具有抗血小板聚集、抗血栓、抗腫瘤作用。" },

  // ── Wind-Dampness Expelling additions ──────────────────────────
  { p: "Wu Jia Pi", c: "五加皮", lat: "Eleutherococcus gracilistylus", eng: "Acanthopanax Bark",
    cat: "Wind-Dampness Expelling", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Liver", "Kidney"], dose: "5-10g",
    desc: "祛風除濕，補益肝腎，強筋骨，利水消腫。用於風濕痺痛、筋骨痿軟、小兒行遲、體虛乏力、水腫、腳氣。",
    pharm: "含丁香苷、刺五加苷。具有適應原樣作用、抗疲勞、抗炎、抗腫瘤作用。" },

  // ── Exterior Releasing additions ───────────────────────────────
  { p: "Fang Feng", c: "防風", lat: "Saposhnikovia divaricata", eng: "Siler Root",
    cat: "Exterior Releasing", nat: "WARM", flav: ["Pungent", "Sweet"],
    merid: ["Bladder", "Liver", "Spleen"], dose: "5-10g",
    desc: "祛風解表，勝濕止痛，止痙。用於感冒頭痛、風濕痺痛、風疹瘙癢、破傷風。為治風通用藥。玉屏風散主藥。",
    pharm: "含色原酮、香豆素。具有解熱、鎮痛、抗炎、抗過敏、增強免疫作用。" },
  { p: "Xin Yi", c: "辛夷", lat: "Magnolia biondii (flower bud)", eng: "Magnolia Flower Bud",
    cat: "Exterior Releasing", nat: "WARM", flav: ["Pungent"],
    merid: ["Lung", "Stomach"], dose: "3-10g (布包)",
    desc: "散風寒，通鼻竅。用於風寒頭痛、鼻塞鼻淵、鼻流濁涕。為治鼻淵頭痛要藥，外用內服皆可。",
    pharm: "含揮發油（桉葉素、檸檬烯）。具有抗過敏、抗炎、收縮鼻黏膜血管作用。" },

  // ── Dampness Draining additions ────────────────────────────────
  { p: "Bian Xu", c: "萹蓄", lat: "Polygonum aviculare", eng: "Common Knotgrass",
    cat: "Dampness Draining", nat: "COOL", flav: ["Bitter"],
    merid: ["Bladder"], dose: "9-15g",
    desc: "利尿通淋，殺蟲止癢。用於膀胱濕熱、淋瀝澀痛、尿血、蟲積腹痛、皮膚濕疹陰癢。",
    pharm: "含黃酮苷、糖類。具有利尿、降壓、止血、抗菌作用。" },

  // ── Yin Tonifying additions ────────────────────────────────────
  { p: "Tian Dong", c: "天冬", lat: "Asparagus cochinchinensis", eng: "Asparagus Tuber",
    cat: "Yin Tonifying", nat: "COLD", flav: ["Sweet", "Bitter"],
    merid: ["Lung", "Kidney"], dose: "6-12g",
    desc: "養陰潤燥，清肺生津。用於肺燥乾咳、虛勞咳嗽、津傷口渴、心煩失眠、內熱消渴、熱病津傷、咽乾口渴、腸燥便秘。",
    pharm: "含天冬皂苷、菝葜皂苷。具有抗腫瘤、止咳、抗氧化、增強免疫作用。" },
];

interface FH { pinyin: string; role: "JUN" | "CHEN" | "ZUO" | "SHI"; dose?: string; notes?: string }
interface F {
  p: string; c: string; eng: string; src: string; cat: string;
  actions: string; indications: string; modifications?: string;
  herbs: FH[];
}

const FORMULAS: F[] = [
  { p: "Yu Ping Feng San", c: "玉屏風散", eng: "Jade Windscreen Powder",
    src: "醫方類聚", cat: "Qi Tonifying",
    actions: "益氣固表止汗",
    indications: "表虛自汗、易感風邪。面色㿠白、體弱、易感冒。為防治反復呼吸道感染要方。",
    modifications: "陰虛盜汗加生地、五味子；氣虛甚加人參；過敏性鼻炎加辛夷、蒼耳子。",
    herbs: [
      { pinyin: "Huang Qi", role: "JUN", dose: "12-30g" },
      { pinyin: "Bai Zhu", role: "CHEN", dose: "9-12g" },
      { pinyin: "Fang Feng", role: "ZUO", dose: "6-9g" },
    ] },
  { p: "Xiao Qing Long Tang", c: "小青龍湯", eng: "Minor Bluegreen Dragon Decoction",
    src: "傷寒論", cat: "Exterior Releasing (Wind-Cold)",
    actions: "解表散寒，溫肺化飲",
    indications: "外寒裡飲證。惡寒發熱、無汗、咳喘、痰多稀白、胸悶、苔白滑。為慢性支氣管炎、哮喘急性發作常用方。",
    modifications: "兼熱化加石膏；表證已解內飲未盡用苓甘五味薑辛湯。",
    herbs: [
      { pinyin: "Ma Huang", role: "JUN", dose: "9g" },
      { pinyin: "Gui Zhi", role: "JUN", dose: "9g" },
      { pinyin: "Xi Xin", role: "CHEN", dose: "3g" },
      { pinyin: "Gan Jiang", role: "CHEN", dose: "9g" },
      { pinyin: "Wu Wei Zi", role: "ZUO", dose: "9g" },
      { pinyin: "Bai Shao", role: "ZUO", dose: "9g" },
      { pinyin: "Ban Xia", role: "ZUO", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "9g" },
    ] },
  { p: "Zhi Gan Cao Tang", c: "炙甘草湯", eng: "Honey-Fried Licorice Decoction (Restore the Pulse)",
    src: "傷寒論", cat: "Yin Tonifying",
    actions: "益氣滋陰，通陽復脈",
    indications: "氣虛血弱之心動悸、脈結代；虛勞肺痿之乾咳少痰、形瘦氣短、虛煩失眠、自汗盜汗、咽乾舌燥。為治心律失常名方。",
    modifications: "心氣陰兩虛之早搏可單用本方加減。",
    herbs: [
      { pinyin: "Gan Cao", role: "JUN", dose: "12g (炙)" },
      { pinyin: "Sheng Di Huang", role: "CHEN", dose: "30g" },
      { pinyin: "Mai Dong", role: "CHEN", dose: "9g" },
      { pinyin: "Ren Shen", role: "CHEN", dose: "6g" },
      { pinyin: "E Jiao", role: "CHEN", dose: "6g (烊化)" },
      { pinyin: "Gui Zhi", role: "ZUO", dose: "9g" },
      { pinyin: "Sheng Jiang", role: "ZUO", dose: "9g" },
      { pinyin: "Da Zao", role: "SHI", dose: "10 pieces" },
      { pinyin: "Huo Ma Ren", role: "ZUO", dose: "9g" },
    ] },
  { p: "Er Miao San", c: "二妙散", eng: "Two Marvels Powder",
    src: "丹溪心法", cat: "Heat Clearing",
    actions: "清熱燥濕",
    indications: "下焦濕熱之足膝紅腫疼痛、濕熱帶下、下部濕瘡、小便短赤。簡而力專，可加川牛膝為三妙、加薏苡仁為四妙。",
    herbs: [
      { pinyin: "Cang Zhu", role: "JUN", dose: "等份" },
      { pinyin: "Huang Bai", role: "CHEN", dose: "等份" },
    ] },
  { p: "Si Miao San", c: "四妙散", eng: "Four Marvels Powder",
    src: "成方便讀", cat: "Heat Clearing",
    actions: "清熱利濕，舒筋通絡",
    indications: "濕熱下注證。下肢痿軟無力、濕腳氣、足膝紅腫、筋骨疼痛。為痛風急性期常用方。",
    herbs: [
      { pinyin: "Cang Zhu", role: "JUN", dose: "9g" },
      { pinyin: "Huang Bai", role: "CHEN", dose: "9g" },
      { pinyin: "Niu Xi", role: "ZUO", dose: "9g" },
      { pinyin: "Yi Yi Ren", role: "ZUO", dose: "12g" },
    ] },
  { p: "Suan Zao Ren Tang", c: "酸棗仁湯", eng: "Sour Jujube Seed Decoction",
    src: "金匱要略", cat: "Spirit Calming",
    actions: "養血安神，清熱除煩",
    indications: "肝血不足、虛熱內擾證。失眠多夢、心悸盜汗、頭目眩暈、咽乾口燥。為失眠經方代表。",
    modifications: "陰虛甚加麥冬、生地；氣虛加黃芪。",
    herbs: [
      { pinyin: "Suan Zao Ren", role: "JUN", dose: "15-20g" },
      { pinyin: "Fu Ling", role: "CHEN", dose: "6g" },
      { pinyin: "Zhi Mu", role: "ZUO", dose: "6g" },
      { pinyin: "Chuan Xiong", role: "ZUO", dose: "3g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },
  { p: "Bai Hu Jia Ren Shen Tang", c: "白虎加人參湯", eng: "White Tiger plus Ginseng Decoction",
    src: "傷寒論", cat: "Heat Clearing",
    actions: "清熱益氣生津",
    indications: "氣分熱盛兼氣津兩傷證。汗多脈大、煩渴不解、舌乾燥；夏季中暑、糖尿病之煩渴多飲。",
    herbs: [
      { pinyin: "Shi Gao", role: "JUN", dose: "30g" },
      { pinyin: "Zhi Mu", role: "CHEN", dose: "9g" },
      { pinyin: "Ren Shen", role: "ZUO", dose: "6g" },
      { pinyin: "Geng Mi", role: "ZUO", dose: "9g" },
      { pinyin: "Gan Cao", role: "SHI", dose: "3g" },
    ] },
  { p: "Bu Fei Tang", c: "補肺湯", eng: "Tonify the Lung Decoction",
    src: "永類鈐方", cat: "Qi Tonifying",
    actions: "補益肺氣",
    indications: "肺氣虛證。咳喘短氣、語音低弱、痰稀色白、自汗畏風、易感冒。為慢支緩解期常用方。",
    herbs: [
      { pinyin: "Ren Shen", role: "JUN", dose: "9g" },
      { pinyin: "Huang Qi", role: "JUN", dose: "12g" },
      { pinyin: "Shu Di Huang", role: "CHEN", dose: "12g" },
      { pinyin: "Wu Wei Zi", role: "ZUO", dose: "6g" },
      { pinyin: "Sang Bai Pi", role: "ZUO", dose: "9g" },
      { pinyin: "Zi Wan", role: "ZUO", dose: "9g" },
    ] },
  { p: "Long Dan Xie Gan Wan", c: "龍膽瀉肝丸", eng: "Gentian Liver Drainage Pill",
    src: "成藥", cat: "Patent Medicine",
    actions: "清肝膽，利濕熱",
    indications: "肝膽濕熱、頭暈目赤、耳鳴耳聾、脅痛口苦、尿赤、濕熱帶下。為龍膽瀉肝湯丸劑。",
    modifications: "現代龍膽瀉肝丸已將關木通改為通草，馬兜鈴酸風險大幅降低。",
    herbs: [
      { pinyin: "Long Dan Cao", role: "JUN", dose: "—" },
      { pinyin: "Huang Qin", role: "CHEN", dose: "—" },
      { pinyin: "Zhi Zi", role: "CHEN", dose: "—" },
    ] },

  // ── Patent medicines ─────────────────────────────────────────
  { p: "Ban Lan Gen Ke Li", c: "板藍根顆粒", eng: "Banlangen Granules",
    src: "成藥", cat: "Patent Medicine",
    actions: "清熱解毒，涼血",
    indications: "肺胃熱盛之咽喉腫痛、口咽乾燥、急性扁桃體炎、流行性感冒早期。家庭常備。",
    modifications: "多用於流感和呼吸道感染預防，COVID-19大流行期間廣為使用。",
    herbs: [
      { pinyin: "Ban Lan Gen", role: "JUN", dose: "—" },
    ] },
  { p: "Yin Qiao Jie Du Wan", c: "銀翹解毒丸", eng: "Yinqiao Jiedu Pill",
    src: "成藥（基於銀翹散）", cat: "Patent Medicine",
    actions: "辛涼解表，清熱解毒",
    indications: "風熱感冒。發熱頭痛、咳嗽口乾、咽喉疼痛、目赤腫痛。為銀翹散之丸劑。",
    herbs: [
      { pinyin: "Lian Qiao", role: "JUN", dose: "—" },
      { pinyin: "Bo He", role: "CHEN", dose: "—" },
      { pinyin: "Jie Geng", role: "CHEN", dose: "—" },
    ] },
  { p: "Lian Hua Qing Wen Jiao Nang", c: "連花清瘟膠囊", eng: "Lianhua Qingwen Capsule",
    src: "石家莊以嶺藥業 / 國藥准字 Z20040063", cat: "Patent Medicine",
    actions: "清瘟解毒，宣肺泄熱",
    indications: "流行性感冒屬熱毒襲肺證。發熱、惡寒、肌肉酸痛、鼻塞、咽痛、咳嗽、頭痛；新冠病毒感染輕中型。",
    modifications: "Hu et al. 2021 multicenter RCT (Phytomedicine) — COVID-19 mild/moderate symptom recovery faster vs control. WHO list of TCM products for COVID-19.",
    herbs: [
      { pinyin: "Lian Qiao", role: "JUN", dose: "—" },
      { pinyin: "Jin Yin Hua (Ren Dong)", role: "JUN", dose: "—" },
      { pinyin: "Ma Huang", role: "CHEN", dose: "—" },
      { pinyin: "Ban Lan Gen", role: "ZUO", dose: "—" },
    ] },
  { p: "Niu Huang Jie Du Pian", c: "牛黃解毒片", eng: "Niuhuang Jiedu Tablet",
    src: "成藥", cat: "Patent Medicine",
    actions: "清熱解毒",
    indications: "火熱內盛之咽喉腫痛、牙齦腫痛、口舌生瘡、目赤腫痛。家庭常備。",
    modifications: "含雄黃（含砷）, 不宜長期或大量服用。腎功能不全慎用。",
    herbs: [
      { pinyin: "Huang Qin", role: "CHEN", dose: "—" },
      { pinyin: "Da Huang", role: "ZUO", dose: "—" },
      { pinyin: "Shi Gao", role: "ZUO", dose: "—" },
    ] },
  { p: "She Xiang Bao Xin Wan", c: "麝香保心丸", eng: "Shexiang Baoxin Pill",
    src: "上海和黃藥業 / 國藥准字 Z31020068", cat: "Patent Medicine",
    actions: "芳香溫通，益氣強心",
    indications: "氣滯血瘀型冠心病心絞痛；舌下含服可在數分鐘內緩解胸痛。為冠心病急救與長期治療常用藥。",
    modifications: "MUST-Trial 2018 (n=2,673)：聯合常規治療顯著降低主要心血管事件（HR 0.80, P=0.014）。",
    herbs: [
      { pinyin: "Ren Shen", role: "JUN", dose: "—" },
      { pinyin: "Su He Xiang", role: "CHEN", dose: "—" },
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
  { p: "Shen Jing Bu Zu", c: "腎精不足", eng: "Kidney Essence Insufficiency",
    organ: "腎", type: "DEFICIENCY",
    symptoms: "小兒生長發育遲緩、智力低下、囟門遲閉、骨骼痿軟；成人早衰、健忘、髮脫齒搖、腰膝酸軟、男子精少不育、女子經閉不孕。",
    tongue: "舌淡紅、苔少",
    pulse: "脈細弱",
    principle: "補腎填精",
    formulas: [
      { pinyin: "Liu Wei Di Huang Wan", primary: true, notes: "陰虛偏" },
      { pinyin: "You Gui Wan", primary: true, notes: "陽虛偏" },
      { pinyin: "Zuo Gui Wan", primary: false },
    ],
    acupoints: [
      { code: "BL23", method: "灸補法", notes: "腎俞" },
      { code: "CV4", method: "灸", notes: "關元 — 元氣之府" },
      { code: "CV6", method: "灸", notes: "氣海" },
      { code: "KI3", method: "補法", notes: "太溪" },
    ] },
  { p: "Gan Huo Shang Yan", c: "肝火上炎", eng: "Liver Fire Flaring Upward",
    organ: "肝", type: "HEAT",
    symptoms: "頭暈頭脹、面紅目赤、口苦口乾、急躁易怒、耳鳴如潮、脅肋灼痛、便秘溲赤、吐血衄血。",
    tongue: "舌紅、苔黃",
    pulse: "脈弦數有力",
    principle: "清肝瀉火",
    formulas: [
      { pinyin: "Long Dan Xie Gan Tang", primary: true },
      { pinyin: "Long Dan Xie Gan Wan", primary: false, notes: "丸劑替代" },
    ],
    acupoints: [
      { code: "LV2", method: "瀉法", notes: "行間 — 滎穴清火" },
      { code: "LV3", method: "瀉法", notes: "太衝" },
      { code: "GB20", method: "瀉法", notes: "風池" },
      { code: "BL18", method: "瀉法", notes: "肝俞" },
    ] },
  { p: "Pi Yang Xu", c: "脾陽虛", eng: "Spleen Yang Deficiency",
    organ: "脾", type: "YANG_DEFICIENCY",
    symptoms: "脘腹冷痛、得溫則減、食少便溏、完穀不化、四肢不溫、面色蒼白、形寒肢冷、女子白帶清稀；可發水腫。",
    tongue: "舌淡胖、苔白滑",
    pulse: "脈沉遲弱",
    principle: "溫補脾陽",
    formulas: [
      { pinyin: "Li Zhong Tang", primary: true },
      { pinyin: "Fu Zi Li Zhong Tang", primary: false, notes: "陽虛甚（如DB有）" },
    ],
    acupoints: [
      { code: "BL20", method: "灸", notes: "脾俞" },
      { code: "CV12", method: "灸", notes: "中脘" },
      { code: "ST36", method: "灸補法" },
      { code: "SP4", method: "補法", notes: "公孫" },
    ] },
  { p: "Xin Huo Kang Sheng", c: "心火亢盛", eng: "Heart Fire Hyperactivity",
    organ: "心", type: "HEAT",
    symptoms: "心煩不寐、口舌生瘡、面赤口渴、小便短赤灼痛、舌尖紅赤；甚則狂躁譫語、吐血衄血。",
    tongue: "舌尖紅、苔黃",
    pulse: "脈數",
    principle: "清心瀉火",
    formulas: [
      { pinyin: "Zhu Sha An Shen Wan", primary: true },
      { pinyin: "Dao Chi San", primary: false, notes: "心移熱小腸（如DB有）" },
    ],
    acupoints: [
      { code: "HT8", method: "瀉法", notes: "少府（如DB有）" },
      { code: "HT9", method: "點刺出血", notes: "少衝" },
      { code: "PC8", method: "瀉法", notes: "勞宮" },
      { code: "HT7", method: "平補平瀉", notes: "神門" },
    ] },
  { p: "Wei Yin Xu", c: "胃陰虛", eng: "Stomach Yin Deficiency",
    organ: "胃", type: "YIN_DEFICIENCY",
    symptoms: "胃脘隱隱灼痛、飢不欲食、口燥咽乾、大便乾結、乾嘔呃逆。",
    tongue: "舌紅少苔少津",
    pulse: "脈細數",
    principle: "養陰益胃生津",
    formulas: [
      { pinyin: "Mai Men Dong Tang", primary: true },
      { pinyin: "Yi Wei Tang", primary: false, notes: "胃陰虛專方（如DB有）" },
    ],
    acupoints: [
      { code: "ST36", method: "平補平瀉" },
      { code: "PC6", method: "平補平瀉", notes: "內關" },
      { code: "BL21", method: "平補平瀉", notes: "胃俞（如DB有）" },
      { code: "CV12", method: "平補平瀉", notes: "中脘" },
    ] },
];

interface Cnd {
  westernName: string; chineseName?: string;
  icd11: string; icd10: string;
  description: string;
  patterns: { pinyin: string; freq: Frequency; notes?: string }[];
}

const CONDITIONS: Cnd[] = [
  { westernName: "Generalized Anxiety Disorder", chineseName: "廣泛性焦慮障礙",
    icd11: "6B00", icd10: "F41.1",
    description: "Excessive anxiety and worry persisting >6 months. TCM: 鬱證/驚悸/不寐.",
    patterns: [
      { pinyin: "Xin Pi Liang Xu", freq: "COMMON", notes: "心脾兩虛型" },
      { pinyin: "Gan Qi Yu Jie", freq: "COMMON", notes: "肝鬱氣滯型" },
      { pinyin: "Xin Shen Bu Jiao", freq: "OCCASIONAL", notes: "心腎不交型" },
    ] },
  { westernName: "Chronic Pharyngitis", chineseName: "慢性咽炎",
    icd11: "CA02.1", icd10: "J31.2",
    description: "Persistent inflammation of pharyngeal mucosa. TCM: 喉痺/虛火喉痺.",
    patterns: [
      { pinyin: "Fei Yin Xu", freq: "COMMON", notes: "肺陰虛喉乾" },
      { pinyin: "Gan Huo Shang Yan", freq: "OCCASIONAL", notes: "肝火上炎" },
    ] },
  { westernName: "Endometriosis", chineseName: "子宮內膜異位症",
    icd11: "GA10", icd10: "N80",
    description: "Endometrial tissue outside uterus causing pain and infertility. TCM: 痛經/癥瘕.",
    patterns: [
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON" },
      { pinyin: "Chong Ren Bu Tiao", freq: "COMMON" },
      { pinyin: "Han Shi Kun Pi", freq: "OCCASIONAL", notes: "寒凝血瘀型" },
    ] },
  { westernName: "Gout", chineseName: "痛風",
    icd11: "FA25", icd10: "M10",
    description: "Monosodium urate crystal deposition causing acute arthritis. TCM: 痛風/痺證.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "急性期濕熱" },
      { pinyin: "Tan Shi Nei Zu", freq: "OCCASIONAL", notes: "痰濁阻絡" },
    ] },
  { westernName: "Hyperlipidemia", chineseName: "高脂血症",
    icd11: "5C80", icd10: "E78",
    description: "Elevated blood lipids; risk factor for atherosclerosis. TCM: 痰濁/血瘀.",
    patterns: [
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "痰濁阻滯" },
      { pinyin: "Pi Qi Xu", freq: "OCCASIONAL", notes: "脾虛運化失常" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL", notes: "兼血瘀" },
    ] },
];

async function main() {
  console.log(`\n[enrich-5] Final comprehensive sweep\n`);

  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) { continue; }
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
    console.log(`  ${preexisting ? "↻" : "✓"} formula: ${f.c} (${f.p}) [+${linked}h]`);
  }

  let pc = 0, pfLinks = 0, paLinks = 0;
  const missingFormulas = new Set<string>();
  const missingAcupoints = new Set<string>();
  for (const p of PATTERNS) {
    const dup = await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } });
    if (dup) { continue; }
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
    console.log(`  ✓ pattern: ${p.c} (${p.p})`);
  }

  let cc = 0, cpLinks = 0;
  for (const c of CONDITIONS) {
    const dup = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (dup) { continue; }
    const created = await prisma.conditionMapping.create({
      data: {
        westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11,
        description: c.description,
      },
    });
    cc++;
    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) continue;
      try {
        await prisma.conditionPatternMapping.create({
          data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes },
        });
        cpLinks++;
      } catch { /* dup */ }
    }
    console.log(`  ✓ condition: ${c.westernName}`);
  }

  console.log(`\n[enrich-5] +${hc} herbs · +${fc} formulas (${fhLinks}h) · +${pc} patterns · +${cc} conditions`);
  console.log(`           +${pfLinks} P→F · +${paLinks} P→A · +${cpLinks} C→P`);
  if (missingHerbs.size > 0) console.log(`  ⚠ Missing herbs: ${[...missingHerbs].sort().join(", ")}`);
  if (missingFormulas.size > 0) console.log(`  ⚠ Missing formulas: ${[...missingFormulas].sort().join(", ")}`);
  if (missingAcupoints.size > 0) console.log(`  ⚠ Missing acupoints: ${[...missingAcupoints].sort().join(", ")}`);

  const [hCount, fCount, aCount, pCount, cCount, eCount] = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count(),
  ]);
  console.log(`\n  DB: ${hCount} herbs · ${fCount} formulas · ${aCount} acupoints · ${pCount} patterns · ${cCount} conditions · ${eCount} evidence`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
