/**
 * Top 25 herb-drug interactions for the cheat-sheet lead magnet.
 * Curated subset of the EBTCM evidence database; edit here when adding/removing
 * entries. Field structure mirrors HerbDrugInteraction but is denormalized for
 * fast page render + bilingual rendering.
 */

export type Severity = "MAJOR" | "MODERATE" | "MINOR";
export type Group = "anticoagulants" | "cyp3a4" | "glycemic" | "cns" | "hormonal" | "other";

export interface CheatsheetInteraction {
  group: Group;
  severity: Severity;
  herb: { zh: string; pinyin: string };
  drug: string;
  zh: { mechanism: string; effect: string; management: string };
  en: { mechanism: string; effect: string; management: string };
}

export const INTERACTIONS: CheatsheetInteraction[] = [
  // ===== Anticoagulants / Antiplatelets =====
  {
    group: "anticoagulants",
    severity: "MAJOR",
    herb: { zh: "丹參", pinyin: "Dan Shen" },
    drug: "Warfarin",
    zh: { mechanism: "抗血小板 + ↑ INR", effect: "嚴重出血風險（消化道、顱內）", management: "避免合用；如使用每週監測 INR" },
    en: { mechanism: "Antiplatelet + ↑ INR", effect: "Major bleeding (GI, intracranial)", management: "Avoid; if used, monitor INR weekly" },
  },
  {
    group: "anticoagulants",
    severity: "MAJOR",
    herb: { zh: "銀杏葉", pinyin: "Yin Xing Ye" },
    drug: "Warfarin / Aspirin",
    zh: { mechanism: "抑制血小板聚集 (PAF)", effect: "自發性出血案例報告", management: "術前 7 日停用" },
    en: { mechanism: "PAF inhibition → platelet aggregation ↓", effect: "Spontaneous bleeding cases", management: "Discontinue 7 days pre-op" },
  },
  {
    group: "anticoagulants",
    severity: "MODERATE",
    herb: { zh: "當歸", pinyin: "Dang Gui" },
    drug: "Warfarin",
    zh: { mechanism: "↑ INR (機轉未明)", effect: "出血風險增加", management: "合用時監測 INR" },
    en: { mechanism: "↑ INR, mechanism uncertain", effect: "Increased bleeding risk", management: "Monitor INR if combined" },
  },
  {
    group: "anticoagulants",
    severity: "MODERATE",
    herb: { zh: "三七", pinyin: "San Qi" },
    drug: "Warfarin / Antiplatelets",
    zh: { mechanism: "雙向凝血調節", effect: "出血或血栓風險均可能", management: "慢性抗凝者避免" },
    en: { mechanism: "Bidirectional clotting modulation", effect: "Either bleeding or thrombosis", management: "Avoid in chronic anticoagulation" },
  },
  {
    group: "anticoagulants",
    severity: "MODERATE",
    herb: { zh: "大蒜 (高劑量)", pinyin: "Da Suan" },
    drug: "Warfarin / Aspirin",
    zh: { mechanism: "↑ 出血時間", effect: "膳食量安全，補充劑量風險高", management: "停用大蒜補充劑；食用量無妨" },
    en: { mechanism: "↑ Bleeding time", effect: "Culinary safe; supplement risky", management: "Stop garlic supplements; food OK" },
  },

  // ===== CYP3A4 / Pharmacokinetic =====
  {
    group: "cyp3a4",
    severity: "MAJOR",
    herb: { zh: "貫葉連翹", pinyin: "Guan Ye Lian Qiao (St John's Wort)" },
    drug: "Tacrolimus / Cyclosporine / Warfarin / SSRIs",
    zh: { mechanism: "強效 CYP3A4 + P-gp 誘導劑", effect: "↓ 血藥濃度 → 移植排斥；併用 SSRI 致 5-HT 綜合徵", management: "移植患者絕對禁用；併用 SSRI 風險高" },
    en: { mechanism: "Potent CYP3A4 + P-gp inducer", effect: "↓ serum levels → graft rejection; SSRI = serotonin syndrome", management: "Hard avoid in transplant; major risk with SSRI" },
  },
  {
    group: "cyp3a4",
    severity: "MODERATE",
    herb: { zh: "五味子", pinyin: "Wu Wei Zi" },
    drug: "Tacrolimus",
    zh: { mechanism: "CYP3A4 抑制 → ↑ 血藥濃度", effect: "Tacrolimus 中毒（移植腎/肝損害）", management: "TDM 下劑量調整" },
    en: { mechanism: "CYP3A4 inhibition → ↑ serum levels", effect: "Tacrolimus toxicity (renal, hepatic)", management: "Dose-adjust under TDM" },
  },
  {
    group: "cyp3a4",
    severity: "MODERATE",
    herb: { zh: "甘草 (高劑量)", pinyin: "Gan Cao" },
    drug: "Digoxin / 降壓藥",
    zh: { mechanism: "假性醛固酮增多症 → 低血鉀", effect: "↑ Digoxin 毒性；↑ 高血壓", management: "限 < 5 g/日；查血鉀" },
    en: { mechanism: "Pseudo-aldosteronism → hypokalemia", effect: "↑ digoxin toxicity, ↑ HTN", management: "Limit < 5 g/day; check K+" },
  },
  {
    group: "cyp3a4",
    severity: "MODERATE",
    herb: { zh: "大蒜 (補充劑)", pinyin: "Da Suan (supplement)" },
    drug: "Saquinavir / 抗反轉錄病毒藥",
    zh: { mechanism: "CYP3A4 誘導", effect: "Saquinavir 血藥濃度 ↓ 50%", management: "HIV 患者避免大蒜補充劑" },
    en: { mechanism: "CYP3A4 induction", effect: "Saquinavir levels ↓ 50%", management: "Avoid garlic supplements in HIV patients" },
  },

  // ===== Glycemic =====
  {
    group: "glycemic",
    severity: "MODERATE",
    herb: { zh: "黃連 (小檗鹼)", pinyin: "Huang Lian / Berberine" },
    drug: "Metformin / SU / 胰島素",
    zh: { mechanism: "降糖作用加成", effect: "嚴格血糖控制者易低血糖", management: "監測 BG；按需減量" },
    en: { mechanism: "Additive glucose lowering", effect: "Hypoglycemia in tight glycemic control", management: "Monitor BG; dose-adjust" },
  },
  {
    group: "glycemic",
    severity: "MINOR",
    herb: { zh: "苦瓜", pinyin: "Ku Gua" },
    drug: "胰島素 / SU",
    zh: { mechanism: "輕度降糖", effect: "低血糖風險增加", management: "病人衛教 + 監測" },
    en: { mechanism: "Mild hypoglycemic effect", effect: "Hypoglycemia risk slightly ↑", management: "Counsel + monitor" },
  },
  {
    group: "glycemic",
    severity: "MINOR",
    herb: { zh: "人參", pinyin: "Ren Shen" },
    drug: "胰島素",
    zh: { mechanism: "血糖作用變異", effect: "可能升或降，臨床效應不確定", management: "病人衛教" },
    en: { mechanism: "Variable glycemic effect", effect: "May raise or lower glucose", management: "Patient education" },
  },

  // ===== CNS / Sedatives =====
  {
    group: "cns",
    severity: "MAJOR",
    herb: { zh: "麻黃", pinyin: "Ma Huang (Ephedra)" },
    drug: "MAOI / 興奮劑",
    zh: { mechanism: "擬交感作用 ↑ 去甲腎上腺素", effect: "高血壓危象、心肌梗死、中風", management: "絕對禁用（多國已禁售）" },
    en: { mechanism: "Sympathomimetic ↑ NE", effect: "Hypertensive crisis, MI, stroke", management: "Absolute contraindication" },
  },
  {
    group: "cns",
    severity: "MODERATE",
    herb: { zh: "纈草", pinyin: "Xie Cao (Valerian)" },
    drug: "苯二氮䓬 / Zolpidem",
    zh: { mechanism: "CNS 抑制加成", effect: "過度鎮靜、跌倒風險", management: "避免合用" },
    en: { mechanism: "Additive CNS depression", effect: "Excess sedation, fall risk", management: "Avoid combination" },
  },
  {
    group: "cns",
    severity: "MINOR",
    herb: { zh: "酸棗仁", pinyin: "Suan Zao Ren" },
    drug: "苯二氮䓬",
    zh: { mechanism: "輕度鎮靜加成", effect: "標準劑量下臨床效應小", management: "標準劑量通常安全" },
    en: { mechanism: "Mild additive sedation", effect: "Minimal at standard dose", management: "Generally safe at standard dose" },
  },

  // ===== Hormonal =====
  {
    group: "hormonal",
    severity: "MODERATE",
    herb: { zh: "大豆異黃酮 (高劑量)", pinyin: "Da Dou Yi Huang Tong" },
    drug: "Tamoxifen",
    zh: { mechanism: "植物雌激素干擾 ER 結合", effect: "↓ Tamoxifen 療效（in vivo 資料不一）", management: "ER+ 乳癌患者避免" },
    en: { mechanism: "Phytoestrogenic ER interference", effect: "↓ tamoxifen efficacy (in vivo mixed)", management: "Avoid in ER+ breast cancer" },
  },
  {
    group: "hormonal",
    severity: "MINOR",
    herb: { zh: "黑升麻", pinyin: "Hei Sheng Ma (Black Cohosh)" },
    drug: "HRT",
    zh: { mechanism: "理論性雌激素樣作用", effect: "臨床證據有限", management: "病人衛教" },
    en: { mechanism: "Theoretical estrogenic activity", effect: "Limited clinical evidence", management: "Patient education" },
  },

  // ===== Other Notable =====
  {
    group: "other",
    severity: "MODERATE",
    herb: { zh: "銀杏葉", pinyin: "Yin Xing Ye" },
    drug: "SSRIs",
    zh: { mechanism: "MAO 抑制理論", effect: "5-HT 綜合徵罕見報告", management: "高劑量併用時注意" },
    en: { mechanism: "Theoretical MAO inhibition", effect: "Rare serotonin syndrome reports", management: "Caution at high doses" },
  },
  {
    group: "other",
    severity: "MODERATE",
    herb: { zh: "大黃 (高劑量)", pinyin: "Da Huang" },
    drug: "Digoxin",
    zh: { mechanism: "刺激性瀉下 → 失鉀", effect: "↑ Digoxin 中毒風險", management: "長期使用者查 K+；改用較溫和瀉藥" },
    en: { mechanism: "Stimulant laxative → K+ loss", effect: "↑ digoxin toxicity", management: "Check K+; switch to milder laxative" },
  },
  {
    group: "other",
    severity: "MODERATE",
    herb: { zh: "石榴汁 / 葡萄柚樣中藥", pinyin: "Shi Liu Zhi" },
    drug: "Statins / 鈣通道阻滯劑",
    zh: { mechanism: "CYP3A4 抑制（類葡萄柚效應）", effect: "↑ 他汀血藥濃度 → 肌肉毒性", management: "服藥當日避免大量飲用" },
    en: { mechanism: "CYP3A4 inhibition (grapefruit-like)", effect: "↑ statin serum levels → myopathy", management: "Avoid large intake on dosing days" },
  },
  {
    group: "other",
    severity: "MAJOR",
    herb: { zh: "附子 (生品/誤用)", pinyin: "Fu Zi (raw/misused)" },
    drug: "抗心律失常藥 / β受體阻滯劑",
    zh: { mechanism: "烏頭鹼 → 鈉通道阻滯 + 心律失常", effect: "致命性心律失常（已報案例）", management: "僅炮製品；劑量嚴守；併用心血管藥更需慎" },
    en: { mechanism: "Aconitine → Na channel block + arrhythmia", effect: "Lethal arrhythmias (case reports)", management: "Processed only; strict dose; extra caution with CV meds" },
  },
  {
    group: "other",
    severity: "MINOR",
    herb: { zh: "茯苓", pinyin: "Fu Ling" },
    drug: "利尿劑",
    zh: { mechanism: "輕度利尿加成", effect: "脫水或電解質失衡（罕見）", management: "病人衛教" },
    en: { mechanism: "Mild additive diuresis", effect: "Rare dehydration/electrolyte issues", management: "Patient education" },
  },
];

// Six absolute pregnancy contraindications.
export const PREGNANCY_CONTRAINDICATED: Array<{
  chinese: string;
  pinyin: string;
  zhReason: string;
  enReason: string;
}> = [
  {
    chinese: "紅花",
    pinyin: "Hong Hua",
    zhReason: "強烈活血化瘀 — 動胎、出血風險",
    enReason: "Strong blood-mover — abortifacient potential",
  },
  {
    chinese: "桃仁",
    pinyin: "Tao Ren",
    zhReason: "破血逐瘀 — 動胎風險",
    enReason: "Blood-stasis breaker — uterine stimulation",
  },
  {
    chinese: "莪朮",
    pinyin: "E Zhu",
    zhReason: "破氣消積 — 動胎",
    enReason: "Strong qi-mover — uterine effects",
  },
  {
    chinese: "三棱",
    pinyin: "San Leng",
    zhReason: "破血消癥 — 流產風險",
    enReason: "Blood-stasis breaker — miscarriage risk",
  },
  {
    chinese: "番瀉葉",
    pinyin: "Fan Xie Ye",
    zhReason: "刺激性瀉藥 — 引發子宮收縮",
    enReason: "Stimulant laxative — uterine contractions",
  },
  {
    chinese: "麝香",
    pinyin: "She Xiang",
    zhReason: "強烈行氣開竅 — 古籍明確列為禁忌",
    enReason: "Strong qi-mover — classical absolute contraindication",
  },
];
