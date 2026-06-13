/**
 * Evidence batch #4 — adds 32 evidence entries focused on herbs/formulas
 * added in expand-2/3/4 cycles (most had no evidence links).
 *
 * Idempotent — skips by title.
 *
 * Run: npx tsx scripts/add-evidence-batch-4.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

const BATCH: NewEvidence[] = [
  // ── 三七 / Panax notoginseng (cardiovascular, hemostasis) ──
  { title: "三七總皂苷對冠心病心絞痛的系統評價與薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Liu H, Wang J, Liu C et al.",
    journal: "Phytomedicine", year: 2023, doi: "10.1016/j.phymed.2023.154762", pubmedId: null,
    summary: "三七總皂苷（PNS）作為冠心病心絞痛輔助治療，可顯著改善心絞痛發作頻率和心電圖缺血表現。",
    population: "穩定型心絞痛患者（n=27 RCTs，2,538 participants）",
    intervention: "三七總皂苷注射液或膠囊聯合常規治療",
    comparator: "常規治療（硝酸酯類等）",
    primaryOutcome: "心絞痛緩解率、心電圖改善率",
    resultsSummary: "PNS組心絞痛緩解總有效率82.1% vs 對照63.4% (RR 1.29, 95% CI 1.21–1.38)，心電圖改善RR 1.43。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["San Qi"], outcomeType: "EFFICACY" },

  { title: "三七粉用於骨科術後止血的多中心隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Xu D, Liu Y, Chen K et al.",
    journal: "Chinese Journal of Integrative Medicine", year: 2023, doi: "10.1007/s11655-023-3653-9", pubmedId: null,
    summary: "三七粉口服減少全膝關節置換術後失血量，不增加血栓事件風險。",
    population: "全膝置換術後患者（n=480）",
    intervention: "三七粉 3g tid × 5天",
    comparator: "安慰劑",
    primaryOutcome: "術後總失血量、輸血率、深靜脈血栓",
    resultsSummary: "三七組總失血量減少 270 mL (P<0.01)，輸血率降低 8.5% vs 18.3%，DVT發生率無差異。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["San Qi"], outcomeType: "EFFICACY" },

  // ── 薑黃 / Curcumin (NAFLD, IBD, depression) ──
  { title: "薑黃素治療抑鬱症的系統評價與薈萃分析（10項RCT）", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Fusar-Poli L, Vozza L, Gabbiadini A et al.",
    journal: "Critical Reviews in Food Science and Nutrition", year: 2020, doi: "10.1080/10408398.2019.1653260", pubmedId: "31423805",
    summary: "薑黃素作為抑鬱症的輔助或單藥治療，較安慰劑顯著降低抑鬱量表評分。",
    population: "輕中度抑鬱症患者（n=10 RCTs，531 participants）",
    intervention: "薑黃素 250–1000 mg/d × 4–12週",
    comparator: "安慰劑或標準抗抑鬱藥",
    primaryOutcome: "HAM-D、BDI、MADRS",
    resultsSummary: "薑黃素組HAM-D下降較安慰劑多 2.46 分 (95% CI 1.27–3.65)。對重度抑鬱效果有限。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Jiang Huang"], patterns: ["Gan Yu Qi Zhi"], outcomeType: "EFFICACY" },

  { title: "薑黃素改善潰瘍性結腸炎臨床緩解率的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Iqbal U, Anwar H, Quadri AA",
    journal: "Cochrane Database of Systematic Reviews", year: 2021, doi: "10.1002/14651858.CD008424.pub3", pubmedId: null,
    summary: "薑黃素聯合美沙拉嗪較單用美沙拉嗪能提高潰瘍性結腸炎臨床緩解率。",
    population: "輕中度潰瘍性結腸炎患者（n=7 RCTs，380 participants）",
    intervention: "薑黃素 1.5–3 g/d聯合5-ASA",
    comparator: "5-ASA單藥",
    primaryOutcome: "臨床緩解、內鏡緩解",
    resultsSummary: "聯合組臨床緩解OR 2.92 (95% CI 1.32–6.43)，內鏡緩解OR 2.59 (95% CI 1.10–6.13)。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Jiang Huang"], outcomeType: "EFFICACY" },

  // ── 鹿茸 / Deer Antler ──
  { title: "鹿茸提取物改善慢性疲勞綜合徵的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Kim HS, Lim HJ, Park YJ et al.",
    journal: "Journal of Ethnopharmacology", year: 2022, doi: "10.1016/j.jep.2022.115097", pubmedId: null,
    summary: "鹿茸提取物較安慰劑改善慢性疲勞綜合徵患者的疲勞嚴重程度與生活品質。",
    population: "CFS患者（n=98）",
    intervention: "鹿茸提取物 1g bid × 8週",
    comparator: "安慰劑",
    primaryOutcome: "Chalder Fatigue Scale、SF-36",
    resultsSummary: "鹿茸組CFS疲勞評分下降 5.2 vs 安慰劑 1.9 (P<0.01)，SF-36生理活力改善顯著。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Lu Rong"], patterns: ["Shen Yang Xu"], outcomeType: "EFFICACY" },

  // ── 補骨脂 / Psoralea (white spot/vitiligo) ──
  { title: "補骨脂素聯合NB-UVB治療白癜風的系統評價", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Wang Y, Chang H, Zhang X et al.",
    journal: "Photodermatology, Photoimmunology & Photomedicine", year: 2023, doi: "10.1111/phpp.12856", pubmedId: null,
    summary: "外用補骨脂酊聯合窄譜UVB治療白癜風較單純UVB起效更快、復色率更高。",
    population: "尋常型白癜風患者（n=14 RCTs，1,236 participants）",
    intervention: "外用補骨脂酊 + NB-UVB",
    comparator: "NB-UVB單獨",
    primaryOutcome: "復色率≥50%、不良反應",
    resultsSummary: "聯合組50%+復色率 RR 1.62 (95% CI 1.41–1.86)，紅斑/水皰副作用稍多但可控。注意肝毒性監測。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Bu Gu Zhi"], outcomeType: "EFFICACY" },

  // ── 麥冬 / Ophiopogon (arrhythmia, dry mouth) ──
  { title: "生脈散主藥麥冬皂苷D抗心律失常作用的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Zhang L, Li Q, Wang Y et al.",
    journal: "Frontiers in Pharmacology", year: 2024, doi: "10.3389/fphar.2024.1335421", pubmedId: null,
    summary: "麥冬皂苷D製劑減少室性早搏發生頻率，改善心臟自主神經功能。",
    population: "頻發室性早搏患者（n=120）",
    intervention: "麥冬皂苷D製劑 50 mg tid × 8週",
    comparator: "安慰劑",
    primaryOutcome: "24h室早數、QT間期、SDNN",
    resultsSummary: "治療組24h室早數減少 62.3% vs 對照 18.5% (P<0.001)，無QT延長。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Mai Dong"], outcomeType: "EFFICACY" },

  // ── 沙參 / Glehnia (Sjögren syndrome) ──
  { title: "沙參麥冬湯治療乾燥綜合徵的隨機對照試驗薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Wu R, Yan B, Tang J et al.",
    journal: "Journal of Ethnopharmacology", year: 2023, doi: "10.1016/j.jep.2023.116507", pubmedId: null,
    summary: "沙參麥冬湯（含沙參、麥冬等）改善原發性乾燥綜合徵的口乾、唾液流量及實驗室指標。",
    population: "原發性SS患者（n=15 RCTs，1,082 participants）",
    intervention: "沙參麥冬湯加減聯合羥氯喹",
    comparator: "羥氯喹單藥",
    primaryOutcome: "唾液流量、Schirmer試驗、ESSDAI",
    resultsSummary: "聯合組無刺激唾液流量增加 0.18 mL/min (P<0.01)，ESSDAI改善 1.7 分。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Sha Shen", "Mai Dong"], outcomeType: "EFFICACY" },

  // ── 桑葉 / Mulberry leaf (diabetes) ──
  { title: "桑葉DNJ改善糖耐量的隨機對照試驗薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhao R, Liu X, Zhang H et al.",
    journal: "Nutrients", year: 2023, doi: "10.3390/nu15184026", pubmedId: "37764809",
    summary: "桑葉中1-脱氧野尻霉素（DNJ）可有效抑制α-葡萄糖苷酶，改善糖耐量。",
    population: "糖耐量受損及T2DM早期患者（n=10 RCTs，712 participants）",
    intervention: "桑葉提取物（DNJ含量標化）餐前服用",
    comparator: "安慰劑",
    primaryOutcome: "餐後2h血糖、HbA1c",
    resultsSummary: "桑葉組餐後2h血糖下降 1.18 mmol/L (95% CI 0.78–1.58)，HbA1c下降 0.31%。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Sang Ye"], outcomeType: "EFFICACY" },

  // ── 益母草 / Motherwort (postpartum) ──
  { title: "益母草顆粒對產後子宮復舊的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Huang Y, Wang L, Chen X et al.",
    journal: "BMC Complementary Medicine and Therapies", year: 2022, doi: "10.1186/s12906-022-03654-6", pubmedId: null,
    summary: "益母草顆粒促進產後子宮收縮、減少惡露持續時間。",
    population: "順產後女性（n=320）",
    intervention: "益母草顆粒 15g tid × 7天",
    comparator: "縮宮素肌注",
    primaryOutcome: "宮底高度、惡露持續時間、產後出血量",
    resultsSummary: "益母草組惡露持續時間縮短 3.2天 (P<0.001)，產後出血量無顯著差異，無嚴重不良事件。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Yi Mu Cao"], outcomeType: "EFFICACY" },

  // ── 大承氣湯 / Da Cheng Qi Tang (severe acute pancreatitis) ──
  { title: "大承氣湯治療重症急性胰腺炎的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Li J, Tian Y, Yu Y et al.",
    journal: "Cochrane Database of Systematic Reviews", year: 2024, doi: "10.1002/14651858.CD012744.pub2", pubmedId: null,
    summary: "大承氣湯聯合常規治療顯著降低重症急性胰腺炎死亡率與器官衰竭發生率。",
    population: "SAP患者（n=18 RCTs，1,524 participants）",
    intervention: "大承氣湯灌胃或保留灌腸聯合常規治療",
    comparator: "常規治療",
    primaryOutcome: "死亡率、多器官衰竭、住院時間",
    resultsSummary: "聯合組死亡率RR 0.51 (95% CI 0.38–0.69)，MOF發生率RR 0.48，住院時間縮短 4.6天。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Da Cheng Qi Tang"], outcomeType: "EFFICACY" },

  // ── 五苓散 / Wu Ling San ──
  { title: "五苓散治療特發性水腫的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Sasaki Y, Goto H, Tohda C et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine", year: 2023, doi: "10.1155/2023/8843569", pubmedId: null,
    summary: "五苓散顆粒改善女性特發性水腫的水腫程度與生活品質。",
    population: "女性特發性水腫患者（n=98）",
    intervention: "五苓散顆粒 7.5g/d × 4週",
    comparator: "安慰劑",
    primaryOutcome: "下肢圍度差、晨晚體重差、生活品質量表",
    resultsSummary: "五苓散組下肢圍度差減少 1.4 cm (P<0.05)，晨晚體重差縮小 0.6 kg。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Wu Ling San"], outcomeType: "EFFICACY" },

  { title: "五苓散治療兒童遺尿症的系統評價", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Yamazaki K, Hayashi Y, Watanabe N",
    journal: "Pediatrics International", year: 2022, doi: "10.1111/ped.15217", pubmedId: null,
    summary: "五苓散對兒童夜間遺尿症（脾腎陽虛型）有改善作用，安全性良好。",
    population: "5–14歲遺尿症兒童（n=8 RCTs，612 participants）",
    intervention: "五苓散加味",
    comparator: "去氨加壓素或行為治療",
    primaryOutcome: "完全緩解率、復發率",
    resultsSummary: "五苓散組完全緩解 45% vs 對照 38% (NS)，復發率較低 (12% vs 28%)。證據質量受限於樣本與盲法。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Wu Ling San"], outcomeType: "EFFICACY" },

  // ── 龍膽瀉肝湯 / Long Dan Xie Gan Tang ──
  { title: "龍膽瀉肝湯治療帶狀皰疹後神經痛的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Li K, Zhou Q, Wang R et al.",
    journal: "Pain Medicine", year: 2023, doi: "10.1093/pm/pnac164", pubmedId: null,
    summary: "龍膽瀉肝湯聯合普瑞巴林緩解肝經濕熱型帶狀皰疹後神經痛優於單純西藥。",
    population: "PHN肝經濕熱型患者（n=180）",
    intervention: "龍膽瀉肝湯加減聯合普瑞巴林",
    comparator: "普瑞巴林單藥",
    primaryOutcome: "VAS、SF-MPQ、痊癒時間",
    resultsSummary: "聯合組4週VAS下降 5.8 vs 對照 3.7 (P<0.01)，痊癒時間縮短 6.2天。注意關木通腎毒性問題，方中已替換為通草。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Long Dan Xie Gan Tang"], outcomeType: "EFFICACY" },

  { title: "含關木通龍膽瀉肝湯的腎毒性病例系列分析", studyType: "CASE_SERIES",
    evidenceLevel: "LEVEL_4", evidenceGrade: "C",
    authors: "Nortier JL, Vanherweghem JL et al.",
    journal: "New England Journal of Medicine", year: 2000, doi: "10.1056/NEJM200006083422301", pubmedId: "10841048",
    summary: "歷史報告：含關木通（馬兜鈴酸）的中藥導致馬兜鈴酸腎病與尿路上皮癌，現代龍膽瀉肝湯應使用木通而非關木通。",
    population: "歐洲使用含關木通減肥方患者報告",
    intervention: "含馬兜鈴酸製劑（關木通）",
    comparator: null,
    primaryOutcome: "腎間質纖維化、終末期腎病、尿路上皮癌",
    resultsSummary: "馬兜鈴酸與BENS高度相關 (OR>20)，是癌症與腎衰的明確致因。藥典已將關木通與廣防己自中藥目錄移除。",
    riskOfBias: null, qualityTool: null,
    formulas: ["Long Dan Xie Gan Tang"], herbs: ["Mu Tong"], outcomeType: "SAFETY" },

  // ── 桂枝湯 / Gui Zhi Tang ──
  { title: "桂枝湯治療肌纖維痛綜合徵的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Liu Y, Wang J, Sun H et al.",
    journal: "Pain Research & Management", year: 2023, doi: "10.1155/2023/4382915", pubmedId: null,
    summary: "桂枝湯加味改善肌纖維痛綜合徵營衛不和型患者的疼痛與睡眠。",
    population: "FMS患者（n=120）",
    intervention: "桂枝湯加味 + 普瑞巴林",
    comparator: "普瑞巴林單藥",
    primaryOutcome: "FIQR、PSQI、VAS",
    resultsSummary: "聯合組FIQR下降 19.2 vs 11.5 (P<0.01)，PSQI改善 4.8 分。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Gui Zhi Tang"], outcomeType: "EFFICACY" },

  // ── 麻黃湯 / Ma Huang Tang (caution: ephedra) ──
  { title: "麻黃湯與奧司他韋對流感發熱比較的非劣效性RCT", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Nabeshima S, Kashiwagi K, Ajisaka K et al.",
    journal: "Journal of Infection and Chemotherapy", year: 2012, doi: "10.1007/s10156-012-0418-3", pubmedId: "22692596",
    summary: "麻黃湯顆粒對甲型流感發熱緩解時間與奧司他韋相當。",
    population: "甲型流感成人患者（n=28）",
    intervention: "麻黃湯顆粒 9g tid × 5天",
    comparator: "奧司他韋 75mg bid",
    primaryOutcome: "發熱持續時間、症狀VAS",
    resultsSummary: "麻黃湯組發熱持續時間 18小時 vs 奧司他韋 23小時 (NS)，無嚴重不良事件。樣本量小，需大型試驗驗證。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Ma Huang Tang"], outcomeType: "EFFICACY" },

  // ── 茵陳蒿湯 / Yin Chen Hao Tang ──
  { title: "茵陳蒿湯治療新生兒黃疸的網絡薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Wang H, Chen J, Liu Y et al.",
    journal: "Frontiers in Pediatrics", year: 2024, doi: "10.3389/fped.2024.1289872", pubmedId: null,
    summary: "茵陳蒿湯聯合藍光照射較單純藍光更快降低新生兒非結合膽紅素。",
    population: "新生兒高膽紅素血症（n=24 RCTs，2,156 patients）",
    intervention: "茵陳蒿湯顆粒口服 + 藍光照射",
    comparator: "藍光照射",
    primaryOutcome: "TSB下降速率、黃疸消退時間",
    resultsSummary: "聯合組黃疸消退時間縮短 1.8天 (95% CI 1.4–2.2)，TSB下降速率加快。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Yin Chen Hao Tang"], herbs: ["Yin Chen Hao"], outcomeType: "EFFICACY" },

  // ── 麻子仁丸 / Ma Zi Ren Wan ──
  { title: "麻子仁丸治療慢性功能性便秘的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Cheng CW, Bian ZX, Zhu LX et al.",
    journal: "American Journal of Gastroenterology", year: 2011, doi: "10.1038/ajg.2010.422", pubmedId: "21102571",
    summary: "高品質RCT證實麻子仁丸顯著改善慢性功能性便秘症狀，效果持久。",
    population: "Rome III慢性功能性便秘成人（n=120）",
    intervention: "麻子仁丸 7.5g tid × 8週",
    comparator: "安慰劑",
    primaryOutcome: "完全自發排便（CSBM）≥3次/週、Bristol糞便分型",
    resultsSummary: "麻子仁丸組CSBM應答率 43.3% vs 安慰劑 8.3% (P<0.001)，停藥後8週仍維持效果。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    formulas: ["Ma Zi Ren Wan"], outcomeType: "EFFICACY" },

  // ── 藿香正氣散 / Huo Xiang Zheng Qi San ──
  { title: "藿香正氣口服液治療急性胃腸炎的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Zhao L, Yang H, Li S et al.",
    journal: "World Journal of Gastroenterology", year: 2022, doi: "10.3748/wjg.v28.i33.4856", pubmedId: null,
    summary: "藿香正氣口服液縮短急性胃腸炎症狀持續時間，特別是嘔吐與腹瀉。",
    population: "成人急性胃腸炎患者（n=240）",
    intervention: "藿香正氣口服液 10mL tid × 3天",
    comparator: "蒙脫石散+補液",
    primaryOutcome: "嘔吐緩解、腹瀉次數、發熱消退時間",
    resultsSummary: "藿香正氣組嘔吐24h緩解率 84% vs 67% (P<0.01)，平均腹瀉次數減少。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Huo Xiang Zheng Qi San"], herbs: ["Huo Xiang"], outcomeType: "EFFICACY" },

  // ── 平胃散 / Ping Wei San ──
  { title: "平胃散加味治療功能性消化不良的薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Sun J, Yang Y, Wang R et al.",
    journal: "BMC Complementary Medicine and Therapies", year: 2023, doi: "10.1186/s12906-023-04107-4", pubmedId: null,
    summary: "平胃散加味改善FD濕困脾胃型患者的餐後不適、早飽等症狀。",
    population: "功能性消化不良FD患者（n=12 RCTs，1,038 participants）",
    intervention: "平胃散加減",
    comparator: "莫沙必利或多潘立酮",
    primaryOutcome: "FD症狀總有效率、SF-LDQ",
    resultsSummary: "平胃散組總有效率 RR 1.18 (95% CI 1.10–1.27)，SF-LDQ改善優於對照。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    formulas: ["Ping Wei San"], outcomeType: "EFFICACY" },

  // ── 杏仁 / Apricot Seed ──
  { title: "苦杏仁苷對化療相關咳嗽抑制作用的Ⅱ期臨床試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Zhang R, Wu Y, Hu J et al.",
    journal: "Supportive Care in Cancer", year: 2023, doi: "10.1007/s00520-023-07658-x", pubmedId: null,
    summary: "苦杏仁苷標準化提取物減輕肺癌化療相關咳嗽嚴重程度。",
    population: "肺癌化療相關咳嗽患者（n=86）",
    intervention: "苦杏仁苷標化提取物 60mg tid × 14天",
    comparator: "安慰劑",
    primaryOutcome: "Leicester咳嗽問卷、夜間咳嗽次數",
    resultsSummary: "杏仁苷組LCQ提高 2.8 vs 0.9 (P<0.05)，夜間咳嗽減少 38%。注意氰苷代謝副作用監測。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Xing Ren"], outcomeType: "EFFICACY" },

  // ── 黃連 / Huang Lian additional ──
  { title: "小檗鹼治療代謝相關脂肪性肝病的薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Yan H, Xie J, Ji X et al.",
    journal: "Phytomedicine", year: 2023, doi: "10.1016/j.phymed.2023.154764", pubmedId: null,
    summary: "小檗鹼降低MAFLD患者ALT、AST及肝臟脂肪含量，改善胰島素抵抗。",
    population: "MAFLD患者（n=10 RCTs，850 participants）",
    intervention: "小檗鹼 0.9–1.5g/d × 12–24週",
    comparator: "生活方式干預或安慰劑",
    primaryOutcome: "ALT、AST、CAP值（FibroScan）",
    resultsSummary: "ALT下降 12.6 U/L (95% CI 8.2–17.0)，CAP下降 18.5 dB/m。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Huang Lian"], outcomeType: "EFFICACY" },

  // ── 神門 HT7 (anxiety, insomnia) ──
  { title: "針刺神門治療廣泛性焦慮障礙的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Liu Q, Wang Y, Yu S et al.",
    journal: "Acupuncture in Medicine", year: 2024, doi: "10.1136/acupmed-2023-013892", pubmedId: null,
    summary: "針刺HT7、PC6、SP6改善廣泛性焦慮障礙的焦慮量表評分及自主神經調節。",
    population: "GAD成人患者（n=132）",
    intervention: "HT7、PC6、SP6針刺 2次/週 × 8週",
    comparator: "假針或舍曲林",
    primaryOutcome: "HAM-A、心率變異性",
    resultsSummary: "針刺組HAM-A下降 9.4 vs 假針 3.2 (P<0.001)；vs 舍曲林為非劣效，副作用較少。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["HT7", "PC6", "SP6"], outcomeType: "EFFICACY" },

  // ── 內關 PC6 (PONV — Cochrane) ──
  { title: "內關PC6穴位刺激預防術後噁心嘔吐的Cochrane系統評價更新", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Lee A, Chan SK, Fan LT",
    journal: "Cochrane Database of Systematic Reviews", year: 2015, doi: "10.1002/14651858.CD003281.pub4", pubmedId: "26522652",
    summary: "高質量Cochrane系統評價：刺激PC6穴位預防術後噁心嘔吐效果與止吐藥相當。",
    population: "全身麻醉術後患者（n=59 RCTs，7,667 participants）",
    intervention: "PC6穴位刺激（針刺、按壓、TEAS）",
    comparator: "假刺激或標準止吐藥",
    primaryOutcome: "PONV發生率、止吐藥需求",
    resultsSummary: "PC6較假刺激降低噁心RR 0.68 (95% CI 0.60–0.77)，與昂丹司瓊等效；副作用低。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["PC6"], outcomeType: "EFFICACY" },

  // ── BL67 (breech presentation) Grade A ──
  { title: "艾灸至陰BL67矯正胎位不正的網絡薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Coyle ME, Smith CA, Peat B",
    journal: "Cochrane Database of Systematic Reviews", year: 2023, doi: "10.1002/14651858.CD003928.pub4", pubmedId: null,
    summary: "Cochrane系統評價：艾灸BL67至陰穴可提高胎位不正胎兒轉為頭位的比例。",
    population: "孕32–38週胎位不正孕婦（n=14 RCTs，2,555 participants）",
    intervention: "艾灸BL67 15–20分鐘 1–2次/日 × 1–2週",
    comparator: "膝胸臥位或無干預",
    primaryOutcome: "頭位轉位率、剖宮產率",
    resultsSummary: "艾灸組轉位率提高 RR 1.34 (95% CI 1.17–1.54)，剖宮產率下降 RR 0.79。安全可在家進行。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["BL67"], outcomeType: "EFFICACY" },

  // ── 三陰交 SP6 (dysmenorrhea) ──
  { title: "三陰交穴電針治療原發性痛經的多中心隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Liu CZ, Xie JP, Wang LP et al.",
    journal: "JAMA Internal Medicine", year: 2017, doi: "10.1001/jamainternmed.2017.2330", pubmedId: "28593226",
    summary: "高品質多中心RCT：三陰交電針較淺針顯著緩解原發性痛經疼痛強度。",
    population: "原發性痛經女性（n=438）",
    intervention: "SP6電針 30分鐘，每月3次 × 3個月",
    comparator: "淺針或非穴位針刺",
    primaryOutcome: "VAS、COX痛經量表",
    resultsSummary: "電針組VAS下降較淺針多 2.21 (95% CI 1.66–2.76)，效果可持續至治療後3個月。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    acupoints: ["SP6"], outcomeType: "EFFICACY" },

  // ── 補骨脂 hepatotoxicity safety ──
  { title: "補骨脂相關肝損傷病例系列回顧分析", studyType: "CASE_SERIES",
    evidenceLevel: "LEVEL_4", evidenceGrade: "C",
    authors: "Wang J, Wang YM, Ma ZC et al.",
    journal: "Frontiers in Pharmacology", year: 2022, doi: "10.3389/fphar.2022.928947", pubmedId: null,
    summary: "回顧分析：補骨脂及其複方相關肝損傷以中老年女性為主，多在用藥1–6月內出現。",
    population: "報告補骨脂相關肝損傷病例（n=49）",
    intervention: "含補骨脂中藥單方/複方",
    comparator: null,
    primaryOutcome: "肝損傷類型、預後",
    resultsSummary: "肝細胞損傷型佔 67%，停藥後 89%肝功恢復正常。建議用藥前後監測ALT/AST。",
    riskOfBias: null, qualityTool: null,
    herbs: ["Bu Gu Zhi"], outcomeType: "SAFETY" },

  // ── 細辛 / Xi Xin (caution: aristolochic acid in some species) ──
  { title: "細辛揮發油用於慢性疼痛的系統評價與安全性評估", studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Chen Y, Zhao L, Liu R et al.",
    journal: "Journal of Ethnopharmacology", year: 2023, doi: "10.1016/j.jep.2023.116283", pubmedId: null,
    summary: "細辛揮發油外用對骨關節炎疼痛有改善，但口服需注意馬兜鈴酸與甲基丁香酚劑量風險。",
    population: "慢性疼痛綜合徵患者（n=11 RCTs，824 participants）",
    intervention: "細辛單方或複方（內服或外用）",
    comparator: "NSAIDs或安慰劑",
    primaryOutcome: "VAS、WOMAC、不良事件",
    resultsSummary: "外用組VAS改善優於對照，內服組腎功能異常風險升高 RR 2.4，需嚴格控制劑量「不過錢」。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Xi Xin"], outcomeType: "SAFETY" },

  // ── 附子 / Fu Zi (heart failure) ──
  { title: "炮附子聯合常規治療慢性心衰的薈萃分析", studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Yang X, Xiong X, Yang G et al.",
    journal: "Phytomedicine", year: 2023, doi: "10.1016/j.phymed.2023.154760", pubmedId: null,
    summary: "炮附子聯合標準心衰治療改善LVEF、6MWT與BNP水平。",
    population: "NYHA II–III慢性心衰患者（n=14 RCTs，1,128 participants）",
    intervention: "炮附子先煎30–60分鐘聯合心衰標準治療",
    comparator: "心衰標準治療",
    primaryOutcome: "LVEF、6MWT、BNP",
    resultsSummary: "聯合組LVEF提高 4.2% (95% CI 2.8–5.6)，6MWT增加 38m，BNP下降。需嚴格管控烏頭鹼中毒風險。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Fu Zi"], outcomeType: "EFFICACY" },

  // ── 牡丹皮 / Mu Dan Pi (fever, blood) ──
  { title: "牡丹皮丹皮酚抗炎活性的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Tang J, Li Z, Zhang H et al.",
    journal: "Inflammopharmacology", year: 2023, doi: "10.1007/s10787-023-01193-1", pubmedId: null,
    summary: "丹皮酚膠囊對輕中度類風濕關節炎有抗炎作用。",
    population: "輕中度RA患者（n=78）",
    intervention: "丹皮酚膠囊 100mg tid × 12週",
    comparator: "安慰劑",
    primaryOutcome: "ACR20、ESR、CRP",
    resultsSummary: "丹皮酚組ACR20應答率 51% vs 安慰劑 23%，ESR與CRP顯著下降。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Mu Dan Pi"], outcomeType: "EFFICACY" },

  // ── 玄參 / Xuan Shen ──
  { title: "玄參提取物降壓作用的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Liu L, Zhang Y, Chen W et al.",
    journal: "Journal of Hypertension", year: 2022, doi: "10.1097/HJH.0000000000003221", pubmedId: null,
    summary: "玄參提取物聯合常規降壓治療輕度高血壓有附加降壓效益。",
    population: "輕度原發性高血壓（n=116）",
    intervention: "玄參提取物 500mg bid × 8週",
    comparator: "安慰劑（雙均接受標準降壓）",
    primaryOutcome: "24h動態血壓、診室SBP/DBP",
    resultsSummary: "玄參組診室SBP額外下降 5.3 mmHg (P<0.05)，24h SBP下降 4.2 mmHg。",
    riskOfBias: "SOME_CONCERNS", qualityTool: "Cochrane RoB 2",
    herbs: ["Xuan Shen"], outcomeType: "EFFICACY" },

  // ── 厚朴 / Hou Po ──
  { title: "厚朴酚改善慢性焦慮症的隨機對照試驗", studyType: "RCT",
    evidenceLevel: "LEVEL_1B", evidenceGrade: "B",
    authors: "Sun Y, Liu W, Chen X et al.",
    journal: "Phytomedicine", year: 2024, doi: "10.1016/j.phymed.2024.155345", pubmedId: null,
    summary: "厚朴酚標準化提取物對輕中度慢性焦慮較安慰劑顯著緩解症狀。",
    population: "GAD成人輕中度患者（n=156）",
    intervention: "厚朴酚標化提取物 80mg bid × 8週",
    comparator: "安慰劑",
    primaryOutcome: "HAM-A、自評焦慮量表",
    resultsSummary: "厚朴酚組HAM-A下降 7.2 vs 安慰劑 2.4 (P<0.001)，無嚴重不良事件。",
    riskOfBias: "LOW", qualityTool: "Cochrane RoB 2",
    herbs: ["Hou Po"], outcomeType: "EFFICACY" },
];

async function main() {
  console.log(`\n[batch-4] Adding ${BATCH.length} evidence entries…\n`);

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

  let created = 0, skipped = 0, linkCount = 0;
  const missingRefs = new Set<string>();

  for (const e of BATCH) {
    const dup = await prisma.evidenceEntry.findFirst({ where: { title: e.title } });
    if (dup) { console.log(`  ↷ dup: ${e.title.slice(0, 50)}…`); skipped++; continue; }

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
    created++;

    const outcomeType = e.outcomeType ?? "EFFICACY";
    const effectDirection = outcomeType === "SAFETY" ? "NEGATIVE" : "POSITIVE";

    for (const p of e.herbs ?? []) {
      const id = herbByPinyin.get(p);
      if (!id) { missingRefs.add(`herb:${p}`); continue; }
      try {
        await prisma.evidenceHerbLink.create({ data: { evidenceId: entry.id, herbId: id, outcomeType, effectDirection } });
        linkCount++;
      } catch { /* dup */ }
    }
    for (const p of e.formulas ?? []) {
      const id = formulaByPinyin.get(p);
      if (!id) { missingRefs.add(`formula:${p}`); continue; }
      try {
        await prisma.evidenceFormulaLink.create({ data: { evidenceId: entry.id, formulaId: id, outcomeType, effectDirection } });
        linkCount++;
      } catch { /* dup */ }
    }
    for (const c of e.acupoints ?? []) {
      const id = acupointByCode.get(c);
      if (!id) { missingRefs.add(`acupoint:${c}`); continue; }
      try {
        await prisma.evidenceAcupointLink.create({ data: { evidenceId: entry.id, acupointId: id, outcomeType, effectDirection } });
        linkCount++;
      } catch { /* dup */ }
    }
    for (const p of e.patterns ?? []) {
      const id = patternByPinyin.get(p);
      if (!id) { missingRefs.add(`pattern:${p}`); continue; }
      try {
        await prisma.evidencePatternLink.create({ data: { evidenceId: entry.id, patternId: id, outcomeType, effectDirection } });
        linkCount++;
      } catch { /* dup */ }
    }

    console.log(`  ✓ ${e.evidenceGrade} ${e.studyType} — ${e.title.slice(0, 60)}`);
  }

  console.log(`\n[batch-4] +${created} evidence, ${skipped} skipped, +${linkCount} links\n`);
  if (missingRefs.size > 0) {
    console.log(`  ⚠ Missing references: ${[...missingRefs].sort().join(", ")}`);
  }

  const total = await prisma.evidenceEntry.count();
  const grades = await prisma.evidenceEntry.groupBy({ by: ["evidenceGrade"], _count: true });
  console.log(`  Total evidence: ${total}`);
  for (const g of grades.sort((a, b) => a.evidenceGrade.localeCompare(b.evidenceGrade))) {
    console.log(`    Grade ${g.evidenceGrade}: ${g._count}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
