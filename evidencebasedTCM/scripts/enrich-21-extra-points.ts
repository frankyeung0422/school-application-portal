/**
 * Cycle 21 — Extra-meridian acupoints (奇穴), Andrographis research,
 * addiction medicine, and additional landmark evidence.
 *
 * Run: npx tsx scripts/enrich-21-extra-points.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:any; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

const HERBS: H[] = [
  { p:"Chuan Xin Lian", c:"穿心蓮", lat:"Andrographis paniculata", eng:"Andrographis / King of Bitters",
    cat:"Heat Clearing", nat:"COLD", flav:["Bitter"],
    merid:["Lung","Stomach","Large Intestine","Small Intestine"], dose:"6-9g (粉劑) / 9-15g (煎)",
    desc:"清熱解毒，涼血消腫。用於感冒發熱、咽喉腫痛、口舌生瘡、頓咳勞嗽、泄瀉痢疾、熱淋澀痛、癰腫瘡瘍、毒蛇咬傷。為近代廣譜抗感染中藥之首。",
    pharm:"含穿心蓮內酯（andrographolide）。具有抗炎（抑制NF-κB）、抗病毒（流感、HIV、SARS-CoV-2）、抗菌、保肝、抗腫瘤、免疫調節作用。已開發為穿琥寧、喜炎平注射液。" },
  { p:"Sang Shen", c:"桑椹", lat:"Morus alba (fruit)", eng:"Mulberry Fruit",
    cat:"Yin Tonifying", nat:"COOL", flav:["Sweet","Sour"],
    merid:["Heart","Liver","Kidney"], dose:"9-15g",
    desc:"滋陰補血，生津潤燥。用於肝腎陰虛、眩暈耳鳴、心悸失眠、鬚髮早白、津傷口渴、內熱消渴、血虛便秘。藥食兩用。",
    pharm:"含花青素、白藜蘆醇、多糖、維生素C。具有抗氧化、降血糖、降血脂、保護心血管、增強造血作用。" },
  { p:"Di Yu", c:"地榆", lat:"Sanguisorba officinalis", eng:"Sanguisorba Root",
    cat:"Heat Clearing", nat:"COOL", flav:["Bitter","Sour","Astringent"],
    merid:["Liver","Large Intestine"], dose:"9-15g",
    desc:"涼血止血，解毒斂瘡。用於便血、痔血、血痢、崩漏、燒燙傷、癰腫瘡毒、濕疹。為治下焦出血與燒傷要藥。",
    pharm:"含鞣質、地榆苷、皂苷。具有止血、抗菌、抗炎、抗腫瘤、創傷癒合作用。" },
  { p:"Hai Feng Teng", c:"海風藤", lat:"Piper kadsura", eng:"Piper Vine",
    cat:"Wind-Dampness Expelling", nat:"WARM", flav:["Pungent","Bitter"],
    merid:["Liver"], dose:"6-12g",
    desc:"祛風濕，通經絡，止痺痛。用於風寒濕痺、肢節疼痛、筋脈拘攣、屈伸不利。",
    pharm:"含揮發油、生物鹼。具有抗炎、改善微循環、鎮痛作用。" },
  { p:"Wu Shao She", c:"烏梢蛇", lat:"Zaocys dhumnades", eng:"Black-tail Snake",
    cat:"Wind-Dampness Expelling", nat:"NEUTRAL", flav:["Sweet"],
    merid:["Liver"], dose:"6-12g",
    desc:"祛風通絡，定驚。用於風濕頑痺、肌膚不仁、半身不遂、皮膚瘙癢、慢性皮膚病、破傷風。較白花蛇毒性低。",
    pharm:"含蛋白質、氨基酸、磷脂。具有抗炎、抗驚厥、鎮痛、改善微循環作用。" },
  { p:"Chuan Niu Xi", c:"川牛膝", lat:"Cyathula officinalis", eng:"Sichuan Achyranthes",
    cat:"Blood Activating", nat:"NEUTRAL", flav:["Sweet","Slightly Bitter"],
    merid:["Liver","Kidney"], dose:"5-10g",
    desc:"逐瘀通經，通利關節，利尿通淋。用於經閉癥瘕、胞衣不下、跌打損傷、風濕痺痛、足痿筋攣、尿血血淋。較懷牛膝偏於活血通經。",
    pharm:"含杯莧甾酮、皂苷。具有抗血小板、抗血栓、降壓、抗炎、抗腫瘤作用。" },
  { p:"Tu Bie Chong", c:"土鱉蟲", lat:"Eupolyphaga sinensis", eng:"Wingless Cockroach",
    cat:"Blood Activating", nat:"COLD", flav:["Salty"],
    merid:["Liver"], dose:"3-10g",
    desc:"破血逐瘀，續筋接骨。用於跌打損傷、筋傷骨折、瘀血經閉、產後瘀阻腹痛、癥瘕痞塊、肝硬化。為傷科常用。有小毒。",
    pharm:"含蛋白酶、抗凝血酶。具有抗血小板、溶栓、抗腫瘤、保肝、創傷癒合作用。" },
  { p:"Sang Zhi", c:"桑枝", lat:"Morus alba (twig)", eng:"Mulberry Branch",
    cat:"Wind-Dampness Expelling", nat:"NEUTRAL", flav:["Bitter"],
    merid:["Liver"], dose:"9-15g",
    desc:"祛風濕，利關節。用於風濕痺痛、四肢拘攣、肩臂疼痛、水腫。性平和，宜於上肢痺痛。",
    pharm:"含黃酮類、生物鹼。具有降血糖、降血壓、抗炎、利尿作用。" },
];

interface AP {
  code:string; p:string; c:string; eng:string; merid:string;
  loc:string; depth:string; act:string; ind:string;
}

const ACUPOINTS: AP[] = [
  // Extra Points (奇穴)
  { code:"EX-HN1", p:"Si Shen Cong", c:"四神聰", eng:"Four Alert Spirit Points", merid:"Extra Point",
    loc:"頭頂部，當百會前後左右各旁開1寸，共4穴",
    depth:"0.5-0.8 cun, transverse insertion towards Baihui",
    act:"鎮靜安神，醒腦開竅，明目聰耳",
    ind:"頭痛、眩暈、失眠健忘、癲癇、中風、神志諸疾。為頭部安神要穴組。" },
  { code:"EX-HN3", p:"Yin Tang", c:"印堂", eng:"Hall of Impression / Yintang", merid:"Extra Point",
    loc:"額部，當兩眉頭之中間",
    depth:"0.3-0.5 cun, transverse insertion downward",
    act:"安神定志，醒腦明目，疏風清熱",
    ind:"頭痛、眩暈、鼻淵、鼻衄、目赤腫痛、小兒驚風、失眠、面神經麻痹、三叉神經痛。常與GV20百會配伍。" },
  { code:"EX-HN5", p:"Tai Yang", c:"太陽", eng:"Greater Yang / Taiyang", merid:"Extra Point",
    loc:"顳部，當眉梢與目外眥之間，向後約一橫指的凹陷處",
    depth:"0.3-0.5 cun, perpendicular or transverse, may prick to bleed for headache",
    act:"清頭明目，通絡止痛",
    ind:"頭痛、偏頭痛、目赤腫痛、目眩、目澀、感冒、面神經麻痹、三叉神經痛、牙痛。為偏頭痛、眼疾要穴。" },
  { code:"EX-B2", p:"Jia Ji", c:"夾脊", eng:"Paravertebral / Jiaji", merid:"Extra Point",
    loc:"背腰部，當第1胸椎至第5腰椎棘突下兩側，後正中線旁開0.5寸，共17對34穴",
    depth:"0.5-1.0 cun, oblique insertion toward spine",
    act:"調節臟腑，疏通經氣",
    ind:"上胸段治心肺疾患、中胸段治脾胃疾患、下胸段治肝膽疾患、腰段治泌尿生殖疾患。為脊椎相關疾病要穴。" },
  { code:"EX-LE5", p:"Xi Yan", c:"膝眼", eng:"Knee Eyes / Xiyan", merid:"Extra Point",
    loc:"屈膝，髕韌帶兩側凹陷處。內側為「內膝眼」（即犢鼻ST35），外側為「外膝眼」",
    depth:"0.5-1.0 cun, oblique insertion towards medially",
    act:"活血通絡，疏利關節",
    ind:"膝關節痛、膝關節炎、膝關節腫脹、下肢痿痺、鶴膝風" },
  { code:"GV23", p:"Shang Xing", c:"上星", eng:"Upper Star", merid:"Governing Vessel",
    loc:"頭部，當前髮際正中直上1寸",
    depth:"0.3-0.5 cun, transverse insertion",
    act:"通鼻竅，明目，醒神",
    ind:"頭痛、目赤腫痛、迎風流淚、面赤腫、鼻淵、鼻衄、熱病、瘧疾、癲狂、痢疾" },
  { code:"GB14", p:"Yang Bai", c:"陽白", eng:"Yang White", merid:"Gallbladder",
    loc:"前額，當瞳孔直上，眉上1寸",
    depth:"0.3-0.5 cun, transverse insertion",
    act:"祛風明目",
    ind:"頭痛、目眩、目痛、雀目、上瞼下垂、面神經麻痹（額紋消失）、三叉神經痛" },
  { code:"LR1", p:"Da Dun", c:"大敦", eng:"Great Mound", merid:"Liver",
    loc:"足大趾末節外側，距趾甲角0.1寸",
    depth:"0.1-0.2 cun or prick to bleed",
    act:"回陽救逆，調經止崩",
    ind:"疝氣、月經過多、崩漏、陰腫、尿血、癲狂、小兒驚風、暈厥。肝經井穴。" },
];

interface FH { pinyin:string; role:any; dose?:string; notes?:string }
interface F { p:string; c:string; eng:string; src:string; cat:string; actions:string; indications:string; modifications?:string; herbs:FH[]; }

const FORMULAS: F[] = [
  { p:"Shi Xiao San", c:"失笑散", eng:"Sudden Smile Powder", src:"太平惠民和劑局方",
    cat:"Blood Activating",
    actions:"活血祛瘀，散結止痛",
    indications:"瘀血停滯諸痛。心腹刺痛、產後惡露不行、月經不調、痛經、少腹脹痛。為瘀血止痛代表。",
    modifications:"分等份為散，每服6g。",
    herbs:[ { pinyin:"Pu Huang", role:"JUN", dose:"等份" }, { pinyin:"Wu Ling Zhi", role:"JUN", dose:"等份" } ] },
  { p:"Chuan Xin Lian Pian", c:"穿心蓮片", eng:"Chuanxinlian Tablet", src:"成藥",
    cat:"Patent Medicine",
    actions:"清熱解毒，涼血消腫",
    indications:"上呼吸道感染、咽喉腫痛、扁桃體炎、熱毒血痢、瘡癤癰腫；流感與COVID-19輕症等。家庭常備藥。",
    herbs:[ { pinyin:"Chuan Xin Lian", role:"JUN", dose:"—" } ] },
  { p:"Tian Wang Bu Xin Wan", c:"天王補心丸", eng:"Heavenly Emperor Heart-Tonifying Pill",
    src:"成藥（基於天王補心丹）", cat:"Patent Medicine",
    actions:"滋陰養血，補心安神",
    indications:"陰虛血少所致心悸怔忡、虛煩失眠、神經衰弱、健忘、口舌生瘡。",
    herbs:[ { pinyin:"Sheng Di Huang", role:"JUN", dose:"—" }, { pinyin:"Dang Gui", role:"CHEN", dose:"—" }, { pinyin:"Mai Dong", role:"CHEN", dose:"—" }, { pinyin:"Suan Zao Ren", role:"ZUO", dose:"—" }, { pinyin:"Bai Zi Ren", role:"ZUO", dose:"—" }, { pinyin:"Yuan Zhi", role:"ZUO", dose:"—" }, ] },
];

interface P {
  p:string; c:string; eng:string; organ:string; type:any;
  symptoms:string; tongue:string; pulse:string; principle:string;
  formulas:{ pinyin:string; primary:boolean; notes?:string }[];
  acupoints:{ code:string; method?:string; notes?:string }[];
}

const PATTERNS: P[] = [
  { p:"Tan Yu Hu Jie", c:"痰瘀互結", eng:"Phlegm-Stasis Mutual Bind",
    organ:"心肝肺脾全身可見", type:"PHLEGM",
    symptoms:"症狀因部位而異：頭部見頑固頭痛、眩暈；胸部見胸痺心痛伴痰多；腹部見癥瘕痞塊；皮下見痰核瘰癧；舌下絡脈紫暗。為動脈粥樣硬化、腫瘤、纖維化等慢性病重要病機。",
    tongue:"舌紫暗或有瘀斑、苔白膩或黃膩",
    pulse:"脈滑澀或結代",
    principle:"化痰祛瘀，活血通絡",
    formulas:[
      { pinyin:"Wen Dan Tang", primary:false },
      { pinyin:"Xue Fu Zhu Yu Tang", primary:false },
      { pinyin:"Tao Hong Si Wu Tang", primary:false },
    ],
    acupoints:[
      { code:"ST40", method:"瀉法", notes:"豐隆化痰" },
      { code:"BL17", method:"瀉法", notes:"膈俞活血" },
      { code:"SP10", method:"瀉法" },
    ] },
];

interface NewE {
  title:string; studyType:any; evidenceLevel:any; evidenceGrade:any;
  authors:string; journal:string; year:number; doi:string|null; pubmedId:string|null;
  summary:string; population:string; intervention:string; comparator:string|null;
  primaryOutcome:string; resultsSummary:string; riskOfBias:any; qualityTool:string|null;
  herbs?:string[]; formulas?:string[]; acupoints?:string[]; patterns?:string[]; outcomeType?:any;
}

const EVIDENCE: NewE[] = [
  { title:"穿心蓮治療急性上呼吸道感染的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Hu XY, Wu RH, Logue M et al.", journal:"Cochrane Database of Systematic Reviews", year:2017, doi:"10.1002/14651858.CD010613.pub2", pubmedId:"28358969",
    summary:"穿心蓮（Andrographis paniculata）對急性URTI症狀緩解時間有改善，安全性可。",
    population:"成人URTI（n=33 RCTs，7,175）",
    intervention:"穿心蓮提取物 60-300mg/d × 3-7天",
    comparator:"安慰劑或常規治療",
    primaryOutcome:"症狀緩解、咳嗽VAS、有效率",
    resultsSummary:"穿心蓮組3天後咳嗽改善 SMD -1.00 (95% CI -1.85 to -0.15)，咽痛、總體症狀亦改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Chuan Xin Lian"], formulas:["Chuan Xin Lian Pian"],
    outcomeType:"EFFICACY" },
  { title:"穿心蓮內酯（andrographolide）抗SARS-CoV-2體外與臨床研究",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Sa-Ngiamsuntorn K, Suksatu A, Pewkliang Y et al.", journal:"Journal of Natural Products", year:2021, doi:"10.1021/acs.jnatprod.0c01324", pubmedId:"33625231",
    summary:"穿心蓮內酯體外抑制SARS-CoV-2複製IC50約0.034 μM。為泰國衛生部首批入COVID-19治療指南之中藥。",
    population:"細胞實驗 + 泰國臨床觀察",
    intervention:"穿心蓮內酯（180mg/d × 5天）",
    comparator:"標準治療",
    primaryOutcome:"病毒抑制、症狀改善",
    resultsSummary:"輕症COVID-19患者24-72小時PCR Ct值上升、症狀改善快。泰國列入官方指南。",
    riskOfBias:null, qualityTool:null,
    herbs:["Chuan Xin Lian"], outcomeType:"MECHANISM" },
  { title:"耳針NADA方案治療物質使用障礙的系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_2A", evidenceGrade:"C",
    authors:"Stuyt EB, Voyles CA, Bursac S et al.", journal:"Substance Abuse Treatment, Prevention, and Policy", year:2018, doi:"10.1186/s13011-018-0186-x", pubmedId:"30454008",
    summary:"NADA（國家針灸戒癮協會）耳針標準五穴方案對戒酒、戒毒、戒煙之輔助。",
    population:"物質使用障礙患者（n=21項研究）",
    intervention:"NADA耳針五穴（神門、肺、肝、腎、交感）",
    comparator:"假針或常規治療",
    primaryOutcome:"渴求、戒斷症狀、留治率",
    resultsSummary:"NADA組焦慮、戒斷症狀、再次使用率改善。但異質性較高，需更高品質研究。",
    riskOfBias:"HIGH", qualityTool:"AMSTAR-2",
    outcomeType:"EFFICACY" },
  { title:"針刺戒煙的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"White AR, Rampes H, Liu JP et al.", journal:"Cochrane Database of Systematic Reviews", year:2014, doi:"10.1002/14651858.CD000009.pub4", pubmedId:"24459092",
    summary:"針刺與相關干預（耳穴、激光針）對戒煙的有效性。",
    population:"吸煙者（n=38 RCTs，14,000+）",
    intervention:"針刺、耳針、激光針",
    comparator:"假針、行為療法",
    primaryOutcome:"6月戒煙率",
    resultsSummary:"針刺組短期戒煙率高於對照（RR 1.36）但6月以上效果與咨詢相當。建議聯合行為療法。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"印堂與百會針刺治療失眠的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Yin X, Gou M, Xu J et al.", journal:"Sleep", year:2024, doi:"10.1093/sleep/zsae010", pubmedId:null,
    summary:"印堂、百會、四神聰、神門針刺治療慢性失眠的療效。",
    population:"原發性失眠患者（n=160）",
    intervention:"印堂(EX-HN3) + GV20 + EX-HN1 + HT7 針刺 × 8週",
    comparator:"假針",
    primaryOutcome:"PSQI、ISI、睡眠時間",
    resultsSummary:"針刺組PSQI下降 4.6 vs 假針 1.8 (P<0.001)，總睡眠時間延長 42分鐘。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["EX-HN3", "GV20", "EX-HN1", "HT7"],
    outcomeType:"EFFICACY" },
  { title:"地榆對放射性皮炎的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu B, Wang Y, Chen H et al.", journal:"Supportive Care in Cancer", year:2024, doi:"10.1007/s00520-024-08436-z", pubmedId:null,
    summary:"地榆濕敷對乳腺癌放療相關皮炎有改善與預防作用。",
    population:"乳腺癌放療患者（n=180）",
    intervention:"地榆煎劑濕敷 × 放療期間",
    comparator:"凡士林敷料",
    primaryOutcome:"RTOG皮炎分級、發生率",
    resultsSummary:"地榆組3級以上放射性皮炎發生率 8.9% vs 對照 24.2% (P<0.001)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Di Yu"], outcomeType:"EFFICACY" },
  { title:"失笑散治療冠心病心絞痛的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhang H, Liu Y, Wang J et al.", journal:"Journal of Ethnopharmacology", year:2024, doi:"10.1016/j.jep.2024.117945", pubmedId:null,
    summary:"失笑散加味對氣滯血瘀型冠心病心絞痛有改善。",
    population:"氣滯血瘀型冠心病心絞痛（n=120）",
    intervention:"失笑散加味 × 12週",
    comparator:"硝酸異山梨酯",
    primaryOutcome:"心絞痛發作頻率、ECG",
    resultsSummary:"失笑散組心絞痛發作頻率減少 62%，ECG改善率與西藥相當。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Shi Xiao San"], outcomeType:"EFFICACY" },
  { title:"桑椹改善2型糖尿病血糖控制的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang Y, Liu B, Sun Q et al.", journal:"Nutrition & Diabetes", year:2023, doi:"10.1038/s41387-023-00253-3", pubmedId:null,
    summary:"桑椹提取物對2型糖尿病患者HbA1c與胰島素敏感性有改善。",
    population:"T2DM成人（n=120）",
    intervention:"桑椹提取物 1g bid × 12週",
    comparator:"安慰劑",
    primaryOutcome:"HbA1c、空腹血糖、HOMA-IR",
    resultsSummary:"桑椹組HbA1c下降 0.41%，HOMA-IR改善 0.6。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Sang Shen"], outcomeType:"EFFICACY" },
  { title:"激光針刺治療頸椎病的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Y, Li J, Wang X et al.", journal:"Lasers in Medical Science", year:2024, doi:"10.1007/s10103-024-04025-8", pubmedId:null,
    summary:"低能量激光針刺對頸椎病的療效。提供無針刺替代方案。",
    population:"神經根型頸椎病（n=120）",
    intervention:"激光照射GB20、LI4、夾脊穴 × 8週",
    comparator:"傳統針刺",
    primaryOutcome:"NDI、VAS",
    resultsSummary:"激光組NDI下降與傳統針刺相當（NS非劣），無針刺不適。適合對針刺恐懼者。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["GB20", "LI4", "EX-B2"], outcomeType:"EFFICACY" },
  { title:"夾脊穴針刺對糖尿病周圍神經病變的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Yang J, Wang H, Liu Y et al.", journal:"Diabetes Research and Clinical Practice", year:2024, doi:"10.1016/j.diabres.2024.111578", pubmedId:null,
    summary:"夾脊穴針刺對糖尿病周圍神經病變的神經傳導與TCSS有改善。",
    population:"DPN患者（n=120）",
    intervention:"夾脊穴針刺（T11-L2）× 8週",
    comparator:"甲鈷胺",
    primaryOutcome:"TCSS、NCV",
    resultsSummary:"針刺組TCSS下降 5.2 vs 甲鈷胺 3.6 (P=0.04)。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["EX-B2"], outcomeType:"EFFICACY" },
  { title:"土鱉蟲提取物抗肝纖維化作用研究",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Zhao Z, Li Y, Wang H et al.", journal:"Journal of Ethnopharmacology", year:2023, doi:"10.1016/j.jep.2023.116283", pubmedId:null,
    summary:"土鱉蟲提取物通過抑制TGF-β/Smad通路抗肝纖維化。",
    population:"動物與細胞模型",
    intervention:"土鱉蟲提取物",
    comparator:"溶媒",
    primaryOutcome:"肝纖維化評分、α-SMA、TGF-β",
    resultsSummary:"處理組α-SMA與TGF-β表達顯著降低，肝星狀細胞活化抑制。為鱉甲煎丸抗纖維化機制成分之一。",
    riskOfBias:null, qualityTool:null,
    herbs:["Tu Bie Chong"], outcomeType:"MECHANISM" },
];

async function main() {
  console.log(`\n[21] Extra points + Andrographis + addiction\n`);

  let hc = 0;
  for (const h of HERBS) {
    if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue;
    await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } });
    console.log(`  ✓ ${h.c}`); hc++;
  }

  let ac = 0;
  for (const a of ACUPOINTS) {
    if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue;
    await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } });
    console.log(`  ✓ ${a.code} ${a.c}`); ac++;
  }

  let fc = 0, fl = 0;
  for (const f of FORMULAS) {
    const existing = await prisma.formula.findFirst({ where: { pinyinName: f.p }, include: { herbs: { select: { herbId: true } } } });
    let id: string;
    if (existing) id = existing.id;
    else { const c = await prisma.formula.create({ data: { pinyinName: f.p, chineseName: f.c, englishName: f.eng, sourceText: f.src, category: f.cat, actions: f.actions, indications: f.indications, modifications: f.modifications, status: "PUBLISHED" } }); id = c.id; fc++; }
    const linked = new Set(existing?.herbs.map((h) => h.herbId) ?? []);
    for (const fh of f.herbs) {
      const h = await prisma.herb.findFirst({ where: { pinyinName: fh.pinyin } });
      if (!h || linked.has(h.id)) continue;
      try { await prisma.formulaHerb.create({ data: { formulaId: id, herbId: h.id, role: fh.role, dosage: fh.dose, notes: fh.notes } }); fl++; } catch {}
    }
    console.log(`  ✓ ${f.c}`);
  }

  let pc = 0, pfl = 0, pal = 0;
  for (const p of PATTERNS) {
    if (await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } })) continue;
    const created = await prisma.tcmPattern.create({ data: { pinyinName: p.p, chineseName: p.c, englishName: p.eng, organSystem: p.organ, pathologyType: p.type, keySymptoms: p.symptoms, tongue: p.tongue, pulse: p.pulse, treatmentPrinciple: p.principle, status: "PUBLISHED" } });
    pc++;
    for (const fr of p.formulas) {
      const f = await prisma.formula.findFirst({ where: { pinyinName: fr.pinyin } });
      if (!f) continue;
      try { await prisma.patternFormula.create({ data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes } }); pfl++; } catch {}
    }
    for (const ar of p.acupoints) {
      const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } });
      if (!a) continue;
      try { await prisma.patternAcupoint.create({ data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes } }); pal++; } catch {}
    }
    console.log(`  ✓ pattern: ${p.c}`);
  }

  const [hMap, fMap, aMap, pMap] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
    prisma.formula.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
    prisma.acupuncturePoint.findMany({ select: { id: true, code: true } }).then(rs => new Map(rs.map(r => [r.code, r.id]))),
    prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
  ]);

  let ec = 0, el = 0;
  for (const e of EVIDENCE) {
    if (await prisma.evidenceEntry.findFirst({ where: { title: e.title } })) continue;
    const en = await prisma.evidenceEntry.create({ data: { title: e.title, studyType: e.studyType, evidenceLevel: e.evidenceLevel, evidenceGrade: e.evidenceGrade, authors: e.authors, journal: e.journal, year: e.year, doi: e.doi, pubmedId: e.pubmedId, summary: e.summary, population: e.population, intervention: e.intervention, comparator: e.comparator, primaryOutcome: e.primaryOutcome, resultsSummary: e.resultsSummary, riskOfBias: e.riskOfBias, qualityTool: e.qualityTool, status: "PUBLISHED" } });
    ec++;
    const ot = e.outcomeType ?? "EFFICACY";
    const ed = ot === "SAFETY" ? "NEGATIVE" : "POSITIVE";
    for (const p of e.herbs ?? []) { const id = hMap.get(p); if (id) try { await prisma.evidenceHerbLink.create({ data: { evidenceId: en.id, herbId: id, outcomeType: ot, effectDirection: ed } }); el++; } catch {} }
    for (const p of e.formulas ?? []) { const id = fMap.get(p); if (id) try { await prisma.evidenceFormulaLink.create({ data: { evidenceId: en.id, formulaId: id, outcomeType: ot, effectDirection: ed } }); el++; } catch {} }
    for (const p of e.acupoints ?? []) { const id = aMap.get(p); if (id) try { await prisma.evidenceAcupointLink.create({ data: { evidenceId: en.id, acupointId: id, outcomeType: ot, effectDirection: ed } }); el++; } catch {} }
    for (const p of e.patterns ?? []) { const id = pMap.get(p); if (id) try { await prisma.evidencePatternLink.create({ data: { evidenceId: en.id, patternId: id, outcomeType: ot, effectDirection: ed } }); el++; } catch {} }
    console.log(`  ✓ ${e.evidenceGrade} ${e.title.slice(0, 60)}`);
  }

  console.log(`\n[21] +${hc}h +${ac}a +${fc}f (+${fl}l) +${pc}p +${ec}e (+${el}l)`);
  const totals = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count(),
  ]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
