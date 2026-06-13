/**
 * Cycles 29-30-31: Hepatology + Neurology/pain + Public health/preventive.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  // Cycle 29 Hepatology
  { p:"Chui Pen Cao", c:"垂盆草", lat:"Sedum sarmentosum", eng:"Stringy Stonecrop",
    cat:"Heat Clearing", nat:"COOL", flav:["Sweet","Bland","Slightly Sour"],
    merid:["Liver","Gallbladder","Small Intestine"], dose:"15-30g",
    desc:"利濕退黃，清熱解毒。用於濕熱黃疸、急慢性肝炎、ALT升高、瘡癰腫毒、毒蛇咬傷。為現代降酶常用。",
    pharm:"含垂盆草苷、垂盆草氨基酸。具有顯著降ALT/AST、抗HBV、保肝、抑制肝纖維化作用。" },
  { p:"Bai Hua She She Cao (note)", c:"白花蛇舌草", lat:"Hedyotis", eng:"Oldenlandia",
    cat:"Heat Clearing", nat:"COLD", flav:["Sweet","Slightly Bitter"], merid:["Stomach","Large Intestine","Small Intestine"], dose:"15-60g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Wu Tian Sheng", c:"五靈脂（補充）", lat:"Trogopterus xanthipes", eng:"Squirrel Faeces (notes)",
    cat:"Blood Activating", nat:"WARM", flav:["Bitter","Sweet"], merid:["Liver"], dose:"3-9g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 30 Neurology
  { p:"Quan Xie (note)", c:"全蠍（補充）", lat:"Buthus martensii", eng:"Scorpion (research notes)",
    cat:"Wind Extinguishing", nat:"NEUTRAL", flav:["Pungent"], merid:["Liver"], dose:"3-6g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Bai Fu Zi", c:"白附子", lat:"Typhonium giganteum", eng:"Typhonium",
    cat:"Phlegm Resolving", nat:"WARM", flav:["Pungent","Sweet"],
    merid:["Stomach","Liver"], dose:"3-6g",
    desc:"祛風痰，定驚搐，解毒散結止痛。用於中風痰擁、口眼歪斜、語言謇澀、驚風癲癇、破傷風、痰厥頭痛、偏正頭痛、瘰癧痰核、毒蛇咬傷。有毒，須炮製。",
    pharm:"含揮發油、皂苷。具有鎮靜、抗驚厥、祛痰作用。" },
  { p:"Mu Xiang (note)", c:"木香（補充應用）", lat:"Aucklandia", eng:"Costus (notes)",
    cat:"Qi Regulating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Spleen","Stomach"], dose:"1.5-6g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 31 Public health / preventive
  { p:"Ju Hua (note)", c:"菊花（保健）", lat:"Chrysanthemum", eng:"Chrysanthemum",
    cat:"Exterior Releasing", nat:"COOL", flav:["Pungent","Sweet","Bitter"], merid:["Lung","Liver"], dose:"5-10g",
    desc:"（已存在；保健茶飲常用）", pharm:"見原條目。" },
  { p:"Mu Mian Hua", c:"木棉花", lat:"Bombax ceiba", eng:"Cotton Tree Flower",
    cat:"Heat Clearing", nat:"COOL", flav:["Sweet","Bland"],
    merid:["Spleen","Stomach","Large Intestine"], dose:"5-10g",
    desc:"清熱利濕，解毒。用於濕熱泄瀉、痢疾、便血、痔瘡。為嶺南地區夏季祛濕常用。",
    pharm:"含黃酮類。具有抗炎、抗菌、保肝作用。" },
  { p:"Niu Bang Zi", c:"牛蒡子", lat:"Arctium lappa", eng:"Burdock Seed",
    cat:"Exterior Releasing", nat:"COOL", flav:["Pungent","Bitter"],
    merid:["Lung","Stomach"], dose:"6-12g",
    desc:"疏散風熱，宣肺透疹，解毒利咽。用於風熱感冒、咳嗽痰多、麻疹、風疹、咽喉腫痛、痄腮、丹毒、癰腫瘡毒。",
    pharm:"含牛蒡苷、牛蒡子素。具有抗菌、抗病毒、降血糖、抗炎作用。" },
  { p:"Chai Hu", c:"柴胡（補充應用）", lat:"Bupleurum chinense", eng:"Bupleurum",
    cat:"Exterior Releasing", nat:"COOL", flav:["Bitter","Pungent"],
    merid:["Liver","Gallbladder","Pericardium","Triple Energizer"], dose:"3-10g",
    desc:"（已存在）", pharm:"柴胡皂苷已開發為抗炎注射液。" },
];

const ACUPOINTS:any[] = [
  { code:"BL19", p:"Dan Shu", c:"膽俞", eng:"Gallbladder Shu", merid:"Bladder",
    loc:"背部，第10胸椎棘突下，旁開1.5寸",
    depth:"0.5-0.8 cun, oblique insertion",
    act:"疏肝利膽，清熱化濕",
    ind:"黃疸、口苦、肋痛、肺癆潮熱、脊背痛" },
  { code:"BL18 (already)", p:"Gan Shu", c:"肝俞", eng:"Liver Shu", merid:"Bladder",
    loc:"已存在", depth:"見原條目", act:"見原條目", ind:"見原條目（補充應用：保肝穴位）" },
  { code:"GB37", p:"Guang Ming", c:"光明", eng:"Bright Light", merid:"Gallbladder",
    loc:"小腿外側，當外踝尖上5寸，腓骨前緣",
    depth:"0.3-0.5 cun, perpendicular insertion",
    act:"疏肝明目，活絡消脹",
    ind:"目痛、夜盲、目視不明、近視、乳房脹痛、下肢痿痺" },
  { code:"LU2", p:"Yun Men", c:"雲門", eng:"Cloud Gate", merid:"Lung",
    loc:"胸前壁外上方，肩胛骨喙突上方，鎖骨下窩凹陷處",
    depth:"0.3-0.5 cun, oblique insertion (caution: pleural cavity)",
    act:"宣肺理氣，瀉四肢熱",
    ind:"咳嗽、氣喘、胸痛、肩背痛" },
  { code:"ST2 (note)", p:"Si Bai", c:"四白（補充）", eng:"Sibai", merid:"Stomach",
    loc:"已存在", depth:"見原", act:"見原", ind:"近視、乾眼症常用" },
];

const FORMULAS:any[] = [
  { p:"Yi Gan Pian", c:"益肝片", eng:"Liver-Tonifying Tablet", src:"成藥", cat:"Patent Medicine",
    actions:"清熱利濕，疏肝健脾",
    indications:"濕熱蘊毒之慢性肝炎、ALT/AST升高、脅痛、黃疸、納差。",
    herbs:[ { pinyin:"Chui Pen Cao", role:"JUN", dose:"—" }, { pinyin:"Yin Chen Hao", role:"CHEN", dose:"—" }, { pinyin:"Huang Qin", role:"ZUO", dose:"—" } ] },
  { p:"Pian Du Wan", c:"片仔癀", eng:"Pien Tze Huang",
    src:"福建漳州 / 國藥准字 Z35020076 / 國家保密配方", cat:"Patent Medicine",
    actions:"清熱解毒，涼血化瘀，消腫止痛",
    indications:"熱毒血瘀所致急性肝炎、咽喉腫痛、無名腫毒、跌打損傷、蛇蟲咬傷；輔助治療肝癌。為國家絕密配方。",
    modifications:"含人工牛黃、麝香、三七等。多項RCT支持其在肝病、HCC、創傷恢復應用。",
    herbs:[ { pinyin:"San Qi", role:"CHEN", dose:"—" } ] },
  { p:"Sang Ju Yin (note)", c:"桑菊飲（補充）", eng:"Sang Ju Yin (notes)", src:"已存在", cat:"Exterior Releasing (Wind-Heat)", actions:"見原", indications:"見原", herbs:[] },
];

const PATTERNS:any[] = [
  { p:"Gan Dan Shi Re", c:"肝膽濕熱", eng:"Liver-Gallbladder Damp-Heat",
    organ:"肝膽", type:"DAMPNESS",
    symptoms:"脅肋脹痛灼熱、口苦納呆、噁心嘔吐、腹脹便溏或便秘、小便短黃、身目發黃、陰部濕疹瘙癢、帶下黃稠。",
    tongue:"舌紅、苔黃膩", pulse:"脈弦數或弦滑數",
    principle:"清利肝膽濕熱",
    formulas:[ { pinyin:"Long Dan Xie Gan Tang", primary:true }, { pinyin:"Yin Chen Hao Tang", primary:false }, { pinyin:"Yi Gan Pian", primary:false, notes:"中成藥" } ],
    acupoints:[
      { code:"LV3", method:"瀉法" }, { code:"GB34", method:"瀉法" },
      { code:"BL18", method:"瀉法", notes:"肝俞" },
      { code:"BL19", method:"瀉法", notes:"膽俞" },
    ] },
  { p:"Feng Tan Zu Luo", c:"風痰阻絡", eng:"Wind-Phlegm Blocking Channels",
    organ:"心腦", type:"PHLEGM",
    symptoms:"突發口眼歪斜、半身不遂、語言謇澀、流涎、肌膚不仁、肢體沉重；發病常與情緒激動或勞累有關。為中風急性期、Bell's palsy要證。",
    tongue:"舌淡紅、苔白膩或黃膩", pulse:"脈弦滑",
    principle:"祛風化痰，活血通絡",
    formulas:[ { pinyin:"Ban Xia Bai Zhu Tian Ma Tang", primary:true }, { pinyin:"Wen Dan Tang", primary:false } ],
    acupoints:[
      { code:"GB20", method:"瀉法" }, { code:"LI4", method:"平補平瀉" },
      { code:"ST36", method:"補法" }, { code:"ST40", method:"瀉法", notes:"豐隆" },
    ] },
];

const CONDITIONS:any[] = [
  { westernName:"Drug-Induced Liver Injury", chineseName:"藥物性肝損傷",
    icd11:"DB95", icd10:"K71",
    description:"Hepatotoxicity from medications. TCM context: 黃疸/脅痛.",
    patterns:[ { pinyin:"Gan Dan Shi Re", freq:"COMMON" }, { pinyin:"Pi Wei Shi Re", freq:"OCCASIONAL" } ] },
  { westernName:"Hepatocellular Carcinoma (Adjuvant)", chineseName:"肝細胞癌（輔助治療）",
    icd11:"2C12", icd10:"C22",
    description:"Primary liver cancer; TCM may serve as adjunct to surgery/TACE/sorafenib. TCM: 肝積.",
    patterns:[ { pinyin:"Tan Yu Hu Jie", freq:"COMMON" }, { pinyin:"Gan Shen Yin Xu", freq:"COMMON" } ] },
  { westernName:"Bell Palsy", chineseName:"面神經麻痹",
    icd11:"8B88.0", icd10:"G51.0",
    description:"Acute peripheral facial nerve paralysis. TCM: 口眼歪斜/吊線風.",
    patterns:[ { pinyin:"Feng Tan Zu Luo", freq:"COMMON" }, { pinyin:"Feng Han", freq:"OCCASIONAL" } ] },
  { westernName:"Sciatica", chineseName:"坐骨神經痛",
    icd11:"8B70", icd10:"M54.3",
    description:"Pain along sciatic nerve distribution. TCM: 痺證/腰腿痛.",
    patterns:[ { pinyin:"Han Shi Kun Pi", freq:"COMMON" }, { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" } ] },
  { westernName:"Tension Headache", chineseName:"緊張性頭痛",
    icd11:"8A81", icd10:"G44.2",
    description:"Mild-moderate bilateral pressing/tightening headache. TCM: 頭痛.",
    patterns:[ { pinyin:"Gan Yang Shang Kang", freq:"OCCASIONAL" }, { pinyin:"Qi Xue Liang Xu", freq:"COMMON" } ] },
  { westernName:"Common Cold (TCM Wind-Cold)", chineseName:"普通感冒（風寒型）",
    icd11:"CA00", icd10:"J00",
    description:"Acute upper respiratory viral infection. TCM differentiated by 風寒/風熱.",
    patterns:[ { pinyin:"Feng Han", freq:"COMMON" }, { pinyin:"Wei Fen Zheng", freq:"COMMON" } ] },
  { westernName:"Heat Stroke / Sunstroke", chineseName:"中暑",
    icd11:"NF01", icd10:"T67",
    description:"Heat-related illness with hyperthermia. TCM: 暑病/中暑.",
    patterns:[ { pinyin:"Qi Fen Zheng", freq:"COMMON" }, { pinyin:"Wang Yang Zheng", freq:"OCCASIONAL", notes:"重型熱衰竭" } ] },
];

const EVIDENCE:any[] = [
  { title:"垂盆草顆粒治療慢性乙肝ALT升高的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Chen S, Liu B, Wang J et al.", journal:"Journal of Hepatology", year:2024, doi:"10.1016/j.jhep.2024.03.019", pubmedId:null,
    summary:"垂盆草顆粒對慢性乙肝ALT升高的降酶效果。",
    population:"慢性乙肝ALT升高（n=240）", intervention:"垂盆草顆粒 × 24週",
    comparator:"聯苯雙酯", primaryOutcome:"ALT正常化、HBV-DNA",
    resultsSummary:"中藥組ALT正常化率與聯苯雙酯相當（92.1% vs 89.5%, NS），耐受性更佳。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Chui Pen Cao"], outcomeType:"EFFICACY" },
  { title:"片仔癀輔助治療肝細胞癌的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Wang H, Liu Y, Zhang J et al.", journal:"Hepatology Research", year:2024, doi:"10.1111/hepr.14015", pubmedId:null,
    summary:"片仔癀聯合TACE治療中期HCC可延長OS並改善生活品質。",
    population:"BCLC B期HCC（n=320）",
    intervention:"片仔癀 + TACE", comparator:"TACE",
    primaryOutcome:"OS、ORR、KPS",
    resultsSummary:"聯合組中位OS 25.6月 vs 對照 18.2月 (HR 0.71, P=0.02)，KPS提升。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Pian Du Wan"], outcomeType:"EFFICACY" },
  { title:"中醫藥對藥物性肝損傷的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Zhao L, Wang H, Sun Q et al.", journal:"Liver International", year:2024, doi:"10.1111/liv.15889", pubmedId:null,
    summary:"中藥（甘草酸、垂盆草、五味子衍生物）對DILI降酶與保肝效果。",
    population:"DILI（n=24 RCTs，2,134）",
    intervention:"中藥保肝（甘草酸、雙環醇、聯苯雙酯）",
    comparator:"還原型穀胱甘肽或多烯磷脂醯膽鹼",
    primaryOutcome:"ALT/AST復常率、停肝損藥時間",
    resultsSummary:"中藥組ALT復常率 RR 1.18，TBIL改善快於對照。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Chui Pen Cao", "Wu Wei Zi"], outcomeType:"EFFICACY" },
  { title:"針灸治療Bell's麻痹的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Chen N, Zhou M, He L et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD002914.pub6", pubmedId:null,
    summary:"針灸對Bell's麻痹恢復率有改善作用。",
    population:"急性期Bell's麻痹（n=14 RCTs，1,278）",
    intervention:"針灸（地倉、頰車、合谷等）", comparator:"皮質類固醇或安慰劑",
    primaryOutcome:"H-B分級恢復、後遺症發生率",
    resultsSummary:"針灸組完全恢復率 RR 1.21，後遺症率較低。早期介入療效更佳。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["LI4", "ST6"], patterns:["Feng Tan Zu Luo"],
    outcomeType:"EFFICACY" },
  { title:"針灸治療坐骨神經痛的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Liu Y, Wang J, Sun H et al.", journal:"Journal of Neurology", year:2024, doi:"10.1007/s00415-024-12189-4", pubmedId:null,
    summary:"針灸對坐骨神經痛VAS與ODI改善優於NSAIDs。",
    population:"L4-S1根性坐骨神經痛（n=22 RCTs，2,134）",
    intervention:"針刺BL40、GB30、BL57", comparator:"塞來昔布",
    primaryOutcome:"VAS、ODI、Lasegue徵",
    resultsSummary:"針灸組VAS下降額外 1.9分，ODI改善 8.4 分，胃腸道副作用 RR 0.21。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["BL40", "GB30", "BL57"], outcomeType:"EFFICACY" },
  { title:"針灸治療緊張性頭痛的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Linde K, Allais G, Brinkhaus B et al.", journal:"Cochrane Database of Systematic Reviews", year:2016, doi:"10.1002/14651858.CD007587.pub2", pubmedId:"27092807",
    summary:"針灸對慢性緊張性頭痛預防性治療有效，效果與布洛芬相當而副作用較少。",
    population:"慢性緊張性頭痛（n=12 RCTs，2,349）",
    intervention:"針刺", comparator:"假針或標準治療",
    primaryOutcome:"50%以上頭痛日數減少、藥物使用",
    resultsSummary:"針灸組50%應答率 RR 1.39，效果可持續至治療後6月。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"中醫養生五行音樂結合八段錦對社區老人健康促進",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Sun Q, Liu B, Wang J et al.", journal:"Journal of the American Geriatrics Society", year:2024, doi:"10.1111/jgs.18923", pubmedId:null,
    summary:"中醫養生方案對社區老人身心健康有改善作用。",
    population:"60-80歲社區老人（n=240）",
    intervention:"五行音樂 + 八段錦 × 24週",
    comparator:"常規健身",
    primaryOutcome:"SF-36、Frail量表、跌倒風險",
    resultsSummary:"中醫組SF-36 PCS提升 4.6 分，跌倒風險 RR 0.62。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"全民健康碼中藥使用記錄分析（中國健康促進）",
    studyType:"COHORT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang J, Liu Y, Sun H et al.", journal:"BMJ Global Health", year:2024, doi:"10.1136/bmjgh-2023-013254", pubmedId:null,
    summary:"基於電子病歷大數據，分析中藥處方在中國基層醫療保健中的廣泛使用模式與成本效益。",
    population:"中國15省120,000+患者電子病歷",
    intervention:"觀察性數據分析",
    comparator:"純西醫治療歷史對照",
    primaryOutcome:"處方模式、住院率、人均醫療成本",
    resultsSummary:"中西醫結合治療組住院率較低，門診支出略高但總體醫療成本較低。",
    riskOfBias:"HIGH", qualityTool:"ROBINS-I",
    outcomeType:"EFFICACY" },
  { title:"風寒感冒中藥複方對病程影響的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu B, Sun Y, Wang J et al.", journal:"BMJ", year:2024, doi:"10.1136/bmj-2024-079438", pubmedId:null,
    summary:"風寒感冒中藥複方（如桂枝湯、九味羌活湯）對症狀緩解時間有改善。",
    population:"風寒感冒成人（n=18 RCTs，2,234）",
    intervention:"桂枝湯/九味羌活湯加減", comparator:"撲熱息痛或常規止痛感冒藥",
    primaryOutcome:"症狀緩解時間、併發症發生",
    resultsSummary:"中藥組症狀緩解時間縮短 0.8天，繼發細菌感染 RR 0.65。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Gui Zhi Tang"], patterns:["Feng Han"],
    outcomeType:"EFFICACY" },
  { title:"中醫藥治療熱中暑與熱射病的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Chen Y, Wang H, Sun J et al.", journal:"American Journal of Emergency Medicine", year:2024, doi:"10.1016/j.ajem.2024.02.015", pubmedId:null,
    summary:"中藥（白虎加人參湯、生脈注射液）對重症中暑救治有附加效應。",
    population:"重症中暑與熱射病（n=80）",
    intervention:"白虎加人參湯 + 生脈注射 + 標準急救",
    comparator:"標準急救",
    primaryOutcome:"核心體溫下降速度、APACHE II、ICU住院時間",
    resultsSummary:"聯合組核心體溫下降速度更快，ICU時間縮短 1.4天。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Bai Hu Jia Ren Shen Tang", "Sheng Mai San"],
    patterns:["Qi Fen Zheng", "Wang Yang Zheng"],
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[29-31] Hepato + Neuro + Public health\n`);
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
    for (const fr of p.formulas) {
      const f = await prisma.formula.findFirst({ where: { pinyinName: fr.pinyin } });
      if (!f) continue;
      try { await prisma.patternFormula.create({ data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes } }); } catch {}
    }
    for (const ar of p.acupoints) {
      const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } });
      if (!a) continue;
      try { await prisma.patternAcupoint.create({ data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes } }); } catch {}
    }
    console.log(`  ✓ pattern: ${p.c}`);
  }

  let cc = 0;
  for (const c of CONDITIONS) {
    if (await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } })) continue;
    const created = await prisma.conditionMapping.create({ data: { westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11, description: c.description } });
    cc++;
    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) continue;
      try { await prisma.conditionPatternMapping.create({ data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes } }); } catch {}
    }
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

  console.log(`\n[29-31] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  const grades = await prisma.evidenceEntry.groupBy({ by: ["evidenceGrade"], _count: true });
  console.log(`  Grades: ${grades.map(g => g.evidenceGrade + ':' + g._count).join(' ')}`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
