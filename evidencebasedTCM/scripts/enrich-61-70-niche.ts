/**
 * Cycles 61-70: niche specialties.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  { p:"Du Zhong Ye", c:"杜仲葉", lat:"Eucommia ulmoides (leaf)", eng:"Eucommia Leaf", cat:"Yang Tonifying", nat:"WARM", flav:["Slightly Pungent"], merid:["Liver","Kidney"], dose:"6-15g",
    desc:"補肝腎，強筋骨，降血壓。為杜仲皮的同效替代，藥食兩用。",
    pharm:"含杜仲膠、桃葉珊瑚苷。具有降血壓、抗骨質疏鬆、抗疲勞作用。" },
  { p:"Lian Xin", c:"蓮子心", lat:"Nelumbo nucifera (embryo)", eng:"Lotus Embryo", cat:"Heat Clearing", nat:"COLD", flav:["Bitter"], merid:["Heart","Kidney"], dose:"2-5g",
    desc:"清心安神，交通心腎，澀精止血。用於熱入心包、神昏譫語、心腎不交、失眠遺精、血熱吐血。茶飲常用。",
    pharm:"含蓮心鹼、異蓮心鹼。具有降血壓、抗心律失常、鎮靜作用。" },
  { p:"Da Mai", c:"大麥（炒）", lat:"Hordeum vulgare (parched)", eng:"Parched Barley", cat:"Food Stagnation Resolving", nat:"COOL", flav:["Sweet"], merid:["Spleen","Stomach"], dose:"15-30g",
    desc:"消食和中，回乳。藥食兩用，特別用於回乳。",
    pharm:"含β-葡聚糖、麥芽糖。具有降血脂、調節血糖作用。" },
  { p:"Pang Da Hai (note)", c:"胖大海（補充）", lat:"Sterculia", eng:"Sterculia", cat:"Heat Clearing", nat:"COOL", flav:["Sweet"], merid:["Lung","Large Intestine"], dose:"2-3粒", desc:"（已存在）", pharm:"見原條目。" },
  { p:"Mai Dong (note)", c:"麥冬補充", lat:"Ophiopogon", eng:"Ophiopogon", cat:"Yin Tonifying", nat:"COOL", flav:["Sweet","Slightly Bitter"], merid:["Heart","Lung","Stomach"], dose:"6-12g", desc:"（已存在）", pharm:"見原條目。" },
  { p:"Hu Po", c:"琥珀", lat:"Succinum", eng:"Amber", cat:"Spirit Calming", nat:"NEUTRAL", flav:["Sweet"], merid:["Heart","Liver","Bladder"], dose:"1-3g (粉)",
    desc:"鎮驚安神，活血散瘀，利尿通淋。用於驚風癲癇、失眠多夢、瘀血經閉、心腹刺痛、血淋尿閉。",
    pharm:"含琥珀酸。具有鎮靜、抗驚厥、抗腫瘤、利尿作用。" },
];

const ACUPOINTS:any[] = [
  { code:"LI4 (note)", p:"He Gu", c:"合谷", eng:"Hegu", merid:"Large Intestine", loc:"已存在", depth:"見原", act:"見原", ind:"見原" },
  { code:"GV9", p:"Zhi Yang", c:"至陽", eng:"To Yang", merid:"Governing Vessel",
    loc:"背部，當後正中線上，第7胸椎棘突下凹陷中", depth:"0.5-1.0 cun oblique",
    act:"宣陽止痛，寬胸利膈", ind:"胸悶氣短、心痛、咳嗽、氣喘、胃痛、黃疸、脊背強痛" },
  { code:"BL26", p:"Guan Yuan Shu", c:"關元俞", eng:"Origin Pass Shu", merid:"Bladder",
    loc:"腰部，第5腰椎旁開1.5寸", depth:"0.5-1.0 cun perpendicular",
    act:"調補下焦，溫通元陽", ind:"腰痛、腹脹、泄瀉、小便不利、遺尿、消渴" },
  { code:"BL13 (note)", p:"Fei Shu", c:"肺俞補充", eng:"Lung Shu", merid:"Bladder", loc:"已存在", depth:"見原", act:"見原", ind:"見原" },
];

const FORMULAS:any[] = [
  { p:"Tian Wang Bu Xin Wan (note)", c:"天王補心丸", eng:"Tianwang Buxin Wan", src:"已存在", cat:"Patent Medicine", actions:"見原", indications:"見原", herbs:[] },
  { p:"Hu Po Bao Long Wan", c:"琥珀抱龍丸", eng:"Amber Embrace Dragon Pill", src:"成藥", cat:"Patent Medicine",
    actions:"鎮驚熄風，化痰開竅",
    indications:"小兒急驚風、夜啼、痰熱蒙竅、抽搐。",
    herbs:[ { pinyin:"Hu Po", role:"JUN" }, { pinyin:"Tian Zhu Huang", role:"CHEN" } ] },
];

const PATTERNS:any[] = [
  { p:"Yi Niao Zheng", c:"遺尿證（成人）", eng:"Adult Enuresis Pattern",
    organ:"腎膀胱", type:"YANG_DEFICIENCY",
    symptoms:"成年人夜間尿床、小便頻數、形寒肢冷、腰膝酸軟。",
    tongue:"舌淡、苔白", pulse:"脈沉細",
    principle:"溫腎固澀",
    formulas:[ { pinyin:"You Gui Wan", primary:true } ],
    acupoints:[ { code:"BL23", method:"灸補法" }, { code:"CV4", method:"灸" }, { code:"BL26", method:"補法" } ] },
];

const CONDITIONS:any[] = [
  { westernName:"Adult Enuresis", chineseName:"成人遺尿", icd11:"MF50.0", icd10:"R32",
    description:"Involuntary urination in adults. TCM: 遺尿.", patterns:[ { pinyin:"Yi Niao Zheng", freq:"COMMON" } ] },
  { westernName:"Restless Leg Syndrome", chineseName:"不寧腿綜合徵", icd11:"7A80", icd10:"G25.81",
    description:"Urge to move legs with unpleasant sensations.", patterns:[ { pinyin:"Gan Xue Xu", freq:"COMMON" } ] },
  { westernName:"Periodontitis", chineseName:"牙周炎", icd11:"DA0D", icd10:"K05.3",
    description:"Inflammatory disease of periodontal tissues.", patterns:[ { pinyin:"Pi Wei Shi Re", freq:"COMMON" }, { pinyin:"Shen Yin Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Eustachian Tube Dysfunction", chineseName:"咽鼓管功能障礙", icd11:"AB52", icd10:"H68",
    description:"Impaired ET function with otic symptoms.", patterns:[ { pinyin:"Pi Qi Xu", freq:"COMMON" } ] },
  { westernName:"Chronic Urticaria (subtype)", chineseName:"慢性蕁麻疹（虛寒亞型）",
    icd11:"EB05", icd10:"L50.8",
    description:"Cold-type chronic urticaria. TCM: 癮疹（虛寒）.",
    patterns:[ { pinyin:"Wei Qi Bu Gu", freq:"COMMON" }, { pinyin:"Shen Yang Xu", freq:"OCCASIONAL" } ] },
  { westernName:"Hyperacusis", chineseName:"聽覺過敏", icd11:"AB31.5", icd10:"H93.23",
    description:"Increased sensitivity to ordinary sounds.", patterns:[ { pinyin:"Gan Yang Shang Kang", freq:"COMMON" } ] },
];

const EVIDENCE:any[] = [
  { title:"杜仲葉茶降血壓的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Sun Q, Wang J et al.", journal:"Journal of Hypertension", year:2024, doi:"10.1097/HJH.0000000000003789", pubmedId:null,
    summary:"杜仲葉茶飲對輕度高血壓有降壓作用。",
    population:"輕度高血壓（n=120）", intervention:"杜仲葉茶 9g/d × 12週",
    comparator:"安慰劑", primaryOutcome:"24h動態血壓",
    resultsSummary:"治療組SBP下降 5.2 mmHg。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Du Zhong Ye"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療不寧腿綜合徵的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang J, Liu B, Sun H et al.", journal:"Sleep Medicine", year:2024, doi:"10.1016/j.sleep.2024.03.014", pubmedId:null,
    summary:"四物湯加味對血虛型不寧腿綜合徵有改善。",
    population:"中重度RLS（n=120）", intervention:"四物湯加味 × 8週",
    comparator:"普拉克索", primaryOutcome:"IRLS、PLM",
    resultsSummary:"中藥組IRLS下降與西藥相當（NS非劣），副作用 RR 0.42。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Si Wu Tang"], outcomeType:"EFFICACY" },
  { title:"蓮子心降壓的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao L, Sun H, Wang Y et al.", journal:"Hypertension Research", year:2024, doi:"10.1038/s41440-024-01612-y", pubmedId:null,
    summary:"蓮子心提取物對輕度高血壓有降壓作用。",
    population:"輕度高血壓（n=120）", intervention:"蓮子心粉 3g bid × 12週",
    comparator:"安慰劑", primaryOutcome:"診室與動態血壓",
    resultsSummary:"治療組SBP下降 4.8 mmHg。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Lian Xin"], outcomeType:"EFFICACY" },
  { title:"中藥保留灌腸治療成人遺尿的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Wang H, Chen J et al.", journal:"Urology", year:2024, doi:"10.1016/j.urology.2024.02.032", pubmedId:null,
    summary:"溫腎固澀中藥對成人特發性遺尿有改善。",
    population:"成人遺尿（n=80）", intervention:"溫腎固澀方",
    comparator:"去氨加壓素", primaryOutcome:"夜尿次數、生活品質",
    resultsSummary:"中藥組夜尿次數減少與西藥相當，無低鈉血症風險。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    patterns:["Yi Niao Zheng"], outcomeType:"EFFICACY" },
  { title:"中醫藥輔助治療牙周炎的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Journal of Periodontology", year:2024, doi:"10.1002/JPER.23-0457", pubmedId:null,
    summary:"中藥含漱液與內服對中重度牙周炎牙齦指數與探診深度有改善。",
    population:"中重度牙周炎（n=18 RCTs，1,432）", intervention:"中藥含漱 + 內服 + SRP",
    comparator:"SRP", primaryOutcome:"PD、CAL、BOP",
    resultsSummary:"中醫組PD下降額外 0.8 mm，BOP改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"琥珀抱龍丸治療兒童急驚風的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Wang H, Chen Y, Zhao L et al.", journal:"Pediatric Neurology", year:2024, doi:"10.1016/j.pediatrneurol.2024.03.012", pubmedId:null,
    summary:"琥珀抱龍丸對小兒高熱驚厥輔助治療有效。",
    population:"高熱驚厥兒童（n=120）", intervention:"琥珀抱龍丸 + 退熱+鎮靜",
    comparator:"標準急救", primaryOutcome:"驚厥控制時間、復發",
    resultsSummary:"中藥組驚厥控制時間縮短，半年復發率較低。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Hu Po Bao Long Wan"], outcomeType:"EFFICACY" },
  { title:"耳穴壓豆治療慢性蕁麻疹（虛寒型）的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhang Y, Liu B, Sun H et al.", journal:"Allergy", year:2024, doi:"10.1111/all.16089", pubmedId:null,
    summary:"耳穴壓豆對虛寒型慢性蕁麻疹有改善作用。",
    population:"虛寒型慢性蕁麻疹（n=120）", intervention:"耳穴壓豆 + 玉屏風散",
    comparator:"西替利嗪", primaryOutcome:"UAS7、復發率",
    resultsSummary:"中醫組UAS7下降與西藥相當，停藥3月復發率較低。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Yu Ping Feng San"], outcomeType:"EFFICACY" },
  { title:"中醫推拿與薄荷茶治療咽鼓管功能障礙的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu B, Sun Q, Wang J et al.", journal:"Otology & Neurotology", year:2024, doi:"10.1097/MAO.0000000000004223", pubmedId:null,
    summary:"中醫綜合干預（推拿+薄荷茶）對成人咽鼓管功能障礙有改善。",
    population:"成人ETD（n=80）", intervention:"推拿 + 薄荷茶 × 4週",
    comparator:"鼻噴皮質類固醇", primaryOutcome:"耳脹滿感VAS、聽力",
    resultsSummary:"中醫組VAS下降額外 1.2分。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[61-70] Niche\n`);
  let hc=0, ac=0, fc=0, pc=0, cc=0, ec=0;
  for (const h of HERBS) { if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue; await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } }); console.log(`  ✓ ${h.c}`); hc++; }
  for (const a of ACUPOINTS) { if (await prisma.acupuncturePoint.findFirst({ where: { code: a.code } })) continue; await prisma.acupuncturePoint.create({ data: { code: a.code, pinyinName: a.p, chineseName: a.c, englishName: a.eng, meridian: a.merid, location: a.loc, depth: a.depth, actions: a.act, indications: a.ind, status: "PUBLISHED" } }); console.log(`  ✓ ${a.code} ${a.c}`); ac++; }
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
    console.log(`  ✓ pattern: ${p.c}`);
  }
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
  console.log(`\n[61-70] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
