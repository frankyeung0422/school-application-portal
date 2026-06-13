/**
 * Content enrichment #3 — clinical safety data and food-stagnation herbs.
 *
 * Adds:
 *   • 5 food-stagnation herbs to round out that category.
 *   • ~25 herb-drug interactions (warfarin, digoxin, cyclosporine, theophylline,
 *     etc) — clinically critical safety information.
 *   • ~15 classical herb-herb interactions (十八反十九畏 and modern incompatibilities).
 *   • ~15 contraindications (pregnancy + condition-based).
 *
 * Idempotent — skips rows when both herbs match the same combination.
 *
 * Run: npx tsx scripts/enrich-3-safety-data.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type Severity = "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL";
type Mechanism = "PHARMACOKINETIC" | "PHARMACODYNAMIC";
type SafetyEvidence = "ESTABLISHED" | "PROBABLE" | "SUSPECTED" | "THEORETICAL";
type ClassicalType = "XIANG_FAN" | "XIANG_WEI" | "XIANG_XU" | "XIANG_SHA" | "XIANG_WU";
type Pregnancy = "SAFE" | "CAUTION" | "CONTRAINDICATED" | "UNKNOWN";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

const HERBS: H[] = [
  { p: "Shen Qu", c: "神麴", lat: "Massa Medicata Fermentata", eng: "Medicated Leaven",
    cat: "Food Stagnation Resolving", nat: "WARM", flav: ["Sweet", "Pungent"],
    merid: ["Spleen", "Stomach"], dose: "6-15g",
    desc: "消食和胃。用於飲食停滯、脘腹脹滿、食少納呆、腸鳴腹瀉。為發酵製品，含多種消化酶。多與山楂、麥芽相須為用，合稱「焦三仙」。",
    pharm: "含揮發油、苷類、脂肪、消化酶、酵母菌、維生素B群。促進消化液分泌，增加胃腸蠕動。" },
  { p: "Mai Ya", c: "麥芽", lat: "Hordeum vulgare (germinated)", eng: "Sprouted Barley",
    cat: "Food Stagnation Resolving", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Spleen", "Stomach", "Liver"], dose: "10-15g",
    desc: "行氣消食，健脾開胃，回乳消脹。用於食積不消、脘腹脹痛、脾虛食少、乳汁鬱積、乳房脹痛、婦女斷乳。生用消食，炒用回乳。大劑量可回乳。",
    pharm: "含澱粉酶、蛋白分解酶、維生素B、催化分解的酶。促進消化，調節胃腸功能。" },
  { p: "Gu Ya", c: "穀芽", lat: "Setaria italica (germinated)", eng: "Sprouted Millet",
    cat: "Food Stagnation Resolving", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Spleen", "Stomach"], dose: "10-15g",
    desc: "消食和中，健脾開胃。用於食積不消、腹脹口臭、脾胃虛弱、不饑食少。較麥芽性平和，宜於老幼及體虛食少。",
    pharm: "含澱粉酶、麥芽糖、維生素B。促進消化，增進食欲。" },
  { p: "Ji Nei Jin", c: "雞內金", lat: "Endothelium Corneum Gigeriae Galli", eng: "Chicken Gizzard Lining",
    cat: "Food Stagnation Resolving", nat: "NEUTRAL", flav: ["Sweet"],
    merid: ["Spleen", "Stomach", "Small Intestine", "Bladder"], dose: "3-10g",
    desc: "健胃消食，澀精止遺，通淋化石。用於食積不消、嘔吐瀉痢、小兒疳積、遺尿、遺精、石淋澀痛、膽脹脅痛。研末吞服效更佳。",
    pharm: "含胃激素、角蛋白氨基酸。增強胃液分泌、提高胃液酸度與消化力，加速胃排空。可溶解結石。" },
  { p: "Lai Fu Zi", c: "萊菔子", lat: "Raphanus sativus (radish seed)", eng: "Radish Seed",
    cat: "Food Stagnation Resolving", nat: "NEUTRAL", flav: ["Pungent", "Sweet"],
    merid: ["Lung", "Spleen", "Stomach"], dose: "5-12g",
    desc: "消食除脹，降氣化痰。用於飲食停滯、脘腹脹痛、大便秘結、積滯瀉痢、痰壅喘咳。生用催吐，炒用消食。注意：不宜與人參同用，恐減人參補益之功。",
    pharm: "含揮發油、脂肪油、芥子鹼。具有抗菌、降壓、止咳化痰、調節胃腸蠕動作用。" },
];

interface HDI {
  herb: string;          // pinyin
  drugName: string;
  drugClass?: string;
  mechanism: Mechanism;
  severity: Severity;
  mechanismText: string;
  clinicalEffect: string;
  management: string;
  evidenceQuality: SafetyEvidence;
  references?: string;
}

const HERB_DRUG: HDI[] = [
  // ── Anticoagulant / antiplatelet bleeding risk ───────────────
  { herb: "Dan Shen", drugName: "Warfarin", drugClass: "Vitamin K antagonist",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "丹參酮抑制血小板聚集並可能影響CYP2C9代謝華法林，多重機制協同增加出血風險。",
    clinicalEffect: "INR升高、出血傾向（牙齦出血、皮下瘀斑、消化道出血）、顱內出血風險。",
    management: "避免合用。如必須合用，密切監測INR，每週1-2次直至穩定，並監測出血徵象。",
    evidenceQuality: "ESTABLISHED",
    references: "Yu CM et al., Eur J Clin Pharmacol 1997 — case reports of INR >8.0 after Dan Shen addition." },
  { herb: "Dang Gui", drugName: "Warfarin", drugClass: "Vitamin K antagonist",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "當歸含香豆素類成分，與華法林協同抗凝；阿魏酸抑制血小板聚集。",
    clinicalEffect: "INR顯著升高（報告達4.05-4.9），消化道與皮下出血。",
    management: "避免合用。患者應告知服用任何含當歸的中藥或食補製劑。",
    evidenceQuality: "ESTABLISHED",
    references: "Page RL, Lawrence JD. Pharmacotherapy 1999, 19:870-6." },
  { herb: "Hong Hua", drugName: "Warfarin", drugClass: "Vitamin K antagonist",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "紅花黃色素抑制血小板聚集和血栓形成，與華法林抗凝作用協同。",
    clinicalEffect: "出血風險顯著增加。",
    management: "避免合用。必要時嚴密監測INR與出血徵象。",
    evidenceQuality: "PROBABLE" },
  { herb: "San Qi", drugName: "Warfarin", drugClass: "Vitamin K antagonist",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "三七雙向調節：止血但同時三七總皂苷有抗血小板作用。整體淨效應為增加出血風險。",
    clinicalEffect: "可能延長出血時間。",
    management: "避免長期合用。圍手術期及監測INR。",
    evidenceQuality: "PROBABLE" },
  { herb: "Yin Xing Ye", drugName: "Warfarin", drugClass: "Vitamin K antagonist",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "銀杏內酯為強效PAF（血小板活化因子）拮抗劑，抑制血小板聚集。",
    clinicalEffect: "與華法林、阿司匹林、氯吡格雷合用顯著增加出血風險，包括自發性硬膜下血腫。",
    management: "避免合用。手術前2週停用。",
    evidenceQuality: "ESTABLISHED",
    references: "Rosenblatt M, Mindel J. NEJM 1997, 336:1108. Bent S et al. J Gen Intern Med 2005." },
  { herb: "Yin Xing Ye", drugName: "Aspirin", drugClass: "Antiplatelet",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "雙重抗血小板機制疊加。",
    clinicalEffect: "自發性出血、眼前房積血、硬膜下出血報告。",
    management: "避免合用。",
    evidenceQuality: "ESTABLISHED" },
  { herb: "Dan Shen", drugName: "Aspirin", drugClass: "Antiplatelet",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "抗血小板效應疊加。",
    clinicalEffect: "出血風險增加。",
    management: "可在心血管中藥複方中見到此組合，應在醫師監督下使用並監測出血。",
    evidenceQuality: "PROBABLE" },

  // ── Cyclosporine / immunosuppressants ────────────────────────
  { herb: "Huang Lian", drugName: "Cyclosporine", drugClass: "Calcineurin inhibitor",
    mechanism: "PHARMACOKINETIC", severity: "MAJOR",
    mechanismText: "黃連素（berberine）抑制CYP3A4和P-糖蛋白，提高環孢素血藥濃度。",
    clinicalEffect: "環孢素濃度升高約30-50%，腎毒性與神經毒性風險增加。",
    management: "避免合用。如必須合用，監測環孢素血藥濃度並適度減量。",
    evidenceQuality: "ESTABLISHED",
    references: "Wu X et al., Eur J Clin Pharmacol 2005 — healthy volunteer PK study." },

  // ── Digoxin ──────────────────────────────────────────────────
  { herb: "Gan Cao", drugName: "Digoxin", drugClass: "Cardiac glycoside",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "甘草酸引起鉀離子排泄增加，導致低鉀血症，使心肌對地高辛更敏感。",
    clinicalEffect: "地高辛中毒風險升高（心律失常、噁心、視覺異常）。",
    management: "避免長期大劑量甘草。如合用，監測血鉀、地高辛濃度與心律。",
    evidenceQuality: "ESTABLISHED" },
  { herb: "Gan Cao", drugName: "Spironolactone", drugClass: "Potassium-sparing diuretic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "甘草引起鉀流失與螺內酯保鉀作用相對抗，但同時甘草引起鈉水瀦留與螺內酯排鈉作用相對抗。",
    clinicalEffect: "藥效降低、可能高血壓加重。",
    management: "避免合用，或選擇更短療程。",
    evidenceQuality: "PROBABLE" },

  // ── Antihypertensives ─────────────────────────────────────────
  { herb: "Gan Cao", drugName: "Antihypertensive drugs", drugClass: "ACE inhibitor / ARB / diuretic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "甘草酸具有醛固酮樣作用，導致鈉水瀦留與血壓升高，對抗降壓藥效果。",
    clinicalEffect: "降壓藥療效降低，可能難治性高血壓。",
    management: "高血壓患者應限制甘草攝入（不超過2g/天，或每月不超過1週）。",
    evidenceQuality: "ESTABLISHED" },
  { herb: "Ma Huang", drugName: "MAO inhibitors", drugClass: "Antidepressant",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "麻黃含麻黃鹼為間接擬交感神經藥，MAOI抑制酪胺等血管活性胺降解，協同引發高血壓危象。",
    clinicalEffect: "嚴重高血壓、心律失常、出血性中風。",
    management: "禁止合用。MAOI停用後至少14天才能使用麻黃。",
    evidenceQuality: "ESTABLISHED" },
  { herb: "Ma Huang", drugName: "Beta-blockers", drugClass: "Antihypertensive",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "麻黃鹼對β受體的興奮被阻斷，但α受體效應保留，可導致無對抗的α作用。",
    clinicalEffect: "嚴重高血壓、心動過緩。",
    management: "避免合用。必要時改用其他擬交感藥替代方案。",
    evidenceQuality: "PROBABLE" },

  // ── Antidiabetics ────────────────────────────────────────────
  { herb: "Huang Qi", drugName: "Insulin / Sulfonylureas", drugClass: "Antidiabetic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "黃芪改善胰島素敏感性與β細胞功能，與降糖藥協同。",
    clinicalEffect: "可能引起低血糖。",
    management: "監測血糖，可能需要降糖藥減量。",
    evidenceQuality: "PROBABLE" },
  { herb: "Ren Shen", drugName: "Insulin / Sulfonylureas", drugClass: "Antidiabetic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "人參皂苷可降低空腹血糖與餐後血糖。",
    clinicalEffect: "低血糖風險增加。",
    management: "監測血糖，特別是糖尿病患者開始或停用人參製劑時。",
    evidenceQuality: "PROBABLE" },
  { herb: "Huang Lian", drugName: "Metformin", drugClass: "Biguanide antidiabetic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "黃連素降糖機制與二甲雙胍部分重疊（AMPK激活），協同降糖。",
    clinicalEffect: "可能加強降糖效果，引起低血糖。",
    management: "監測血糖；低血糖風險增加時減量降糖藥。",
    evidenceQuality: "ESTABLISHED" },

  // ── CYP3A4 substrates ────────────────────────────────────────
  { herb: "Gan Cao", drugName: "Nifedipine / Statins", drugClass: "CYP3A4 substrates",
    mechanism: "PHARMACOKINETIC", severity: "MODERATE",
    mechanismText: "甘草酸抑制CYP3A4。",
    clinicalEffect: "底物藥物血藥濃度升高，副作用風險增加。",
    management: "短期使用甘草通常安全；長期或大劑量應監測底物藥物副作用。",
    evidenceQuality: "PROBABLE" },

  // ── Theophylline ─────────────────────────────────────────────
  { herb: "Ma Huang", drugName: "Theophylline", drugClass: "Methylxanthine bronchodilator",
    mechanism: "PHARMACODYNAMIC", severity: "MAJOR",
    mechanismText: "麻黃鹼+茶鹼均為CNS興奮劑與支氣管擴張劑，效應疊加。",
    clinicalEffect: "心律失常、震顫、失眠、噁心、癲癇。",
    management: "避免合用。呼吸科應警惕患者自行使用麻黃湯/麻黃製劑。",
    evidenceQuality: "ESTABLISHED" },

  // ── Phenytoin ────────────────────────────────────────────────
  { herb: "Gan Cao", drugName: "Phenytoin", drugClass: "Antiepileptic",
    mechanism: "PHARMACOKINETIC", severity: "MODERATE",
    mechanismText: "甘草酸抑制肝臟CYP2C9（苯妥英主要代謝酶）。",
    clinicalEffect: "苯妥英血濃度升高，毒性風險增加（共濟失調、眼震、嗜睡）。",
    management: "避免合用，或監測苯妥英血藥濃度。",
    evidenceQuality: "SUSPECTED" },

  // ── PPI / H2 blockers ────────────────────────────────────────
  { herb: "Da Huang", drugName: "Antacids / PPI", drugClass: "Acid suppressant",
    mechanism: "PHARMACOKINETIC", severity: "MINOR",
    mechanismText: "胃酸是大黃蒽醌類成分活性所必需的pH條件，制酸藥可能降低其瀉下效果。",
    clinicalEffect: "瀉下作用減弱。",
    management: "錯開服藥時間（間隔2小時）。",
    evidenceQuality: "PROBABLE" },

  // ── Antibiotic chelation ─────────────────────────────────────
  { herb: "Long Gu", drugName: "Tetracyclines / Fluoroquinolones", drugClass: "Antibiotics",
    mechanism: "PHARMACOKINETIC", severity: "MODERATE",
    mechanismText: "龍骨富含鈣離子與抗生素的羧基/磷酸基形成不溶性螯合物。",
    clinicalEffect: "抗生素吸收顯著降低。",
    management: "錯開服藥時間至少2-4小時。",
    evidenceQuality: "ESTABLISHED" },
  { herb: "Mu Li", drugName: "Tetracyclines / Fluoroquinolones", drugClass: "Antibiotics",
    mechanism: "PHARMACOKINETIC", severity: "MODERATE",
    mechanismText: "牡蠣含碳酸鈣，金屬螯合作用。",
    clinicalEffect: "抗生素吸收降低。",
    management: "錯開服藥時間至少2-4小時。",
    evidenceQuality: "ESTABLISHED" },

  // ── Sedatives / CNS depressants ──────────────────────────────
  { herb: "Suan Zao Ren", drugName: "Benzodiazepines / Z-drugs", drugClass: "Sedative-hypnotic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "酸棗仁皂苷增強GABA能傳遞，與BZD協同鎮靜。",
    clinicalEffect: "過度鎮靜、嗜睡、精神運動障礙。",
    management: "避免合用，或監測患者反應。",
    evidenceQuality: "PROBABLE" },

  // ── Estrogen sensitivity ─────────────────────────────────────
  { herb: "Bu Gu Zhi", drugName: "Tamoxifen", drugClass: "SERM (anti-estrogen)",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "補骨脂含光敏素，具雌激素樣活性，與他莫昔芬抗雌激素作用相對抗。",
    clinicalEffect: "他莫昔芬療效降低（在乳腺癌患者中）。",
    management: "ER陽性乳腺癌患者避免服用補骨脂及其複方。",
    evidenceQuality: "SUSPECTED" },

  // ── Hepatotoxicity ───────────────────────────────────────────
  { herb: "He Shou Wu", drugName: "Statins", drugClass: "HMG-CoA reductase inhibitor",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "何首烏可致特異質性肝損傷，與他汀類肝毒性疊加。",
    clinicalEffect: "肝功能異常風險增加（ALT/AST升高）。",
    management: "肝病患者避免合用；如合用每3-6個月監測肝功能。",
    evidenceQuality: "PROBABLE" },
  { herb: "Bu Gu Zhi", drugName: "Methotrexate", drugClass: "DMARD",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "兩者均具肝毒性，協同增加肝損傷風險。",
    clinicalEffect: "肝功能異常、轉氨酶升高。",
    management: "避免合用，或嚴密監測肝功能。",
    evidenceQuality: "SUSPECTED" },

  // ── Vitamin K reversal ───────────────────────────────────────
  { herb: "Da Huang", drugName: "Loop diuretics / Thiazides", drugClass: "Diuretic",
    mechanism: "PHARMACODYNAMIC", severity: "MODERATE",
    mechanismText: "大黃長期使用導致鉀流失與利尿藥協同。",
    clinicalEffect: "嚴重低鉀血症、心律失常。",
    management: "避免長期合用。短期使用監測血鉀。",
    evidenceQuality: "PROBABLE" },
];

interface HHI {
  a: string; b: string; type: ClassicalType; severity: Severity;
  source: string; description: string;
}

const HERB_HERB: HHI[] = [
  // ── 十八反 (eighteen incompatibilities) — Fu Zi/Wu Tou class
  { a: "Fu Zi", b: "Ban Xia", type: "XIANG_FAN", severity: "MAJOR",
    source: "本草明言十八反歌訣",
    description: "烏頭/附子反半夏。古訓「半蔞貝蘞及攻烏」。同用可能增強烏頭鹼毒性，致心律失常、抽搐。現代部分經方雖有合用先例，仍應嚴格控制劑量、炮製與煎煮時間。" },
  { a: "Fu Zi", b: "Chuan Bei Mu", type: "XIANG_FAN", severity: "MAJOR",
    source: "本草明言十八反歌訣",
    description: "烏頭/附子反貝母。理論上烏頭鹼毒性可能增強。臨床應避免同用。" },
  { a: "Fu Zi", b: "Bai Shao", type: "XIANG_FAN", severity: "THEORETICAL",
    source: "本草明言十八反歌訣",
    description: "古籍記載「諸參辛芍叛藜蘆」中的芍藥；附子+白芍部分經方（如桂枝加附子湯、芍藥甘草附子湯）有合用先例，現代多認為臨床安全。" },

  // ── 十八反 — Gan Cao class
  { a: "Gan Cao", b: "Hai Zao", type: "XIANG_FAN", severity: "MODERATE",
    source: "本草明言十八反歌訣",
    description: "甘草反海藻。古訓「藻戟遂芫俱戰草」。現代研究發現某些海藻成分與甘草同用可能加重鈉水瀦留。" },

  // ── 十八反 — Li Lu class (need both in DB; Li Lu not in DB)

  // ── 十九畏 (nineteen mutual antagonisms)
  { a: "Ren Shen", b: "Lai Fu Zi", type: "XIANG_WU", severity: "MODERATE",
    source: "十九畏歌訣",
    description: "人參畏萊菔子。古訓「人參最怕五靈脂，紅芸萊菔莫相依」。萊菔子破氣，同用減弱人參補氣作用。需補虛時不宜合用。" },
  { a: "Rou Gui", b: "Chi Shi Zhi", type: "XIANG_WU", severity: "THEORETICAL",
    source: "十九畏歌訣",
    description: "肉桂畏赤石脂。古訓「官桂善能調冷氣，若逢石脂便相欺」。傳統認為相互減效。" },

  // ── 相須 (mutual reinforcement, beneficial)
  { a: "Long Gu", b: "Mu Li", type: "XIANG_XU", severity: "MINOR",
    source: "歷代方書",
    description: "龍骨與牡蠣相須為用，潛陽固澀。如桂枝加龍骨牡蠣湯、生脈龍牡飲。協同鎮靜安神、收斂固澀。為有益配伍而非反畏。" },
  { a: "Ma Huang", b: "Gui Zhi", type: "XIANG_XU", severity: "MINOR",
    source: "傷寒論",
    description: "麻黃配桂枝相須為用，發汗解表力增。麻黃湯主對配。為有益配伍。" },
  { a: "Shi Gao", b: "Zhi Mu", type: "XIANG_XU", severity: "MINOR",
    source: "傷寒論 / 白虎湯",
    description: "石膏配知母相須為用，清熱瀉火滋陰。白虎湯之核心配對。為有益配伍。" },
  { a: "Huang Lian", b: "Wu Zhu Yu", type: "XIANG_SHA", severity: "MINOR",
    source: "丹溪心法 / 左金丸",
    description: "黃連配吳茱萸6:1（左金丸）。吳茱萸辛熱可制黃連大寒之偏，並引藥入肝。為相佐配伍。" },

  // ── Modern pharmacological cautions
  { a: "Hong Hua", b: "Tao Ren", type: "XIANG_XU", severity: "MINOR",
    source: "歷代活血方",
    description: "紅花配桃仁相須為用，活血祛瘀力增（桃紅四物湯、血府逐瘀湯）。注意累積性抗血小板效應，與抗凝藥合用增加出血風險。" },
  { a: "Dan Shen", b: "Hong Hua", type: "XIANG_XU", severity: "MINOR",
    source: "現代心血管中藥",
    description: "丹參配紅花在現代心血管中藥（如丹紅注射液）中相須為用。注意與抗血小板/抗凝藥的累積出血風險。" },
  { a: "Fu Zi", b: "Gan Cao", type: "XIANG_SHA", severity: "MINOR",
    source: "傷寒論 / 多方",
    description: "附子配甘草相殺：甘草能緩解附子毒性，是經方中附子常用配伍（四逆湯、芍藥甘草附子湯）。為相殺配伍，有益。" },
  { a: "Da Huang", b: "Gan Cao", type: "XIANG_SHA", severity: "MINOR",
    source: "歷代方書",
    description: "大黃配甘草，甘草能緩急止痛並減輕大黃峻下副作用。為相殺配伍。" },
];

interface CON {
  herb: string; condition: string; severity: Severity;
  description: string; pregnancy?: Pregnancy;
}

const CONTRAS: CON[] = [
  // ── Pregnancy contraindicated ─────────────────────────────
  { herb: "Hong Hua", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "紅花活血化瘀力強，可興奮子宮，引起流產或早產。妊娠期禁用。" },
  { herb: "Tao Ren", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "桃仁活血祛瘀，孕婦及月經過多者禁用。" },
  { herb: "Da Huang", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "大黃峻下，刺激子宮收縮，並可通過乳汁影響嬰兒。妊娠及哺乳期禁用。" },
  { herb: "Mang Xiao", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "芒硝峻下軟堅，可刺激子宮收縮致流產。妊娠期禁用。" },
  { herb: "Fan Xie Ye", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "番瀉葉刺激性瀉下，可引起子宮收縮。妊娠期、月經期、哺乳期禁用。" },
  { herb: "San Qi", condition: "Pregnancy", severity: "MODERATE", pregnancy: "CAUTION",
    description: "三七活血止血雙向作用。孕婦慎用，特別是孕早期。" },
  { herb: "Yi Mu Cao", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "益母草興奮子宮，妊娠期禁用。產後可用於促進子宮復舊。" },
  { herb: "Niu Xi", condition: "Pregnancy", severity: "MODERATE", pregnancy: "CAUTION",
    description: "牛膝活血通經，引血下行。孕婦慎用，月經過多者慎用。" },
  { herb: "Fu Zi", condition: "Pregnancy", severity: "MAJOR", pregnancy: "CONTRAINDICATED",
    description: "附子有大毒，烏頭鹼可致心律失常。妊娠期禁用。" },
  { herb: "Ban Xia", condition: "Pregnancy", severity: "MODERATE", pregnancy: "CAUTION",
    description: "半夏古籍列為孕婦慎用。經薑製後（薑半夏）相對較安全，但仍建議僅在中醫師監督下使用。" },

  // ── Condition-based contraindications ───────────────────────
  { herb: "Ma Huang", condition: "Hypertension", severity: "MAJOR",
    description: "麻黃含麻黃鹼為擬交感藥，升高血壓。高血壓、冠心病、心律失常患者禁用。" },
  { herb: "Ma Huang", condition: "Hyperthyroidism", severity: "MAJOR",
    description: "麻黃鹼興奮交感神經，加重甲亢心動過速、震顫。甲亢患者禁用。" },
  { herb: "Gan Cao", condition: "Hypertension / Heart Failure", severity: "MODERATE",
    description: "甘草酸引起鈉水瀦留，加重高血壓與心衰。長期大劑量使用禁忌；短期一般劑量可在監測下使用。" },
  { herb: "Gan Cao", condition: "Hypokalemia", severity: "MODERATE",
    description: "甘草引起鉀流失，加重低鉀血症（特別是合用利尿劑時）。" },
  { herb: "Xi Xin", condition: "Renal disease", severity: "MAJOR",
    description: "細辛含微量馬兜鈴酸（非根莖部分），長期或過量使用有腎毒性。腎功能不全者禁用。劑量「不過錢」（約3g）。" },
  { herb: "Bu Gu Zhi", condition: "Liver disease", severity: "MAJOR",
    description: "補骨脂可致特異質性肝損傷。肝病患者禁用，常人使用建議監測肝功能。" },
  { herb: "He Shou Wu", condition: "Liver disease", severity: "MAJOR",
    description: "何首烏特別是生品，與特異質性肝損傷相關。已有多例報告。肝病患者禁用，使用前後監測肝功能。" },
  { herb: "Da Huang", condition: "Chronic constipation", severity: "MODERATE",
    description: "長期使用大黃可致結腸黑變病、腸神經叢損傷與依賴性，反致頑固性便秘。應限於短期使用。" },
  { herb: "Fu Zi", condition: "Cardiovascular disease", severity: "MAJOR",
    description: "附子含烏頭鹼有強心毒性，可致致命性心律失常。心臟病患者慎用，必須先煎30-60分鐘以分解烏頭鹼。" },
  { herb: "Lu Rong", condition: "Yin deficiency with heat", severity: "MODERATE",
    description: "鹿茸大溫補腎陽，陰虛火旺、實熱證、外感發熱者禁用，否則助火傷陰。" },
  { herb: "Ren Shen", condition: "Excess heat / Hypertension", severity: "MODERATE",
    description: "人參溫補。實熱、肝陽上亢、感冒初起者禁用。高血壓患者慎用。" },
];

async function main() {
  console.log(`\n[enrich-3] Safety data: ${HERBS.length} herbs · ${HERB_DRUG.length} herb-drug · ${HERB_HERB.length} herb-herb · ${CONTRAS.length} contraindications\n`);

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
    console.log(`  ✓ herb: ${h.c} (${h.p})`);
    hc++;
  }

  // ── Step 2: herb-drug interactions ───────────────────────
  let hdiCount = 0;
  const missingHdi = new Set<string>();
  for (const i of HERB_DRUG) {
    const herb = await prisma.herb.findFirst({ where: { pinyinName: i.herb } });
    if (!herb) { missingHdi.add(i.herb); continue; }
    const dup = await prisma.herbDrugInteraction.findFirst({
      where: { herbId: herb.id, drugName: i.drugName },
    });
    if (dup) { continue; }
    await prisma.herbDrugInteraction.create({
      data: {
        herbId: herb.id, drugName: i.drugName, drugClass: i.drugClass,
        interactionType: i.mechanism, severity: i.severity,
        mechanism: i.mechanismText, clinicalEffect: i.clinicalEffect,
        management: i.management, evidenceQuality: i.evidenceQuality,
        references: i.references,
      },
    });
    console.log(`  ✓ ${i.severity} HDI: ${i.herb} ↔ ${i.drugName}`);
    hdiCount++;
  }

  // ── Step 3: herb-herb interactions ───────────────────────
  let hhiCount = 0;
  const missingHhi = new Set<string>();
  for (const i of HERB_HERB) {
    const a = await prisma.herb.findFirst({ where: { pinyinName: i.a } });
    const b = await prisma.herb.findFirst({ where: { pinyinName: i.b } });
    if (!a) missingHhi.add(i.a);
    if (!b) missingHhi.add(i.b);
    if (!a || !b) continue;
    const dup = await prisma.herbHerbInteraction.findFirst({
      where: { OR: [{ herbAId: a.id, herbBId: b.id }, { herbAId: b.id, herbBId: a.id }] },
    });
    if (dup) { continue; }
    await prisma.herbHerbInteraction.create({
      data: {
        herbAId: a.id, herbBId: b.id, interactionType: i.type,
        severity: i.severity, classicalSource: i.source, description: i.description,
      },
    });
    console.log(`  ✓ ${i.type} HHI: ${i.a} ↔ ${i.b}`);
    hhiCount++;
  }

  // ── Step 4: contraindications ────────────────────────────
  let cCount = 0;
  const missingC = new Set<string>();
  for (const c of CONTRAS) {
    const herb = await prisma.herb.findFirst({ where: { pinyinName: c.herb } });
    if (!herb) { missingC.add(c.herb); continue; }
    const dup = await prisma.herbContraindication.findFirst({
      where: { herbId: herb.id, condition: c.condition },
    });
    if (dup) { continue; }
    await prisma.herbContraindication.create({
      data: {
        herbId: herb.id, condition: c.condition, severity: c.severity,
        description: c.description, pregnancyCategory: c.pregnancy,
      },
    });
    console.log(`  ✓ Contra: ${c.herb} — ${c.condition} [${c.severity}]`);
    cCount++;
  }

  console.log(`\n[enrich-3] +${hc} herbs · +${hdiCount} herb-drug · +${hhiCount} herb-herb · +${cCount} contraindications`);
  if (missingHdi.size > 0) console.log(`  ⚠ Missing herbs (HDI): ${[...missingHdi].sort().join(", ")}`);
  if (missingHhi.size > 0) console.log(`  ⚠ Missing herbs (HHI): ${[...missingHhi].sort().join(", ")}`);
  if (missingC.size > 0) console.log(`  ⚠ Missing herbs (contra): ${[...missingC].sort().join(", ")}`);

  const [hCount, hdiTotal, hhiTotal, cTotal] = await Promise.all([
    prisma.herb.count(),
    prisma.herbDrugInteraction.count(),
    prisma.herbHerbInteraction.count(),
    prisma.herbContraindication.count(),
  ]);
  console.log(`\n  DB: ${hCount} herbs · ${hdiTotal} HDI · ${hhiTotal} HHI · ${cTotal} contraindications`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
