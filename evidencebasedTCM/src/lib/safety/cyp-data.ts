/**
 * Curated CYP450 / transporter pharmacokinetics reference for herb-drug
 * interaction PREDICTION (complements the curated HerbDrugInteraction table).
 *
 * Two curated tables:
 *  - DRUG_CYP: for common Western drugs, which CYP/transporters they are a
 *    SUBSTRATE of (i.e. their clearance depends on that enzyme), plus a
 *    narrow-therapeutic-index flag.
 *  - HERB_CYP: for well-documented TCM herbs, which enzymes their constituents
 *    INHIBIT or INDUCE (direction matters — inhibition raises substrate levels,
 *    induction lowers them).
 *
 * Prediction logic lives in predict-interactions.ts. These are high-confidence,
 * literature-backed entries; the graph's compound→CYP edges are used only as a
 * separate, clearly-labelled low-confidence ("network-derived") signal.
 */

export type Enzyme =
  | "CYP3A4" | "CYP2D6" | "CYP2C9" | "CYP2C19" | "CYP1A2" | "CYP2E1" | "CYP2B6" | "PGP";

export const ENZYME_LABEL: Record<Enzyme, { zh: string; en: string }> = {
  CYP3A4: { zh: "CYP3A4 酶", en: "CYP3A4" },
  CYP2D6: { zh: "CYP2D6 酶", en: "CYP2D6" },
  CYP2C9: { zh: "CYP2C9 酶", en: "CYP2C9" },
  CYP2C19: { zh: "CYP2C19 酶", en: "CYP2C19" },
  CYP1A2: { zh: "CYP1A2 酶", en: "CYP1A2" },
  CYP2E1: { zh: "CYP2E1 酶", en: "CYP2E1" },
  CYP2B6: { zh: "CYP2B6 酶", en: "CYP2B6" },
  PGP: { zh: "P-醣蛋白 (P-gp)", en: "P-glycoprotein (P-gp)" },
};

export interface DrugCyp {
  substrate?: Enzyme[];
  /** narrow therapeutic index — small exposure changes are clinically serious */
  narrowTI?: boolean;
  /** prodrug activated by the listed enzyme(s) — inhibition LOWERS efficacy */
  prodrugOf?: Enzyme[];
}

// Keyed by canonical generic name (lowercase) — matches rxnorm-subset.ts.
export const DRUG_CYP: Record<string, DrugCyp> = {
  warfarin: { substrate: ["CYP2C9", "CYP3A4"], narrowTI: true },
  clopidogrel: { substrate: ["CYP2C19"], prodrugOf: ["CYP2C19"] },
  apixaban: { substrate: ["CYP3A4", "PGP"] },
  rivaroxaban: { substrate: ["CYP3A4", "PGP"] },
  simvastatin: { substrate: ["CYP3A4"] },
  atorvastatin: { substrate: ["CYP3A4"] },
  amlodipine: { substrate: ["CYP3A4"] },
  nifedipine: { substrate: ["CYP3A4"] },
  metoprolol: { substrate: ["CYP2D6"] },
  propranolol: { substrate: ["CYP2D6", "CYP1A2"] },
  tacrolimus: { substrate: ["CYP3A4", "PGP"], narrowTI: true },
  cyclosporine: { substrate: ["CYP3A4", "PGP"], narrowTI: true },
  ciclosporin: { substrate: ["CYP3A4", "PGP"], narrowTI: true },
  sirolimus: { substrate: ["CYP3A4", "PGP"], narrowTI: true },
  digoxin: { substrate: ["PGP"], narrowTI: true },
  midazolam: { substrate: ["CYP3A4"] },
  diazepam: { substrate: ["CYP2C19", "CYP3A4"] },
  omeprazole: { substrate: ["CYP2C19"] },
  clarithromycin: { substrate: ["CYP3A4"] },
  sildenafil: { substrate: ["CYP3A4"] },
  sertraline: { substrate: ["CYP2C19", "CYP2D6"] },
  citalopram: { substrate: ["CYP2C19"] },
  escitalopram: { substrate: ["CYP2C19"] },
  fluoxetine: { substrate: ["CYP2D6", "CYP2C9"] },
  amitriptyline: { substrate: ["CYP2D6", "CYP2C19"] },
  haloperidol: { substrate: ["CYP2D6", "CYP3A4"] },
  theophylline: { substrate: ["CYP1A2"], narrowTI: true },
  carbamazepine: { substrate: ["CYP3A4"], narrowTI: true },
  phenytoin: { substrate: ["CYP2C9", "CYP2C19"], narrowTI: true },
  glipizide: { substrate: ["CYP2C9"] },
  glimepiride: { substrate: ["CYP2C9"] },
  losartan: { substrate: ["CYP2C9", "CYP3A4"] },
  tamoxifen: { substrate: ["CYP2D6"], prodrugOf: ["CYP2D6"] },
};

export interface HerbCyp {
  /** lowercase pinyin tokens to match Herb.pinyinName (substring, case-insensitive) */
  pinyin: string[];
  /** latinName substring to match (case-insensitive), optional */
  latin?: string;
  zh: string; // display
  inhibits?: Enzyme[];
  induces?: Enzyme[];
  note: string; // Traditional Chinese clinical note
}

export const HERB_CYP: HerbCyp[] = [
  { pinyin: ["wu wei zi"], latin: "Schisandra", zh: "五味子", inhibits: ["CYP3A4", "PGP"],
    note: "五味子木脂素強烈抑制 CYP3A4 與 P-gp，顯著升高他克莫司、環孢素等受質血藥濃度。" },
  { pinyin: ["gan cao"], latin: "Glycyrrhiza", zh: "甘草", induces: ["CYP3A4"],
    note: "甘草可誘導 CYP3A4 降低受質濃度；另經假性醛固酮作用致低血鉀，增強強心苷毒性。" },
  { pinyin: ["dan shen"], latin: "Salvia miltiorrhiza", zh: "丹參", inhibits: ["CYP2C9", "CYP3A4"],
    note: "丹參抑制 CYP2C9/3A4，並具抗血小板作用，與華法林併用顯著增加出血風險。" },
  { pinyin: ["huang lian"], latin: "Coptis", zh: "黃連", inhibits: ["CYP2D6", "CYP3A4", "CYP2C9", "PGP"],
    note: "小檗鹼抑制 CYP2D6/3A4/2C9 與 P-gp，升高多種受質藥物濃度。" },
  { pinyin: ["huang bai"], latin: "Phellodendron", zh: "黃柏", inhibits: ["CYP3A4", "CYP2D6"],
    note: "含小檗鹼，抑制 CYP3A4/2D6。" },
  { pinyin: ["jiang huang"], latin: "Curcuma longa", zh: "薑黃", inhibits: ["CYP3A4", "CYP2C9", "PGP"],
    note: "薑黃素抑制 CYP3A4/2C9 與 P-gp，可升高受質藥物濃度。" },
  { pinyin: ["hu jiao", "hei hu jiao"], latin: "Piper nigrum", zh: "胡椒", inhibits: ["CYP3A4", "PGP"],
    note: "胡椒鹼為強效 CYP3A4 與 P-gp 抑制劑（生物利用度增強劑），可顯著升高合用藥物濃度。" },
  { pinyin: ["ren shen"], latin: "Panax ginseng", zh: "人參", inhibits: ["CYP2D6"],
    note: "人參皂苷影響 CYP2D6；與華法林併用可能降低其抗凝效果（藥效學）。" },
  { pinyin: ["yin xing", "bai guo"], latin: "Ginkgo", zh: "銀杏/白果", inhibits: ["CYP2C9", "CYP3A4"],
    note: "銀杏抑制 CYP2C9/3A4 並抗血小板，增加出血風險。" },
  { pinyin: ["dang gui"], latin: "Angelica sinensis", zh: "當歸", inhibits: ["CYP3A4"],
    note: "當歸含香豆素類，與華法林併用增加出血風險（藥效學為主）。" },
  { pinyin: ["chai hu"], latin: "Bupleurum", zh: "柴胡", inhibits: ["CYP3A4"],
    note: "柴胡皂苷可抑制 CYP3A4。" },
  { pinyin: ["ge gen"], latin: "Pueraria", zh: "葛根", inhibits: ["CYP2D6", "CYP1A2"],
    note: "葛根素影響 CYP2D6/1A2。" },
  { pinyin: ["wu zhu yu"], latin: "Evodia", zh: "吳茱萸", induces: ["CYP1A2", "CYP3A4"],
    note: "吳茱萸可誘導 CYP1A2/3A4，降低受質藥物濃度。" },
  { pinyin: ["nan wu wei zi", "hua zhong wu wei zi"], latin: "Schisandra sphenanthera", zh: "南五味子", inhibits: ["CYP3A4"],
    note: "南五味子（華中五味子）為強 CYP3A4 抑制劑。" },
  { pinyin: ["gou teng"], latin: "Uncaria", zh: "鉤藤", inhibits: ["CYP3A4"],
    note: "鉤藤生物鹼抑制 CYP3A4。" },
  { pinyin: ["bai zhi"], latin: "Angelica dahurica", zh: "白芷", inhibits: ["CYP2D6", "CYP3A4", "CYP1A2"],
    note: "白芷呋喃香豆素抑制多種 CYP（3A4/2D6/1A2）。" },
  { pinyin: ["wu gong", "quan xie"], zh: "蜈蚣/全蠍", inhibits: ["CYP3A4"],
    note: "部分蟲類藥報導影響 CYP3A4（證據較弱）。" },
  { pinyin: ["mu xiang"], latin: "Aucklandia", zh: "木香", inhibits: ["CYP3A4"],
    note: "木香內酯抑制 CYP3A4。" },
];
