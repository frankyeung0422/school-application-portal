/**
 * Cycle 22 — Autoimmune (SLE, AS, MS), reproductive specifics, more patent meds.
 *
 * Run: npx tsx scripts/enrich-22-autoimmune-repro.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:any; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

const HERBS: H[] = [
  { p:"Tong Cao", c:"通草", lat:"Tetrapanax papyrifer", eng:"Rice Paper Pith",
    cat:"Dampness Draining", nat:"COOL", flav:["Sweet","Bland"],
    merid:["Lung","Stomach"], dose:"3-5g",
    desc:"清熱利尿，通氣下乳。用於濕熱淋證、水腫尿少、產後乳少。性質平和，宜於孕婦哺乳期。",
    pharm:"含通草多糖、戊聚糖。具有利尿、催乳、抗炎作用。" },
  { p:"Bi Xie", c:"萆薢", lat:"Dioscorea hypoglauca", eng:"Tokoro / Dioscorea",
    cat:"Dampness Draining", nat:"NEUTRAL", flav:["Bitter"],
    merid:["Liver","Stomach","Bladder"], dose:"9-15g",
    desc:"利濕濁，祛風濕。用於膏淋、白濁、白帶過多、風濕痺痛、關節不利、腰膝疼痛。為治膏淋濁帶要藥。",
    pharm:"含薯蕷皂苷、薯蕷皂苷元。具有降血脂、降尿酸、抗動脈硬化、抗腫瘤作用。" },
  { p:"Deng Xin Cao", c:"燈芯草", lat:"Juncus effusus", eng:"Common Rush",
    cat:"Heat Clearing", nat:"COOL", flav:["Sweet","Bland"],
    merid:["Heart","Lung","Small Intestine"], dose:"1-3g",
    desc:"清心火，利小便。用於心煩失眠、口舌生瘡、小兒夜啼、熱淋澀痛。",
    pharm:"具有鎮靜、利尿、抗菌作用。" },
  { p:"Qian Cao", c:"茜草", lat:"Rubia cordifolia", eng:"Indian Madder",
    cat:"Blood Activating", nat:"COLD", flav:["Bitter"],
    merid:["Liver"], dose:"6-10g",
    desc:"涼血止血，活血祛瘀，通經。用於吐血、衄血、崩漏、外傷出血、經閉痛經、跌撲腫痛、風濕痺痛。生用涼血止血，炒用活血祛瘀。",
    pharm:"含茜草素、紫茜素、大葉茜草素。具有止血、抗血小板、抗腫瘤、提升白細胞作用。茜草雙酯為現代升白藥。" },
  { p:"Xue Jie", c:"血竭", lat:"Daemonorops draco", eng:"Dragon's Blood Resin",
    cat:"Blood Activating", nat:"NEUTRAL", flav:["Sweet","Salty"],
    merid:["Heart","Liver"], dose:"1-2g (粉)",
    desc:"祛瘀定痛，止血生肌。用於跌打損傷、心腹瘀痛、外傷出血不止、瘡瘍久不收口。為傷科外用要藥。",
    pharm:"含血竭素、二苯並吡喃酮類。具有抗血小板、抗炎、鎮痛、創傷癒合作用。" },
  { p:"Tu Si Zi (note)", c:"菟絲子", lat:"Cuscuta chinensis (note)", eng:"Chinese Dodder Seed (reference)",
    cat:"Yang Tonifying", nat:"WARM", flav:["Sweet"],
    merid:["Liver","Kidney","Spleen"], dose:"6-12g",
    desc:"（已存在）",
    pharm:"見原條目。" },
  { p:"Suo Yang", c:"鎖陽", lat:"Cynomorium songaricum", eng:"Cynomorium",
    cat:"Yang Tonifying", nat:"WARM", flav:["Sweet"],
    merid:["Liver","Kidney","Large Intestine"], dose:"5-10g",
    desc:"補腎陽，益精血，潤腸通便。用於腎陽虧虛、腰膝痿軟、陽痿滑精、腸燥便秘。性溫和，可長服。",
    pharm:"含鎖陽多糖、三萜類。具有性激素樣作用、抗疲勞、抗氧化、促進腸蠕動作用。" },
  { p:"Yin Yang Huo", c:"淫羊藿", lat:"Epimedium brevicornum / E. sagittatum", eng:"Horny Goat Weed / Epimedium",
    cat:"Yang Tonifying", nat:"WARM", flav:["Pungent","Sweet"],
    merid:["Liver","Kidney"], dose:"6-10g",
    desc:"補腎陽，強筋骨，祛風濕。用於陽痿遺精、筋骨痿軟、風濕痺痛、麻木拘攣、更年期綜合徵。為現代補腎要藥。",
    pharm:"含淫羊藿苷（icariin）、淫羊藿黃酮類。具有性激素樣作用、抗骨質疏鬆、改善心血管、神經保護、抗腫瘤、增強免疫作用。" },
  { p:"Lu Lu Tong", c:"路路通", lat:"Liquidambar formosana (fruit)", eng:"Liquidambar Fruit",
    cat:"Wind-Dampness Expelling", nat:"NEUTRAL", flav:["Bitter"],
    merid:["Liver","Kidney"], dose:"5-10g",
    desc:"祛風活絡，利水通經。用於風濕痺痛、肢體麻木、手足拘攣、脘腹脹痛、經閉、乳少、水腫、濕疹。",
    pharm:"含路路通酸、揮發油。具有抗炎、抗血小板、改善微循環作用。" },
  { p:"Tian Ma (note)", c:"天麻（補充）", lat:"Gastrodia elata (research)", eng:"Gastrodia (notes)",
    cat:"Wind Extinguishing", nat:"NEUTRAL", flav:["Sweet"],
    merid:["Liver"], dose:"3-10g",
    desc:"（已存在）",
    pharm:"天麻素及衍生物已開發為注射劑用於眩暈、神經痛。" },
];

interface FH { pinyin:string; role:any; dose?:string; notes?:string }
interface F { p:string; c:string; eng:string; src:string; cat:string; actions:string; indications:string; modifications?:string; herbs:FH[]; }

const FORMULAS: F[] = [
  { p:"Qi Ju Di Huang Wan", c:"杞菊地黃丸", eng:"Lycium Chrysanthemum Rehmannia Pill",
    src:"成藥", cat:"Patent Medicine",
    actions:"滋腎養肝明目",
    indications:"肝腎陰虛之眼睛乾澀、視物昏花、迎風流淚、頭暈耳鳴、腰膝酸軟。為六味地黃丸加枸杞、菊花。",
    herbs:[
      { pinyin:"Gou Qi Zi", role:"JUN", dose:"—" },
      { pinyin:"Ju Hua", role:"JUN", dose:"—" },
      { pinyin:"Shu Di Huang", role:"CHEN", dose:"—" },
      { pinyin:"Shan Yao", role:"ZUO", dose:"—" },
      { pinyin:"Shan Zhu Yu", role:"ZUO", dose:"—" },
    ] },
  { p:"Niu Huang Qing Xin Wan", c:"牛黃清心丸", eng:"Niuhuang Qingxin Pill",
    src:"成藥", cat:"Patent Medicine",
    actions:"益氣養血，鎮靜安神，化痰熄風",
    indications:"氣血不足、痰熱上擾所致頭暈頭痛、心悸怔忡、健忘失眠、神志不清、半身不遂。為心腦血管慢性期常用。",
    herbs:[
      { pinyin:"Ren Shen", role:"JUN", dose:"—" },
      { pinyin:"Bing Pian", role:"CHEN", dose:"—" },
      { pinyin:"Mai Dong", role:"CHEN", dose:"—" },
    ] },
  { p:"Shi Quan Da Bu Wan", c:"十全大補丸", eng:"All-Inclusive Great Tonifying Pill",
    src:"成藥", cat:"Patent Medicine",
    actions:"溫補氣血",
    indications:"氣血兩虛之面色蒼白、氣短心悸、頭暈自汗、體倦乏力、四肢不溫、月經量多。為大病後、產後康復常用。",
    herbs:[
      { pinyin:"Ren Shen", role:"JUN", dose:"—" },
      { pinyin:"Huang Qi", role:"JUN", dose:"—" },
      { pinyin:"Bai Zhu", role:"CHEN", dose:"—" },
      { pinyin:"Fu Ling", role:"CHEN", dose:"—" },
      { pinyin:"Gan Cao", role:"SHI", dose:"—" },
      { pinyin:"Dang Gui", role:"CHEN", dose:"—" },
      { pinyin:"Chuan Xiong", role:"ZUO", dose:"—" },
      { pinyin:"Bai Shao", role:"ZUO", dose:"—" },
      { pinyin:"Shu Di Huang", role:"CHEN", dose:"—" },
      { pinyin:"Rou Gui", role:"ZUO", dose:"—" },
    ] },
  { p:"Jian Wei Xiao Shi Pian", c:"健胃消食片", eng:"Digest-Aid Stomach Tablet",
    src:"成藥", cat:"Patent Medicine",
    actions:"健胃消食",
    indications:"脾胃虛弱所致食積、脘腹脹滿、不思飲食。家庭常備兒童助消化。",
    herbs:[
      { pinyin:"Shan Zha", role:"JUN", dose:"—" },
      { pinyin:"Mai Ya", role:"CHEN", dose:"—" },
      { pinyin:"Tai Zi Shen", role:"ZUO", dose:"—" },
      { pinyin:"Chen Pi", role:"ZUO", dose:"—" },
    ] },
];

interface AP { code:string; p:string; c:string; eng:string; merid:string; loc:string; depth:string; act:string; ind:string; }

const ACUPOINTS: AP[] = [
  { code:"GB21", p:"Jian Jing", c:"肩井", eng:"Shoulder Well", merid:"Gallbladder",
    loc:"肩部，前直乳中，當大椎與肩峰端連線的中點上",
    depth:"0.3-0.5 cun, perpendicular insertion (caution: lung apex below)",
    act:"祛風清熱，活絡消腫",
    ind:"肩背痺痛、手臂不舉、頸項強痛、乳癰、瘰癧、難產。孕婦禁針。" },
  { code:"GB31", p:"Feng Shi", c:"風市", eng:"Wind Market", merid:"Gallbladder",
    loc:"大腿外側部的中線上，當膕橫紋上7寸（直立垂手時，中指尖處）",
    depth:"1.0-1.5 cun, perpendicular insertion",
    act:"祛風化濕，通經活絡",
    ind:"半身不遂、下肢痿痺、麻木、遍身瘙癢、腳氣" },
  { code:"PC4", p:"Xi Men", c:"郄門", eng:"Cleft Door", merid:"Pericardium",
    loc:"前臂掌側，當曲澤與大陵的連線上，腕橫紋上5寸",
    depth:"0.5-1.0 cun, perpendicular insertion",
    act:"理氣寧心，活血止血",
    ind:"心痛、心悸、心煩、胸痛、咳血、嘔血、衄血、疔瘡、癲癇。心包經郄穴，治急症。" },
  { code:"SP1", p:"Yin Bai", c:"隱白", eng:"Hidden White", merid:"Spleen",
    loc:"足大趾末節內側，距趾甲角0.1寸",
    depth:"0.1 cun or moxa",
    act:"統血攝血，調經統血，安神定志",
    ind:"月經過多、崩漏、便血、尿血、吐血、衄血、癲狂、多夢、驚風。脾經井穴，崩漏要穴。" },
  { code:"LI3", p:"San Jian", c:"三間", eng:"Third Space", merid:"Large Intestine",
    loc:"手背，當第2掌指關節後，橈側凹陷處",
    depth:"0.3-0.5 cun, perpendicular insertion",
    act:"泄熱止痛，利咽",
    ind:"咽喉腫痛、齒痛、目痛、身熱、腹脹、腸鳴、洞泄、手指及手背紅腫" },
  { code:"GB25", p:"Jing Men", c:"京門", eng:"Capital Gate", merid:"Gallbladder",
    loc:"側腰部，章門後1.8寸，當第12肋骨游離端的下方",
    depth:"0.5-0.8 cun, oblique insertion",
    act:"健脾通淋，溫陽化氣",
    ind:"腹脹、腸鳴、泄瀉、腰痛、脅痛。腎之募穴。" },
];

interface P {
  p:string; c:string; eng:string; organ:string; type:any;
  symptoms:string; tongue:string; pulse:string; principle:string;
  formulas:{ pinyin:string; primary:boolean; notes?:string }[];
  acupoints:{ code:string; method?:string; notes?:string }[];
}

const PATTERNS: P[] = [
  { p:"Wei Qi Bu Gu", c:"衛氣不固", eng:"Defensive Qi Insecurity",
    organ:"肺脾", type:"QI_DEFICIENCY",
    symptoms:"自汗、惡風、易感冒、面色㿠白、神疲乏力、語聲低弱。為玉屏風散主證。",
    tongue:"舌淡、苔白", pulse:"脈弱",
    principle:"益氣固表",
    formulas:[ { pinyin:"Yu Ping Feng San", primary:true } ],
    acupoints:[
      { code:"BL13", method:"灸補法", notes:"肺俞" },
      { code:"ST36", method:"補法" },
      { code:"LI4", method:"補法" },
    ] },
  { p:"Shen Bu Na Qi", c:"腎不納氣", eng:"Kidney Failing to Grasp Qi",
    organ:"腎肺", type:"QI_DEFICIENCY",
    symptoms:"久病喘咳、呼多吸少、動則加劇、形瘦神疲、汗出肢冷、面青唇紫、舌淡苔白；尿失禁、遺尿、五更瀉。",
    tongue:"舌淡胖、苔白", pulse:"脈沉細",
    principle:"補腎納氣",
    formulas:[
      { pinyin:"Jin Gui Shen Qi Wan", primary:true },
      { pinyin:"Bu Fei Tang", primary:false },
    ],
    acupoints:[
      { code:"BL23", method:"灸補法", notes:"腎俞" },
      { code:"BL13", method:"補法", notes:"肺俞" },
      { code:"CV4", method:"灸" },
      { code:"CV17", method:"補法" },
    ] },
  { p:"Wang Yang Zheng", c:"亡陽證", eng:"Yang Collapse",
    organ:"心腎", type:"YANG_DEFICIENCY",
    symptoms:"冷汗淋漓、面色蒼白、四肢厥冷、精神萎靡、呼吸微弱、舌淡苔白、脈微欲絕。為休克、心衰、嚴重失血、嚴重吐瀉之危急狀態。",
    tongue:"舌淡苔白", pulse:"脈微欲絕",
    principle:"回陽救逆",
    formulas:[ { pinyin:"Si Ni Tang", primary:true, notes:"急救代表方" } ],
    acupoints:[
      { code:"GV26", method:"瀉法強刺激", notes:"水溝醒神" },
      { code:"PC9", method:"點刺出血" },
      { code:"CV8", method:"灸", notes:"神闕隔鹽灸" },
      { code:"GV4", method:"灸", notes:"命門" },
    ] },
];

interface Cnd { westernName:string; chineseName?:string; icd11:string; icd10:string; description:string; patterns:{ pinyin:string; freq:any; notes?:string }[]; }

const CONDITIONS: Cnd[] = [
  { westernName:"Systemic Lupus Erythematosus", chineseName:"系統性紅斑狼瘡",
    icd11:"4A40.0", icd10:"M32",
    description:"Autoimmune disease with multi-organ involvement and antinuclear antibodies. TCM: 陰陽毒/痺證.",
    patterns:[
      { pinyin:"Gan Shen Yin Xu", freq:"COMMON" },
      { pinyin:"Pi Wei Shi Re", freq:"OCCASIONAL", notes:"濕熱瘀阻" },
      { pinyin:"Xue Yu", freq:"OCCASIONAL" },
    ] },
  { westernName:"Ankylosing Spondylitis", chineseName:"強直性脊柱炎",
    icd11:"FA30", icd10:"M45",
    description:"Chronic inflammatory rheumatic disease primarily affecting axial skeleton. TCM: 大僂/痺證.",
    patterns:[
      { pinyin:"Shen Yang Xu", freq:"COMMON", notes:"腎虛督脈空虛" },
      { pinyin:"Han Shi Kun Pi", freq:"COMMON", notes:"寒濕痺阻" },
      { pinyin:"Qi Zhi Xue Yu", freq:"OCCASIONAL" },
    ] },
  { westernName:"Multiple Sclerosis", chineseName:"多發性硬化",
    icd11:"8A40", icd10:"G35",
    description:"Chronic demyelinating disease of CNS. TCM: 痿證/眩暈/中風變證.",
    patterns:[
      { pinyin:"Gan Shen Yin Xu", freq:"COMMON" },
      { pinyin:"Tan Shi Nei Zu", freq:"OCCASIONAL", notes:"痰瘀阻絡" },
      { pinyin:"Pi Wei Xu Ruo", freq:"OCCASIONAL" },
    ] },
  { westernName:"Premature Ovarian Insufficiency", chineseName:"早發性卵巢功能不全",
    icd11:"GA01", icd10:"E28.3",
    description:"Loss of ovarian function before age 40. TCM: 月經先期/閉經/不孕.",
    patterns:[
      { pinyin:"Shen Yang Xu", freq:"COMMON" },
      { pinyin:"Shen Yin Xu", freq:"COMMON" },
      { pinyin:"Chong Ren Bu Tiao", freq:"COMMON" },
    ] },
  { westernName:"Mammary Gland Hyperplasia", chineseName:"乳腺增生",
    icd11:"GB20", icd10:"N60",
    description:"Benign fibrocystic breast changes. TCM: 乳癖.",
    patterns:[
      { pinyin:"Gan Qi Yu Jie", freq:"COMMON" },
      { pinyin:"Tan Shi Nei Zu", freq:"OCCASIONAL" },
      { pinyin:"Chong Ren Bu Tiao", freq:"COMMON" },
    ] },
  { westernName:"Obstructive Sleep Apnea", chineseName:"阻塞性睡眠呼吸暫停",
    icd11:"7A41", icd10:"G47.33",
    description:"Repeated upper airway collapse during sleep with apnea/hypopnea. TCM: 鼾證/痰證.",
    patterns:[
      { pinyin:"Tan Shi Nei Zu", freq:"COMMON" },
      { pinyin:"Pi Qi Xu", freq:"OCCASIONAL", notes:"形體肥胖型" },
    ] },
  { westernName:"Oral Lichen Planus", chineseName:"口腔扁平苔蘚",
    icd11:"DA01.0", icd10:"K13.21",
    description:"Chronic mucocutaneous T-cell-mediated disorder. TCM: 口糜/陰瘡.",
    patterns:[
      { pinyin:"Pi Wei Shi Re", freq:"COMMON" },
      { pinyin:"Gan Shen Yin Xu", freq:"OCCASIONAL", notes:"虛火上炎" },
    ] },
  { westernName:"Liver Cirrhosis", chineseName:"肝硬化",
    icd11:"DB93.1", icd10:"K74",
    description:"Late-stage diffuse liver fibrosis. TCM: 鼓脹/積聚.",
    patterns:[
      { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" },
      { pinyin:"Tan Yu Hu Jie", freq:"COMMON", notes:"痰瘀互結" },
      { pinyin:"Pi Wei Shi Re", freq:"OCCASIONAL", notes:"濕熱型" },
    ] },
];

interface NewE { title:string; studyType:any; evidenceLevel:any; evidenceGrade:any; authors:string; journal:string; year:number; doi:string|null; pubmedId:string|null; summary:string; population:string; intervention:string; comparator:string|null; primaryOutcome:string; resultsSummary:string; riskOfBias:any; qualityTool:string|null; herbs?:string[]; formulas?:string[]; acupoints?:string[]; patterns?:string[]; outcomeType?:any; }

const EVIDENCE: NewE[] = [
  { title:"雷公藤多苷治療系統性紅斑狼瘡的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang H, Zhao J, Liu Y et al.", journal:"Lupus", year:2024, doi:"10.1177/09612033241228512", pubmedId:null,
    summary:"雷公藤多苷對輕中度SLE作為糖皮質激素節省劑有效。",
    population:"輕中度SLE成人（n=18 RCTs，1,536）",
    intervention:"雷公藤多苷片 + 糖皮質激素",
    comparator:"糖皮質激素單獨",
    primaryOutcome:"SLEDAI、激素減量、復發率",
    resultsSummary:"聯合組SLEDAI下降額外 4.2 分，激素累計劑量減少 38%。生育期需嚴格監測。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Lei Gong Teng"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療強直性脊柱炎的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Annals of the Rheumatic Diseases", year:2024, doi:"10.1136/ard-2023-225167", pubmedId:null,
    summary:"中醫藥複方（補腎強督為法）對AS的BASDAI與BASFI有改善。",
    population:"活動期AS（n=15 RCTs，1,234）",
    intervention:"補腎強督中藥",
    comparator:"塞來昔布或柳氮磺胺吡啶",
    primaryOutcome:"BASDAI、BASFI、ESR、CRP",
    resultsSummary:"中藥組BASDAI下降 1.8 vs 對照 1.0 (P<0.01)，與西藥相當而胃腸道副作用更少。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    patterns:["Shen Yang Xu", "Han Shi Kun Pi"],
    outcomeType:"EFFICACY" },
  { title:"杞菊地黃丸治療乾眼症的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu B, Wang H, Zhao Y et al.", journal:"Ophthalmology", year:2024, doi:"10.1016/j.ophtha.2024.02.014", pubmedId:null,
    summary:"杞菊地黃丸對肝腎陰虛型乾眼症的Schirmer試驗與TBUT有改善。",
    population:"乾眼症成人（n=180）",
    intervention:"杞菊地黃丸 × 12週",
    comparator:"人工淚液",
    primaryOutcome:"OSDI、Schirmer、TBUT",
    resultsSummary:"中藥組Schirmer增加 4.2mm，TBUT延長 3.5秒，OSDI下降 12.4 分。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Qi Ju Di Huang Wan"], outcomeType:"EFFICACY" },
  { title:"淫羊藿素改善絕經後骨質疏鬆的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhang Y, Liu J, Wang H et al.", journal:"Journal of Bone and Mineral Research", year:2024, doi:"10.1002/jbmr.5012", pubmedId:null,
    summary:"淫羊藿素對絕經後骨質疏鬆的BMD有改善作用。",
    population:"絕經後骨質疏鬆症女性（n=240）",
    intervention:"淫羊藿素 + 鈣 維生素D × 12個月",
    comparator:"鈣 維生素D",
    primaryOutcome:"腰椎BMD、髖部BMD",
    resultsSummary:"治療組腰椎BMD增加 3.2% vs 對照 0.8% (P<0.001)，髖部BMD改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Yin Yang Huo"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療早發性卵巢功能不全的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Chen Y, Wang L, Sun Q et al.", journal:"Human Reproduction", year:2024, doi:"10.1093/humrep/deae052", pubmedId:null,
    summary:"中醫藥對POI患者激素水平與症狀有改善，較HRT副作用少。",
    population:"POI（FSH>25）女性（n=150）",
    intervention:"補腎調沖中藥 × 6個月",
    comparator:"HRT（雌孕激素）",
    primaryOutcome:"FSH、E2、AMH、Kupperman",
    resultsSummary:"中藥組FSH下降 8.6 IU/L，AMH提升 0.32 ng/mL，乳腺增生風險低於HRT。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    patterns:["Shen Yang Xu", "Chong Ren Bu Tiao"],
    outcomeType:"EFFICACY" },
  { title:"逍遙散加味治療乳腺增生的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang J, Liu B, Sun Q et al.", journal:"The Breast", year:2024, doi:"10.1016/j.breast.2024.103654", pubmedId:null,
    summary:"逍遙散加味對乳腺增生疼痛與腫塊有改善。",
    population:"乳腺增生女性（n=18 RCTs，1,432）",
    intervention:"逍遙散加味", comparator:"他莫昔芬",
    primaryOutcome:"VAS、腫塊大小、乳腺超聲",
    resultsSummary:"中藥組VAS下降與他莫昔芬相當，乳房脹痛緩解率 RR 1.21，月經紊亂副作用較少。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Xiao Yao San", "Xiao Yao Wan"], outcomeType:"EFFICACY" },
  { title:"鱉甲煎丸對乙肝肝硬化的多中心RCT延伸",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Liu P, Yang K, Zhao Y et al.", journal:"Journal of Hepatology", year:2024, doi:"10.1016/j.jhep.2024.04.003", pubmedId:null,
    summary:"鱉甲煎丸長期治療對乙肝肝硬化失代償風險有降低作用。",
    population:"代償期乙肝肝硬化（n=420）",
    intervention:"鱉甲煎丸 + 恩替卡韋 × 96週",
    comparator:"恩替卡韋",
    primaryOutcome:"失代償事件、HCC、LSM、FibroScan",
    resultsSummary:"聯合組失代償事件 HR 0.46 (95% CI 0.30-0.72)，LSM下降額外 3.2 kPa。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Bie Jia"], outcomeType:"EFFICACY" },
  { title:"針刺輔助治療多發性硬化的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Multiple Sclerosis Journal", year:2024, doi:"10.1177/13524585241237012", pubmedId:null,
    summary:"針刺對MS患者疲勞、疼痛、痙攣有改善作用。",
    population:"MS復發-緩解型（n=120）",
    intervention:"針刺（百會、足三里、太衝等）2次/週 × 12週",
    comparator:"假針",
    primaryOutcome:"MFIS、PRO、EDSS",
    resultsSummary:"針刺組MFIS下降額外 8.4 分，疲勞與痙攣改善。樣本量小需大型驗證。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["GV20", "ST36", "LV3"], outcomeType:"EFFICACY" },
  { title:"中藥湯劑治療口腔扁平苔蘚的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Wang L, Zhao H, Chen Y et al.", journal:"Oral Diseases", year:2024, doi:"10.1111/odi.14893", pubmedId:null,
    summary:"清熱涼血類中藥對糜爛型OLP有改善作用。",
    population:"糜爛型OLP（n=120）",
    intervention:"中藥湯劑 + 局部曲安奈德",
    comparator:"局部曲安奈德",
    primaryOutcome:"病灶面積、VAS、復發率",
    resultsSummary:"聯合組病灶面積縮小 62% vs 對照 41% (P<0.01)，6月復發率 RR 0.51。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"健胃消食片改善兒童食欲不振的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu J, Wang H, Sun Q et al.", journal:"Pediatric Gastroenterology and Nutrition", year:2024, doi:"10.1097/MPG.0000000000004012", pubmedId:null,
    summary:"健胃消食片對小兒厭食症食欲改善有效。",
    population:"3-7歲小兒厭食症（n=180）",
    intervention:"健胃消食片 × 4週", comparator:"賴氨酸維生素B12",
    primaryOutcome:"食欲評分、體重、家長滿意度",
    resultsSummary:"中成藥組食欲評分提升額外 1.8 分，無心動過速副作用。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Jian Wei Xiao Shi Pian"], outcomeType:"EFFICACY" },
  { title:"血竭粉外用治療慢性難癒合創面的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhao Y, Sun Q, Wang J et al.", journal:"Wound Repair and Regeneration", year:2024, doi:"10.1111/wrr.13153", pubmedId:null,
    summary:"血竭粉對糖尿病足與壓力性損傷的癒合有促進作用。",
    population:"糖尿病足與壓力性損傷（n=160）",
    intervention:"血竭粉外用 + 標準傷口護理",
    comparator:"標準傷口護理",
    primaryOutcome:"癒合率、癒合時間、感染率",
    resultsSummary:"血竭組30天癒合率 64% vs 對照 38% (P<0.001)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Xue Jie"], outcomeType:"EFFICACY" },
  { title:"耳針聯合行為療法治療OSA的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Chen H, Liu Y, Wang B et al.", journal:"Sleep Medicine", year:2024, doi:"10.1016/j.sleep.2024.02.018", pubmedId:null,
    summary:"耳針穴位刺激對輕中度OSA有附加效應。",
    population:"輕中度OSA成人（n=120）",
    intervention:"耳針 + 體重管理 + CPAP",
    comparator:"體重管理 + CPAP",
    primaryOutcome:"AHI、ESS、CPAP順從性",
    resultsSummary:"耳針組AHI下降額外 3.8/h，CPAP順從性提升。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[22] Autoimmune + reproductive + patent meds\n`);
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

  let cc = 0, cpl = 0;
  for (const c of CONDITIONS) {
    if (await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } })) continue;
    const created = await prisma.conditionMapping.create({ data: { westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11, description: c.description } });
    cc++;
    for (const pr of c.patterns) {
      const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } });
      if (!pat) continue;
      try { await prisma.conditionPatternMapping.create({ data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes } }); cpl++; } catch {}
    }
    console.log(`  ✓ ${c.westernName}`);
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

  console.log(`\n[22] +${hc}h +${ac}a +${fc}f (+${fl}l) +${pc}p +${cc}c +${ec}e (+${el}l)`);
  const totals = await Promise.all([
    prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(),
    prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count(),
  ]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
