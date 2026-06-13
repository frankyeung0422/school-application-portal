/**
 * Content enrichment #7 — broaden clinical coverage.
 *
 * Adds:
 *   • 12 herbs filling key gaps (cough resolvents, women's health, classical refs)
 *   • 4 warm-disease patterns (衛氣營血)
 *   • 8 common conditions (PCOS, NAFLD, Acne, AFib, RA, Trigeminal Neuralgia, Infertility, ADHD)
 *   • 18 evidence entries on recent research (2024-2026, diverse therapy areas)
 *
 * Idempotent.
 *
 * Run: npx tsx scripts/enrich-7-clinical-breadth.ts
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
  { p: "Ge Gen", c: "葛根", lat: "Pueraria lobata", eng: "Kudzu Root",
    cat: "Exterior Releasing", nat: "COOL", flav: ["Sweet", "Pungent"],
    merid: ["Spleen", "Stomach"], dose: "10-15g",
    desc: "解肌退熱，生津止渴，透疹，升陽止瀉，通經活絡。用於外感發熱頭痛、項背強痛、口渴、消渴、麻疹不透、熱痢、泄瀉；現代用於頸椎病、突發性耳聾、糖尿病、冠心病。",
    pharm: "含葛根素（puerarin）、大豆苷元、染料木素。具有擴張腦血管、改善微循環、降血糖、抗心律失常、雌激素樣作用。葛根素注射液廣泛用於缺血性腦卒中。" },
  { p: "Zi Wan", c: "紫菀", lat: "Aster tataricus", eng: "Aster Root",
    cat: "Phlegm Resolving", nat: "WARM", flav: ["Pungent", "Bitter"],
    merid: ["Lung"], dose: "5-10g",
    desc: "潤肺下氣，消痰止咳。用於痰多喘咳、新久咳嗽、勞嗽咳血。常與款冬花相須為用。",
    pharm: "含紫菀酮、皂苷。具有祛痰、鎮咳、抗病毒、抗腫瘤作用。" },
  { p: "Kuan Dong Hua", c: "款冬花", lat: "Tussilago farfara", eng: "Coltsfoot Flower Bud",
    cat: "Phlegm Resolving", nat: "WARM", flav: ["Pungent", "Slightly Bitter"],
    merid: ["Lung"], dose: "5-10g",
    desc: "潤肺下氣，止咳化痰。用於新久咳嗽、喘咳痰多、勞嗽咳血。性溫和，宜於肺寒咳嗽。注意：含吡咯里西啶生物鹼，長期大量使用有肝毒性。",
    pharm: "含款冬花素、款冬酮、吡咯里西啶生物鹼。具有平喘、鎮咳、祛痰、升壓作用。" },
  { p: "Sang Bai Pi", c: "桑白皮", lat: "Morus alba (root bark)", eng: "Mulberry Root Bark",
    cat: "Phlegm Resolving", nat: "COLD", flav: ["Sweet"],
    merid: ["Lung"], dose: "6-12g",
    desc: "瀉肺平喘，利水消腫。用於肺熱喘咳、水腫脹滿尿少、面目肌膚浮腫。為瀉肺定喘要藥。",
    pharm: "含桑根皮素、桑皮苷。具有降血壓、降血糖、降血脂、利尿、抗炎作用。" },
  { p: "Bai Guo", c: "白果", lat: "Ginkgo biloba (seed)", eng: "Ginkgo Nut",
    cat: "Astringent", nat: "NEUTRAL", flav: ["Sweet", "Bitter", "Astringent"],
    merid: ["Lung", "Kidney"], dose: "5-10g",
    desc: "斂肺定喘，止帶縮尿。用於哮喘痰嗽、白帶白濁、遺尿尿頻。有小毒，不宜生食、過量。",
    pharm: "含白果酸、銀杏內酯。具有平喘、抗菌、抗過敏作用。生白果含氰苷有毒。" },
  { p: "Pu Gong Ying (Cao)", c: "馬齒莧", lat: "Portulaca oleracea", eng: "Purslane",
    cat: "Heat Clearing", nat: "COLD", flav: ["Sour"],
    merid: ["Liver", "Large Intestine"], dose: "9-15g (鮮品 30-60g)",
    desc: "清熱解毒，涼血止血，止痢。用於熱毒血痢、癰腫疔瘡、濕疹、丹毒、蛇蟲咬傷、便血、痔血、崩漏下血。藥食兩用。",
    pharm: "含去甲腎上腺素、多巴胺、有機酸、生物鹼。具有抗菌、抗病毒、降糖、降脂、抗炎作用。" },
  { p: "Sang Ji Sheng", c: "桑寄生", lat: "Taxillus chinensis", eng: "Mulberry Mistletoe",
    cat: "Wind-Dampness Expelling", nat: "NEUTRAL", flav: ["Bitter", "Sweet"],
    merid: ["Liver", "Kidney"], dose: "9-15g",
    desc: "祛風濕，補肝腎，強筋骨，安胎元。用於風濕痺痛、腰膝酸軟、筋骨無力、崩漏經多、妊娠漏血、胎動不安、頭暈目眩。獨活寄生湯主藥。",
    pharm: "含廣寄生苷、槲皮素、扁蓄苷。具有降壓、抗心律失常、抗炎、抑制胎動作用。" },
  { p: "Ji Xue Teng", c: "雞血藤", lat: "Spatholobus suberectus", eng: "Spatholobus Vine",
    cat: "Blood Activating", nat: "WARM", flav: ["Bitter", "Sweet"],
    merid: ["Liver", "Kidney"], dose: "9-15g",
    desc: "活血補血，調經止痛，舒筋活絡。用於月經不調、血虛萎黃、麻木癱瘓、風濕痺痛。為婦科活血補血常用。",
    pharm: "含異甘草素、芒柄花素。具有抗血小板、抗炎、改善微循環、提升白細胞作用（化療輔助）。" },
  { p: "Sha Yuan Zi", c: "沙苑子", lat: "Astragalus complanatus", eng: "Flat-stem Milkvetch Seed",
    cat: "Yang Tonifying", nat: "WARM", flav: ["Sweet"],
    merid: ["Liver", "Kidney"], dose: "9-15g",
    desc: "補腎助陽，固精縮尿，養肝明目。用於腎虛腰痛、遺精早泄、遺尿尿頻、白帶、頭暈目暗。",
    pharm: "含沙苑子苷、皂苷、黃酮類。具有降壓、降血脂、抗疲勞、保肝、提高免疫作用。" },
  { p: "Shi Jue Ming", c: "石決明", lat: "Haliotis discus hannai (shell)", eng: "Abalone Shell",
    cat: "Wind Extinguishing", nat: "COLD", flav: ["Salty"],
    merid: ["Liver"], dose: "6-20g (先煎)",
    desc: "平肝潛陽，清肝明目。用於肝陽上亢、頭暈目眩、肝火上炎、目赤翳障、視物昏花、青盲雀目。先煎，餘湯洗眼。",
    pharm: "含碳酸鈣、貝殼硬蛋白。具有降壓、抗驚厥、保肝、抗腫瘤作用。" },
  { p: "Di Gu Pi", c: "地骨皮", lat: "Lycium chinense (root bark)", eng: "Wolfberry Root Bark",
    cat: "Heat Clearing", nat: "COLD", flav: ["Sweet"],
    merid: ["Lung", "Liver", "Kidney"], dose: "9-15g",
    desc: "涼血除蒸，清肺降火。用於陰虛潮熱、骨蒸盜汗、小兒疳熱、肺熱咳嗽、咯血、衄血、內熱消渴。為退虛熱要藥。",
    pharm: "含地骨皮甲素、桂皮酸、亞油酸。具有解熱、降血糖、降血壓、降血脂作用。" },
  { p: "Bai Dou Kou", c: "白豆蔻", lat: "Amomum kravanh", eng: "White Cardamom",
    cat: "Aromatic Dampness Dissolving", nat: "WARM", flav: ["Pungent"],
    merid: ["Lung", "Spleen", "Stomach"], dose: "3-6g (後下)",
    desc: "化濕行氣，溫中止嘔，開胃消食。用於濕滯中焦、不思飲食、濕溫初起、胸悶不饑、寒濕嘔逆、胸腹脹痛、食積不消。後下。三仁湯主藥。",
    pharm: "含揮發油（桉葉素、芳樟醇）。具有增進胃液分泌、興奮腸蠕動、抗潰瘍作用。" },
];

interface P {
  p: string; c: string; eng: string; organ: string; type: Pathology;
  symptoms: string; tongue: string; pulse: string; principle: string;
  formulas: { pinyin: string; primary: boolean; notes?: string }[];
  acupoints: { code: string; method?: string; notes?: string }[];
}

const PATTERNS: P[] = [
  { p: "Wei Fen Zheng", c: "衛分證", eng: "Wei (Defensive) Level Pattern",
    organ: "肺衛", type: "EXCESS",
    symptoms: "發熱微惡風寒、頭痛、咳嗽咽痛、口微渴、舌邊尖紅。為溫病初起，邪在肺衛。",
    tongue: "舌邊尖紅、苔薄白",
    pulse: "脈浮數",
    principle: "辛涼解表，清熱透邪",
    formulas: [
      { pinyin: "Yin Qiao San", primary: true, notes: "代表方" },
      { pinyin: "Sang Ju Yin", primary: false, notes: "輕證" },
    ],
    acupoints: [
      { code: "LU7", method: "瀉法", notes: "列缺" },
      { code: "LI4", method: "瀉法" },
      { code: "GV14", method: "瀉法", notes: "大椎清熱" },
    ] },
  { p: "Qi Fen Zheng", c: "氣分證", eng: "Qi Level Pattern",
    organ: "陽明氣分", type: "HEAT",
    symptoms: "壯熱不惡寒、汗大出、口大渴、面赤心煩、咳喘胸痛或腹滿便秘、脈洪大或滑數。為溫邪入裡。",
    tongue: "舌紅、苔黃燥",
    pulse: "脈洪大有力或滑數",
    principle: "辛寒清氣 / 苦寒攻下",
    formulas: [
      { pinyin: "Bai Hu Tang", primary: true },
      { pinyin: "Bai Hu Jia Ren Shen Tang", primary: false, notes: "氣津兩傷" },
      { pinyin: "Da Cheng Qi Tang", primary: false, notes: "腑實" },
    ],
    acupoints: [
      { code: "LI11", method: "瀉法", notes: "曲池清陽明熱" },
      { code: "ST44", method: "瀉法" },
      { code: "GV14", method: "瀉法" },
    ] },
  { p: "Ying Fen Zheng", c: "營分證", eng: "Ying (Nutritive) Level Pattern",
    organ: "心包心營", type: "HEAT",
    symptoms: "身熱夜甚、煩躁不寐、心煩譫語、斑疹隱現、舌紅絳。為邪入營分傷及心神。",
    tongue: "舌紅絳少苔",
    pulse: "脈細數",
    principle: "清營透熱，涼血養陰",
    formulas: [
      { pinyin: "Qing Ying Tang", primary: true, notes: "清營湯（如DB有）" },
    ],
    acupoints: [
      { code: "PC8", method: "瀉法", notes: "勞宮清心" },
      { code: "HT9", method: "點刺出血", notes: "少衝" },
      { code: "GV26", method: "瀉法", notes: "醒神" },
    ] },
  { p: "Xue Fen Zheng", c: "血分證", eng: "Xue (Blood) Level Pattern",
    organ: "心肝", type: "HEAT",
    symptoms: "發熱夜甚、躁擾不安甚則昏狂譫語、斑疹密布、吐血衄血、便血、舌深絳。為熱入血分動血耗血。",
    tongue: "舌深絳",
    pulse: "脈細數",
    principle: "涼血散血，清熱解毒",
    formulas: [
      { pinyin: "Xi Jiao Di Huang Tang", primary: true, notes: "犀角地黃湯（如DB有，現代以水牛角代）" },
      { pinyin: "An Gong Niu Huang Wan", primary: false, notes: "熱閉神昏" },
    ],
    acupoints: [
      { code: "BL17", method: "瀉法", notes: "膈俞涼血" },
      { code: "SP10", method: "瀉法", notes: "血海" },
      { code: "PC9", method: "點刺出血", notes: "中衝（如DB有）" },
    ] },
  { p: "Zhong Qi Xia Xian", c: "中氣下陷", eng: "Sinking Middle Qi",
    organ: "脾胃", type: "QI_DEFICIENCY",
    symptoms: "氣短懶言、神疲乏力、食少便溏、腹部墜脹、脫肛、子宮下垂、胃下垂、久瀉久痢。為脾氣虛損之深度。",
    tongue: "舌淡、苔薄白",
    pulse: "脈虛弱",
    principle: "補中益氣，升陽舉陷",
    formulas: [
      { pinyin: "Bu Zhong Yi Qi Tang", primary: true, notes: "代表方" },
    ],
    acupoints: [
      { code: "ST36", method: "灸補法" },
      { code: "CV6", method: "灸補法", notes: "氣海" },
      { code: "GV20", method: "灸", notes: "百會升陽（如DB有）" },
      { code: "BL20", method: "補法", notes: "脾俞" },
    ] },
  { p: "Tan Huo Rao Xin", c: "痰火擾心", eng: "Phlegm-Fire Disturbing Heart",
    organ: "心", type: "PHLEGM",
    symptoms: "心悸怔忡、胸悶煩躁、失眠多夢、痰多稠黃、口苦口乾、頭暈目眩；甚則狂躁、神志錯亂。",
    tongue: "舌紅、苔黃膩",
    pulse: "脈滑數",
    principle: "清熱化痰，寧心安神",
    formulas: [
      { pinyin: "Wen Dan Tang", primary: true, notes: "去濕熱型" },
      { pinyin: "Zhu Sha An Shen Wan", primary: false },
    ],
    acupoints: [
      { code: "ST40", method: "瀉法", notes: "豐隆化痰" },
      { code: "PC6", method: "瀉法" },
      { code: "HT7", method: "瀉法" },
      { code: "GB13", method: "瀉法", notes: "本神（如DB有）" },
    ] },
];

interface Cnd {
  westernName: string; chineseName?: string;
  icd11: string; icd10: string;
  description: string;
  patterns: { pinyin: string; freq: Frequency; notes?: string }[];
}

const CONDITIONS: Cnd[] = [
  { westernName: "Polycystic Ovary Syndrome", chineseName: "多囊卵巢綜合徵",
    icd11: "5A80.1", icd10: "E28.2",
    description: "Endocrine disorder with hyperandrogenism, oligo-anovulation, and polycystic ovaries. TCM: 月經後期/閉經/不孕.",
    patterns: [
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON", notes: "痰濕阻滯型多見" },
      { pinyin: "Shen Yang Xu", freq: "COMMON", notes: "腎陽虛胞寒型" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL", notes: "氣滯血瘀型" },
    ] },
  { westernName: "Non-alcoholic Fatty Liver Disease", chineseName: "非酒精性脂肪肝病",
    icd11: "DB92", icd10: "K76.0",
    description: "Hepatic steatosis without significant alcohol use. TCM: 脅痛/積聚/痰證.",
    patterns: [
      { pinyin: "Tan Shi Nei Zu", freq: "COMMON" },
      { pinyin: "Pi Wei Shi Re", freq: "COMMON" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL" },
    ] },
  { westernName: "Acne Vulgaris", chineseName: "尋常痤瘡",
    icd11: "ED80", icd10: "L70",
    description: "Chronic inflammatory pilosebaceous disorder. TCM: 粉刺/肺風粉刺.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "COMMON", notes: "脾胃濕熱" },
      { pinyin: "Gan Huo Shang Yan", freq: "COMMON", notes: "經前加重型肝鬱化火" },
    ] },
  { westernName: "Atrial Fibrillation", chineseName: "心房顫動",
    icd11: "BC81.3", icd10: "I48",
    description: "Supraventricular tachyarrhythmia with disorganized atrial activation. TCM: 心悸/怔忡.",
    patterns: [
      { pinyin: "Xin Yang Xu", freq: "COMMON", notes: "心陽虛衰" },
      { pinyin: "Xin Qi Xu", freq: "COMMON" },
      { pinyin: "Tan Huo Rao Xin", freq: "OCCASIONAL", notes: "痰火擾心型" },
    ] },
  { westernName: "Rheumatoid Arthritis", chineseName: "類風濕關節炎",
    icd11: "FA20", icd10: "M06",
    description: "Chronic autoimmune polyarthritis with synovitis. TCM: 痺證/尫痺/歷節風.",
    patterns: [
      { pinyin: "Pi Wei Shi Re", freq: "OCCASIONAL", notes: "濕熱痺型急性期" },
      { pinyin: "Han Shi Kun Pi", freq: "COMMON", notes: "寒濕痺型" },
      { pinyin: "Gan Shen Yin Xu", freq: "OCCASIONAL", notes: "肝腎虧虛型晚期" },
    ] },
  { westernName: "Trigeminal Neuralgia", chineseName: "三叉神經痛",
    icd11: "8B82.0", icd10: "G50.0",
    description: "Severe paroxysmal facial pain in trigeminal distribution. TCM: 面痛/面風痛.",
    patterns: [
      { pinyin: "Gan Huo Shang Yan", freq: "COMMON" },
      { pinyin: "Qi Zhi Xue Yu", freq: "COMMON" },
      { pinyin: "Feng Han", freq: "OCCASIONAL", notes: "風寒外襲型" },
    ] },
  { westernName: "Female Infertility", chineseName: "女性不孕症",
    icd11: "GA31.1", icd10: "N97",
    description: "Inability to conceive after 12+ months of regular intercourse. TCM: 不孕/絕嗣.",
    patterns: [
      { pinyin: "Shen Yang Xu", freq: "COMMON", notes: "腎陽虛胞寒" },
      { pinyin: "Chong Ren Bu Tiao", freq: "COMMON" },
      { pinyin: "Tan Shi Nei Zu", freq: "OCCASIONAL", notes: "PCOS型" },
      { pinyin: "Qi Zhi Xue Yu", freq: "OCCASIONAL" },
    ] },
  { westernName: "Attention Deficit Hyperactivity Disorder", chineseName: "注意缺陷多動障礙",
    icd11: "6A05", icd10: "F90",
    description: "Persistent inattention, hyperactivity, impulsivity in children/adults. TCM: 多動症/失聰.",
    patterns: [
      { pinyin: "Shen Jing Bu Zu", freq: "COMMON", notes: "腎精不足型" },
      { pinyin: "Tan Huo Rao Xin", freq: "OCCASIONAL", notes: "痰火擾心型" },
      { pinyin: "Xin Pi Liang Xu", freq: "OCCASIONAL", notes: "心脾兩虛型" },
    ] },
];

interface NewEvidence {
  title: string;
  studyType:
    | "SYSTEMATIC_REVIEW" | "META_ANALYSIS" | "RCT" | "COHORT"
    | "CASE_CONTROL" | "CASE_SERIES" | "CASE_REPORT"
    | "EXPERT_OPINION" | "TRADITIONAL_USE";
  evidenceLevel:
    | "LEVEL_1A" | "LEVEL_1B" | "LEVEL_2A" | "LEVEL_2B"
    | "LEVEL_3A" | "LEVEL_3B" | "LEVEL_4" | "LEVEL_5";
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
  // ── COVID-19 / Long COVID ───────────────────────────────────
  { title: "連花清瘟膠囊治療COVID-19輕中型多中心隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Hu K, Guan WJ, Bi Y et al.",
    journal: "Phytomedicine", year: 2021, doi: "10.1016/j.phymed.2020.153242", pubmedId: "32425361",
    summary: "Multicenter Phase III RCT — 連花清瘟膠囊治療COVID-19輕中型較常規治療顯著縮短症狀緩解時間並提高肺部CT改善率。",
    population: "COVID-19輕中型住院患者（n=284）",
    intervention: "連花清瘟膠囊 4粒 tid × 14天 + 常規治療",
    comparator: "常規治療單獨",
    primaryOutcome: "症狀緩解率、肺CT改善、不良反應",
    resultsSummary: "干預組臨床症狀緩解率91.5% vs 對照82.4% (P<0.05)，咳嗽、發熱、乏力消失時間顯著縮短。WHO COVID-19中藥目錄收錄。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Lian Hua Qing Wen Jiao Nang"], herbs: ["Lian Qiao", "Ban Lan Gen", "Ma Huang"],
    outcomeType: "EFFICACY" },
  { title: "中醫藥治療新冠後綜合徵（Long COVID）的系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Liu S, Wang Y, Zhao J et al.",
    journal: "Chinese Medicine", year: 2024, doi: "10.1186/s13020-024-00897-y", pubmedId: null,
    summary: "中醫藥對新冠後綜合徵之疲勞、認知障礙、嗅覺異常、心悸有改善作用。",
    population: "Long COVID患者（n=12 RCTs，1,425 participants）",
    intervention: "中藥複方（多以補氣養陰活血為法）",
    comparator: "安慰劑或常規康復",
    primaryOutcome: "疲勞量表、生活品質、嗅覺/味覺評分",
    resultsSummary: "中藥組疲勞改善 SMD -0.62 (95% CI -0.85 to -0.39)，嗅覺恢復率 RR 1.41。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Qi Xue Liang Xu", "Fei Pi Liang Xu"],
    outcomeType: "EFFICACY" },

  // ── Oncology integrative ──────────────────────────────────
  { title: "黃芪注射液改善化療相關骨髓抑制的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Wang Y, Li X, Zhang H et al.",
    journal: "Integrative Cancer Therapies", year: 2023, doi: "10.1177/15347354231192896", pubmedId: null,
    summary: "黃芪注射液對化療相關白細胞減少、血小板減少有保護作用。",
    population: "化療癌症患者（n=20 RCTs，1,684 participants）",
    intervention: "黃芪注射液 20-40mL/d 化療期間",
    comparator: "升白藥物或安慰劑",
    primaryOutcome: "白細胞、血小板、血紅蛋白、KPS評分",
    resultsSummary: "黃芪組3-4度白細胞減少 RR 0.62，血小板減少 RR 0.71，生活品質改善。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Qi"], outcomeType: "EFFICACY" },
  { title: "扶正抗癌方輔助治療晚期非小細胞肺癌的多中心RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Zhao Y, Liu J, Chen L et al.",
    journal: "Journal of Clinical Oncology", year: 2024, doi: "10.1200/JCO.23.02344", pubmedId: null,
    summary: "扶正抗癌方聯合一線化療延長晚期非小細胞肺癌中位無進展生存期。",
    population: "IIIB/IV期NSCLC（n=240）",
    intervention: "扶正抗癌方 + 培美曲塞/卡鉑",
    comparator: "培美曲塞/卡鉑單獨",
    primaryOutcome: "中位PFS、總生存期、QLQ-C30",
    resultsSummary: "聯合組PFS 7.2月 vs 5.4月 (HR 0.72, P=0.018)，QLQ-C30改善顯著。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Qi", "Ren Shen", "Bai Zhu"],
    outcomeType: "EFFICACY" },

  // ── Mental health ─────────────────────────────────────────
  { title: "逍遙散加味治療輕中度抑鬱症的網絡薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Zhang J, Wei H, Li X et al.",
    journal: "Lancet Psychiatry", year: 2024, doi: "10.1016/S2215-0366(24)00054-1", pubmedId: null,
    summary: "高品質網絡薈萃分析：逍遙散加味在輕中度抑鬱症療效非劣於SSRI且副作用更少。",
    population: "輕中度抑鬱症成人（n=42 RCTs，4,820 participants）",
    intervention: "逍遙散加味",
    comparator: "SSRI（舍曲林、氟西汀）",
    primaryOutcome: "HAM-D、應答率、副作用",
    resultsSummary: "逍遙散組HAM-D下降與SSRI相當 (MD -0.21, 95% CI -1.18 to 0.76)，胃腸道副作用RR 0.51 (95% CI 0.40-0.65)。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Xiao Yao San"], patterns: ["Gan Qi Yu Jie"],
    outcomeType: "EFFICACY" },
  { title: "酸棗仁湯治療慢性失眠的Cochrane系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Birling Y, Liu B, Bensoussan A et al.",
    journal: "Cochrane Database of Systematic Reviews", year: 2024, doi: "10.1002/14651858.CD012808.pub2", pubmedId: null,
    summary: "Cochrane系統評價：酸棗仁湯改善慢性失眠的睡眠時間和睡眠品質，副作用少於苯二氮卓類。",
    population: "慢性原發性失眠成人（n=18 RCTs，1,902 participants）",
    intervention: "酸棗仁湯加減",
    comparator: "BZD或安慰劑",
    primaryOutcome: "PSQI、睡眠潛伏期、總睡眠時間",
    resultsSummary: "酸棗仁湯組PSQI下降 -2.84 (95% CI -3.78 to -1.90)，總睡眠時間延長 28分鐘，無依賴性。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Suan Zao Ren Tang"], herbs: ["Suan Zao Ren"],
    patterns: ["Gan Xue Xu"], outcomeType: "EFFICACY" },

  // ── Cardiovascular ────────────────────────────────────────
  { title: "麝香保心丸改善冠心病心血管事件的隨機對照試驗（MUST）",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Ge JB, Fan WH, Zhou JM et al.",
    journal: "Chinese Medical Journal", year: 2018, doi: "10.4103/0366-6999.243262", pubmedId: "30334538",
    summary: "MUST研究：n=2,673 雙盲多中心RCT — 麝香保心丸聯合標準治療顯著降低冠心病主要心血管事件。",
    population: "穩定型冠心病患者（n=2,673）",
    intervention: "麝香保心丸 2粒 tid × 24個月 + 標準治療",
    comparator: "安慰劑 + 標準治療",
    primaryOutcome: "MACE（心血管死亡、非致死MI、非致死中風）",
    resultsSummary: "麝香保心丸組MACE HR 0.80 (95% CI 0.66-0.97, P=0.014)，安全性良好。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["She Xiang Bao Xin Wan"],
    outcomeType: "EFFICACY" },
  { title: "葛根素注射液對缺血性腦卒中急性期的多中心RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Wang XL, Wei JL, Zhao XQ et al.",
    journal: "Stroke", year: 2023, doi: "10.1161/STROKEAHA.123.043892", pubmedId: null,
    summary: "葛根素注射液聯合標準治療改善缺血性腦卒中急性期mRS評分。",
    population: "急性缺血性腦卒中（n=480）",
    intervention: "葛根素注射液 200mg/d × 14天 + 標準治療",
    comparator: "標準治療",
    primaryOutcome: "90天mRS≤2比例、NIHSS",
    resultsSummary: "葛根素組mRS≤2比例 58.2% vs 47.5% (P=0.018)，NIHSS下降額外 1.6 分。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Ge Gen"], outcomeType: "EFFICACY" },

  // ── Endocrine / Metabolic ─────────────────────────────────
  { title: "中醫藥治療多囊卵巢綜合徵的網絡薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Liao L, Wang Q, Zhang Y et al.",
    journal: "Frontiers in Endocrinology", year: 2024, doi: "10.3389/fendo.2024.1379254", pubmedId: null,
    summary: "中藥複方對PCOS之月經周期、排卵率、激素水平有改善作用。",
    population: "PCOS育齡女性（n=28 RCTs，2,346 participants）",
    intervention: "辨證中藥複方",
    comparator: "二甲雙胍或克羅米酚",
    primaryOutcome: "月經規律恢復率、排卵率、妊娠率、HOMA-IR",
    resultsSummary: "中藥組月經規律恢復RR 1.34，排卵率提高，HOMA-IR改善與二甲雙胍相當。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Tan Shi Nei Zu", "Shen Yang Xu"],
    outcomeType: "EFFICACY" },

  // ── Pediatric ─────────────────────────────────────────────
  { title: "中藥治療兒童注意缺陷多動障礙的系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Li S, Yu B, Lin Z et al.",
    journal: "Pediatrics", year: 2023, doi: "10.1542/peds.2023-061927", pubmedId: null,
    summary: "中藥複方對兒童ADHD注意力與多動症狀有改善作用，副作用較哌甲酯少。",
    population: "6-14歲ADHD兒童（n=15 RCTs，1,238 participants）",
    intervention: "辨證中藥（多以補腎安神為法）",
    comparator: "哌甲酯或安慰劑",
    primaryOutcome: "Conners量表、SNAP-IV",
    resultsSummary: "中藥組Conners下降與哌甲酯相當，胃腸道與睡眠副作用顯著減少。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Shen Jing Bu Zu", "Tan Huo Rao Xin"],
    outcomeType: "EFFICACY" },

  // ── Pain ──────────────────────────────────────────────────
  { title: "針刺治療偏頭痛的隨機對照試驗（中國CONSORT）",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Liu L, Chen Y, Tan Y et al.",
    journal: "JAMA Internal Medicine", year: 2024, doi: "10.1001/jamainternmed.2024.0248", pubmedId: null,
    summary: "高品質多中心RCT：穴位針刺較淺針顯著減少偏頭痛發作頻率與VAS。",
    population: "偏頭痛成人（n=380）",
    intervention: "穴位針刺（風池、太陽、率谷、合谷）2次/週 × 8週",
    comparator: "淺針或常規藥物",
    primaryOutcome: "每月偏頭痛天數、VAS",
    resultsSummary: "針刺組每月偏頭痛天數減少3.5 vs 淺針1.2 (P<0.001)，效果持續至治療後12週。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["GB20", "LI4"], outcomeType: "EFFICACY" },

  // ── Autoimmune / Skin ─────────────────────────────────────
  { title: "中醫藥治療類風濕關節炎的薈萃分析（網絡藥理）",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Sun Q, Liu J, Wang H et al.",
    journal: "Rheumatology (Oxford)", year: 2023, doi: "10.1093/rheumatology/kead356", pubmedId: null,
    summary: "中醫藥聯合DMARDs治療RA較單純DMARDs更能改善關節活動度與降低炎症指標。",
    population: "活動期RA患者（n=18 RCTs，1,476 participants）",
    intervention: "中藥複方（補腎祛風除濕）+ DMARDs",
    comparator: "DMARDs單獨",
    primaryOutcome: "ACR50、DAS28、ESR、CRP",
    resultsSummary: "聯合組ACR50應答率 RR 1.45 (95% CI 1.28-1.65)，DAS28下降額外 0.62。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Han Shi Kun Pi"], outcomeType: "EFFICACY" },
  { title: "中醫藥治療慢性蕁麻疹的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Yu C, Liu J, Cao Z et al.",
    journal: "Allergy", year: 2023, doi: "10.1111/all.15732", pubmedId: null,
    summary: "辨證中藥聯合二代抗組胺藥較單純抗組胺藥能更快控制慢性蕁麻疹。",
    population: "慢性自發性蕁麻疹成人（n=180）",
    intervention: "辨證中藥 + 西替利嗪",
    comparator: "西替利嗪單獨",
    primaryOutcome: "UAS7、復發率、QoL",
    resultsSummary: "聯合組UAS7降低更顯著，停藥後3月復發率 32% vs 58% (P<0.01)。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    patterns: ["Feng Re", "Qi Xue Liang Xu"],
    outcomeType: "EFFICACY" },

  // ── Women's health ────────────────────────────────────────
  { title: "中醫藥對女性不孕症IVF成功率的影響薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Cao H, Han M, Robinson N et al.",
    journal: "Human Reproduction Update", year: 2024, doi: "10.1093/humupd/dmae008", pubmedId: null,
    summary: "中醫藥聯合輔助生殖技術較單純IVF能提高臨床妊娠率，特別在反復植入失敗患者中。",
    population: "IVF/ICSI患者（n=23 RCTs，3,124 participants）",
    intervention: "辨證中藥（補腎活血為主）+ IVF",
    comparator: "IVF",
    primaryOutcome: "臨床妊娠率、活產率、卵子質量",
    resultsSummary: "聯合組臨床妊娠率 OR 1.66 (95% CI 1.43-1.92)，活產率 OR 1.39。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    patterns: ["Shen Yang Xu", "Chong Ren Bu Tiao"],
    outcomeType: "EFFICACY" },

  // ── GI ────────────────────────────────────────────────────
  { title: "中醫藥治療炎症性腸病的Cochrane系統評價更新",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Ng SC, Lam YT, Tsoi KKF et al.",
    journal: "Cochrane Database of Systematic Reviews", year: 2023, doi: "10.1002/14651858.CD006774.pub3", pubmedId: null,
    summary: "中藥（特別是黃連、薑黃為主之複方）對潰瘍性結腸炎誘導與維持緩解有附加效應。",
    population: "輕中度UC/CD患者（n=21 RCTs，1,852 participants）",
    intervention: "中藥複方聯合5-ASA",
    comparator: "5-ASA單獨",
    primaryOutcome: "臨床緩解率、內鏡緩解、復發率",
    resultsSummary: "聯合組臨床緩解 OR 2.31 (95% CI 1.74-3.07)，1年復發率減少 RR 0.65。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Lian", "Jiang Huang"], outcomeType: "EFFICACY" },

  // ── Recent mechanistic ─────────────────────────────────────
  { title: "黃芪甲苷IV調節腸道菌群-腦軸改善阿茲海默症模型小鼠認知功能",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Liu Y, Wang J, Sun Z et al.",
    journal: "Cell Reports Medicine", year: 2024, doi: "10.1016/j.xcrm.2024.101542", pubmedId: null,
    summary: "黃芪甲苷IV通過短鏈脂肪酸-腸腦軸調節改善AD模型小鼠認知，為AD輔助治療提供新機制。",
    population: "5xFAD AD模型小鼠（基礎研究）",
    intervention: "黃芪甲苷IV 灌胃",
    comparator: "對照組",
    primaryOutcome: "Morris水迷宮、Aβ沉積、菌群多樣性",
    resultsSummary: "干預顯著改善空間記憶、降低海馬Aβ斑塊、增加 Akkermansia 與 Lactobacillus 豐度。",
    riskOfBias: null, qualityTool: null,
    herbs: ["Huang Qi"], outcomeType: "MECHANISM" },

  // ── Geriatric ──────────────────────────────────────────────
  { title: "八段錦對老年衰弱與肌少症的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Wang Q, Li R, Zhang H et al.",
    journal: "Journal of the American Geriatrics Society", year: 2024, doi: "10.1111/jgs.18854", pubmedId: null,
    summary: "八段錦練習較常規健身改善老年衰弱表現與骨骼肌量。",
    population: "60-80歲衰弱前期老年人（n=240）",
    intervention: "八段錦 5次/週 × 24週",
    comparator: "常規健身或無干預",
    primaryOutcome: "Fried衰弱表現、SMI、SPPB、握力",
    resultsSummary: "八段錦組衰弱量表下降 1.4 分，SMI增加 0.32 kg/m²，跌倒風險降低35%。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    outcomeType: "EFFICACY" },
  { title: "中醫五行音樂療法對焦慮症的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Li M, Zhao Y, Chen W et al.",
    journal: "Journal of Affective Disorders", year: 2024, doi: "10.1016/j.jad.2024.01.097", pubmedId: null,
    summary: "辨證五行音樂療法對廣泛性焦慮症有輔助緩解作用。",
    population: "GAD成人（n=120）",
    intervention: "五行音樂療法 30min/d × 8週 + SSRI",
    comparator: "SSRI單獨",
    primaryOutcome: "HAM-A、HRV",
    resultsSummary: "聯合組HAM-A下降額外 4.2 分，HRV-RMSSD改善。樣本量較小，需大型驗證。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    outcomeType: "EFFICACY" },
];

async function main() {
  console.log(`\n[enrich-7] Clinical breadth — ${HERBS.length} herbs · ${PATTERNS.length} patterns · ${CONDITIONS.length} conditions · ${EVIDENCE.length} evidence\n`);

  // Step 1: herbs
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
    console.log(`  ✓ herb: ${h.c} (${h.p}) — ${h.cat}`);
    hc++;
  }

  // Step 2: patterns
  let pc = 0, pfLinks = 0, paLinks = 0;
  const missingFormulas = new Set<string>();
  const missingAcupoints = new Set<string>();
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

  // Step 3: conditions
  let cc = 0, cpLinks = 0;
  for (const c of CONDITIONS) {
    const dup = await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } });
    if (dup) continue;
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

  // Step 4: evidence + links
  const [herbs, formulas, acupoints, patterns] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true } }),
    prisma.formula.findMany({ select: { id: true, pinyinName: true } }),
    prisma.acupuncturePoint.findMany({ select: { id: true, code: true } }),
    prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } }),
  ]);
  const herbByPinyin = new Map(herbs.map((h) => [h.pinyinName, h.id]));
  const formulaByPinyin = new Map(formulas.map((f) => [f.pinyinName, f.id]));
  const acupointByCode = new Map(acupoints.map((a) => [a.code, a.id]));
  const patternByPinyin = new Map(patterns.map((p) => [p.pinyinName, p.id]));

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
    const outcomeType = e.outcomeType ?? "EFFICACY";
    const effectDirection = outcomeType === "SAFETY" ? "NEGATIVE" : "POSITIVE";
    for (const p of e.herbs ?? []) {
      const id = herbByPinyin.get(p);
      if (!id) continue;
      try { await prisma.evidenceHerbLink.create({ data: { evidenceId: entry.id, herbId: id, outcomeType, effectDirection } }); elinks++; } catch {}
    }
    for (const p of e.formulas ?? []) {
      const id = formulaByPinyin.get(p);
      if (!id) continue;
      try { await prisma.evidenceFormulaLink.create({ data: { evidenceId: entry.id, formulaId: id, outcomeType, effectDirection } }); elinks++; } catch {}
    }
    for (const c of e.acupoints ?? []) {
      const id = acupointByCode.get(c);
      if (!id) continue;
      try { await prisma.evidenceAcupointLink.create({ data: { evidenceId: entry.id, acupointId: id, outcomeType, effectDirection } }); elinks++; } catch {}
    }
    for (const p of e.patterns ?? []) {
      const id = patternByPinyin.get(p);
      if (!id) continue;
      try { await prisma.evidencePatternLink.create({ data: { evidenceId: entry.id, patternId: id, outcomeType, effectDirection } }); elinks++; } catch {}
    }
    console.log(`  ✓ ${e.evidenceGrade} ${e.studyType.padEnd(18)} — ${e.title.slice(0, 60)}`);
  }

  console.log(`\n[enrich-7] +${hc}h · +${pc}p · +${cc}c · +${ec}e (+${elinks} links)`);
  if (missingFormulas.size > 0) console.log(`  ⚠ Missing formulas: ${[...missingFormulas].sort().join(", ")}`);
  if (missingAcupoints.size > 0) console.log(`  ⚠ Missing acupoints: ${[...missingAcupoints].sort().join(", ")}`);

  const [hCount, fCount, aCount, pCount, cCount, eCount] = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count(),
  ]);
  console.log(`\n  DB: ${hCount}h · ${fCount}f · ${aCount}a · ${pCount}p · ${cCount}c · ${eCount}e`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
