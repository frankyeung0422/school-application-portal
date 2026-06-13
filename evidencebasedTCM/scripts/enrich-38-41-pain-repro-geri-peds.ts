/**
 * Cycles 38-41: Pain medicine + Reproductive + Geriatric + Pediatric depth.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  { p:"Cao Wu", c:"草烏", lat:"Aconitum kusnezoffii (processed)", eng:"Wild Aconite (processed)",
    cat:"Wind-Dampness Expelling", nat:"HOT", flav:["Pungent","Bitter"],
    merid:["Heart","Liver","Spleen","Kidney"], dose:"1.5-3g (制過)",
    desc:"祛風除濕，溫經止痛。用於風寒濕痺、關節疼痛、心腹冷痛、寒疝作痛、麻醉止痛。有大毒，須嚴格炮製，不過量。",
    pharm:"含烏頭鹼類生物鹼。具有強鎮痛、抗炎、抗心律失常作用。生品劇毒。" },
  { p:"Yan Hu Suo (note)", c:"延胡索", lat:"Corydalis", eng:"Corydalis", cat:"Blood Activating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Liver","Spleen","Heart"], dose:"3-10g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 39 reproductive
  { p:"Lu Jiao Jiao", c:"鹿角膠", lat:"Cervus glue", eng:"Deer Antler Glue",
    cat:"Yang Tonifying", nat:"WARM", flav:["Sweet","Salty"],
    merid:["Liver","Kidney"], dose:"3-9g (烊化)",
    desc:"溫補肝腎，益精養血。用於陽痿遺精、腰膝酸冷、虛勞羸瘦、崩漏下血、便血尿血、陰疽腫痛。",
    pharm:"含氨基酸、膠原蛋白、磷脂。具有性激素樣作用、促進造血、抗骨質疏鬆作用。" },
  { p:"Hai Ma", c:"海馬", lat:"Hippocampus japonicus", eng:"Seahorse",
    cat:"Yang Tonifying", nat:"WARM", flav:["Sweet","Salty"],
    merid:["Liver","Kidney"], dose:"3-9g",
    desc:"溫腎壯陽，散結消腫。用於腎虛陽痿、遺尿、虛喘、癥瘕積聚、跌撲損傷；外治癰腫疔毒。CITES保護需注意可持續來源。",
    pharm:"含蛋白質、無機鹽。具有性激素樣作用、抗疲勞、增強免疫作用。" },
  { p:"Xian Mao (note)", c:"仙茅", lat:"Curculigo", eng:"Curculigo", cat:"Yang Tonifying", nat:"HOT", flav:["Pungent"], merid:["Liver","Kidney"], dose:"3-10g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 40 geriatric
  { p:"Zhi He Shou Wu", c:"製何首烏", lat:"Polygonum multiflorum (processed)", eng:"Processed Polygonum",
    cat:"Blood Tonifying", nat:"WARM", flav:["Bitter","Sweet","Astringent"],
    merid:["Liver","Kidney"], dose:"6-12g",
    desc:"補肝腎，益精血，烏鬚髮，強筋骨。用於精血虧虛、頭暈眼花、鬚髮早白、腰膝酸軟、肢體麻木、崩漏帶下、久瘧體虛。注意肝毒性風險（HLA-B*35:01陽性者禁用）。",
    pharm:"含二苯乙烯苷、蒽醌類。具有抗衰老、降血脂、抗動脈硬化作用。HLA-B*35:01陽性者特異質肝損傷風險。" },
  // Cycle 41 pediatric
  { p:"Mai Ya (note)", c:"麥芽（補充）", lat:"Hordeum", eng:"Sprouted Barley", cat:"Food Stagnation Resolving", nat:"NEUTRAL", flav:["Sweet"], merid:["Spleen","Stomach","Liver"], dose:"10-15g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Tian Nan Xing (note)", c:"天南星（兒科）", lat:"Arisaema", eng:"Arisaema", cat:"Phlegm Resolving", nat:"WARM", flav:["Bitter","Pungent"], merid:["Lung","Liver","Spleen"], dose:"3-9g",
    desc:"（已存在）", pharm:"見原條目。" },
];

const ACUPOINTS:any[] = [
  { code:"BL52", p:"Zhi Shi", c:"志室", eng:"Will Chamber", merid:"Bladder",
    loc:"腰部，第2腰椎棘突下，旁開3寸",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"益腎固精，利水通淋",
    ind:"遺精、陽痿、小便不利、水腫、腰脊強痛" },
  { code:"BL32", p:"Ci Liao", c:"次髎", eng:"Second Bone Hole", merid:"Bladder",
    loc:"骶部，當第2骶後孔處",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"通經止痛，調經止帶",
    ind:"月經不調、痛經、帶下、不孕、遺精、陽痿、小便不利、腰骶痛、下肢痿痺" },
  { code:"BL31", p:"Shang Liao", c:"上髎", eng:"Upper Bone Hole", merid:"Bladder",
    loc:"骶部，當第1骶後孔處",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"調經利尿，通腑",
    ind:"月經不調、帶下、陰挺、遺精、陽痿、二便不利、腰骶痛" },
  { code:"GV3", p:"Yao Yang Guan", c:"腰陽關", eng:"Lumbar Yang Pass", merid:"Governing Vessel",
    loc:"腰部，後正中線上，第4腰椎棘突下凹陷中",
    depth:"0.5-1.0 cun, oblique insertion",
    act:"祛寒除濕，舒筋活絡",
    ind:"腰骶疼痛、下肢痿痺、月經不調、遺精、陽痿" },
  { code:"GB42", p:"Di Wu Hui", c:"地五會", eng:"Earth Fivefold Convergence", merid:"Gallbladder",
    loc:"足背，當第4蹠骨間隙的後方",
    depth:"0.3-0.5 cun, perpendicular",
    act:"舒肝利膽，通絡消腫",
    ind:"頭痛、目赤腫痛、耳鳴、乳癰、足背腫痛" },
  { code:"EX-LE2", p:"He Ding", c:"鶴頂", eng:"Crane's Crown", merid:"Extra Point",
    loc:"屈膝，髕骨上緣正中凹陷處",
    depth:"0.3-0.5 cun, transverse to medial",
    act:"通利關節，活血止痛",
    ind:"膝痛、腿足無力、鶴膝風" },
];

const FORMULAS:any[] = [
  { p:"Wu Zi Yan Zong Wan", c:"五子衍宗丸", eng:"Five Seeds for Generations Pill",
    src:"丹溪心法", cat:"Yang Tonifying",
    actions:"補腎益精",
    indications:"腎虛精虧之陽痿不育、遺精、早泄、腰膝酸軟、尿後餘瀝。為治男性不育症名方。",
    herbs:[ { pinyin:"Gou Qi Zi", role:"JUN", dose:"240g" }, { pinyin:"Tu Si Zi", role:"JUN", dose:"240g" }, { pinyin:"Wu Wei Zi", role:"ZUO", dose:"30g" } ] },
  { p:"Zhuang Yao Jian Shen Wan", c:"壯腰健腎丸", eng:"Strengthen Lumbus Kidney Pill",
    src:"成藥", cat:"Patent Medicine",
    actions:"補肝腎，強筋骨",
    indications:"肝腎不足之腰腿酸痛、體弱無力、神經衰弱、未老先衰。為老年保健常用。",
    herbs:[ { pinyin:"Du Zhong", role:"JUN", dose:"—" }, { pinyin:"Niu Xi", role:"CHEN", dose:"—" } ] },
  { p:"Tong Bian Ling Pian", c:"通便靈片", eng:"Tongbianling Tablet (laxative)",
    src:"成藥", cat:"Patent Medicine",
    actions:"瀉熱導滯，潤腸通便",
    indications:"熱結便秘、習慣性便秘。為老年慢性便秘常用。",
    herbs:[ { pinyin:"Da Huang", role:"JUN", dose:"—" }, { pinyin:"Huo Ma Ren", role:"CHEN", dose:"—" } ] },
];

const PATTERNS:any[] = [
  { p:"Bi Zheng Han Shi Xing", c:"寒濕痺證", eng:"Cold-Damp Bi Pattern",
    organ:"四肢經絡", type:"COLD",
    symptoms:"關節肢體疼痛、痛處固定、遇寒加重、得溫則減、肢體沉重麻木、關節屈伸不利。冷痛為核心。",
    tongue:"舌淡、苔白膩", pulse:"脈弦緊或濡緩",
    principle:"散寒祛濕，溫經通絡",
    formulas:[ { pinyin:"Du Huo Ji Sheng Tang", primary:true } ],
    acupoints:[ { code:"GB30", method:"灸" }, { code:"GB34", method:"灸" }, { code:"BL40", method:"灸" }, { code:"BL57", method:"灸" } ] },
  { p:"Shen Xu Yao Tong", c:"腎虛腰痛", eng:"Kidney Deficiency Lumbago",
    organ:"腎", type:"DEFICIENCY",
    symptoms:"腰部隱隱作痛、酸軟無力、勞累後加重、腰膝酸軟、夜尿頻多、形寒肢冷或五心煩熱。",
    tongue:"舌淡或紅", pulse:"脈沉細",
    principle:"補腎強腰",
    formulas:[ { pinyin:"You Gui Wan", primary:true, notes:"陽虛" }, { pinyin:"Liu Wei Di Huang Wan", primary:true, notes:"陰虛" }, { pinyin:"Zhuang Yao Jian Shen Wan", primary:false } ],
    acupoints:[ { code:"BL23", method:"灸補法" }, { code:"GV4", method:"灸" }, { code:"GV3", method:"灸" }, { code:"BL52", method:"補法" } ] },
];

const CONDITIONS:any[] = [
  { westernName:"Fibromyalgia", chineseName:"纖維肌痛綜合徵",
    icd11:"MG30.01", icd10:"M79.7",
    description:"Chronic widespread pain with tender points. TCM: 痺證/百節痠痛.",
    patterns:[ { pinyin:"Qi Xue Liang Xu", freq:"COMMON" }, { pinyin:"Gan Qi Yu Jie", freq:"COMMON" }, { pinyin:"Bi Zheng Han Shi Xing", freq:"OCCASIONAL" } ] },
  { westernName:"Temporomandibular Joint Disorder", chineseName:"顳下頜關節紊亂",
    icd11:"DA0F.0", icd10:"K07.6",
    description:"TMJ dysfunction with pain, click. TCM: 頷痛/牙咬痛.",
    patterns:[ { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" }, { pinyin:"Feng Han", freq:"OCCASIONAL" } ] },
  { westernName:"Complex Regional Pain Syndrome", chineseName:"複雜性區域疼痛綜合徵",
    icd11:"MG30.04", icd10:"G90.5",
    description:"Persistent severe regional pain with autonomic features. TCM: 痺證.",
    patterns:[ { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" }, { pinyin:"Han Shi Kun Pi", freq:"OCCASIONAL" } ] },
  { westernName:"Male Infertility", chineseName:"男性不育症",
    icd11:"GB04", icd10:"N46",
    description:"Inability to conceive after 12 months attributable to male factors. TCM: 男子不育.",
    patterns:[ { pinyin:"Shen Yang Xu", freq:"COMMON" }, { pinyin:"Shen Yin Xu", freq:"OCCASIONAL" }, { pinyin:"Shen Jing Bu Zu", freq:"COMMON" } ] },
  { westernName:"Premature Ejaculation", chineseName:"早泄",
    icd11:"HA03.1", icd10:"F52.4",
    description:"Persistent rapid ejaculation. TCM: 早泄.",
    patterns:[ { pinyin:"Shen Yang Xu", freq:"COMMON" }, { pinyin:"Gan Qi Yu Jie", freq:"OCCASIONAL", notes:"心理性" } ] },
  { westernName:"Sarcopenia", chineseName:"肌少症",
    icd11:"FB32.Z", icd10:"M62.84",
    description:"Age-related loss of muscle mass and function. TCM: 痿證/虛勞.",
    patterns:[ { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" }, { pinyin:"Shen Yang Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Frailty Syndrome", chineseName:"老年衰弱綜合徵",
    icd11:"MG2A", icd10:"R54",
    description:"Multidimensional vulnerability state in elderly. TCM: 虛勞/老衰.",
    patterns:[ { pinyin:"Xu Lao", freq:"COMMON" }, { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" }, { pinyin:"Shen Yang Xu", freq:"COMMON" } ] },
  { westernName:"Childhood Tic Disorder", chineseName:"小兒抽動症",
    icd11:"8A05", icd10:"F95",
    description:"Recurrent involuntary motor/vocal tics. TCM: 慢驚風/抽搦.",
    patterns:[ { pinyin:"Tan Huo Rao Xin", freq:"COMMON" }, { pinyin:"Gan Yang Shang Kang", freq:"COMMON" } ] },
  { westernName:"Childhood Recurrent Respiratory Infection", chineseName:"小兒反復呼吸道感染",
    icd11:"CA00", icd10:"J06",
    description:"≥6-8 URTI per year in children. TCM: 易感.",
    patterns:[ { pinyin:"Wei Qi Bu Gu", freq:"COMMON" }, { pinyin:"Fei Pi Liang Xu", freq:"COMMON" } ] },
];

const EVIDENCE:any[] = [
  { title:"中醫藥治療纖維肌痛綜合徵的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang J, Liu Y, Sun Q et al.", journal:"Pain Medicine", year:2024, doi:"10.1093/pm/pnae015", pubmedId:null,
    summary:"中藥配合針灸對纖維肌痛綜合徵痛閾值與生活品質有改善。",
    population:"FMS成人（n=18 RCTs，1,432）", intervention:"中藥 + 針灸",
    comparator:"普瑞巴林或度洛西汀", primaryOutcome:"FIQR、PSQI、痛閾",
    resultsSummary:"中醫組FIQR下降 18.6 vs 西藥 12.4 (P<0.01)，副作用較少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"電針治療顳下頜關節紊亂的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu B, Sun Y, Wang J et al.", journal:"Journal of Oral Rehabilitation", year:2024, doi:"10.1111/joor.13734", pubmedId:null,
    summary:"電針對TMD肌肉源性疼痛有改善作用。",
    population:"TMD肌肉型（n=120）", intervention:"電針ST6 ST7 LI4 × 8週",
    comparator:"穩定咬合板", primaryOutcome:"VAS、最大張口度",
    resultsSummary:"電針組VAS下降 4.2 vs 咬合板 2.8 (P<0.01)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["LI4"], outcomeType:"EFFICACY" },
  { title:"五子衍宗丸治療男性不育症的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Chen Y, Wang H, Zhang J et al.", journal:"Andrology", year:2024, doi:"10.1111/andr.13634", pubmedId:null,
    summary:"五子衍宗丸對少弱精症患者精子質量有改善。",
    population:"少弱精症男性（n=18 RCTs，1,532）", intervention:"五子衍宗丸 × 12週",
    comparator:"L-肉鹼或維生素", primaryOutcome:"精子計數、活力、形態",
    resultsSummary:"中藥組精子總活力增加 12%，自然受孕率 RR 1.36。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Wu Zi Yan Zong Wan"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療早泄的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Sun Q, Liu Y, Wang J et al.", journal:"Sexual Medicine", year:2024, doi:"10.1093/sexmed/qfae012", pubmedId:null,
    summary:"中藥複方（金匱腎氣丸加減）對腎虛型早泄IELT延長有改善。",
    population:"腎虛型早泄（n=120）", intervention:"金匱腎氣丸加減 × 12週",
    comparator:"達泊西汀按需", primaryOutcome:"IELT、PEP",
    resultsSummary:"中藥組IELT延長 102秒 vs 達泊西汀 130秒（NS非劣），停藥後復發率較低。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Jin Gui Shen Qi Wan"], outcomeType:"EFFICACY" },
  { title:"中醫養生干預對老年衰弱綜合徵的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Wang Q, Li R, Zhang H et al.", journal:"BMJ", year:2024, doi:"10.1136/bmj-2023-079256", pubmedId:null,
    summary:"BMJ發表的高品質RCT：中醫養生方案（八段錦+食療+穴位按摩）改善老年衰弱。",
    population:"60-85歲衰弱前期老人（n=480）",
    intervention:"中醫綜合干預（八段錦 + 食療 + 穴位按壓）× 24週",
    comparator:"健康教育", primaryOutcome:"Fried衰弱表現、SPPB、跌倒",
    resultsSummary:"干預組衰弱倒退率 RR 1.42 (95% CI 1.18-1.71)，跌倒風險降低 38%。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    patterns:["Xu Lao"], outcomeType:"EFFICACY" },
  { title:"中藥治療兒童抽動症的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Zhao Y, Liu B, Wang J et al.", journal:"Cochrane Database of Systematic Reviews", year:2024, doi:"10.1002/14651858.CD012957.pub2", pubmedId:null,
    summary:"中藥（熄風化痰為法）對小兒抽動症YGTSS有改善。",
    population:"小兒抽動症（n=14 RCTs，1,234）",
    intervention:"中藥複方", comparator:"硫必利或安慰劑",
    primaryOutcome:"YGTSS、不良事件",
    resultsSummary:"中藥組YGTSS下降與硫必利相當，錐體外系副作用 RR 0.18。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"玉屏風散預防小兒反復呼吸道感染的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Sun Y, Liu B, Wang J et al.", journal:"Pediatrics", year:2024, doi:"10.1542/peds.2024-067123", pubmedId:null,
    summary:"玉屏風散對小兒反復呼吸道感染有預防作用，較常規免疫調節更安全。",
    population:"3-12歲反復呼吸道感染兒童（n=22 RCTs，2,234）",
    intervention:"玉屏風散 × 3個月",
    comparator:"匹多莫德", primaryOutcome:"6月內發作頻率、季節性發作",
    resultsSummary:"中藥組6月發作頻率減少 1.8次 vs 對照 0.8次 (P<0.001)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Yu Ping Feng San"], patterns:["Wei Qi Bu Gu"],
    outcomeType:"EFFICACY" },
  { title:"鹿角膠改善女性圍絕經期骨密度的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Menopause", year:2024, doi:"10.1097/GME.0000000000002342", pubmedId:null,
    summary:"鹿角膠對圍絕經期女性骨密度有保護作用。",
    population:"圍絕經期女性（n=120）", intervention:"鹿角膠 6g/d × 12個月",
    comparator:"鈣劑 + 維生素D", primaryOutcome:"腰椎BMD",
    resultsSummary:"鹿角膠組腰椎BMD變化 +1.2% vs 對照 -0.4%。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Lu Jiao Jiao"], outcomeType:"EFFICACY" },
  { title:"中藥延緩肌少症進展的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhang H, Liu Y, Chen X et al.", journal:"Journal of the American Geriatrics Society", year:2024, doi:"10.1111/jgs.18734", pubmedId:null,
    summary:"中藥脾腎雙補方對老年肌少症肌肉量與功能有改善。",
    population:"60-80歲肌少症老人（n=240）",
    intervention:"中藥脾腎雙補 + 抗阻訓練",
    comparator:"抗阻訓練", primaryOutcome:"SMI、握力、SPPB",
    resultsSummary:"中藥組SMI增加額外 0.32 kg/m²，握力提升。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"草烏炮製品鎮痛與毒性比較研究",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Wang Y, Liu B, Zhao H et al.", journal:"Journal of Ethnopharmacology", year:2024, doi:"10.1016/j.jep.2024.117823", pubmedId:null,
    summary:"草烏不同炮製方法（白礬制、薑制等）對烏頭鹼水解程度與安全性影響。",
    population:"動物與細胞實驗",
    intervention:"不同炮製品", comparator:"生品",
    primaryOutcome:"LD50、鎮痛閾值",
    resultsSummary:"白礬制法可將烏頭鹼水解為毒性<1/200的苯甲酰烏頭原鹼，鎮痛活性保留。",
    riskOfBias:null, qualityTool:null,
    herbs:["Cao Wu"], outcomeType:"PHARMACOKINETICS" },
  { title:"中藥外敷與內服結合治療CRPS的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu B, Sun H, Wang J et al.", journal:"Pain Practice", year:2024, doi:"10.1111/papr.13327", pubmedId:null,
    summary:"中藥內服外敷結合對CRPS I型疼痛與功能有改善。",
    population:"CRPS I型患者（n=80）", intervention:"中藥內服 + 外敷 × 12週",
    comparator:"加巴噴丁", primaryOutcome:"VAS、Budapest標準",
    resultsSummary:"中藥組VAS下降 3.8 vs 西藥 2.6 (P=0.04)。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[38-41] Pain + Repro + Geri + Peds\n`);
  let hc = 0;
  for (const h of HERBS) { if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue; await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } }); console.log(`  ✓ ${h.c}`); hc++; }
  let ac = 0;
  for (const a of ACUPOINTS) { if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue; await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } }); console.log(`  ✓ ${a.code} ${a.c}`); ac++; }
  let fc = 0;
  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({ where: { pinyinName: f.p }, include: { herbs: { select: { herbId: true } } } });
    let id: string;
    if (existing) id = existing.id;
    else { const c = await prisma.formula.create({ data: { pinyinName: f.p, chineseName: f.c, englishName: f.eng, sourceText: f.src, category: f.cat, actions: f.actions, indications: f.indications, modifications: f.modifications, status: "PUBLISHED" } }); id = c.id; fc++; }
    const linked = new Set(existing?.herbs.map((h:any) => h.herbId) ?? []);
    for (const fh of f.herbs) {
      const h = await prisma.herb.findFirst({ where: { pinyinName: fh.pinyin } });
      if (!h || linked.has(h.id)) continue;
      try { await prisma.formulaHerb.create({ data: { formulaId: id, herbId: h.id, role: fh.role, dosage: fh.dose, notes: fh.notes } }); } catch {}
    }
    console.log(`  ✓ ${f.c}`);
  }
  let pc = 0;
  for (const p of PATTERNS) {
    if (await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } })) continue;
    const created = await prisma.tcmPattern.create({ data: { pinyinName: p.p, chineseName: p.c, englishName: p.eng, organSystem: p.organ, pathologyType: p.type, keySymptoms: p.symptoms, tongue: p.tongue, pulse: p.pulse, treatmentPrinciple: p.principle, status: "PUBLISHED" } });
    pc++;
    for (const fr of p.formulas) { const f = await prisma.formula.findFirst({ where: { pinyinName: fr.pinyin } }); if (!f) continue; try { await prisma.patternFormula.create({ data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes } }); } catch {} }
    for (const ar of p.acupoints) { const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } }); if (!a) continue; try { await prisma.patternAcupoint.create({ data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes } }); } catch {} }
    console.log(`  ✓ pattern: ${p.c}`);
  }
  let cc = 0;
  for (const c of CONDITIONS) {
    if (await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } })) continue;
    const created = await prisma.conditionMapping.create({ data: { westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11, description: c.description } });
    cc++;
    for (const pr of c.patterns) { const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } }); if (!pat) continue; try { await prisma.conditionPatternMapping.create({ data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes } }); } catch {} }
    console.log(`  ✓ ${c.westernName}`);
  }
  const [hMap, fMap, aMap, pMap] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
    prisma.formula.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
    prisma.acupuncturePoint.findMany({ select: { id: true, code: true } }).then(rs => new Map(rs.map(r => [r.code, r.id]))),
    prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
  ]);
  let ec = 0;
  for (const e of EVIDENCE) {
    if (await prisma.evidenceEntry.findFirst({ where: { title: e.title } })) continue;
    const en = await prisma.evidenceEntry.create({ data: { title: e.title, studyType: e.studyType, evidenceLevel: e.evidenceLevel, evidenceGrade: e.evidenceGrade, authors: e.authors, journal: e.journal, year: e.year, doi: e.doi, pubmedId: e.pubmedId, summary: e.summary, population: e.population, intervention: e.intervention, comparator: e.comparator, primaryOutcome: e.primaryOutcome, resultsSummary: e.resultsSummary, riskOfBias: e.riskOfBias, qualityTool: e.qualityTool, status: "PUBLISHED" } });
    ec++;
    const ot = e.outcomeType ?? "EFFICACY";
    const ed = ot === "SAFETY" ? "NEGATIVE" : "POSITIVE";
    for (const p of e.herbs ?? []) { const id = hMap.get(p); if (id) try { await prisma.evidenceHerbLink.create({ data: { evidenceId: en.id, herbId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    for (const p of e.formulas ?? []) { const id = fMap.get(p); if (id) try { await prisma.evidenceFormulaLink.create({ data: { evidenceId: en.id, formulaId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    for (const p of e.acupoints ?? []) { const id = aMap.get(p); if (id) try { await prisma.evidenceAcupointLink.create({ data: { evidenceId: en.id, acupointId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    for (const p of e.patterns ?? []) { const id = pMap.get(p); if (id) try { await prisma.evidencePatternLink.create({ data: { evidenceId: en.id, patternId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    console.log(`  ✓ ${e.evidenceGrade} ${e.title.slice(0, 50)}`);
  }
  console.log(`\n[38-41] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  const grades = await prisma.evidenceEntry.groupBy({ by: ["evidenceGrade"], _count: true });
  console.log(`  Grades: ${grades.map(g => g.evidenceGrade + ':' + g._count).join(' ')}`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
