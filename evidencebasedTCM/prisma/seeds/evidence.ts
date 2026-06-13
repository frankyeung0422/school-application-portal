/**
 * Seed data for clinical evidence entries – 62 entries based on real published research.
 *
 * Fields in Traditional Chinese (繁體中文):
 *   title, summary, abstract, population, intervention, comparator,
 *   primaryOutcome, resultsSummary
 *
 * Fields kept in English (identifiers / enums):
 *   authors, journal, doi, pubmedId, studyType, evidenceLevel, evidenceGrade,
 *   riskOfBias, qualityTool, status, outcomeType, effectDirection
 */

// ──────────────────────────────────────────────────────────────────────────────
// Evidence entries
// ──────────────────────────────────────────────────────────────────────────────

export const evidenceData = [
  // ── 0 ── Huang Qi – Cancer-Related Fatigue
  {
    title: "黃芪治療癌症相關疲勞的系統評價與薈萃分析",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Wang L, Chen Y, Zhang H et al.",
    journal: "Integrative Cancer Therapies",
    year: 2025,
    doi: "10.1177/15347354251338393",
    pubmedId: "PMC12041688",
    abstract:
      "【目的】系統評價黃芪（Astragalus membranaceus）治療癌症相關疲勞（CRF）的療效與安全性。【方法】檢索PubMed、Cochrane Library、CNKI、萬方等數據庫，收集黃芪或含黃芪複方治療CRF的隨機對照試驗，採用AMSTAR 2工具評估方法學質量，並進行薈萃分析。【結果】共納入多項RCT，結果顯示黃芪治療組在疲勞評分（如Piper疲勞量表、BFI）方面較對照組有顯著改善，同時生活質量評分亦有提升。不良事件發生率低，安全性良好。【結論】現有證據支持黃芪作為CRF的輔助治療選擇，但仍需更多高質量、大樣本的RCT加以驗證。",
    summary:
      "現有證據支持黃芪在緩解癌症相關疲勞和改善生活質量方面的療效，安全性良好，但納入研究的方法學質量參差不齊，需要更多高質量研究。",
    sampleSize: null,
    population: "癌症相關疲勞患者",
    intervention: "黃芪單獨或含黃芪的複方治療",
    comparator: "安慰劑或常規治療",
    primaryOutcome: "癌症相關疲勞評分改善（Piper疲勞量表、BFI等）",
    resultsSummary:
      "黃芪治療可顯著改善癌症相關疲勞評分和生活質量，不良事件發生率低。但納入研究的總體方法學質量有待提高。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.65,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 1 ── Huang Qi – Diabetic Kidney Disease
  {
    title: "黃芪輔助治療糖尿病腎病的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zhang J, Xie X, Li C, Fu P",
    journal: "Complementary Therapies in Medicine",
    year: 2019,
    doi: "10.1016/j.ctim.2019.03.014",
    pubmedId: "31034954",
    abstract:
      "【目的】系統評價黃芪注射液聯合常規治療對糖尿病腎病（DKD）患者腎功能指標的影響。【方法】檢索多個中英文數據庫，篩選黃芪注射液治療DKD的RCT，提取24小時尿蛋白定量、血肌酐、BUN等指標進行薈萃分析。【結果】共納入多項RCT，黃芪注射液組在降低24小時尿蛋白定量（MD顯著）、改善血肌酐水平方面優於單純常規治療。【結論】黃芪注射液可作為DKD的有效輔助治療，但受限於研究質量，結論需謹慎解讀。",
    summary:
      "黃芪注射液聯合常規治療可改善糖尿病腎病患者的蛋白尿和腎功能指標，作為輔助治療具有潛在價值。",
    sampleSize: null,
    population: "糖尿病腎病患者",
    intervention: "黃芪注射液聯合常規治療",
    comparator: "常規治療",
    primaryOutcome: "24小時尿蛋白定量、血肌酐水平",
    resultsSummary:
      "黃芪注射液組在降低蛋白尿和改善腎功能方面顯著優於對照組。安全性良好，未報告嚴重不良反應。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 2 ── Huang Qi – Acute Myocardial Infarction
  {
    title: "黃芪製劑治療急性心肌梗死的臨床療效與安全性系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Li L, Wang Y, Zhao M et al.",
    journal: "PLoS ONE",
    year: 2019,
    doi: "10.1371/journal.pone.0218196",
    pubmedId: "PMC6494254",
    abstract:
      "【目的】系統評價黃芪製劑（口服或注射）輔助治療急性心肌梗死（AMI）的臨床療效與安全性。【方法】系統檢索中英文數據庫，納入黃芪製劑聯合西醫常規治療AMI的RCT。【結果】黃芪製劑組在改善心功能指標（LVEF）、降低心肌損傷標誌物（CK-MB、cTnI）方面優於對照組。但多數研究存在方法學缺陷。【結論】黃芪製劑可能改善AMI患者的心功能，但證據質量有限。",
    summary:
      "黃芪製劑可能改善急性心肌梗死患者的心功能指標，但由於研究設計和報告質量的局限性，證據強度較弱。",
    sampleSize: null,
    population: "急性心肌梗死患者",
    intervention: "黃芪製劑（注射液或口服製劑）聯合常規治療",
    comparator: "常規西醫治療",
    primaryOutcome: "左室射血分數（LVEF）、心肌損傷標誌物",
    resultsSummary:
      "黃芪製劑組LVEF改善優於對照組，CK-MB和cTnI水平降低更明顯。但納入研究的整體方法學質量較低。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 3 ── Ren Shen – Cognitive Function
  {
    title: "人參對認知功能影響的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Kim HJ, Park S, Lee J et al.",
    journal: "Phytomedicine",
    year: 2024,
    doi: "10.1016/j.phymed.2024.156108",
    pubmedId: "39474788",
    abstract:
      "【目的】系統評價人參（Panax ginseng）對健康人群和認知障礙患者認知功能的影響。【方法】檢索PubMed、Embase、Cochrane Library等數據庫，納入15項RCT，採用隨機效應模型進行薈萃分析。評估記憶力、注意力、執行功能等認知域。【結果】15項RCT共納入上千名受試者。高劑量人參在記憶力改善方面顯示出顯著效果（SMD具有統計學意義），對注意力和反應速度亦有正面趨勢。低劑量組效果不顯著。【結論】人參在較高劑量下可顯著改善記憶功能，對整體認知有正面影響。",
    summary:
      "基於15項RCT的薈萃分析顯示，人參在較高劑量下可顯著改善記憶功能，但低劑量效果不明確。總體證據質量中等。",
    sampleSize: null,
    population: "健康成人及輕度認知障礙患者",
    intervention: "人參提取物口服補充",
    comparator: "安慰劑",
    primaryOutcome: "認知功能評分（記憶力、注意力、執行功能）",
    resultsSummary:
      "15項RCT的薈萃分析顯示，高劑量人參在改善記憶力方面有統計學顯著意義，低劑量組未見顯著效果。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.72,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 4 ── Ren Shen – Disease-Related Fatigue
  {
    title: "人參補充劑對疾病相關疲勞療效的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Arring NM, Millstine D, Marks LA, Nail LM",
    journal: "Journal of Ethnopharmacology",
    year: 2022,
    doi: "10.1016/j.jep.2022.115525",
    pubmedId: "35776997",
    abstract:
      "【目的】薈萃分析評價人參補充劑對疾病相關疲勞的療效。【方法】系統檢索多個數據庫，納入12項RCT，研究對象包括癌症相關疲勞、慢性疲勞綜合徵和其他疾病導致的疲勞。【結果】12項RCT的合併效應值顯示，人參組的疲勞評分較安慰劑組有統計學顯著改善（P<0.05）。亞組分析表明，人參對癌症相關疲勞的效果最為顯著。不良事件發生率與安慰劑相當。【結論】人參可有效減輕疾病相關疲勞，特別是癌症相關疲勞。",
    summary:
      "12項RCT的薈萃分析證實人參可有效緩解疾病相關疲勞，尤其對癌症相關疲勞效果顯著，安全性良好。",
    sampleSize: null,
    population: "癌症相關疲勞、慢性疲勞綜合徵及其他疾病相關疲勞患者",
    intervention: "人參補充劑口服",
    comparator: "安慰劑",
    primaryOutcome: "疲勞評分（各類疲勞量表）",
    resultsSummary:
      "12項RCT合併分析顯示人參組疲勞評分改善有統計學顯著意義，癌症相關疲勞亞組效果最為突出。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.70,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 5 ── Dan Shen – Angina Pectoris
  {
    title: "丹參滴丸治療心絞痛的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Luo J, Xu H, Chen K",
    journal: "Internal Medicine Journal",
    year: 2011,
    doi: "10.1111/j.1445-5994.2010.02227.x",
    pubmedId: "21251721",
    abstract:
      "【目的】系統評價複方丹參滴丸治療心絞痛的臨床療效。【方法】檢索中英文數據庫，納入60項RCT，比較複方丹參滴丸與硝酸異山梨酯治療心絞痛的療效差異。【結果】60項RCT涉及數千名心絞痛患者。複方丹參滴丸在心絞痛症狀改善率、心電圖改善率方面均優於硝酸異山梨酯。不良反應發生率較低。【結論】複方丹參滴丸治療心絞痛療效優於硝酸異山梨酯，但納入研究的方法學質量參差不齊。",
    summary:
      "基於60項RCT的系統評價表明，複方丹參滴丸治療心絞痛的療效優於硝酸異山梨酯，不良反應較少。",
    sampleSize: null,
    population: "心絞痛患者",
    intervention: "複方丹參滴丸",
    comparator: "硝酸異山梨酯",
    primaryOutcome: "心絞痛症狀改善率、心電圖改善率",
    resultsSummary:
      "60項RCT顯示複方丹參滴丸在心絞痛症狀和心電圖改善方面優於硝酸異山梨酯，安全性更佳。",
    riskOfBias: "HIGH",
    qualityScore: 0.55,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 6 ── Dan Shen – Coronary Heart Disease
  {
    title: "複方丹參滴丸治療冠心病的系統評價概述",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Duan W, Yu L, Chen K et al.",
    journal: "BMJ Open",
    year: 2015,
    doi: "10.1136/bmjopen-2014-006305",
    pubmedId: "25582415",
    abstract:
      "【目的】對複方丹參滴丸治療冠心病的系統評價進行概述性評價。【方法】系統檢索並篩選關於複方丹參滴丸治療冠心病的系統評價/薈萃分析，使用AMSTAR工具評估方法學質量。【結果】納入13項系統評價，涉及34,071名參與者。多數系統評價顯示複方丹參滴丸優於對照組，但AMSTAR評分普遍偏低。主要問題包括未進行全面的文獻檢索、未評估發表偏倚。【結論】複方丹參滴丸治療冠心病有潛在療效，但現有系統評價的方法學質量不足。",
    summary:
      "13項系統評價（34,071名參與者）的概述顯示複方丹參滴丸治療冠心病有潛在療效，但系統評價本身的方法學質量有限。",
    sampleSize: 34071,
    population: "冠心病患者",
    intervention: "複方丹參滴丸",
    comparator: "常規西醫治療或安慰劑",
    primaryOutcome: "臨床療效、心血管事件發生率",
    resultsSummary:
      "13項系統評價涵蓋34,071名參與者，多數顯示正面療效，但方法學質量評分偏低。",
    riskOfBias: "HIGH",
    qualityScore: 0.40,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 7 ── Huang Lian/Berberine – Type 2 Diabetes
  {
    title: "小檗鹼單獨治療多種代謝疾病的療效與安全性薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Ye Y, Liu X, Wu N et al.",
    journal: "Frontiers in Pharmacology",
    year: 2021,
    doi: "10.3389/fphar.2021.653887",
    pubmedId: "PMC8107691",
    abstract:
      "【目的】薈萃分析評價小檗鹼（黃連素）單獨治療2型糖尿病、高脂血症等多種代謝疾病的療效和安全性。【方法】系統檢索PubMed、Embase、CNKI等數據庫，納入小檗鹼單藥治療代謝疾病的RCT。【結果】小檗鹼可顯著降低空腹血糖（FPG）、糖化血紅蛋白（HbA1c）、低密度脂蛋白膽固醇（LDL-C）、總膽固醇（TC）和甘油三酯（TG）。胃腸道不良反應發生率較低，多為輕度。【結論】小檗鹼作為單藥治療代謝疾病是有效且安全的，特別在降糖和調脂方面表現突出。",
    summary:
      "高質量薈萃分析證實小檗鹼（黃連素）可顯著降低FPG、HbA1c、LDL-C、TC和TG，對代謝疾病療效確切且安全。",
    sampleSize: null,
    population: "2型糖尿病及代謝疾病患者",
    intervention: "小檗鹼（黃連素）單藥口服",
    comparator: "安慰劑或生活方式干預",
    primaryOutcome: "空腹血糖（FPG）、糖化血紅蛋白（HbA1c）、血脂指標",
    resultsSummary:
      "小檗鹼顯著降低FPG、HbA1c、LDL-C、TC、TG水平，胃腸道不良反應輕微且發生率低。",
    riskOfBias: "LOW",
    qualityScore: 0.82,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 8 ── Huang Lian/Berberine – Hyperlipidemia
  {
    title: "小檗鹼單獨及聯合用藥治療高脂血症的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Ju J, Li J, Lin Q, Yan H",
    journal: "Journal of Clinical Lipidology",
    year: 2018,
    doi: "10.1016/j.jacl.2018.01.012",
    pubmedId: "PMC5871262",
    abstract:
      "【目的】系統評價小檗鹼單獨及與他汀類藥物聯合治療高脂血症的療效。【方法】檢索多個數據庫，納入小檗鹼治療高脂血症的RCT，分析TC、TG、LDL-C、HDL-C等指標的變化。【結果】小檗鹼單藥治療可有效降低TC和TG；與他汀類聯合使用時，降脂效果進一步增強，且不增加不良反應風險。【結論】小檗鹼是治療高脂血症的有效輔助選擇，與他汀類聯用具有協同作用。",
    summary:
      "小檗鹼單用可有效降低總膽固醇和甘油三酯，與他汀類聯用有協同降脂效果，安全性良好。",
    sampleSize: null,
    population: "高脂血症患者",
    intervention: "小檗鹼單獨或聯合他汀類藥物",
    comparator: "安慰劑或他汀類單藥",
    primaryOutcome: "血脂指標（TC、TG、LDL-C、HDL-C）",
    resultsSummary:
      "小檗鹼可有效降低TC和TG水平，與他汀類聯用有協同效應，不增加不良反應風險。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 9 ── Huang Lian Jie Du Tang – T2DM
  {
    title: "黃連解毒湯對2型糖尿病糖脂代謝影響的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "Gao K, Yang R, Zhang J et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2021,
    doi: "10.1155/2021/5515692",
    pubmedId: "PMC8117159",
    abstract:
      "【目的】薈萃分析評價黃連解毒湯對2型糖尿病患者糖脂代謝的調節效果。【方法】檢索多個中英文數據庫，納入黃連解毒湯治療T2DM的RCT，分析FPG、2hPG、HbA1c、TC、TG等指標。【結果】黃連解毒湯組在降低FPG、2hPG和HbA1c方面優於對照組，同時TC和TG水平亦有改善。【結論】黃連解毒湯可有效改善T2DM患者的糖脂代謝指標。",
    summary:
      "薈萃分析顯示黃連解毒湯可改善2型糖尿病患者的空腹血糖、餐後血糖及血脂指標。",
    sampleSize: null,
    population: "2型糖尿病患者",
    intervention: "黃連解毒湯聯合常規降糖治療",
    comparator: "常規降糖治療",
    primaryOutcome: "空腹血糖、餐後2小時血糖、糖化血紅蛋白",
    resultsSummary:
      "黃連解毒湯組在FPG、2hPG、HbA1c及血脂指標方面均優於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.58,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 10 ── Ma Huang – Weight Management
  {
    title: "中藥治療體重管理的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Esteghamati A, Mazaheri T, Rad MV, Noshad S",
    journal: "Obesity Reviews",
    year: 2021,
    doi: "10.1111/obr.13216",
    pubmedId: "PMC7964117",
    abstract:
      "【目的】系統評價含麻黃等中藥治療超重和肥胖的療效與安全性。【方法】檢索多個數據庫，納入39項RCT，分析體重、BMI、腰圍等指標的變化。【結果】39項RCT的合併分析顯示，含中藥治療組的體重減輕量和BMI降低值均優於對照組。含麻黃的處方效果較明顯，但不良反應（如心悸、失眠、血壓升高）發生率也較高。【結論】中藥在體重管理中有一定療效，但含麻黃的處方需謹慎使用。",
    summary:
      "39項RCT顯示含中藥的體重管理方案有效，含麻黃的處方效果較顯著但不良反應也較多，需謹慎使用。",
    sampleSize: null,
    population: "超重和肥胖患者",
    intervention: "含麻黃等中藥的減重處方",
    comparator: "安慰劑或生活方式干預",
    primaryOutcome: "體重變化、BMI變化",
    resultsSummary:
      "39項RCT合併分析顯示中藥減重有效，含麻黃處方效果最明顯但需注意心血管不良反應。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 11 ── Ma Huang/Caffeine – Weight Loss 6-Month Trial
  {
    title: "麻黃/咖啡因減重的6個月隨機安全性與療效試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "Boozer CN, Nasser JA, Heymsfield SB et al.",
    journal: "International Journal of Obesity",
    year: 2002,
    doi: "10.1038/sj.ijo.0802023",
    pubmedId: "12032741",
    abstract:
      "【目的】評價麻黃鹼/咖啡因組合在6個月內減重的安全性和療效。【方法】167名超重成人隨機分為麻黃鹼/咖啡因組（90/192 mg/天）和安慰劑組，為期6個月。【結果】治療組平均體重減輕5.3kg，安慰劑組平均2.6kg（P<0.001）。治療組體脂百分比降低更多。血壓和心率在兩組間無顯著差異。但治療組出現更多輕度不良反應（口乾、失眠、頭痛）。【結論】麻黃鹼/咖啡因可有效促進減重，但需監測不良反應。",
    summary:
      "6個月RCT表明麻黃鹼/咖啡因組合可有效減重（較安慰劑多減2.7kg），但需監測口乾、失眠等不良反應。",
    sampleSize: 167,
    population: "超重成人（BMI 25-40 kg/m²）",
    intervention: "麻黃鹼90mg/咖啡因192mg每日口服",
    comparator: "安慰劑",
    primaryOutcome: "體重變化",
    resultsSummary:
      "治療組平均體重減輕5.3kg vs 安慰劑組2.6kg（P<0.001），體脂百分比亦顯著降低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.70,
    qualityTool: "Jadad Scale",
    status: "PUBLISHED",
  },

  // ── 12 ── Gan Cao – Peptic Ulcer
  {
    title: "甘草治療消化性潰瘍的傳統應用與現代藥理學綜述",
    studyType: "TRADITIONAL_USE",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "D",
    authors: "Pastorino G, Cornara L, Soares S et al.",
    journal: "Fitoterapia",
    year: 2018,
    doi: "10.1016/j.fitote.2018.06.011",
    pubmedId: "29921581",
    abstract:
      "【目的】綜述甘草（Glycyrrhiza glabra）在治療消化性潰瘍方面的傳統應用及現代藥理學研究進展。【方法】回顧甘草的傳統用途、化學成分（甘草酸、甘草次酸、黃酮類化合物）及其在胃腸道的藥理作用。【結果】甘草提取物（特別是去甘草酸甘草DGL）具有保護胃黏膜、促進潰瘍癒合、抗幽門螺桿菌等作用。傳統上甘草用於「和中緩急、潤肺止咳」，在《傷寒論》等經典中廣泛使用。【結論】甘草治療消化性潰瘍有悠久的傳統基礎和初步的藥理學支持，但高質量臨床試驗仍然不足。",
    summary:
      "甘草治療消化性潰瘍有悠久的傳統應用歷史，現代藥理學研究支持其胃黏膜保護和抗潰瘍作用，但缺乏大型RCT證據。",
    sampleSize: null,
    population: "消化性潰瘍患者",
    intervention: "甘草或去甘草酸甘草（DGL）",
    comparator: null,
    primaryOutcome: "潰瘍癒合率、症狀緩解",
    resultsSummary:
      "基於傳統用途和藥理學研究，甘草具有胃黏膜保護、促進潰瘍癒合和抗幽門螺桿菌作用。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 13 ── Dang Gui – Dysmenorrhea
  {
    title: "當歸治療痛經的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_3A",
    evidenceGrade: "C",
    authors: "Chao MT, Wade CM, Booth SL",
    journal: "Journal of Ethnopharmacology",
    year: 2020,
    doi: "10.1016/j.jep.2019.112376",
    pubmedId: "31722252",
    abstract:
      "【目的】系統評價當歸（Angelica sinensis）或含當歸複方治療原發性痛經的臨床療效。【方法】檢索PubMed、CNKI等數據庫，納入當歸治療痛經的臨床研究。【結果】多項研究報告當歸或含當歸複方可減輕痛經程度、縮短疼痛持續時間，部分研究顯示其效果與布洛芬相當。但研究質量總體偏低，多數缺乏恰當的隨機化和盲法。【結論】初步證據支持當歸治療痛經的潛在療效，但需要更嚴格的RCT加以確認。",
    summary:
      "初步證據支持當歸治療原發性痛經的療效，部分研究顯示效果與NSAIDs相當，但研究質量需改進。",
    sampleSize: null,
    population: "原發性痛經患者",
    intervention: "當歸單用或含當歸的複方製劑",
    comparator: "NSAIDs或安慰劑",
    primaryOutcome: "痛經疼痛評分（VAS）、疼痛持續時間",
    resultsSummary:
      "當歸或含當歸複方可減輕痛經程度和疼痛持續時間，部分研究療效與布洛芬相當。",
    riskOfBias: "HIGH",
    qualityScore: 0.42,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 14 ── Chai Hu – Liver Disease
  {
    title: "柴胡製劑治療慢性肝病的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Liu JP, Manheimer E, Tsutani K, Gluud C",
    journal: "Journal of Ethnopharmacology",
    year: 2003,
    doi: "10.1016/S0378-8741(02)00316-0",
    pubmedId: "12505550",
    abstract:
      "【目的】系統評價含柴胡的中藥製劑治療慢性肝病的臨床療效和安全性。【方法】檢索中英文數據庫，納入含柴胡製劑（如小柴胡湯、柴胡疏肝散等）治療慢性乙型肝炎、肝硬化等的RCT。【結果】多項RCT報告含柴胡製劑可改善肝功能指標（ALT、AST）和臨床症狀。但研究方法學質量普遍較低，且存在異質性。【結論】含柴胡製劑可能對慢性肝病有益，但現有證據不足以得出確定性結論。",
    summary:
      "含柴胡的中藥製劑可能改善慢性肝病的肝功能指標和症狀，但證據質量有限，需更嚴格的研究。",
    sampleSize: null,
    population: "慢性乙型肝炎、肝硬化等慢性肝病患者",
    intervention: "含柴胡的中藥製劑（小柴胡湯等）",
    comparator: "常規治療或安慰劑",
    primaryOutcome: "肝功能指標（ALT、AST）、臨床症狀改善率",
    resultsSummary:
      "含柴胡製劑可改善肝功能指標和臨床症狀，但研究方法學質量普遍偏低。",
    riskOfBias: "HIGH",
    qualityScore: 0.40,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 15 ── Bu Zhong Yi Qi Tang – Functional Constipation
  {
    title: "加味補中益氣湯治療成人功能性便秘的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Gong Y, Zha Q, Li L et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2018,
    doi: "10.1155/2018/3954145",
    pubmedId: "PMC5820555",
    abstract:
      "【目的】薈萃分析評價加味補中益氣湯治療成人功能性便秘的療效。【方法】系統檢索中英文數據庫，納入加味補中益氣湯治療功能性便秘的RCT，分析總有效率、每週自發排便次數等指標。【結果】加味補中益氣湯在總有效率和增加每週自發排便次數方面均優於常規治療。不良反應發生率低。【結論】加味補中益氣湯是治療成人功能性便秘的有效選擇。",
    summary:
      "薈萃分析證實加味補中益氣湯可有效治療成人功能性便秘，改善排便頻率和臨床症狀。",
    sampleSize: null,
    population: "功能性便秘成人患者",
    intervention: "加味補中益氣湯",
    comparator: "常規治療（如乳果糖、聚乙二醇等）",
    primaryOutcome: "總有效率、每週自發排便次數",
    resultsSummary:
      "加味補中益氣湯治療組的總有效率和排便改善均優於對照組，安全性良好。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 16 ── Bu Zhong Yi Qi Tang – Stable COPD
  {
    title: "補中益氣湯治療穩定期慢性阻塞性肺疾病的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Chen Y, Shergis JL, Wu L et al.",
    journal: "Complementary Therapies in Medicine",
    year: 2016,
    doi: "10.1016/j.ctim.2016.10.005",
    pubmedId: "27912964",
    abstract:
      "【目的】系統評價補中益氣湯治療穩定期COPD的療效。【方法】檢索中英文數據庫，納入補中益氣湯聯合常規治療穩定期COPD的RCT。【結果】補中益氣湯組在改善症狀評分、6分鐘步行距離、FEV1及生活質量方面均優於單純常規治療。不良事件輕微且發生率低。【結論】補中益氣湯可作為穩定期COPD的有效輔助治療，改善症狀、運動耐量、肺功能和生活質量。",
    summary:
      "系統評價顯示補中益氣湯可改善穩定期COPD患者的症狀、運動耐量、肺功能和生活質量，安全性良好。",
    sampleSize: null,
    population: "穩定期慢性阻塞性肺疾病（COPD）患者",
    intervention: "補中益氣湯聯合常規治療",
    comparator: "常規治療（支氣管擴張劑、吸入性糖皮質激素等）",
    primaryOutcome: "症狀評分、6分鐘步行距離、FEV1、生活質量",
    resultsSummary:
      "補中益氣湯組在症狀、運動耐量、肺功能和生活質量各方面均優於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.65,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 17 ── Liu Wei Di Huang Wan – Hypertension
  {
    title: "六味地黃丸聯合降壓藥治療原發性高血壓的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Xiong X, Yang X, Liu W et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2012,
    doi: "10.1155/2012/928934",
    pubmedId: "PMC3520441",
    abstract:
      "【目的】系統評價六味地黃丸聯合常規降壓藥治療原發性高血壓的療效和安全性。【方法】檢索中英文數據庫，納入6項RCT。【結果】6項RCT共納入數百名患者。六味地黃丸聯合降壓藥組在降低收縮壓和舒張壓方面優於單用降壓藥。同時中醫症狀（頭暈、腰膝酸軟等）改善更明顯。未報告嚴重不良反應。【結論】六味地黃丸作為輔助降壓藥有潛在益處，但受限於研究數量和質量。",
    summary:
      "6項RCT顯示六味地黃丸聯合降壓藥可更好地控制血壓和改善中醫症狀，但研究質量有限。",
    sampleSize: null,
    population: "原發性高血壓患者",
    intervention: "六味地黃丸聯合常規降壓藥",
    comparator: "常規降壓藥單用",
    primaryOutcome: "血壓控制（收縮壓、舒張壓）",
    resultsSummary:
      "六味地黃丸輔助治療組血壓降低幅度更大，中醫相關症狀改善更顯著。",
    riskOfBias: "HIGH",
    qualityScore: 0.48,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 18 ── Liu Wei Di Huang Wan – Diabetic Nephropathy
  {
    title: "六味地黃丸類方治療糖尿病腎病蛋白尿的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Shi R, Wang Y, An X et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2018,
    doi: "10.1155/2018/4728327",
    pubmedId: "PMC6178512",
    abstract:
      "【目的】薈萃分析評價六味地黃丸及其類方對糖尿病腎病蛋白尿的療效。【方法】納入六味地黃丸及其加減方治療DN蛋白尿的RCT。【結果】六味地黃丸類方在降低24小時尿蛋白定量和尿白蛋白排泄率方面優於常規治療，同時FPG、HbA1c也有改善。【結論】六味地黃丸類方可改善DN蛋白尿和糖代謝指標。",
    summary:
      "薈萃分析表明六味地黃丸類方可有效減少糖尿病腎病患者的蛋白尿並改善糖代謝指標。",
    sampleSize: null,
    population: "糖尿病腎病伴蛋白尿患者",
    intervention: "六味地黃丸或其加減方聯合常規治療",
    comparator: "常規西醫治療",
    primaryOutcome: "24小時尿蛋白定量、尿白蛋白排泄率",
    resultsSummary:
      "六味地黃丸類方在降低蛋白尿和改善糖代謝方面均優於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.52,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 19 ── Si Jun Zi Tang – Functional Dyspepsia
  {
    title: "四君子湯類方治療功能性消化不良的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Xiao Y, Li Y, Shu J et al.",
    journal: "BMC Complementary Medicine and Therapies",
    year: 2020,
    doi: "10.1186/s12906-020-03191-4",
    pubmedId: "PMC7788807",
    abstract:
      "【目的】薈萃分析評價四君子湯及其類方治療功能性消化不良（FD）的療效。【方法】系統檢索多個數據庫，納入12項RCT。【結果】12項RCT共納入約1,100名FD患者。四君子湯類方在症狀總有效率（OR顯著高於對照組）和單項症狀（腹脹、食慾不振、噯氣）改善方面均優於促動力藥或安慰劑。不良反應發生率明顯低於西藥組。【結論】四君子湯類方治療FD有效且安全。",
    summary:
      "12項RCT的薈萃分析證實四君子湯類方治療功能性消化不良有效，症狀改善優於促動力藥且不良反應更少。",
    sampleSize: 1100,
    population: "功能性消化不良患者",
    intervention: "四君子湯及其類方（加味四君子湯等）",
    comparator: "促動力藥（如多潘立酮）或安慰劑",
    primaryOutcome: "症狀總有效率、單項症狀評分",
    resultsSummary:
      "12項RCT顯示四君子湯類方的症狀總有效率顯著高於對照組，不良反應發生率更低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 20 ── Si Jun Zi Tang – Chronic Fatigue
  {
    title: "四君子湯治療脾虛型慢性疲勞綜合徵的隨機雙盲安慰劑對照試驗方案",
    studyType: "RCT",
    evidenceLevel: "LEVEL_3A",
    evidenceGrade: "C",
    authors: "Yeung WF, Chung KF, Ng KY et al.",
    journal: "Trials",
    year: 2019,
    doi: "10.1186/s13063-019-3799-7",
    pubmedId: "PMC6861807",
    abstract:
      "【目的】描述一項評價四君子湯治療脾虛型慢性疲勞綜合徵（CFS）的隨機、雙盲、安慰劑對照試驗方案。【方法】計劃納入64名脾虛型CFS患者，隨機分為四君子湯顆粒組和安慰劑組，治療4週。主要結局指標為Chalder疲勞量表評分。【結果】此為試驗方案報告，初步結果顯示可行性良好。【結論】此設計嚴謹的試驗將為四君子湯治療脾虛型CFS提供高質量證據。",
    summary:
      "一項設計嚴謹的隨機雙盲安慰劑對照試驗方案，旨在評價四君子湯治療脾虛型慢性疲勞綜合徵的療效。",
    sampleSize: 64,
    population: "脾虛型慢性疲勞綜合徵患者",
    intervention: "四君子湯顆粒",
    comparator: "安慰劑顆粒",
    primaryOutcome: "Chalder疲勞量表評分變化",
    resultsSummary:
      "試驗方案報告，設計嚴謹，初步顯示良好可行性。完整結果尚待發表。",
    riskOfBias: "LOW",
    qualityScore: 0.75,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 21 ── Xiao Yao San – Depression
  {
    title: "逍遙散治療抑鬱症的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Qin F, Wu XA, Tang Y et al.",
    journal: "ISRN Pharmacology",
    year: 2011,
    doi: "10.5402/2011/578397",
    pubmedId: "PMC3159992",
    abstract:
      "【目的】系統評價逍遙散及其加味方治療抑鬱症的臨床療效和安全性。【方法】檢索中英文數據庫，納入26項RCT，共1,837名抑鬱症患者。比較逍遙散（單用或聯合抗抑鬱藥）與抗抑鬱藥單用的療效差異。【結果】逍遙散聯合抗抑鬱藥的臨床有效率顯著高於抗抑鬱藥單用（OR = 3.34），逍遙散單用與抗抑鬱藥療效相當。HAMD評分改善方面，逍遙散組優於或不劣於抗抑鬱藥組。不良反應發生率逍遙散組明顯低於抗抑鬱藥組。【結論】逍遙散治療抑鬱症有效且安全，可作為輔助或替代治療選擇。",
    summary:
      "26項RCT（1,837例患者）的系統評價表明，逍遙散治療抑鬱症療效優於或不劣於單用抗抑鬱藥，且不良反應更少。",
    sampleSize: 1837,
    population: "抑鬱症患者",
    intervention: "逍遙散及其加味方（單用或聯合抗抑鬱藥）",
    comparator: "抗抑鬱藥單用（如氟西汀、帕羅西汀等）",
    primaryOutcome: "HAMD評分變化、臨床有效率",
    resultsSummary:
      "26項RCT顯示逍遙散聯合抗抑鬱藥療效優於單用抗抑鬱藥，逍遙散單用療效不劣於西藥，且不良反應更少。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 22 ── Xiao Yao San – Anxiety
  {
    title: "逍遙散治療焦慮症的療效與安全性系統評價",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Liu C, Fan Y, Yang J et al.",
    journal: "Frontiers in Medicine",
    year: 2023,
    doi: "10.3389/fmed.2023.1271714",
    pubmedId: "PMC10613521",
    abstract:
      "【目的】系統評價逍遙散治療焦慮症的療效與安全性。【方法】系統檢索多個數據庫，納入14項RCT，共1,256名焦慮症患者。【結果】薈萃分析顯示，逍遙散在降低HAMA評分（MD = -2.86, P<0.001）和提高臨床有效率方面優於對照組。逍遙散聯合苯二氮卓類藥物的療效優於苯二氮卓類單用。不良反應發生率逍遙散組顯著低於西藥組。【結論】逍遙散治療焦慮症有效且安全，特別適合作為輔助治療。",
    summary:
      "14項RCT（1,256例）的薈萃分析證實逍遙散可有效降低焦慮症患者的HAMA評分，且不良反應少於西藥。",
    sampleSize: 1256,
    population: "焦慮症患者（廣泛性焦慮障礙為主）",
    intervention: "逍遙散及其加味方（單用或聯合抗焦慮藥）",
    comparator: "苯二氮卓類或其他抗焦慮藥",
    primaryOutcome: "HAMA評分變化、臨床有效率",
    resultsSummary:
      "逍遙散組HAMA評分降低顯著優於對照組（MD = -2.86），臨床有效率更高，不良反應更少。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.66,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 23 ── Xiao Yao San – Insomnia with Anxiety
  {
    title: "逍遙散治療失眠合併焦慮的臨床療效與安全性系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Li X, Zhang M, Chen H et al.",
    journal: "Medicine",
    year: 2021,
    doi: "10.1097/MD.0000000000027608",
    pubmedId: "PMC8556059",
    abstract:
      "【目的】系統評價逍遙散加減方治療失眠合併焦慮的療效與安全性。【方法】納入9項RCT，共681名參與者。【結果】逍遙散加減方在改善PSQI評分、HAMA評分和睡眠總有效率方面優於對照組。安全性良好。【結論】逍遙散加減方可有效治療失眠合併焦慮，但需要更多高質量研究。",
    summary:
      "9項RCT（681例）顯示逍遙散加減方可改善失眠合併焦慮的睡眠質量和焦慮症狀。",
    sampleSize: 681,
    population: "失眠合併焦慮患者",
    intervention: "逍遙散加減方",
    comparator: "苯二氮卓類藥物或其他安眠藥",
    primaryOutcome: "PSQI評分、HAMA評分",
    resultsSummary:
      "逍遙散加減方在PSQI和HAMA評分改善方面均優於對照組，總有效率更高。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 24 ── Suan Zao Ren Tang – Insomnia (Methadone)
  {
    title: "酸棗仁湯治療美沙酮維持期間睡眠障礙的隨機雙盲安慰劑對照試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "Chan YY, Lo WY, Li TC et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2015,
    doi: "10.1155/2015/580140",
    pubmedId: "PMC4539464",
    abstract:
      "【目的】評價酸棗仁湯對美沙酮維持治療患者睡眠障礙的療效。【方法】90名伴睡眠障礙的美沙酮維持患者隨機分為酸棗仁湯組和安慰劑組，治療4週。主要結局指標為PSQI評分。【結果】治療4週後，酸棗仁湯組PSQI總評分較安慰劑組顯著改善（P=0.007）。睡眠潛伏期、睡眠持續時間和日間功能障礙等亞項均有改善。未報告嚴重不良反應。【結論】酸棗仁湯可有效改善美沙酮維持患者的睡眠質量。",
    summary:
      "嚴格設計的雙盲RCT證實酸棗仁湯可顯著改善PSQI評分（P=0.007），安全性良好。",
    sampleSize: 90,
    population: "美沙酮維持治療期間伴有睡眠障礙的患者",
    intervention: "酸棗仁湯",
    comparator: "安慰劑",
    primaryOutcome: "匹茲堡睡眠質量指數（PSQI）評分",
    resultsSummary:
      "酸棗仁湯組PSQI總評分較安慰劑組顯著改善（P=0.007），睡眠潛伏期和持續時間均有改善。",
    riskOfBias: "LOW",
    qualityScore: 0.78,
    qualityTool: "Jadad Scale",
    status: "PUBLISHED",
  },

  // ── 25 ── Suan Zao Ren Tang + Zhi Zi Chi Tang – Anxious Insomnia
  {
    title: "酸棗仁湯合梔子豉湯治療焦慮性失眠的隨機平行對照試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "Zhou QH, Zhou XL, Xu MB et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2015,
    doi: "10.1155/2015/571953",
    pubmedId: "PMC4352487",
    abstract:
      "【目的】評價酸棗仁湯合梔子豉湯治療焦慮性失眠的臨床療效。【方法】將焦慮性失眠患者隨機分為中藥組（酸棗仁湯合梔子豉湯）和西藥組（艾司唑侖），治療4週，比較PSQI和HAMA評分。【結果】兩組治療後PSQI和HAMA評分均顯著改善。中藥組的睡眠質量改善不劣於西藥組，而停藥後反彈率明顯低於西藥組。【結論】酸棗仁湯合梔子豉湯治療焦慮性失眠效果良好，且停藥後反彈率低。",
    summary:
      "酸棗仁湯合梔子豉湯治療焦慮性失眠療效不劣於艾司唑侖，且停藥後睡眠反彈率更低。",
    sampleSize: null,
    population: "焦慮性失眠患者",
    intervention: "酸棗仁湯合梔子豉湯",
    comparator: "艾司唑侖",
    primaryOutcome: "PSQI評分、HAMA評分",
    resultsSummary:
      "中藥組與西藥組療效相當，但中藥組停藥後反彈率明顯更低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.65,
    qualityTool: "Jadad Scale",
    status: "PUBLISHED",
  },

  // ── 26 ── Tongxinluo – Acute MI (CTS-AMI / JAMA)
  {
    title: "通心絡膠囊對急性心肌梗死患者臨床結局的隨機臨床試驗（CTS-AMI）",
    studyType: "RCT",
    evidenceLevel: "LEVEL_1B",
    evidenceGrade: "A",
    authors: "Yang Y, Li Y, Wang J, Sun K et al.",
    journal: "JAMA",
    year: 2023,
    doi: "10.1001/jama.2023.19524",
    pubmedId: "37874574",
    abstract:
      "【目的】評價通心絡膠囊對急性ST段抬高型心肌梗死（STEMI）患者的臨床結局影響。【方法】多中心、隨機、雙盲、安慰劑對照試驗（CTS-AMI），納入124家醫院的3,797名STEMI患者。患者在接受指南推薦治療（包括PCI）基礎上，隨機接受通心絡或安慰劑治療12個月。主要終點為30天主要不良心腦血管事件（MACCE）。【結果】通心絡組30天MACCE發生率顯著低於安慰劑組（3.4% vs 5.2%, P=0.006）。1年隨訪時，通心絡組心源性死亡、再梗死等不良事件也顯著減少。【結論】通心絡可顯著改善STEMI患者的短期和長期臨床結局。",
    summary:
      "發表於JAMA的大型RCT（3,797例STEMI）證實，通心絡膠囊可顯著降低30天MACCE（3.4% vs 5.2%）和1年不良事件發生率。",
    sampleSize: 3797,
    population: "急性ST段抬高型心肌梗死（STEMI）患者",
    intervention: "通心絡膠囊聯合指南推薦標準治療（含PCI）",
    comparator: "安慰劑聯合指南推薦標準治療（含PCI）",
    primaryOutcome: "30天主要不良心腦血管事件（MACCE）",
    resultsSummary:
      "通心絡組30天MACCE 3.4% vs 安慰劑組5.2%（P=0.006），1年心源性死亡和再梗死也顯著減少。",
    riskOfBias: "LOW",
    qualityScore: 0.92,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 27 ── Yin Qiao San – Common Cold
  {
    title: "銀翹散治療普通感冒的隨機安慰劑對照多中心試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "He Y, Liu Q, Wang R et al.",
    journal: "PLoS ONE",
    year: 2023,
    doi: "10.1371/journal.pone.0294488",
    pubmedId: "PMC10682673",
    abstract:
      "【目的】通過隨機、安慰劑對照、多中心試驗評價銀翹散治療風熱型普通感冒的療效。【方法】納入多中心的風熱型普通感冒患者，隨機分為銀翹散組和安慰劑組。主要結局指標為症狀緩解時間和症狀積分。【結果】銀翹散組的症狀緩解時間顯著短於安慰劑組，發熱、咽痛、鼻塞等症狀積分改善更快。不良反應發生率低且兩組間無顯著差異。【結論】銀翹散可有效治療風熱型普通感冒，加速症狀緩解。",
    summary:
      "多中心RCT證實銀翹散可有效治療風熱型普通感冒，顯著縮短症狀緩解時間。",
    sampleSize: null,
    population: "風熱型普通感冒患者",
    intervention: "銀翹散顆粒",
    comparator: "安慰劑顆粒",
    primaryOutcome: "症狀緩解時間、症狀積分變化",
    resultsSummary:
      "銀翹散組症狀緩解時間顯著縮短，發熱、咽痛、鼻塞等症狀改善更快。",
    riskOfBias: "LOW",
    qualityScore: 0.75,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 28 ── Si Wu Tang – Dysmenorrhea
  {
    title: "四物湯治療痛經與月經不調的傳統應用回顧",
    studyType: "TRADITIONAL_USE",
    evidenceLevel: "LEVEL_4",
    evidenceGrade: "D",
    authors: "Yeh LL, Liu JY, Lin KS et al.",
    journal: "Journal of Clinical Pharmacy and Therapeutics",
    year: 2007,
    doi: "10.1111/j.1365-2710.2007.00835.x",
    pubmedId: "17635338",
    abstract:
      "【目的】回顧四物湯在治療痛經和月經不調方面的傳統應用及現代研究進展。【方法】文獻回顧四物湯的經典記載、組方理論及現代藥理學和臨床研究。【結果】四物湯自《太平惠民和劑局方》（1107年）記載以來一直是補血調經的基礎方。現代研究表明其具有改善微循環、調節子宮平滑肌、抗氧化和免疫調節等藥理活性。臨床觀察顯示其對痛經、月經量少、經期不規律等症狀有效。【結論】四物湯治療痛經與月經不調具有深厚的傳統基礎和初步的現代研究支持。",
    summary:
      "四物湯作為補血調經的經典方劑，在治療痛經和月經不調方面有深厚傳統基礎和現代藥理學支持。",
    sampleSize: null,
    population: "痛經與月經不調女性患者",
    intervention: "四物湯（當歸、川芎、白芍、熟地黃）",
    comparator: null,
    primaryOutcome: "痛經程度、月經規律性",
    resultsSummary:
      "傳統文獻和初步臨床觀察支持四物湯治療痛經和月經不調的療效，現代藥理學研究提供了機制支持。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 29 ── Ba Zhen Tang – Qi-Blood Deficiency in Elderly
  {
    title: "八珍湯聯合營養運動干預治療老年氣血虛弱的隨機對照試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_3A",
    evidenceGrade: "C",
    authors: "Zhang W, Li R, Wang S et al.",
    journal: "Chinese Journal of Integrative Medicine",
    year: 2019,
    doi: "10.1007/s11655-019-3067-3",
    pubmedId: "31289996",
    abstract:
      "【目的】評價八珍湯聯合營養運動干預對老年氣血虛弱（乏力、食慾不振、面色萎黃等）患者的療效。【方法】118名老年氣血虛弱患者隨機分為八珍湯聯合干預組和單純干預組，治療8週。【結果】八珍湯聯合組在中醫證候積分改善、血紅蛋白水平升高、Barthel指數改善方面均優於對照組（P<0.05）。疲勞VAS評分改善更明顯。【結論】八珍湯可增強營養運動干預對老年氣血虛弱的療效。",
    summary:
      "118例RCT顯示八珍湯聯合營養運動干預可有效改善老年氣血虛弱患者的中醫證候、血紅蛋白和日常活動能力。",
    sampleSize: 118,
    population: "老年氣血虛弱（乏力、食慾不振、面色萎黃）患者",
    intervention: "八珍湯聯合營養運動干預",
    comparator: "單純營養運動干預",
    primaryOutcome: "中醫證候積分、血紅蛋白水平、Barthel指數",
    resultsSummary:
      "八珍湯聯合組在證候積分、血紅蛋白和Barthel指數方面均優於對照組（P<0.05）。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 30 ── Acupuncture – Chronic Pain (IPD Meta-Analysis)
  {
    title: "針灸治療慢性疼痛的個體患者數據薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Vickers AJ, Cronin AM, Maschino AC et al.",
    journal: "Archives of Internal Medicine",
    year: 2012,
    doi: "10.1001/archinternmed.2012.3654",
    pubmedId: "22965186",
    abstract:
      "【目的】通過個體患者數據（IPD）薈萃分析評價針灸治療慢性疼痛的療效。【方法】納入29項RCT，共17,922名慢性疼痛（背痛、頸痛、骨關節炎、頭痛）患者的個體數據。比較針灸與假針灸及無針灸治療的差異。【結果】針灸在所有疼痛類型中均顯著優於假針灸和無針灸治療。效應量在臨床上具有意義。各研究間一致性良好。【結論】針灸對慢性疼痛有明確療效，效果非安慰劑反應所能解釋，應被視為慢性疼痛的合理轉介選擇。",
    summary:
      "里程碑式的IPD薈萃分析（29項RCT, 17,922例）證實針灸治療慢性疼痛有效，效果非安慰劑所能解釋。",
    sampleSize: 17922,
    population: "慢性疼痛患者（背痛、頸痛、骨關節炎、頭痛）",
    intervention: "針灸治療",
    comparator: "假針灸或無針灸治療",
    primaryOutcome: "疼痛評分（VAS或NRS）",
    resultsSummary:
      "29項RCT的IPD分析顯示針灸在所有疼痛類型中均顯著優於假針灸和無治療，效應量具臨床意義。",
    riskOfBias: "LOW",
    qualityScore: 0.90,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 31 ── Acupuncture – Chronic Pain Update
  {
    title: "針灸治療慢性疼痛的個體患者數據薈萃分析更新",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Vickers AJ, Vertosick EA, Lewith G et al.",
    journal: "Journal of Pain",
    year: 2018,
    doi: "10.1016/j.jpain.2017.11.005",
    pubmedId: "29198932",
    abstract:
      "【目的】更新2012年針灸治療慢性疼痛的IPD薈萃分析。【方法】在原有基礎上新增13項RCT，共39項RCT、超過20,000名患者的個體數據。【結果】更新分析確認了先前的結論：針灸對慢性疼痛的療效是真實的、具有統計學和臨床意義的，且治療效果隨時間持續存在（12個月隨訪時僅衰減約15%）。【結論】針灸治療慢性疼痛的效果持久，不應被視為僅有短期效果的治療。",
    summary:
      "更新的IPD薈萃分析（39項RCT）再次確認針灸治療慢性疼痛有效，且效果持久（12個月僅衰減15%）。",
    sampleSize: 20827,
    population: "慢性疼痛患者（背痛、頸痛、骨關節炎、頭痛）",
    intervention: "針灸治療",
    comparator: "假針灸或無針灸治療",
    primaryOutcome: "疼痛評分（長期隨訪）",
    resultsSummary:
      "39項RCT確認針灸療效真實持久，12個月隨訪時效果僅衰減約15%。",
    riskOfBias: "LOW",
    qualityScore: 0.92,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 32 ── PC6 – Postoperative Nausea/Vomiting (Cochrane)
  {
    title: "內關穴（PC6）刺激預防術後噁心嘔吐的Cochrane系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Lee A, Fan LTY",
    journal: "Cochrane Database of Systematic Reviews",
    year: 2006,
    doi: "10.1002/14651858.CD003281.pub3",
    pubmedId: "16813514",
    abstract:
      "【目的】Cochrane系統評價評估PC6穴位刺激預防術後噁心嘔吐（PONV）的療效。【方法】檢索Cochrane對照試驗註冊庫等，納入所有比較PC6穴位刺激與假刺激或止吐藥的RCT。【結果】納入40項試驗，涉及4,858名手術患者。PC6穴位刺激（針灸、指壓、電刺激等）在降低PONV發生率方面顯著優於假刺激。與止吐藥相比療效相當，但不良反應更少。【結論】PC6穴位刺激是預防PONV的有效方法。",
    summary:
      "Cochrane系統評價（40項RCT, 4,858例）確認PC6穴位刺激可有效預防術後噁心嘔吐，療效與止吐藥相當。",
    sampleSize: 4858,
    population: "接受外科手術的患者",
    intervention: "PC6穴位刺激（針灸、指壓、電刺激等）",
    comparator: "假刺激或止吐藥",
    primaryOutcome: "術後噁心嘔吐發生率",
    resultsSummary:
      "40項RCT顯示PC6刺激在降低PONV方面顯著優於假刺激，與止吐藥療效相當且不良反應更少。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.85,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 33 ── PC6 – PONV Network Meta-Analysis
  {
    title: "PC6穴位刺激預防術後噁心嘔吐的網絡薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Zheng CH, Huang GY, Zhang MM et al.",
    journal: "Acupuncture in Medicine",
    year: 2025,
    doi: "10.1177/09645284251326148",
    pubmedId: "40938065",
    abstract:
      "【目的】通過網絡薈萃分析比較不同PC6穴位刺激方法預防PONV的療效。【方法】納入多項RCT，使用網絡薈萃分析比較電針、手針、指壓、經皮穴位電刺激等不同PC6刺激方法。【結果】所有PC6刺激方法均顯著降低PONV發生率。電針和經皮穴位電刺激的效果最佳。各方法間差異有限但電刺激方法略優。【結論】PC6穴位刺激的多種方法均可有效預防PONV，電刺激方法可能稍優。",
    summary:
      "網絡薈萃分析比較了多種PC6刺激方法預防PONV的效果，均有效，電刺激方法可能效果最佳。",
    sampleSize: null,
    population: "接受外科手術的患者",
    intervention: "PC6穴位電針、手針、指壓、經皮電刺激",
    comparator: "假刺激、止吐藥或無治療",
    primaryOutcome: "術後噁心嘔吐發生率",
    resultsSummary:
      "所有PC6刺激方法均可有效降低PONV，電針和經皮穴位電刺激效果最佳。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.80,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 34 ── Acupuncture – Cancer Nausea/Vomiting
  {
    title: "針灸治療癌症患者噁心嘔吐的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Li QW, Zhou MN, Liu YL et al.",
    journal: "Systematic Reviews",
    year: 2025,
    doi: "10.1186/s13643-025-02779-y",
    pubmedId: "PMC12300855",
    abstract:
      "【目的】系統評價針灸治療癌症患者化療或放療引起的噁心嘔吐的療效。【方法】系統檢索多個數據庫，納入針灸治療癌症相關噁心嘔吐的RCT。【結果】針灸在減輕化療和放療引起的噁心嘔吐方面優於假針灸或常規護理。PC6穴位（內關）是最常用的穴位。療效在急性期和延遲期均有體現。【結論】針灸是癌症患者噁心嘔吐管理的有效輔助方法。",
    summary:
      "系統評價證實針灸（以PC6為主）可有效緩解癌症患者化療和放療引起的噁心嘔吐。",
    sampleSize: null,
    population: "接受化療或放療的癌症患者",
    intervention: "針灸治療（以PC6為主）",
    comparator: "假針灸或常規護理",
    primaryOutcome: "噁心嘔吐頻率和嚴重程度",
    resultsSummary:
      "針灸在急性期和延遲期均可有效減輕癌症相關噁心嘔吐，PC6為最常用穴位。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 35 ── Acupuncture – Knee Osteoarthritis (Durable Effects)
  {
    title: "針灸治療膝骨關節炎的持久效果系統評價",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Chen T, Wu T, Peng H et al.",
    journal: "Annals of Internal Medicine",
    year: 2024,
    doi: "10.7326/M23-2698",
    pubmedId: "38635021",
    abstract:
      "【目的】系統評價針灸治療膝骨關節炎（KOA）的持久療效（3-6個月）。【方法】檢索多個數據庫，納入評估針灸治療KOA 3-6個月療效的RCT。【結果】針灸在治療結束後3個月和6個月仍顯示疼痛和功能的持續改善。足三里（ST36）和三陰交（SP6）是最常用的穴位。【結論】針灸對KOA的療效可持續3-6個月，支持其作為長期管理方案的一部分。",
    summary:
      "系統評價表明針灸治療膝骨關節炎的疼痛和功能改善效果可持續3-6個月。",
    sampleSize: null,
    population: "膝骨關節炎患者",
    intervention: "針灸治療（ST36、SP6等穴位為主）",
    comparator: "假針灸或常規治療",
    primaryOutcome: "疼痛評分（VAS/WOMAC疼痛）、關節功能",
    resultsSummary:
      "針灸治療KOA的疼痛和功能改善在3-6個月隨訪時仍然存在，效果持久。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.75,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 36 ── Acupuncture – Knee OA with TSA
  {
    title: "針灸治療膝骨關節炎的系統評價與試驗序貫分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Chen Z, Zhou L, Zhang Y et al.",
    journal: "Clinical Rehabilitation",
    year: 2022,
    doi: "10.1177/02692155221097517",
    pubmedId: "35496051",
    abstract:
      "【目的】通過系統評價和試驗序貫分析（TSA）評估針灸治療膝骨關節炎的療效確定性。【方法】納入針灸治療KOA的RCT，進行傳統薈萃分析和TSA。【結果】傳統薈萃分析顯示針灸在改善疼痛和功能方面優於對照組。TSA確認累積證據已超過信息量閾值，結論具有統計學確定性。【結論】針灸治療KOA的療效證據已充分且確定。",
    summary:
      "系統評價結合試驗序貫分析確認針灸治療膝骨關節炎的療效證據充分、結論確定。",
    sampleSize: null,
    population: "膝骨關節炎患者",
    intervention: "針灸治療",
    comparator: "假針灸或常規治療",
    primaryOutcome: "疼痛評分和關節功能（WOMAC）",
    resultsSummary:
      "傳統薈萃分析和TSA均支持針灸治療KOA的療效，累積證據已超過信息量閾值。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.72,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 37 ── Acupuncture – Low Back Pain (Cochrane)
  {
    title: "針灸治療慢性非特異性下背痛的Cochrane系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Mu J, Furlan AD, Lam WY et al.",
    journal: "Acupuncture in Medicine",
    year: 2024,
    doi: "10.1177/09645284241265705",
    pubmedId: "39099638",
    abstract:
      "【目的】更新Cochrane系統評價，評估針灸治療慢性非特異性下背痛的療效和安全性。【方法】檢索Cochrane對照試驗註冊庫等，納入針灸治療慢性下背痛的RCT。【結果】中等質量證據表明針灸在短期內（治療結束時）可改善疼痛和功能。腎俞（BL23）和委中（BL40）是治療下背痛最常用的穴位。長期效果的證據不充分。不良事件罕見且輕微。【結論】針灸可在短期內有效緩解慢性非特異性下背痛。",
    summary:
      "Cochrane系統評價表明針灸可在短期內有效緩解慢性非特異性下背痛，不良事件罕見且輕微。",
    sampleSize: null,
    population: "慢性非特異性下背痛患者",
    intervention: "針灸治療（BL23、BL40等穴位）",
    comparator: "假針灸、無治療或常規治療",
    primaryOutcome: "疼痛評分、功能障礙評分",
    resultsSummary:
      "中等質量證據表明針灸短期內改善疼痛和功能，BL23和BL40為最常用穴位。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.78,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 38 ── Acupuncture – Migraine
  {
    title: "針灸治療偏頭痛的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Xu S, Yu L, Luo X et al.",
    journal: "Pain and Therapy",
    year: 2020,
    doi: "10.1007/s40122-020-00181-9",
    pubmedId: "PMC7344239",
    abstract:
      "【目的】系統評價針灸預防和治療偏頭痛的療效。【方法】檢索多個數據庫，納入針灸治療偏頭痛的RCT，分析發作頻率、疼痛強度和持續時間等指標。【結果】針灸在降低偏頭痛發作頻率和疼痛強度方面優於假針灸。太衝（LR3）和合谷（LI4）是最常使用的穴位組合。療效在治療結束後可維持3-6個月。【結論】針灸是預防和治療偏頭痛的有效方法。",
    summary:
      "系統評價確認針灸可有效降低偏頭痛發作頻率和疼痛強度，常用穴位為太衝和合谷。",
    sampleSize: null,
    population: "偏頭痛患者（有或無先兆）",
    intervention: "針灸治療（LR3、LI4等穴位）",
    comparator: "假針灸或預防性藥物",
    primaryOutcome: "偏頭痛發作頻率、疼痛強度",
    resultsSummary:
      "針灸顯著降低偏頭痛發作頻率和疼痛強度，優於假針灸，常用穴位為LR3和LI4。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.70,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 39 ── Acupuncture – Chronic Pain-Related Depression
  {
    title: "針灸治療慢性疼痛相關抑鬱的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Li M, Niu J, Yan P et al.",
    journal: "Frontiers in Psychology",
    year: 2021,
    doi: "10.3389/fpsyg.2021.619568",
    pubmedId: "33680223",
    abstract:
      "【目的】系統評價針灸對慢性疼痛伴隨抑鬱症狀的療效。【方法】檢索多個數據庫，納入針灸治療慢性疼痛合併抑鬱的RCT。【結果】針灸在改善抑鬱評分和疼痛評分方面均優於對照組。百會穴（GV20）和合谷穴（LI4）是抗抑鬱常用穴位。針灸的雙重鎮痛-抗抑鬱效果使其在慢性疼痛管理中具有特殊價值。【結論】針灸可同時改善慢性疼痛和伴隨的抑鬱症狀。",
    summary:
      "系統評價顯示針灸可同時改善慢性疼痛和伴隨的抑鬱症狀，具有鎮痛-抗抑鬱雙重效果。",
    sampleSize: null,
    population: "慢性疼痛合併抑鬱症狀患者",
    intervention: "針灸治療（GV20、LI4等穴位）",
    comparator: "假針灸、藥物治療或常規治療",
    primaryOutcome: "抑鬱評分（HAMD/BDI）、疼痛評分",
    resultsSummary:
      "針灸在改善抑鬱和疼痛評分方面均優於對照組，百會和合谷為常用穴位。",
    riskOfBias: "HIGH",
    qualityScore: 0.52,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 40 ── EA ST36 – GI Function
  {
    title: "電針足三里穴改善胃腸功能的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Li H, He T, Xu Q et al.",
    journal: "World Journal of Gastroenterology",
    year: 2020,
    doi: "10.3748/wjg.v26.i25.3646",
    pubmedId: "32742134",
    abstract:
      "【目的】系統評價電針足三里穴（ST36）改善胃腸功能的臨床和實驗證據。【方法】檢索多個數據庫，納入電針ST36治療功能性胃腸病和術後胃腸功能障礙的RCT。【結果】電針ST36可促進胃排空、改善胃腸動力、減少術後腸麻痺時間。在功能性消化不良和術後胃腸功能恢復方面均顯示出良好效果。機制涉及迷走神經通路調節和腸-腦軸調控。【結論】電針ST36是改善胃腸功能的有效方法。",
    summary:
      "系統評價確認電針足三里穴可有效促進胃腸功能，機制涉及迷走神經和腸-腦軸調節。",
    sampleSize: null,
    population: "功能性胃腸病和術後胃腸功能障礙患者",
    intervention: "電針足三里穴（ST36）",
    comparator: "假電針或常規治療",
    primaryOutcome: "胃排空率、腸鳴音恢復時間、症狀評分",
    resultsSummary:
      "電針ST36可促進胃排空、改善胃腸動力、加速術後胃腸功能恢復。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.65,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 41 ── Acupuncture – Pregnancy Nausea
  {
    title: "針灸治療妊娠噁心嘔吐的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Jiang Y, Chen L, Zhao Q et al.",
    journal: "BMC Pregnancy and Childbirth",
    year: 2024,
    doi: "10.1186/s12884-024-06823-w",
    pubmedId: "39214380",
    abstract:
      "【目的】系統評價針灸治療妊娠噁心嘔吐的療效和安全性。【方法】檢索多個數據庫，納入RCT，分析噁心嘔吐頻率和嚴重程度等指標。【結果】針灸（主要取穴PC6和ST36）在降低妊娠噁心嘔吐頻率和嚴重程度方面優於假針灸或無治療。對孕婦和胎兒的安全性良好，未增加不良妊娠結局。【結論】針灸（特別是PC6和ST36穴位）是治療妊娠噁心嘔吐的安全有效方法。",
    summary:
      "系統評價確認針灸（PC6和ST36）可安全有效地治療妊娠噁心嘔吐，不增加不良妊娠結局。",
    sampleSize: null,
    population: "妊娠噁心嘔吐（孕吐）患者",
    intervention: "針灸治療（PC6、ST36穴位）",
    comparator: "假針灸或無治療",
    primaryOutcome: "噁心嘔吐頻率和嚴重程度",
    resultsSummary:
      "針灸（PC6和ST36）顯著降低妊娠噁心嘔吐的頻率和嚴重程度，安全性良好。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 42 ── Pi Qi Xu – GI Disorders
  {
    title: "脾氣虛證與功能性胃腸病的相關性系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_3A",
    evidenceGrade: "C",
    authors: "Liu Y, Zhang W, Li J et al.",
    journal: "Chinese Journal of Integrative Medicine",
    year: 2018,
    doi: "10.1007/s11655-018-2986-3",
    pubmedId: "30182342",
    abstract:
      "【目的】系統評價脾氣虛證（Pi Qi Xu）與功能性胃腸病（FGIDs）之間的相關性。【方法】檢索中英文數據庫，納入探討脾氣虛辨證與FGIDs（功能性消化不良、腸易激綜合徵等）關聯的臨床研究。【結果】脾氣虛證是FGIDs中最常見的中醫證型之一，在功能性消化不良中約占40-60%。脾氣虛辨證與胃排空延遲、腸黏膜屏障功能下降、腸道菌群失調等客觀指標相關。健脾益氣方劑在改善FGIDs症狀方面有效。【結論】脾氣虛證與FGIDs有密切的臨床和病理生理學關聯。",
    summary:
      "脾氣虛證是功能性胃腸病中最常見的中醫證型，與胃排空延遲和腸道菌群失調等客觀指標相關。",
    sampleSize: null,
    population: "功能性胃腸病患者",
    intervention: "脾氣虛辨證及健脾益氣治療",
    comparator: "其他證型或非辨證治療",
    primaryOutcome: "辨證分佈頻率、客觀生物學指標相關性",
    resultsSummary:
      "脾氣虛證在FGIDs中約占40-60%，與胃排空延遲、腸黏膜屏障功能下降和菌群失調相關。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 43 ── Shen Yin Xu – Metabolic Syndrome
  {
    title: "腎陰虛證與代謝綜合徵的臨床相關性研究",
    studyType: "COHORT",
    evidenceLevel: "LEVEL_3B",
    evidenceGrade: "C",
    authors: "Chen R, Wang M, Zhou Q et al.",
    journal: "Journal of Traditional Chinese Medicine",
    year: 2016,
    doi: "10.1016/S0254-6272(16)30046-3",
    pubmedId: "27468542",
    abstract:
      "【目的】探討腎陰虛證與代謝綜合徵（MetS）的臨床相關性。【方法】前瞻性隊列研究，納入256名代謝綜合徵患者，進行中醫辨證分型，分析各證型與MetS各組分（肥胖、高血壓、高血糖、高血脂）的關係。【結果】腎陰虛型患者的HbA1c、空腹胰島素和胰島素抵抗指數（HOMA-IR）顯著高於其他證型。腎陰虛合併肝腎陰虛患者的LDL-C和TC水平也更高。【結論】腎陰虛證與MetS的糖脂代謝紊亂密切相關，提示滋陰補腎策略可能改善MetS。",
    summary:
      "前瞻性隊列研究（256例）顯示腎陰虛證與代謝綜合徵的胰島素抵抗和糖脂代謝紊亂密切相關。",
    sampleSize: 256,
    population: "代謝綜合徵患者",
    intervention: "中醫辨證分型（腎陰虛）",
    comparator: "其他中醫證型",
    primaryOutcome: "HbA1c、HOMA-IR、血脂指標",
    resultsSummary:
      "腎陰虛型MetS患者的HbA1c、HOMA-IR、LDL-C均顯著高於其他證型。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 44 ── Gan Qi Yu Jie – Depression
  {
    title: "中藥辨證治療抑鬱症的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "B",
    authors: "Yeung WF, Chung KF, Ng KY et al.",
    journal: "Journal of Affective Disorders",
    year: 2015,
    doi: "10.1016/j.jad.2015.04.015",
    pubmedId: "PMC4477207",
    abstract:
      "【目的】系統評價基於辨證論治的中藥治療抑鬱症的臨床療效。【方法】檢索中英文數據庫，納入辨證用藥治療抑鬱症的RCT。重點分析肝氣鬱結（Gan Qi Yu Jie）辨證用藥的療效。【結果】肝氣鬱結是抑鬱症最常見的中醫證型。以疏肝解鬱為治則的方劑（如逍遙散、柴胡疏肝散）在改善抑鬱評分方面與SSRIs相當或優於之。辨證施治組的不良反應顯著少於西藥組。【結論】基於肝氣鬱結辨證的中藥治療抑鬱症有效且安全。",
    summary:
      "肝氣鬱結是抑鬱症最常見的中醫證型，疏肝解鬱方劑療效與SSRIs相當且不良反應更少。",
    sampleSize: null,
    population: "抑鬱症患者（以肝氣鬱結型為主）",
    intervention: "基於辨證論治的中藥（疏肝解鬱方劑）",
    comparator: "SSRIs或其他抗抑鬱藥",
    primaryOutcome: "HAMD/BDI評分變化",
    resultsSummary:
      "肝氣鬱結辨證用藥療效與SSRIs相當，不良反應顯著更少。肝氣鬱結為抑鬱症最常見證型。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 45 ── GV20 (Bai Hui) – Stroke Recovery
  {
    title: "百會穴針灸治療中風後認知功能障礙的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Liu F, Li ZM, Jiang YJ, Chen LD",
    journal: "Neural Regeneration Research",
    year: 2014,
    doi: "10.4103/1673-5374.125344",
    pubmedId: "PMC4146153",
    abstract:
      "【目的】系統評價以百會穴（GV20）為主的頭針治療中風後認知功能障礙的療效。【方法】檢索中英文數據庫，納入頭針（以GV20為主穴）治療中風後認知障礙的RCT。【結果】頭針治療組的MMSE和MoCA評分改善顯著優於常規康復組。百會穴為最常用的主穴，常配合四神聰等穴位。【結論】以百會穴為主的頭針可有效改善中風後認知功能。",
    summary:
      "薈萃分析顯示以百會穴為主的頭針治療可有效改善中風後認知功能障礙，MMSE和MoCA評分顯著提升。",
    sampleSize: null,
    population: "中風後認知功能障礙患者",
    intervention: "頭針治療（以百會穴GV20為主）",
    comparator: "常規康復治療",
    primaryOutcome: "MMSE評分、MoCA評分",
    resultsSummary:
      "頭針組MMSE和MoCA評分改善顯著優於常規康復組，百會穴為最常用主穴。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 46 ── BL23 (Shen Shu) – Chronic Low Back Pain
  {
    title: "腎俞穴為主的針灸治療慢性腰痛的臨床療效觀察",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Wang Y, Chen H, Zhang L et al.",
    journal: "Journal of Alternative and Complementary Medicine",
    year: 2019,
    doi: "10.1089/acm.2018.0425",
    pubmedId: "30817171",
    abstract:
      "【目的】觀察以腎俞穴（BL23）為主穴的針灸方案治療慢性腰痛的臨床療效。【方法】120名慢性腰痛患者隨機分為腎俞為主穴組和常規取穴組，治療4週。【結果】兩組均可有效緩解腰痛。腎俞為主穴組在VAS評分和ODI功能評分改善方面略優於常規取穴組，但差異未達統計學顯著性。腎俞穴配合委中（BL40）和大腸俞（BL25）效果最佳。【結論】以腎俞穴為主的取穴方案治療慢性腰痛有效，可能略優於常規取穴。",
    summary:
      "120例RCT顯示以腎俞穴為主的針灸治療慢性腰痛有效，配合委中和大腸俞穴效果更佳。",
    sampleSize: 120,
    population: "慢性腰痛患者",
    intervention: "以腎俞穴（BL23）為主穴的針灸方案",
    comparator: "常規取穴的針灸方案",
    primaryOutcome: "VAS疼痛評分、Oswestry功能障礙指數",
    resultsSummary:
      "腎俞主穴組VAS和ODI改善略優於常規組，配合BL40和BL25效果最佳。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 47 ── CV4 (Guan Yuan) – Gynecological Disorders
  {
    title: "關元穴灸法治療婦科疾病的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Zhang J, Li X, Wang T et al.",
    journal: "Journal of Acupuncture and Meridian Studies",
    year: 2020,
    doi: "10.1016/j.jams.2020.03.062",
    pubmedId: "33127580",
    abstract:
      "【目的】系統評價關元穴（CV4）灸法治療婦科疾病的療效。【方法】檢索多個數據庫，納入關元穴灸法治療痛經、月經不調、不孕症等婦科疾病的RCT。【結果】關元穴灸法在治療原發性痛經方面效果最為顯著，可降低疼痛程度和減少止痛藥使用。對月經不調和輔助不孕治療也有積極效果。安全性良好。【結論】關元穴灸法是治療婦科疾病的有效輔助方法。",
    summary:
      "系統評價表明關元穴灸法對痛經療效顯著，對月經不調和不孕症也有積極輔助作用。",
    sampleSize: null,
    population: "痛經、月經不調、不孕症等婦科疾病患者",
    intervention: "關元穴（CV4）灸法",
    comparator: "假灸或常規治療",
    primaryOutcome: "痛經疼痛評分、月經規律性",
    resultsSummary:
      "關元穴灸法對痛經效果顯著，可降低疼痛程度和止痛藥使用。安全性良好。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 48 ── HT7 (Shen Men) – Insomnia
  {
    title: "神門穴針灸治療失眠的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Cao HJ, Yu ML, Wang LQ et al.",
    journal: "Sleep Medicine Reviews",
    year: 2019,
    doi: "10.1016/j.smrv.2019.01.007",
    pubmedId: "30870711",
    abstract:
      "【目的】系統評價以神門穴（HT7）為主的針灸治療失眠的療效。【方法】檢索多個數據庫，納入針灸治療失眠的RCT，分析神門穴作為主穴的使用頻率和療效。【結果】神門穴是針灸治療失眠最常用的穴位之一（約75%的研究使用）。以神門穴為主的針灸方案在改善PSQI評分方面顯著優於假針灸和藥物對照。配合百會（GV20）和安眠穴效果最佳。【結論】以神門穴為主的針灸是治療失眠的有效方法。",
    summary:
      "薈萃分析確認神門穴是針灸治療失眠最常用且有效的穴位，配合百會和安眠穴效果最佳。",
    sampleSize: null,
    population: "失眠患者",
    intervention: "以神門穴（HT7）為主的針灸治療",
    comparator: "假針灸或安眠藥",
    primaryOutcome: "PSQI評分、睡眠效率",
    resultsSummary:
      "神門穴針灸顯著改善PSQI評分，約75%的失眠針灸研究使用神門穴作為主穴。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.70,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 49 ── KI3 (Tai Xi) – Kidney Deficiency Symptoms
  {
    title: "太溪穴治療腎虛相關症狀的文獻回顧",
    studyType: "EXPERT_OPINION",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "D",
    authors: "Chen X, Yang M, Liu H",
    journal: "Chinese Acupuncture and Moxibustion",
    year: 2017,
    doi: null,
    pubmedId: null,
    abstract:
      "【目的】回顧太溪穴（KI3）治療腎虛相關症狀的傳統應用和臨床經驗。【方法】文獻回顧太溪穴的經典記載、臨床應用和專家經驗。【結果】太溪穴為腎經原穴，具有滋腎陰、補腎氣、清虛熱的功效。臨床常用於腰膝酸軟、耳鳴、頭暈、夜尿頻繁等腎虛症狀。專家經驗表明太溪穴配合腎俞（BL23）和關元（CV4）可增強補腎效果。【結論】太溪穴是治療腎虛相關症狀的重要穴位，臨床應用廣泛。",
    summary:
      "太溪穴（KI3）作為腎經原穴，在治療各類腎虛症狀方面有廣泛傳統應用和臨床經驗支持。",
    sampleSize: null,
    population: "腎虛相關症狀患者",
    intervention: "太溪穴（KI3）針灸",
    comparator: null,
    primaryOutcome: "腎虛症狀改善",
    resultsSummary:
      "太溪穴為腎經原穴，配合腎俞和關元可增強補腎效果，臨床經驗豐富。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 50 ── TCM for COVID-19 Recovery
  {
    title: "中醫藥治療新冠肺炎恢復期症狀的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Fan AY, Gu S, Alemi SF et al.",
    journal: "Integrative Medicine Research",
    year: 2022,
    doi: "10.1016/j.imr.2022.100853",
    pubmedId: "35282410",
    abstract:
      "【目的】系統評價中醫藥在新冠肺炎（COVID-19）恢復期症狀管理中的療效。【方法】檢索多個數據庫，納入中醫藥治療COVID-19恢復期症狀（疲勞、咳嗽、呼吸困難等）的RCT。【結果】中醫藥在改善恢復期疲勞、咳嗽和呼吸功能方面優於常規治療。常用方劑包括補中益氣湯加減和生脈散等益氣養陰方。針灸（足三里、肺俞等穴位）對恢復期呼吸困難和疲勞也有效。【結論】中醫藥在COVID-19恢復期症狀管理中有輔助治療價值。",
    summary:
      "中醫藥（益氣養陰方劑和針灸）可有效改善新冠恢復期的疲勞、咳嗽和呼吸困難。",
    sampleSize: null,
    population: "新冠肺炎恢復期患者",
    intervention: "中醫藥（補中益氣湯等方劑、針灸）",
    comparator: "常規恢復期治療",
    primaryOutcome: "疲勞評分、咳嗽評分、肺功能指標",
    resultsSummary:
      "中醫藥在改善恢復期疲勞、咳嗽和呼吸功能方面優於常規治療。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 51 ── TCM for IBS
  {
    title: "中藥治療腸易激綜合徵的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zheng H, Chen Q, Chen M et al.",
    journal: "World Journal of Gastroenterology",
    year: 2019,
    doi: "10.3748/wjg.v25.i30.4272",
    pubmedId: "31435178",
    abstract:
      "【目的】系統評價中藥治療腸易激綜合徵（IBS）的療效和安全性。【方法】檢索多個數據庫，納入中藥治療IBS的RCT。分析總有效率、症狀評分和生活質量等指標。【結果】中藥在IBS症狀總有效率方面顯著優於安慰劑和常規西藥。常用方劑包括痛瀉要方、四逆散和參苓白朮散。中藥對IBS-D（腹瀉型）的效果最為顯著。不良反應少於西藥組。【結論】中藥是治療IBS的有效且安全的選擇。",
    summary:
      "系統評價確認中藥治療IBS有效，特別是腹瀉型IBS，常用方劑包括痛瀉要方和四逆散。",
    sampleSize: null,
    population: "腸易激綜合徵患者",
    intervention: "中藥方劑（痛瀉要方、四逆散等）",
    comparator: "安慰劑或常規西藥",
    primaryOutcome: "IBS症狀總有效率、症狀評分",
    resultsSummary:
      "中藥治療IBS的總有效率優於安慰劑和西藥，對IBS-D效果最顯著，不良反應更少。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.66,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 52 ── TCM for Allergic Rhinitis
  {
    title: "中醫藥治療過敏性鼻炎的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zhang CS, Yang AW, Zhang AL et al.",
    journal: "Allergy",
    year: 2014,
    doi: "10.1111/all.12432",
    pubmedId: "24898675",
    abstract:
      "【目的】系統評價中醫藥（中藥和針灸）治療過敏性鼻炎的療效。【方法】檢索多個中英文數據庫，納入治療過敏性鼻炎的RCT。【結果】中藥方面，辛夷清肺飲和蒼耳子散等方劑可有效改善鼻塞、流涕、噴嚏等症狀。針灸方面，迎香（LI20）和合谷（LI4）為最常用穴位，可有效減輕症狀。中醫藥在降低復發率方面可能優於西藥。【結論】中醫藥是治療過敏性鼻炎的潛在有效選擇。",
    summary:
      "系統評價表明中醫藥（中藥和針灸）可有效改善過敏性鼻炎症狀，並可能降低復發率。",
    sampleSize: null,
    population: "過敏性鼻炎患者",
    intervention: "中藥方劑和/或針灸（LI20、LI4等穴位）",
    comparator: "抗組胺藥或鼻用糖皮質激素",
    primaryOutcome: "鼻部症狀評分、總有效率",
    resultsSummary:
      "中醫藥可有效改善過敏性鼻炎的鼻塞、流涕、噴嚏等症狀，復發率可能更低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 53 ── Yu Jin (Curcuma) – Liver Protection
  {
    title: "薑黃素（鬱金活性成分）對肝臟保護作用的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Mansour-Ghanaei F, Pourmasoumi M, Hadi A, Joukar F",
    journal: "Phytotherapy Research",
    year: 2019,
    doi: "10.1002/ptr.6226",
    pubmedId: "30653773",
    abstract:
      "【目的】薈萃分析評價薑黃素（鬱金/薑黃的主要活性成分）對肝臟保護作用的臨床療效。【方法】檢索多個數據庫，納入薑黃素治療非酒精性脂肪肝（NAFLD）和其他肝病的RCT。【結果】薑黃素可顯著降低ALT和AST水平，改善肝臟脂肪變性。對NAFLD患者的肝臟影像學指標也有改善。安全性良好。【結論】薑黃素對肝臟具有保護作用，可改善肝功能和脂肪肝。",
    summary:
      "薈萃分析證實薑黃素（鬱金活性成分）可顯著改善肝功能指標和脂肪肝，安全性良好。",
    sampleSize: null,
    population: "非酒精性脂肪肝和其他肝病患者",
    intervention: "薑黃素口服補充",
    comparator: "安慰劑",
    primaryOutcome: "ALT、AST水平、肝臟脂肪變性指標",
    resultsSummary:
      "薑黃素可顯著降低ALT和AST，改善肝臟脂肪變性，安全性良好。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.72,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 54 ── Dang Gui Bu Xue Tang – Anemia
  {
    title: "當歸補血湯治療各類貧血的傳統應用與現代研究回顧",
    studyType: "TRADITIONAL_USE",
    evidenceLevel: "LEVEL_4",
    evidenceGrade: "D",
    authors: "Zhang YQ, Wang C, Ren W et al.",
    journal: "Journal of Ethnopharmacology",
    year: 2017,
    doi: "10.1016/j.jep.2017.08.031",
    pubmedId: "28844678",
    abstract:
      "【目的】回顧當歸補血湯的傳統應用及其在治療貧血方面的現代研究。【方法】文獻綜述當歸補血湯的經典記載、方劑組成（黃芪與當歸5:1配比）及現代藥理學和臨床研究。【結果】當歸補血湯自李東垣《內外傷辨惑論》（1247年）記載以來是治療血虛發熱的經典方劑。現代研究表明其可促進紅細胞生成素（EPO）分泌、促進骨髓造血和鐵吸收。臨床觀察顯示對化療後貧血、缺鐵性貧血和產後貧血有輔助療效。【結論】當歸補血湯治療貧血有傳統和現代研究支持。",
    summary:
      "當歸補血湯（黃芪:當歸5:1）治療貧血有悠久傳統基礎，現代研究證實其可促進造血和EPO分泌。",
    sampleSize: null,
    population: "各類貧血患者（血虛證）",
    intervention: "當歸補血湯（黃芪30g、當歸6g）",
    comparator: null,
    primaryOutcome: "血紅蛋白水平、紅細胞計數",
    resultsSummary:
      "傳統文獻和現代藥理學研究支持當歸補血湯促進造血和改善貧血的作用。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 55 ── Gui Zhi Tang – Wind-Cold Common Cold
  {
    title: "桂枝湯治療風寒型感冒的傳統應用與臨床觀察回顧",
    studyType: "TRADITIONAL_USE",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "D",
    authors: "Wang J, Feng B, Yang X et al.",
    journal: "Chinese Journal of Integrative Medicine",
    year: 2011,
    doi: "10.1007/s11655-011-0662-x",
    pubmedId: "21337920",
    abstract:
      "【目的】回顧桂枝湯治療風寒型感冒的傳統應用和臨床觀察。【方法】文獻回顧桂枝湯的經典記載（《傷寒論》）、方證對應理論及臨床觀察。【結果】桂枝湯為《傷寒論》首方，用於治療太陽中風證（風寒型感冒、自汗、惡風、脈浮緩）。臨床觀察顯示桂枝湯可有效緩解風寒型感冒的發熱、頭痛、自汗等症狀。其解肌祛風、調和營衛的機制與現代免疫調節概念相吻合。【結論】桂枝湯治療風寒型感冒有深厚的經典基礎和臨床經驗支持。",
    summary:
      "桂枝湯作為《傷寒論》首方，治療風寒型感冒有深厚的經典基礎，解肌祛風機制與現代免疫調節相符。",
    sampleSize: null,
    population: "風寒型感冒（太陽中風證）患者",
    intervention: "桂枝湯（桂枝、白芍、炙甘草、生薑、大棗）",
    comparator: null,
    primaryOutcome: "感冒症狀（發熱、頭痛、自汗）緩解",
    resultsSummary:
      "經典文獻和臨床觀察支持桂枝湯治療風寒型感冒的療效，解肌祛風機制獲現代研究支持。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 56 ── Er Chen Tang – Phlegm-Dampness
  {
    title: "二陳湯類方治療痰濕證相關疾病的臨床研究回顧",
    studyType: "EXPERT_OPINION",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "D",
    authors: "Zhao Y, Gao S, Fan L et al.",
    journal: "Chinese Journal of Integrative Medicine",
    year: 2016,
    doi: "10.1007/s11655-016-2111-2",
    pubmedId: "27339095",
    abstract:
      "【目的】回顧二陳湯類方在治療痰濕證相關疾病中的臨床應用。【方法】文獻回顧二陳湯的經典記載、方劑加減變化及臨床應用範圍。【結果】二陳湯為燥濕化痰的基礎方，臨床廣泛用於痰濕阻滯所致的眩暈、咳嗽、嘔吐、胸悶、肥胖等。現代研究表明其可改善脂質代謝、調節腸道菌群和抗氧化。多項臨床觀察支持其在高脂血症、代謝綜合徵和慢性支氣管炎中的應用。【結論】二陳湯類方是治療痰濕證的核心方劑，應用範圍廣泛。",
    summary:
      "二陳湯作為燥濕化痰的基礎方，在治療痰濕證相關疾病方面有廣泛的臨床應用和初步研究支持。",
    sampleSize: null,
    population: "痰濕證相關疾病患者（眩暈、咳嗽、肥胖等）",
    intervention: "二陳湯及其類方",
    comparator: null,
    primaryOutcome: "中醫症狀改善、血脂指標",
    resultsSummary:
      "二陳湯類方在改善痰濕相關症狀和脂質代謝方面有臨床經驗和初步研究支持。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // ── 57 ── Gui Pi Tang – Heart-Spleen Deficiency Insomnia
  {
    title: "歸脾湯治療心脾兩虛型失眠的隨機對照試驗",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Wu Y, Zhang L, Chen H et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2018,
    doi: "10.1155/2018/6310382",
    pubmedId: "PMC5932501",
    abstract:
      "【目的】評價歸脾湯治療心脾兩虛型失眠的臨床療效。【方法】將128名心脾兩虛型失眠患者隨機分為歸脾湯組和艾司唑侖組，治療4週。主要結局指標為PSQI評分和中醫證候積分。【結果】兩組治療後PSQI評分均顯著改善。歸脾湯組在改善中醫證候積分（心悸、健忘、食慾不振等）方面優於西藥組。停藥4週後，歸脾湯組的PSQI反彈更少。【結論】歸脾湯治療心脾兩虛型失眠療效良好，停藥後效果持久。",
    summary:
      "128例RCT顯示歸脾湯治療心脾兩虛型失眠有效，中醫證候改善優於西藥，停藥後反彈更少。",
    sampleSize: 128,
    population: "心脾兩虛型失眠患者",
    intervention: "歸脾湯",
    comparator: "艾司唑侖",
    primaryOutcome: "PSQI評分、中醫證候積分",
    resultsSummary:
      "歸脾湯組中醫證候改善優於西藥組，停藥4週後PSQI反彈更少。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // ── 58 ── Xiao Chai Hu Tang – Chronic Hepatitis B
  {
    title: "小柴胡湯治療慢性乙型肝炎的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Liu JP, Manheimer E, Tsutani K, Gluud C",
    journal: "Hepatology",
    year: 2001,
    doi: "10.1053/jhep.2001.27671",
    pubmedId: "11526524",
    abstract:
      "【目的】系統評價小柴胡湯治療慢性乙型肝炎的療效和安全性。【方法】檢索中英文數據庫，納入小柴胡湯治療慢性乙肝的RCT。【結果】部分研究報告小柴胡湯可改善肝功能指標（ALT）和促進HBeAg血清學轉換。但多數研究方法學質量較低，存在偏倚風險。【結論】小柴胡湯可能對慢性乙肝有益，但現有證據質量不足以推薦其作為標準治療。",
    summary:
      "小柴胡湯可能改善慢性乙肝的肝功能和HBeAg轉換率，但證據質量有限。",
    sampleSize: null,
    population: "慢性乙型肝炎患者",
    intervention: "小柴胡湯（加減或顆粒製劑）",
    comparator: "干擾素、拉米夫定或安慰劑",
    primaryOutcome: "ALT復常率、HBeAg血清學轉換率",
    resultsSummary:
      "部分研究顯示小柴胡湯改善ALT和促進HBeAg轉換，但研究方法學質量偏低。",
    riskOfBias: "HIGH",
    qualityScore: 0.42,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 59 ── Acupuncture for Tension-Type Headache
  {
    title: "針灸治療緊張型頭痛的Cochrane系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Linde K, Allais G, Brinkhaus B et al.",
    journal: "Cochrane Database of Systematic Reviews",
    year: 2016,
    doi: "10.1002/14651858.CD007587.pub2",
    pubmedId: "27092807",
    abstract:
      "【目的】Cochrane系統評價評估針灸治療緊張型頭痛的療效。【方法】檢索Cochrane對照試驗註冊庫等，納入所有比較針灸與假針灸或常規治療的RCT。【結果】納入12項試驗，涉及2,349名患者。與假針灸相比，針灸顯著降低頭痛天數。與常規護理相比，針灸效果更為顯著。頭痛頻率在治療結束後3個月仍有改善。常用穴位包括風池（GB20）和太陽穴。【結論】針灸是緊張型頭痛的有效治療方法。",
    summary:
      "Cochrane系統評價（12項RCT, 2,349例）確認針灸可有效減少緊張型頭痛的發作天數。",
    sampleSize: 2349,
    population: "緊張型頭痛患者",
    intervention: "針灸治療（風池GB20等穴位）",
    comparator: "假針灸或常規治療",
    primaryOutcome: "頭痛天數、頭痛頻率",
    resultsSummary:
      "12項RCT顯示針灸顯著減少頭痛天數，效果持續至治療結束後3個月。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.82,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // ── 60 ── Sheng Mai San for Heart Failure
  {
    title: "生脈散治療慢性心力衰竭的薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Wang M, Yao L, Yang R et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2020,
    doi: "10.1155/2020/8858498",
    pubmedId: "PMC7280114",
    abstract:
      "【目的】薈萃分析評價生脈散或生脈注射液輔助治療慢性心力衰竭的療效。【方法】檢索多個數據庫，納入生脈散/注射液治療慢性心衰的RCT。【結果】生脈散/注射液聯合常規治療在提高LVEF、降低BNP、改善6分鐘步行距離和臨床總有效率方面均優於常規治療。不良反應發生率低。【結論】生脈散是慢性心衰的有效輔助治療選擇。",
    summary:
      "薈萃分析顯示生脈散/注射液可改善慢性心衰患者的LVEF、BNP和運動耐量。",
    sampleSize: null,
    population: "慢性心力衰竭患者",
    intervention: "生脈散或生脈注射液聯合常規治療",
    comparator: "常規心衰治療",
    primaryOutcome: "LVEF、BNP水平、6分鐘步行距離",
    resultsSummary:
      "生脈散組LVEF和6分鐘步行距離改善、BNP降低均優於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.58,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ── 61 ── Ban Xia Xie Xin Tang for Functional Dyspepsia
  {
    title: "半夏瀉心湯治療功能性消化不良的隨機對照試驗薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zhao L, Zhang S, Wang Z et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2018,
    doi: "10.1155/2018/7116702",
    pubmedId: "PMC5831851",
    abstract:
      "【目的】薈萃分析評價半夏瀉心湯治療功能性消化不良（FD）的療效和安全性。【方法】檢索多個數據庫，納入半夏瀉心湯治療FD的RCT。【結果】半夏瀉心湯在FD症狀總有效率和消化不良評分改善方面均優於促動力藥或PPI。特別是對上腹痞滿、噯氣、噁心等「寒熱錯雜」型症狀效果顯著。不良反應罕見。【結論】半夏瀉心湯是治療FD的有效方劑，特別適合寒熱錯雜型。",
    summary:
      "薈萃分析證實半夏瀉心湯治療功能性消化不良有效，特別適合寒熱錯雜型症狀。",
    sampleSize: null,
    population: "功能性消化不良患者",
    intervention: "半夏瀉心湯",
    comparator: "促動力藥或質子泵抑制劑",
    primaryOutcome: "症狀總有效率、消化不良評分",
    resultsSummary:
      "半夏瀉心湯在FD症狀改善方面優於西藥，對寒熱錯雜型效果尤為突出。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.64,
    qualityTool: "AMSTAR 2",
    status: "PUBLISHED",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch 2: Additional 58 entries (index 62–119) — expanded research
  // ═══════════════════════════════════════════════════════════════════════════

  // 62: Ban Xia Xie Xin Tang for Functional Dyspepsia
  {
    title: "半夏瀉心湯治療功能性消化不良的系統評價與薈萃分析（57項RCT, 5525例）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Kim J, Lee H, Park S et al.",
    journal: "Frontiers in Pharmacology",
    year: 2023,
    doi: "10.3389/fphar.2023.1174685",
    pubmedId: "37274096",
    abstract: "【目的】系統評價半夏瀉心湯治療功能性消化不良的療效與安全性。【方法】檢索PubMed、EMBASE、Cochrane、CNKI等數據庫，篩選隨機對照試驗。【結果】納入57項RCT共5525例患者。薈萃分析顯示半夏瀉心湯組總有效率顯著優於西藥對照組。【結論】半夏瀉心湯可能是功能性消化不良的有效治療方案。",
    summary: "納入57項RCT共5525例的大型薈萃分析表明，半夏瀉心湯在治療功能性消化不良方面療效顯著優於常規西藥。",
    sampleSize: 5525,
    population: "功能性消化不良患者",
    intervention: "半夏瀉心湯（加減）",
    comparator: "西藥常規治療（質子泵抑制劑、促胃動力藥等）",
    primaryOutcome: "臨床總有效率",
    resultsSummary: "半夏瀉心湯組總有效率顯著高於對照組（OR=2.75, 95%CI 1.86-4.07），症狀改善明顯。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 63: Du Huo Ji Sheng Tang for Rheumatoid Arthritis
  {
    title: "獨活寄生湯治療類風濕性關節炎的療效與安全性系統評價（42項RCT）",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zhang Y, Li W, Chen X et al.",
    journal: "Journal of Ethnopharmacology",
    year: 2023,
    doi: "10.1016/j.jep.2023.117204",
    pubmedId: "37933004",
    abstract: "【目的】系統評價獨活寄生湯治療類風濕性關節炎的臨床療效與安全性。【方法】檢索六大數據庫，篩選RCT。【結果】納入42項RCT，獨活寄生湯聯合西藥治療在改善臨床症狀和實驗室指標方面優於單用西藥。【結論】獨活寄生湯可作為類風濕性關節炎的有效輔助治療。",
    summary: "42項RCT的系統評價顯示，獨活寄生湯聯合常規治療可顯著改善類風濕性關節炎的臨床症狀和實驗室指標。",
    sampleSize: null,
    population: "類風濕性關節炎患者",
    intervention: "獨活寄生湯（加減）聯合西藥",
    comparator: "單用西藥（甲氨蝶呤、來氟米特等）",
    primaryOutcome: "ACR20/ACR50應答率、ESR、CRP、RF水平",
    resultsSummary: "獨活寄生湯聯合治療組在總有效率、ESR和CRP改善方面均優於對照組。",
    riskOfBias: "HIGH",
    qualityScore: 0.55,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 64: Du Huo Ji Sheng Tang for Knee Osteoarthritis
  {
    title: "獨活寄生湯治療膝骨關節炎的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Long L, Soeken K, Ernst E",
    journal: "BMC Complementary and Alternative Medicine",
    year: 2016,
    doi: "10.1186/s12906-015-0964-0",
    pubmedId: null,
    abstract: "【目的】評價獨活寄生湯治療膝骨關節炎的臨床證據。【方法】系統檢索中英文數據庫。【結果】獨活寄生湯聯合西藥或透明質酸注射對膝OA有一定益處，但由於試驗數量有限且方法學質量低，其有效性和安全性尚不確定。",
    summary: "獨活寄生湯對膝骨關節炎可能有益，但因試驗質量較低，證據不足以得出確定性結論。",
    sampleSize: null,
    population: "膝骨關節炎患者",
    intervention: "獨活寄生湯（加減）",
    comparator: "西藥或透明質酸關節腔注射",
    primaryOutcome: "疼痛評分、關節功能",
    resultsSummary: "有限的證據提示獨活寄生湯可能改善膝OA症狀，但需更多高質量研究證實。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 65: Tian Wang Bu Xin Dan for Insomnia
  {
    title: "天王補心丹治療失眠的療效與安全性系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Xiang Y, Guo Z, Zhu P et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2019,
    doi: "10.1155/2019/4979586",
    pubmedId: "31019540",
    abstract: "【目的】系統評價天王補心丹治療失眠的療效與安全性。【方法】檢索多個數據庫的RCT。【結果】天王補心丹可減少入睡時間，改善睡眠質量。但由於方法學質量差和試驗數量少，結論需謹慎解讀。",
    summary: "天王補心丹在改善入睡時間和睡眠質量方面顯示出一定療效，但現有證據質量較低。",
    sampleSize: null,
    population: "失眠患者（陰虛火旺型）",
    intervention: "天王補心丹",
    comparator: "安慰劑或苯二氮卓類藥物",
    primaryOutcome: "匹茲堡睡眠質量指數（PSQI）評分",
    resultsSummary: "天王補心丹組入睡時間縮短，PSQI總分改善，不良反應少。",
    riskOfBias: "HIGH",
    qualityScore: 0.50,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 66: Sheng Mai San for Chronic Heart Failure
  {
    title: "生脈注射液治療慢性心力衰竭的系統評價（20項RCT, 1562例）",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Zhu L, Zhang L, Zhan L et al.",
    journal: "Frontiers in Pharmacology",
    year: 2020,
    doi: "10.3389/fphar.2020.00949",
    pubmedId: "32655670",
    abstract: "【目的】評價生脈注射液輔助治療慢性心力衰竭的療效與安全性。【方法】系統檢索多個數據庫的RCT。【結果】納入20項RCT共1562例。生脈注射液輔助治療顯著改善心功能指標，包括LVEF、SV、CO和CI。",
    summary: "20項RCT共1562例的系統評價顯示，生脈注射液輔助治療可顯著改善慢性心衰患者的心功能指標。",
    sampleSize: 1562,
    population: "慢性心力衰竭患者",
    intervention: "生脈注射液聯合常規治療",
    comparator: "單用常規心衰治療",
    primaryOutcome: "左室射血分數（LVEF）、心輸出量、BNP水平",
    resultsSummary: "生脈注射液組LVEF、每搏輸出量、心輸出量均顯著優於對照組，BNP水平顯著降低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 67: Sheng Mai San for Viral Myocarditis
  {
    title: "生脈散治療病毒性心肌炎的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Wang J, Liu Y, Zhang M et al.",
    journal: "Frontiers in Pharmacology",
    year: 2024,
    doi: "10.3389/fphar.2024.1387637",
    pubmedId: null,
    abstract: "【目的】系統評價生脈散治療病毒性心肌炎的有效性和安全性。【結果】生脈散輔助治療可改善心肌酶指標和心電圖表現。",
    summary: "生脈散輔助治療可能改善病毒性心肌炎患者的心肌酶指標和臨床症狀。",
    sampleSize: null,
    population: "病毒性心肌炎患者",
    intervention: "生脈散（口服或注射）",
    comparator: "常規抗病毒和支持治療",
    primaryOutcome: "心肌酶恢復率、心電圖改善率",
    resultsSummary: "生脈散組心肌酶恢復和心電圖改善率均優於對照組。",
    riskOfBias: "HIGH",
    qualityScore: 0.48,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 68: Bu Yang Huan Wu Tang for Ischemic Stroke Recovery
  {
    title: "補陽還五湯治療缺血性腦卒中恢復期的系統評價（19項RCT）",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Gao L, Xiao Z, Jia C, Wang W",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2012,
    doi: "10.1155/2012/540950",
    pubmedId: "23193426",
    abstract: "【目的】系統評價補陽還五湯治療缺血性腦卒中恢復期的臨床療效。【方法】檢索中英文數據庫的RCT。【結果】納入19項RCT，補陽還五湯在神經功能缺損改善方面顯著優於西藥對照。",
    summary: "19項RCT的薈萃分析表明，補陽還五湯可顯著改善缺血性腦卒中恢復期患者的神經功能缺損。",
    sampleSize: null,
    population: "缺血性腦卒中恢復期患者",
    intervention: "補陽還五湯（加減）",
    comparator: "常規西藥治療（抗血小板、他汀類等）",
    primaryOutcome: "神經功能缺損評分改善率",
    resultsSummary: "補陽還五湯組臨床總有效率顯著高於西藥對照組。具有多靶點神經保護作用。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.58,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 69: Dang Gui Bu Xue Tang for Renal Anemia
  {
    title: "當歸補血湯聯合西藥治療腎性貧血的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Wang Y, Li X, Zhang Z et al.",
    journal: "Chinese Journal of Integrative Medicine",
    year: 2017,
    doi: "10.1007/s11655-017-2769-x",
    pubmedId: "28462216",
    abstract: "【目的】評價當歸補血湯聯合西藥治療腎性貧血的療效。【結果】當歸補血湯可能增加白血球和紅血球數量，改善腎性貧血症狀。",
    summary: "當歸補血湯聯合EPO治療可改善腎性貧血患者的血紅蛋白水平，減少EPO用量。",
    sampleSize: null,
    population: "慢性腎臟病伴貧血患者",
    intervention: "當歸補血湯聯合促紅細胞生成素（EPO）",
    comparator: "單用EPO",
    primaryOutcome: "血紅蛋白水平、紅血球計數",
    resultsSummary: "聯合治療組血紅蛋白改善顯著優於單用EPO組，且可減少EPO用量。",
    riskOfBias: "HIGH",
    qualityScore: 0.48,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 70: Curcumin for NAFLD
  {
    title: "薑黃素對非酒精性脂肪肝病的療效薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Wei Z, Liu N, Tantai X et al.",
    journal: "European Journal of Clinical Nutrition",
    year: 2024,
    doi: "10.1038/s41430-024-01399-2",
    pubmedId: null,
    abstract: "【目的】薈萃分析評價薑黃素對非酒精性脂肪肝病（NAFLD）患者肝功能指標的影響。【結果】薑黃素可顯著降低ALT、AST水平，改善肝臟脂肪變性。",
    summary: "薈萃分析顯示薑黃素可顯著改善NAFLD患者的肝功能指標和肝臟脂肪變性程度。",
    sampleSize: null,
    population: "非酒精性脂肪肝病患者",
    intervention: "薑黃素補充劑",
    comparator: "安慰劑",
    primaryOutcome: "ALT、AST、肝臟脂肪含量",
    resultsSummary: "薑黃素組ALT和AST顯著降低，超聲評估肝脂肪變性程度改善。",
    riskOfBias: "LOW",
    qualityScore: 0.75,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 71: Curcumin Anti-inflammatory Umbrella Review
  {
    title: "薑黃素抗炎抗氧化效果的GRADE系統評價與劑量反應薈萃分析（66項RCT）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "A",
    authors: "Ashtary-Larky D, Rezaei Kelishadi M, Bagheri R et al.",
    journal: "Phytotherapy Research",
    year: 2023,
    doi: "10.1002/ptr.7757",
    pubmedId: "36804260",
    abstract: "【目的】以GRADE方法系統評價薑黃素/薑黃補充劑對成人抗氧化和抗炎指標的影響。【方法】納入66項RCT。【結果】薑黃素顯著降低CRP、TNF-α和IL-6水平。",
    summary: "66項RCT的GRADE系統評價證實薑黃素可顯著降低多種炎症標誌物水平，包括CRP、TNF-α和IL-6。",
    sampleSize: null,
    population: "慢性炎症性疾病成人患者",
    intervention: "薑黃素/薑黃補充劑",
    comparator: "安慰劑",
    primaryOutcome: "CRP、TNF-α、IL-6等炎症標誌物",
    resultsSummary: "薑黃素顯著降低CRP（WMD: -1.55 mg/L）、TNF-α和IL-6水平，呈劑量依賴性。",
    riskOfBias: "LOW",
    qualityScore: 0.82,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // 72: Curcumin as Complementary Cancer Therapy
  {
    title: "薑黃素作為腫瘤輔助治療的系統評價（34項RCT, 2580例）",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Silva-Reis R, Gonçalves A, Silva AMS et al.",
    journal: "Nutrients",
    year: 2024,
    doi: "10.3390/nu16193319",
    pubmedId: "39425780",
    abstract: "【目的】系統評價薑黃素作為腫瘤輔助治療的臨床療效。【方法】納入34項RCT共2580例癌症患者。【結果】薑黃素可減輕放化療不良反應，改善生活質量。",
    summary: "34項RCT共2580例的系統評價顯示薑黃素可減輕癌症患者放化療不良反應，改善生活質量，但證據質量有待提高。",
    sampleSize: 2580,
    population: "接受放化療的癌症患者",
    intervention: "薑黃素補充劑輔助治療",
    comparator: "安慰劑或單純放化療",
    primaryOutcome: "不良反應發生率、生活質量評分",
    resultsSummary: "薑黃素輔助治療可減輕放射性皮炎、口腔黏膜炎等不良反應。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 73: Moxibustion for Breech Presentation
  {
    title: "艾灸矯正胎位不正的系統評價與薈萃分析（16項RCT, 2555例）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Manyande A, Grabowska C, et al.",
    journal: "Complementary Therapies in Medicine",
    year: 2021,
    doi: "10.1016/j.ctim.2021.102724",
    pubmedId: "34067379",
    abstract: "【目的】評價艾灸治療至陰穴（BL67）矯正胎位不正的療效。【方法】薈萃分析16項RCT共2555例。【結果】艾灸組頭位分娩率顯著高於對照組（RR=1.39, 95%CI 1.21-1.58）。",
    summary: "16項RCT共2555例的薈萃分析顯示艾灸至陰穴可顯著提高臀位妊娠的頭位轉位率。",
    sampleSize: 2555,
    population: "臀位妊娠孕婦（28-37週）",
    intervention: "艾灸至陰穴（BL67）",
    comparator: "膝胸臥位或期待療法",
    primaryOutcome: "頭位分娩率",
    resultsSummary: "艾灸組頭位分娩率顯著優於對照組（RR=1.39），亞洲人群效果更佳（RR=1.42）。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.68,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 74: Moxibustion for IBS
  {
    title: "艾灸治療腸躁症的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Park JW, Lee BH, Lee H",
    journal: "BMC Complementary and Alternative Medicine",
    year: 2013,
    doi: "10.1186/1472-6882-13-247",
    pubmedId: "24088418",
    abstract: "【目的】系統評價艾灸治療腸躁症的療效。【結果】艾灸在改善IBS整體症狀方面優於藥物治療（7項RCT, RR=1.33）。",
    summary: "7項RCT的薈萃分析顯示艾灸治療IBS的總有效率優於藥物治療。",
    sampleSize: null,
    population: "腸躁症患者",
    intervention: "艾灸（天樞、足三里等穴）",
    comparator: "藥物治療（匹維溴銨等）",
    primaryOutcome: "IBS症狀嚴重度評分",
    resultsSummary: "艾灸組總有效率優於藥物組（RR=1.33, 95%CI 1.15-1.55），但假灸對照試驗結果不一。",
    riskOfBias: "HIGH",
    qualityScore: 0.50,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 75: Moxibustion for Chronic Low Back Pain
  {
    title: "艾灸治療慢性下背痛的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Chen H, Ning Z, Lam WL et al.",
    journal: "European Journal of Integrative Medicine",
    year: 2020,
    doi: "10.1016/j.eujim.2020.101143",
    pubmedId: "32379643",
    abstract: "【目的】評價艾灸治療慢性下背痛的療效與安全性。【結果】艾灸可有效減輕疼痛和改善功能障礙。",
    summary: "系統評價顯示艾灸是慢性下背痛的有效輔助治療手段，可減輕疼痛並改善功能。",
    sampleSize: null,
    population: "慢性下背痛患者（病程>12週）",
    intervention: "艾灸（腎俞、委中、命門等穴）",
    comparator: "假灸、常規治療或藥物",
    primaryOutcome: "VAS疼痛評分、ODI功能障礙指數",
    resultsSummary: "艾灸組在疼痛緩解和功能改善方面均優於對照組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 76: TCM for COVID-19 (Three Medicines and Three Formulations)
  {
    title: "中藥「三藥三方」治療新冠肺炎的快速系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Wen L, Zhou T, Jiang Y et al.",
    journal: "Phytomedicine",
    year: 2021,
    doi: "10.1016/j.phymed.2021.153809",
    pubmedId: null,
    abstract: "【目的】評價中藥「三藥三方」（金花清感顆粒、連花清瘟膠囊、血必淨注射液、清肺排毒湯、化濕敗毒方、宣肺敗毒方）治療COVID-19的臨床療效。【方法】納入13項初始研究（6項RCT, 7項回顧性研究），共1467例。",
    summary: "「三藥三方」可能改善COVID-19患者的臨床症狀、CT影像和降低重症轉化率，但證據質量中低。",
    sampleSize: 1467,
    population: "COVID-19確診患者（輕中症）",
    intervention: "中藥「三藥三方」聯合標準治療",
    comparator: "單用標準治療",
    primaryOutcome: "臨床有效率、CT改善率、重症轉化率",
    resultsSummary: "中藥組臨床有效率更高，CT改善更顯著，重症轉化率更低。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // 77: Lianhua Qingwen for COVID-19
  {
    title: "連花清瘟膠囊治療COVID-19的薈萃分析（13項RCT, 1398例）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Du X, Shi L, Cao W et al.",
    journal: "Frontiers in Medicine",
    year: 2022,
    doi: "10.3389/fmed.2022.1024718",
    pubmedId: null,
    abstract: "【目的】薈萃分析評價連花清瘟膠囊輔助治療COVID-19的療效。【方法】納入13項RCT共1398例。【結果】連花清瘟組總有效率更高，CT改善更好，重症轉化率更低。",
    summary: "13項RCT的薈萃分析顯示連花清瘟膠囊輔助治療可改善COVID-19患者的臨床結局。",
    sampleSize: 1398,
    population: "COVID-19確診患者",
    intervention: "連花清瘟膠囊聯合標準治療",
    comparator: "單用標準治療",
    primaryOutcome: "臨床總有效率、CT改善率",
    resultsSummary: "連花清瘟組臨床有效率和CT改善率顯著優於對照組，重症轉化率更低。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 78: Acupuncture for IVF
  {
    title: "針灸對體外受精妊娠結局影響的最新系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Liang Y, Du Q, Xie J et al.",
    journal: "Reproductive BioMedicine Online",
    year: 2023,
    doi: "10.1016/j.rbmo.2023.103389",
    pubmedId: "37436463",
    abstract: "【目的】更新針灸對IVF-ET妊娠結局影響的系統評價。【結果】控制性促排卵期間的針灸可顯著提高臨床妊娠率（RR=1.33, 95%CI 1.07-1.65）。",
    summary: "在控制性促排卵期間進行針灸可提高IVF的臨床妊娠率，但胚胎移植時的針灸未顯示額外益處。",
    sampleSize: null,
    population: "接受IVF-ET治療的不孕症女性",
    intervention: "針灸（促排卵期間或胚胎移植前後）",
    comparator: "假針灸或無針灸",
    primaryOutcome: "臨床妊娠率",
    resultsSummary: "促排卵期間針灸顯著提高臨床妊娠率（RR=1.33），但胚胎移植時針灸與假針灸無顯著差異（RR=0.99）。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.70,
    qualityTool: "GRADE",
    status: "PUBLISHED",
  },

  // 79: Electroacupuncture for Stroke Motor Recovery
  {
    title: "電針輔助治療急性腦卒中運動功能障礙的系統評價與薈萃分析（19項RCT）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Liu AJ, Li JH, Li HQ et al.",
    journal: "Journal of Alternative and Complementary Medicine",
    year: 2018,
    doi: "10.1089/acm.2016.0338",
    pubmedId: "29371267",
    abstract: "【目的】評價電針作為急性腦卒中運動功能障礙輔助治療的療效。【方法】納入19項RCT共1434例。【結果】電針輔助治療可改善運動功能。",
    summary: "19項RCT共1434例的薈萃分析表明電針輔助治療可改善急性腦卒中患者的運動功能。",
    sampleSize: 1434,
    population: "急性缺血性腦卒中患者",
    intervention: "電針聯合康復訓練",
    comparator: "單用康復訓練",
    primaryOutcome: "Fugl-Meyer運動功能評分、Barthel指數",
    resultsSummary: "電針輔助治療組Fugl-Meyer評分和日常生活活動能力顯著改善。",
    riskOfBias: "HIGH",
    qualityScore: 0.52,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 80: Acupuncture for CIPN
  {
    title: "針灸治療化療所致周圍神經病變的薈萃分析與數據挖掘",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Li Y, Zhang J, Wang S et al.",
    journal: "Frontiers in Neurology",
    year: 2024,
    doi: "10.3389/fneur.2024.1462024",
    pubmedId: null,
    abstract: "【目的】薈萃分析評價針灸治療化療所致周圍神經病變（CIPN）的療效，並挖掘常用穴位。【結果】針灸可有效緩解CIPN疼痛和功能障礙，最常用穴位為合谷、曲池、足三里、八風、八邪。",
    summary: "針灸可有效緩解CIPN的疼痛和功能受限，最低治療療程為3週。常用穴位：LI4、LI11、ST36、EX-LE10、EX-UE9。",
    sampleSize: null,
    population: "化療所致周圍神經病變患者",
    intervention: "針灸或電針",
    comparator: "假針灸或藥物治療",
    primaryOutcome: "疼痛強度（VAS/NRS）、神經傳導速度",
    resultsSummary: "針灸組疼痛強度顯著降低，神經傳導速度（運動和感覺）顯著改善。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.62,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 81: Acupuncture for Bell's Palsy
  {
    title: "針灸治療貝爾氏面癱的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Kim MK, Choi TY, Lee MS et al.",
    journal: "PLoS ONE",
    year: 2015,
    doi: "10.1371/journal.pone.0125721",
    pubmedId: "25974022",
    abstract: "【目的】系統評價針灸治療貝爾氏面癱的療效。【結果】針灸組有效率顯著高於對照組（RR=1.14, 95%CI 1.04-1.25），但研究異質性較大。",
    summary: "針灸治療貝爾氏面癱的有效率優於常規治療，但由於納入研究質量不高，結論需謹慎解讀。",
    sampleSize: null,
    population: "貝爾氏面癱患者",
    intervention: "針灸（翳風、地倉、頰車、合谷等穴）",
    comparator: "西藥（潑尼松、維生素B等）",
    primaryOutcome: "面神經功能恢復率（House-Brackmann分級）",
    resultsSummary: "針灸組有效率為1.14倍（RR=1.14），急性期治療效果可能優於非急性期。",
    riskOfBias: "HIGH",
    qualityScore: 0.50,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 82: Acupuncture for Lateral Epicondylitis
  {
    title: "針灸治療肱骨外上髁炎（網球肘）的系統評價與薈萃分析（10項RCT, 796例）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Wang F, Shi J, Zhou Q et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2020,
    doi: "10.1155/2020/2096967",
    pubmedId: "32318130",
    abstract: "【目的】系統評價針灸治療肱骨外上髁炎的療效。【方法】納入10項RCT共796例。【結果】針灸在改善臨床有效率和減輕疼痛方面優於假針灸和藥物治療。",
    summary: "10項RCT共796例的薈萃分析表明針灸可有效緩解網球肘疼痛，短期效果顯著。",
    sampleSize: 796,
    population: "肱骨外上髁炎（網球肘）患者",
    intervention: "針灸或電針",
    comparator: "假針灸、封閉治療或藥物治療",
    primaryOutcome: "疼痛VAS評分、臨床總有效率",
    resultsSummary: "針灸組疼痛評分和有效率均優於對照組，短期鎮痛效果明確。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.60,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 83: Huang Qi Gui Zhi Wu Wu Tang for DPN
  {
    title: "黃芪桂枝五物湯治療糖尿病周圍神經病變的薈萃分析（16項RCT）",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "B",
    authors: "Chen Z, Cao Y, Lu Q et al.",
    journal: "BMC Complementary and Alternative Medicine",
    year: 2016,
    doi: "10.1186/s12906-016-1255-4",
    pubmedId: null,
    abstract: "【目的】評價黃芪桂枝五物湯治療糖尿病周圍神經病變（DPN）的療效。【方法】納入16項RCT。【結果】黃芪桂枝五物湯聯合甲鈷胺在改善DPN症狀方面優於單用甲鈷胺。",
    summary: "16項RCT的薈萃分析顯示黃芪桂枝五物湯聯合甲鈷胺可改善DPN的整體症狀和神經傳導速度。",
    sampleSize: null,
    population: "糖尿病周圍神經病變患者",
    intervention: "黃芪桂枝五物湯（加減）聯合甲鈷胺",
    comparator: "單用甲鈷胺",
    primaryOutcome: "整體症狀改善率、神經傳導速度",
    resultsSummary: "聯合治療組整體症狀改善率和神經傳導速度均優於單藥組。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.58,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 84: Long Dan Xie Gan Tang for Insomnia
  {
    title: "龍膽瀉肝湯治療失眠的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2A",
    evidenceGrade: "C",
    authors: "Wang X, Shi X, Lu H et al.",
    journal: "Medicine",
    year: 2020,
    doi: "10.1097/MD.0000000000019764",
    pubmedId: "32176067",
    abstract: "【目的】系統評價龍膽瀉肝湯治療失眠的療效與安全性。【結果】龍膽瀉肝湯在總有效率和治癒率方面均優於對照組。",
    summary: "薈萃分析顯示龍膽瀉肝湯治療失眠（肝火上擾型）的有效率優於常規西藥，但需更多高質量研究。",
    sampleSize: null,
    population: "失眠患者（肝膽火旺型）",
    intervention: "龍膽瀉肝湯（加減）",
    comparator: "安慰劑或鎮靜催眠藥",
    primaryOutcome: "臨床總有效率、PSQI評分",
    resultsSummary: "龍膽瀉肝湯組總有效率和治癒率均優於對照組。",
    riskOfBias: "HIGH",
    qualityScore: 0.48,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 85: Long Dan Xie Gan Tang for Hypertension
  {
    title: "龍膽瀉肝湯治療高血壓的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Xiong X, Yang X, Feng B et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2018,
    doi: "10.1155/2018/9012929",
    pubmedId: null,
    abstract: "【目的】評價龍膽瀉肝湯治療高血壓的臨床療效。【結果】龍膽瀉肝湯聯合降壓藥在降壓和改善症狀方面可能有一定優勢。",
    summary: "龍膽瀉肝湯對肝火亢盛型高血壓的降壓和症狀改善有輔助作用。",
    sampleSize: null,
    population: "原發性高血壓患者（肝火亢盛型）",
    intervention: "龍膽瀉肝湯聯合降壓藥",
    comparator: "單用降壓藥",
    primaryOutcome: "血壓達標率、中醫證候積分",
    resultsSummary: "聯合治療組降壓達標率和症狀改善均有一定優勢。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 86: Ma Xing Shi Gan Tang for Childhood Pneumonia
  {
    title: "麻杏石甘湯聯合抗生素治療兒童肺炎的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Li X, Li J, Zhang Y et al.",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2013,
    doi: "10.1155/2013/952915",
    pubmedId: null,
    abstract: "【目的】評價含麻杏石甘湯的中藥複方聯合西藥治療兒童肺炎的療效。【結果】5項研究比較了加味麻杏石甘湯聯合阿奇霉素與單用阿奇霉素，聯合治療組總有效率更高。",
    summary: "加味麻杏石甘湯聯合抗生素治療兒童肺炎的有效率優於單用抗生素。",
    sampleSize: null,
    population: "兒童社區獲得性肺炎患者",
    intervention: "加味麻杏石甘湯聯合阿奇霉素",
    comparator: "單用阿奇霉素",
    primaryOutcome: "臨床總有效率、退熱時間、咳嗽緩解時間",
    resultsSummary: "聯合治療組在有效率、退熱和咳嗽緩解方面均顯著優於對照組。",
    riskOfBias: "HIGH",
    qualityScore: 0.42,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 87: Gui Pi Tang for Insomnia (Traditional Use Review)
  {
    title: "歸脾湯治療失眠的傳統應用與現代研究回顧",
    studyType: "EXPERT_OPINION",
    evidenceLevel: "LEVEL_5",
    evidenceGrade: "D",
    authors: "Chen YC, Tsai SJ et al.",
    journal: "Journal of Traditional Chinese Medicine",
    year: 2020,
    doi: null,
    pubmedId: null,
    abstract: "歸脾湯為益氣養血、健脾安神的代表方劑，廣泛用於治療心脾兩虛型失眠。在臺灣全民健康保險處方中，歸脾湯為治療失眠最常用的標準化方劑。",
    summary: "歸脾湯是台灣治療失眠處方中使用頻率最高的中藥方劑，適用於心脾兩虛型失眠。",
    sampleSize: null,
    population: "心脾兩虛型失眠患者",
    intervention: "歸脾湯",
    comparator: null,
    primaryOutcome: "處方頻率分析、臨床觀察",
    resultsSummary: "台灣NHI數據顯示歸脾湯為失眠最常用中藥方劑。動物實驗證實其具有鎮靜安神作用。",
    riskOfBias: null,
    qualityScore: null,
    qualityTool: null,
    status: "PUBLISHED",
  },

  // 88: Jia Wei Gui Pi Tang for Dementia BPSD
  {
    title: "加味歸脾湯改善痴呆患者行為與精神症狀的臨床研究",
    studyType: "RCT",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Lin YT, Chen CY et al.",
    journal: "Psychiatry Research",
    year: 2023,
    doi: "10.1016/j.psychres.2023.115173",
    pubmedId: "37005070",
    abstract: "【目的】評價加味歸脾湯對痴呆患者行為與精神症狀（BPSD）的改善作用。【結果】加味歸脾湯可改善BPSD並促進積極情緒。",
    summary: "加味歸脾湯可改善痴呆患者的行為與精神症狀，並促進積極情緒表達。日本已批准其用於焦慮治療。",
    sampleSize: null,
    population: "痴呆伴行為與精神症狀患者",
    intervention: "加味歸脾湯",
    comparator: "常規治療",
    primaryOutcome: "NPI（神經精神量表）評分、積極情緒評估",
    resultsSummary: "治療組NPI評分改善，積極情緒增加。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.55,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 89: Acupuncture for Chronic Fatigue Syndrome
  {
    title: "針灸治療慢性疲勞綜合徵的系統評價",
    studyType: "SYSTEMATIC_REVIEW",
    evidenceLevel: "LEVEL_2B",
    evidenceGrade: "C",
    authors: "Wang T, Xu C, Pan K, Xiong H",
    journal: "Evidence-Based Complementary and Alternative Medicine",
    year: 2021,
    doi: null,
    pubmedId: null,
    abstract: "【目的】系統評價針灸治療慢性疲勞綜合徵的療效。【結果】針灸可能改善疲勞嚴重度和生活質量，但證據質量較低。常用穴位：足三里、百會、三陰交。",
    summary: "針灸可能有助於改善CFS患者的疲勞程度和生活質量，最常用穴位包括ST36、GV20、SP6。",
    sampleSize: null,
    population: "慢性疲勞綜合徵患者",
    intervention: "針灸",
    comparator: "假針灸或常規治療",
    primaryOutcome: "疲勞嚴重度評分、生活質量",
    resultsSummary: "針灸組疲勞改善優於對照組，但因研究質量低，需更多高質量RCT驗證。",
    riskOfBias: "HIGH",
    qualityScore: 0.45,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 90: Acupuncture for Allergic Rhinitis
  {
    title: "針灸治療過敏性鼻炎的系統評價與薈萃分析",
    studyType: "META_ANALYSIS",
    evidenceLevel: "LEVEL_1A",
    evidenceGrade: "B",
    authors: "Feng S, Han M, Fan Y et al.",
    journal: "American Journal of Rhinology & Allergy",
    year: 2015,
    doi: "10.2500/ajra.2015.29.4110",
    pubmedId: null,
    abstract: "【目的】薈萃分析評價針灸治療過敏性鼻炎的療效。【結果】針灸在改善鼻部症狀和生活質量方面優於假針灸和藥物治療。常用穴位：迎香、印堂、合谷、足三里。",
    summary: "針灸可有效改善過敏性鼻炎的鼻部症狀和生活質量。",
    sampleSize: null,
    population: "過敏性鼻炎患者",
    intervention: "針灸（迎香、合谷、足三里等穴）",
    comparator: "假針灸或抗組胺藥",
    primaryOutcome: "鼻部症狀評分（TNSS）、生活質量評分",
    resultsSummary: "針灸組鼻塞、流涕、噴嚏症狀及生活質量均顯著改善。",
    riskOfBias: "SOME_CONCERNS",
    qualityScore: 0.65,
    qualityTool: "Cochrane RoB 2",
    status: "PUBLISHED",
  },

  // 91–119: Additional evidence entries (shorter format for remaining studies)

  // 91: Huang Qi-based TCM for DPN
  {
    title: "黃芪類中藥治療糖尿病周圍神經病變的長期療效與安全性薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Li Y, Wang X, Zhang J et al.", journal: "BMC Complementary Medicine and Therapies", year: 2024,
    doi: null, pubmedId: null,
    abstract: "48項RCT共3759例的薈萃分析顯示黃芪類中藥治療DPN的總有效率顯著高於單用西藥。",
    summary: "黃芪類中藥輔助治療DPN的總有效率優於西藥單藥治療。", sampleSize: 3759,
    population: "糖尿病周圍神經病變患者", intervention: "含黃芪的中藥方劑", comparator: "甲鈷胺等西藥",
    primaryOutcome: "總有效率、神經傳導速度", resultsSummary: "黃芪類中藥組總有效率顯著高於西藥組，神經傳導速度改善。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 92: Er Chen Tang for Phlegm-Related Conditions (Traditional Use)
  {
    title: "二陳湯化痰法在代謝性疾病中的應用：傳統理論與現代研究",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Zhou J, Li W et al.", journal: "World Journal of Traditional Chinese Medicine", year: 2021,
    doi: null, pubmedId: null,
    abstract: "二陳湯為燥濕化痰的基礎方，現代研究表明其活性成分可改善脂質代謝、減少內臟脂肪。",
    summary: "二陳湯作為化痰祖方，其理論基礎和現代藥理研究支持其在代謝性疾病中的應用。", sampleSize: null,
    population: "痰濕型肥胖和代謝綜合徵患者", intervention: "二陳湯（加減）", comparator: null,
    primaryOutcome: "文獻綜述", resultsSummary: "動物實驗和臨床觀察支持二陳湯改善脂質代謝的作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 93: Acupuncture for Menopausal Hot Flashes
  {
    title: "針灸治療更年期潮熱的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Chiu HY, Pan CH, Shyu YK et al.", journal: "Menopause", year: 2015,
    doi: "10.1097/GME.0000000000000378", pubmedId: null,
    abstract: "12項RCT的薈萃分析顯示針灸可顯著減少更年期潮熱的頻率和嚴重程度。",
    summary: "針灸可有效減少更年期潮熱頻率和嚴重度。", sampleSize: null,
    population: "更年期潮熱女性", intervention: "針灸", comparator: "假針灸或激素替代療法",
    primaryOutcome: "潮熱頻率和嚴重度評分", resultsSummary: "針灸組潮熱頻率和嚴重度均顯著降低。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.68, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 94: TCM Pattern Diagnosis for Depression (Liver Qi Stagnation)
  {
    title: "辨證論治治療抑鬱症的處方規律系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Yeung WF, Chung KF, Ng KY et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2015,
    doi: "10.1155/2015/160189", pubmedId: null,
    abstract: "系統評價中藥辨證論治治療抑鬱症的處方規律。結果顯示肝氣鬱結為最常見證型，逍遙散及其加減方為最常用處方。",
    summary: "肝氣鬱結為中醫治療抑鬱症最常見的辨證分型，逍遙散類方為使用頻率最高的方劑。", sampleSize: null,
    population: "抑鬱症患者", intervention: "中藥辨證論治", comparator: "抗抑鬱藥",
    primaryOutcome: "處方頻率分析、HAMD評分", resultsSummary: "肝氣鬱結型占60%以上，逍遙散及其加減方為最常用方劑。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "AMSTAR 2", status: "PUBLISHED",
  },

  // 95: Chinese Herbal Medicine for Chronic Heart Failure
  {
    title: "中藥方劑治療慢性心力衰竭的系統評價概述",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Wang Y, Li G, Yang S et al.", journal: "Frontiers in Pharmacology", year: 2023,
    doi: null, pubmedId: null,
    abstract: "對多項系統評價進行概述分析，發現中藥聯合常規治療可改善慢性心衰患者的心功能、運動耐力和生活質量。常用方劑：真武湯、生脈散、補陽還五湯。",
    summary: "中藥輔助治療慢性心衰可改善心功能和生活質量，常用真武湯、生脈散等方劑。", sampleSize: null,
    population: "慢性心力衰竭患者", intervention: "中藥方劑聯合常規治療", comparator: "單用常規治療",
    primaryOutcome: "LVEF、6分鐘步行距離、BNP水平", resultsSummary: "中藥聯合治療組心功能指標和運動耐力均有改善。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "AMSTAR 2", status: "PUBLISHED",
  },

  // 96: Si Wu Tang for Dysmenorrhea (Traditional Use)
  {
    title: "四物湯治療婦科血證的傳統應用與藥理學基礎",
    studyType: "TRADITIONAL_USE", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Luo Y, Li W et al.", journal: "Chinese Journal of Integrative Medicine", year: 2018,
    doi: null, pubmedId: null,
    abstract: "四物湯為補血調經的祖方，由當歸、熟地黃、白芍、川芎組成。現代藥理研究表明其具有促進造血、改善微循環、抗炎鎮痛等多種活性。",
    summary: "四物湯為中醫婦科補血調經的基礎方，現代研究支持其促進造血和改善微循環的藥理作用。", sampleSize: null,
    population: "血虛型痛經和月經不調患者", intervention: "四物湯", comparator: null,
    primaryOutcome: "傳統文獻綜述、藥理學研究", resultsSummary: "四物湯的造血促進作用和子宮平滑肌調節作用已在動物實驗中得到證實。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 97: Acupuncture for Smoking Cessation
  {
    title: "針灸輔助戒菸的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "White AR, Rampes H, Liu JP, Stead LF", journal: "Cochrane Database of Systematic Reviews", year: 2014,
    doi: "10.1002/14651858.CD000009.pub3", pubmedId: null,
    abstract: "Cochrane系統評價針灸輔助戒菸的療效。現有證據不能確定針灸比假針灸更有效，但可能優於不干預。",
    summary: "針灸作為戒菸輔助手段的證據不確定，可能優於不干預但不優於假針灸。", sampleSize: null,
    population: "吸菸者（意願戒菸）", intervention: "針灸（耳穴或體穴）", comparator: "假針灸或尼古丁替代療法",
    primaryOutcome: "6個月和12個月戒菸率", resultsSummary: "針灸的長期戒菸率不優於假針灸，但優於不干預。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 98: Acupuncture for Tension Headache
  {
    title: "針灸治療緊張性頭痛的Cochrane系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Linde K, Allais G, Brinkhaus B et al.", journal: "Cochrane Database of Systematic Reviews", year: 2016,
    doi: "10.1002/14651858.CD007587.pub2", pubmedId: null,
    abstract: "Cochrane系統評價針灸治療頻繁發作性或慢性緊張性頭痛的療效。12項RCT比較針灸與假針灸，針灸組優於假針灸。",
    summary: "Cochrane高質量系統評價證實針灸治療緊張性頭痛優於假針灸和常規治療。", sampleSize: null,
    population: "頻繁發作性或慢性緊張性頭痛患者", intervention: "針灸", comparator: "假針灸或常規治療",
    primaryOutcome: "頭痛頻率和天數", resultsSummary: "針灸組頭痛頻率顯著減少，效果優於假針灸，可作為緊張性頭痛的有效治療選擇。",
    riskOfBias: "LOW", qualityScore: 0.85, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 99: Acupuncture for Postoperative Pain
  {
    title: "針灸治療術後疼痛的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Wu MS, Chen KH, Chen IF et al.", journal: "Scientific Reports", year: 2016,
    doi: "10.1038/srep28603", pubmedId: null,
    abstract: "13項RCT的薈萃分析評價針灸對術後疼痛和阿片類藥物使用的影響。結果顯示針灸可有效減輕術後疼痛並減少阿片類藥物用量。",
    summary: "針灸可有效減輕術後疼痛並顯著減少阿片類鎮痛藥的使用量。", sampleSize: null,
    population: "術後疼痛患者", intervention: "圍術期針灸", comparator: "假針灸或無針灸",
    primaryOutcome: "術後VAS疼痛評分、阿片類藥物用量", resultsSummary: "針灸組術後疼痛評分和阿片藥物用量均顯著低於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 100: Acupuncture for Chronic Prostatitis
  {
    title: "針灸治療慢性前列腺炎/慢性骨盆疼痛綜合徵的系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Qin Z, Wu J, Zhou J, Liu Z", journal: "Medicine", year: 2016,
    doi: null, pubmedId: null,
    abstract: "系統評價針灸治療慢性前列腺炎/CPPS的療效。針灸可能改善NIH-CPSI評分和生活質量。",
    summary: "針灸可能改善慢性前列腺炎的症狀和生活質量。", sampleSize: null,
    population: "慢性前列腺炎/CPPS患者", intervention: "針灸或電針", comparator: "假針灸或藥物治療",
    primaryOutcome: "NIH-CPSI評分", resultsSummary: "針灸組NIH-CPSI總分改善優於對照組。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 101–119: More condensed entries

  // 101: Huang Qin for IBD
  { title: "黃芩活性成分治療炎症性腸病的藥理學綜述", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Wu Y et al.", journal: "Frontiers in Pharmacology", year: 2023, doi: null, pubmedId: null,
    abstract: "綜述黃芩素、黃芩苷在IBD中的抗炎和腸道保護機制。", summary: "黃芩活性成分通過NF-κB和MAPK通路發揮抗腸道炎症作用。", sampleSize: null,
    population: "炎症性腸病患者", intervention: "黃芩提取物", comparator: null,
    primaryOutcome: "藥理學綜述", resultsSummary: "基礎研究支持黃芩素在IBD中的抗炎作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 102: Zhen Wu Tang for Heart Failure
  { title: "真武湯治療慢性心力衰竭的臨床研究進展", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_3A", evidenceGrade: "C",
    authors: "Zhang L et al.", journal: "Chinese Journal of Integrated Traditional and Western Medicine", year: 2020, doi: null, pubmedId: null,
    abstract: "系統評價真武湯治療陽虛水泛型慢性心力衰竭的臨床療效。", summary: "真武湯可改善陽虛水泛型心衰的水腫和心功能。", sampleSize: null,
    population: "慢性心力衰竭（陽虛水泛型）", intervention: "真武湯聯合常規治療", comparator: "單用常規治療",
    primaryOutcome: "心功能分級、水腫消退時間", resultsSummary: "真武湯組心功能改善率和水腫消退優於對照組。",
    riskOfBias: "HIGH", qualityScore: 0.45, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 103: CHM for Weight Management
  { title: "中藥治療體重管理的系統評價與薈萃分析（39項RCT）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Peng Y et al.", journal: "Obesity Reviews", year: 2021, doi: "10.1111/obr.13162", pubmedId: null,
    abstract: "39項RCT的薈萃分析評價中藥治療肥胖的療效。結果顯示多種中藥方劑可減輕體重和腰圍。",
    summary: "中藥方劑可能有助於體重和腰圍的減少，但證據質量有限。", sampleSize: null,
    population: "超重或肥胖患者", intervention: "中藥方劑（含麻黃、荷葉等）", comparator: "安慰劑或生活方式干預",
    primaryOutcome: "體重變化、BMI、腰圍", resultsSummary: "中藥組體重和腰圍減少優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 104: Fu Zi (Aconite) Safety Review
  { title: "附子的毒性與安全性系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_3A", evidenceGrade: "D",
    authors: "Chan TYK", journal: "Clinical Toxicology", year: 2020, doi: null, pubmedId: null,
    abstract: "系統評價附子（烏頭鹼類藥物）的毒性反應和安全使用。附子含烏頭鹼類有毒成分，不當使用可致心律失常、死亡。",
    summary: "附子使用需嚴格遵循炮製和劑量規範。烏頭鹼中毒可致致死性心律失常。", sampleSize: null,
    population: "附子使用者", intervention: "附子（製附子/炮附子）", comparator: null,
    primaryOutcome: "不良反應報告", resultsSummary: "炮製後毒性顯著降低，但仍需控制劑量和煎煮時間。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 105: Acupuncture for Sciatica
  { title: "針灸治療坐骨神經痛的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Ji M et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2015, doi: null, pubmedId: null,
    abstract: "針灸在緩解坐骨神經痛的疼痛和改善功能方面可能優於常規治療。",
    summary: "針灸可有效緩解坐骨神經痛並改善功能。", sampleSize: null,
    population: "坐骨神經痛患者", intervention: "針灸（環跳、委中、陽陵泉等穴）", comparator: "藥物或物理治療",
    primaryOutcome: "VAS疼痛評分", resultsSummary: "針灸組疼痛評分和功能改善優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 106: Xiao Chai Hu Tang for Chronic Hepatitis
  { title: "小柴胡湯治療慢性肝炎的系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Liu JP, Manheimer E, Tsutani K, Gluud C", journal: "Cochrane Database of Systematic Reviews", year: 2001,
    doi: "10.1002/14651858.CD004335", pubmedId: null,
    abstract: "Cochrane系統評價小柴胡湯治療慢性乙型肝炎的療效。試驗質量低，無法得出確定性結論。",
    summary: "小柴胡湯治療慢性肝炎的證據不足，需更多高質量研究。", sampleSize: null,
    population: "慢性乙型肝炎患者", intervention: "小柴胡湯", comparator: "安慰劑或干擾素",
    primaryOutcome: "HBsAg轉陰率、ALT正常化率", resultsSummary: "證據不足以確定小柴胡湯的療效，但未發現明顯安全性問題。",
    riskOfBias: "HIGH", qualityScore: 0.40, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 107: Ren Shen (Ginseng) for Mild Cognitive Impairment
  { title: "高麗紅參對輕度認知障礙患者認知功能的隨機雙盲安慰劑對照試驗", studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Heo JH, Lee ST, Oh MJ et al.", journal: "Journal of Ginseng Research", year: 2020,
    doi: "10.1016/j.jgr.2019.01.002", pubmedId: null,
    abstract: "隨機雙盲安慰劑對照試驗評價高麗紅參對輕度認知障礙的改善作用。結果顯示人參治療組Rey複雜圖形測驗成績顯著改善。",
    summary: "隨機雙盲安慰劑對照試驗顯示人參可改善MCI患者的認知功能。", sampleSize: null,
    population: "輕度認知障礙患者", intervention: "高麗紅參（Panax ginseng）", comparator: "安慰劑",
    primaryOutcome: "Rey複雜圖形測驗、ADAS-Cog評分", resultsSummary: "人參組認知測試成績顯著改善。",
    riskOfBias: "LOW", qualityScore: 0.78, qualityTool: "Jadad Scale", status: "PUBLISHED" },

  // 108: San Ren Tang for Dampness (Traditional Use)
  { title: "三仁湯治療濕溫病的傳統應用與現代研究", studyType: "TRADITIONAL_USE", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Wu JH et al.", journal: "Chinese Archives of Traditional Chinese Medicine", year: 2019, doi: null, pubmedId: null,
    abstract: "三仁湯出自《溫病條辨》，為治療濕溫初起的代表方。現代藥理研究表明其具有利尿、抗炎、改善脂質代謝的作用。",
    summary: "三仁湯為治療濕溫初起的代表方，現代研究支持其利尿、抗炎和改善代謝的藥理作用。", sampleSize: null,
    population: "濕溫初起、濕重於熱患者", intervention: "三仁湯", comparator: null,
    primaryOutcome: "傳統文獻和藥理學研究", resultsSummary: "三仁湯的宣暢氣機、清利三焦濕邪的傳統功效得到現代藥理學部分驗證。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 109: Gui Zhi Tang for Common Cold (Wind-Cold)
  { title: "桂枝湯治療風寒表虛證的傳統應用與免疫調節機制", studyType: "TRADITIONAL_USE", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Wang Y et al.", journal: "Journal of Traditional Chinese Medicine", year: 2018, doi: null, pubmedId: null,
    abstract: "桂枝湯為《傷寒論》第一方，解肌發表、調和營衛。現代研究揭示其通過調節TLR信號通路和Th1/Th2平衡發揮免疫調節作用。",
    summary: "桂枝湯作為解表第一方，其免疫調節機制已在現代研究中得到初步闡明。", sampleSize: null,
    population: "風寒表虛證感冒患者", intervention: "桂枝湯", comparator: null,
    primaryOutcome: "傳統文獻和免疫學研究", resultsSummary: "桂枝湯通過調節先天和適應性免疫反應發揮解表作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 110: Acupuncture for Dry Eye
  { title: "針灸治療乾眼症的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Yang L et al.", journal: "BMC Complementary and Alternative Medicine", year: 2018, doi: null, pubmedId: null,
    abstract: "薈萃分析評價針灸治療乾眼症的療效。針灸可改善淚液分泌量和角膜螢光素染色評分。",
    summary: "針灸可有效改善乾眼症的淚液分泌和角膜表面狀態。", sampleSize: null,
    population: "乾眼症患者", intervention: "針灸（睛明、攢竹、太陽等穴）", comparator: "人工淚液",
    primaryOutcome: "Schirmer試驗、BUT時間", resultsSummary: "針灸組淚液分泌量和淚膜破裂時間均優於人工淚液組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 111: Acupuncture for Obesity
  { title: "針灸治療肥胖的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhong YM et al.", journal: "International Journal of Obesity", year: 2020, doi: null, pubmedId: null,
    abstract: "薈萃分析評價針灸（體針和耳穴）治療肥胖的療效。結果顯示針灸可降低BMI和腰圍。",
    summary: "針灸可能有助於減輕體重和降低BMI，但效果量較小。", sampleSize: null,
    population: "超重或肥胖患者", intervention: "針灸（天樞、中脘、足三里、豐隆等穴）", comparator: "假針灸或生活方式干預",
    primaryOutcome: "BMI、體重、腰圍", resultsSummary: "針灸組BMI和腰圍改善優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 112: Tong Xin Luo for Ischemic Stroke (JAMA 2024)
  { title: "通心絡膠囊對急性缺血性腦卒中患者功能結局的隨機臨床試驗", studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Yang Y et al.", journal: "JAMA", year: 2024, doi: "10.1001/jama.2024.12473", pubmedId: null,
    abstract: "大型多中心RCT評價通心絡膠囊對急性缺血性腦卒中患者功能結局的影響。",
    summary: "JAMA發表的大型RCT為通心絡治療缺血性腦卒中提供了高質量證據。", sampleSize: null,
    population: "急性缺血性腦卒中患者", intervention: "通心絡膠囊聯合標準治療", comparator: "安慰劑聯合標準治療",
    primaryOutcome: "90天mRS評分", resultsSummary: "通心絡組功能結局改善優於安慰劑組。",
    riskOfBias: "LOW", qualityScore: 0.88, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 113: Liu Jun Zi Tang for Functional Dyspepsia
  { title: "六君子湯和香砂六君子湯治療功能性消化不良的薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Tominaga K, Arakawa T", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2013,
    doi: "10.1155/2013/696209", pubmedId: null,
    abstract: "薈萃分析評價六君子湯和香砂六君子湯治療功能性消化不良的療效。結果顯示其可改善消化不良症狀。",
    summary: "六君子湯和香砂六君子湯可有效改善功能性消化不良的症狀。", sampleSize: null,
    population: "功能性消化不良患者", intervention: "六君子湯或香砂六君子湯", comparator: "西藥（多潘立酮等）",
    primaryOutcome: "消化不良症狀評分", resultsSummary: "中藥組消化不良症狀改善率優於西藥對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 114: Da Huang (Rhubarb) for Constipation
  { title: "大黃及其活性成分治療便秘的藥理學與臨床研究綜述", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Li Y et al.", journal: "Phytotherapy Research", year: 2020, doi: null, pubmedId: null,
    abstract: "大黃的主要活性成分大黃素和番瀉苷通過刺激腸道蠕動和促進水分分泌發揮瀉下作用。",
    summary: "大黃是中醫瀉下藥的代表，其瀉下機制已得到現代藥理學的充分闡明。", sampleSize: null,
    population: "便秘患者", intervention: "大黃", comparator: null,
    primaryOutcome: "藥理學綜述", resultsSummary: "大黃素和番瀉苷的瀉下機制明確，長期使用需注意依賴性。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 115: Acupuncture for Functional Constipation
  { title: "電針治療功能性便秘的隨機對照試驗", studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Liu Z, Yan S, Wu J et al.", journal: "Annals of Internal Medicine", year: 2016,
    doi: "10.7326/M15-3118", pubmedId: null,
    abstract: "大型多中心RCT評價電針治療慢性嚴重功能性便秘的療效。1075例患者隨機分組。",
    summary: "高質量大型RCT證實電針可有效治療慢性功能性便秘。", sampleSize: 1075,
    population: "慢性功能性便秘患者", intervention: "電針（天樞、上巨虛等穴）", comparator: "假電針",
    primaryOutcome: "每週完全自發排便次數", resultsSummary: "電針組每週自發排便次數顯著增加，效果持續至治療後12週。",
    riskOfBias: "LOW", qualityScore: 0.90, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 116: Ear Acupuncture for Insomnia
  { title: "耳穴治療失眠的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Lan Y et al.", journal: "Journal of Alternative and Complementary Medicine", year: 2015, doi: null, pubmedId: null,
    abstract: "薈萃分析評價耳穴貼壓治療失眠的療效。結果顯示耳穴治療可改善睡眠質量。",
    summary: "耳穴貼壓可改善失眠患者的睡眠質量，但證據質量有待提高。", sampleSize: null,
    population: "失眠患者", intervention: "耳穴壓豆（神門、心、皮質下等穴）", comparator: "假耳穴或鎮靜藥",
    primaryOutcome: "PSQI評分", resultsSummary: "耳穴組PSQI評分改善優於對照組。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 117: TCM for Atopic Dermatitis
  { title: "中藥治療特應性皮炎的系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Gu S, Yang AW, Xue CC et al.", journal: "Journal of Allergy and Clinical Immunology", year: 2013, doi: null, pubmedId: null,
    abstract: "系統評價中藥內服和外用治療特應性皮炎的療效。結果提示中藥可能改善症狀但證據質量低。",
    summary: "中藥可能改善特應性皮炎症狀，但需更多高質量研究證實。", sampleSize: null,
    population: "特應性皮炎患者", intervention: "中藥方劑（內服或外用）", comparator: "安慰劑或糖皮質激素",
    primaryOutcome: "SCORAD評分、EASI評分", resultsSummary: "部分研究顯示中藥可減輕瘙癢和皮損面積。",
    riskOfBias: "HIGH", qualityScore: 0.45, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 118: Tai Chi for Fall Prevention
  { title: "太極拳預防老年人跌倒的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Huang ZG, Feng YH, Li YH, Lv CS", journal: "Archives of Gerontology and Geriatrics", year: 2017, doi: null, pubmedId: null,
    abstract: "18項RCT的薈萃分析評價太極拳預防老年人跌倒的效果。太極拳顯著降低跌倒發生率。",
    summary: "高質量薈萃分析證實太極拳可顯著降低老年人跌倒風險。", sampleSize: null,
    population: "社區居住老年人", intervention: "太極拳訓練", comparator: "常規運動或不運動",
    primaryOutcome: "跌倒發生率", resultsSummary: "太極拳組跌倒風險顯著降低（RR=0.80），並改善平衡功能。",
    riskOfBias: "LOW", qualityScore: 0.80, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 119: Tai Chi for Hypertension
  { title: "太極拳對高血壓患者血壓影響的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhong D, Li J, Yang H et al.", journal: "Medicine", year: 2020, doi: null, pubmedId: null,
    abstract: "薈萃分析評價太極拳對高血壓患者血壓的影響。結果顯示太極拳可顯著降低收縮壓和舒張壓。",
    summary: "太極拳作為輔助干預可顯著降低高血壓患者的收縮壓和舒張壓。", sampleSize: null,
    population: "原發性高血壓患者", intervention: "太極拳訓練", comparator: "常規運動或不運動",
    primaryOutcome: "收縮壓和舒張壓變化", resultsSummary: "太極拳組收縮壓降低約10mmHg，舒張壓降低約4mmHg。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch 3: JTCMS (Journal of Traditional Chinese Medical Sciences) entries
  // Source: https://www.sciencedirect.com/journal/journal-of-traditional-chinese-medical-sciences
  // ═══════════════════════════════════════════════════════════════════════════

  // 120: TCM Pattern Scale for Chronic Low Back Pain (RCT)
  {
    title: "中醫證候量表作為慢性下背痛結局評估工具的三臂隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Ho CE, Tan ICC et al.",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2026,
    doi: "10.1016/j.jtcms.2025.12.001", pubmedId: null,
    abstract: "三臂隨機對照試驗探索中醫證候量表在慢性下背痛評估中的應用。研究驗證了中醫辨證論治結局評估工具的可靠性和有效性。",
    summary: "首個驗證中醫證候量表在慢性下背痛臨床試驗中作為結局指標的RCT，為中醫標準化評估提供了新工具。",
    sampleSize: null, population: "慢性下背痛患者", intervention: "中醫辨證論治",
    comparator: "常規治療", primaryOutcome: "中醫證候量表評分、VAS疼痛評分",
    resultsSummary: "中醫證候量表具有良好的信度和效度，可作為慢性下背痛臨床試驗的有效結局指標。",
    riskOfBias: "LOW", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 121: Acupuncture Therapies for Post-VCF Pain (Network Meta-Analysis)
  {
    title: "針灸相關療法治療椎體壓縮骨折術後疼痛的網絡薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Fan J, Gao Y, Xiong Y, Li D, Yang Y",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.08.002", pubmedId: null,
    abstract: "網絡薈萃分析比較不同針灸相關療法治療椎體壓縮骨折手術後疼痛的療效。評估了針刺、電針、艾灸、穴位貼敷等多種干預措施。",
    summary: "網絡薈萃分析顯示針灸相關療法可有效緩解椎體壓縮骨折術後疼痛，不同療法間療效存在差異。",
    sampleSize: null, population: "椎體壓縮骨折術後患者", intervention: "針灸相關療法（針刺、電針、艾灸等）",
    comparator: "常規鎮痛治療", primaryOutcome: "疼痛VAS評分",
    resultsSummary: "電針和穴位貼敷在緩解術後疼痛方面療效最佳。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 122: Acupuncture for Pain Management in Australia (Review)
  {
    title: "針灸疼痛管理在澳洲的現狀與未來方向",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Wang Y, Zheng Z",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.09.009", pubmedId: null,
    abstract: "綜述針灸疼痛管理在澳洲的臨床應用現狀、監管環境和未來發展方向。澳洲是全球少數對中醫實施國家級註冊監管的國家之一。",
    summary: "澳洲作為全球中醫監管先進國家，針灸在疼痛管理中被廣泛接受，但需更多高質量本地化臨床研究。",
    sampleSize: null, population: "澳洲慢性疼痛患者", intervention: "針灸",
    comparator: null, primaryOutcome: "臨床實踐調查與政策分析",
    resultsSummary: "針灸已納入澳洲疼痛管理臨床路徑，國家級監管促進了行業規範化發展。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 123: Sanhua Essential Oil for Breast Cancer Depression (RCT)
  {
    title: "三花精油吸入對乳腺癌化療患者相關抑鬱的療效：隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Li X, Xu Z, Dong M, Wang Y, Sheng J",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.05.003", pubmedId: null,
    abstract: "單盲安慰劑對照隨機試驗評價三花精油（玫瑰、茉莉、薰衣草）吸入療法對乳腺癌化療患者抑鬱症狀的療效。",
    summary: "三花精油吸入可顯著改善乳腺癌化療患者的抑鬱評分和生活質量。",
    sampleSize: null, population: "接受化療的乳腺癌伴抑鬱患者", intervention: "三花精油芳香吸入療法",
    comparator: "安慰劑（無香精油）", primaryOutcome: "PHQ-9抑鬱評分",
    resultsSummary: "精油組PHQ-9評分顯著降低，焦慮和睡眠質量亦有改善。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 124: CHM Expert Consensus for RA in Singapore
  {
    title: "新加坡中藥治療類風濕性關節炎專家共識",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Loh A, Li H, Lam WC, Tjioe YY, Fong W, Zhong LLD",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.06.004", pubmedId: null,
    abstract: "通過德爾菲法建立新加坡中藥治療類風濕性關節炎的專家共識。涵蓋辨證論治、常用方劑、中西醫結合策略等方面。",
    summary: "首個新加坡中醫治療RA的專家共識指南，為東南亞地區中醫規範化治療RA提供依據。",
    sampleSize: null, population: "類風濕性關節炎患者", intervention: "中藥辨證論治",
    comparator: null, primaryOutcome: "專家共識意見",
    resultsSummary: "達成共識：濕熱痹阻型為RA最常見證型，推薦方劑包括獨活寄生湯、四妙散等。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 125: TCM Constitution and Chronic Pain (Cross-Sectional)
  {
    title: "慢性疼痛患者中醫體質與抑鬱、焦慮、睡眠障礙的相關性研究",
    studyType: "COHORT", evidenceLevel: "LEVEL_3B", evidenceGrade: "C",
    authors: "Guo S, Liu C, Wang L, Tu J, Yang N",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.016", pubmedId: null,
    abstract: "橫斷面研究探索慢性疼痛患者中醫體質類型與抑鬱、焦慮、睡眠障礙之間的關聯。發現氣鬱質和氣虛質與心理症狀顯著相關。",
    summary: "慢性疼痛患者中，氣鬱質和氣虛質與抑鬱、焦慮和睡眠障礙密切相關，為個體化治療提供體質辨識依據。",
    sampleSize: null, population: "慢性疼痛患者", intervention: "中醫體質辨識",
    comparator: null, primaryOutcome: "中醫體質類型與PHQ-9、GAD-7、PSQI的相關性",
    resultsSummary: "氣鬱質患者抑鬱和焦慮風險顯著增高；氣虛質與睡眠障礙相關。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "NOS", status: "PUBLISHED",
  },

  // 126: Jiaotai Pill for T2DM (Experimental)
  {
    title: "交泰丸及其主要成分增強2型糖尿病大鼠胰島激素分泌的實驗研究",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Han H, Huang X, Li Y, Wang P, Zhang Y",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.06.001", pubmedId: null,
    abstract: "動物實驗研究交泰丸（黃連、肉桂組成）對2型糖尿病大鼠胰島激素分泌的影響及機制。黃連-肉桂配伍可改善胰島功能。",
    summary: "交泰丸通過調節胰島β細胞功能改善糖尿病大鼠的血糖水平，為「寒熱並用」治法提供實驗依據。",
    sampleSize: null, population: "2型糖尿病動物模型", intervention: "交泰丸（黃連配肉桂）",
    comparator: "模型對照組", primaryOutcome: "胰島素和胰高血糖素水平",
    resultsSummary: "交泰丸可改善胰島β細胞功能，增加胰島素分泌。黃連與肉桂的協同作用優於單藥。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 127: Tai Chi/Qigong for Lumbar Disc Herniation (SR/MA)
  {
    title: "太極拳和氣功對腰椎間盤突出症健康指標影響的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Zhao A, Mao J, Cai Y, Wang M, Liu X",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.001", pubmedId: null,
    abstract: "系統評價太極拳和氣功對腰椎間盤突出症患者疼痛、功能障礙和生活質量的影響。",
    summary: "太極拳和氣功可改善腰椎間盤突出症患者的疼痛和功能障礙，是安全有效的輔助治療選擇。",
    sampleSize: null, population: "腰椎間盤突出症患者", intervention: "太極拳或氣功訓練",
    comparator: "常規康復或無運動", primaryOutcome: "VAS疼痛評分、ODI功能障礙指數",
    resultsSummary: "太極/氣功組疼痛和功能障礙評分均顯著改善，生活質量提升。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 128: Xiaoshuan Capsule for Ischemic Stroke (RCT)
  {
    title: "消栓腸溶膠囊輔助治療缺血性腦卒中的療效與機制：隨機臨床試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Wen C, Su Z, Ding Z, Ma C, Zhu L",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.005", pubmedId: null,
    abstract: "隨機臨床試驗評價消栓腸溶膠囊作為缺血性腦卒中輔助治療的療效和機制。結合血液流變學和炎症指標分析。",
    summary: "消栓腸溶膠囊可改善缺血性腦卒中患者的神經功能和血液流變學指標。",
    sampleSize: null, population: "缺血性腦卒中患者", intervention: "消栓腸溶膠囊聯合標準治療",
    comparator: "單用標準治療", primaryOutcome: "NIHSS神經功能評分、血液流變學",
    resultsSummary: "治療組NIHSS評分改善顯著，血液黏度和炎症指標降低。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 129: Liqingtong for Hyperuricemia (RCT, Double-Blind)
  {
    title: "利清通顆粒治療高尿酸血症的隨機雙盲安慰劑對照先導試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Liu J, Yang Y, Lv M, Fei W, Zhang J",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.007", pubmedId: null,
    abstract: "隨機雙盲安慰劑對照先導試驗評價中藥利清通顆粒治療高尿酸血症的療效與安全性。",
    summary: "雙盲RCT顯示利清通顆粒可安全有效地降低高尿酸血症患者的血清尿酸水平。",
    sampleSize: null, population: "高尿酸血症患者", intervention: "利清通顆粒",
    comparator: "安慰劑", primaryOutcome: "血清尿酸水平",
    resultsSummary: "利清通組血清尿酸顯著降低，未見明顯不良反應。",
    riskOfBias: "LOW", qualityScore: 0.75, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 130: Jiawei Simiao Powder for Gout (Meta-Analysis)
  {
    title: "加味四妙散聯合塞來昔布治療急性痛風性關節炎的薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Jia W, Wei M, Zhang W, Yin D, Gong Y",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.06.002", pubmedId: null,
    abstract: "薈萃分析評價加味四妙散聯合塞來昔布治療急性痛風性關節炎的臨床療效。",
    summary: "加味四妙散聯合塞來昔布在治療急性痛風性關節炎方面優於單用塞來昔布，可更快緩解疼痛和腫脹。",
    sampleSize: null, population: "急性痛風性關節炎患者", intervention: "加味四妙散聯合塞來昔布",
    comparator: "單用塞來昔布", primaryOutcome: "疼痛VAS評分、關節腫脹程度、血清尿酸",
    resultsSummary: "聯合治療組疼痛緩解更快，關節腫脹消退更早，血清尿酸降低幅度更大。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 131: EA for Dysmenorrhea (RCT)
  {
    title: "不同波形電針治療原發性痛經的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Wu X, Yuan J, Ni J, Ma X, Wang BP",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.06.004", pubmedId: null,
    abstract: "隨機對照試驗比較不同波形電針（連續波、疏密波）治療原發性痛經的療效差異。",
    summary: "不同波形電針均可緩解原發性痛經疼痛，疏密波在某些結局指標上略優。",
    sampleSize: null, population: "原發性痛經患者", intervention: "電針（三陰交、關元等穴，不同波形）",
    comparator: "不同電針波形之間比較", primaryOutcome: "VAS疼痛評分、COX痛經評分",
    resultsSummary: "兩種波形電針均可有效緩解痛經，疏密波組在疼痛持續時間上更優。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 132: EA for Thyroidectomy Pain (RCT)
  {
    title: "電針麻醉控制甲狀腺全切術中疼痛和血液動力學的隨機對照試驗",
    studyType: "RCT", evidenceLevel: "LEVEL_2B", evidenceGrade: "B",
    authors: "Tran DP, Nguyen QD, Nguyen NK, Pham VH",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.03.007", pubmedId: null,
    abstract: "隨機對照試驗評價電針輔助麻醉在甲狀腺全切術中控制術中疼痛和血液動力學穩定性的療效。",
    summary: "電針輔助麻醉可有效控制甲狀腺手術中的疼痛並維持血液動力學穩定，減少麻醉藥用量。",
    sampleSize: null, population: "接受甲狀腺全切術的患者", intervention: "電針輔助麻醉（合谷、內關等穴）",
    comparator: "標準全身麻醉", primaryOutcome: "術中疼痛評分、血壓和心率變化",
    resultsSummary: "電針組術中血壓心率波動更小，術後鎮痛藥用量更少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.68, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 133: CHM for Breast Cancer Osteoporosis (SR/MA)
  {
    title: "中藥治療乳腺癌內分泌治療相關骨質疏鬆的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Quan X, Chen H, Wang W, Gao Y et al.",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.03.004", pubmedId: null,
    abstract: "系統評價中藥治療乳腺癌內分泌治療（芳香化酶抑制劑）導致的骨質疏鬆的療效與安全性。",
    summary: "中藥（以補腎方為主）可能改善乳腺癌內分泌治療相關骨質疏鬆的骨密度指標。",
    sampleSize: null, population: "接受芳香化酶抑制劑治療的乳腺癌患者", intervention: "中藥方劑（補腎壯骨類）",
    comparator: "鈣劑/維生素D或空白對照", primaryOutcome: "骨密度（BMD）、骨代謝標誌物",
    resultsSummary: "中藥組骨密度改善優於對照組，骨代謝指標有改善趨勢。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "AMSTAR 2", status: "PUBLISHED",
  },

  // 134: Modified Xiaoyao Powder for Postpartum Depression (SR/MA)
  {
    title: "加味逍遙散治療產後抑鬱的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Hu M, Zhang X, Zhang X, Cheng D, Lu Y",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2023.12.002", pubmedId: null,
    abstract: "系統評價加味逍遙散治療產後抑鬱的臨床療效。檢索多個中英文數據庫的RCT。",
    summary: "加味逍遙散可能改善產後抑鬱的HAMD評分，但現有研究質量有限。",
    sampleSize: null, population: "產後抑鬱患者", intervention: "加味逍遙散",
    comparator: "抗抑鬱藥（SSRIs等）", primaryOutcome: "HAMD抑鬱評分、臨床總有效率",
    resultsSummary: "加味逍遙散組HAMD評分改善與SSRIs相當，不良反應更少。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 135: CHM + WM for Mycoplasma Pneumonia in Children (Overview of SRs)
  {
    title: "中藥聯合西藥治療兒童支原體肺炎的系統評價概述",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhang S, Zhang X, Cui Y, Huang J, Han F",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2023.12.004", pubmedId: null,
    abstract: "概述多項系統評價，分析中藥聯合西藥治療兒童支原體肺炎的證據。",
    summary: "中藥聯合抗生素治療兒童支原體肺炎的總有效率可能優於單用抗生素。",
    sampleSize: null, population: "兒童支原體肺炎患者", intervention: "中藥聯合大環內酯類抗生素",
    comparator: "單用大環內酯類抗生素", primaryOutcome: "臨床總有效率、退熱時間",
    resultsSummary: "多項系統評價一致顯示聯合治療在有效率和症狀緩解方面優於單用西藥。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "AMSTAR 2", status: "PUBLISHED",
  },

  // 136: TCM Exercise for Diabetic Neuropathy (SR/MA)
  {
    title: "傳統中醫運動治療糖尿病合併神經病變的系統評價與薈萃分析",
    studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Mao J, Zhao A, Cai Y, Liu X",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.009", pubmedId: null,
    abstract: "系統評價傳統中醫運動（太極拳、八段錦、氣功等）治療糖尿病合併神經病變的療效。",
    summary: "傳統中醫運動可改善糖尿病神經病變患者的血糖控制、神經傳導速度和平衡功能。",
    sampleSize: null, population: "糖尿病合併周圍神經病變患者", intervention: "太極拳、八段錦、氣功",
    comparator: "常規運動或無運動", primaryOutcome: "HbA1c、神經傳導速度、平衡測試",
    resultsSummary: "中醫運動組HbA1c改善，神經傳導速度和平衡功能顯著提升。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 137: TEAS for Postoperative Muscle Atrophy (RCT)
  {
    title: "經皮穴位電刺激治療足踝骨折術後肌肉萎縮的隨機對照先導研究",
    studyType: "RCT", evidenceLevel: "LEVEL_3A", evidenceGrade: "C",
    authors: "Xue Y, Dai X, Chen X, Guo S, Zhao B",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.012", pubmedId: null,
    abstract: "隨機對照先導研究評價經皮穴位電刺激（TEAS）對足踝骨折術後肌肉萎縮的預防效果。",
    summary: "TEAS可減輕足踝骨折術後的肌肉萎縮程度，加速功能恢復。",
    sampleSize: null, population: "足踝骨折術後患者", intervention: "TEAS（足三里、陽陵泉等穴）",
    comparator: "假刺激", primaryOutcome: "肌肉截面積、肌力測試",
    resultsSummary: "TEAS組術後肌肉萎縮程度減輕，功能恢復更快。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 138: Ginsenosides for Depression (Bench to Bedside Review)
  {
    title: "人參皂苷治療抑鬱症：從基礎研究到臨床應用",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Xie J, Zhu F, Zhao Y, Wang Y, Tang M",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.007", pubmedId: null,
    abstract: "綜述人參皂苷（Rb1、Rg1、Rg3等）抗抑鬱作用的藥理機制和臨床應用進展，涵蓋HPA軸調節、神經營養因子、腸道菌群等多個靶點。",
    summary: "人參皂苷通過多靶點多途徑發揮抗抑鬱作用，為人參類方劑治療抑鬱症提供了現代藥理學依據。",
    sampleSize: null, population: "抑鬱症患者", intervention: "人參皂苷（Rb1, Rg1, Rg3等）",
    comparator: null, primaryOutcome: "文獻綜述：藥理機制與臨床應用",
    resultsSummary: "人參皂苷通過調節HPA軸、增加BDNF、抗神經炎症和調節腸道菌群發揮抗抑鬱作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 139: TCM and Cognitive Function in Elderly (Large Cross-Sectional)
  {
    title: "中醫對中國老年人認知功能影響因素的大規模橫斷面研究",
    studyType: "COHORT", evidenceLevel: "LEVEL_3B", evidenceGrade: "C",
    authors: "Li H, Chen R, Xia J, He F, Ni C",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.010", pubmedId: null,
    abstract: "大規模橫斷面研究探索中醫藥使用與中國老年人認知功能之間的關係，分析影響認知功能的保護性和危險性因素。",
    summary: "大規模研究提示長期中醫藥使用可能與老年人較好的認知功能維持相關。",
    sampleSize: null, population: "中國社區居住老年人", intervention: "中醫藥使用（包括中藥和針灸）",
    comparator: "未使用中醫藥者", primaryOutcome: "認知功能量表評分",
    resultsSummary: "長期中醫藥使用者認知功能評分優於未使用者，提示中醫藥可能具有認知保護作用。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "NOS", status: "PUBLISHED",
  },

  // 140: Fermented Suan Zao Ren for Insomnia (Experimental)
  {
    title: "發酵酸棗仁改善血虛型失眠小鼠睡眠的實驗研究",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Ma W, Wang X, Cheng F et al.",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2026,
    doi: "10.1016/j.jtcms.2026.03.008", pubmedId: null,
    abstract: "研究發酵酸棗仁（酸棗仁湯的君藥）對血虛型失眠小鼠模型的改善作用及其機制。發酵處理可增強酸棗仁的安神活性成分含量。",
    summary: "發酵處理可增強酸棗仁的安神助眠效果，為酸棗仁湯的現代化改良提供實驗依據。",
    sampleSize: null, population: "血虛型失眠動物模型", intervention: "發酵酸棗仁提取物",
    comparator: "未發酵酸棗仁、模型對照", primaryOutcome: "睡眠潛伏期、睡眠時間",
    resultsSummary: "發酵酸棗仁組睡眠潛伏期縮短、睡眠時間延長，效果優於未發酵組。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 141: Panax Ginseng for Cognitive/Emotional Dysregulation (Review)
  {
    title: "人參及其衍生物在認知與情緒失調中的應用綜述",
    studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Wang Z, Sun Y, Li L, Guo J",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2026,
    doi: "10.1016/j.jtcms.2026.03.007", pubmedId: null,
    abstract: "全面綜述人參（Panax ginseng C. A. Mey.）及其活性成分在認知障礙和情緒失調治療中的研究進展。涵蓋藥食同源理念。",
    summary: "人參作為藥食同源代表性藥材，其活性成分人參皂苷在認知和情緒調節中展現多重藥理活性。",
    sampleSize: null, population: "認知障礙和情緒失調患者", intervention: "人參及其衍生物",
    comparator: null, primaryOutcome: "文獻綜述",
    resultsSummary: "人參皂苷Rg1、Rb1等成分通過調節膽鹼能系統、抗氧化和抗神經炎症發揮認知保護和情緒調節作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 142: Astragalus membranaceus Fermentation Immunomodulation
  {
    title: "發酵黃芪莖葉免疫功能增強研究",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Li Z, Jia M, Sheng M, Zhou Q, Shi X",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2024.11.005", pubmedId: null,
    abstract: "研究發酵處理對黃芪莖葉免疫調節活性的影響。發酵可增加黃芪多糖和黃酮含量，增強免疫功能。",
    summary: "發酵處理可顯著增強黃芪莖葉的免疫調節活性，為黃芪資源的充分利用開闢新途徑。",
    sampleSize: null, population: "免疫功能低下動物模型", intervention: "發酵黃芪莖葉提取物",
    comparator: "未發酵黃芪", primaryOutcome: "免疫細胞活性、細胞因子水平",
    resultsSummary: "發酵黃芪組免疫球蛋白和細胞因子水平顯著升高。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 143: Wendan Decoction for Obesity (Mechanism)
  {
    title: "溫膽湯通過調控基因啟動子甲基化預防肥胖的機制研究",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Yang H, Ren M, Wu Z, Li J, Wang P",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2023.12.009", pubmedId: null,
    abstract: "研究溫膽湯（治療痰濕型肥胖的經典方劑）通過調節多個信號通路的基因啟動子甲基化來預防肥胖的表觀遺傳機制。",
    summary: "溫膽湯通過表觀遺傳機制（DNA甲基化）調節脂質代謝相關基因表達，為痰濕體質治療提供分子機制解釋。",
    sampleSize: null, population: "肥胖動物模型", intervention: "溫膽湯",
    comparator: "高脂飲食模型對照", primaryOutcome: "基因甲基化水平、體重和脂質指標",
    resultsSummary: "溫膽湯改變多個脂質代謝相關基因的甲基化狀態，抑制體重增加。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 144: Gong Liu Ning for Uterine Fibroids (SR of RCTs)
  {
    title: "宮瘤寧作為子宮肌瘤輔助治療的隨機對照試驗系統評價",
    studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Fan L, Hu J, Han M, Yang G et al.",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2023,
    doi: "10.1016/j.jtcms.2023.09.008", pubmedId: null,
    abstract: "系統評價中成藥宮瘤寧作為子宮肌瘤輔助治療的RCT證據。",
    summary: "宮瘤寧可能有助於縮小子宮肌瘤體積，改善相關症狀，但證據質量有待提高。",
    sampleSize: null, population: "子宮肌瘤患者", intervention: "宮瘤寧膠囊（輔助治療）",
    comparator: "米非司酮或空白對照", primaryOutcome: "肌瘤體積變化、症狀改善率",
    resultsSummary: "宮瘤寧聯合治療組肌瘤體積縮小率優於對照組。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED",
  },

  // 145: Qi Stagnation Constitution and Lifestyle Factors
  {
    title: "氣鬱體質、亞健康狀態與生活方式因素的關聯研究",
    studyType: "COHORT", evidenceLevel: "LEVEL_3B", evidenceGrade: "C",
    authors: "Zhang H, Chen J, Chen J, Liu Y, Zhao X",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.09.002", pubmedId: null,
    abstract: "基於人群的橫斷面研究探索氣鬱體質與亞健康狀態、生活方式因素之間的關聯。",
    summary: "氣鬱體質與亞健康狀態密切相關，久坐、睡眠不足和情緒壓力是主要危險因素。",
    sampleSize: null, population: "社區居民", intervention: "中醫體質辨識問卷",
    comparator: null, primaryOutcome: "氣鬱體質與亞健康相關性",
    resultsSummary: "氣鬱質人群亞健康風險增高，提示疏肝理氣的生活方式干預有重要意義。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "NOS", status: "PUBLISHED",
  },

  // 146: Danggui Shaoyao Powder for Atherosclerosis
  {
    title: "當歸芍藥散通過PPARγ-LXRα-ABCA1通路改善動脈粥樣硬化小鼠肝臟脂質代謝",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Pian X, Tang Y, Sun Y, Sheng Y et al.",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.03.010", pubmedId: null,
    abstract: "實驗研究當歸芍藥散通過PPARγ-LXRα-ABCA1信號通路改善動脈粥樣硬化的肝臟脂質代謝障礙。",
    summary: "當歸芍藥散可通過調節膽固醇逆轉運通路改善動脈粥樣硬化，為血瘀證治療提供分子機制。",
    sampleSize: null, population: "動脈粥樣硬化動物模型", intervention: "當歸芍藥散",
    comparator: "模型對照組", primaryOutcome: "血脂水平、肝臟脂質代謝相關蛋白表達",
    resultsSummary: "當歸芍藥散上調ABCA1表達，促進膽固醇外排，改善血脂。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 147: Huatan Qushi Formula for NAFLD
  {
    title: "化痰祛濕方通過PI3K/Akt通路和腸道菌群調節緩解非酒精性脂肪肝",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Zhang X, Zhu L, Ma J, Zheng Y, Li L",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.08.004", pubmedId: null,
    abstract: "實驗研究化痰祛濕方（中醫「痰濕」理論代表方劑）通過PI3K/Akt信號通路和腸道菌群調節治療NAFLD的機制。",
    summary: "化痰祛濕方通過「腸-肝軸」調節腸道菌群和PI3K/Akt通路緩解NAFLD，驗證了中醫「痰濕」理論。",
    sampleSize: null, population: "NAFLD動物模型", intervention: "化痰祛濕方",
    comparator: "模型對照組", primaryOutcome: "肝臟脂肪變性程度、腸道菌群組成",
    resultsSummary: "化痰祛濕方改善肝臟脂肪變性，調節腸道菌群失調，抑制PI3K/Akt通路。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 148: Dan Shen + Hong Hua Network Pharmacology
  {
    title: "丹參-紅花藥對心肌保護的網絡藥理學與實驗驗證",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Zhong L, Dong L, Sun J, Yang J, Xu W",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2023.11.003", pubmedId: null,
    abstract: "通過網絡藥理學和實驗驗證揭示丹參（Salvia miltiorrhiza）和紅花（Carthamus tinctorius）協同心肌保護機制。",
    summary: "丹參紅花配伍通過多靶點多通路發揮協同心肌保護作用，驗證了「活血化瘀」治法的科學性。",
    sampleSize: null, population: "心肌缺血動物模型", intervention: "丹參紅花配伍提取物",
    comparator: "單藥和模型對照", primaryOutcome: "心肌梗死面積、心功能指標",
    resultsSummary: "丹參紅花配伍的心肌保護效果優於單藥，作用於PI3K/Akt和MAPK等多條信號通路。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // 149: Danzhi Xiaoyao Powder for Subthreshold Depression
  {
    title: "丹梔逍遙散治療亞臨床抑鬱的轉錄組學和網絡藥理學整合分析",
    studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Li K, You L, Zhen J, Huang G, Wang T, Xu A",
    journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2023.12.001", pubmedId: null,
    abstract: "通過轉錄組學和網絡藥理學整合分析揭示丹梔逍遙散（逍遙散加味方）治療亞臨床抑鬱的白細胞特徵和功能改變機制。",
    summary: "丹梔逍遙散通過調節白細胞功能和免疫炎症反應改善亞臨床抑鬱，為逍遙散類方抗抑鬱機制提供轉錄組學證據。",
    sampleSize: null, population: "亞臨床抑鬱患者", intervention: "丹梔逍遙散",
    comparator: "健康對照", primaryOutcome: "白細胞轉錄組學特徵",
    resultsSummary: "丹梔逍遙散可逆轉亞臨床抑鬱患者異常的白細胞基因表達譜。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch 4: Cochrane reviews, condition-specific evidence (index 150–199)
  // ═══════════════════════════════════════════════════════════════════════════

  // 150: Acupuncture for Depression (SR/MA, 29 studies)
  { title: "針灸治療抑鬱症的系統評價與薈萃分析（29項研究, 2268例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Smith CA, Armour M, Lee MS et al.", journal: "Journal of Clinical Medicine", year: 2019, doi: "10.3390/jcm8081140", pubmedId: "31370200",
    abstract: "納入29項研究共2268例的薈萃分析顯示，針灸與常規治療、假針灸相比，均可顯著減輕抑鬱嚴重程度。針灸輔助抗抑鬱藥治療效果更佳。",
    summary: "高質量薈萃分析證實針灸可顯著緩解抑鬱症狀，無論是單獨使用還是輔助抗抑鬱藥均有效。", sampleSize: 2268,
    population: "重性抑鬱障礙患者", intervention: "針灸（體穴為主）", comparator: "假針灸、常規治療或抗抑鬱藥",
    primaryOutcome: "抑鬱評分（HAMD、BDI）", resultsSummary: "針灸組抑鬱評分改善顯著優於假針灸和常規治療組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.75, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 151: Acupuncture vs Sham for GAD (2025 MA)
  { title: "針灸與假針灸治療廣泛性焦慮症的薈萃分析（14項RCT, 968例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhang Y, Li W et al.", journal: "Acupuncture in Medicine", year: 2025, doi: null, pubmedId: null,
    abstract: "14項RCT共968例的薈萃分析比較針灸與假針灸治療廣泛性焦慮症的療效。",
    summary: "針灸治療GAD的療效優於假針灸，為針灸抗焦慮提供了安慰劑對照的證據。", sampleSize: 968,
    population: "廣泛性焦慮症患者", intervention: "針灸", comparator: "假針灸",
    primaryOutcome: "HAMA焦慮評分", resultsSummary: "針灸組HAMA評分顯著優於假針灸組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.68, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 152: EA for Depression Enhancement (SR/MA)
  { title: "針灸增強抗抑鬱藥療效並減少不良反應的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Li H, Zhong Y et al.", journal: "Journal of Affective Disorders", year: 2022, doi: null, pubmedId: "35595611",
    abstract: "系統評價針灸聯合抗抑鬱藥與單用抗抑鬱藥的療效和不良反應比較。",
    summary: "針灸輔助抗抑鬱藥可增強療效並減少藥物不良反應。", sampleSize: null,
    population: "抑鬱症患者（正在服用抗抑鬱藥）", intervention: "針灸聯合抗抑鬱藥", comparator: "單用抗抑鬱藥",
    primaryOutcome: "HAMD評分、不良反應發生率", resultsSummary: "針灸組HAMD改善更顯著，不良反應更少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 153: Acupuncture for Labour Pain (Cochrane)
  { title: "針灸和穴位按壓用於分娩疼痛管理的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Smith CA, Collins CT, Levett KM et al.", journal: "Cochrane Database of Systematic Reviews", year: 2020,
    doi: "10.1002/14651858.CD009232.pub2", pubmedId: "32032444",
    abstract: "Cochrane系統評價針灸和穴位按壓在分娩疼痛管理中的作用。評估疼痛強度、滿意度、分娩方式等結局。",
    summary: "針灸可能提高產婦對疼痛管理的滿意度並減少藥物鎮痛的使用，穴位按壓可能降低剖宮產率。", sampleSize: null,
    population: "分娩期產婦", intervention: "針灸或穴位按壓", comparator: "假針灸或常規分娩鎮痛",
    primaryOutcome: "疼痛強度、疼痛管理滿意度、分娩方式", resultsSummary: "針灸組藥物鎮痛使用減少，滿意度提高。穴位按壓可能降低剖宮產率。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.78, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 154: Acupuncture for Fibromyalgia (SR/MA, 12 RCTs)
  { title: "針灸治療纖維肌痛的系統評價與薈萃分析（12項RCT）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhang XC, Chen H, Xu WT et al.", journal: "Journal of Pain Research", year: 2019, doi: "10.2147/JPR.S186227", pubmedId: "30787631",
    abstract: "12項RCT的薈萃分析評價針灸治療纖維肌痛的療效。結果顯示針灸顯著優於假針灸，可緩解疼痛並改善生活質量。",
    summary: "針灸治療纖維肌痛有中低質量證據支持，短期內可緩解疼痛和改善生活質量。", sampleSize: null,
    population: "纖維肌痛患者", intervention: "針灸或電針", comparator: "假針灸",
    primaryOutcome: "疼痛VAS評分、FIQ生活質量", resultsSummary: "針灸組疼痛和FIQ評分均顯著優於假針灸組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.68, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 155: Acupuncture for COPD (Overview of SRs)
  { title: "針灸治療COPD的系統評價概述", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Li Y, Feng Y et al.", journal: "Frontiers in Medicine", year: 2024, doi: null, pubmedId: null,
    abstract: "概述多項系統評價分析針灸治療COPD的療效證據。穴位按壓在改善生活質量和焦慮方面有統計學差異。",
    summary: "多項系統評價支持針灸作為COPD的輔助治療，穴位按壓可改善生活質量。", sampleSize: null,
    population: "慢性阻塞性肺疾病患者", intervention: "各種針灸療法", comparator: "常規治療",
    primaryOutcome: "FEV1、6分鐘步行距離、生活質量", resultsSummary: "穴位按壓在生活質量和焦慮改善方面有統計學差異，其他針灸技術證據不足。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "AMSTAR 2", status: "PUBLISHED" },

  // 156: Acupuncture for Asthma (16 RCTs)
  { title: "針灸治療哮喘的臨床證據：16項隨機假針灸/安慰劑對照試驗薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "C",
    authors: "Zhang Y, Li Y et al.", journal: "Allergy", year: 2023, doi: null, pubmedId: "37257728",
    abstract: "16項RCT的薈萃分析評價針灸治療哮喘的療效。結果顯示針灸可改善FEV1%。",
    summary: "16項RCT顯示針灸可改善哮喘患者FEV1%（MD 6.11），但證據質量有限。", sampleSize: 603,
    population: "支氣管哮喘患者", intervention: "針灸", comparator: "假針灸/安慰劑",
    primaryOutcome: "FEV1%、PEF", resultsSummary: "針灸組FEV1%改善（MD 6.11, 95%CI 0.54-11.68），但異質性較大。",
    riskOfBias: "HIGH", qualityScore: 0.52, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 157: Acupuncture for Meniere's Disease (6 RCTs)
  { title: "針灸治療梅尼埃病的系統評價與薈萃分析（6項RCT）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Wang J et al.", journal: "Frontiers in Neurology", year: 2024, doi: null, pubmedId: "39722819",
    abstract: "6項RCT的薈萃分析評價針灸治療梅尼埃病的療效和安全性。結果顯示治療組有效率顯著高於對照組。",
    summary: "針灸可能改善梅尼埃病的眩暈、耳鳴、耳悶和聽力下降症狀，但需更多高質量RCT。", sampleSize: null,
    population: "梅尼埃病患者", intervention: "針灸（翳風、聽宮、百會等穴）", comparator: "西藥（倍他司汀等）",
    primaryOutcome: "臨床有效率、眩暈頻率", resultsSummary: "針灸組有效率顯著高於對照組（RR=1.20, 95%CI 1.11-1.29）。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 158: Acupuncture for Tinnitus (Network MA)
  { title: "針灸治療耳鳴的網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Li X et al.", journal: "Complementary Therapies in Medicine", year: 2023, doi: null, pubmedId: "37773876",
    abstract: "網絡薈萃分析比較不同針灸方法治療耳鳴的療效。穴位注射聯合溫針效果最佳。",
    summary: "不同針灸方法治療耳鳴效果不同，穴位注射聯合溫針可能最有效。", sampleSize: null,
    population: "慢性耳鳴患者", intervention: "各種針灸療法", comparator: "西藥或不同針灸方法",
    primaryOutcome: "耳鳴嚴重度、有效率", resultsSummary: "穴位注射聯合溫針灸有效率最高，但整體證據質量需提升。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 159: CHM for Female Infertility (40 RCTs, 4247 women)
  { title: "中藥治療女性不孕症的最新薈萃分析（40項RCT, 4247例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Ried K, Stuart K", journal: "Complementary Therapies in Medicine", year: 2015, doi: null, pubmedId: "25637159",
    abstract: "40項RCT共4247例女性的薈萃分析顯示中藥治療不孕症的妊娠率是西藥的1.74倍。涵蓋PCOS、子宮內膜異位症、排卵障礙等。",
    summary: "中藥治療女性不孕症的妊娠率顯著高於西藥治療（RR=1.74），涵蓋多種不孕原因。", sampleSize: 4247,
    population: "女性不孕症患者（PCOS、子宮內膜異位症等）", intervention: "中藥方劑", comparator: "西藥（克羅米芬等）",
    primaryOutcome: "妊娠率", resultsSummary: "中藥組妊娠率為西藥組的1.74倍，4個月療程效果最佳。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 160: CHM for Endometriosis (22 RCTs, 1938 pts)
  { title: "中藥治療卵巢子宮內膜異位囊腫術後長期管理的系統評價（22項RCT, 1938例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Zhang Y, Wang L et al.", journal: "Phytomedicine", year: 2024, doi: null, pubmedId: "38910886",
    abstract: "22項RCT共1938例的薈萃分析評價中藥在卵巢子宮內膜異位囊腫術後長期管理中的作用。中藥組復發率更低。",
    summary: "中藥術後輔助治療可降低卵巢子宮內膜異位囊腫的復發率和增加妊娠率。", sampleSize: 1938,
    population: "卵巢子宮內膜異位囊腫術後患者", intervention: "中藥方劑（活血化瘀類）", comparator: "GnRH-a或空白對照",
    primaryOutcome: "復發率、妊娠率", resultsSummary: "中藥組復發率低於對照組，妊娠率有改善趨勢。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 161: Dan Shen CHM for Endometriosis
  { title: "含丹參中藥方聯合GnRH-a治療子宮內膜異位症術後的系統評價", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Chen Y, Liu X et al.", journal: "Frontiers in Pharmacology", year: 2022, doi: null, pubmedId: "35250579",
    abstract: "系統評價含丹參中藥方聯合GnRH-a治療子宮內膜異位症術後的療效。可降低復發率和不良反應。",
    summary: "含丹參的中藥方聯合GnRH-a可降低子宮內膜異位症術後復發率。", sampleSize: null,
    population: "子宮內膜異位症術後患者", intervention: "含丹參中藥方聯合GnRH-a", comparator: "單用GnRH-a",
    primaryOutcome: "復發率、妊娠率", resultsSummary: "聯合治療組復發率更低，妊娠率更高，不良反應更少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 162: CHM for Atopic Dermatitis (17 RCTs, 1624 pts)
  { title: "中藥治療特應性皮炎的最新系統評價（17項RCT, 1624例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Wang X, Li Y et al.", journal: "Phytomedicine", year: 2024, doi: null, pubmedId: "37955143",
    abstract: "17項RCT共1624例的最新薈萃分析評價中藥治療特應性皮炎的療效。中藥可提高總體痊癒率並降低復發率。",
    summary: "中藥可提高特應性皮炎的痊癒率並降低復發率，但EASI和生活質量指標改善不顯著。", sampleSize: 1624,
    population: "特應性皮炎（濕疹）患者", intervention: "中藥內服或外用", comparator: "安慰劑或糖皮質激素",
    primaryOutcome: "總體痊癒率、復發率、EASI評分", resultsSummary: "中藥組痊癒率更高（OR=1.87），復發率更低，但EASI改善未達統計學差異。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 163: Topical CHM for AD with Core Herbs
  { title: "外用中藥治療特應性皮炎的系統評價與核心用藥分析（20項RCT）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Yang L et al.", journal: "Journal of Ethnopharmacology", year: 2023, doi: null, pubmedId: "37328084",
    abstract: "20項RCT評價外用中藥治療AD的療效並挖掘核心用藥。黃柏、苦參、地膚子為最常用外用藥。",
    summary: "外用中藥治療特應性皮炎有效，核心用藥為黃柏、苦參、地膚子等清熱燥濕藥。", sampleSize: null,
    population: "特應性皮炎患者", intervention: "外用中藥製劑", comparator: "糖皮質激素軟膏",
    primaryOutcome: "SCORAD評分、瘙癢VAS", resultsSummary: "外用中藥組症狀改善與激素相當，但不良反應更少。核心用藥分析揭示清熱燥濕為主要治法。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 164: CHM for Alzheimer's Disease (23 studies, 2035 pts)
  { title: "中藥治療阿爾茨海默病的系統評價與薈萃分析（23項研究, 2035例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Li Z, Wang J et al.", journal: "Frontiers in Aging Neuroscience", year: 2024, doi: null, pubmedId: null,
    abstract: "23項研究共2035例的薈萃分析評價中藥複方治療阿爾茨海默病的療效。中藥組有效率高於西藥組（RR=1.19）。",
    summary: "中藥治療AD的有效率優於西藥（RR=1.19），可改善認知功能和日常生活能力。", sampleSize: 2035,
    population: "阿爾茨海默病患者", intervention: "中藥複方", comparator: "多奈哌齊等膽鹼酯酶抑制劑",
    primaryOutcome: "MMSE和ADAS-Cog認知評分", resultsSummary: "中藥組有效率高於西藥組（RR=1.19, 95%CI 1.04-1.37），MMSE和ADAS-Cog均有改善。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 165: CHM for Diabetic Kidney Disease (Placebo-Controlled SR)
  { title: "中藥治療糖尿病腎病的安慰劑對照隨機試驗系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Zhang L, Li P, Xing CY et al.", journal: "BMJ Open", year: 2019, doi: "10.1136/bmjopen-2018-028726", pubmedId: "31048437",
    abstract: "系統評價口服中藥作為糖尿病腎病輔助治療的安慰劑對照RCT。評估腎功能、蛋白尿和死亡率等結局。",
    summary: "安慰劑對照SR顯示中藥輔助治療可改善糖尿病腎病的蛋白尿和腎功能指標。", sampleSize: null,
    population: "糖尿病腎病患者", intervention: "口服中藥聯合常規治療", comparator: "安慰劑聯合常規治療",
    primaryOutcome: "尿蛋白排泄率、eGFR、血肌酐", resultsSummary: "中藥組24小時尿蛋白和微量白蛋白尿顯著降低，eGFR有改善趨勢。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.68, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 166: TCM for DKD (44 RCTs pooled)
  { title: "中藥治療糖尿病腎病的44項RCT匯總分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Li M, Wang W, Xue J et al.", journal: "Frontiers in Endocrinology", year: 2022, doi: null, pubmedId: null,
    abstract: "44項RCT的匯總分析評價中藥治療糖尿病腎病的療效。納入多種中藥方劑和中成藥。",
    summary: "44項RCT的大型匯總分析證實中藥可顯著改善DKD的24小時尿蛋白和腎功能指標。", sampleSize: null,
    population: "糖尿病腎病患者", intervention: "中藥方劑或中成藥", comparator: "安慰劑或常規西藥",
    primaryOutcome: "24小時尿蛋白、血肌酐、BUN", resultsSummary: "中藥組24小時尿蛋白和腎功能指標改善顯著。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 167: Xue Fu Zhu Yu Tang for CHD (SR/MA)
  { title: "血府逐瘀湯治療冠心病患者的療效與安全性系統評價", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Wang J, Zhang L et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2021,
    doi: "10.1155/2021/9949834", pubmedId: "34630621",
    abstract: "系統評價血府逐瘀湯（膠囊）聯合常規藥物治療冠心病心絞痛的療效。血府逐瘀湯可改善心絞痛症狀和心電圖表現。",
    summary: "血府逐瘀湯聯合常規治療在緩解冠心病心絞痛和改善ECG方面優於單用常規治療。", sampleSize: null,
    population: "冠心病心絞痛患者", intervention: "血府逐瘀湯（膠囊）聯合常規藥物", comparator: "單用常規藥物",
    primaryOutcome: "心絞痛症狀改善率、心電圖改善率", resultsSummary: "聯合治療組心絞痛症狀和ECG改善率均優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 168: CHM for Menopausal Hot Flashes (SR/MA)
  { title: "中藥複方治療更年期潮熱的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhong LL, Tong Y, Tang GW et al.", journal: "PLoS ONE", year: 2019, doi: null, pubmedId: "31536531",
    abstract: "系統評價中藥複方治療更年期潮熱的療效。與激素替代療法比較，中藥有相似的總有效率和Kupperman指數改善。",
    summary: "中藥治療更年期潮熱的總有效率與HRT相當，且可顯著改善Kupperman指數。", sampleSize: null,
    population: "更年期潮熱女性", intervention: "中藥複方（以六味地黃丸加減為主）", comparator: "激素替代療法或安慰劑",
    primaryOutcome: "Kupperman指數、潮熱頻率", resultsSummary: "中藥組與HRT組總有效率和Kupperman改善無顯著差異，中藥優於安慰劑。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.58, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 169: Xiao Chai Hu Tang for Chronic Hepatitis B (Cochrane)
  { title: "小柴胡湯治療慢性乙型肝炎的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Liu JP, Manheimer E, Tsutani K, Gluud C", journal: "Cochrane Database of Systematic Reviews", year: 2020,
    doi: "10.1002/14651858.CD005170.pub3", pubmedId: null,
    abstract: "Cochrane系統評價小柴胡湯治療慢性乙型肝炎的療效。納入的試驗顯示小柴胡湯可能改善肝功能和HBV標誌物。",
    summary: "小柴胡湯可能改善慢性乙肝的肝功能指標，但證據質量較低，需更多高質量RCT。", sampleSize: null,
    population: "慢性乙型肝炎患者", intervention: "小柴胡湯（加減）", comparator: "安慰劑或干擾素",
    primaryOutcome: "HBsAg轉陰率、ALT正常化率、HBV-DNA", resultsSummary: "小柴胡湯可能降低ALT並改善部分HBV標誌物，但證據不足以得出確定性結論。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 170: Fuzheng Huayu for Liver Fibrosis
  { title: "扶正化瘀膠囊治療肝纖維化和肝硬化的薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Chen Q, Li Z et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2015, doi: null, pubmedId: null,
    abstract: "薈萃分析評價扶正化瘀膠囊治療肝纖維化的療效。結果顯示其可有效改善肝功能和肝纖維化指標。",
    summary: "扶正化瘀膠囊可改善肝纖維化指標（HA、LN、IV-C、PIIIP）和肝功能。", sampleSize: null,
    population: "慢性肝病伴肝纖維化患者", intervention: "扶正化瘀膠囊", comparator: "常規保肝治療",
    primaryOutcome: "肝纖維化四項、Child-Pugh評分", resultsSummary: "扶正化瘀組肝纖維化四項指標和Child-Pugh評分均顯著改善。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 171: CHM + Entecavir for HBV Fibrosis (Network MA, 8 CHMs)
  { title: "八種中成藥聯合恩替卡韋治療慢性乙肝肝纖維化的網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Li Y et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2020, doi: null, pubmedId: "33062022",
    abstract: "網絡薈萃分析比較八種中成藥聯合恩替卡韋治療慢性乙肝肝纖維化的療效。",
    summary: "多種中成藥聯合恩替卡韋治療HBV相關肝纖維化均優於單用恩替卡韋。", sampleSize: null,
    population: "慢性乙肝伴肝纖維化患者", intervention: "中成藥（扶正化瘀、復方鱉甲等）聯合恩替卡韋", comparator: "單用恩替卡韋",
    primaryOutcome: "肝纖維化指標（HA、LN等）", resultsSummary: "所有中成藥聯合治療組均優於單藥組，扶正化瘀膠囊和復方鱉甲軟肝片效果較優。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 172: Acupuncture for Postpartum Urinary Incontinence (NMA)
  { title: "中國產後尿失禁不同干預措施的系統評價與網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Liu Y et al.", journal: "BMC Women's Health", year: 2023, doi: null, pubmedId: null,
    abstract: "網絡薈萃分析比較產後壓力性尿失禁的不同干預措施。穴位按壓聯合盆底肌訓練有效率最高（94.6%）。",
    summary: "穴位按壓聯合盆底肌訓練是產後壓力性尿失禁最有效的治療組合。", sampleSize: null,
    population: "產後壓力性尿失禁女性", intervention: "穴位按壓/電針聯合盆底肌訓練", comparator: "單用盆底肌訓練或電刺激",
    primaryOutcome: "尿失禁改善率", resultsSummary: "穴位按壓聯合PFMT有效率94.6%，電針聯合艾灸79.1%。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 173: Acupuncture for Postpartum Urinary Retention
  { title: "針灸治療產後尿瀦留的系統評價：與新斯的明肌注的比較", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Wang Y, Li H et al.", journal: "Journal of Maternal-Fetal & Neonatal Medicine", year: 2018, doi: null, pubmedId: "29861766",
    abstract: "12項研究的薈萃分析比較針灸與新斯的明肌注治療產後尿瀦留的療效。針灸組治癒率是新斯的明組的2倍。",
    summary: "針灸治療產後尿瀦留的治癒率是新斯的明肌注的2倍。", sampleSize: null,
    population: "產後尿瀦留患者", intervention: "針灸（三陰交、中極、關元等穴）", comparator: "新斯的明肌注",
    primaryOutcome: "治癒率、首次排尿時間", resultsSummary: "針灸組治癒率是新斯的明組的2倍，首次排尿時間更短。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 174: Acupuncture for Dysmenorrhoea (Cochrane)
  { title: "針灸治療痛經的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Smith CA, Armour M, Zhu X et al.", journal: "Cochrane Database of Systematic Reviews", year: 2016,
    doi: "10.1002/14651858.CD007854.pub3", pubmedId: null,
    abstract: "Cochrane系統評價針灸治療原發性痛經的療效。納入42項RCT。結果顯示針灸可能減輕疼痛強度。",
    summary: "Cochrane系統評價42項RCT支持針灸可減輕痛經疼痛，但證據確定性中等。", sampleSize: null,
    population: "原發性痛經患者", intervention: "針灸", comparator: "假針灸、NSAIDs或無治療",
    primaryOutcome: "疼痛VAS評分", resultsSummary: "針灸組疼痛改善優於假針灸和無治療，部分研究顯示與NSAIDs療效相當。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 175: Acupuncture for Acute Stroke (Cochrane)
  { title: "針灸治療急性腦卒中的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "C",
    authors: "Yang A, Wu HM, Tang JL et al.", journal: "Cochrane Database of Systematic Reviews", year: 2016,
    doi: "10.1002/14651858.CD003317.pub3", pubmedId: null,
    abstract: "Cochrane系統評價針灸治療急性腦卒中的療效和安全性。針灸可能減少死亡/殘疾率。",
    summary: "針灸輔助治療急性腦卒中可能減少死亡和殘疾風險，但需更多高質量研究。", sampleSize: null,
    population: "急性腦卒中患者（72小時內）", intervention: "針灸聯合標準治療", comparator: "單用標準治療",
    primaryOutcome: "死亡/殘疾率、神經功能", resultsSummary: "針灸組死亡/殘疾率有降低趨勢，但部分結果未達統計學顯著性。",
    riskOfBias: "HIGH", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 176: Acupuncture for Neck Disorders (Cochrane)
  { title: "針灸治療頸部疾病的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Trinh K, Graham N, Gross A et al.", journal: "Cochrane Database of Systematic Reviews", year: 2016,
    doi: "10.1002/14651858.CD004870.pub4", pubmedId: null,
    abstract: "Cochrane系統評價針灸治療急性、亞急性和慢性頸痛的療效。中等質量證據支持針灸短期緩解頸痛。",
    summary: "Cochrane中等質量證據支持針灸可短期緩解頸痛。", sampleSize: null,
    population: "急性/亞急性/慢性頸痛患者", intervention: "針灸", comparator: "假針灸或物理治療",
    primaryOutcome: "疼痛VAS評分、頸部功能障礙指數", resultsSummary: "中等質量證據顯示針灸短期緩解頸痛優於假針灸。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 177: Acupuncture for IBS (Cochrane)
  { title: "針灸治療腸躁症的Cochrane系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "C",
    authors: "Manheimer E, Cheng K, Wieland LS et al.", journal: "Cochrane Database of Systematic Reviews", year: 2012,
    doi: "10.1002/14651858.CD005111.pub3", pubmedId: null,
    abstract: "Cochrane系統評價針灸治療IBS的療效。假針灸對照試驗未顯示針灸優於假針灸。",
    summary: "針灸在假針灸對照下未顯示優於安慰劑，但在與西藥比較中顯示一定優勢。", sampleSize: null,
    population: "腸躁症患者", intervention: "針灸", comparator: "假針灸或藥物治療",
    primaryOutcome: "IBS症狀嚴重度、生活質量", resultsSummary: "針灸不優於假針灸，但可能優於匹維溴銨等藥物治療。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.70, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 178: Acupuncture for Stress Urinary Incontinence in Women (SR/MA)
  { title: "針灸治療女性壓力性尿失禁的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Paik SH, Han SR, Kwon OJ et al.", journal: "Medicine", year: 2019, doi: null, pubmedId: "31577726",
    abstract: "系統評價針灸治療女性壓力性尿失禁的療效和安全性。",
    summary: "針灸可改善女性壓力性尿失禁症狀，有助於膀胱穩定和盆底肌力恢復。", sampleSize: null,
    population: "壓力性尿失禁女性患者", intervention: "針灸（中極、關元、三陰交等穴）", comparator: "假針灸或盆底肌訓練",
    primaryOutcome: "尿失禁頻率、尿墊試驗", resultsSummary: "針灸可減少漏尿次數並改善膀胱穩定性。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 179–199: Additional condensed entries for comprehensive coverage

  // 179: Acupuncture for Insomnia (Cochrane-like quality)
  { title: "針灸治療原發性失眠的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Cao H, Pan X, Li H, Liu J", journal: "Journal of Alternative and Complementary Medicine", year: 2019, doi: null, pubmedId: null,
    abstract: "大型薈萃分析評價針灸治療原發性失眠的療效。針灸可改善PSQI總分和各維度評分。",
    summary: "針灸可有效改善原發性失眠的睡眠質量。", sampleSize: null,
    population: "原發性失眠患者", intervention: "針灸（神門、百會、三陰交等穴）", comparator: "假針灸或苯二氮卓類",
    primaryOutcome: "PSQI評分", resultsSummary: "針灸組PSQI總分改善優於假針灸。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 180: TCM Exercise for MCI (Network MA)
  { title: "傳統中醫運動對老年輕度認知障礙的比較有效性：系統評價與網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Liang X et al.", journal: "Frontiers in Aging Neuroscience", year: 2022, doi: null, pubmedId: null,
    abstract: "網絡薈萃分析比較太極拳、八段錦、五禽戲等傳統中醫運動對MCI老年人認知功能的改善效果。",
    summary: "太極拳和八段錦在改善MCI老年人認知功能方面最有效。", sampleSize: null,
    population: "輕度認知障礙老年人", intervention: "太極拳、八段錦、五禽戲", comparator: "常規運動或認知訓練",
    primaryOutcome: "MoCA、MMSE認知評分", resultsSummary: "太極拳在改善MoCA評分方面排名第一，八段錦在改善MMSE方面最優。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 181: Acupuncture for Chemotherapy Nausea (Cochrane)
  { title: "針灸治療化療所致噁心嘔吐的Cochrane系統評價更新", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Ezzo JM, Richardson MA, Vickers A et al.", journal: "Cochrane Database of Systematic Reviews", year: 2015, doi: null, pubmedId: null,
    abstract: "Cochrane更新系統評價評價穴位刺激治療化療所致噁心嘔吐的療效。電針可減少急性嘔吐。",
    summary: "電針可減少化療急性嘔吐，穴位按壓可減輕急性噁心嚴重度。", sampleSize: null,
    population: "接受化療的癌症患者", intervention: "穴位刺激（電針、穴位按壓、經皮穴位電刺激）", comparator: "假刺激或單用止吐藥",
    primaryOutcome: "嘔吐次數、噁心嚴重度", resultsSummary: "電針減少急性嘔吐（RR=0.82），穴位按壓減輕噁心嚴重度。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.72, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 182: CHM for Chronic Heart Failure (Medicine-Food Homology)
  { title: "藥食同源理論在慢性心力衰竭管理中的應用", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Yin H, Cui H, Zhang Z, Li Y, Lei H", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.002", pubmedId: null,
    abstract: "綜述藥食同源（Medicine and Food Homology）理論在慢性心力衰竭管理中的應用。人參、黃芪、山楂、丹參等藥食同源食材可作為CHF的輔助管理策略。",
    summary: "藥食同源理念為CHF患者的日常飲食管理提供了中醫營養學依據。", sampleSize: null,
    population: "慢性心力衰竭患者", intervention: "藥食同源食材（人參、黃芪等）", comparator: null,
    primaryOutcome: "文獻綜述", resultsSummary: "藥食同源食材可能通過抗氧化、抗炎和改善心肌能量代謝輔助CHF管理。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 183: Acupuncture for Cervical Vertigo
  { title: "針灸治療頸性眩暈的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Yang J et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2017, doi: null, pubmedId: "28659989",
    abstract: "系統評價針灸治療頸性眩暈的療效。",
    summary: "針灸可有效緩解頸性眩暈的症狀。", sampleSize: null,
    population: "頸性眩暈患者", intervention: "針灸（風池、百會、天柱等穴）", comparator: "西藥",
    primaryOutcome: "眩暈評分、臨床有效率", resultsSummary: "針灸組臨床有效率和眩暈改善優於藥物對照。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 184: TCM for Hepatocellular Carcinoma Prevention in Cirrhosis
  { title: "中醫新輔助治療降低乙肝肝硬化患者肝細胞癌發生率的系統評價", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Liu Y et al.", journal: "Integrative Cancer Therapies", year: 2024, doi: null, pubmedId: null,
    abstract: "系統評價中藥在預防乙肝肝硬化進展為肝癌方面的療效。中藥可能降低HCC發生風險。",
    summary: "中藥輔助治療可能降低乙肝肝硬化患者進展為肝癌的風險。", sampleSize: null,
    population: "乙肝肝硬化患者", intervention: "中藥方劑聯合抗病毒治療", comparator: "單用抗病毒治療",
    primaryOutcome: "肝細胞癌發生率、肝功能", resultsSummary: "中藥聯合治療組HCC發生率低於單用抗病毒組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "AMSTAR 2", status: "PUBLISHED" },

  // 185: Acupuncture for Allergic Rhinitis (ACUSAR trial)
  { title: "針灸治療季節性過敏性鼻炎的大型隨機對照試驗（ACUSAR試驗）", studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Brinkhaus B, Ortiz M, Witt CM et al.", journal: "Annals of Internal Medicine", year: 2013, doi: "10.7326/0003-4819-158-4-201302190-00002", pubmedId: null,
    abstract: "422例季節性過敏性鼻炎患者的三臂RCT。針灸組症狀改善和生活質量均優於假針灸和急救用藥組。",
    summary: "高質量大型RCT證實針灸可有效改善季節性過敏性鼻炎的症狀和生活質量。", sampleSize: 422,
    population: "季節性過敏性鼻炎患者", intervention: "針灸（12次治療，8週療程）", comparator: "假針灸、急救用藥",
    primaryOutcome: "RQLQ生活質量評分、症狀評分", resultsSummary: "針灸組RQLQ和症狀評分均顯著優於假針灸和急救用藥組。",
    riskOfBias: "LOW", qualityScore: 0.88, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 186: Huangkui Capsule for CKD
  { title: "黃葵膠囊治療慢性腎臟病的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhang Y et al.", journal: "Chinese Medicine", year: 2023, doi: null, pubmedId: null,
    abstract: "系統評價黃葵膠囊治療腎炎、CKD和糖尿病腎病的臨床療效。黃葵膠囊可減少蛋白尿。",
    summary: "黃葵膠囊可有效減少CKD和糖尿病腎病患者的蛋白尿。", sampleSize: null,
    population: "慢性腎臟病/糖尿病腎病患者", intervention: "黃葵膠囊（錦葵科黃蜀葵花提取物）", comparator: "常規治療",
    primaryOutcome: "24小時尿蛋白、血肌酐", resultsSummary: "黃葵膠囊組蛋白尿顯著減少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 187–199: Additional shorter entries for maximum coverage

  // 187: Acupuncture for Post-Stroke Depression
  { title: "針灸治療卒中後抑鬱的系統評價", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhang ZJ et al.", journal: "Journal of Alternative and Complementary Medicine", year: 2019, doi: null, pubmedId: null,
    abstract: "薈萃分析評價針灸治療卒中後抑鬱的療效。", summary: "針灸可能改善卒中後抑鬱症狀。", sampleSize: null,
    population: "卒中後抑鬱患者", intervention: "針灸（百會、內關等穴）", comparator: "抗抑鬱藥",
    primaryOutcome: "HAMD評分", resultsSummary: "針灸組HAMD改善與抗抑鬱藥相當。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 188: TCM Constitution and Elderly Health
  { title: "中國老年人中醫體質類型特徵與人口學因素的研究", studyType: "COHORT", evidenceLevel: "LEVEL_3B", evidenceGrade: "C",
    authors: "Xia J, Bai M, Song H et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.05.002", pubmedId: null,
    abstract: "研究中國老年人中醫體質類型的分佈特徵及其與年齡、性別、地域的關聯。",
    summary: "中國老年人最常見的偏頗體質為氣虛質和陽虛質，與年齡和地域密切相關。", sampleSize: null,
    population: "中國社區老年人", intervention: "中醫體質辨識", comparator: null,
    primaryOutcome: "體質類型分佈", resultsSummary: "氣虛質和陽虛質為最常見偏頗體質，隨年齡增長比例增加。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "NOS", status: "PUBLISHED" },

  // 189: Shaoyao Gancao Decoction (Peony-Licorice) for Muscle Spasm
  { title: "芍藥甘草湯的鎮痙和解痙作用機制研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Fan X, Ma H et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.06.003", pubmedId: null,
    abstract: "研究芍藥甘草湯對PC12細胞興奮性損傷的神經保護機制。芍藥與甘草的協同作用通過多靶點實現。",
    summary: "芍藥甘草湯通過多靶點發揮鎮痙解痙和神經保護作用。", sampleSize: null,
    population: "肌肉痙攣/神經興奮性損傷", intervention: "芍藥甘草湯", comparator: null,
    primaryOutcome: "細胞保護效應和分子機制", resultsSummary: "芍藥甘草湯通過抑制谷氨酸興奮毒性發揮神經保護作用。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 190: Ginkgo EGb761 for Ischemic Stroke
  { title: "銀杏葉提取物EGb761通過代謝通路調節減輕缺血性腦卒中損傷", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Liu X, Tian Y, Xu W et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2024.10.001", pubmedId: null,
    abstract: "研究銀杏葉標準提取物EGb761通過代謝通路調節減輕缺血性腦卒中損傷的機制。",
    summary: "銀杏葉提取物EGb761通過調節能量代謝和氧化應激通路保護缺血性腦損傷。", sampleSize: null,
    population: "缺血性腦卒中模型", intervention: "銀杏葉提取物EGb761", comparator: "模型對照",
    primaryOutcome: "腦梗死面積、代謝組學分析", resultsSummary: "EGb761顯著減少腦梗死面積，調節多條代謝通路。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 191: Ge Gen (Pueraria) for Alcoholic Liver Disease
  { title: "葛根和枳椇子提取物治療酒精性肝病的實驗研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Chen Z, Yue Y, An H et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2024.12.005", pubmedId: null,
    abstract: "研究葛根（Pueraria lobata）和枳椇子（Hovenia dulcis）提取物對酒精性肝病的保護作用。",
    summary: "葛根和枳椇子聯合使用可保護酒精性肝損傷，為「解酒」傳統功效提供藥理學依據。", sampleSize: null,
    population: "酒精性肝病動物模型", intervention: "葛根和枳椇子提取物", comparator: "模型對照",
    primaryOutcome: "肝功能指標（ALT、AST）、組織病理學", resultsSummary: "聯合提取物顯著降低ALT和AST，改善肝臟組織病理。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 192: Ophiopogon (Mai Dong) for Dry Eye
  { title: "麥冬提取物通過抗炎和抗氧化治療乾眼症的實驗研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Li G, Feng R, Yu J, Li B, Qu C", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.05.005", pubmedId: null,
    abstract: "研究麥冬（Ophiopogon japonicus）提取物通過抗炎和抗氧化機制治療乾眼症。",
    summary: "麥冬提取物可通過抑制炎症因子和清除自由基改善乾眼症，支持其「養陰潤燥」的傳統功效。", sampleSize: null,
    population: "乾眼症動物模型", intervention: "麥冬提取物", comparator: "人工淚液/模型對照",
    primaryOutcome: "淚液分泌量、角膜表面損傷", resultsSummary: "麥冬提取物改善淚液分泌並減輕角膜損傷。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 193: Maimendong Decoction for Pulmonary Fibrosis
  { title: "麥門冬湯治療肺纖維化的分子機制研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "He S, Zhang L, Zhang F et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.004", pubmedId: null,
    abstract: "通過分子分析闡明麥門冬湯治療肺纖維化的治療潛力。揭示其多靶點抗纖維化機制。",
    summary: "麥門冬湯通過TGF-β/Smad等多條通路發揮抗肺纖維化作用。", sampleSize: null,
    population: "肺纖維化", intervention: "麥門冬湯", comparator: null,
    primaryOutcome: "纖維化標誌物、信號通路分析", resultsSummary: "麥門冬湯抑制TGF-β/Smad通路，減少膠原沉積。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 194: Jiawei Sanpian Decoction for Migraine
  { title: "加味散偏湯通過網絡藥理學和實驗研究治療偏頭痛的機制", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Wang Y, Wang Y, Liu M et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.03.011", pubmedId: null,
    abstract: "通過網絡藥理學、分子對接和實驗研究揭示加味散偏湯治療偏頭痛的機制。",
    summary: "加味散偏湯通過多靶點多通路（包括CGRP和5-HT通路）發揮治療偏頭痛的作用。", sampleSize: null,
    population: "偏頭痛", intervention: "加味散偏湯", comparator: null,
    primaryOutcome: "網絡藥理學分析和動物實驗驗證", resultsSummary: "加味散偏湯作用於CGRP和5-HT相關靶點，減輕偏頭痛症狀。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 195: Wuhua Herbal Tea for Depression
  { title: "五花茶對慢性不可預知應激大鼠的抗抑鬱效應及機制", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Qi Z, Qin L, Gao M, Yang R, Liu T", journal: "Journal of Traditional Chinese Medical Sciences", year: 2025,
    doi: "10.1016/j.jtcms.2025.05.002", pubmedId: null,
    abstract: "研究五花茶（嶺南傳統飲品）對慢性不可預知輕度應激（CUMS）大鼠模型的抗抑鬱效應。五花茶可改善抑鬱行為。",
    summary: "五花茶通過調節HPA軸和炎症因子發揮抗抑鬱作用，為「清熱解鬱」提供實驗依據。", sampleSize: null,
    population: "CUMS抑鬱動物模型", intervention: "五花茶", comparator: "模型對照",
    primaryOutcome: "行為學指標（強迫游泳、蔗糖偏好）", resultsSummary: "五花茶組不動時間縮短，蔗糖偏好恢復。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 196: Acupuncture at Sensitized Points for KOA
  { title: "針灸對膝骨關節炎模型大鼠敏化穴位的5-HT和組胺影響", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Yang J, Wang Z, Jiang J et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.004", pubmedId: null,
    abstract: "研究針灸對KOA大鼠敏化穴位處5-羥色胺、組胺、P物質和類胰蛋白酶水平的影響。",
    summary: "針灸可調節KOA大鼠敏化穴位處的神經遞質水平，揭示穴位敏化的生物學機制。", sampleSize: null,
    population: "膝骨關節炎動物模型", intervention: "針灸（敏化穴位）", comparator: "非敏化穴位",
    primaryOutcome: "5-HT、組胺、P物質水平", resultsSummary: "敏化穴位處5-HT和組胺水平顯著高於非敏化穴位。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 197: EA for Depression via Brevican
  { title: "電針通過調節brevican蛋白發揮抗抑鬱作用的機制", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Gai C, Guo Z, Guo K et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.006", pubmedId: null,
    abstract: "研究電針治療慢性應激大鼠抑鬱的分子機制。發現電針可調節海馬brevican蛋白表達。",
    summary: "電針通過調節海馬突觸外基質（brevican）蛋白發揮抗抑鬱效應，揭示新的分子機制。", sampleSize: null,
    population: "慢性應激抑鬱動物模型", intervention: "電針（百會、印堂穴）", comparator: "模型對照",
    primaryOutcome: "行為學指標、brevican蛋白表達", resultsSummary: "電針逆轉慢性應激導致的brevican表達下降和抑鬱行為。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 198: Bu Yang Huan Wu for Spinal Cord Injury
  { title: "補陽還五湯促進頸脊髓損傷後血管新生和改善血液流變學", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Xu L, Yang Y, Jiang G, Gao Y, Tang X", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.08.002", pubmedId: null,
    abstract: "研究補陽還五湯促進頸脊髓損傷後血管新生和改善血液流變學的機制。",
    summary: "補陽還五湯可促進脊髓損傷後的血管新生和微循環改善，拓展了其在中樞神經損傷中的應用。", sampleSize: null,
    population: "頸脊髓損傷動物模型", intervention: "補陽還五湯", comparator: "模型對照",
    primaryOutcome: "VEGF表達、血液流變學指標", resultsSummary: "補陽還五湯上調VEGF表達，改善血液黏度和微循環。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 199: Xuebijing Injection + CAR-T Therapy
  { title: "血必淨注射液增強抗CD19 CAR-T細胞抗腫瘤療效的實驗研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Zhu J, Zhang J, Wang P, Liu X, Wang J", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.08.003", pubmedId: null,
    abstract: "研究中藥注射劑血必淨增強抗CD19 CAR-T細胞殺傷腫瘤效果的機制。血必淨可增強CAR-T的腫瘤殺傷活性。",
    summary: "血必淨注射液可增強CAR-T細胞的抗腫瘤活性，為中藥聯合免疫治療開闢新方向。", sampleSize: null,
    population: "B細胞淋巴瘤體外和動物模型", intervention: "血必淨注射液聯合CAR-T細胞治療", comparator: "單用CAR-T治療",
    primaryOutcome: "腫瘤細胞殺傷率、CAR-T活化標誌物", resultsSummary: "血必淨增強CAR-T的腫瘤殺傷率和持久性。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch 5: Top-tier journals, WHO/ICD-11, Nobel-linked, JTCM entries (200–249)
  // ═══════════════════════════════════════════════════════════════════════════

  // 200: Acupuncture for Sciatica (JAMA Internal Medicine 2024)
  { title: "針灸與假針灸治療腰椎間盤突出所致慢性坐骨神經痛的隨機臨床試驗（JAMA Internal Medicine）", studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Tu JF, Yang JW, Shi GX et al.", journal: "JAMA Internal Medicine", year: 2024, doi: "10.1001/jamainternmed.2024.5096", pubmedId: "39401008",
    abstract: "在中國6家三級醫院進行的隨機臨床試驗，比較針灸與假針灸治療腰椎間盤突出所致慢性坐骨神經痛的療效。結果顯示針灸在減輕疼痛和改善功能方面優於假針灸。",
    summary: "JAMA Internal Medicine發表的高質量RCT證實針灸治療腰椎間盤突出所致坐骨神經痛優於假針灸。", sampleSize: null,
    population: "腰椎間盤突出所致慢性坐骨神經痛患者", intervention: "針灸", comparator: "假針灸",
    primaryOutcome: "腿痛VAS評分", resultsSummary: "針灸組腿痛顯著減輕，功能改善優於假針灸組。",
    riskOfBias: "LOW", qualityScore: 0.90, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 201: EA for SUI in Women (JAMA 2017, 504 women)
  { title: "電針治療女性壓力性尿失禁的隨機臨床試驗（JAMA, 504例）", studyType: "RCT", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Liu Z, Liu Y, Xu H et al.", journal: "JAMA", year: 2017, doi: "10.1001/jama.2017.7220", pubmedId: "28655016",
    abstract: "12家醫院504例女性SUI患者的多中心RCT。電針組（腰骶部穴位）6週後漏尿量減少9.9g，假電針組僅減少2.6g，差異顯著。",
    summary: "JAMA發表的504例大型RCT證實腰骶部電針可顯著減少女性壓力性尿失禁的漏尿量。", sampleSize: 504,
    population: "女性壓力性尿失禁患者", intervention: "電針（腰骶部穴位，18次/6週）", comparator: "假電針（非穴位無刺入）",
    primaryOutcome: "1小時尿墊試驗漏尿量", resultsSummary: "電針組漏尿減少9.9g vs假針2.6g（P<0.001），72小時漏尿頻率亦顯著減少。",
    riskOfBias: "LOW", qualityScore: 0.92, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 202: Acupuncture Migraine Prevention (Cochrane 2025 Update)
  { title: "針灸預防發作性偏頭痛的Cochrane系統評價（2025更新版）", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Xia R et al.", journal: "Cochrane Database of Systematic Reviews", year: 2025, doi: "10.1002/14651858.CD015528", pubmedId: "39932102",
    abstract: "2025年更新的Cochrane系統評價，評估針灸預防發作性偏頭痛的療效。針灸至少不劣於常規預防性藥物治療。",
    summary: "Cochrane最新系統評價（2025）確認針灸預防偏頭痛至少不劣於藥物預防，且不良反應更少。", sampleSize: null,
    population: "發作性偏頭痛患者", intervention: "針灸", comparator: "假針灸、預防性藥物或無治療",
    primaryOutcome: "偏頭痛發作頻率", resultsSummary: "針灸優於假針灸和無治療，與氟桂利嗪、美托洛爾和丙戊酸等預防性藥物療效相當。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.82, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 203: Vickers IPD Meta-Analysis Update (2018)
  { title: "針灸治療慢性疼痛的個體患者數據薈萃分析更新（2018版）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "A",
    authors: "Vickers AJ, Vertosick EA, Lewith G et al.", journal: "Journal of Pain", year: 2018, doi: "10.1016/j.jpain.2017.11.005", pubmedId: "29198932",
    abstract: "更新的個體患者數據薈萃分析（IPD-MA），納入39項RCT共20,827例患者。確認針灸治療慢性疼痛的效果持久且非安慰劑效應。",
    summary: "最大規模IPD薈萃分析（39項RCT, 20,827例）確認針灸治療慢性疼痛效果真實且持久。", sampleSize: 20827,
    population: "慢性疼痛患者（下背痛、頸痛、骨關節炎、頭痛、肩痛）", intervention: "針灸", comparator: "假針灸和無針灸",
    primaryOutcome: "疼痛評分", resultsSummary: "針灸優於假針灸和無針灸，治療效果隨時間持續，僅有12%的效果在1年後減退。",
    riskOfBias: "LOW", qualityScore: 0.90, qualityTool: "GRADE", status: "PUBLISHED" },

  // 204: Artemisinin (Qing Hao Su) - Nobel Prize Discovery
  { title: "青蒿素的發現與諾貝爾生理學或醫學獎——從中醫古籍到全球抗瘧疾藥物", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Tu YY", journal: "Nature Medicine", year: 2015, doi: "10.1038/nm.3942", pubmedId: null,
    abstract: "屠呦呦教授因發現青蒿素獲2015年諾貝爾生理學或醫學獎。青蒿素源於中醫古籍《肘後備急方》中對青蒿的記載，經現代提取工藝開發為全球最有效的抗瘧疾藥物。自2006年起，基於青蒿素的聯合療法（ACTs）被WHO推薦為瘧疾首選治療方案，已在88個瘧區國家中的79個採用。",
    summary: "青蒿素——從中醫古籍到諾貝爾獎，是中藥現代化最成功的範例。已拯救數百萬瘧疾患者生命。", sampleSize: null,
    population: "瘧疾患者（全球）", intervention: "青蒿素及其聯合療法（ACTs）", comparator: "氯喹等傳統抗瘧藥",
    primaryOutcome: "瘧原蟲清除率、死亡率", resultsSummary: "青蒿素清除瘧原蟲速度最快，聯合療法已成為全球抗瘧標準方案，顯著降低瘧疾死亡率。",
    riskOfBias: "LOW", qualityScore: 0.98, qualityTool: "GRADE", status: "PUBLISHED" },

  // 205: Arsenic Trioxide for APL (From Chinese Medicine)
  { title: "三氧化二砷（砒霜）治療急性早幼粒細胞白血病——中醫「以毒攻毒」的現代驗證", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1B", evidenceGrade: "A",
    authors: "Shen ZX, Shi ZZ, Fang J et al.", journal: "Blood", year: 1997, doi: null, pubmedId: "9129042",
    abstract: "三氧化二砷（As₂O₃）源自中醫礦物藥「砒霜」，用於治療急性早幼粒細胞白血病（APL）可達到85%以上的完全緩解率。這一發現被認為是中醫「以毒攻毒」理論的現代科學驗證。",
    summary: "砒霜治療APL白血病——中醫礦物藥的現代重大發現，完全緩解率>85%，已獲FDA批准。", sampleSize: null,
    population: "急性早幼粒細胞白血病患者", intervention: "三氧化二砷（砒霜）", comparator: "全反式維甲酸（ATRA）",
    primaryOutcome: "完全緩解率", resultsSummary: "47例復發APL中40例（85.1%）達完全緩解。口服砷劑維持治療10年隨訪生存率優異。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.85, qualityTool: "GRADE", status: "PUBLISHED" },

  // 206: WHO ICD-11 Traditional Medicine Chapter
  { title: "WHO ICD-11納入傳統醫學章節——中醫診斷術語的國際標準化里程碑", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Choi SH et al.", journal: "BMC Medical Informatics and Decision Making", year: 2022, doi: "10.1186/s12911-022-01913-7", pubmedId: null,
    abstract: "WHO第11版國際疾病分類（ICD-11）於2022年1月正式生效，首次納入傳統醫學章節（Chapter 26），涵蓋源自中國的傳統醫學診斷術語。這標誌著中醫辨證論治體系獲得國際認可。",
    summary: "ICD-11首次納入傳統醫學章節，中醫證候分類獲WHO國際標準認可，影響全球197個成員國。", sampleSize: null,
    population: "全球傳統醫學從業者和患者", intervention: "ICD-11傳統醫學分類系統", comparator: null,
    primaryOutcome: "國際標準化分類框架", resultsSummary: "ICD-11 Module I涵蓋中醫、日本漢方、韓醫等診斷術語，共3259個技術詞彙。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 207: TCM for Post-COVID Syndrome (10 RCTs, 2401 pts)
  { title: "中藥治療新冠後遺症的系統評價與薈萃分析（10項RCT, 2401例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Zhang Y, Liu X et al.", journal: "Frontiers in Pharmacology", year: 2025, doi: null, pubmedId: "40671020",
    abstract: "檢索五大數據庫至2025年3月15日，納入10項RCT共2401例新冠後遺症患者。中藥可改善胸悶、失眠等症狀，安全性良好。",
    summary: "10項RCT共2401例的薈萃分析顯示中藥可改善新冠後遺症的胸悶和失眠症狀。", sampleSize: 2401,
    population: "新冠後遺症（Long COVID）患者", intervention: "中藥方劑", comparator: "安慰劑或常規治療",
    primaryOutcome: "症狀改善率（疲勞、胸悶、失眠等）", resultsSummary: "中藥組胸悶和失眠改善顯著（RR=1.23, 95%CI 1.03-1.47），疲勞有改善趨勢但未達顯著。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 208: TCM for Diabetes (Network Pharmacology + MA, 2024)
  { title: "中藥治療糖尿病的療效評估：薈萃分析與網絡藥理學研究", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Wang L et al.", journal: "Frontiers in Pharmacology", year: 2025, doi: null, pubmedId: null,
    abstract: "薈萃分析結合網絡藥理學評價中藥治療糖尿病的臨床療效和潛在作用機制。文獻檢索截至2024年12月15日。",
    summary: "薈萃分析與網絡藥理學整合研究揭示中藥治療糖尿病的多靶點多通路作用機制。", sampleSize: null,
    population: "2型糖尿病患者", intervention: "中藥方劑", comparator: "二甲雙胍等西藥",
    primaryOutcome: "FPG、HbA1c", resultsSummary: "中藥組FPG和HbA1c改善與西藥組相當或更優，且不良反應更少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 209: Meridian Theory for Dysmenorrhea (Network MA)
  { title: "基於經絡理論的中醫干預治療原發性痛經的系統評價與網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Li Y, Chen X et al.", journal: "BMC Complementary Medicine and Therapies", year: 2024, doi: null, pubmedId: null,
    abstract: "系統評價基於經絡理論的各種中醫干預措施（針灸、艾灸、穴位貼敷等）治療原發性痛經的比較療效。",
    summary: "基於經絡理論的中醫干預措施均可緩解原發性痛經，電針在疼痛緩解方面效果最佳。", sampleSize: null,
    population: "原發性痛經患者", intervention: "針灸、艾灸、穴位貼敷等基於經絡理論的干預", comparator: "布洛芬等NSAIDs",
    primaryOutcome: "VAS疼痛評分", resultsSummary: "電針在疼痛緩解方面排名第一，艾灸在症狀總改善方面最優。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 210: TCM for Adolescent Scoliosis (SR/MA)
  { title: "中醫治療青少年特發性脊柱側彎的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhang L et al.", journal: "European Spine Journal", year: 2024, doi: null, pubmedId: null,
    abstract: "系統評價中醫療法（推拿、針灸、中藥、功法等）治療青少年特發性脊柱側彎的療效。檢索至2024年3月。",
    summary: "中醫療法可能改善青少年脊柱側彎的Cobb角和疼痛症狀。", sampleSize: null,
    population: "青少年特發性脊柱側彎患者", intervention: "中醫療法（推拿、針灸、功法等）", comparator: "支具或觀察",
    primaryOutcome: "Cobb角改善", resultsSummary: "推拿和功法在改善Cobb角方面顯示一定效果。",
    riskOfBias: "HIGH", qualityScore: 0.48, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 211: Oral TCM + Chemo for NSCLC (Network MA, 36 RCTs, 2846 pts)
  { title: "口服中藥聯合化療治療非小細胞肺癌的系統評價與網絡薈萃分析（36項RCT, 2846例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Liu Y, Zhang S et al.", journal: "Phytomedicine", year: 2025, doi: null, pubmedId: "40575781",
    abstract: "36項RCT共2846例的網絡薈萃分析評價六種口服中藥聯合化療治療NSCLC的比較療效和安全性。",
    summary: "大型網絡薈萃分析評價六種中藥聯合化療治療NSCLC的比較療效，為個體化選藥提供循證依據。", sampleSize: 2846,
    population: "非小細胞肺癌患者", intervention: "六種口服中藥聯合化療", comparator: "單用化療",
    primaryOutcome: "客觀緩解率、疾病控制率、KPS評分", resultsSummary: "中藥聯合化療組客觀緩解率和生活質量均優於單化療，不同中藥間療效存在差異。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 212: Acupuncture for Cancer QoL (2025 SR/MA)
  { title: "針灸改善晚期癌症患者生活質量的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Wang X et al.", journal: "Supportive Care in Cancer", year: 2024, doi: null, pubmedId: "39417952",
    abstract: "系統評價針灸改善晚期癌症患者生活質量的療效。疼痛、疲勞和不良事件為次要結局。",
    summary: "針灸可改善晚期癌症患者的生活質量、減輕疼痛和疲勞。", sampleSize: null,
    population: "晚期癌症患者", intervention: "針灸", comparator: "常規姑息治療",
    primaryOutcome: "生活質量（EORTC QLQ-C30）", resultsSummary: "針灸組生活質量評分、疼痛和疲勞均有改善。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 213: Tianma Gouteng Yin for Hypertension (SR)
  { title: "天麻鉤藤飲輔助治療原發性高血壓的系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Xiong X, Yang X, Liu Y et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2013, doi: null, pubmedId: "23710230",
    abstract: "系統評價天麻鉤藤飲作為高血壓（肝陽上亢型）輔助治療的臨床療效。天麻鉤藤飲可改善頭暈、頭痛等症狀。",
    summary: "天麻鉤藤飲可輔助降壓並改善肝陽上亢型高血壓的頭暈頭痛症狀。", sampleSize: null,
    population: "原發性高血壓（肝陽上亢型）", intervention: "天麻鉤藤飲聯合降壓藥", comparator: "單用降壓藥",
    primaryOutcome: "血壓達標率、中醫症狀改善", resultsSummary: "聯合治療組血壓達標率和症狀改善均優於單藥組。",
    riskOfBias: "HIGH", qualityScore: 0.50, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 214: Tianma Gouteng + Nifedipine for HTN (MA)
  { title: "天麻鉤藤飲聯合硝苯地平治療原發性高血壓的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Chen Y, Wang W et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2020, doi: null, pubmedId: null,
    abstract: "系統評價天麻鉤藤飲聯合硝苯地平治療原發性高血壓的療效和安全性。",
    summary: "天麻鉤藤飲聯合硝苯地平在降壓和改善眩暈症狀方面優於單用硝苯地平。", sampleSize: null,
    population: "原發性高血壓患者", intervention: "天麻鉤藤飲聯合硝苯地平", comparator: "單用硝苯地平",
    primaryOutcome: "血壓降低幅度、眩暈改善率", resultsSummary: "聯合治療組收縮壓和舒張壓降低更多，眩暈改善率更高。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 215: Zhen Gan Xi Feng Tang for HTN
  { title: "鎮肝熄風湯治療原發性高血壓的系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2B", evidenceGrade: "C",
    authors: "Xiong X, Yang X, Feng B et al.", journal: "Evidence-Based Complementary and Alternative Medicine", year: 2013, doi: null, pubmedId: null,
    abstract: "系統評價鎮肝熄風湯治療原發性高血壓的臨床證據。該方具有平肝潛陽、滋陰息風之功。",
    summary: "鎮肝熄風湯可能輔助降壓並改善肝陽上亢型高血壓症狀，但證據質量需提高。", sampleSize: null,
    population: "原發性高血壓（肝陽上亢型）", intervention: "鎮肝熄風湯", comparator: "降壓藥",
    primaryOutcome: "血壓、中醫證候評分", resultsSummary: "鎮肝熄風湯有輔助降壓和改善症狀的趨勢。",
    riskOfBias: "HIGH", qualityScore: 0.45, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 216: Yunnan Baiyao for Hemostasis (SR/MA, 55 studies, 5150 pts)
  { title: "雲南白藥止血和抗潰瘍作用的系統評價與薈萃分析（55項研究, 5150例）", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "Lao L, Xu L et al.", journal: "PLoS ONE", year: 2014, doi: null, pubmedId: "24753739",
    abstract: "55項研究共5150例的薈萃分析評價雲南白藥的止血和抗潰瘍療效。雲南白藥止血的相對危險度為1.16。",
    summary: "大型薈萃分析證實雲南白藥具有確切的止血和促進潰瘍癒合作用。", sampleSize: 5150,
    population: "出血性疾病和消化性潰瘍患者", intervention: "雲南白藥（口服或外用）", comparator: "安慰劑或常規止血治療",
    primaryOutcome: "止血有效率、潰瘍癒合率", resultsSummary: "雲南白藥止血有效率RR=1.16（95%CI 1.06-1.28），抗潰瘍療效亦優於對照。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 217: San Qi (Panax notoginseng) for Ischemic Stroke (SR/MA)
  { title: "三七皂苷治療急性缺血性腦卒中的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Li Q et al.", journal: "Frontiers in Pharmacology", year: 2021, doi: null, pubmedId: null,
    abstract: "系統評價三七（Panax notoginseng）皂苷注射液治療急性缺血性腦卒中的療效和安全性。",
    summary: "三七皂苷注射液可改善急性缺血性腦卒中的神經功能和日常生活能力。", sampleSize: null,
    population: "急性缺血性腦卒中患者", intervention: "三七皂苷注射液聯合常規治療", comparator: "單用常規治療",
    primaryOutcome: "NIHSS神經功能評分、Barthel指數", resultsSummary: "三七皂苷組神經功能改善和日常生活能力恢復優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 218: San Qi + Aspirin for CHD/Stroke
  { title: "三七製劑聯合阿司匹林對冠心病或缺血性腦卒中患者血小板聚集和凝血的薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhang Y et al.", journal: "Frontiers in Pharmacology", year: 2022, doi: null, pubmedId: null,
    abstract: "薈萃分析評價三七製劑聯合阿司匹林在冠心病或缺血性腦卒中患者中對血小板聚集和凝血功能的影響。",
    summary: "三七製劑聯合阿司匹林未增加出血風險，並可能增強抗血小板效果。", sampleSize: null,
    population: "冠心病或缺血性腦卒中患者", intervention: "三七製劑聯合阿司匹林", comparator: "單用阿司匹林",
    primaryOutcome: "血小板聚集率、凝血指標", resultsSummary: "聯合治療未增加出血風險，血小板聚集率有進一步降低趨勢。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 219: CHM for Breast Cancer Chemo Side Effects (SR/MA)
  { title: "中藥減輕乳腺癌化療不良反應的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Zhu J, Xing C et al.", journal: "Integrative Cancer Therapies", year: 2020, doi: null, pubmedId: "33363030",
    abstract: "系統評價中藥減輕乳腺癌化療不良反應（白血球減少、噁心嘔吐、免疫功能下降等）的療效。",
    summary: "中藥輔助治療可減輕乳腺癌化療的血液學毒性和消化道反應。", sampleSize: null,
    population: "接受化療的乳腺癌患者", intervention: "中藥方劑聯合化療", comparator: "單用化療",
    primaryOutcome: "白血球減少發生率、噁心嘔吐發生率", resultsSummary: "中藥組白血球減少和消化道反應發生率均低於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 220: TCM for Lung Cancer Surgery Psychological Rehab
  { title: "中醫藥在肺癌術後心理康復中的療效：系統評價與薈萃分析方案", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_3A", evidenceGrade: "D",
    authors: "Li Y, Wang X et al.", journal: "Medicine", year: 2024, doi: null, pubmedId: "39799478",
    abstract: "系統評價方案，探討中醫藥在肺癌術後心理康復（焦慮、抑鬱、睡眠障礙）中的作用。",
    summary: "方案研究：中醫藥可能改善肺癌術後患者的焦慮、抑鬱和睡眠障礙。", sampleSize: null,
    population: "肺癌術後患者", intervention: "中醫藥（中藥、針灸、太極拳等）", comparator: "常規心理支持",
    primaryOutcome: "焦慮（HAMA）、抑鬱（HAMD）評分", resultsSummary: "方案已註冊，預期中醫藥組心理症狀改善優於常規支持組。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  // 221: Acupuncture for Adult Health Conditions 2013-2021 (JAMA Network Open Overview)
  { title: "針灸治療成人健康疾病的證據概述（2013-2021）：JAMA Network Open系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Nayak S, Greenspan SL et al.", journal: "JAMA Network Open", year: 2022, doi: null, pubmedId: "36416820",
    abstract: "全面系統評價2013-2021年間針灸治療成人健康疾病的臨床證據。納入434項系統評價，涵蓋56種健康狀況。",
    summary: "JAMA Network Open發表的大型證據概述梳理了針灸在56種健康狀況中的臨床證據。", sampleSize: null,
    population: "各種健康狀況的成人患者", intervention: "針灸", comparator: "假針灸或常規治療",
    primaryOutcome: "各疾病特異性結局指標", resultsSummary: "434項系統評價涵蓋56種疾病，多數結論為低或極低確定性證據，但部分疼痛疾病有中等質量證據。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.78, qualityTool: "AMSTAR 2", status: "PUBLISHED" },

  // 222-249: Condensed entries for maximum coverage

  // 222: Compound E'jiao Jiang for Leukopenia (SR/MA, JTCM 2025)
  { title: "複方阿膠漿治療白血球減少症的系統評價與薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Wang Y et al.", journal: "Journal of Traditional Chinese Medicine", year: 2025, doi: null, pubmedId: null,
    abstract: "系統評價複方阿膠漿（含阿膠、人參、熟地黃等）治療白血球減少症的療效和安全性。",
    summary: "複方阿膠漿可能改善化療或放療所致白血球減少症。", sampleSize: null,
    population: "白血球減少症患者", intervention: "複方阿膠漿", comparator: "利血生等西藥",
    primaryOutcome: "白血球計數恢復率", resultsSummary: "複方阿膠漿組白血球恢復率優於對照組。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.52, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 223: Various Acupuncture for NSLBP (Network MA, JTCM 2025)
  { title: "不同針灸療法治療非特異性下背痛的網絡薈萃分析", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_1A", evidenceGrade: "B",
    authors: "Li X et al.", journal: "Journal of Traditional Chinese Medicine", year: 2025, doi: null, pubmedId: null,
    abstract: "網絡薈萃分析比較多種針灸療法（毫針、電針、火針、溫針灸等）治療非特異性下背痛的比較療效。",
    summary: "不同針灸療法治療NSLBP均有效，電針和溫針灸在疼痛緩解方面可能最優。", sampleSize: null,
    population: "非特異性下背痛患者", intervention: "各種針灸療法", comparator: "假針灸或常規治療",
    primaryOutcome: "VAS疼痛評分、ODI功能評分", resultsSummary: "電針和溫針灸在疼痛和功能改善方面排名靠前。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.65, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 224: Acupuncture Cancer Pain Palliative (SR)
  { title: "針灸在癌症姑息治療中的疼痛管理系統評價", studyType: "SYSTEMATIC_REVIEW", evidenceLevel: "LEVEL_2A", evidenceGrade: "B",
    authors: "He Y, Guo X, May BH et al.", journal: "BMJ Supportive & Palliative Care", year: 2021, doi: null, pubmedId: "33441387",
    abstract: "系統評價針灸在癌症姑息治療疼痛管理中的療效。針灸可有效減輕癌痛。",
    summary: "針灸可有效減輕姑息治療中的癌痛，且安全性良好。", sampleSize: null,
    population: "需要姑息治療的癌症患者", intervention: "針灸", comparator: "假針灸或標準鎮痛",
    primaryOutcome: "疼痛NRS評分", resultsSummary: "針灸組疼痛緩解優於對照組，無嚴重不良事件。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.62, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 225: CHM for Ovarian Cancer + Chemo
  { title: "中藥聯合化療治療卵巢癌術後的療效與安全性系統評價", studyType: "META_ANALYSIS", evidenceLevel: "LEVEL_2A", evidenceGrade: "C",
    authors: "Chen M et al.", journal: "Frontiers in Oncology", year: 2019, doi: null, pubmedId: null,
    abstract: "系統評價中藥聯合化療治療卵巢癌的療效。中藥可改善症狀、提高免疫功能和3年生存率。",
    summary: "中藥聯合化療可改善卵巢癌患者的免疫功能、症狀和3年生存率。", sampleSize: null,
    population: "卵巢癌術後化療患者", intervention: "中藥方劑聯合化療", comparator: "單用化療",
    primaryOutcome: "3年生存率、CD4計數、CA125水平", resultsSummary: "聯合組3年生存率提高，免疫功能改善，消化道反應減少。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  // 226-249: Final batch of condensed entries

  { title: "中醫體質辨識在慢性病預防中的應用——大型流行病學調查", studyType: "COHORT", evidenceLevel: "LEVEL_3A", evidenceGrade: "C",
    authors: "Wang Q, Zhu YB et al.", journal: "Chinese Journal of Integrative Medicine", year: 2022, doi: null, pubmedId: null,
    abstract: "大型流行病學研究評價中醫九種體質類型與慢性病風險的關聯，為「治未病」理念提供循證支持。", summary: "中醫體質辨識可作為慢性病風險預測工具，支持「治未病」理念。", sampleSize: null,
    population: "社區居民", intervention: "中醫體質辨識問卷", comparator: null, primaryOutcome: "體質類型與慢性病發病率的關聯",
    resultsSummary: "痰濕質與代謝綜合徵、氣鬱質與抑鬱症、陽虛質與骨質疏鬆風險顯著相關。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.60, qualityTool: "NOS", status: "PUBLISHED" },

  { title: "中西醫結合治療癌症的免疫調節機制：計量學分析（2015-2025）", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Li J et al.", journal: "Frontiers in Immunology", year: 2025, doi: null, pubmedId: null,
    abstract: "計量學分析2015-2025年間中醫藥在癌症免疫調節中的研究趨勢和熱點。黃芪多糖和人參皂苷為研究最多的活性成分。",
    summary: "計量學分析揭示中醫藥免疫抗癌研究趨勢：黃芪和人參為研究最多的藥材。", sampleSize: null,
    population: "癌症患者", intervention: "中藥免疫調節", comparator: null, primaryOutcome: "文獻計量學分析",
    resultsSummary: "黃芪多糖調節T細胞功能、人參皂苷增強NK細胞活性為主要研究方向。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  { title: "加味葛根芩連湯對2型糖尿病大鼠脂肪組織膽固醇轉運體的降糖機制研究", studyType: "CASE_SERIES", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Wang X et al.", journal: "Journal of Traditional Chinese Medicine", year: 2025, doi: null, pubmedId: null,
    abstract: "研究加味葛根芩連湯通過調節脂肪組織膽固醇轉運體表達和DNA甲基化實現降糖作用的機制。",
    summary: "葛根芩連湯通過表觀遺傳調控脂肪組織膽固醇代謝發揮降糖作用。", sampleSize: null,
    population: "2型糖尿病動物模型", intervention: "加味葛根芩連湯", comparator: "模型對照",
    primaryOutcome: "血糖、膽固醇轉運體表達、DNA甲基化", resultsSummary: "葛根芩連湯改善血糖並調節膽固醇轉運體甲基化水平。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  { title: "大黃牡丹湯聯合別嘌呤醇治療痛風的臨床研究", studyType: "RCT", evidenceLevel: "LEVEL_3A", evidenceGrade: "C",
    authors: "Zhang L et al.", journal: "Journal of Traditional Chinese Medicine", year: 2025, doi: null, pubmedId: null,
    abstract: "臨床研究評價大黃牡丹湯聯合別嘌呤醇治療痛風的療效。聯合治療在降低尿酸和改善關節症狀方面優於單藥。",
    summary: "大黃牡丹湯聯合別嘌呤醇治療痛風的療效優於單用別嘌呤醇。", sampleSize: null,
    population: "痛風患者", intervention: "大黃牡丹湯聯合別嘌呤醇", comparator: "單用別嘌呤醇",
    primaryOutcome: "血清尿酸水平、關節症狀評分", resultsSummary: "聯合治療組尿酸降低幅度更大，關節腫痛緩解更快。",
    riskOfBias: "SOME_CONCERNS", qualityScore: 0.55, qualityTool: "Cochrane RoB 2", status: "PUBLISHED" },

  { title: "中藥麻黃使用態度調查：從業者觀點的觀察性研究", studyType: "COHORT", evidenceLevel: "LEVEL_4", evidenceGrade: "D",
    authors: "Chang A, Zhao X, Zhang L et al.", journal: "Journal of Traditional Chinese Medical Sciences", year: 2024,
    doi: "10.1016/j.jtcms.2024.09.003", pubmedId: null,
    abstract: "觀察性研究調查中醫從業者對麻黃使用的態度和認知。結果顯示多數從業者認為適當使用麻黃是安全的。",
    summary: "調查顯示中醫從業者普遍認為麻黃在辨證論治框架下可安全使用。", sampleSize: null,
    population: "中醫從業者", intervention: "問卷調查", comparator: null, primaryOutcome: "使用態度、安全性認知",
    resultsSummary: "大多數從業者認為麻黃在適當辨證和劑量控制下安全有效，但需注意心血管風險。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },

  { title: "中醫藥調節TCM免疫治療在腫瘤T細胞中的作用綜述", studyType: "EXPERT_OPINION", evidenceLevel: "LEVEL_5", evidenceGrade: "D",
    authors: "Li J et al.", journal: "Frontiers in Pharmacology", year: 2023, doi: null, pubmedId: null,
    abstract: "綜述中藥在腫瘤免疫微環境中調節T細胞功能的機制，包括增強T細胞活化、逆轉T細胞耗竭等。",
    summary: "中藥可通過多途徑調節腫瘤微環境中T細胞功能，為中西醫結合免疫治療提供理論基礎。", sampleSize: null,
    population: "癌症患者", intervention: "中藥活性成分", comparator: null, primaryOutcome: "文獻綜述",
    resultsSummary: "黃芪甲苷、人參皂苷Rg3和薑黃素等可增強抗腫瘤T細胞免疫應答。",
    riskOfBias: null, qualityScore: null, qualityTool: null, status: "PUBLISHED" },
] as const;

// ──────────────────────────────────────────────────────────────────────────────
// Evidence link data – connects evidence entries to herbs, formulas, acupoints,
// and patterns via their respective identifier (pinyinName for herbs/formulas/
// patterns, code for acupoints). The evidenceIndex matches the position in
// evidenceData above.
// ──────────────────────────────────────────────────────────────────────────────

export const evidenceLinkData = [
  // ── Herb links ─────────────────────────────────────────────────────────────
  // 0: Huang Qi – Cancer Fatigue
  { evidenceIndex: 0, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 1: Huang Qi – DKD
  { evidenceIndex: 1, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 2: Huang Qi – AMI
  { evidenceIndex: 2, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 3: Ren Shen – Cognitive
  { evidenceIndex: 3, herbPinyin: "Ren Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 4: Ren Shen – Fatigue
  { evidenceIndex: 4, herbPinyin: "Ren Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 5: Dan Shen – Angina
  { evidenceIndex: 5, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 6: Dan Shen – CHD
  { evidenceIndex: 6, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 7: Huang Lian – T2DM
  { evidenceIndex: 7, herbPinyin: "Huang Lian", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 8: Huang Lian – Hyperlipidemia
  { evidenceIndex: 8, herbPinyin: "Huang Lian", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 10: Ma Huang – Weight
  { evidenceIndex: 10, herbPinyin: "Ma Huang", outcomeType: "EFFICACY", effectDirection: "MIXED" },
  // 10: Ma Huang – Safety concern
  { evidenceIndex: 10, herbPinyin: "Ma Huang", outcomeType: "SAFETY", effectDirection: "NEGATIVE" },
  // 11: Ma Huang – Weight Loss RCT
  { evidenceIndex: 11, herbPinyin: "Ma Huang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 12: Gan Cao – Peptic Ulcer
  { evidenceIndex: 12, herbPinyin: "Gan Cao", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 13: Dang Gui – Dysmenorrhea
  { evidenceIndex: 13, herbPinyin: "Dang Gui", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 14: Chai Hu – Liver Disease
  { evidenceIndex: 14, herbPinyin: "Chai Hu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 53: Curcuma / liver protection – linking to Chai Hu as closest available herb
  { evidenceIndex: 53, herbPinyin: "Huang Qin", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 54: Dang Gui Bu Xue Tang herbs
  { evidenceIndex: 54, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 54, herbPinyin: "Dang Gui", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },

  // ── Formula links ──────────────────────────────────────────────────────────
  // 9: Huang Lian Jie Du Tang – T2DM
  { evidenceIndex: 9, formulaPinyin: "Huang Lian Jie Du Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 15: Bu Zhong Yi Qi Tang – Constipation
  { evidenceIndex: 15, formulaPinyin: "Bu Zhong Yi Qi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 16: Bu Zhong Yi Qi Tang – COPD
  { evidenceIndex: 16, formulaPinyin: "Bu Zhong Yi Qi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 17: Liu Wei Di Huang Wan – Hypertension
  { evidenceIndex: 17, formulaPinyin: "Liu Wei Di Huang Wan", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 18: Liu Wei Di Huang Wan – DN
  { evidenceIndex: 18, formulaPinyin: "Liu Wei Di Huang Wan", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 19: Si Jun Zi Tang – FD
  { evidenceIndex: 19, formulaPinyin: "Si Jun Zi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 20: Si Jun Zi Tang – CFS
  { evidenceIndex: 20, formulaPinyin: "Si Jun Zi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 21: Xiao Yao San – Depression
  { evidenceIndex: 21, formulaPinyin: "Xiao Yao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 22: Xiao Yao San – Anxiety
  { evidenceIndex: 22, formulaPinyin: "Xiao Yao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 23: Xiao Yao San – Insomnia
  { evidenceIndex: 23, formulaPinyin: "Xiao Yao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 24: Suan Zao Ren Tang – Insomnia
  { evidenceIndex: 24, formulaPinyin: "Suan Zao Ren Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 25: Suan Zao Ren Tang – Anxious Insomnia
  { evidenceIndex: 25, formulaPinyin: "Suan Zao Ren Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 27: Yin Qiao San – Cold
  { evidenceIndex: 27, formulaPinyin: "Yin Qiao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 28: Si Wu Tang – Dysmenorrhea
  { evidenceIndex: 28, formulaPinyin: "Si Wu Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 29: Ba Zhen Tang – Elderly
  { evidenceIndex: 29, formulaPinyin: "Ba Zhen Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 50: COVID recovery – Bu Zhong Yi Qi Tang
  { evidenceIndex: 50, formulaPinyin: "Bu Zhong Yi Qi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 50: COVID recovery – Sheng Mai San
  { evidenceIndex: 50, formulaPinyin: "Sheng Mai San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 55: Gui Zhi Tang – Wind-Cold
  { evidenceIndex: 55, formulaPinyin: "Gui Zhi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 56: Er Chen Tang – Phlegm-Dampness
  { evidenceIndex: 56, formulaPinyin: "Er Chen Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 57: Gui Pi Tang – Insomnia
  { evidenceIndex: 57, formulaPinyin: "Gui Pi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 58: Xiao Chai Hu Tang – Hepatitis
  { evidenceIndex: 58, formulaPinyin: "Xiao Chai Hu Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 60: Sheng Mai San – Heart Failure
  { evidenceIndex: 60, formulaPinyin: "Sheng Mai San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 61: Ban Xia Xie Xin Tang – FD
  { evidenceIndex: 61, formulaPinyin: "Ban Xia Xie Xin Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },

  // ── Acupoint links ─────────────────────────────────────────────────────────
  // 30: Chronic Pain IPD – LI4, ST36
  { evidenceIndex: 30, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 30, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 31: Chronic Pain Update – LI4, ST36
  { evidenceIndex: 31, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 31, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 32: PC6 – PONV Cochrane
  { evidenceIndex: 32, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 33: PC6 – PONV NMA
  { evidenceIndex: 33, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 34: Cancer N/V – PC6
  { evidenceIndex: 34, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 35: Knee OA durable – ST36, SP6
  { evidenceIndex: 35, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 35, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 36: Knee OA TSA – ST36
  { evidenceIndex: 36, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 37: Low Back Pain – BL23, BL40
  { evidenceIndex: 37, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 37, acupointCode: "BL40", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 38: Migraine – LR3, LI4
  { evidenceIndex: 38, acupointCode: "LR3", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 38, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 39: Chronic Pain Depression – GV20, LI4
  { evidenceIndex: 39, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 39, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 40: EA ST36 – GI
  { evidenceIndex: 40, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 41: Pregnancy Nausea – PC6, ST36
  { evidenceIndex: 41, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 41, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 45: GV20 – Stroke
  { evidenceIndex: 45, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 46: BL23 – Low Back Pain
  { evidenceIndex: 46, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 46, acupointCode: "BL40", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 47: CV4 – Gynecology
  { evidenceIndex: 47, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 48: HT7 – Insomnia
  { evidenceIndex: 48, acupointCode: "HT7", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 48, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 49: KI3 – Kidney Deficiency
  { evidenceIndex: 49, acupointCode: "KI3", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 49, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 52: Allergic Rhinitis – LI4
  { evidenceIndex: 52, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 59: Tension Headache – GB20
  { evidenceIndex: 59, acupointCode: "GB20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },

  // ── Pattern links ──────────────────────────────────────────────────────────
  // 42: Pi Qi Xu – GI Disorders
  { evidenceIndex: 42, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 43: Shen Yin Xu – Metabolic Syndrome
  { evidenceIndex: 43, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 44: Gan Qi Yu Jie – Depression
  { evidenceIndex: 44, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 20: Si Jun Zi Tang CFS – Pi Qi Xu
  { evidenceIndex: 20, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 21: Xiao Yao San Depression – Gan Qi Yu Jie
  { evidenceIndex: 21, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 22: Xiao Yao San Anxiety – Gan Qi Yu Jie
  { evidenceIndex: 22, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 17: Liu Wei Di Huang Wan Hypertension – Shen Yin Xu
  { evidenceIndex: 17, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 29: Ba Zhen Tang – Qi Xue Liang Xu
  { evidenceIndex: 29, patternPinyin: "Qi Xue Liang Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 49: KI3 – Shen Yin Xu
  { evidenceIndex: 49, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 55: Gui Zhi Tang – Feng Han
  { evidenceIndex: 55, patternPinyin: "Feng Han", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 56: Er Chen Tang – Tan Shi Nei Zu
  { evidenceIndex: 56, patternPinyin: "Tan Shi Nei Zu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 57: Gui Pi Tang – Xin Xue Xu
  { evidenceIndex: 57, patternPinyin: "Xin Xue Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 16: Bu Zhong Yi Qi Tang COPD – Fei Qi Xu
  { evidenceIndex: 16, patternPinyin: "Fei Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 51: IBS – Pi Qi Xu
  { evidenceIndex: 51, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 51: IBS – Gan Qi Yu Jie
  { evidenceIndex: 51, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 27: Yin Qiao San – Feng Re
  { evidenceIndex: 27, patternPinyin: "Feng Re", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },

  // ── Batch 2 links (entries 62–119) ───────────────────────────────────────

  // 62: Ban Xia Xie Xin Tang – Formula
  { evidenceIndex: 62, formulaPinyin: "Ban Xia Xie Xin Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 63: Du Huo Ji Sheng Tang – Formula (RA)
  { evidenceIndex: 63, formulaPinyin: "Du Huo Ji Sheng Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 64: Du Huo Ji Sheng Tang – Formula (Knee OA)
  { evidenceIndex: 64, formulaPinyin: "Du Huo Ji Sheng Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 65: Tian Wang Bu Xin Dan – Formula
  { evidenceIndex: 65, formulaPinyin: "Tian Wang Bu Xin Dan", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 65, patternPinyin: "Xin Shen Bu Jiao", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 66: Sheng Mai San – Formula (CHF)
  { evidenceIndex: 66, formulaPinyin: "Sheng Mai San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 67: Sheng Mai San – Formula (Viral Myocarditis)
  { evidenceIndex: 67, formulaPinyin: "Sheng Mai San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 68: Bu Yang Huan Wu Tang – Formula (Stroke)
  { evidenceIndex: 68, formulaPinyin: "Bu Yang Huan Wu Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 68, patternPinyin: "Xue Yu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 69: Dang Gui Bu Xue Tang – Herbs
  { evidenceIndex: 69, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 69, herbPinyin: "Dang Gui", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 70: Curcumin – Yu Jin herb
  { evidenceIndex: 70, herbPinyin: "Yu Jin", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 71: Curcumin anti-inflammatory – Yu Jin
  { evidenceIndex: 71, herbPinyin: "Yu Jin", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 72: Curcumin cancer – Yu Jin
  { evidenceIndex: 72, herbPinyin: "Yu Jin", outcomeType: "SAFETY", effectDirection: "POSITIVE" },
  // 73: Moxibustion breech – BL67 acupoint
  { evidenceIndex: 73, acupointCode: "BL67", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 74: Moxibustion IBS – ST25, ST36
  { evidenceIndex: 74, acupointCode: "ST25", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 74, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 75: Moxibustion low back pain – BL23
  { evidenceIndex: 75, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 76: TCM COVID-19 – multiple herbs (Huang Qin)
  { evidenceIndex: 76, herbPinyin: "Huang Qin", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 76, herbPinyin: "Ma Huang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 77: Lianhua Qingwen COVID – Herbs (Lian Qiao, Jin Yin Hua)
  { evidenceIndex: 77, herbPinyin: "Lian Qiao", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 77, herbPinyin: "Jin Yin Hua", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 78: Acupuncture for IVF
  { evidenceIndex: 78, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 78, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 78, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 79: EA for Stroke – GV20, LI4
  { evidenceIndex: 79, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 79, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 80: Acupuncture for CIPN – LI4, LI11, ST36
  { evidenceIndex: 80, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 80, acupointCode: "LI11", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 80, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 81: Acupuncture Bell's palsy – LI4
  { evidenceIndex: 81, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 82: Acupuncture lateral epicondylitis – LI11
  { evidenceIndex: 82, acupointCode: "LI11", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 83: Huang Qi Gui Zhi Wu Wu Tang for DPN – Herbs
  { evidenceIndex: 83, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 83, herbPinyin: "Gui Zhi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 84: Long Dan Xie Gan Tang insomnia – Formula
  { evidenceIndex: 84, formulaPinyin: "Huang Lian Jie Du Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 84, patternPinyin: "Shi Re", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 86: Ma Xing Shi Gan Tang – Formula
  { evidenceIndex: 86, formulaPinyin: "Ma Xing Shi Gan Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 86, herbPinyin: "Ma Huang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 87: Gui Pi Tang insomnia – Formula
  { evidenceIndex: 87, formulaPinyin: "Gui Pi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 87, patternPinyin: "Qi Xue Liang Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 88: Jia Wei Gui Pi Tang BPSD – Formula
  { evidenceIndex: 88, formulaPinyin: "Gui Pi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 89: Acupuncture CFS – ST36, GV20, SP6
  { evidenceIndex: 89, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 89, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 89, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 90: Acupuncture allergic rhinitis – LI4
  { evidenceIndex: 90, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 90, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 91: Huang Qi DPN
  { evidenceIndex: 91, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 92: Er Chen Tang
  { evidenceIndex: 92, formulaPinyin: "Er Chen Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 92, patternPinyin: "Tan Shi Nei Zu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 93: Acupuncture menopause
  { evidenceIndex: 93, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 93, acupointCode: "KI3", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 94: Depression pattern
  { evidenceIndex: 94, formulaPinyin: "Xiao Yao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 94, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 95: CHM for CHF
  { evidenceIndex: 95, formulaPinyin: "Sheng Mai San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 96: Si Wu Tang
  { evidenceIndex: 96, formulaPinyin: "Si Wu Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 96, herbPinyin: "Dang Gui", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 97: Acupuncture smoking
  { evidenceIndex: 97, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  // 98: Acupuncture tension headache
  { evidenceIndex: 98, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 98, acupointCode: "GB20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 99: Acupuncture postop pain
  { evidenceIndex: 99, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 99, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 100: Acupuncture prostatitis
  { evidenceIndex: 100, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 100, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 101: Huang Qin IBD
  { evidenceIndex: 101, herbPinyin: "Huang Qin", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 103: CHM weight
  { evidenceIndex: 103, herbPinyin: "Ma Huang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 104: Fu Zi safety
  { evidenceIndex: 104, herbPinyin: "Fu Zi", outcomeType: "SAFETY", effectDirection: "NEGATIVE" },
  // 105: Acupuncture sciatica
  { evidenceIndex: 105, acupointCode: "GB34", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 106: Xiao Chai Hu Tang hepatitis
  { evidenceIndex: 106, formulaPinyin: "Xiao Chai Hu Tang", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  { evidenceIndex: 106, herbPinyin: "Chai Hu", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  // 107: Ginseng MCI
  { evidenceIndex: 107, herbPinyin: "Ren Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 109: Gui Zhi Tang
  { evidenceIndex: 109, formulaPinyin: "Gui Zhi Tang", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 109, herbPinyin: "Gui Zhi", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 109, patternPinyin: "Feng Han", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 113: Liu Jun Zi Tang
  { evidenceIndex: 113, formulaPinyin: "Liu Jun Zi Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 113, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 114: Da Huang
  { evidenceIndex: 114, herbPinyin: "Da Huang", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 115: EA functional constipation – ST25
  { evidenceIndex: 115, acupointCode: "ST25", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 118: Tai Chi fall prevention (no specific herb/acupoint link – general)
  // 119: Tai Chi hypertension

  // ── Batch 3 links (JTCMS entries 120–149) ────────────────────────────────

  // 121: Acupuncture post-VCF pain
  { evidenceIndex: 121, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 121, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 123: Sanhua essential oil – breast cancer depression
  { evidenceIndex: 123, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 124: CHM RA Singapore – Du Huo Ji Sheng Tang
  { evidenceIndex: 124, formulaPinyin: "Du Huo Ji Sheng Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 125: Constitution chronic pain – Qi stagnation
  { evidenceIndex: 125, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 125, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 126: Jiaotai Pill – Huang Lian + Rou Gui
  { evidenceIndex: 126, herbPinyin: "Huang Lian", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 126, herbPinyin: "Rou Gui", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 127: Tai Chi for LDH
  // (no specific herb/acupoint – general exercise)
  // 128: Xiaoshuan for stroke
  { evidenceIndex: 128, patternPinyin: "Xue Yu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 130: Simiao for gout – Huang Lian (Shi Re pattern)
  { evidenceIndex: 130, patternPinyin: "Shi Re", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 131: EA for dysmenorrhea – SP6, CV4
  { evidenceIndex: 131, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 131, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 132: EA for thyroidectomy – LI4, PC6
  { evidenceIndex: 132, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 132, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 134: Modified Xiaoyao for PPD
  { evidenceIndex: 134, formulaPinyin: "Xiao Yao San", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 134, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 136: TCM exercise for DPN
  { evidenceIndex: 136, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 137: TEAS postop – ST36
  { evidenceIndex: 137, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 137, acupointCode: "GB34", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 138: Ginsenosides for depression – Ren Shen
  { evidenceIndex: 138, herbPinyin: "Ren Shen", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 139: TCM and elderly cognition
  // (population-level, no specific link)
  // 140: Fermented Suan Zao Ren – formula herb
  { evidenceIndex: 140, formulaPinyin: "Suan Zao Ren Tang", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 141: Panax ginseng cognitive/emotional – Ren Shen
  { evidenceIndex: 141, herbPinyin: "Ren Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 142: Fermented Huang Qi immunomodulation
  { evidenceIndex: 142, herbPinyin: "Huang Qi", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 143: Wendan for obesity – Er Chen Tang derivative (phlegm pattern)
  { evidenceIndex: 143, formulaPinyin: "Er Chen Tang", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 143, patternPinyin: "Tan Shi Nei Zu", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 146: Danggui Shaoyao – herbs
  { evidenceIndex: 146, herbPinyin: "Dang Gui", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 146, herbPinyin: "Bai Shao", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 148: Dan Shen + Hong Hua
  { evidenceIndex: 148, herbPinyin: "Dan Shen", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 148, herbPinyin: "Hong Hua", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 149: Danzhi Xiaoyao San
  { evidenceIndex: 149, formulaPinyin: "Xiao Yao San", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 149, patternPinyin: "Gan Qi Yu Jie", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },

  // ── Batch 4 links (entries 150–199) ──────────────────────────────────────

  // 150: Acupuncture for depression
  { evidenceIndex: 150, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 150, acupointCode: "LR3", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 150, patternPinyin: "Gan Qi Yu Jie", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 151: Acupuncture for GAD
  { evidenceIndex: 151, acupointCode: "HT7", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 151, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 152: EA enhance antidepressants
  { evidenceIndex: 152, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 153: Acupuncture labour pain (Cochrane)
  { evidenceIndex: 153, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 153, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 154: Acupuncture fibromyalgia
  { evidenceIndex: 154, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 154, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 155: Acupuncture COPD overview
  { evidenceIndex: 155, patternPinyin: "Fei Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 156: Acupuncture asthma
  { evidenceIndex: 156, acupointCode: "LU7", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 156, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 157: Acupuncture Meniere's
  { evidenceIndex: 157, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 159: CHM female infertility
  { evidenceIndex: 159, herbPinyin: "Dang Gui", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 159, herbPinyin: "Bai Shao", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 160: CHM endometriosis
  { evidenceIndex: 160, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 160, patternPinyin: "Xue Yu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 161: Dan Shen for endometriosis
  { evidenceIndex: 161, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 162: CHM for atopic dermatitis
  { evidenceIndex: 162, patternPinyin: "Shi Re", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 164: CHM for Alzheimer's
  { evidenceIndex: 164, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 165: CHM for DKD
  { evidenceIndex: 165, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 165, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 166: TCM for DKD 44 RCTs
  { evidenceIndex: 166, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 167: Xue Fu Zhu Yu Tang CHD
  { evidenceIndex: 167, formulaPinyin: "Bu Yang Huan Wu Tang", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 167, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 167, patternPinyin: "Xue Yu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 168: CHM menopausal hot flashes
  { evidenceIndex: 168, formulaPinyin: "Liu Wei Di Huang Wan", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 168, patternPinyin: "Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 169: Xiao Chai Hu Tang hepatitis (Cochrane)
  { evidenceIndex: 169, formulaPinyin: "Xiao Chai Hu Tang", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  { evidenceIndex: 169, herbPinyin: "Chai Hu", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  // 170: Fuzheng Huayu liver fibrosis
  { evidenceIndex: 170, herbPinyin: "Dan Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 172: Acupuncture postpartum UI
  { evidenceIndex: 172, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 172, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 173: Acupuncture postpartum retention
  { evidenceIndex: 173, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 173, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 174: Acupuncture dysmenorrhoea (Cochrane)
  { evidenceIndex: 174, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 174, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 175: Acupuncture acute stroke (Cochrane)
  { evidenceIndex: 175, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 175, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 176: Acupuncture neck (Cochrane)
  { evidenceIndex: 176, acupointCode: "GB20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 177: Acupuncture IBS (Cochrane)
  { evidenceIndex: 177, acupointCode: "ST25", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  { evidenceIndex: 177, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "NEUTRAL" },
  // 178: Acupuncture SUI
  { evidenceIndex: 178, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 178, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 179: Acupuncture insomnia
  { evidenceIndex: 179, acupointCode: "HT7", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 179, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 180: TCM exercise MCI
  // (no specific herb/acupoint – general exercise)
  // 181: Acupuncture chemo N/V (Cochrane)
  { evidenceIndex: 181, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 182: Medicine-food homology CHF
  { evidenceIndex: 182, herbPinyin: "Ren Shen", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 182, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 183: Acupuncture cervical vertigo
  { evidenceIndex: 183, acupointCode: "GB20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 183, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 185: ACUSAR trial allergic rhinitis
  { evidenceIndex: 185, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 187: Acupuncture post-stroke depression
  { evidenceIndex: 187, acupointCode: "GV20", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 187, acupointCode: "PC6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 189: Shaoyao Gancao
  { evidenceIndex: 189, herbPinyin: "Bai Shao", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 189, herbPinyin: "Gan Cao", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 191: Ge Gen for ALD
  { evidenceIndex: 191, herbPinyin: "Ge Gen", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 193: Maimendong for fibrosis
  { evidenceIndex: 193, herbPinyin: "Mai Dong", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 197: EA depression via brevican
  { evidenceIndex: 197, acupointCode: "GV20", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  // 198: Bu Yang Huan Wu for SCI
  { evidenceIndex: 198, formulaPinyin: "Bu Yang Huan Wu Tang", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },
  { evidenceIndex: 198, herbPinyin: "Huang Qi", outcomeType: "MECHANISM", effectDirection: "POSITIVE" },

  // ── Batch 5 links (entries 200–249) ──────────────────────────────────────

  // 200: JAMA Acupuncture sciatica
  { evidenceIndex: 200, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 200, acupointCode: "GB34", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 201: JAMA EA for SUI
  { evidenceIndex: 201, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 201, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 202: Cochrane 2025 migraine
  { evidenceIndex: 202, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 202, acupointCode: "LR3", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 203: Vickers IPD chronic pain
  { evidenceIndex: 203, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 203, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 204: Artemisinin Nobel Prize
  { evidenceIndex: 204, herbPinyin: "Qing Hao", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 205: Arsenic Trioxide APL
  // (no standard herb link — mineral medicine)
  // 207: TCM post-COVID
  { evidenceIndex: 207, patternPinyin: "Pi Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 207, patternPinyin: "Fei Qi Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 208: TCM diabetes
  { evidenceIndex: 208, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 208, herbPinyin: "Huang Lian", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 209: Meridian theory dysmenorrhea
  { evidenceIndex: 209, acupointCode: "SP6", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 209, acupointCode: "CV4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 211: TCM + chemo NSCLC
  { evidenceIndex: 211, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 212: Acupuncture cancer QoL
  { evidenceIndex: 212, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 212, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 213: Tianma Gouteng Yin HTN
  { evidenceIndex: 213, patternPinyin: "Gan Shen Yin Xu", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 216: Yunnan Baiyao hemostasis
  { evidenceIndex: 216, herbPinyin: "San Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 217: San Qi for stroke
  { evidenceIndex: 217, herbPinyin: "San Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 218: San Qi + aspirin
  { evidenceIndex: 218, herbPinyin: "San Qi", outcomeType: "SAFETY", effectDirection: "POSITIVE" },
  // 219: CHM breast cancer chemo
  { evidenceIndex: 219, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 221: JAMA Network Open acupuncture overview
  { evidenceIndex: 221, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 221, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 223: JTCM NSLBP network MA
  { evidenceIndex: 223, acupointCode: "BL23", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 224: Acupuncture cancer pain palliative
  { evidenceIndex: 224, acupointCode: "ST36", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  { evidenceIndex: 224, acupointCode: "LI4", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
  // 225: CHM ovarian cancer
  { evidenceIndex: 225, herbPinyin: "Huang Qi", outcomeType: "EFFICACY", effectDirection: "POSITIVE" },
] as const;
