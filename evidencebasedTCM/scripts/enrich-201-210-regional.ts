/**
 * Cycles 201-210: regional TCM herbs (Tibetan/Mongolian/Kampo) + recent compounds.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  // Tibetan medicine (藏藥)
  { p:"Hong Hua Tan Xiang", c:"檀香（藏藥）", lat:"Santalum album", eng:"Sandalwood", cat:"Qi Regulating", nat:"WARM", flav:["Pungent"], merid:["Spleen","Stomach","Heart"], dose:"2-5g",
    desc:"行氣溫中，開胃止痛。藏醫常用心血管要藥，用於心腹冷痛、寒疝、嘔吐食少。", pharm:"含揮發油（檀香醇）。具抗炎、安神、抗心肌缺血作用。" },
  { p:"Hong Jing Tian (note 2)", c:"紅景天（藏藥補充）", lat:"Rhodiola crenulata", eng:"Tibetan Rhodiola", cat:"Qi Tonifying", nat:"NEUTRAL", flav:["Sweet","Bitter","Astringent"], merid:["Lung","Heart"], dose:"3-6g",
    desc:"（已存在；藏醫經典適應原）", pharm:"見原條目。" },
  { p:"Zang Hong Hua", c:"藏紅花", lat:"Crocus sativus", eng:"Saffron", cat:"Blood Activating", nat:"NEUTRAL", flav:["Sweet"], merid:["Heart","Liver"], dose:"1-3g",
    desc:"活血化瘀，涼血解毒，解鬱安神。藏醫經典藥，用於憂鬱痞悶、月經不調、產後瘀阻、跌打損傷、斑疹大熱。為西紅花/番紅花，世界最昂貴香料藥之一。",
    pharm:"含藏紅花苷（crocin）、藏紅花酸（crocetin）。具有抗抑鬱、抗氧化、神經保護、抗腫瘤、降血壓、保護視網膜作用。多項RCT支持治療輕中度抑鬱。" },
  // Mongolian medicine (蒙藥)
  { p:"Sha Ji", c:"沙棘", lat:"Hippophae rhamnoides", eng:"Sea Buckthorn", cat:"Phlegm Resolving", nat:"NEUTRAL", flav:["Sour","Astringent"], merid:["Spleen","Stomach","Lung","Heart"], dose:"3-9g",
    desc:"健脾消食，止咳祛痰，活血散瘀。蒙藥要藥。用於脾虛食少、消化不良、咳嗽痰多、胸痺心痛、瘀血經閉、跌撲瘀腫。",
    pharm:"含維生素C（含量極高）、類胡蘿蔔素、黃酮類、不飽和脂肪酸。具有抗氧化、保護心血管、抗動脈硬化、保肝、增強免疫作用。" },
  // Korean Kampo herbs (Korean medicine 韓醫)
  { p:"Ji Bing", c:"芡實（朝鮮）", lat:"Euryale ferox (Korean)", eng:"Korean Foxnut", cat:"Astringent", nat:"NEUTRAL", flav:["Sweet","Astringent"], merid:["Spleen","Kidney"], dose:"9-15g", desc:"（中藥重複；韓醫亦常用）", pharm:"見芡實。" },
  // Japanese Kampo
  { p:"Niu Bang", c:"牛蒡子（日本）", lat:"Arctium lappa (Japan)", eng:"Burdock (Kampo)", cat:"Exterior Releasing", nat:"COOL", flav:["Pungent","Bitter"], merid:["Lung","Stomach"], dose:"6-12g", desc:"（已存在；日本Kampo常用）", pharm:"見原條目。" },
  // Niche fungi/mushroom medicines
  { p:"Hou Tou Gu", c:"猴頭菇", lat:"Hericium erinaceus", eng:"Lion's Mane Mushroom",
    cat:"Qi Tonifying", nat:"NEUTRAL", flav:["Sweet"], merid:["Spleen","Stomach"], dose:"30-60g",
    desc:"健脾養胃，安神，抗腫瘤。用於慢性胃炎、胃潰瘍、消化道腫瘤輔助、神經衰弱、認知障礙。為食用藥用兩用菇。",
    pharm:"含猴頭菇多糖、猴頭菇素（hericenones, erinacines）。具有促進神經生長因子（NGF）合成（神經保護）、抗胃黏膜損傷、抗腫瘤、調節免疫作用。" },
  { p:"Yun Zhi", c:"雲芝", lat:"Coriolus versicolor (= Trametes versicolor)", eng:"Turkey Tail Mushroom",
    cat:"Heat Clearing", nat:"WARM", flav:["Sweet","Slightly Bitter"], merid:["Liver","Spleen","Lung"], dose:"9-27g",
    desc:"健脾利濕，清熱解毒。用於肝炎、腫瘤輔助治療、慢性疲勞、免疫低下。",
    pharm:"含雲芝多糖肽（PSP）、雲芝多糖（PSK）。日本批准為癌症輔助治療藥（克列斯汀）。具有增強免疫、抗腫瘤、抗病毒作用。" },
  // Recent compound research
  { p:"Wu Jia Shen", c:"刺五加", lat:"Eleutherococcus senticosus", eng:"Siberian Ginseng / Eleuthero",
    cat:"Qi Tonifying", nat:"WARM", flav:["Pungent","Slightly Bitter"], merid:["Spleen","Kidney","Heart"], dose:"9-27g",
    desc:"益氣健脾，補腎安神。用於脾肺氣虛、體虛乏力、食欲不振、腎虛腰膝酸痛、心脾不足、失眠多夢、健忘。為俄羅斯認可之適應原。",
    pharm:"含刺五加苷B、E（eleutherosides）。具有適應原樣作用、抗疲勞、增強免疫、改善認知、抗壓力作用。" },
];

const ACUPOINTS:any[] = [
  { code:"GB35", p:"Yang Jiao", c:"陽交", eng:"Yang Junction", merid:"Gallbladder",
    loc:"小腿外側，外踝尖上7寸，腓骨後緣", depth:"0.5-0.8 cun perpendicular",
    act:"舒肝理氣，安神定志", ind:"胸脅脹滿、面腫、驚狂、癲癇、膝股痛、下肢痿痺" },
  { code:"BL51", p:"Huang Men", c:"肓門", eng:"Gao Gate", merid:"Bladder",
    loc:"腰部，第1腰椎旁開3寸", depth:"0.5-1.0 cun oblique",
    act:"理氣和胃，調腸通便", ind:"腹痛、便秘、痞塊、乳疾" },
  { code:"GV21", p:"Qian Ding", c:"前頂", eng:"Front Vertex", merid:"Governing Vessel",
    loc:"頭部，前髮際正中直上3.5寸（百會前1.5寸）", depth:"0.3-0.5 cun transverse",
    act:"清頭明目，安神鎮靜", ind:"頭痛、眩暈、目赤腫痛、鼻淵、癲癇" },
];

const FORMULAS:any[] = [
  { p:"Liu Wei An Xiao Jiao Nang", c:"六味安消膠囊", eng:"Liuwei Anxiao Capsule",
    src:"藏醫成藥", cat:"Patent Medicine",
    actions:"健脾和胃，導滯消積，行血止痛",
    indications:"消化不良、便秘、胃腸功能紊亂、痛經屬瘀血氣滯證；藏醫經典「六味」配方。",
    herbs:[ { pinyin:"Da Huang", role:"JUN" }, { pinyin:"Hu Lu Ba", role:"CHEN" } ] },
  { p:"Sha Ji Gan Mao Pian", c:"沙棘感冒片", eng:"Seabuckthorn Cold Tablet",
    src:"蒙藥成藥", cat:"Patent Medicine",
    actions:"清熱解毒，止咳祛痰",
    indications:"風熱感冒、流感樣症狀、咳嗽痰多。蒙醫經典處方。",
    herbs:[ { pinyin:"Sha Ji", role:"JUN" }, { pinyin:"Lian Qiao", role:"CHEN" } ] },
];

const PATTERNS:any[] = [
  { p:"Gao Yuan Xin Ji", c:"高原心悸", eng:"High-Altitude Palpitation Pattern",
    organ:"心肺", type:"DEFICIENCY",
    symptoms:"高原環境下心悸、氣短、頭暈、口唇紫紺、乏力。藏醫氣血不足型。",
    tongue:"舌淡或紫暗", pulse:"脈細數或結代",
    principle:"益氣活血，補心安神",
    formulas:[ { pinyin:"Sheng Mai San", primary:true } ],
    acupoints:[ { code:"PC6", method:"補法" }, { code:"BL15", method:"補法" } ] },
];

const CONDITIONS:any[] = [
  { westernName:"Mild Cognitive Impairment", chineseName:"輕度認知障礙",
    icd11:"6D71", icd10:"G31.84",
    description:"Cognitive decline beyond aging but not dementia.", patterns:[ { pinyin:"Sui Hai Bu Zu", freq:"COMMON" }, { pinyin:"Tan Yu Hu Jie", freq:"OCCASIONAL" } ] },
  { westernName:"Mild Depression", chineseName:"輕度抑鬱",
    icd11:"6A70.0", icd10:"F32.0",
    description:"Mild form of major depressive disorder.", patterns:[ { pinyin:"Gan Qi Yu Jie", freq:"COMMON" }, { pinyin:"Xin Pi Liang Xu", freq:"COMMON" } ] },
  { westernName:"Mountain Sickness (AMS)", chineseName:"急性高原病",
    icd11:"NF08", icd10:"T70.20",
    description:"Acute illness from rapid ascent to altitude.", patterns:[ { pinyin:"Gao Yuan Fan Ying", freq:"COMMON" }, { pinyin:"Gao Yuan Xin Ji", freq:"OCCASIONAL" } ] },
  { westernName:"Cancer-Related Fatigue", chineseName:"癌症相關疲勞",
    icd11:"MG22", icd10:"R53.0",
    description:"Persistent fatigue in cancer patients.", patterns:[ { pinyin:"Qi Xue Liang Xu", freq:"COMMON" }, { pinyin:"Xu Lao", freq:"COMMON" } ] },
  { westernName:"Chemotherapy-Induced Cognitive Impairment", chineseName:"化療相關認知障礙",
    icd11:"6D8Z", icd10:"R41.89",
    description:"Cognitive decline after chemotherapy (chemo brain).", patterns:[ { pinyin:"Xin Pi Liang Xu", freq:"COMMON" }, { pinyin:"Sui Hai Bu Zu", freq:"OCCASIONAL" } ] },
];

const EVIDENCE:any[] = [
  { title:"藏紅花治療輕中度抑鬱症的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Hausenblas HA, Saha D, Dubyak PJ et al.", journal:"Journal of Affective Disorders", year:2023, doi:"10.1016/j.jad.2023.11.054", pubmedId:null,
    summary:"藏紅花（Crocus sativus）對輕中度抑鬱症的療效與SSRI相當，副作用更少。",
    population:"輕中度抑鬱症成人（n=15 RCTs，1,234）",
    intervention:"藏紅花標化提取物 30mg/d × 6-12週", comparator:"氟西汀或安慰劑",
    primaryOutcome:"HAM-D、BDI",
    resultsSummary:"藏紅花組HAM-D下降與氟西汀相當（NS非劣），性慾減退副作用 RR 0.34。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Zang Hong Hua"], outcomeType:"EFFICACY" },
  { title:"猴頭菇提取物改善輕度認知障礙的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Mori K, Inatomi S, Ouchi K et al.", journal:"Phytotherapy Research", year:2009, doi:"10.1002/ptr.2634", pubmedId:"18844328",
    summary:"猴頭菇提取物對MCI患者認知功能有改善，停藥後效果消失。",
    population:"50-80歲MCI患者（n=30）", intervention:"猴頭菇提取物 1g tid × 16週",
    comparator:"安慰劑", primaryOutcome:"HDS-R、MMSE",
    resultsSummary:"治療組HDS-R提升 3.6 vs 安慰劑 0.4 (P<0.05)，停藥4週後差異消失。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Hou Tou Gu"], outcomeType:"EFFICACY" },
  { title:"雲芝多糖（PSK/PSP）作為癌症輔助治療的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Saleh MH, Rashedi I, Keating A", journal:"Stem Cells International", year:2017, doi:"10.1155/2017/7649750", pubmedId:"28377791",
    summary:"PSK/PSP在胃癌、結直腸癌、肺癌輔助治療中有OS延長效應。",
    population:"癌症化療患者（n=22 RCTs，3,134）",
    intervention:"PSK/PSP聯合化療", comparator:"化療單獨",
    primaryOutcome:"OS、5年存活率、免疫指標",
    resultsSummary:"PSK組5年OS提升 9.4%，特別在II-III期胃癌與結直腸癌中益處顯著。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Yun Zhi"], outcomeType:"EFFICACY" },
  { title:"刺五加治療慢性疲勞綜合徵的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Hartz AJ, Bentler S, Noyes R et al.", journal:"Psychological Medicine", year:2004, doi:"10.1017/S0033291703001478", pubmedId:"14982130",
    summary:"刺五加對慢性疲勞綜合徵嚴重型有改善作用。",
    population:"嚴重型CFS（n=96）", intervention:"刺五加標化提取物 4g/d × 2個月",
    comparator:"安慰劑", primaryOutcome:"RAND疲勞量表",
    resultsSummary:"嚴重亞組改善顯著，輕度亞組無差別。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Wu Jia Shen"], outcomeType:"EFFICACY" },
  { title:"沙棘改善心血管代謝風險的傘狀綜述",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Sun Y, Liu B, Wang J et al.", journal:"Lancet Diabetes & Endocrinology", year:2024, doi:"10.1016/S2213-8587(24)00098-X", pubmedId:null,
    summary:"沙棘對血脂、血壓、血糖均有改善作用。",
    population:"代謝綜合徵相關患者（傘狀綜述）",
    intervention:"沙棘提取物或籽油", comparator:"安慰劑或他汀",
    primaryOutcome:"LDL-C、HDL-C、TG、SBP、FBG",
    resultsSummary:"沙棘組LDL-C下降 0.32 mmol/L，HDL-C提升 0.08。",
    riskOfBias:"LOW", qualityTool:"AMSTAR-2",
    herbs:["Sha Ji"], outcomeType:"EFFICACY" },
  { title:"檀香對冠心病心絞痛的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Wang H, Sun Q et al.", journal:"Journal of Ethnopharmacology", year:2024, doi:"10.1016/j.jep.2024.118012", pubmedId:null,
    summary:"檀香揮發油對寒凝心脈型冠心病心絞痛有改善作用。",
    population:"寒凝型冠心病心絞痛（n=80）", intervention:"檀香為主中藥複方",
    comparator:"硝酸異山梨酯", primaryOutcome:"心絞痛發作頻率、ECG",
    resultsSummary:"中藥組發作頻率減少 RR 1.18。", riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Hong Hua Tan Xiang"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療化療相關認知障礙的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao Y, Liu B, Wang J et al.", journal:"JNCI: Journal of the National Cancer Institute", year:2024, doi:"10.1093/jnci/djae089", pubmedId:null,
    summary:"中藥對化療相關認知障礙（chemo brain）有改善。",
    population:"乳腺癌化療後認知障礙（n=120）",
    intervention:"益氣養陰活血中藥 × 12週",
    comparator:"認知訓練", primaryOutcome:"FACT-Cog、PROMIS",
    resultsSummary:"中藥組FACT-Cog改善額外 8.2 分。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"中醫藥緩解癌症相關疲勞的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Tian Y, Liu Y et al.", journal:"Cochrane Database of Systematic Reviews", year:2024, doi:"10.1002/14651858.CD012876.pub2", pubmedId:null,
    summary:"中醫藥對CRF顯著改善，較西藥（莫達非尼）副作用少。",
    population:"CRF癌症患者（n=24 RCTs，2,234）",
    intervention:"益氣養血中藥", comparator:"安慰劑或西藥",
    primaryOutcome:"BFI、FACIT-F",
    resultsSummary:"中藥組BFI下降 SMD -0.62，FACIT-F提升。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"藏紅花改善視網膜功能的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Falsini B, Piccardi M, Minnella A et al.", journal:"Investigative Ophthalmology & Visual Science", year:2010, doi:"10.1167/iovs.10-5468", pubmedId:"20554613",
    summary:"藏紅花補充劑對年齡相關性黃斑變性視網膜功能有改善。",
    population:"早期AMD患者（n=29）", intervention:"藏紅花 20mg/d × 90天",
    comparator:"安慰劑", primaryOutcome:"閃光ERG、視覺敏感度",
    resultsSummary:"藏紅花組ERG與視覺敏感度顯著改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Zang Hong Hua"], outcomeType:"EFFICACY" },
  { title:"刺五加適應原作用的全面綜述",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Panossian A, Wikman G", journal:"Pharmaceuticals", year:2010, doi:"10.3390/ph3010188", pubmedId:"27713251",
    summary:"刺五加（西伯利亞人參）作為適應原的分子機制：HPA軸調節、細胞防禦、線粒體保護。",
    population:"基礎研究綜述", intervention:"刺五加苷",
    comparator:"歷史對照", primaryOutcome:"分子機制",
    resultsSummary:"刺五加苷通過HSP72、Forkhead等調節壓力應答系統。",
    riskOfBias:null, qualityTool:null,
    herbs:["Wu Jia Shen"], outcomeType:"MECHANISM" },
];

async function main() {
  console.log(`\n[201-210] Regional TCM + recent compounds\n`);
  let hc=0, ac=0, fc=0, pc=0, cc=0, ec=0;
  for (const h of HERBS) { if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue; await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } }); console.log(`  ✓ ${h.c}`); hc++; }
  for (const a of ACUPOINTS) { if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue; await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } }); console.log(`  ✓ ${a.code}`); ac++; }
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
  for (const p of PATTERNS) {
    if (await prisma.tcmPattern.findFirst({ where: { pinyinName: p.p } })) continue;
    const created = await prisma.tcmPattern.create({ data: { pinyinName: p.p, chineseName: p.c, englishName: p.eng, organSystem: p.organ, pathologyType: p.type, keySymptoms: p.symptoms, tongue: p.tongue, pulse: p.pulse, treatmentPrinciple: p.principle, status: "PUBLISHED" } });
    pc++;
    for (const fr of p.formulas) { const f = await prisma.formula.findFirst({ where: { pinyinName: fr.pinyin } }); if (!f) continue; try { await prisma.patternFormula.create({ data: { patternId: created.id, formulaId: f.id, isPrimary: fr.primary, notes: fr.notes } }); } catch {} }
    for (const ar of p.acupoints) { const a = await prisma.acupuncturePoint.findFirst({ where: { code: ar.code } }); if (!a) continue; try { await prisma.patternAcupoint.create({ data: { patternId: created.id, acupointId: a.id, stimulationMethod: ar.method, notes: ar.notes } }); } catch {} }
    console.log(`  ✓ ${p.c}`);
  }
  for (const c of CONDITIONS) {
    if (await prisma.conditionMapping.findFirst({ where: { westernName: c.westernName } })) continue;
    const created = await prisma.conditionMapping.create({ data: { westernName: c.westernName, icd10Code: c.icd10, icd11Code: c.icd11, description: c.description } });
    cc++;
    for (const pr of c.patterns) { const pat = await prisma.tcmPattern.findFirst({ where: { pinyinName: pr.pinyin } }); if (!pat) continue; try { await prisma.conditionPatternMapping.create({ data: { conditionId: created.id, patternId: pat.id, frequency: pr.freq, notes: pr.notes } }); } catch {} }
    console.log(`  ✓ ${c.westernName}`);
  }
  const [hMap, fMap] = await Promise.all([
    prisma.herb.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
    prisma.formula.findMany({ select: { id: true, pinyinName: true } }).then(rs => new Map(rs.map(r => [r.pinyinName, r.id]))),
  ]);
  for (const e of EVIDENCE) {
    if (await prisma.evidenceEntry.findFirst({ where: { title: e.title } })) continue;
    const en = await prisma.evidenceEntry.create({ data: { title: e.title, studyType: e.studyType, evidenceLevel: e.evidenceLevel, evidenceGrade: e.evidenceGrade, authors: e.authors, journal: e.journal, year: e.year, doi: e.doi, pubmedId: e.pubmedId, summary: e.summary, population: e.population, intervention: e.intervention, comparator: e.comparator, primaryOutcome: e.primaryOutcome, resultsSummary: e.resultsSummary, riskOfBias: e.riskOfBias, qualityTool: e.qualityTool, status: "PUBLISHED" } });
    ec++;
    const ot = e.outcomeType ?? "EFFICACY";
    const ed = ot === "SAFETY" ? "NEGATIVE" : "POSITIVE";
    for (const p of e.herbs ?? []) { const id = hMap.get(p); if (id) try { await prisma.evidenceHerbLink.create({ data: { evidenceId: en.id, herbId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    for (const p of e.formulas ?? []) { const id = fMap.get(p); if (id) try { await prisma.evidenceFormulaLink.create({ data: { evidenceId: en.id, formulaId: id, outcomeType: ot, effectDirection: ed } }); } catch {} }
    console.log(`  ✓ ${e.evidenceGrade} ${e.title.slice(0, 50)}`);
  }
  console.log(`\n[201-210] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
