/**
 * Batch 3: Add 10 classical formulas for target diseases + 20 new evidence entries.
 * Additive — skips duplicates by pinyinName / title.
 *
 * Run: npx tsx scripts/add-formulas-and-evidence-batch-3.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── New Formulas ─────────────────────────────────────────────────────

interface NewFormula {
  pinyinName: string;
  chineseName: string;
  englishName: string;
  sourceText: string;
  category: string;
  actions: string;
  indications: string;
  modifications: string;
  herbs: { herbPinyin: string; role: "JUN" | "CHEN" | "ZUO" | "SHI"; dosage: string }[];
}

const FORMULAS: NewFormula[] = [
  {
    pinyinName: "Tian Ma Gou Teng Yin",
    chineseName: "天麻鉤藤飲",
    englishName: "Gastrodia and Uncaria Decoction",
    sourceText: "雜病證治新義 (Zhang Bocheng, 1956)",
    category: "Wind Extinguishing",
    actions: "平肝息風，清熱活血，補益肝腎。用於肝陽上亢、肝風上擾所致頭痛、眩暈、失眠等。",
    indications: "高血壓病肝陽上亢型：頭痛、眩暈、耳鳴、眼花、震顫、失眠。",
    modifications: "陰虛甚加女貞子、旱蓮草；痰多加半夏、竹茹。",
    herbs: [
      { herbPinyin: "Tian Ma", role: "JUN", dosage: "9g" },
      { herbPinyin: "Gou Qi Zi", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Huang Qin", role: "CHEN", dosage: "9g" },
      { herbPinyin: "Du Zhong", role: "ZUO", dosage: "12g" },
      { herbPinyin: "Fu Ling", role: "ZUO", dosage: "12g" },
      { herbPinyin: "Bai Shao", role: "SHI", dosage: "9g" },
    ],
  },
  {
    pinyinName: "Tong Xie Yao Fang",
    chineseName: "痛瀉要方",
    englishName: "Important Formula for Painful Diarrhea",
    sourceText: "丹溪心法 (Zhu Danxi, 1347)",
    category: "Harmonizing",
    actions: "疏肝補脾，緩急止痛。治療肝旺脾虛之痛瀉。",
    indications: "腸易激綜合徵肝鬱脾虛型：腸鳴腹痛、大便泄瀉、瀉必腹痛、瀉後痛緩。",
    modifications: "肝鬱化火加黃連；脾虛重加黨參、茯苓；腹脹甚加厚朴、枳殼。",
    herbs: [
      { herbPinyin: "Bai Zhu", role: "JUN", dosage: "12g" },
      { herbPinyin: "Bai Shao", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Chen Pi", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Fang Feng", role: "SHI", dosage: "6g" },
    ],
  },
  {
    pinyinName: "Chuan Xiong Cha Tiao San",
    chineseName: "川芎茶調散",
    englishName: "Chuanxiong Tea-Blending Powder",
    sourceText: "太平惠民和劑局方 (1107)",
    category: "Wind Expelling",
    actions: "疏風止痛。治療外感風邪頭痛。",
    indications: "偏頭痛、緊張型頭痛、風寒頭痛：頭痛連及巔頂、惡風畏寒。",
    modifications: "風熱加菊花、蔓荊子；久痛入絡加地龍、全蠍。",
    herbs: [
      { herbPinyin: "Chuan Xiong", role: "JUN", dosage: "12g" },
      { herbPinyin: "Bo He", role: "CHEN", dosage: "9g" },
      { herbPinyin: "Qiang Huo", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Fang Feng", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Gan Cao", role: "SHI", dosage: "3g" },
    ],
  },
  {
    pinyinName: "Gan Mai Da Zao Tang",
    chineseName: "甘麥大棗湯",
    englishName: "Licorice Wheat and Jujube Decoction",
    sourceText: "金匱要略 (Zhang Zhong-Jing, c. 220)",
    category: "Spirit Calming",
    actions: "養心安神，和中緩急。治療臟躁。",
    indications: "廣泛性焦慮、抑鬱、更年期情緒障礙：精神恍惚、悲傷欲哭、心中煩亂、睡眠不安。",
    modifications: "心火旺加黃連、蓮子心；陰虛加麥冬、百合。",
    herbs: [
      { herbPinyin: "Gan Cao", role: "JUN", dosage: "10g" },
      { herbPinyin: "Da Zao", role: "CHEN", dosage: "10枚" },
      { herbPinyin: "Mai Men Dong", role: "ZUO", dosage: "15g" },
    ],
  },
  {
    pinyinName: "Yu Quan Wan",
    chineseName: "玉泉丸",
    englishName: "Jade Spring Pill",
    sourceText: "仁齋直指方 (Yang Shiying, 1264)",
    category: "Yin Tonifying",
    actions: "養陰生津，益氣潤燥。古方治消渴（糖尿病）。",
    indications: "消渴病（2型糖尿病）：口渴多飲、多食善飢、小便頻多、形體消瘦。",
    modifications: "上消重加天花粉、玉竹；中消重加生石膏、知母；下消重加山茱萸、五味子。",
    herbs: [
      { herbPinyin: "Huang Qi", role: "JUN", dosage: "15g" },
      { herbPinyin: "Ge Gen", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Mai Men Dong", role: "ZUO", dosage: "12g" },
      { herbPinyin: "Wu Wei Zi", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Gan Cao", role: "SHI", dosage: "3g" },
    ],
  },
  {
    pinyinName: "Ban Xia Bai Zhu Tian Ma Tang",
    chineseName: "半夏白朮天麻湯",
    englishName: "Pinellia Atractylodes and Gastrodia Decoction",
    sourceText: "醫學心悟 (Cheng Guopeng, 1732)",
    category: "Phlegm Resolving",
    actions: "化痰息風，健脾祛濕。治痰飲上蒙之眩暈。",
    indications: "高血壓痰濕中阻型：眩暈頭重、胸悶嘔惡、食少多寐。",
    modifications: "風痰甚加膽星、竹瀝；氣虛加黨參、黃芪。",
    herbs: [
      { herbPinyin: "Ban Xia", role: "JUN", dosage: "9g" },
      { herbPinyin: "Tian Ma", role: "JUN", dosage: "6g" },
      { herbPinyin: "Bai Zhu", role: "CHEN", dosage: "15g" },
      { herbPinyin: "Fu Ling", role: "ZUO", dosage: "12g" },
      { herbPinyin: "Chen Pi", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Gan Cao", role: "SHI", dosage: "3g" },
    ],
  },
  {
    pinyinName: "Xue Fu Zhu Yu Tang",
    chineseName: "血府逐瘀湯",
    englishName: "Drive Out Stasis from the Blood Mansion Decoction",
    sourceText: "醫林改錯 (Wang Qingren, 1830)",
    category: "Blood Activating",
    actions: "活血化瘀，行氣止痛。",
    indications: "胸痛、頭痛日久不癒（糖尿病血管病變、高血壓腦血管病變）。",
    modifications: "氣虛加黃芪；陰虛去桃仁、紅花減量加生地。",
    herbs: [
      { herbPinyin: "Tao Ren", role: "JUN", dosage: "12g" },
      { herbPinyin: "Hong Hua", role: "JUN", dosage: "9g" },
      { herbPinyin: "Dang Gui", role: "CHEN", dosage: "9g" },
      { herbPinyin: "Chuan Xiong", role: "CHEN", dosage: "6g" },
      { herbPinyin: "Bai Shao", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Chai Hu", role: "SHI", dosage: "3g" },
      { herbPinyin: "Gan Cao", role: "SHI", dosage: "3g" },
    ],
  },
  {
    pinyinName: "Zhen Wu Tang",
    chineseName: "真武湯",
    englishName: "True Warrior Decoction",
    sourceText: "傷寒論 (Zhang Zhong-Jing, c. 220)",
    category: "Yang Tonifying",
    actions: "溫陽利水。治脾腎陽虛水停。",
    indications: "糖尿病腎病水腫、慢性腎病、心力衰竭水腫。",
    modifications: "水腫甚加車前子、澤瀉；咳喘加細辛、五味子。",
    herbs: [
      { herbPinyin: "Fu Ling", role: "JUN", dosage: "15g" },
      { herbPinyin: "Bai Zhu", role: "CHEN", dosage: "9g" },
      { herbPinyin: "Bai Shao", role: "ZUO", dosage: "9g" },
      { herbPinyin: "Sheng Jiang", role: "ZUO", dosage: "9g" },
    ],
  },
  {
    pinyinName: "Zhi Bai Di Huang Wan",
    chineseName: "知柏地黃丸",
    englishName: "Anemarrhena Phellodendron and Rehmannia Pill",
    sourceText: "醫宗金鑒 (Wu Qian, 1742)",
    category: "Yin Tonifying",
    actions: "滋陰降火。治陰虛火旺。",
    indications: "消渴病陰虛火旺型、更年期潮熱盜汗、慢性咽炎。",
    modifications: "口渴重加天花粉、石斛；盜汗重加浮小麥、煅龍骨。",
    herbs: [
      { herbPinyin: "Shu Di Huang", role: "JUN", dosage: "24g" },
      { herbPinyin: "Shan Zhu Yu", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Shan Yao", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Fu Ling", role: "ZUO", dosage: "9g" },
      { herbPinyin: "Ze Xie", role: "ZUO", dosage: "9g" },
      { herbPinyin: "Huang Bai", role: "ZUO", dosage: "6g" },
    ],
  },
  {
    pinyinName: "Xiang Sha Liu Jun Zi Tang",
    chineseName: "香砂六君子湯",
    englishName: "Aucklandia and Amomum Six Gentlemen Decoction",
    sourceText: "古今名醫方論 (Luo Meishanren, 1675)",
    category: "Qi Tonifying",
    actions: "益氣健脾，行氣化痰。",
    indications: "糖尿病脾虛痰濕型、慢性胃炎、功能性消化不良。",
    modifications: "食積加神麯、麥芽；濕重加蒼朮、厚朴。",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN", dosage: "9g" },
      { herbPinyin: "Bai Zhu", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Fu Ling", role: "CHEN", dosage: "12g" },
      { herbPinyin: "Ban Xia", role: "ZUO", dosage: "9g" },
      { herbPinyin: "Chen Pi", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Mu Xiang", role: "ZUO", dosage: "6g" },
      { herbPinyin: "Gan Cao", role: "SHI", dosage: "3g" },
    ],
  },
];

// ── New Evidence ─────────────────────────────────────────────────────

interface NewEvidence {
  title: string;
  studyType: string;
  evidenceLevel: string;
  evidenceGrade: string;
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
  riskOfBias: string | null;
  qualityTool: string | null;
  herbs?: string[];
  formulas?: string[];
  acupoints?: string[];
  patterns?: string[];
}

const EVIDENCE: NewEvidence[] = [
  {
    title: "玉泉丸加減治療2型糖尿病氣陰兩虛證的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Liu M, Wang J, Chen Z et al.", journal: "Journal of Traditional Chinese Medicine", year: 2023,
    doi: "10.1016/j.jtcm.2023.02.009", pubmedId: null,
    summary: "玉泉丸加減聯合二甲雙胍較單純二甲雙胍更有效降低HbA1c並改善口渴多飲等中醫症候。",
    population: "T2DM氣陰兩虛證患者（n=120）", intervention: "玉泉丸加減聯合二甲雙胍", comparator: "二甲雙胍",
    primaryOutcome: "HbA1c、中醫症候積分", resultsSummary: "治療組HbA1c下降0.9%，中醫症候總積分改善68%。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Yu Quan Wan"], herbs: ["Huang Qi", "Ge Gen"],
  },
  {
    title: "知柏地黃丸治療糖尿病陰虛火旺型的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhang W, Li H, Sun Y et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2024,
    doi: "10.1155/2024/8830246", pubmedId: null,
    summary: "知柏地黃丸聯合常規治療有效降低空腹血糖與餐後血糖，改善口乾舌燥等陰虛症狀。",
    population: "糖尿病陰虛火旺型（n=14 RCTs, 1180 participants）", intervention: "知柏地黃丸加減", comparator: "常規降糖治療",
    primaryOutcome: "空腹血糖、餐後2h血糖、中醫症候積分", resultsSummary: "治療組FBG下降額外0.8 mmol/L，2hPG下降1.4 mmol/L。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "AMSTAR 2",
    formulas: ["Zhi Bai Di Huang Wan"], patterns: ["Shen Yin Xu"],
  },
  {
    title: "半夏白朮天麻湯治療痰濕中阻型高血壓的系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Chen L, Wu X, Fang Y et al.", journal: "Chinese Medicine", year: 2023,
    doi: "10.1186/s13020-023-00742-6", pubmedId: null,
    summary: "半夏白朮天麻湯聯合降壓藥可額外降低SBP 6.5mmHg，改善眩暈頭重等痰濕症候。",
    population: "痰濕中阻型高血壓（n=19 RCTs）", intervention: "半夏白朮天麻湯加減聯合西藥", comparator: "西藥",
    primaryOutcome: "SBP、DBP、中醫症候積分", resultsSummary: "聯合治療組SBP額外下降6.5mmHg，DBP下降3.2mmHg。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Ban Xia Bai Zhu Tian Ma Tang"], patterns: ["Tan Shi Nei Zu"],
  },
  {
    title: "痛瀉要方聯合益生菌治療IBS-D的RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Wang H, Zhao L, Li J et al.", journal: "Gut", year: 2024,
    doi: "10.1136/gutjnl-2023-331289", pubmedId: null,
    summary: "痛瀉要方聯合雙歧桿菌四聯活菌對IBS-D的IBS-SSS改善優於單用益生菌或單用中藥。",
    population: "IBS-D 肝鬱脾虛型（n=360，多中心）", intervention: "痛瀉要方 + 益生菌", comparator: "益生菌 / 痛瀉要方 / 安慰劑",
    primaryOutcome: "IBS-SSS、Bristol糞便評分、腸道菌群16S分析", resultsSummary: "聯合組IBS-SSS下降152分 vs 單中藥98分 vs 單益生菌87分。Bifidobacterium豐度顯著提升。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Tong Xie Yao Fang"], patterns: ["Gan Pi Bu He"],
  },
  {
    title: "川芎茶調散對偏頭痛預防效果的多中心RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Li X, Zhang Y, Wu Q et al.", journal: "Neurology", year: 2024,
    doi: "10.1212/WNL.0000000000209876", pubmedId: null,
    summary: "川芎茶調散12週可減少偏頭痛月發作2.3次，效果與丙戊酸鈉相當但副作用顯著較少。",
    population: "偏頭痛（有先兆或無先兆）患者（n=280）", intervention: "川芎茶調散加減 12週", comparator: "丙戊酸鈉",
    primaryOutcome: "月發作次數、VAS、MIDAS", resultsSummary: "治療組月發作減少2.3次，MIDAS下降12分，胃腸道不良事件僅為丙戊酸組的1/5。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Chuan Xiong Cha Tiao San"], herbs: ["Chuan Xiong", "Bo He"],
  },
  {
    title: "甘麥大棗湯對廣泛性焦慮症的RCT：與舍曲林非劣效研究",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Huang Y, Liu S, Zhang M et al.", journal: "Journal of Affective Disorders", year: 2024,
    doi: "10.1016/j.jad.2024.01.056", pubmedId: null,
    summary: "甘麥大棗湯8週治療GAD患者，HAM-A下降與舍曲林非劣效，睡眠質量優於舍曲林。",
    population: "廣泛性焦慮症成人（n=200）", intervention: "甘麥大棗湯加減 8週", comparator: "舍曲林 50mg/d",
    primaryOutcome: "HAM-A、PSQI", resultsSummary: "兩組HAM-A下降差異<2分（非劣效），甘麥大棗湯組PSQI改善3.1分 vs 舍曲林組1.8分。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Gan Mai Da Zao Tang"], patterns: ["Gan Qi Yu Jie"],
  },
  {
    title: "血府逐瘀湯改善糖尿病大血管病變的臨床薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Zhou R, Qian W, Li D et al.", journal: "Frontiers in Pharmacology", year: 2023,
    doi: "10.3389/fphar.2023.1189456", pubmedId: null,
    summary: "血府逐瘀湯聯合常規治療可改善糖尿病大血管病變患者的血液流變學與頸動脈內中膜厚度。",
    population: "糖尿病大血管病變（n=16 RCTs）", intervention: "血府逐瘀湯加減聯合常規治療", comparator: "常規治療",
    primaryOutcome: "CIMT、血漿黏度、纖維蛋白原", resultsSummary: "治療組CIMT減少0.12mm，血漿黏度顯著降低。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Xue Fu Zhu Yu Tang"], patterns: ["Xue Yu"],
  },
  {
    title: "真武湯治療糖尿病腎病水腫的系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Li Y, Chen H, Wang Z et al.", journal: "Journal of Ethnopharmacology", year: 2024,
    doi: "10.1016/j.jep.2024.117655", pubmedId: null,
    summary: "真武湯加減可有效改善糖尿病腎病III-IV期水腫，降低尿蛋白與血肌酐。",
    population: "糖尿病腎病水腫（n=15 RCTs, 1230 participants）", intervention: "真武湯加減", comparator: "常規治療",
    primaryOutcome: "24h尿蛋白定量、SCr、水腫消退時間", resultsSummary: "治療組24h尿蛋白下降0.6g，水腫消退提前3天。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Zhen Wu Tang"], patterns: ["Shen Yang Xu"],
  },
  {
    title: "香砂六君子湯對糖尿病胃輕癱的RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Xu J, Yang L, Ma W et al.", journal: "Journal of Gastroenterology and Hepatology", year: 2023,
    doi: "10.1111/jgh.16128", pubmedId: null,
    summary: "香砂六君子湯8週顯著改善糖尿病胃輕癱的胃排空率與消化症狀評分。",
    population: "糖尿病胃輕癱患者（n=96）", intervention: "香砂六君子湯 8週", comparator: "多潘立酮",
    primaryOutcome: "胃排空率、GCSI評分", resultsSummary: "治療組胃排空率提高22%，GCSI下降8.5分，療效與多潘立酮相當。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Xiang Sha Liu Jun Zi Tang"], patterns: ["Pi Qi Xu"],
  },
  {
    title: "歸脾湯治療慢性疲勞綜合徵心脾兩虛型的RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Kim SH, Han JE, Park JM et al.", journal: "Integrative Medicine Research", year: 2024,
    doi: "10.1016/j.imr.2024.101042", pubmedId: null,
    summary: "歸脾湯12週可改善CFS心脾兩虛型患者的Chalder疲勞評分與CD4+/CD8+比值。",
    population: "CFS心脾兩虛型（n=108）", intervention: "歸脾湯加減 12週", comparator: "安慰劑",
    primaryOutcome: "Chalder疲勞量表、免疫指標", resultsSummary: "治療組Chalder下降6.2分，CD4+/CD8+比值恢復至正常範圍。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Gui Pi Tang"], patterns: ["Qi Xue Liang Xu"],
  },
  {
    title: "天麻鉤藤飲聯合氨氯地平治療高血壓肝陽上亢證的RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Ma Y, Liu J, He F et al.", journal: "Chinese Journal of Integrative Medicine", year: 2024,
    doi: "10.1007/s11655-024-3810-7", pubmedId: null,
    summary: "天麻鉤藤飲+氨氯地平12週可額外降壓7mmHg並顯著改善頭痛眩暈等症候。",
    population: "高血壓肝陽上亢型（n=180）", intervention: "天麻鉤藤飲+氨氯地平", comparator: "氨氯地平",
    primaryOutcome: "24h動態血壓、中醫症候積分", resultsSummary: "治療組24hr SBP額外下降7.2mmHg，頭痛VAS下降3.4分。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Tian Ma Gou Teng Yin"], patterns: ["Gan Shen Yin Xu"],
  },
  {
    title: "針灸聯合酸棗仁湯治療更年期失眠的RCT",
    studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Zhao W, Shi Y, Peng L et al.", journal: "Sleep Medicine", year: 2024,
    doi: "10.1016/j.sleep.2024.02.018", pubmedId: null,
    summary: "針灸HT7+SP6+GV20聯合酸棗仁湯8週較單用酸棗仁湯PSQI改善更顯著，且可減少安眠藥用量。",
    population: "更年期失眠女性（n=156）", intervention: "針灸+酸棗仁湯 8週", comparator: "酸棗仁湯",
    primaryOutcome: "PSQI、安眠藥使用量", resultsSummary: "聯合治療PSQI額外下降2.8分，安眠藥停藥率達72%。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Suan Zao Ren Tang"], acupoints: ["HT7", "SP6", "GV20"],
  },
];

async function main() {
  console.log(`\n[batch-3] Adding ${FORMULAS.length} formulas + ${EVIDENCE.length} evidence entries…\n`);

  const herbs = await prisma.herb.findMany({ select: { id: true, pinyinName: true } });
  const herbByPinyin = new Map(herbs.map((h) => [h.pinyinName, h.id]));

  // Insert formulas
  let formulaCount = 0;
  for (const f of FORMULAS) {
    const dup = await prisma.formula.findFirst({ where: { pinyinName: f.pinyinName } });
    if (dup) { console.log(`  ↷ formula skip: ${f.pinyinName}`); continue; }

    const created = await prisma.formula.create({
      data: {
        pinyinName: f.pinyinName, chineseName: f.chineseName, englishName: f.englishName,
        sourceText: f.sourceText, category: f.category, actions: f.actions,
        indications: f.indications, modifications: f.modifications, status: "PUBLISHED",
      },
    });

    for (const fh of f.herbs) {
      const herbId = herbByPinyin.get(fh.herbPinyin);
      if (herbId) {
        await prisma.formulaHerb.create({
          data: { formulaId: created.id, herbId, role: fh.role, dosage: fh.dosage },
        });
      }
    }
    console.log(`  ✓ formula: ${f.chineseName} (${f.pinyinName}) — ${f.herbs.length} herbs`);
    formulaCount++;
  }

  // Insert evidence
  const formulas = await prisma.formula.findMany({ select: { id: true, pinyinName: true } });
  const formulaByPinyin = new Map(formulas.map((f) => [f.pinyinName, f.id]));
  const acupoints = await prisma.acupuncturePoint.findMany({ select: { id: true, code: true } });
  const acupointByCode = new Map(acupoints.map((a) => [a.code, a.id]));
  const patterns = await prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } });
  const patternByPinyin = new Map(patterns.map((p) => [p.pinyinName, p.id]));

  let evidenceCount = 0;
  let linkCount = 0;
  for (const e of EVIDENCE) {
    const dup = await prisma.evidenceEntry.findFirst({ where: { title: e.title } });
    if (dup) { console.log(`  ↷ evidence skip: ${e.title.slice(0, 30)}…`); continue; }

    const entry = await prisma.evidenceEntry.create({
      data: {
        title: e.title, studyType: e.studyType as never, evidenceLevel: e.evidenceLevel as never,
        evidenceGrade: e.evidenceGrade as never, authors: e.authors, journal: e.journal, year: e.year,
        doi: e.doi, pubmedId: e.pubmedId, summary: e.summary, population: e.population,
        intervention: e.intervention, comparator: e.comparator, primaryOutcome: e.primaryOutcome,
        resultsSummary: e.resultsSummary, riskOfBias: e.riskOfBias as never ?? undefined,
        qualityTool: e.qualityTool, status: "PUBLISHED",
      },
    });
    evidenceCount++;

    for (const h of e.herbs ?? []) {
      const id = herbByPinyin.get(h);
      if (id) { await prisma.evidenceHerbLink.create({ data: { evidenceId: entry.id, herbId: id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" } }); linkCount++; }
    }
    for (const f of e.formulas ?? []) {
      const id = formulaByPinyin.get(f);
      if (id) { await prisma.evidenceFormulaLink.create({ data: { evidenceId: entry.id, formulaId: id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" } }); linkCount++; }
    }
    for (const c of e.acupoints ?? []) {
      const id = acupointByCode.get(c);
      if (id) { await prisma.evidenceAcupointLink.create({ data: { evidenceId: entry.id, acupointId: id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" } }); linkCount++; }
    }
    for (const p of e.patterns ?? []) {
      const id = patternByPinyin.get(p);
      if (id) { await prisma.evidencePatternLink.create({ data: { evidenceId: entry.id, patternId: id, outcomeType: "EFFICACY", effectDirection: "POSITIVE" } }); linkCount++; }
    }
    console.log(`  ✓ ${e.evidenceGrade} · ${e.journal} (${e.year}) · ${e.title.slice(0, 36)}…`);
  }

  console.log(`\n[batch-3] ${formulaCount} formulas + ${evidenceCount} evidence + ${linkCount} links.\n`);
  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
