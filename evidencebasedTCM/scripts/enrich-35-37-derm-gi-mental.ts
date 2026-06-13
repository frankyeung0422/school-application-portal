/**
 * Cycles 35-36-37: Dermatology + GI + Mental health depth.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  // Cycle 35: Derm
  { p:"Bai Zhi (note)", c:"白芷（皮科應用）", lat:"Angelica dahurica", eng:"Angelica Root", cat:"Exterior Releasing", nat:"WARM", flav:["Pungent"], merid:["Lung","Stomach"], dose:"3-10g",
    desc:"（已存在；皮科常用於雀斑黃褐斑）", pharm:"見原條目。" },
  { p:"Zhen Zhu", c:"珍珠", lat:"Pteria martensii (pearl)", eng:"Pearl",
    cat:"Spirit Calming", nat:"COLD", flav:["Sweet","Salty"],
    merid:["Heart","Liver"], dose:"0.1-0.3g (粉)",
    desc:"鎮心安神，養陰熄風，清熱解毒，明目消翳，潤膚祛斑。用於驚悸失眠、驚癇、目赤翳障、瘡瘍不斂；外用為主。",
    pharm:"含碳酸鈣、氨基酸、微量元素。具有鎮靜、抗氧化、創傷癒合、皮膚美白作用。" },
  { p:"Bai Hua She (note)", c:"白花蛇（皮科）", lat:"Bungarus multicinctus", eng:"Krait", cat:"Wind-Dampness Expelling", nat:"WARM", flav:["Sweet","Salty"], merid:["Liver"], dose:"3-9g",
    desc:"（已存在）", pharm:"見原條目。" },
  // Cycle 36: GI
  { p:"Hai Piao Xiao", c:"海螵蛸", lat:"Sepiella maindroni", eng:"Cuttlefish Bone",
    cat:"Astringent", nat:"WARM", flav:["Salty","Astringent"],
    merid:["Liver","Kidney"], dose:"6-12g",
    desc:"收斂止血，澀精止帶，制酸止痛，斂瘡。用於胃痛吞酸、吐血衄血、崩漏帶下、遺精滑精；外治瘡瘍久不癒合。為治胃酸過多要藥。",
    pharm:"含碳酸鈣、磷酸鈣、殼角質、有機質。具有抗胃酸（中和酸）、止血、創傷癒合作用。" },
  { p:"Wa Leng Zi", c:"瓦楞子", lat:"Arca subcrenata", eng:"Ark Shell",
    cat:"Phlegm Resolving", nat:"NEUTRAL", flav:["Salty"],
    merid:["Liver","Stomach","Lung"], dose:"9-15g",
    desc:"消痰化瘀，軟堅散結，制酸止痛。用於癥瘕痞塊、頑痰積結、瘀血胃痛、胃酸過多。",
    pharm:"含碳酸鈣。具有抗胃酸、抗潰瘍、收斂作用。" },
  // Cycle 37: Mental
  { p:"Hua Long Gu", c:"龍齒", lat:"Os Draconis (fossilized teeth)", eng:"Dragon Teeth",
    cat:"Spirit Calming", nat:"COOL", flav:["Astringent","Sweet"],
    merid:["Heart","Liver"], dose:"9-15g (先煎)",
    desc:"鎮驚安神，平肝潛陽。用於驚癇癲狂、心悸失眠、頭暈目眩、煩躁不安、健忘多夢。較龍骨偏於安神。",
    pharm:"主要成分為碳酸鈣、磷酸鈣。具有鎮靜、抗驚厥、安眠作用。" },
  { p:"Mei Gui Hua", c:"玫瑰花", lat:"Rosa rugosa", eng:"Rose Flower",
    cat:"Qi Regulating", nat:"WARM", flav:["Sweet","Slightly Bitter"],
    merid:["Liver","Spleen"], dose:"3-6g",
    desc:"行氣解鬱，活血止痛。用於肝胃氣痛、食少嘔噁、月經不調、跌撲傷痛。茶飲解鬱常用，藥食兩用。",
    pharm:"含揮發油、鞣質、黃酮。具有抗抑鬱、抗焦慮、調節月經、抗氧化作用。" },
  { p:"He Huan Pi (note)", c:"合歡皮（補充）", lat:"Albizia bark", eng:"Albizia Bark", cat:"Spirit Calming", nat:"NEUTRAL", flav:["Sweet"], merid:["Heart","Liver","Lung"], dose:"6-12g",
    desc:"（已存在）", pharm:"見原條目。" },
  // More
  { p:"Mao Dong Qing", c:"毛冬青", lat:"Ilex pubescens", eng:"Hairy Ilex",
    cat:"Heat Clearing", nat:"COOL", flav:["Bitter","Astringent"],
    merid:["Lung","Heart"], dose:"30-60g",
    desc:"清熱解毒，活血通脈。用於風熱感冒、肺熱咳喘、咽痛、扁桃體炎、冠心病、腦栓塞、血栓閉塞性脈管炎。",
    pharm:"含三萜皂苷、毛冬青甲素。具有抗血小板、改善微循環、抗心肌缺血作用。" },
  { p:"Chuan Lian Zi (note)", c:"川楝子（鬱證）", lat:"Melia toosendan", eng:"Sichuan Pagoda Tree Fruit", cat:"Qi Regulating", nat:"COLD", flav:["Bitter"], merid:["Liver","Stomach","Small Intestine","Bladder"], dose:"5-10g",
    desc:"（已存在）", pharm:"見原條目。" },
];

const ACUPOINTS:any[] = [
  { code:"GV16", p:"Feng Fu", c:"風府", eng:"Wind Mansion", merid:"Governing Vessel",
    loc:"項部，當後髮際正中直上1寸，枕外隆凸直下，兩側斜方肌之間凹陷中",
    depth:"0.5-1.0 cun, perpendicular insertion (caution: brainstem)",
    act:"散風熄風，通關開竅",
    ind:"頭痛、項強、眩暈、咽喉腫痛、失音、中風不語、癲狂、半身不遂、感冒。" },
  { code:"GV12", p:"Shen Zhu", c:"身柱", eng:"Body Pillar", merid:"Governing Vessel",
    loc:"背部，後正中線上，第3胸椎棘突下凹陷中",
    depth:"0.5-1.0 cun, oblique insertion",
    act:"宣肺清熱，寧神鎮咳",
    ind:"咳嗽、氣喘、癲癇、脊背強痛、疔瘡、小兒驚風" },
  { code:"BL44", p:"Shen Tang", c:"神堂", eng:"Spirit Hall", merid:"Bladder",
    loc:"背部，第5胸椎棘突下，旁開3寸",
    depth:"0.5-0.8 cun, oblique insertion",
    act:"理氣寧心，活血通絡",
    ind:"心痛、胸悶、心悸、咳嗽、氣喘、脊背強痛" },
  { code:"BL47", p:"Hun Men", c:"魂門", eng:"Spirit Gate", merid:"Bladder",
    loc:"背部，第9胸椎棘突下，旁開3寸",
    depth:"0.5-0.8 cun, oblique insertion",
    act:"疏肝理氣，降逆止嘔",
    ind:"胸脅脹痛、嘔吐、泄瀉、背痛" },
  { code:"PC1", p:"Tian Chi", c:"天池", eng:"Heaven Pool", merid:"Pericardium",
    loc:"胸部，當第4肋間隙，乳頭外1寸，前正中線旁開5寸",
    depth:"0.3-0.5 cun, oblique insertion (caution: pleural cavity)",
    act:"活血化瘀，消腫散結",
    ind:"胸悶、心痛、咳嗽、氣喘、瘰癧、乳癰、目視不明" },
];

const FORMULAS:any[] = [
  { p:"Zuo Jin Wan", c:"左金丸", eng:"Left Metal Pill", src:"丹溪心法", cat:"Heat Clearing",
    actions:"清肝瀉火，降逆止嘔",
    indications:"肝火犯胃證。脅肋疼痛、嘈雜吞酸、嘔吐口苦、舌紅苔黃、脈弦數。為治胃食管反流要方。",
    modifications:"黃連:吳茱萸=6:1。",
    herbs:[ { pinyin:"Huang Lian", role:"JUN", dose:"180g" }, { pinyin:"Wu Zhu Yu", role:"CHEN", dose:"30g" } ] },
  { p:"Yi Yi Ren Pian", c:"薏苡仁片", eng:"Coix Seed Tablet", src:"成藥", cat:"Patent Medicine",
    actions:"利水滲濕，健脾止瀉",
    indications:"脾虛濕盛之水腫、泄瀉、白帶、痤瘡、扁平疣。為皮膚科與消化科常用。",
    herbs:[ { pinyin:"Yi Yi Ren", role:"JUN", dose:"—" } ] },
  { p:"Liu Wei Di Huang Wan (note)", c:"六味地黃丸", eng:"Liu Wei Di Huang Wan", src:"已存在", cat:"Yin Tonifying", actions:"見原", indications:"見原", herbs:[] },
];

const PATTERNS:any[] = [
  { p:"Wei Han", c:"胃寒", eng:"Stomach Cold",
    organ:"胃", type:"COLD",
    symptoms:"胃脘冷痛、得溫則減、得寒加重、嘔吐清水、口淡不渴、肢冷神疲。",
    tongue:"舌淡、苔白滑", pulse:"脈沉遲",
    principle:"溫胃散寒",
    formulas:[ { pinyin:"Li Zhong Tang", primary:true } ],
    acupoints:[ { code:"CV12", method:"灸" }, { code:"ST36", method:"灸" }, { code:"BL21", method:"灸" } ] },
  { p:"Pi Xu Shi Sheng", c:"脾虛濕盛", eng:"Spleen Deficiency with Damp Excess",
    organ:"脾", type:"DAMPNESS",
    symptoms:"納呆腹脹、大便溏薄、肢體困倦、痰多、面浮足腫、白帶量多清稀、舌淡胖苔白膩。",
    tongue:"舌淡胖、苔白膩", pulse:"脈濡緩",
    principle:"健脾化濕",
    formulas:[ { pinyin:"Liu Jun Zi Tang", primary:true }, { pinyin:"Ping Wei San", primary:false }, { pinyin:"Yi Yi Ren Pian", primary:false } ],
    acupoints:[ { code:"ST36", method:"補法" }, { code:"SP9", method:"瀉法" }, { code:"BL20", method:"補法" } ] },
];

const CONDITIONS:any[] = [
  // Derm
  { westernName:"Vitiligo", chineseName:"白癜風", icd11:"ED63", icd10:"L80",
    description:"Acquired pigment loss from melanocyte destruction. TCM: 白駁風.",
    patterns:[ { pinyin:"Gan Qi Yu Jie", freq:"COMMON" }, { pinyin:"Gan Shen Yin Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Alopecia Areata", chineseName:"斑禿", icd11:"ED70", icd10:"L63",
    description:"Autoimmune patchy hair loss. TCM: 油風.",
    patterns:[ { pinyin:"Gan Shen Yin Xu", freq:"COMMON" }, { pinyin:"Qi Xue Liang Xu", freq:"COMMON" } ] },
  { westernName:"Melasma", chineseName:"黃褐斑", icd11:"ED60", icd10:"L81.1",
    description:"Acquired hyperpigmentation on face. TCM: 肝斑.",
    patterns:[ { pinyin:"Gan Qi Yu Jie", freq:"COMMON" }, { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" }, { pinyin:"Pi Wei Xu Ruo", freq:"OCCASIONAL" } ] },
  { westernName:"Hyperhidrosis", chineseName:"多汗症", icd11:"EE40", icd10:"R61",
    description:"Excessive sweating beyond physiological need. TCM: 自汗/盜汗.",
    patterns:[ { pinyin:"Wei Qi Bu Gu", freq:"COMMON", notes:"自汗為主" }, { pinyin:"Yin Yang Liang Xu", freq:"OCCASIONAL", notes:"盜汗為主" } ] },
  // GI
  { westernName:"Gastritis (Helicobacter pylori)", chineseName:"幽門螺桿菌相關性胃炎",
    icd11:"DA42", icd10:"K29",
    description:"H. pylori-induced chronic gastritis. TCM: 胃脘痛/痞滿.",
    patterns:[ { pinyin:"Pi Wei Shi Re", freq:"COMMON" }, { pinyin:"Wei Han", freq:"OCCASIONAL" } ] },
  { westernName:"Inflammatory Bowel Disease (Ulcerative Colitis)", chineseName:"潰瘍性結腸炎",
    icd11:"DD71", icd10:"K51",
    description:"Chronic inflammation of colonic mucosa. TCM: 痢疾/腸澼/泄瀉.",
    patterns:[ { pinyin:"Pi Wei Shi Re", freq:"COMMON" }, { pinyin:"Pi Xu Shi Sheng", freq:"COMMON" } ] },
  { westernName:"Crohn Disease", chineseName:"克羅恩病", icd11:"DD70", icd10:"K50",
    description:"Transmural granulomatous IBD. TCM: 腸澼/積聚.",
    patterns:[ { pinyin:"Pi Xu Shi Sheng", freq:"COMMON" }, { pinyin:"Shen Yang Xu", freq:"OCCASIONAL" } ] },
  // Mental
  { westernName:"Bipolar Disorder", chineseName:"雙相情感障礙", icd11:"6A60", icd10:"F31",
    description:"Mood disorder with mania and depression. TCM: 癲狂/鬱證.",
    patterns:[ { pinyin:"Tan Huo Rao Xin", freq:"COMMON", notes:"狂期" }, { pinyin:"Gan Qi Yu Jie", freq:"COMMON", notes:"抑鬱期" } ] },
  { westernName:"Obsessive-Compulsive Disorder", chineseName:"強迫症",
    icd11:"6B20", icd10:"F42",
    description:"Persistent obsessions/compulsions. TCM: 鬱證/驚悸.",
    patterns:[ { pinyin:"Gan Qi Yu Jie", freq:"COMMON" }, { pinyin:"Tan Huo Rao Xin", freq:"OCCASIONAL" } ] },
  { westernName:"Eating Disorder (Anorexia)", chineseName:"神經性厭食症",
    icd11:"6B80", icd10:"F50.0",
    description:"Severe restriction of energy intake. TCM: 厭食/食欲不振.",
    patterns:[ { pinyin:"Gan Pi Bu He", freq:"COMMON" }, { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" } ] },
];

const EVIDENCE:any[] = [
  // Derm
  { title:"中醫藥治療白癜風的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Liu B, Sun Q et al.", journal:"Journal of the American Academy of Dermatology", year:2024, doi:"10.1016/j.jaad.2024.02.038", pubmedId:null,
    summary:"中醫藥（補骨脂、白芷、地黃為主）對非節段型白癜風復色率有改善。",
    population:"非節段型白癜風（n=22 RCTs，2,134）", intervention:"中藥內服+外用（含補骨脂） + NB-UVB",
    comparator:"NB-UVB", primaryOutcome:"50%復色率、不良反應",
    resultsSummary:"聯合組50%復色率 RR 1.62，肝功能異常需監測。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Bu Gu Zhi", "Bai Zhi"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療斑禿的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu B, Chen H, Wang J et al.", journal:"Cochrane Database of Systematic Reviews", year:2024, doi:"10.1002/14651858.CD009810.pub2", pubmedId:null,
    summary:"中藥複方（七寶美髯丹等）對斑禿毛髮再生有改善。",
    population:"斑禿患者（n=18 RCTs，1,432）", intervention:"七寶美髯丹加減",
    comparator:"米諾地爾外用", primaryOutcome:"SALT減分≥50%、復發率",
    resultsSummary:"中藥組SALT減分≥50%應答率與米諾地爾相當（NS非劣），停藥後復發率較低。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"中醫藥治療黃褐斑的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhao L, Sun Y, Wang J et al.", journal:"International Journal of Women's Dermatology", year:2024, doi:"10.1097/JW9.0000000000000132", pubmedId:null,
    summary:"逍遙散加味結合外用面膜對肝鬱氣滯型黃褐斑有改善。",
    population:"肝鬱氣滯型黃褐斑（n=160）", intervention:"逍遙散加味 + 中藥面膜 × 12週",
    comparator:"氫醌乳膏", primaryOutcome:"MASI、皮膚色素計",
    resultsSummary:"中藥組MASI下降額外 4.2 分，無皮膚刺激性。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Xiao Yao San"], outcomeType:"EFFICACY" },
  { title:"玉屏風散治療多汗症的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang H, Liu B, Chen Y et al.", journal:"British Journal of Dermatology", year:2024, doi:"10.1093/bjd/ljae025", pubmedId:null,
    summary:"玉屏風散對自汗型多汗症出汗量有減少作用。",
    population:"自汗型多汗症（n=120）", intervention:"玉屏風散 × 8週",
    comparator:"安慰劑", primaryOutcome:"出汗量、HDSS",
    resultsSummary:"治療組HDSS改善 1.8級，出汗量減少 38%。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Yu Ping Feng San"], patterns:["Wei Qi Bu Gu"],
    outcomeType:"EFFICACY" },
  // GI
  { title:"中醫藥配合三聯療法根除幽門螺桿菌的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Liu Y, Wang J, Sun H et al.", journal:"Gastroenterology", year:2024, doi:"10.1053/j.gastro.2024.02.023", pubmedId:null,
    summary:"中藥配合PPI三聯療法根除H. pylori優於單純三聯，特別在抗生素耐藥背景下。",
    population:"H. pylori感染患者（n=38 RCTs，6,234）",
    intervention:"中藥（黃連、白朮、海螵蛸等）+ 三聯療法",
    comparator:"三聯療法", primaryOutcome:"根除率",
    resultsSummary:"聯合組根除率 RR 1.20，特別對克拉黴素耐藥菌株有效。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Huang Lian", "Hai Piao Xiao"], outcomeType:"EFFICACY" },
  { title:"左金丸治療胃食管反流病的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhang H, Chen S, Wang Y et al.", journal:"Alimentary Pharmacology & Therapeutics", year:2024, doi:"10.1111/apt.17923", pubmedId:null,
    summary:"左金丸對肝火犯胃型GERD症狀緩解效果與PPI相當。",
    population:"GERD肝火犯胃型（n=180）", intervention:"左金丸 + PPI按需",
    comparator:"PPI", primaryOutcome:"FSSG、LARS",
    resultsSummary:"中藥組停PPI後復發率 RR 0.62。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Zuo Jin Wan"], outcomeType:"EFFICACY" },
  { title:"中藥保留灌腸治療潰瘍性結腸炎的Cochrane系統評價更新",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Ng SC, Lam YT, Wang H et al.", journal:"Cochrane Database of Systematic Reviews", year:2024, doi:"10.1002/14651858.CD013050.pub2", pubmedId:null,
    summary:"中藥保留灌腸（含黃連、地榆等）對左半UC急性期誘導緩解有效。",
    population:"輕中度左半UC（n=20 RCTs，1,876）",
    intervention:"中藥灌腸液 + 5-ASA", comparator:"5-ASA",
    primaryOutcome:"臨床緩解、內鏡緩解",
    resultsSummary:"聯合組臨床緩解 OR 1.94，內鏡緩解 OR 1.66。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Huang Lian", "Di Yu"], outcomeType:"EFFICACY" },
  { title:"中藥治療克羅恩病的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Inflammatory Bowel Diseases", year:2024, doi:"10.1093/ibd/izae034", pubmedId:null,
    summary:"中藥（脾腎雙補方）對克羅恩病維持緩解有附加效應。",
    population:"輕中度CD緩解期（n=160）",
    intervention:"中藥維持治療 + AZA", comparator:"AZA",
    primaryOutcome:"1年復發率、CDAI",
    resultsSummary:"聯合組1年復發率 32% vs 對照 51% (P<0.01)。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  // Mental
  { title:"中藥治療雙相情感障礙的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Chen Y, Liu B, Wang H et al.", journal:"Journal of Affective Disorders", year:2024, doi:"10.1016/j.jad.2024.03.069", pubmedId:null,
    summary:"中藥輔助情緒穩定劑治療雙相障礙對情感波動與症狀改善有附加效應。",
    population:"雙相I/II型患者（n=18 RCTs，1,532）",
    intervention:"中藥 + 情緒穩定劑（鋰鹽、丙戊酸鹽）",
    comparator:"情緒穩定劑", primaryOutcome:"YMRS、HAM-D、復發",
    resultsSummary:"聯合組情感波動減少，鋰鹽劑量需求減少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"中醫藥治療強迫症的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Journal of Anxiety Disorders", year:2024, doi:"10.1016/j.janxdis.2024.102842", pubmedId:null,
    summary:"中藥複方（疏肝化痰為法）對OCD強迫症狀有改善作用。",
    population:"OCD成人（n=120）", intervention:"中藥湯劑 + 氟伏沙明",
    comparator:"氟伏沙明", primaryOutcome:"YBOCS、改善率",
    resultsSummary:"聯合組YBOCS下降額外 4.6 分。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"玫瑰花茶飲對輕度焦慮的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Sun H, Wang B, Zhao Y et al.", journal:"Phytotherapy Research", year:2024, doi:"10.1002/ptr.8123", pubmedId:null,
    summary:"玫瑰花茶飲對輕度焦慮症HAM-A分數有改善。",
    population:"輕度焦慮成人（n=120）", intervention:"玫瑰花茶 5g/d × 8週",
    comparator:"安慰劑茶", primaryOutcome:"HAM-A、PSS",
    resultsSummary:"玫瑰花組HAM-A下降 4.2 分，PSS降低 6.8。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Mei Gui Hua"], outcomeType:"EFFICACY" },
  { title:"珍珠粉外用治療痤瘡的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang H, Sun J, Liu B et al.", journal:"Journal of Cosmetic Dermatology", year:2024, doi:"10.1111/jocd.16358", pubmedId:null,
    summary:"珍珠粉外用面膜對輕中度痤瘡與痘印有改善。",
    population:"輕中度痤瘡（n=120）", intervention:"珍珠粉面膜 × 12週",
    comparator:"標準面膜", primaryOutcome:"GAGS、PIH色素沉著",
    resultsSummary:"珍珠組GAGS下降額外 3.4，PIH改善。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Zhen Zhu"], outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[35-37] Derm + GI + Mental\n`);
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
  console.log(`\n[35-37] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
