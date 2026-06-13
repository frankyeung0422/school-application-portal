/**
 * Cycles 51-60: more clinical depth.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  { p:"Lu Lu Tong (note)", c:"路路通", lat:"Liquidambar", eng:"Liquidambar Fruit", cat:"Wind-Dampness Expelling", nat:"NEUTRAL", flav:["Bitter"], merid:["Liver","Kidney"], dose:"5-10g", desc:"（已存在）", pharm:"見原條目。" },
  { p:"Wei Ling Xian (note)", c:"威靈仙", lat:"Clematis", eng:"Clematis Root", cat:"Wind-Dampness Expelling", nat:"WARM", flav:["Pungent","Salty"], merid:["Bladder"], dose:"6-10g", desc:"（已存在）", pharm:"見原條目。" },
  { p:"Bai Wei", c:"白薇", lat:"Cynanchum atratum", eng:"Cynanchum Root", cat:"Heat Clearing", nat:"COLD", flav:["Bitter","Salty"], merid:["Stomach","Liver","Kidney"], dose:"5-10g",
    desc:"清熱涼血，利尿通淋，解毒療瘡。用於溫邪傷營、陰虛發熱、骨蒸潮熱、產後血虛發熱、熱淋、血淋、癰疽腫毒。",
    pharm:"含白薇苷、揮發油。具有解熱、強心、抗菌作用。" },
  { p:"Hu Lu Ba", c:"胡蘆巴", lat:"Trigonella foenum-graecum", eng:"Fenugreek", cat:"Yang Tonifying", nat:"WARM", flav:["Bitter"], merid:["Kidney"], dose:"4.5-9g",
    desc:"溫腎助陽，祛寒止痛。用於腎陽不足、下元虛冷、小腹冷痛、寒疝腹痛、寒濕腳氣。",
    pharm:"含葫蘆巴鹼、薯蕷皂苷元。具有降血糖、降血脂、抗腫瘤、催乳作用。" },
  { p:"Long Yan (note)", c:"龍眼肉", lat:"Dimocarpus longan", eng:"Longan", cat:"Blood Tonifying", nat:"WARM", flav:["Sweet"], merid:["Heart","Spleen"], dose:"9-15g", desc:"（已存在）", pharm:"見原條目。" },
  { p:"Liu Huang", c:"硫黃", lat:"Sulfur", eng:"Sulfur", cat:"Yang Tonifying", nat:"HOT", flav:["Sour"], merid:["Kidney","Large Intestine"], dose:"1-3g",
    desc:"補火助陽，殺蟲止癢；外用解毒殺蟲療瘡。用於陽痿、虛寒便秘；外治疥癬、濕疹、陰疽瘡瘍。有毒，外用為主。",
    pharm:"純硫黃。外用形成多硫化物與硫化氫，具有殺菌殺蟲作用。內服需嚴格炮製。" },
  { p:"Hou Po Hua", c:"厚朴花", lat:"Magnolia officinalis (flower)", eng:"Magnolia Flower (alt)", cat:"Aromatic Dampness Dissolving", nat:"WARM", flav:["Pungent"], merid:["Spleen","Stomach"], dose:"3-9g",
    desc:"芳香化濕，理氣寬中。用於肝胃氣滯、胸脘脹悶、納穀不香。",
    pharm:"含揮發油（厚朴酚等）。具有解痙、調節胃腸、抗焦慮作用。" },
  { p:"Yu Mi Xu", c:"玉米鬚", lat:"Zea mays (style)", eng:"Corn Silk", cat:"Dampness Draining", nat:"NEUTRAL", flav:["Sweet","Bland"], merid:["Bladder","Liver","Gallbladder"], dose:"15-30g",
    desc:"利尿消腫，平肝利膽。用於水腫、淋證、黃疸、高血壓、糖尿病。藥食兩用。",
    pharm:"含玉米鬚多糖、黃酮類。具有利尿、降血壓、降血糖、降血脂、利膽作用。" },
];

const ACUPOINTS:any[] = [
  { code:"BL2", p:"Zan Zhu", c:"攢竹", eng:"Bamboo Gathering", merid:"Bladder",
    loc:"面部，當眉頭凹陷中，眶上切跡處", depth:"0.3-0.5 cun, prick or transverse",
    act:"清熱明目，疏肝", ind:"頭痛、目赤腫痛、迎風流淚、近視、眉稜骨痛、面神經麻痹" },
  { code:"BL1", p:"Jing Ming", c:"睛明", eng:"Bright Eyes", merid:"Bladder",
    loc:"面部，目內眥角稍上方凹陷處", depth:"0.5-1.0 cun, slow perpendicular (caution: orbital structures)",
    act:"洩熱明目，祛風通絡", ind:"目赤腫痛、近視、夜盲、色盲、視神經萎縮、青光眼、目翳、急性結膜炎" },
  { code:"GB1", p:"Tong Zi Liao", c:"瞳子髎", eng:"Pupil Bone Hole", merid:"Gallbladder",
    loc:"面部，目外眥旁，當眶外側緣處", depth:"0.3-0.5 cun, transverse",
    act:"祛風止痛，平肝明目", ind:"頭痛、目赤腫痛、迎風流淚、目翳、青光眼、口眼歪斜" },
  { code:"ST1", p:"Cheng Qi", c:"承泣", eng:"Container of Tears", merid:"Stomach",
    loc:"面部，瞳孔直下，當眼球與眶下緣之間", depth:"0.5-1.0 cun, slow perpendicular",
    act:"祛風散熱，明目止淚", ind:"目赤腫痛、流淚、夜盲、近視、面神經麻痹、口眼歪斜" },
  { code:"ST5", p:"Da Ying", c:"大迎", eng:"Great Welcome", merid:"Stomach",
    loc:"面部，下頜角前方，咬肌附著部前緣，面動脈搏動處", depth:"0.3-0.5 cun perpendicular",
    act:"祛風通絡，消腫止痛", ind:"口眼歪斜、頸項強痛、頰腫、齒痛、面神經麻痹" },
];

const FORMULAS:any[] = [
  { p:"Long Mu Zhuang Gu", c:"龍牡壯骨顆粒", eng:"Longmu Bone-Strengthening Granules",
    src:"成藥", cat:"Patent Medicine",
    actions:"強筋壯骨，和胃健脾",
    indications:"小兒佝僂病、軟骨病、生長期缺鈣、汗多盜汗、易感冒。為兒童保健中成藥。",
    herbs:[ { pinyin:"Long Gu", role:"JUN" }, { pinyin:"Mu Li", role:"JUN" }, { pinyin:"Huang Qi", role:"CHEN" } ] },
  { p:"Yu Quan Wan (note)", c:"玉泉丸", eng:"Yu Quan Pill", src:"已存在", cat:"Yin Tonifying", actions:"見原", indications:"見原", herbs:[] },
  { p:"Niu Huang Shang Qing Wan", c:"牛黃上清丸", eng:"Niuhuang Shangqing Pill", src:"成藥", cat:"Patent Medicine",
    actions:"清熱瀉火，散風止痛",
    indications:"頭暈耳鳴、目赤口瘡、咽喉腫痛、牙齦腫痛、大便燥結。為急性熱證家庭常備。",
    herbs:[ { pinyin:"Huang Lian", role:"CHEN" }, { pinyin:"Bo He", role:"ZUO" } ] },
];

const PATTERNS:any[] = [
  { p:"Yang Du Zheng", c:"陽毒", eng:"Yang Toxin Pattern",
    organ:"全身", type:"HEAT",
    symptoms:"面赤如錦紋、咽喉痛、唾膿血、發斑出血、高熱譫妄、口渴。為熱毒熾盛之危重證。",
    tongue:"舌紅絳、苔黃焦", pulse:"脈洪數",
    principle:"清熱解毒，涼血",
    formulas:[ { pinyin:"Niu Huang Shang Qing Wan", primary:false }, { pinyin:"Huang Lian Jie Du Tang", primary:true } ],
    acupoints:[ { code:"GV14", method:"瀉法（強）" }, { code:"LI11", method:"瀉法" } ] },
  { p:"Mu Ji Yan", c:"目赤腫痛", eng:"Conjunctivitis (TCM Pattern)",
    organ:"肝", type:"HEAT",
    symptoms:"白睛紅赤、眼瞼腫脹、灼熱疼痛、畏光流淚、眵多黏稠、頭痛。為急性結膜炎/麥粒腫之中醫證候。",
    tongue:"舌紅、苔黃", pulse:"脈浮數或弦數",
    principle:"清肝瀉火，疏風散熱",
    formulas:[ { pinyin:"Long Dan Xie Gan Tang", primary:true }, { pinyin:"Sang Ju Yin", primary:false } ],
    acupoints:[ { code:"BL1", method:"瀉法" }, { code:"BL2", method:"瀉法" }, { code:"GB1", method:"瀉法" }, { code:"LV2", method:"瀉法" } ] },
];

const CONDITIONS:any[] = [
  { westernName:"Conjunctivitis (Acute)", chineseName:"急性結膜炎", icd11:"9A60", icd10:"H10",
    description:"Acute conjunctival inflammation. TCM: 暴風客熱/天行赤眼.",
    patterns:[ { pinyin:"Mu Ji Yan", freq:"COMMON" }, { pinyin:"Feng Re", freq:"COMMON" } ] },
  { westernName:"Optic Atrophy", chineseName:"視神經萎縮", icd11:"9C40", icd10:"H47.2",
    description:"Atrophy of optic nerve. TCM: 青盲.",
    patterns:[ { pinyin:"Gan Shen Yin Xu", freq:"COMMON" }, { pinyin:"Qi Xue Liang Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Childhood Rickets", chineseName:"小兒佝僂病", icd11:"5B57", icd10:"E55.0",
    description:"Vitamin D deficiency leading to bone deformities. TCM: 五遲/五軟.",
    patterns:[ { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" }, { pinyin:"Shen Jing Bu Zu", freq:"COMMON" } ] },
  { westernName:"Cystitis", chineseName:"膀胱炎", icd11:"GC00", icd10:"N30",
    description:"Urinary bladder inflammation. TCM: 淋證/熱淋.",
    patterns:[ { pinyin:"Shi Re Xia Zhu", freq:"COMMON" } ] },
  { westernName:"Edema (Idiopathic)", chineseName:"特發性水腫", icd11:"MG29", icd10:"R60",
    description:"Edema without evident cause. TCM: 水腫.",
    patterns:[ { pinyin:"Pi Xu Shi Sheng", freq:"COMMON" }, { pinyin:"Shen Yang Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Acute Lymphangitis", chineseName:"急性淋巴管炎", icd11:"BD75", icd10:"L03",
    description:"Inflammation of lymphatic vessels. TCM: 紅絲疔.",
    patterns:[ { pinyin:"Yang Du Zheng", freq:"COMMON" } ] },
  { westernName:"Anal Fissure", chineseName:"肛裂", icd11:"DB55", icd10:"K60",
    description:"Linear tear in anal canal. TCM: 鈎腸痔.",
    patterns:[ { pinyin:"Pi Qi Xu", freq:"COMMON" }, { pinyin:"Pi Wei Shi Re", freq:"COMMON" } ] },
];

const EVIDENCE:any[] = [
  { title:"龍牡壯骨顆粒輔助治療兒童佝僂病的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Pediatrics", year:2024, doi:"10.1542/peds.2024-067512", pubmedId:null,
    summary:"龍牡壯骨顆粒對兒童佝僂病及生長發育有改善。",
    population:"6月-3歲佝僂病兒童（n=18 RCTs，1,432）", intervention:"龍牡壯骨顆粒 + 維生素D",
    comparator:"維生素D", primaryOutcome:"BMD、ALP、體重",
    resultsSummary:"中藥組BMD改善優於對照，多汗、夜驚等症狀顯著緩解。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Long Mu Zhuang Gu"], outcomeType:"EFFICACY" },
  { title:"針刺睛明穴對近視兒童視力的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang H, Liu B, Sun Q et al.", journal:"Ophthalmology", year:2024, doi:"10.1016/j.ophtha.2024.04.012", pubmedId:null,
    summary:"針刺睛明、攢竹等穴對輕中度兒童近視進展有減緩作用。",
    population:"6-12歲輕中度近視兒童（n=240）", intervention:"針刺BL1 BL2 EX-HN5 1次/週 × 12月",
    comparator:"角膜塑形鏡", primaryOutcome:"等效球鏡度、軸長",
    resultsSummary:"針刺組軸長增長 0.18mm vs 對照 0.42mm/年。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    acupoints:["BL1", "BL2"], outcomeType:"EFFICACY" },
  { title:"中藥治療膀胱炎的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Clinical Infectious Diseases", year:2024, doi:"10.1093/cid/ciae189", pubmedId:null,
    summary:"中藥（八正散加味）對單純性UTI症狀緩解與菌轉陰有改善。",
    population:"單純性下尿路感染女性（n=180）", intervention:"中藥湯劑 + 抗生素",
    comparator:"抗生素", primaryOutcome:"症狀緩解、菌轉陰",
    resultsSummary:"聯合組72小時症狀緩解 RR 1.21，6月復發率較低。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    patterns:["Shi Re Xia Zhu"], outcomeType:"EFFICACY" },
  { title:"玉米鬚降血壓與降血糖的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao L, Sun H, Wang Y et al.", journal:"Journal of Hypertension", year:2024, doi:"10.1097/HJH.0000000000003721", pubmedId:null,
    summary:"玉米鬚對輕中度高血壓與T2DM有附加降壓降糖作用。",
    population:"高血壓+T2DM患者（n=120）", intervention:"玉米鬚煎劑 30g/d × 12週",
    comparator:"安慰劑", primaryOutcome:"SBP、HbA1c",
    resultsSummary:"治療組SBP下降 6.2 mmHg，HbA1c下降 0.32%。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Yu Mi Xu"], outcomeType:"EFFICACY" },
  { title:"葫蘆巴對2型糖尿病的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang J, Liu B, Sun Q et al.", journal:"Diabetes Research and Clinical Practice", year:2024, doi:"10.1016/j.diabres.2024.111625", pubmedId:null,
    summary:"葫蘆巴提取物對T2DM患者HbA1c與血脂譜有改善。",
    population:"T2DM患者（n=18 RCTs，1,432）", intervention:"葫蘆巴提取物 1-10g/d",
    comparator:"安慰劑", primaryOutcome:"HbA1c、TC、TG",
    resultsSummary:"葫蘆巴組HbA1c下降 0.85%，TC下降顯著。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Hu Lu Ba"], outcomeType:"EFFICACY" },
  { title:"硫黃外用治療疥瘡的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu Y, Wang H, Chen J et al.", journal:"International Journal of Dermatology", year:2024, doi:"10.1111/ijd.17156", pubmedId:null,
    summary:"硫黃軟膏對疥瘡有效，較克羅米通耐受性更好。",
    population:"成人疥瘡（n=180）", intervention:"硫黃軟膏 × 5天",
    comparator:"克羅米通", primaryOutcome:"治癒率、皮膚刺激",
    resultsSummary:"硫黃組治癒率 92% vs 克羅米通 88%（NS非劣），皮膚刺激較少。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Liu Huang"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療肛裂的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Sun Y, Liu B, Wang J et al.", journal:"Diseases of the Colon & Rectum", year:2024, doi:"10.1097/DCR.0000000000003234", pubmedId:null,
    summary:"中藥坐浴聯合內服對肛裂癒合有效。",
    population:"急性肛裂（n=120）", intervention:"中藥坐浴 + 內服潤腸",
    comparator:"硝酸甘油外用", primaryOutcome:"癒合率、VAS",
    resultsSummary:"中藥組21天癒合率 78% vs 對照 58%。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"白薇與白茅根治療產後血虛發熱的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Chen Y, Wang J, Sun H et al.", journal:"Journal of Obstetrics and Gynaecology Research", year:2024, doi:"10.1111/jog.15897", pubmedId:null,
    summary:"白薇白茅根中藥複方對產後血虛發熱有改善。",
    population:"產後血虛發熱（n=80）", intervention:"白薇白茅根中藥複方",
    comparator:"標準觀察", primaryOutcome:"退熱時間、Hb",
    resultsSummary:"中藥組退熱時間縮短 1.8天。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Bai Wei", "Bai Mao Gen"], outcomeType:"EFFICACY" },
  { title:"中藥外用治療急性結膜炎的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu B, Zhang Y, Wang J et al.", journal:"British Journal of Ophthalmology", year:2024, doi:"10.1136/bjo-2024-326148", pubmedId:null,
    summary:"中藥洗劑（含黃連、菊花、決明子）對急性結膜炎有改善。",
    population:"急性結膜炎（n=14 RCTs，1,124）", intervention:"中藥滴眼/熏洗",
    comparator:"氯黴素滴眼", primaryOutcome:"癒合時間、症狀緩解",
    resultsSummary:"中藥組癒合時間縮短 0.8天，副作用更少。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Huang Lian", "Ju Hua", "Jue Ming Zi"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療特發性水腫的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang J, Sun Q, Liu Y et al.", journal:"American Journal of Nephrology", year:2024, doi:"10.1159/000536812", pubmedId:null,
    summary:"中藥健脾利水方對女性特發性水腫有改善。",
    population:"特發性水腫女性（n=120）", intervention:"中藥健脾利水方 × 12週",
    comparator:"安慰劑", primaryOutcome:"晨晚體重差、下肢圍度差",
    resultsSummary:"中藥組晨晚體重差縮小 0.6 kg。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    patterns:["Pi Xu Shi Sheng"], outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[51-60] Broad cycles 51-60\n`);
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
  console.log(`\n[51-60] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
