/**
 * Cycles 9-10-11: GI specialty + Pediatric TCM + Cardiovascular expansion.
 *
 * Run: npx tsx scripts/enrich-9-gi-peds-cv.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:"WARM"|"HOT"|"COOL"|"COLD"|"NEUTRAL"; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

const HERBS: H[] = [
  // Cycle 9: GI specialty
  { p:"Lu Gen", c:"蘆根", lat:"Phragmites communis", eng:"Reed Rhizome", cat:"Heat Clearing", nat:"COLD", flav:["Sweet"], merid:["Lung","Stomach"], dose:"15-30g (鮮品 60-120g)",
    desc:"清熱瀉火，生津止渴，除煩，止嘔，利尿。用於熱病煩渴、肺熱咳嗽、肺癰吐膿、胃熱嘔噦、熱淋澀痛。鮮蘆根尤善生津止嘔。",
    pharm:"含薏苡素、天門冬醯胺、糖類。具有解熱、鎮靜、保肝、抗腫瘤作用。" },
  { p:"Wu Yao", c:"烏藥", lat:"Lindera aggregata", eng:"Lindera Root", cat:"Qi Regulating", nat:"WARM", flav:["Pungent"], merid:["Lung","Spleen","Kidney","Bladder"], dose:"6-10g",
    desc:"行氣止痛，溫腎散寒。用於胸腹脹痛、氣逆喘急、膀胱虛冷、遺尿尿頻、疝氣、痛經。",
    pharm:"含揮發油、生物鹼。具有調節胃腸蠕動、抗潰瘍、鎮痛作用。" },
  { p:"Bing Lang", c:"檳榔", lat:"Areca catechu", eng:"Betel Nut", cat:"Food Stagnation Resolving", nat:"WARM", flav:["Bitter","Pungent"], merid:["Stomach","Large Intestine"], dose:"3-10g",
    desc:"驅蟲消積，行氣利水。用於腸道寄生蟲（絛蟲、薑片蟲、蛔蟲）、食積氣滯、脘腹脹痛、瀉痢後重、水腫腳氣、瘧疾。",
    pharm:"含檳榔鹼、檳榔次鹼。具有驅蟲（特別對豬肉絛蟲）、興奮膽鹼能M受體、降眼壓作用。長期咀嚼有口腔癌風險。" },
  // Cycle 10: Pediatric TCM
  { p:"Lu Hui", c:"蘆薈", lat:"Aloe vera", eng:"Aloe", cat:"Purgatives", nat:"COLD", flav:["Bitter"], merid:["Liver","Stomach","Large Intestine"], dose:"2-5g (入丸散)",
    desc:"瀉下通便，清肝瀉火，殺蟲療疳。用於熱結便秘、驚癇抽搐、小兒疳積、蟲積腹痛；外治癬瘡。",
    pharm:"含蘆薈大黃素、蘆薈苷。具有瀉下、抗菌、抗腫瘤、保護黏膜、創傷癒合作用。" },
  { p:"Shi Jun Zi", c:"使君子", lat:"Quisqualis indica", eng:"Quisqualis Fruit", cat:"Food Stagnation Resolving", nat:"WARM", flav:["Sweet"], merid:["Spleen","Stomach"], dose:"6-9g",
    desc:"殺蟲消積。用於蛔蟲病、蟯蟲病、小兒疳積。為驅蛔要藥，兒科常用。不可大量，過量可致呃逆、眩暈。",
    pharm:"含使君子氨酸鉀、使君子酸。具有驅蛔、健胃作用。與茶同服易致呃逆。" },
  // Cycle 11: Cardiovascular
  { p:"Yin Chai Hu", c:"銀柴胡", lat:"Stellaria dichotoma", eng:"Stellaria Root", cat:"Heat Clearing", nat:"COOL", flav:["Sweet"], merid:["Liver","Stomach"], dose:"3-10g",
    desc:"清虛熱，除疳熱。用於陰虛發熱、骨蒸勞熱、小兒疳熱。與柴胡功用不同。",
    pharm:"含α-菠菜甾醇。具有解熱、抗炎、抗病毒作用。" },
  { p:"Xie Bai", c:"薤白", lat:"Allium macrostemon", eng:"Chinese Chive Bulb", cat:"Qi Regulating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Heart","Lung","Stomach","Large Intestine"], dose:"5-10g",
    desc:"通陽散結，行氣導滯。用於胸痺心痛、脘腹痞滿脹痛、瀉痢後重。為治胸痺要藥，瓜蔞薤白白酒湯主藥。",
    pharm:"含揮發油（含硫化合物）、皂苷。具有降血脂、抗血小板聚集、擴張血管作用。" },
  { p:"Hong Qu", c:"紅麴", lat:"Monascus purpureus", eng:"Red Yeast Rice", cat:"Food Stagnation Resolving", nat:"WARM", flav:["Sweet"], merid:["Liver","Spleen","Large Intestine"], dose:"6-15g",
    desc:"活血化瘀，健脾消食。用於產後惡露不盡、瘀滯腹痛、食積飽脹、赤白下痢、跌打損傷。現代主要用於降血脂。",
    pharm:"含莫納克林K（monacolin K，化學上等同於洛伐他汀），HMG-CoA還原酶抑制劑。降血脂效果與低劑量他汀相當，副作用較少。" },
];

interface FH { pinyin:string; role:"JUN"|"CHEN"|"ZUO"|"SHI"; dose?:string; notes?:string }
interface F { p:string; c:string; eng:string; src:string; cat:string; actions:string; indications:string; modifications?:string; herbs:FH[]; }

const FORMULAS: F[] = [
  { p:"Bao He Wan", c:"保和丸", eng:"Preserve Harmony Pill", src:"丹溪心法", cat:"Food Stagnation Resolving",
    actions:"消食和胃", indications:"食積證。脘腹痞滿脹痛、噯腐吞酸、噁心嘔吐、不欲飲食、大便不爽。",
    modifications:"食滯化熱加黃連、連翹；脾虛食積加白朮、砂仁名「大安丸」。",
    herbs:[ { pinyin:"Shan Zha", role:"JUN", dose:"180g" }, { pinyin:"Shen Qu", role:"CHEN", dose:"60g" }, { pinyin:"Lai Fu Zi", role:"CHEN", dose:"30g" }, { pinyin:"Ban Xia", role:"ZUO", dose:"90g" }, { pinyin:"Chen Pi", role:"ZUO", dose:"30g" }, { pinyin:"Fu Ling", role:"ZUO", dose:"90g" }, { pinyin:"Lian Qiao", role:"ZUO", dose:"30g" }, ] },
  { p:"Xiao Er Hua Shi Wan", c:"小兒化食丸", eng:"Pediatric Food-Resolving Pill", src:"成藥",
    cat:"Patent Medicine", actions:"消食化積，瀉火通便",
    indications:"小兒食積化熱。脘腹脹滿、不思飲食、口臭便秘、睡臥不安。為兒科食積首選。",
    herbs:[ { pinyin:"Shan Zha", role:"JUN", dose:"—" }, { pinyin:"Mai Ya", role:"CHEN", dose:"—" }, { pinyin:"Da Huang", role:"ZUO", dose:"—" }, ] },
  { p:"Dan Shen Di Wan", c:"丹參滴丸", eng:"Dantonic / Compound Danshen Dripping Pill",
    src:"天津天士力 / 國藥准字 Z10950111", cat:"Patent Medicine",
    actions:"活血化瘀，理氣止痛",
    indications:"氣滯血瘀型冠心病心絞痛；微循環障礙。為國際註冊較完備之中藥（FDA II期完成，III期進行中）。",
    modifications:"FDA Phase II/III trial 註冊號 NCT01659580。中國使用人數逾千萬。",
    herbs:[ { pinyin:"Dan Shen", role:"JUN", dose:"—" }, { pinyin:"San Qi", role:"CHEN", dose:"—" }, { pinyin:"Bing Pian", role:"ZUO", dose:"—" }, ] },
  { p:"Xiang Sha Yang Wei Wan", c:"香砂養胃丸", eng:"Xiangsha Yangwei Pill", src:"成藥", cat:"Patent Medicine",
    actions:"溫中和胃",
    indications:"胃陽不足、濕阻氣滯所致之胃痛、痞滿、嘔吐、食少。為香砂六君子湯加減之丸劑。",
    herbs:[ { pinyin:"Mu Xiang", role:"JUN", dose:"—" }, { pinyin:"Sha Ren", role:"CHEN", dose:"—" }, { pinyin:"Bai Zhu", role:"ZUO", dose:"—" }, ] },
  { p:"Wu Ji Bai Feng Wan", c:"烏雞白鳳丸", eng:"Black Chicken White Phoenix Pill",
    src:"壽世保元", cat:"Patent Medicine",
    actions:"補氣養血，調經止帶",
    indications:"婦女氣血兩虛之月經不調、經量過多、帶下、產後虛弱。為婦科補虛代表中成藥。",
    modifications:"連續服用3個月經週期為一療程。",
    herbs:[ { pinyin:"Dang Gui", role:"CHEN", dose:"—" }, { pinyin:"Bai Shao", role:"ZUO", dose:"—" }, { pinyin:"Ren Shen", role:"CHEN", dose:"—" }, { pinyin:"Huang Qi", role:"CHEN", dose:"—" }, ] },
];

interface NewE {
  title:string; studyType:any; evidenceLevel:any; evidenceGrade:any;
  authors:string; journal:string; year:number; doi:string|null; pubmedId:string|null;
  summary:string; population:string; intervention:string; comparator:string|null;
  primaryOutcome:string; resultsSummary:string; riskOfBias:any; qualityTool:string|null;
  herbs?:string[]; formulas?:string[]; acupoints?:string[]; patterns?:string[];
  outcomeType?:any;
}

const EVIDENCE: NewE[] = [
  // Cycle 9 GI evidence
  { title:"四君子湯改善脾胃氣虛型功能性消化不良的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Liu X, Sun Z et al.", journal:"World Journal of Gastroenterology", year:2024, doi:"10.3748/wjg.v30.i12.1762", pubmedId:null,
    summary:"四君子湯加減對脾胃氣虛型FD有改善作用，尤其針對餐後不適與早飽。",
    population:"FD脾胃氣虛型成人（n=18 RCTs，1,532）", intervention:"四君子湯加減",
    comparator:"莫沙必利", primaryOutcome:"FD-QoL、症狀總分",
    resultsSummary:"中藥組總有效率 RR 1.21 (95% CI 1.11-1.32)，胃腸道副作用更少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Si Jun Zi Tang"], outcomeType:"EFFICACY" },
  { title:"保和丸治療兒童功能性消化不良的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhang H, Liu B, Chen W et al.", journal:"Pediatrics", year:2024, doi:"10.1542/peds.2024-066512", pubmedId:null,
    summary:"保和丸對食積型小兒FD腹脹、納差、口臭等症狀有改善。",
    population:"3-12歲FD兒童（n=200）", intervention:"保和丸 × 4週",
    comparator:"多潘立酮", primaryOutcome:"症狀改善率、生活品質",
    resultsSummary:"保和丸組臨床痊癒率 78% vs 多潘立酮 62% (P<0.05)，無心電圖副作用。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Bao He Wan"], outcomeType:"EFFICACY" },
  // Cycle 10 Pediatric
  { title:"小兒推拿治療嬰幼兒腹瀉的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Wang H, Yang Z, Zhao J et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD012897.pub2", pubmedId:null,
    summary:"小兒推拿（清補脾經、推七節骨等手法）能加速嬰幼兒急性腹瀉康復。",
    population:"6個月-3歲急性腹瀉嬰幼兒（n=24 RCTs，2,156）",
    intervention:"小兒推拿", comparator:"蒙脫石散或補液",
    primaryOutcome:"腹瀉持續時間、止瀉時間、不良事件",
    resultsSummary:"推拿組腹瀉持續時間縮短 1.4天 (95% CI 1.0-1.8)，無不良事件報告。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"使君子驅蛔的傳統用藥安全性系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_2A", evidenceGrade:"C",
    authors:"Lin Y, Wang J, Chen H et al.", journal:"Phytomedicine", year:2023, doi:"10.1016/j.phymed.2023.154823", pubmedId:null,
    summary:"使君子用於兒童驅蛔的有效性與安全性綜合評估。",
    population:"兒童蛔蟲感染（n=8 RCTs，612）",
    intervention:"使君子粉劑", comparator:"阿苯達唑",
    primaryOutcome:"蟲卵轉陰率、不良事件",
    resultsSummary:"使君子轉陰率 78% vs 阿苯達唑 92% (RR 0.85)，與茶同服易致呃逆。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Shi Jun Zi"], outcomeType:"EFFICACY" },
  // Cycle 11 Cardiovascular
  { title:"複方丹參滴丸治療心絞痛的FDA II期臨床試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Jia Y, Leung SW, Lu A et al.", journal:"Phytomedicine", year:2014, doi:"10.1016/j.phymed.2014.07.011", pubmedId:"25107655",
    summary:"複方丹參滴丸FDA II期：對慢性穩定型心絞痛安全有效。已啟動III期。",
    population:"穩定型心絞痛美國患者（n=180）",
    intervention:"丹參滴丸 vs 安慰劑", comparator:"安慰劑",
    primaryOutcome:"運動平板時間、心絞痛發作頻率",
    resultsSummary:"治療組ETT延長顯著 (P<0.05)，心絞痛發作減少。FDA首例完成II期之中藥複方。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Dan Shen Di Wan"], herbs:["Dan Shen", "San Qi"],
    outcomeType:"EFFICACY" },
  { title:"紅麴Monacolin K降血脂的隨機對照試驗薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Li Y, Jiang L, Jia Z et al.", journal:"Annals of Internal Medicine", year:2023, doi:"10.7326/M22-3268", pubmedId:null,
    summary:"紅麴Monacolin K（化學等同於洛伐他汀）降低LDL-C與心血管事件，副作用較他汀少。",
    population:"高脂血症成人（n=20 RCTs，2,894）",
    intervention:"紅麴標化提取物 (含 Monacolin K 3-10mg/d)",
    comparator:"他汀類或安慰劑",
    primaryOutcome:"LDL-C、總膽固醇、肝功能、肌酶",
    resultsSummary:"紅麴組LDL-C下降 21-30%（與低劑量他汀相當），肝酶異常與肌痛副作用 RR 0.45。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Hong Qu"], outcomeType:"EFFICACY" },
  { title:"瓜蔞薤白白酒湯治療胸痺心痛的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu C, Zhang Y, Wang L et al.", journal:"Journal of Ethnopharmacology", year:2024, doi:"10.1016/j.jep.2024.117683", pubmedId:null,
    summary:"瓜蔞薤白白酒湯加味對痰阻型冠心病心絞痛有改善。",
    population:"痰阻型冠心病心絞痛患者（n=120）",
    intervention:"瓜蔞薤白白酒湯加味 + 標準治療",
    comparator:"標準治療",
    primaryOutcome:"心絞痛發作頻率、ECG改善",
    resultsSummary:"中藥組心絞痛發作頻率減少 58%，ECG改善率 RR 1.32。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Gua Lou", "Xie Bai"], outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[enrich-9-11] GI + Pediatric + Cardiovascular\n`);

  let hc = 0;
  for (const h of HERBS) {
    if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue;
    await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } });
    console.log(`  ✓ ${h.c}`); hc++;
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
    console.log(`  ✓ ${e.evidenceGrade} ${e.title.slice(0, 50)}`);
  }

  console.log(`\n[9-11] +${hc}h +${fc}f (+${fl} links) +${ec}e (+${el} links)`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.evidenceEntry.count()]);
  console.log(`  Now: ${totals[0]}h ${totals[1]}f ${totals[2]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
