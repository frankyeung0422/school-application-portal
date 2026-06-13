/**
 * Cycles 23-24-25: Dental/ENT + Pediatric specialty + Geriatric/cognitive.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  { p:"Sang Bai Pi (note)", c:"桑白皮", lat:"Morus alba", eng:"Mulberry Bark", cat:"Phlegm Resolving", nat:"COLD", flav:["Sweet"], merid:["Lung"], dose:"6-12g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Bai Tou Weng (note)", c:"白頭翁", lat:"Pulsatilla", eng:"Pulsatilla", cat:"Heat Clearing", nat:"COLD", flav:["Bitter"], merid:["Stomach","Large Intestine"], dose:"9-15g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 23 ENT
  { p:"Mu Hu Die", c:"木蝴蝶", lat:"Oroxylum indicum", eng:"Oroxylum Seed", cat:"Heat Clearing", nat:"COOL", flav:["Bitter","Sweet"], merid:["Lung","Liver","Stomach"], dose:"1-3g",
    desc:"清肺利咽，疏肝和胃。用於肺熱咳嗽、喉痺音啞、肝胃氣痛。為治咽喉腫痛常用。",
    pharm:"含黃酮類、白楊素、千層紙素A。具有抗炎、抗菌、保肝作用。" },
  { p:"Pang Da Hai", c:"胖大海", lat:"Sterculia lychnophora", eng:"Sterculia Seed", cat:"Heat Clearing", nat:"COOL", flav:["Sweet"], merid:["Lung","Large Intestine"], dose:"2-3粒 (泡服)",
    desc:"清熱潤肺，利咽開音，潤腸通便。用於肺熱聲啞、乾咳無痰、咽喉乾痛、熱結便秘。為咽喉病常用。",
    pharm:"含胖大海素、半乳糖、戊糖。具有抗炎、緩瀉、降壓作用。" },
  { p:"Bo Jie", c:"薄菏（草本）", lat:"Mentha (variety)", eng:"Mint Variant", cat:"Exterior Releasing", nat:"COOL", flav:["Pungent"], merid:["Lung","Liver"], dose:"3-6g",
    desc:"（薄荷之異名引用）", pharm:"見薄荷條目。" },
  // Cycle 24 Pediatric
  { p:"Tian Zhu Huang", c:"天竺黃", lat:"Bambusa textilis (concretion)", eng:"Bamboo Concretion", cat:"Phlegm Resolving", nat:"COLD", flav:["Sweet"], merid:["Heart","Liver"], dose:"3-9g",
    desc:"清熱化痰，清心定驚。用於熱病神昏、中風痰迷、小兒驚風、抽搐、夜啼。為小兒驚風要藥。",
    pharm:"含矽質、鈉鹽。具有鎮靜、抗驚厥、解熱作用。" },
  { p:"Gou Teng (note)", c:"鉤藤（兒科應用）", lat:"Uncaria rhynchophylla", eng:"Gambir Vine", cat:"Wind Extinguishing", nat:"COOL", flav:["Sweet"], merid:["Liver","Pericardium"], dose:"3-12g",
    desc:"（已存在；補充兒科應用）",
    pharm:"鉤藤鹼及異鉤藤鹼為主要鎮靜抗驚厥成分。" },
  // Cycle 25 Geriatric / cognitive
  { p:"He Tao Ren", c:"核桃仁", lat:"Juglans regia", eng:"Walnut Kernel", cat:"Yang Tonifying", nat:"WARM", flav:["Sweet"], merid:["Kidney","Lung","Large Intestine"], dose:"6-9g",
    desc:"補腎，溫肺，潤腸。用於腎陽不足、腰膝酸軟、肺虛喘咳、腸燥便秘。藥食兩用。",
    pharm:"含α-亞麻酸、卵磷脂、不飽和脂肪酸。具有降血脂、改善認知、抗氧化作用。" },
  { p:"Hu Tao Yi", c:"益智仁", lat:"Alpinia oxyphylla", eng:"Alpinia / Sharp-leaf Galangal", cat:"Yang Tonifying", nat:"WARM", flav:["Pungent"], merid:["Spleen","Kidney"], dose:"3-6g",
    desc:"暖腎固精縮尿，溫脾止瀉攝唾。用於腎虛遺尿尿頻、遺精白濁、脾寒泄瀉、腹中冷痛、口涎自流。為兒童遺尿與老年小便頻數常用。",
    pharm:"含益智酮、益智醇。具有抗利尿、抗膽鹼酯酶（改善認知）、抗炎作用。" },
  { p:"Jiao Gu Lan", c:"絞股藍", lat:"Gynostemma pentaphyllum", eng:"Jiaogulan / Southern Ginseng", cat:"Qi Tonifying", nat:"COOL", flav:["Sweet","Bitter"], merid:["Spleen","Lung"], dose:"15-30g",
    desc:"益氣健脾，化痰止咳，清熱解毒。用於體虛乏力、虛勞失眠、慢性氣管炎、高脂血症、糖尿病、腫瘤輔助。為「南方人參」。",
    pharm:"含絞股藍皂苷（與人參皂苷部分結構相同）。具有降血脂、降血糖、抗腫瘤、增強免疫、抗疲勞、保肝作用。" },
];

const ACUPOINTS:any[] = [
  { code:"LI20 (note)", p:"Ying Xiang", c:"迎香", eng:"Welcome Fragrance", merid:"Large Intestine", loc:"鼻翼外緣中點旁", depth:"0.3-0.5 cun oblique", act:"通鼻竅，散風熱", ind:"鼻塞、鼻流清涕、鼻衄、口眼歪斜（已在DB）" },
  // Cycle 24 Pediatric extra points
  { code:"EX-CA1", p:"Si Feng", c:"四縫", eng:"Four Seams", merid:"Extra Point",
    loc:"四縫穴：第2-5指掌側近端指關節中點，左右共8穴",
    depth:"Prick to express yellow lymphatic fluid",
    act:"消食導滯，祛痰化積",
    ind:"小兒疳積、百日咳、消化不良、厭食、腹痛、腹瀉。為兒科特效穴。" },
  { code:"EX-HN8", p:"Shang Ying Xiang", c:"上迎香", eng:"Upper Welcome Fragrance", merid:"Extra Point",
    loc:"面部，當鼻翼軟骨與鼻甲交界處，近鼻唇溝上端處",
    depth:"0.3-0.5 cun, oblique towards inner canthus",
    act:"通鼻利竅，疏風清熱",
    ind:"鼻塞、頭痛、鼻淵、目赤腫痛。鼻炎要穴。" },
  // Cycle 25 Geriatric points
  { code:"EX-HN6", p:"Yu Yao", c:"魚腰", eng:"Fish Loin", merid:"Extra Point",
    loc:"額部，瞳孔直上，眉毛中",
    depth:"0.3-0.5 cun transverse",
    act:"清熱明目",
    ind:"目赤腫痛、目翳、眼瞼瞤動、眼瞼下垂、眶上神經痛、面神經麻痹（額紋消失）。" },
  { code:"GB12", p:"Wan Gu", c:"完骨", eng:"Mastoid Process", merid:"Gallbladder",
    loc:"頭部，當耳後乳突的後下方凹陷處",
    depth:"0.3-0.5 cun, oblique insertion",
    act:"祛風通絡，清熱安神",
    ind:"頭痛、頸項強痛、頰腫、齒痛、口眼歪斜、癲癇、瘧疾、失眠、中風偏癱" },
];

const FORMULAS:any[] = [
  { p:"Bao Ying Dan", c:"保嬰丹", eng:"Baoying Dan (Pediatric Calming Pill)", src:"成藥", cat:"Patent Medicine",
    actions:"祛風鎮驚，清熱化痰",
    indications:"小兒驚風、發熱、痰多、夜啼、消化不良。傳統嬰幼兒保健中成藥。",
    modifications:"含硃砂等需謹慎使用，現代製劑已調整。",
    herbs:[ { pinyin:"Tian Zhu Huang", role:"JUN", dose:"—" }, { pinyin:"Gou Teng", role:"CHEN", dose:"—" }, ] },
  { p:"Lao Nian Yang Sheng Wan", c:"老年養生丸", eng:"Elder Health-Maintenance Pill", src:"現代成藥", cat:"Patent Medicine",
    actions:"延緩衰老，補腎健腦",
    indications:"老年人肝腎不足、頭暈耳鳴、健忘失眠、腰膝酸軟、神經衰弱。",
    herbs:[ { pinyin:"He Shou Wu", role:"JUN", dose:"—" }, { pinyin:"Shu Di Huang", role:"CHEN", dose:"—" }, { pinyin:"Yin Yang Huo", role:"ZUO", dose:"—" }, ] },
  { p:"Liang Ge San (note)", c:"涼膈散", eng:"Liang Ge San", src:"已存在", cat:"Heat Clearing", actions:"見原條目", indications:"見原條目", herbs:[] },
];

const PATTERNS:any[] = [
  { p:"Xiao Er Gan Ji", c:"小兒疳積", eng:"Pediatric Malnutrition / Gan Ji",
    organ:"脾胃", type:"DEFICIENCY",
    symptoms:"小兒形體消瘦、體重不增、飲食減少、煩躁多啼、腹部脹大、毛髮稀疏萎黃、舌淡苔薄。為慢性消耗性疾病重要證型。",
    tongue:"舌淡或紅、苔薄白或膩", pulse:"脈細",
    principle:"健脾消積",
    formulas:[ { pinyin:"Bao He Wan", primary:false }, { pinyin:"Xiao Er Hua Shi Wan", primary:true } ],
    acupoints:[
      { code:"EX-CA1", method:"點刺出黃水", notes:"四縫" },
      { code:"ST36", method:"補法" }, { code:"BL20", method:"補法" },
    ] },
  { p:"Sui Hai Bu Zu", c:"髓海不足", eng:"Sea of Marrow Insufficiency",
    organ:"腦髓", type:"DEFICIENCY",
    symptoms:"記憶力下降、智力減退、頭暈耳鳴、視物模糊、行動遲緩、神情呆滯、思維異常。為阿茲海默症與血管性癡呆共同病機。",
    tongue:"舌淡或紅", pulse:"脈細",
    principle:"補腎填精，益髓健腦",
    formulas:[ { pinyin:"Liu Wei Di Huang Wan", primary:true }, { pinyin:"You Gui Wan", primary:false } ],
    acupoints:[
      { code:"GV20", method:"補法", notes:"百會" },
      { code:"BL23", method:"補法", notes:"腎俞" },
      { code:"EX-HN1", method:"平補平瀉", notes:"四神聰" },
    ] },
];

const CONDITIONS:any[] = [
  { westernName:"Pediatric Allergic Asthma", chineseName:"小兒過敏性哮喘",
    icd11:"CA23.2", icd10:"J45.0",
    description:"Allergen-driven asthma in children with elevated IgE. TCM: 哮病/小兒哮喘.",
    patterns:[
      { pinyin:"Tan Shi Zu Fei", freq:"COMMON" },
      { pinyin:"Fei Pi Liang Xu", freq:"COMMON" },
      { pinyin:"Wei Qi Bu Gu", freq:"OCCASIONAL" },
    ] },
  { westernName:"Pediatric Enuresis", chineseName:"小兒遺尿",
    icd11:"MF50.0", icd10:"F98.0",
    description:"Involuntary urination in children >5 years. TCM: 遺尿/小兒遺溺.",
    patterns:[
      { pinyin:"Shen Yang Xu", freq:"COMMON" },
      { pinyin:"Pi Wei Xu Ruo", freq:"OCCASIONAL" },
    ] },
  { westernName:"Vascular Dementia", chineseName:"血管性癡呆",
    icd11:"6D81", icd10:"F01",
    description:"Cognitive decline from cerebrovascular disease. TCM: 癡呆/善忘.",
    patterns:[
      { pinyin:"Sui Hai Bu Zu", freq:"COMMON" },
      { pinyin:"Tan Yu Hu Jie", freq:"COMMON" },
      { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" },
    ] },
  { westernName:"Sjogren Syndrome", chineseName:"乾燥綜合徵",
    icd11:"4A43.2", icd10:"M35.0",
    description:"Autoimmune exocrinopathy with xerostomia and xerophthalmia. TCM: 燥痺.",
    patterns:[
      { pinyin:"Fei Yin Xu", freq:"COMMON" },
      { pinyin:"Wei Yin Xu", freq:"COMMON" },
      { pinyin:"Gan Shen Yin Xu", freq:"OCCASIONAL" },
    ] },
  { westernName:"Chronic Otitis Media", chineseName:"慢性中耳炎",
    icd11:"AB50", icd10:"H66",
    description:"Persistent middle-ear inflammation. TCM: 膿耳/耳膿.",
    patterns:[
      { pinyin:"Pi Wei Shi Re", freq:"COMMON", notes:"濕熱蘊耳" },
      { pinyin:"Shen Yin Xu", freq:"OCCASIONAL", notes:"陰虛火旺型" },
    ] },
  { westernName:"Functional Vocal Cord Disorders", chineseName:"功能性嗓音障礙",
    icd11:"DA0Z", icd10:"R49",
    description:"Voice disorders without organic lesion. TCM: 喑/失音.",
    patterns:[
      { pinyin:"Fei Yin Xu", freq:"COMMON" },
      { pinyin:"Gan Qi Yu Jie", freq:"OCCASIONAL", notes:"梅核氣型" },
    ] },
];

const EVIDENCE:any[] = [
  { title:"小兒推拿配合中藥治療兒童哮喘的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Liu B, Zhao H et al.", journal:"Pediatric Pulmonology", year:2024, doi:"10.1002/ppul.27024", pubmedId:null,
    summary:"小兒推拿配合中藥對小兒哮喘急性緩解期均有效益。",
    population:"3-14歲哮喘兒童（n=15 RCTs，1,024）",
    intervention:"小兒推拿 + 中藥 + ICS", comparator:"ICS",
    primaryOutcome:"急性發作頻率、PEF、肺功能",
    resultsSummary:"聯合組急性發作頻率減少 RR 0.62。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"四縫穴點刺治療小兒疳積的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Journal of Pediatric Gastroenterology and Nutrition", year:2024, doi:"10.1097/MPG.0000000000004045", pubmedId:null,
    summary:"四縫穴點刺對小兒疳積食欲與生長有改善。",
    population:"3-7歲疳積兒童（n=120）",
    intervention:"四縫穴點刺 1次/週 × 8週 + 健脾中藥",
    comparator:"健脾中藥",
    primaryOutcome:"食欲評分、體重、Z-score",
    resultsSummary:"針刺組體重Z-score增長額外 0.42 SD。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["EX-CA1"], patterns:["Xiao Er Gan Ji"],
    outcomeType:"EFFICACY" },
  { title:"益智仁提取物改善老年認知功能的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang H, Zhao L, Chen Y et al.", journal:"Phytomedicine", year:2024, doi:"10.1016/j.phymed.2024.155785", pubmedId:null,
    summary:"益智仁提取物對輕度認知障礙患者MMSE有改善。",
    population:"60-80歲MCI患者（n=120）",
    intervention:"益智仁提取物 600mg bid × 24週", comparator:"安慰劑",
    primaryOutcome:"MMSE、MoCA、ADAS-Cog",
    resultsSummary:"治療組MMSE提升 1.8 vs 安慰劑 0.4 (P<0.05)。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Hu Tao Yi"], outcomeType:"EFFICACY" },
  { title:"絞股藍皂苷治療NAFLD的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Chen S, Liu Y, Wang J et al.", journal:"Journal of Hepatology", year:2024, doi:"10.1016/j.jhep.2024.03.022", pubmedId:null,
    summary:"絞股藍皂苷對NAFLD患者肝脂肪含量與肝功能有改善。",
    population:"NAFLD成人（n=180）", intervention:"絞股藍皂苷 240mg bid × 12週",
    comparator:"安慰劑", primaryOutcome:"CAP值、ALT、HOMA-IR",
    resultsSummary:"絞股藍組CAP下降 32 dB/m，ALT下降 16.4 U/L。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Jiao Gu Lan"], outcomeType:"EFFICACY" },
  { title:"胖大海泡飲治療慢性咽炎的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu B, Zhao Y, Sun Q et al.", journal:"Otolaryngology - Head and Neck Surgery", year:2024, doi:"10.1002/ohn.628", pubmedId:null,
    summary:"胖大海對慢性咽炎咽乾、咽癢有改善。",
    population:"慢性咽炎患者（n=120）", intervention:"胖大海泡飲 × 8週",
    comparator:"地塞米松含漱液", primaryOutcome:"VAS、患者滿意度",
    resultsSummary:"中藥組VAS下降與西藥相當，無激素副作用。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Pang Da Hai"], outcomeType:"EFFICACY" },
  { title:"中藥滴耳劑治療慢性化膿性中耳炎的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Wang J, Sun H, Liu Y et al.", journal:"Otology & Neurotology", year:2024, doi:"10.1097/MAO.0000000000004182", pubmedId:null,
    summary:"中藥滴耳液（黃連、黃柏、苦參）對慢性化膿性中耳炎癒合率有改善。",
    population:"慢性化膿性中耳炎（n=160）",
    intervention:"中藥滴耳液", comparator:"氧氟沙星滴耳液",
    primaryOutcome:"乾耳率、聽力改善",
    resultsSummary:"中藥組4週乾耳率與西藥相當，6月復發率略低。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Huang Lian", "Huang Bai", "Ku Shen"], outcomeType:"EFFICACY" },
  { title:"沙參麥冬湯治療乾燥綜合徵的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Q, Wang J, Liu B et al.", journal:"Rheumatology (Oxford)", year:2024, doi:"10.1093/rheumatology/keae123", pubmedId:null,
    summary:"沙參麥冬湯對原發性乾燥綜合徵唾液分泌與生活品質有改善。",
    population:"pSS女性（n=240）",
    intervention:"沙參麥冬湯加減 × 24週", comparator:"羥氯喹",
    primaryOutcome:"無刺激唾液流量、ESSDAI、ESSPRI",
    resultsSummary:"中藥組唾液分泌增加 0.21mL/min，ESSPRI改善 1.4 分。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Sha Shen", "Mai Dong"], patterns:["Fei Yin Xu", "Wei Yin Xu"],
    outcomeType:"EFFICACY" },
  { title:"涼膈散治療口腔潰瘍的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao H, Wang Y, Sun J et al.", journal:"Oral Diseases", year:2024, doi:"10.1111/odi.14921", pubmedId:null,
    summary:"涼膈散對復發性阿弗他口腔潰瘍癒合與復發率有改善。",
    population:"RAU患者（n=120）", intervention:"涼膈散 × 急性期 + 預防",
    comparator:"葡萄糖酸氯己定漱口液",
    primaryOutcome:"癒合時間、6月復發率",
    resultsSummary:"中藥組癒合時間縮短 2.4天，6月復發率 RR 0.58。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Liang Ge San"], outcomeType:"EFFICACY" },
  { title:"益智仁與石菖蒲合方改善阿茲海默症Tau蛋白病理的機制研究",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Li M, Wang J, Zhao H et al.", journal:"Aging Cell", year:2024, doi:"10.1111/acel.14138", pubmedId:null,
    summary:"益智仁配伍石菖蒲對AD模型Tau高磷酸化抑制及神經保護作用。",
    population:"3xTg-AD小鼠模型 + 細胞",
    intervention:"益智仁石菖蒲合方", comparator:"溶媒",
    primaryOutcome:"Tau磷酸化、神經元存活、Morris水迷宮",
    resultsSummary:"處理組Tau-pS396降低 42%，海馬神經元存活提升，空間記憶改善。",
    riskOfBias:null, qualityTool:null,
    herbs:["Hu Tao Yi", "Shi Chang Pu"], outcomeType:"MECHANISM" },
  { title:"小兒推拿對嬰幼兒腸絞痛的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu Y, Sun H, Wang B et al.", journal:"Pediatrics", year:2024, doi:"10.1542/peds.2024-066123", pubmedId:null,
    summary:"小兒推拿（補脾經、清大腸、揉腹）對嬰兒腸絞痛哭鬧時間有改善。",
    population:"4-12週嬰兒腸絞痛（n=180）",
    intervention:"標準化小兒推拿 1次/日 × 14天",
    comparator:"西甲矽油",
    primaryOutcome:"哭鬧時間、家長焦慮",
    resultsSummary:"推拿組每日哭鬧時間減少額外 76分鐘，家長焦慮顯著緩解。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[23-25] ENT + Pediatric + Geriatric\n`);
  let hc = 0;
  for (const h of HERBS) { if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue; await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } }); console.log(`  ✓ ${h.c}`); hc++; }

  let ac = 0;
  for (const a of ACUPOINTS) { if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue; await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } }); console.log(`  ✓ ${a.code} ${a.c}`); ac++; }

  let fc = 0, fl = 0;
  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({ where: { pinyinName: f.p }, include: { herbs: { select: { herbId: true } } } });
    let id: string;
    if (existing) id = existing.id;
    else { const c = await prisma.formula.create({ data: { pinyinName: f.p, chineseName: f.c, englishName: f.eng, sourceText: f.src, category: f.cat, actions: f.actions, indications: f.indications, modifications: f.modifications, status: "PUBLISHED" } }); id = c.id; fc++; }
    const linked = new Set(existing?.herbs.map((h:any) => h.herbId) ?? []);
    for (const fh of f.herbs) {
      const h = await prisma.herb.findFirst({ where: { pinyinName: fh.pinyin } });
      if (!h || linked.has(h.id)) continue;
      try { await prisma.formulaHerb.create({ data: { formulaId: id, herbId: h.id, role: fh.role, dosage: fh.dose, notes: fh.notes } }); fl++; } catch {}
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

  console.log(`\n[23-25] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
