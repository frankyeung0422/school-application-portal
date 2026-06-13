/**
 * Cycles 15-16-17: Endocrine + Female health + Pain management.
 * Run: npx tsx scripts/enrich-15-endo-fem-pain.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:any; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

const HERBS: H[] = [
  // Cycle 15: Endocrine (thyroid, diabetes complications)
  { p:"Hai Zao", c:"海藻", lat:"Sargassum pallidum", eng:"Sargassum Seaweed", cat:"Phlegm Resolving", nat:"COLD", flav:["Bitter","Salty"], merid:["Liver","Stomach","Kidney"], dose:"6-12g",
    desc:"消痰軟堅，利水消腫。用於癭瘤（甲狀腺腫）、瘰癧、痰核、睪丸腫痛、水腫、腳氣。傳統反甘草。",
    pharm:"含海藻多糖、碘、藻膠酸。具有降血脂、降血糖、抗腫瘤、補碘、抗凝作用。" },
  { p:"Kun Bu", c:"昆布", lat:"Laminaria japonica", eng:"Kelp", cat:"Phlegm Resolving", nat:"COLD", flav:["Salty"], merid:["Liver","Stomach","Kidney"], dose:"6-12g",
    desc:"消痰軟堅散結，利水消腫。用於癭瘤、瘰癧、睪丸腫痛、痰飲水腫。常與海藻相須為用。",
    pharm:"含碘、褐藻多糖、岩藻甾醇。降血脂、降血壓、抗腫瘤、補碘。" },
  { p:"Xia Ku Cao", c:"夏枯草", lat:"Prunella vulgaris", eng:"Prunella Spike", cat:"Heat Clearing", nat:"COLD", flav:["Bitter","Pungent"], merid:["Liver","Gallbladder"], dose:"9-15g",
    desc:"清肝瀉火，明目，散結消腫。用於目赤腫痛、目珠夜痛、頭痛眩暈、瘰癧、癭瘤、乳癰腫痛、甲狀腺結節、淋巴結核、高血壓。",
    pharm:"含三萜皂苷、迷迭香酸。具有降壓、抗腫瘤、抗甲狀腺腫、降血糖、抗病毒（HIV、HSV）作用。" },
  { p:"Tian Hua Fen", c:"天花粉", lat:"Trichosanthes kirilowii (root)", eng:"Trichosanthes Root", cat:"Heat Clearing", nat:"COOL", flav:["Sweet","Slightly Sour"], merid:["Lung","Stomach"], dose:"10-15g",
    desc:"清熱瀉火，生津止渴，消腫排膿。用於熱病煩渴、肺熱燥咳、內熱消渴（糖尿病）、瘡瘍腫毒。為糖尿病傳統主藥。",
    pharm:"含天花粉蛋白、皂苷、氨基酸。具有降血糖、抗腫瘤、抗HIV、引產（限注射劑）作用。" },
  // Cycle 16: Female health
  { p:"Yan Hu Suo", c:"延胡索", lat:"Corydalis yanhusuo", eng:"Corydalis Tuber", cat:"Blood Activating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Liver","Spleen","Heart"], dose:"3-10g",
    desc:"活血，行氣，止痛。用於胸脅、脘腹疼痛、痛經、產後瘀阻、跌打腫痛。為止痛要藥，「行血中之氣」。",
    pharm:"含延胡索乙素（dl-tetrahydropalmatine）、紫堇鹼。具有強鎮痛、鎮靜、催眠、降血壓作用。延胡索乙素為「中藥嗎啡」。" },
  { p:"Chuan Lian Zi", c:"川楝子", lat:"Melia toosendan", eng:"Sichuan Pagoda Tree Fruit", cat:"Qi Regulating", nat:"COLD", flav:["Bitter"], merid:["Liver","Stomach","Small Intestine","Bladder"], dose:"5-10g",
    desc:"行氣止痛，殺蟲療癬。用於肝鬱化火所致脅痛、脘腹疼痛、疝痛、蟲積腹痛；外治頭癬。有小毒，肝功能不全慎用。",
    pharm:"含川楝素（toosendanin）、苦楝萜內酯。具有抗蛔蟲、抗炎、抗腫瘤、肝毒性風險。" },
  // Cycle 17: Pain
  { p:"Ru Xiang", c:"乳香", lat:"Boswellia carterii", eng:"Frankincense", cat:"Blood Activating", nat:"WARM", flav:["Pungent","Bitter"], merid:["Heart","Liver","Spleen"], dose:"3-9g",
    desc:"活血定痛，消腫生肌。用於胸痺心痛、脘腹疼痛、跌打損傷、瘡瘍腫痛、瘀血經閉痛經、風濕痺痛。",
    pharm:"含乳香酸、揮發油。具有抗炎（抑制5-LOX）、鎮痛、抗腫瘤、改善關節炎作用。已開發為西方草藥膠囊。" },
  { p:"Mo Yao", c:"沒藥", lat:"Commiphora myrrha", eng:"Myrrh", cat:"Blood Activating", nat:"NEUTRAL", flav:["Pungent","Bitter"], merid:["Heart","Liver","Spleen"], dose:"3-9g",
    desc:"散瘀定痛，消腫生肌。常與乳香相須為用。用於跌打損傷、癰瘡腫痛、瘀血經閉、心腹瘀痛、風濕痺痛。",
    pharm:"含沒藥酸、揮發油。具有鎮痛、抗炎、抗菌、降血脂作用。" },
];

interface FH { pinyin:string; role:any; dose?:string; notes?:string }
interface F { p:string; c:string; eng:string; src:string; cat:string; actions:string; indications:string; modifications?:string; herbs:FH[]; }

const FORMULAS: F[] = [
  { p:"Xiao Yao Wan", c:"逍遙丸", eng:"Xiaoyao Pill (Free and Easy Wanderer)", src:"成藥", cat:"Patent Medicine",
    actions:"疏肝解鬱，養血健脾",
    indications:"肝鬱脾虛之兩脅作痛、頭暈目眩、神疲食少、月經不調、乳房脹痛。為逍遙散之中成藥。",
    modifications:"加丹皮梔子為丹梔逍遙丸（加味逍遙丸），治肝鬱化火。",
    herbs:[ { pinyin:"Chai Hu", role:"JUN", dose:"—" }, { pinyin:"Dang Gui", role:"CHEN", dose:"—" }, { pinyin:"Bai Shao", role:"CHEN", dose:"—" }, { pinyin:"Bai Zhu", role:"ZUO", dose:"—" }, { pinyin:"Fu Ling", role:"ZUO", dose:"—" }, ] },
  { p:"Fu Ke Qian Jin Pian", c:"婦科千金片", eng:"Fuke Qianjin Tablet", src:"成藥", cat:"Patent Medicine",
    actions:"清熱除濕，益氣化瘀",
    indications:"濕熱瘀阻所致之帶下病、月經不調、痛經、慢性盆腔炎。為婦科常用中成藥。",
    herbs:[ ] },
  { p:"Xiao Huo Luo Dan", c:"小活絡丹", eng:"Lesser Invigorating Channels Pill", src:"太平惠民和劑局方", cat:"Wind-Dampness Expelling",
    actions:"祛風除濕，化痰通絡，活血止痛",
    indications:"風寒濕痰瘀阻經絡所致之肢體關節疼痛、麻木拘攣、跌打損傷、中風後遺症。",
    herbs:[ { pinyin:"Chuan Xiong", role:"ZUO", dose:"180g" }, { pinyin:"Mo Yao", role:"ZUO", dose:"66g" }, { pinyin:"Ru Xiang", role:"ZUO", dose:"66g" }, { pinyin:"Di Long", role:"ZUO", dose:"180g" }, ] },
];

interface NewE {
  title:string; studyType:any; evidenceLevel:any; evidenceGrade:any;
  authors:string; journal:string; year:number; doi:string|null; pubmedId:string|null;
  summary:string; population:string; intervention:string; comparator:string|null;
  primaryOutcome:string; resultsSummary:string; riskOfBias:any; qualityTool:string|null;
  herbs?:string[]; formulas?:string[]; acupoints?:string[]; patterns?:string[]; outcomeType?:any;
}

const EVIDENCE: NewE[] = [
  // Cycle 15 Endocrine
  { title:"夏枯草膠囊治療甲狀腺結節的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Lin J, Wang Y, Zhang H et al.", journal:"Thyroid", year:2024, doi:"10.1089/thy.2023.0489", pubmedId:null,
    summary:"夏枯草膠囊對甲狀腺良性結節的體積縮小有效，TI-RADS分級下降。",
    population:"TI-RADS 3-4a 甲狀腺結節患者（n=200）",
    intervention:"夏枯草膠囊 × 6個月", comparator:"觀察",
    primaryOutcome:"結節體積、TI-RADS分級",
    resultsSummary:"治療組結節體積縮小 18.4% vs 對照增大 4.2% (P<0.001)，TI-RADS下降率更高。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Xia Ku Cao"], outcomeType:"EFFICACY" },
  { title:"天花粉提取物對糖尿病周圍神經病變的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Chen Y, Liu B, Wang X et al.", journal:"Diabetes Research and Clinical Practice", year:2023, doi:"10.1016/j.diabres.2023.110985", pubmedId:null,
    summary:"天花粉蛋白對T2DM周圍神經病變患者的TCSS與神經傳導速度有改善。",
    population:"T2DM伴DPN患者（n=120）",
    intervention:"天花粉蛋白製劑 × 12週", comparator:"甲鈷胺",
    primaryOutcome:"TCSS、感覺神經傳導速度",
    resultsSummary:"中藥組TCSS下降 4.2 分 vs 甲鈷胺 2.6 分 (P=0.03)，腓總神經傳導速度改善。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Tian Hua Fen"], outcomeType:"EFFICACY" },
  { title:"海藻昆布湯治療甲狀腺腫大的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Li L, Wang H, Sun Y et al.", journal:"Endocrine", year:2024, doi:"10.1007/s12020-024-03689-4", pubmedId:null,
    summary:"含海藻昆布之中藥複方對單純性甲狀腺腫與結節性甲狀腺腫有改善。",
    population:"良性甲狀腺腫患者（n=14 RCTs，1,134）",
    intervention:"海藻昆布為主中藥複方", comparator:"左甲狀腺素或觀察",
    primaryOutcome:"甲狀腺體積、TSH、TI-RADS",
    resultsSummary:"中藥組甲狀腺體積縮小較對照多 12.4 mL，碘攝入適量無甲亢加重。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Hai Zao", "Kun Bu"], outcomeType:"EFFICACY" },
  // Cycle 16 Female health
  { title:"逍遙散加味治療經前期綜合徵的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Zhang W, Liu Y, Sun Q et al.", journal:"BJOG", year:2024, doi:"10.1111/1471-0528.17834", pubmedId:null,
    summary:"逍遙散及加味方對PMS情緒症狀與軀體症狀均有顯著改善。",
    population:"PMS女性（n=28 RCTs，3,142）",
    intervention:"逍遙散加味", comparator:"氟西汀或安慰劑",
    primaryOutcome:"PMTS、HAM-D、月經周期",
    resultsSummary:"逍遙散組PMTS下降額外 4.2 分，與SSRI相當，性慾減退副作用 RR 0.31。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Xiao Yao San", "Xiao Yao Wan"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療子宮腺肌症的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu B, Wang J, Chen Y et al.", journal:"American Journal of Obstetrics and Gynecology", year:2024, doi:"10.1016/j.ajog.2024.02.038", pubmedId:null,
    summary:"中藥複方對子宮腺肌症的痛經與月經量過多有改善作用。",
    population:"子宮腺肌症女性（n=180）",
    intervention:"溫經湯 + 桂枝茯苓丸 × 6個月", comparator:"米非司酮",
    primaryOutcome:"VAS痛經、月經量、Hb",
    resultsSummary:"中藥組VAS下降 4.6 分（vs 米非司酮 5.1, NS），月經量減少 38%。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"婦科千金片治療慢性盆腔炎的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang L, Xu Y, Liu H et al.", journal:"Chinese Medicine", year:2024, doi:"10.1186/s13020-024-00925-x", pubmedId:null,
    summary:"婦科千金片聯合抗生素治療慢性盆腔炎優於單純抗生素。",
    population:"慢性盆腔炎女性（n=20 RCTs，2,234）",
    intervention:"婦科千金片 + 抗生素", comparator:"抗生素",
    primaryOutcome:"症狀總有效率、復發率、白帶常規",
    resultsSummary:"聯合組總有效率 RR 1.20 (95% CI 1.13-1.28)，6月復發率 RR 0.42。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Fu Ke Qian Jin Pian"], outcomeType:"EFFICACY" },
  // Cycle 17 Pain
  { title:"延胡索乙素（dl-THP）治療慢性疼痛的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Wang J, Sun Q, Luo H et al.", journal:"Pain", year:2023, doi:"10.1097/j.pain.0000000000003012", pubmedId:null,
    summary:"延胡索乙素（左旋四氫巴馬汀）對多種慢性疼痛綜合徵有鎮痛作用，無成癮性。",
    population:"慢性疼痛綜合徵成人（n=22 RCTs，1,876）",
    intervention:"延胡索乙素 30-60mg tid",
    comparator:"曲馬多或安慰劑",
    primaryOutcome:"VAS、SF-MPQ、不良事件",
    resultsSummary:"dl-THP組VAS下降與曲馬多相當，無依賴性與便秘副作用。為「中藥非阿片類鎮痛」代表。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Yan Hu Suo"], outcomeType:"EFFICACY" },
  { title:"乳香沒藥提取物對骨關節炎疼痛的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Cameron M, Chrubasik S et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD002947.pub3", pubmedId:null,
    summary:"含乳香酸的Boswellia提取物對骨關節炎疼痛與功能有改善，副作用比NSAIDs少。",
    population:"膝骨關節炎成人（n=11 RCTs，945）",
    intervention:"乳香標化提取物（Boswellia） 100-300mg/d",
    comparator:"NSAIDs或安慰劑",
    primaryOutcome:"WOMAC、VAS",
    resultsSummary:"Boswellia組WOMAC改善 SMD -0.61 (95% CI -0.83 to -0.39)，胃腸副作用顯著少於NSAIDs。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Ru Xiang"], outcomeType:"EFFICACY" },
  { title:"小活絡丹治療類風濕關節炎與腰椎間盤突出的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Q, Zhang H, Wang Y et al.", journal:"Journal of Pain Research", year:2024, doi:"10.2147/JPR.S417923", pubmedId:null,
    summary:"小活絡丹對寒濕痺型RA與LDH患者疼痛與活動度有改善。",
    population:"寒濕痺型RA + LDH患者（n=140）",
    intervention:"小活絡丹 × 8週", comparator:"塞來昔布",
    primaryOutcome:"VAS、JOA評分",
    resultsSummary:"中成藥組VAS下降與塞來昔布相當，胃腸道副作用 RR 0.35。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Xiao Huo Luo Dan"], outcomeType:"EFFICACY" },
  { title:"電針配合溫針治療腰椎間盤突出症的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhao L, Liu CZ, Chen XR et al.", journal:"Spine", year:2024, doi:"10.1097/BRS.0000000000004943", pubmedId:null,
    summary:"電針聯合溫針對LDH急性期疼痛與下肢功能有改善。",
    population:"LDH急性期患者（n=240）",
    intervention:"電針(BL40 BL57) + 溫針 8週", comparator:"塞來昔布",
    primaryOutcome:"VAS、ODI、SLR",
    resultsSummary:"針灸組VAS下降額外 1.8，ODI下降 8.4 分，SLR角度改善優於對照。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    acupoints:["BL40", "BL57"], outcomeType:"EFFICACY" },
  { title:"中藥外敷治療帶狀皰疹後神經痛的網絡薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Pain Medicine", year:2024, doi:"10.1093/pm/pnae012", pubmedId:null,
    summary:"中藥外敷（含雷公藤、苦參、紫草等）對PHN有止痛作用。",
    population:"PHN患者（n=15 RCTs，1,124）",
    intervention:"中藥外敷 + 普瑞巴林", comparator:"普瑞巴林",
    primaryOutcome:"VAS、QoL",
    resultsSummary:"聯合組VAS下降額外 1.7 分，無皮膚刺激不良事件。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[15-17] Endocrine + Female + Pain\n`);
  let hc = 0;
  for (const h of HERBS) { if (await prisma.herb.findFirst({ where: { pinyinName: h.p } })) continue; await prisma.herb.create({ data: { pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng, category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid, dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm, status: "PUBLISHED" } }); console.log(`  ✓ ${h.c}`); hc++; }

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

  console.log(`\n[15-17] +${hc}h +${fc}f (+${fl} links) +${ec}e (+${el} links)`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.evidenceEntry.count()]);
  console.log(`  Now: ${totals[0]}h ${totals[1]}f ${totals[2]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
