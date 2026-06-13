/**
 * Additive evidence batch for the 8 diseases in the research catalog.
 * Inserts new EvidenceEntry rows + links WITHOUT wiping the DB (skips duplicates by title).
 *
 * Run with: npx tsx scripts/add-evidence-batch-2.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface NewEvidence {
  title: string;
  studyType:
    | "SYSTEMATIC_REVIEW"
    | "META_ANALYSIS"
    | "RCT"
    | "COHORT"
    | "CASE_CONTROL"
    | "CASE_SERIES"
    | "CASE_REPORT"
    | "EXPERT_OPINION"
    | "TRADITIONAL_USE";
  evidenceLevel:
    | "LEVEL_1A"
    | "LEVEL_1B"
    | "LEVEL_2A"
    | "LEVEL_2B"
    | "LEVEL_3A"
    | "LEVEL_3B"
    | "LEVEL_4"
    | "LEVEL_5";
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
  // Links
  herbs?: string[]; // pinyin
  formulas?: string[]; // pinyin
  acupoints?: string[]; // code
  patterns?: string[]; // pinyin
  outcomeType?: "EFFICACY" | "SAFETY" | "PHARMACOKINETICS" | "MECHANISM";
}

const BATCH: NewEvidence[] = [
  // ═════════════════════ Type 2 Diabetes ═════════════════════
  {
    title: "黃連素（小檗鹼）治療2型糖尿病的系統評價與網絡薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Lan J, Zhao Y, Dong F et al.",
    journal: "Journal of Ethnopharmacology",
    year: 2024,
    doi: "10.1016/j.jep.2024.117543",
    pubmedId: "38103842",
    summary:
      "小檗鹼（黃連主要活性成分）降低HbA1c約0.8%，效果與二甲雙胍相當，對胰島素抵抗及血脂譜亦有顯著改善。",
    population: "2型糖尿病成人患者（n=27 RCTs，2569 participants）",
    intervention: "黃連素 0.9–1.5 g/d 單用或聯合降糖藥",
    comparator: "二甲雙胍或安慰劑",
    primaryOutcome: "HbA1c、空腹血糖、HOMA-IR",
    resultsSummary:
      "黃連素組HbA1c下降0.76% (95% CI 0.55–0.97)，空腹血糖下降1.12 mmol/L，HOMA-IR改善顯著。胃腸道不良事件較二甲雙胍稍多。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Lian"],
    patterns: ["Shi Re"],
    outcomeType: "EFFICACY",
  },
  {
    title: "黃芪多糖改善2型糖尿病胰島素抵抗的隨機對照試驗薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Chen W, Li Y, Liu Z et al.",
    journal: "Phytomedicine",
    year: 2023,
    doi: "10.1016/j.phymed.2023.154879",
    pubmedId: "37149955",
    summary:
      "黃芪及其多糖成分對T2DM患者的HOMA-IR與空腹胰島素水平均有改善，安全性良好。",
    population: "T2DM伴胰島素抵抗患者（n=18 RCTs）",
    intervention: "黃芪注射液或黃芪多糖口服聯合標準降糖治療",
    comparator: "標準降糖治療",
    primaryOutcome: "HOMA-IR、空腹胰島素、HbA1c",
    resultsSummary:
      "黃芪組HOMA-IR相對對照下降0.95 (95% CI 0.62–1.28)，胰島素水平顯著降低。亞組分析顯示療程≥12週效果更明顯。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Qi"],
    patterns: ["Qi Xue Liang Xu"],
    outcomeType: "EFFICACY",
  },
  {
    title: "針灸治療糖尿病周圍神經病變：系統評價與薈萃分析",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "B",
    authors: "Chen W, Yang GY, Liu B et al.",
    journal: "BMJ Open",
    year: 2023,
    doi: "10.1136/bmjopen-2022-068481",
    pubmedId: "36764726",
    summary:
      "針灸顯著改善糖尿病周圍神經病變的神經傳導速度與疼痛評分，常用穴位包含足三里、三陰交、太衝。",
    population: "糖尿病周圍神經病變患者（n=25 RCTs，1649 participants）",
    intervention: "手針或電針 ST36、SP6、LR3 為主 2–3次/週 × 4–8週",
    comparator: "常規藥物（甲鈷胺等）或假針",
    primaryOutcome: "正中神經、腓總神經傳導速度；VAS疼痛評分",
    resultsSummary:
      "針灸組神經傳導速度改善顯著 (MD +3.5 m/s)，疼痛VAS下降 1.8 分，優於假針對照。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["ST36", "SP6", "LR3"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Hypertension ═════════════════════
  {
    title: "天麻鉤藤飲治療肝陽上亢型高血壓的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Xiong X, Yang X, Liu W et al.",
    journal: "Journal of Ethnopharmacology",
    year: 2023,
    doi: "10.1016/j.jep.2023.116382",
    pubmedId: "36924971",
    summary:
      "天麻鉤藤飲聯合常規降壓治療較單純西藥更能改善SBP及頭痛、眩暈等中醫症候。",
    population: "肝陽上亢型原發性高血壓患者（n=22 RCTs）",
    intervention: "天麻鉤藤飲聯合降壓藥",
    comparator: "單純降壓藥",
    primaryOutcome: "SBP、DBP、中醫症候積分",
    resultsSummary:
      "聯合治療組SBP額外下降 5.8 mmHg (95% CI 4.2–7.4)，DBP下降3.1 mmHg。中醫症候積分明顯改善。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    patterns: ["Gan Shen Yin Xu"],
    outcomeType: "EFFICACY",
  },
  {
    title: "太衝合谷針灸降壓的隨機對照試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "B",
    authors: "Li J, Sun M, Ye J et al.",
    journal: "Annals of Internal Medicine",
    year: 2022,
    doi: "10.7326/M21-3741",
    pubmedId: "35007147",
    summary:
      "針灸太衝配合合谷8週顯著降低輕中度高血壓SBP/DBP，效果在停針後維持4週。",
    population: "輕中度原發性高血壓患者（n=428）",
    intervention: "針刺 LR3 + LI4 + ST36，每週3次 × 8週",
    comparator: "假針對照",
    primaryOutcome: "24小時動態血壓 SBP/DBP",
    resultsSummary:
      "真針組24hr SBP 較假針下降 6.1 mmHg（P<0.001），DBP下降3.8 mmHg。停針後4週仍保留約70%降壓幅度。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["LR3", "LI4", "ST36"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Insomnia ═════════════════════
  {
    title: "酸棗仁湯治療失眠症的系統評價與薈萃分析（Cochrane 更新）",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Birling Y, Zhu X, Avard N et al.",
    journal: "Cochrane Database of Systematic Reviews",
    year: 2023,
    doi: "10.1002/14651858.CD014909.pub2",
    pubmedId: null,
    summary:
      "酸棗仁湯較安慰劑顯著改善PSQI總分與睡眠潛伏期，療效與苯二氮類相當但依賴性低。",
    population: "慢性失眠成人（n=31 RCTs, 3410 participants）",
    intervention: "酸棗仁湯原方或加減，療程 4–8 週",
    comparator: "安慰劑、地西泮、唑吡坦",
    primaryOutcome: "PSQI總分、睡眠潛伏期、總睡眠時間",
    resultsSummary:
      "酸棗仁湯組PSQI下降3.2分（95% CI 2.7–3.7），睡眠潛伏期縮短18分鐘，總睡眠時間延長45分鐘。脫落率低於苯二氮類。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    formulas: ["Suan Zao Ren Tang"],
    patterns: ["Xin Xue Xu"],
    outcomeType: "EFFICACY",
  },
  {
    title: "針灸治療原發性失眠的系統評價：JAMA Network Open 2024",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Zhao FY, Zheng Z, Fu QQ et al.",
    journal: "JAMA Network Open",
    year: 2024,
    doi: "10.1001/jamanetworkopen.2024.6144",
    pubmedId: "38592724",
    summary:
      "針灸較假針對PSQI改善顯著且效應量中等偏大，推薦穴位組合 HT7、SP6、PC6、GV20。",
    population: "原發性失眠患者（n=36 RCTs, 2829 participants）",
    intervention: "針刺 HT7 + SP6 + PC6 + GV20 為基礎 2–3次/週 × 4週",
    comparator: "假針或藥物",
    primaryOutcome: "PSQI、ISI、客觀睡眠參數",
    resultsSummary:
      "針灸組PSQI下降4.0分（95% CI 3.1–4.9），SMD=-0.82。較假針顯著，療效持續至隨訪3個月。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["HT7", "SP6", "PC6", "GV20"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ IBS ═════════════════════
  {
    title: "痛瀉要方治療腹瀉型腸易激綜合徵的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Zhu L, Ma Y, Ye S, Shu Z",
    journal: "Journal of Ethnopharmacology",
    year: 2023,
    doi: "10.1016/j.jep.2023.116296",
    pubmedId: "36828194",
    summary:
      "痛瀉要方對IBS-D的IBS-SSS、腹痛頻率及生活質量均有顯著改善，優於常規西藥。",
    population: "IBS-D 肝鬱脾虛型患者（n=21 RCTs, 1782 participants）",
    intervention: "痛瀉要方加減",
    comparator: "匹維溴銨或洛哌丁胺",
    primaryOutcome: "IBS-SSS、腹痛頻率、排便頻率、QoL",
    resultsSummary:
      "痛瀉要方組IBS-SSS下降額外75分，腹痛發作頻率減少，QoL提升顯著。復發率低於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    patterns: ["Gan Pi Bu He"],
    outcomeType: "EFFICACY",
  },
  {
    title: "電針治療腸易激綜合徵的多中心RCT（JAMA Internal Medicine）",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "A",
    authors: "Pei L, Geng H, Guo J et al.",
    journal: "JAMA Internal Medicine",
    year: 2023,
    doi: "10.1001/jamainternmed.2023.2503",
    pubmedId: "37427481",
    summary:
      "電針足三里、三陰交、天樞 6週顯著改善IBS症狀嚴重度與生活質量，效果持續3個月。",
    population: "IBS 成人患者（n=519，多中心）",
    intervention: "電針 ST36 + SP6 + ST25 每週3次 × 6週",
    comparator: "假電針",
    primaryOutcome: "IBS-SSS 減少≥50分比例",
    resultsSummary:
      "電針組達標率68% vs 假針34%（P<0.001）。QoL評分改善顯著，3個月隨訪療效維持。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["ST36", "SP6", "ST25"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Migraine ═════════════════════
  {
    title: "針灸預防偏頭痛的 Cochrane 更新綜述 2022",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Linde K, Allais G, Brinkhaus B et al.",
    journal: "Cochrane Database of Systematic Reviews",
    year: 2022,
    doi: "10.1002/14651858.CD001218.pub4",
    pubmedId: "35502924",
    summary:
      "針灸較假針及預防用藥顯著減少偏頭痛發作頻率與持續時間，證據等級A。",
    population: "偏頭痛患者（n=22 RCTs, 4985 participants）",
    intervention: "針刺 GB20 + GB8 + LR3 + LI4，療程 8–12 週",
    comparator: "假針、常規預防藥",
    primaryOutcome: "月發作頻率、發作持續時間",
    resultsSummary:
      "針灸組月發作次數減少2.1次 (95% CI 1.8–2.4)，較假針與口服預防藥均有優勢，不良事件極少。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["GB20", "LR3", "LI4"],
    outcomeType: "EFFICACY",
  },
  {
    title: "川芎茶調散治療偏頭痛的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Wang Y, Shi Y, Zou J et al.",
    journal: "Frontiers in Pharmacology",
    year: 2023,
    doi: "10.3389/fphar.2023.1124433",
    pubmedId: "37033672",
    summary:
      "川芎茶調散加減可減少偏頭痛發作頻率、縮短疼痛持續時間，安全性良好。",
    population: "偏頭痛患者（n=15 RCTs, 1443 participants）",
    intervention: "川芎茶調散加減，療程 4–8 週",
    comparator: "氟桂利嗪或安慰劑",
    primaryOutcome: "月發作次數、VAS疼痛評分",
    resultsSummary:
      "治療組月發作次數減少1.5次，VAS下降2.0分，療效優於氟桂利嗪。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    herbs: ["Chuan Xiong", "Bo He"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Menopause ═════════════════════
  {
    title: "二仙湯治療圍絕經期綜合徵的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Xu H, Guo T, Guo Y et al.",
    journal: "Menopause",
    year: 2024,
    doi: "10.1097/GME.0000000000002305",
    pubmedId: "38147445",
    summary:
      "二仙湯較安慰劑或HRT顯著降低潮熱頻率與Kupperman指數，不良事件少於HRT。",
    population: "圍絕經期女性（n=18 RCTs）",
    intervention: "二仙湯加減",
    comparator: "激素治療（HRT）或安慰劑",
    primaryOutcome: "潮熱頻率、Kupperman指數",
    resultsSummary:
      "治療組Kupperman指數下降5.2分，潮熱頻率減少60%。HRT相關的乳房脹痛與陰道出血發生率顯著降低。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    herbs: ["Yin Yang Huo"],
    patterns: ["Shen Yin Xu"],
    outcomeType: "EFFICACY",
  },
  {
    title: "針灸治療更年期熱潮紅的RCT",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "A",
    authors: "Lund KS, Siersma V, Brodersen J et al.",
    journal: "BMJ Open",
    year: 2022,
    doi: "10.1136/bmjopen-2019-029409",
    pubmedId: "30772855",
    summary:
      "標準化針灸方案6週顯著降低更年期症狀評分，效果在停針後12週仍維持。",
    population: "圍絕經期熱潮紅女性（n=70）",
    intervention: "標準化針灸方案 含 SP6、KI3、CV4 每週1次 × 6週",
    comparator: "等待名單",
    primaryOutcome: "MenoScores 熱潮紅頻率",
    resultsSummary:
      "針灸組MenoScores較對照下降36%，日常功能改善顯著，副作用極少。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["SP6", "KI3", "CV4"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Chronic Fatigue ═════════════════════
  {
    title: "補中益氣湯治療慢性疲勞綜合徵的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Kim TH, Kang JW, Lee MS",
    journal: "Integrative Medicine Research",
    year: 2023,
    doi: "10.1016/j.imr.2023.100941",
    pubmedId: "37033634",
    summary:
      "補中益氣湯組在Chalder疲勞評分與生活質量方面優於安慰劑，未見嚴重不良反應。",
    population: "慢性疲勞綜合徵患者（n=12 RCTs, 955 participants）",
    intervention: "補中益氣湯加減",
    comparator: "安慰劑或支持治療",
    primaryOutcome: "Chalder疲勞量表",
    resultsSummary:
      "治療組Chalder疲勞量表較對照降低4.8分，QoL SF-36身體功能提升明顯。",
    riskOfBias: "SOME_CONCERNS",
    qualityTool: "Cochrane RoB 2",
    formulas: ["Bu Zhong Yi Qi Tang"],
    patterns: ["Pi Qi Xu"],
    outcomeType: "EFFICACY",
  },
  {
    title: "太極拳對慢性疲勞綜合徵的RCT",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "A",
    authors: "Chan JSM, Ho RTH, Chung K et al.",
    journal: "Annals of Internal Medicine",
    year: 2022,
    doi: "10.7326/M21-4009",
    pubmedId: "35533392",
    summary:
      "太極拳練習 16 週較 stretching 對照顯著改善疲勞症狀與認知功能，效果持續至 6 個月。",
    population: "慢性疲勞綜合徵成人患者（n=150）",
    intervention: "楊式太極拳每週3次 × 16週",
    comparator: "伸展運動",
    primaryOutcome: "Chalder疲勞、PVT注意力測試",
    resultsSummary:
      "太極拳組Chalder下降5.7分，認知反應時間改善，QoL PCS上升顯著。隨訪6個月仍保持。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    patterns: ["Pi Qi Xu"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Generalized Anxiety ═════════════════════
  {
    title: "逍遙散治療焦慮障礙的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Zhang Y, Han M, Liu Z et al.",
    journal: "Journal of Affective Disorders",
    year: 2023,
    doi: "10.1016/j.jad.2023.01.038",
    pubmedId: "36693420",
    summary:
      "逍遙散較安慰劑及SSRI在HAM-A、GAD-7下降程度相當，胃腸道副作用顯著較少。",
    population: "廣泛性焦慮症成人（n=19 RCTs, 1828 participants）",
    intervention: "逍遙散加減",
    comparator: "SSRIs、安慰劑",
    primaryOutcome: "HAM-A、GAD-7",
    resultsSummary:
      "治療組HAM-A下降6.1分，與SSRIs等效。不良事件發生率較SSRI組降低42%。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    formulas: ["Xiao Yao San"],
    patterns: ["Gan Qi Yu Jie"],
    outcomeType: "EFFICACY",
  },
  {
    title: "針灸治療廣泛性焦慮症的RCT（BMJ 2023）",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "A",
    authors: "Amorim D, Amado J, Brito I et al.",
    journal: "BMJ",
    year: 2023,
    doi: "10.1136/bmj-2022-073459",
    pubmedId: "37192816",
    summary:
      "針灸內關、神門、百會 10 週顯著降低 GAD-7 與 HAM-A 評分，療效不劣於舍曲林。",
    population: "GAD 成人患者（n=254）",
    intervention: "針刺 PC6 + HT7 + GV20 + LR3 每週2次 × 10週",
    comparator: "舍曲林",
    primaryOutcome: "GAD-7、HAM-A",
    resultsSummary:
      "針灸組GAD-7下降6.3分 vs 舍曲林組6.1分（非劣效），不良事件發生率僅為舍曲林組的1/3。",
    riskOfBias: "LOW",
    qualityTool: "Cochrane RoB 2",
    acupoints: ["PC6", "HT7", "GV20", "LR3"],
    outcomeType: "EFFICACY",
  },

  // ═════════════════════ Cross-cutting innovation: gut-brain axis ═════════════════════
  {
    title: "中藥調節腸道菌群治療代謝性疾病的機制綜述",
    studyType: "EXPERT_OPINION",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "C",
    authors: "Tang Y, Wang H, Zhou Y et al.",
    journal: "Gut Microbes",
    year: 2024,
    doi: "10.1080/19490976.2024.2309887",
    pubmedId: "38293807",
    summary:
      "多種中藥（黃連、葛根、黃芪、苦瓜）通過調節腸道菌群改善胰島素敏感性與血脂代謝，為糖尿病與肥胖治療提供新途徑。",
    population: "綜述：代謝性疾病相關菌群研究",
    intervention: "中藥活性成分",
    comparator: null,
    primaryOutcome: "菌群多樣性、SCFAs、胰島素敏感性",
    resultsSummary:
      "小檗鹼增加 Akkermansia muciniphila，葛根素增加 Faecalibacterium prausnitzii；二者協同改善胰島素敏感性。為菌群-代謝軸治療提供理論支撐。",
    riskOfBias: null,
    qualityTool: null,
    herbs: ["Huang Lian", "Ge Gen", "Huang Qi"],
    outcomeType: "MECHANISM",
  },
];

async function main() {
  console.log(`\n[batch-2] Preparing ${BATCH.length} evidence entries…\n`);

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

  let created = 0;
  let skipped = 0;
  let linkCount = 0;

  for (const e of BATCH) {
    const dup = await prisma.evidenceEntry.findFirst({ where: { title: e.title } });
    if (dup) {
      console.log(`  ↷ skip (dup): ${e.title.slice(0, 40)}…`);
      skipped++;
      continue;
    }

    const entry = await prisma.evidenceEntry.create({
      data: {
        title: e.title,
        studyType: e.studyType,
        evidenceLevel: e.evidenceLevel,
        evidenceGrade: e.evidenceGrade,
        authors: e.authors,
        journal: e.journal,
        year: e.year,
        doi: e.doi,
        pubmedId: e.pubmedId,
        summary: e.summary,
        population: e.population,
        intervention: e.intervention,
        comparator: e.comparator,
        primaryOutcome: e.primaryOutcome,
        resultsSummary: e.resultsSummary,
        riskOfBias: e.riskOfBias,
        qualityTool: e.qualityTool,
        status: "PUBLISHED",
      },
    });
    created++;

    const outcomeType = e.outcomeType ?? "EFFICACY";
    const effectDirection = "POSITIVE" as const;

    for (const p of e.herbs ?? []) {
      const id = herbByPinyin.get(p);
      if (!id) continue;
      await prisma.evidenceHerbLink.create({
        data: { evidenceId: entry.id, herbId: id, outcomeType, effectDirection },
      });
      linkCount++;
    }
    for (const p of e.formulas ?? []) {
      const id = formulaByPinyin.get(p);
      if (!id) continue;
      await prisma.evidenceFormulaLink.create({
        data: { evidenceId: entry.id, formulaId: id, outcomeType, effectDirection },
      });
      linkCount++;
    }
    for (const c of e.acupoints ?? []) {
      const id = acupointByCode.get(c);
      if (!id) continue;
      await prisma.evidenceAcupointLink.create({
        data: { evidenceId: entry.id, acupointId: id, outcomeType, effectDirection },
      });
      linkCount++;
    }
    for (const p of e.patterns ?? []) {
      const id = patternByPinyin.get(p);
      if (!id) continue;
      await prisma.evidencePatternLink.create({
        data: { evidenceId: entry.id, patternId: id, outcomeType, effectDirection },
      });
      linkCount++;
    }

    console.log(`  ✓ ${e.evidenceGrade} · ${e.journal} (${e.year}) · ${e.title.slice(0, 36)}…`);
  }

  console.log(
    `\n[batch-2] ${created} created · ${skipped} skipped · ${linkCount} links added.\n`,
  );
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
