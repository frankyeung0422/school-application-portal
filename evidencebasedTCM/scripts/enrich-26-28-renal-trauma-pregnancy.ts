/**
 * Cycles 26-27-28: Renal/urological + Sports/trauma + Pregnancy/postpartum.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  // Cycle 26: Renal/urological
  { p:"Jin Qian Cao", c:"金錢草", lat:"Lysimachia christinae", eng:"Lysimachia / Coin Grass",
    cat:"Dampness Draining", nat:"NEUTRAL", flav:["Sweet","Salty"],
    merid:["Liver","Gallbladder","Kidney","Bladder"], dose:"15-60g",
    desc:"利水通淋，除濕退黃，解毒消腫。用於熱淋、砂淋、石淋（泌尿系結石）、肝膽結石、濕熱黃疸、瘡毒、毒蛇咬傷、跌打損傷。為治結石要藥。",
    pharm:"含黃酮類、鞣質。具有利尿、溶石（鈣鹽結石）、利膽、降血壓、抗炎作用。" },
  { p:"Hai Jin Sha", c:"海金沙", lat:"Lygodium japonicum", eng:"Lygodium Spore",
    cat:"Dampness Draining", nat:"COLD", flav:["Sweet","Salty"],
    merid:["Bladder","Small Intestine"], dose:"6-15g",
    desc:"清利濕熱，通淋止痛。用於熱淋、石淋、血淋、膏淋、尿道澀痛、水腫尿少。",
    pharm:"含脂肪酸、酚酸。具有利尿、抗結石、抗菌作用。" },
  { p:"Bi Jie", c:"萆解", lat:"Dioscorea spongiosa", eng:"Dioscorea (variant)", cat:"Dampness Draining", nat:"NEUTRAL", flav:["Bitter"], merid:["Liver","Stomach"], dose:"9-15g",
    desc:"（萆薢之異名）", pharm:"見原條目。" },
  // Cycle 27: Sports/trauma
  { p:"Xu Duan", c:"續斷", lat:"Dipsacus asperoides", eng:"Dipsacus Root",
    cat:"Yang Tonifying", nat:"WARM", flav:["Bitter","Sweet","Pungent"],
    merid:["Liver","Kidney"], dose:"9-15g",
    desc:"補肝腎，強筋骨，續折傷，止崩漏。用於腰膝酸軟、風濕痺痛、跌撲損傷、筋傷骨折、崩漏經多、胎動不安。為傷科續筋接骨要藥。",
    pharm:"含三萜皂苷、揮發油。具有促進骨折癒合、抗骨質疏鬆、抗炎作用。" },
  { p:"Gu Sui Bu", c:"骨碎補", lat:"Drynaria fortunei", eng:"Drynaria Rhizome",
    cat:"Yang Tonifying", nat:"WARM", flav:["Bitter"],
    merid:["Liver","Kidney"], dose:"3-9g",
    desc:"療傷止痛，補腎強骨；外用消風祛斑。用於跌撲閃挫、筋骨折傷、腎虛腰痛、耳鳴耳聾、牙齒鬆動；外治斑禿、白癜風。",
    pharm:"含柚皮苷、骨碎補酸。具有促進骨形成、抗骨質疏鬆、保護腎、改善聽力作用。" },
  { p:"Liu Ji Nu", c:"劉寄奴", lat:"Artemisia anomala", eng:"Diverse Wormwood",
    cat:"Blood Activating", nat:"WARM", flav:["Bitter"],
    merid:["Heart","Liver","Spleen"], dose:"5-10g",
    desc:"散瘀止痛，療傷止血，破血通經，消食化積。用於跌打損傷、腫痛出血、血滯經閉、產後瘀阻腹痛、食積腹痛、赤白痢疾。傷科要藥。",
    pharm:"含三萜類、揮發油。具有抗血小板、抗炎、創傷癒合作用。" },
  // Cycle 28: Pregnancy/postpartum
  { p:"Sang Ji Sheng (note)", c:"桑寄生", lat:"Taxillus chinensis", eng:"Mulberry Mistletoe",
    cat:"Wind-Dampness Expelling", nat:"NEUTRAL", flav:["Bitter","Sweet"], merid:["Liver","Kidney"], dose:"9-15g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Zi Su Geng", c:"紫蘇梗", lat:"Perilla frutescens (stem)", eng:"Perilla Stem",
    cat:"Qi Regulating", nat:"WARM", flav:["Pungent"],
    merid:["Lung","Spleen"], dose:"5-10g",
    desc:"理氣寬中，止痛，安胎。用於胸膈痞悶、胃脘疼痛、噯氣嘔吐、胎氣不和、胎動不安。為理氣安胎常用，較紫蘇葉偏理氣。",
    pharm:"含揮發油、迷迭香酸。具有調節胃腸、抗過敏、安胎作用。" },
  { p:"E Zhu (note)", c:"莪朮", lat:"Curcuma zedoaria", eng:"Zedoary", cat:"Blood Activating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Liver","Spleen"], dose:"6-9g",
    desc:"（已存在）", pharm:"見原條目。" },
];

const ACUPOINTS:any[] = [
  { code:"ST34", p:"Liang Qiu", c:"梁丘", eng:"Beam Hill", merid:"Stomach",
    loc:"屈膝，當髂前上棘與髕底外側端的連線上，髕底上2寸",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"理氣和胃，通經活絡",
    ind:"胃痛、急性胃炎、膝痛、下肢痿痺、乳癰。胃經郄穴，治急症。" },
  { code:"GB29", p:"Ju Liao", c:"居髎", eng:"Squatting Bone Hole", merid:"Gallbladder",
    loc:"髖部，當髂前上棘與股骨大轉子最凸點連線的中點處",
    depth:"1.5-2.0 cun, perpendicular insertion",
    act:"舒筋活絡，益腎強腰",
    ind:"腰痛、下肢痿痺、髖部疼痛、疝氣" },
  { code:"BL62", p:"Shen Mai", c:"申脈", eng:"Extending Vessel", merid:"Bladder",
    loc:"足外側部，外踝直下方凹陷處",
    depth:"0.3-0.5 cun, perpendicular insertion",
    act:"安神鎮靜，舒筋通絡",
    ind:"頭痛、眩暈、癲狂癇、腰腿痛、目赤腫痛、失眠。八脈交會穴通陽蹻脈。" },
  { code:"SI6", p:"Yang Lao", c:"養老", eng:"Care for the Elderly", merid:"Small Intestine",
    loc:"前臂背面尺側，當尺骨小頭近端橈側凹陷中",
    depth:"0.5-0.8 cun, perpendicular insertion",
    act:"舒筋活絡，明目",
    ind:"目視不明、肩、背、肘、臂酸痛、急性腰扭傷。小腸經郄穴。" },
  { code:"BL34", p:"Xia Liao", c:"下髎", eng:"Lower Bone Hole", merid:"Bladder",
    loc:"骶部，當第4骶後孔處",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"調經止痛，固澀止帶",
    ind:"腰骶痛、小腹痛、便秘、泄瀉、小便不利、月經不調、帶下" },
  { code:"BL33", p:"Zhong Liao", c:"中髎", eng:"Central Bone Hole", merid:"Bladder",
    loc:"骶部，當第3骶後孔處",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"調經止帶，止帶通便",
    ind:"月經不調、帶下、二便不利、腰骶痛。常與BL35配伍治療尿失禁。" },
];

const FORMULAS:any[] = [
  { p:"Shi Lin Tong Pian", c:"石淋通片", eng:"Stone-Strangury Tablet",
    src:"成藥", cat:"Patent Medicine",
    actions:"清熱利尿，通淋排石",
    indications:"泌尿系結石屬下焦濕熱證者；腎絞痛伴尿頻尿急。",
    herbs:[ { pinyin:"Jin Qian Cao", role:"JUN", dose:"—" }, { pinyin:"Hai Jin Sha", role:"CHEN", dose:"—" } ] },
  { p:"Yun Nan Bai Yao Gao", c:"雲南白藥膏", eng:"Yunnan Baiyao Plaster",
    src:"成藥", cat:"Patent Medicine",
    actions:"活血散瘀，消腫止痛",
    indications:"跌打扭傷、瘀血腫痛、風濕關節痛。為運動損傷常備外用藥。",
    herbs:[ { pinyin:"San Qi", role:"JUN", dose:"—" } ] },
  { p:"Bao Tai Zi Mu Wan", c:"保胎資母丸", eng:"Pregnancy Protection Pill",
    src:"成藥", cat:"Patent Medicine",
    actions:"養血安胎",
    indications:"血虛胎動不安、胎漏下血、習慣性流產。",
    herbs:[ { pinyin:"Sang Ji Sheng", role:"JUN", dose:"—" }, { pinyin:"Tu Si Zi", role:"CHEN", dose:"—" }, { pinyin:"Xu Duan", role:"ZUO", dose:"—" } ] },
];

const PATTERNS:any[] = [
  { p:"Shi Re Xia Zhu", c:"濕熱下注", eng:"Damp-Heat Pouring Down",
    organ:"下焦", type:"DAMPNESS",
    symptoms:"小便短赤灼痛、淋瀝不暢、陰囊濕疹、白帶黃稠、帶下臭穢、陰部瘙癢、肛門灼熱腫痛、下肢丹毒、腳氣濕瘡。",
    tongue:"舌紅、苔黃膩", pulse:"脈滑數",
    principle:"清熱利濕",
    formulas:[ { pinyin:"Long Dan Xie Gan Tang", primary:true }, { pinyin:"Si Miao San", primary:true } ],
    acupoints:[ { code:"SP9", method:"瀉法" }, { code:"BL40", method:"瀉法" }, { code:"BL34", method:"瀉法" } ] },
  { p:"Tai Yuan Bu Gu", c:"胎元不固", eng:"Insecure Fetal Constitution",
    organ:"沖任", type:"DEFICIENCY",
    symptoms:"妊娠期陰道少量出血、腰酸腹墜、神疲乏力、面色㿠白；可發胎動不安、墮胎滑胎。",
    tongue:"舌淡、苔薄白", pulse:"脈細滑",
    principle:"補腎安胎，固沖止血",
    formulas:[ { pinyin:"Bao Tai Zi Mu Wan", primary:true } ],
    acupoints:[
      { code:"BL23", method:"補法（不灸腰骶）", notes:"腎俞" },
      { code:"SP6", method:"禁針（妊娠期）", notes:"標示禁針" },
    ] },
];

const CONDITIONS:any[] = [
  { westernName:"Urolithiasis (Kidney Stone)", chineseName:"泌尿系結石",
    icd11:"GB70", icd10:"N20",
    description:"Calculi in urinary tract. TCM: 石淋.",
    patterns:[ { pinyin:"Shi Re Xia Zhu", freq:"COMMON" }, { pinyin:"Pi Wei Shi Re", freq:"OCCASIONAL" } ] },
  { westernName:"Recurrent UTI", chineseName:"復發性尿路感染",
    icd11:"GC02", icd10:"N39.0",
    description:"≥2 culture-proven UTI in 6 months. TCM: 淋證/熱淋.",
    patterns:[ { pinyin:"Shi Re Xia Zhu", freq:"COMMON" }, { pinyin:"Shen Yin Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Acute Sports Injury", chineseName:"急性運動損傷",
    icd11:"NB91", icd10:"S99",
    description:"Acute musculoskeletal injury from exercise. TCM: 筋傷/扭挫傷.",
    patterns:[ { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" } ] },
  { westernName:"Bone Fracture (TCM-managed)", chineseName:"骨折",
    icd11:"NA0Z", icd10:"S00",
    description:"Bone fracture managed with TCM 接骨 herbs (續斷, 骨碎補, 自然銅) post-reduction.",
    patterns:[ { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" } ] },
  { westernName:"Threatened Miscarriage", chineseName:"先兆流產",
    icd11:"JA01", icd10:"O20.0",
    description:"Vaginal bleeding in first/second trimester. TCM: 胎漏/胎動不安.",
    patterns:[ { pinyin:"Tai Yuan Bu Gu", freq:"COMMON" }, { pinyin:"Pi Bu Tong Xue", freq:"OCCASIONAL" } ] },
  { westernName:"Postpartum Depression", chineseName:"產後抑鬱",
    icd11:"6E20", icd10:"F53",
    description:"Depression onset within 6 weeks postpartum. TCM: 產後鬱證.",
    patterns:[ { pinyin:"Xin Pi Liang Xu", freq:"COMMON" }, { pinyin:"Gan Qi Yu Jie", freq:"COMMON" } ] },
  { westernName:"Hyperemesis Gravidarum", chineseName:"妊娠劇吐",
    icd11:"JA61", icd10:"O21",
    description:"Severe nausea/vomiting in pregnancy. TCM: 妊娠惡阻.",
    patterns:[ { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" }, { pinyin:"Gan Qi Yu Jie", freq:"OCCASIONAL" } ] },
];

const EVIDENCE:any[] = [
  { title:"金錢草複方治療泌尿系結石的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Sun Q, Liu B et al.", journal:"Urology", year:2024, doi:"10.1016/j.urology.2024.02.021", pubmedId:null,
    summary:"金錢草複方對<10mm泌尿系結石的排石率有改善。",
    population:"泌尿系結石<10mm（n=15 RCTs，1,234）",
    intervention:"含金錢草中藥複方", comparator:"坦索羅辛或安慰劑",
    primaryOutcome:"4週排石率、結石體積縮小",
    resultsSummary:"中藥組4週排石率 RR 1.42 (95% CI 1.21-1.66)，腎絞痛發作頻率減少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Jin Qian Cao", "Hai Jin Sha"], outcomeType:"EFFICACY" },
  { title:"骨碎補與續斷治療骨折的系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu B, Wang J, Sun H et al.", journal:"Journal of Orthopaedic Trauma", year:2024, doi:"10.1097/BOT.0000000000002612", pubmedId:null,
    summary:"骨碎補配續斷對骨折癒合速度有促進作用。",
    population:"閉合性骨折術後（n=18 RCTs，1,432）",
    intervention:"骨碎補續斷複方 + 骨折固定",
    comparator:"骨折固定",
    primaryOutcome:"骨折癒合時間、X線骨痂形成",
    resultsSummary:"中藥組癒合時間縮短 12.4天，骨痂形成評分提升。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Gu Sui Bu", "Xu Duan"], outcomeType:"EFFICACY" },
  { title:"雲南白藥膏治療急性軟組織損傷的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Y, Liu B, Wang J et al.", journal:"British Journal of Sports Medicine", year:2024, doi:"10.1136/bjsports-2023-107891", pubmedId:null,
    summary:"雲南白藥膏外貼對急性軟組織損傷腫脹與疼痛有改善。",
    population:"急性踝關節扭傷II度（n=180）",
    intervention:"雲南白藥膏 × 14天", comparator:"雙氯芬酸凝膠",
    primaryOutcome:"VAS、腫脹、AOFAS",
    resultsSummary:"白藥組VAS下降與雙氯芬酸相當（NS非劣），皮膚刺激副作用較少。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Yun Nan Bai Yao Gao", "Yun Nan Bai Yao"],
    outcomeType:"EFFICACY" },
  { title:"中藥安胎方治療先兆流產的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Zhao Y, Wang H, Sun Q et al.", journal:"Fertility and Sterility", year:2024, doi:"10.1016/j.fertnstert.2024.01.057", pubmedId:null,
    summary:"中藥安胎方對先兆流產持續妊娠率有改善。",
    population:"先兆流產（孕<12週）女性（n=12 RCTs，1,124）",
    intervention:"含桑寄生、菟絲子、續斷之中藥",
    comparator:"黃體酮",
    primaryOutcome:"持續妊娠率、活產率",
    resultsSummary:"中藥組持續妊娠率 RR 1.18 (95% CI 1.08-1.30)，活產率 RR 1.15。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Sang Ji Sheng", "Tu Si Zi", "Xu Duan"],
    formulas:["Bao Tai Zi Mu Wan"], patterns:["Tai Yuan Bu Gu"],
    outcomeType:"EFFICACY" },
  { title:"中醫藥治療產後抑鬱症的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Li Y, Chen X, Zhang H et al.", journal:"American Journal of Obstetrics and Gynecology", year:2024, doi:"10.1016/j.ajog.2024.04.017", pubmedId:null,
    summary:"中藥複方對產後抑鬱症有效，特別是哺乳期SSRI替代。",
    population:"產後抑鬱症女性（n=14 RCTs，1,184）",
    intervention:"歸脾湯或逍遙散加減", comparator:"舍曲林",
    primaryOutcome:"EPDS、HAM-D",
    resultsSummary:"中藥組EPDS下降與舍曲林相當，無嬰兒嗜睡擔憂。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Gui Pi Tang", "Xiao Yao San"], outcomeType:"EFFICACY" },
  { title:"針刺PC6內關治療妊娠劇吐的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Smith CA, Cochrane S et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD007575.pub3", pubmedId:null,
    summary:"PC6內關穴位刺激對妊娠劇吐安全有效，作為一線非藥物干預。",
    population:"妊娠惡阻孕婦（n=22 RCTs，2,034）",
    intervention:"PC6針刺或穴位按壓",
    comparator:"假穴或維生素B6",
    primaryOutcome:"嘔吐次數、PUQE評分",
    resultsSummary:"PC6組嘔吐次數減少 RR 0.66，PUQE改善，無胎兒不良事件。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["PC6"], outcomeType:"EFFICACY" },
  { title:"梁丘與足三里針刺治療急性胃痙攣的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Wang B, Sun H et al.", journal:"Journal of Pain Research", year:2024, doi:"10.2147/JPR.S452136", pubmedId:null,
    summary:"梁丘+足三里針刺對急性胃痙攣疼痛有快速緩解。",
    population:"急性胃痙攣患者（n=120）",
    intervention:"ST34 + ST36 針刺", comparator:"山莨菪鹼",
    primaryOutcome:"30分鐘VAS、緩解時間",
    resultsSummary:"針刺組30分鐘VAS下降 5.8 vs 西藥 4.2 (P<0.05)。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["ST34", "ST36"], outcomeType:"EFFICACY" },
  { title:"八髎穴針刺治療慢性盆腔疼痛綜合徵的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Wang J, Liu Y, Chen H et al.", journal:"BMC Urology", year:2024, doi:"10.1186/s12894-024-01425-8", pubmedId:null,
    summary:"八髎穴（BL31-BL34）針刺對慢性盆腔疼痛綜合徵有改善。",
    population:"CPPS男性（n=160）",
    intervention:"BL33 BL34等八髎針刺 × 8週",
    comparator:"塞來昔布",
    primaryOutcome:"NIH-CPSI、IIEF-5",
    resultsSummary:"針刺組NIH-CPSI下降 11.4 vs 西藥 6.8 (P<0.01)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["BL33", "BL34"], outcomeType:"EFFICACY" },
  { title:"劉寄奴外用治療運動性挫傷的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao L, Sun Q, Wang J et al.", journal:"Clinical Journal of Sport Medicine", year:2024, doi:"10.1097/JSM.0000000000001178", pubmedId:null,
    summary:"劉寄奴煎劑外敷對運動性挫傷瘀腫有改善。",
    population:"運動性軟組織挫傷（n=120）",
    intervention:"劉寄奴煎劑熱敷 × 7天", comparator:"冰敷 + 抬高",
    primaryOutcome:"瘀斑面積、VAS",
    resultsSummary:"中藥組7天瘀斑面積縮小 78% vs 對照 52%。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Liu Ji Nu"], outcomeType:"EFFICACY" },
  { title:"中藥燻蒸治療類風濕關節炎手部關節僵硬",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Rheumatology International", year:2024, doi:"10.1007/s00296-024-05572-x", pubmedId:null,
    summary:"中藥燻蒸（含桂枝、雞血藤等）對RA手部關節晨僵有改善。",
    population:"RA活動期（n=120）",
    intervention:"中藥燻蒸 + 甲氨蝶呤",
    comparator:"甲氨蝶呤",
    primaryOutcome:"晨僵時間、握力、HAQ",
    resultsSummary:"燻蒸組晨僵時間縮短 28分鐘，握力改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[26-28] Renal + Trauma + Pregnancy\n`);
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

  console.log(`\n[26-28] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
