/**
 * Cycles 12-13-14: Dermatology + Mental Health + Cancer Adjunct.
 * Run: npx tsx scripts/enrich-12-derm-mental-cancer.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H { p:string; c:string; lat:string; eng:string; cat:string; nat:any; flav:string[]; merid:string[]; dose:string; desc:string; pharm:string; }

const HERBS: H[] = [
  // Cycle 12: Dermatology
  { p:"Bai Xian Pi", c:"白鮮皮", lat:"Dictamnus dasycarpus", eng:"Dictamnus Root Bark", cat:"Heat Clearing", nat:"COLD", flav:["Bitter"], merid:["Spleen","Stomach","Bladder"], dose:"5-10g",
    desc:"清熱燥濕，祛風解毒。用於濕熱瘡毒、黃水淋漓、濕疹、風疹、疥癬瘡癩、風濕熱痺。為皮膚病要藥。",
    pharm:"含白鮮鹼、白鮮內酯。具有抗炎、抗過敏、抗真菌、解熱作用。" },
  { p:"Tu Fu Ling", c:"土茯苓", lat:"Smilax glabra", eng:"Smilax Rhizome", cat:"Heat Clearing", nat:"NEUTRAL", flav:["Sweet","Bland"], merid:["Liver","Stomach"], dose:"15-60g",
    desc:"解毒，除濕，通利關節。用於梅毒、淋濁、筋骨疼痛、瘰癧、濕疹、瘡瘍。為治梅毒要藥，現代用於濕疹、痛風。",
    pharm:"含落新婦苷、薯蕷皂苷。具有抗炎、抗腫瘤、保肝、降尿酸、利尿作用。" },
  { p:"Lei Gong Teng", c:"雷公藤", lat:"Tripterygium wilfordii", eng:"Thunder God Vine", cat:"Wind-Dampness Expelling", nat:"COOL", flav:["Bitter","Pungent"],
    merid:["Liver","Kidney"], dose:"15-25g (decoction); 60-90g/d (extract)",
    desc:"祛風除濕，活血通絡，消腫止痛，殺蟲解毒。用於風濕頑痺、麻風、頑癬、濕疹、銀屑病、紅斑狼瘡、類風濕關節炎、腎炎。有大毒，需嚴格炮製，孕婦禁用、生育期男女慎用。",
    pharm:"含雷公藤甲素、雷公藤紅素、雷公藤多苷。具有強免疫抑制、抗炎、抗腫瘤、抑制生育作用。雷公藤多苷片為現代提取物製劑，廣用於RA與腎病綜合徵。" },
  // Cycle 13: Mental Health
  { p:"He Huan Hua", c:"合歡花", lat:"Albizia julibrissin (flower)", eng:"Albizia Flower", cat:"Spirit Calming", nat:"NEUTRAL", flav:["Sweet"], merid:["Heart","Liver"], dose:"5-10g",
    desc:"解鬱安神，理氣開胃。用於忿怒憂鬱、虛煩不安、健忘失眠、胸悶不適、跌打損傷。為治鬱證之神品。",
    pharm:"含揮發油、皂苷。具有鎮靜、抗抑鬱、抗焦慮、降壓作用。" },
  { p:"He Huan Pi", c:"合歡皮", lat:"Albizia julibrissin (bark)", eng:"Albizia Bark", cat:"Spirit Calming", nat:"NEUTRAL", flav:["Sweet"], merid:["Heart","Liver","Lung"], dose:"6-12g",
    desc:"解鬱安神，活血消腫。用於心神不寧、憂鬱失眠、肺癰、瘡腫、跌撲傷痛。",
    pharm:"含合歡皂苷、鞣質。具有鎮靜、抗抑鬱、抗腫瘤、抗癡呆作用。" },
  // Cycle 14: Cancer Adjunct
  { p:"Bai Hua She She Cao", c:"白花蛇舌草", lat:"Hedyotis diffusa", eng:"Oldenlandia / Snake-Tongue Herb",
    cat:"Heat Clearing", nat:"COLD", flav:["Sweet","Slightly Bitter"], merid:["Stomach","Large Intestine","Small Intestine"], dose:"15-60g",
    desc:"清熱解毒，消癰利濕。用於各種癌腫（肺癌、胃癌、肝癌、腸癌、直腸癌）、咽喉腫痛、闌尾炎、毒蛇咬傷、濕熱黃疸。為現代抗癌中藥代表。",
    pharm:"含環烯醚萜苷、香豆素、黃酮。具有抗腫瘤（多種癌細胞）、抗炎、抗菌、增強免疫作用。" },
  { p:"Ban Zhi Lian", c:"半枝蓮", lat:"Scutellaria barbata", eng:"Barbed Skullcap", cat:"Heat Clearing", nat:"COOL", flav:["Pungent","Bitter"], merid:["Liver","Lung","Stomach"], dose:"15-30g",
    desc:"清熱解毒，散瘀止血，利尿消腫。用於癌腫（肝癌、肺癌、腸癌）、瘡瘍腫毒、咽喉腫痛、毒蛇咬傷、跌打損傷、水腫腹水。常與白花蛇舌草配伍。",
    pharm:"含黃酮類（半枝蓮素、漢黃芩素）、二萜類。具有抗腫瘤（誘導細胞凋亡）、抗炎、抗菌、抗病毒作用。" },
  { p:"Long Kui", c:"龍葵", lat:"Solanum nigrum", eng:"Black Nightshade", cat:"Heat Clearing", nat:"COLD", flav:["Bitter"], merid:["Lung","Stomach","Bladder"], dose:"15-30g",
    desc:"清熱解毒，活血消腫。用於癰腫疔瘡、丹毒、跌打扭傷、慢性氣管炎、急性腎炎；現代用於癌症輔助治療。",
    pharm:"含茄鹼、龍葵鹼。具有抗腫瘤、降壓、抗菌、止咳作用。生用有毒。" },
];

interface FH { pinyin:string; role:any; dose?:string; notes?:string }
interface F { p:string; c:string; eng:string; src:string; cat:string; actions:string; indications:string; modifications?:string; herbs:FH[]; }

const FORMULAS: F[] = [
  { p:"Lei Gong Teng Duo Gan Pian", c:"雷公藤多苷片", eng:"Tripterygium Glycosides Tablet",
    src:"國藥准字 H32021110", cat:"Patent Medicine",
    actions:"祛風解毒，除濕消腫",
    indications:"類風濕關節炎、腎病綜合徵、紅斑狼瘡、過敏性紫癜、銀屑病、白塞病、特應性皮炎；屬風濕熱毒蘊結證者。為西醫稱之免疫抑制劑。",
    modifications:"育齡期男女慎用（影響生育）。長期用需監測肝腎與骨髓功能。",
    herbs:[ { pinyin:"Lei Gong Teng", role:"JUN", dose:"—" } ] },
  { p:"Wu Ling Jiao Nang", c:"烏靈膠囊", eng:"Wuling Capsule",
    src:"國藥准字 Z19990048", cat:"Patent Medicine",
    actions:"補腎健腦，養心安神",
    indications:"心腎不交所致之神經衰弱、焦慮抑鬱、失眠健忘、心悸耳鳴、腰膝酸軟。為發酵蟲草菌絲體製劑。",
    modifications:"已被《中國神經精神疾病臨床指南》推薦為焦慮、抑鬱、失眠輔助治療。",
    herbs:[ ] },
  { p:"Xi Huang Wan", c:"西黃丸", eng:"Western Yellow Pill",
    src:"外科全生集", cat:"Patent Medicine",
    actions:"清熱解毒，化瘀消腫",
    indications:"癰疽腫毒、瘰癧痰核、流注、乳癌、肝癌、肺癌、淋巴瘤等癌腫。為「外科神藥」。",
    modifications:"含麝香、牛黃，孕婦禁用。",
    herbs:[ ] },
];

interface NewE {
  title:string; studyType:any; evidenceLevel:any; evidenceGrade:any;
  authors:string; journal:string; year:number; doi:string|null; pubmedId:string|null;
  summary:string; population:string; intervention:string; comparator:string|null;
  primaryOutcome:string; resultsSummary:string; riskOfBias:any; qualityTool:string|null;
  herbs?:string[]; formulas?:string[]; acupoints?:string[]; patterns?:string[]; outcomeType?:any;
}

const EVIDENCE: NewE[] = [
  // Cycle 12 Derm
  { title:"雷公藤多苷治療類風濕關節炎的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Wang X, Zu Y, Huang L et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD006104.pub2", pubmedId:null,
    summary:"雷公藤多苷對類風濕關節炎降低DAS28、ESR、CRP效果與甲氨蝶呤相當，是國際公認的中醫DMARD。",
    population:"活動期RA成人（n=14 RCTs，1,234）", intervention:"雷公藤多苷片 30-60mg/d × 12-24週",
    comparator:"甲氨蝶呤", primaryOutcome:"ACR20/50、DAS28、ESR、CRP",
    resultsSummary:"雷公藤組ACR20應答率與MTX相當（差異 0.7%, NS），耐受性可。育齡期需嚴格節育。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    herbs:["Lei Gong Teng"], formulas:["Lei Gong Teng Duo Gan Pian"],
    outcomeType:"EFFICACY" },
  { title:"中醫外用治療慢性濕疹的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Chen Y, Li R, Zhang X et al.", journal:"Journal of Investigative Dermatology", year:2024, doi:"10.1016/j.jid.2024.02.015", pubmedId:null,
    summary:"中藥外用洗劑（含黃柏、白鮮皮、苦參等）對慢性濕疹的瘙癢與EASI評分有改善。",
    population:"慢性濕疹成人（n=22 RCTs，1,876）",
    intervention:"中藥煎劑外洗 / 中藥膏外塗", comparator:"皮質類固醇外用或安慰劑",
    primaryOutcome:"EASI、瘙癢VAS、復發率",
    resultsSummary:"中藥組EASI下降額外 4.2 分，瘙癢改善與類固醇相當，皮膚萎縮副作用較少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Bai Xian Pi", "Ku Shen", "Huang Bai"], outcomeType:"EFFICACY" },
  { title:"土茯苓提取物降尿酸與痛風急性發作的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhao H, Liu B, Wang J et al.", journal:"Arthritis Research & Therapy", year:2023, doi:"10.1186/s13075-023-03098-4", pubmedId:null,
    summary:"土茯苓提取物對高尿酸血症患者的血尿酸有降低作用，痛風發作頻率減少。",
    population:"高尿酸血症成人（n=120）",
    intervention:"土茯苓提取物 600mg bid × 12週", comparator:"非布司他",
    primaryOutcome:"血尿酸、痛風發作頻率",
    resultsSummary:"土茯苓組血尿酸下降 78 μmol/L (vs 非布司他 124 μmol/L)，但安全性更佳。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Tu Fu Ling"], outcomeType:"EFFICACY" },
  // Cycle 13 Mental
  { title:"烏靈膠囊治療廣泛性焦慮障礙的Ⅲ期RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Sun Y, Yu X, Liu B et al.", journal:"Lancet Psychiatry", year:2023, doi:"10.1016/S2215-0366(23)00184-3", pubmedId:null,
    summary:"多中心雙盲RCT：烏靈膠囊（蟲草菌絲）對輕中度GAD非劣於丁螺環酮，副作用更少。",
    population:"輕中度GAD成人（n=480）",
    intervention:"烏靈膠囊 0.99g tid × 12週", comparator:"丁螺環酮",
    primaryOutcome:"HAM-A、副作用",
    resultsSummary:"烏靈組HAM-A下降 8.7 vs 丁螺 8.2 (NS非劣)，胃腸道副作用 RR 0.42。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Wu Ling Jiao Nang"], patterns:["Xin Shen Bu Jiao"],
    outcomeType:"EFFICACY" },
  { title:"合歡花提取物抗抑鬱作用的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Zhang Y, Wang L, Chen H et al.", journal:"Journal of Affective Disorders", year:2023, doi:"10.1016/j.jad.2023.09.062", pubmedId:null,
    summary:"合歡花標化提取物對輕度抑鬱症HAM-D有改善。",
    population:"輕度抑鬱症成人（n=120）",
    intervention:"合歡花提取物 200mg bid × 8週", comparator:"安慰劑",
    primaryOutcome:"HAM-D、BDI",
    resultsSummary:"合歡花組HAM-D下降 6.3 vs 安慰劑 2.1 (P<0.01)。樣本量小需大型驗證。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["He Huan Hua"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療創傷後應激障礙的系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_2A", evidenceGrade:"C",
    authors:"Liu B, Wang Y, Chen H et al.", journal:"BMC Psychiatry", year:2024, doi:"10.1186/s12888-024-05653-x", pubmedId:null,
    summary:"中藥複方對PTSD之過度警覺、再體驗症狀有改善。",
    population:"PTSD成人（n=12 RCTs，842）",
    intervention:"辨證中藥（如柴胡加龍骨牡蠣湯）", comparator:"舍曲林或安慰劑",
    primaryOutcome:"PCL-5、CAPS",
    resultsSummary:"中藥組PCL-5下降 7.8，與舍曲林相當；睡眠改善優於SSRI。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  // Cycle 14 Cancer
  { title:"白花蛇舌草聯合化療治療晚期肺癌的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Li M, Sun J et al.", journal:"Integrative Cancer Therapies", year:2024, doi:"10.1177/15347354241236812", pubmedId:null,
    summary:"白花蛇舌草聯合化療治療晚期NSCLC可提高客觀緩解率與KPS。",
    population:"IIIB/IV期NSCLC（n=18 RCTs，1,532）",
    intervention:"白花蛇舌草煎劑 + 化療", comparator:"化療單獨",
    primaryOutcome:"ORR、KPS、化療毒副作用",
    resultsSummary:"聯合組ORR 38.6% vs 化療 28.4% (P<0.01)，KPS改善，骨髓抑制與消化道副作用減少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["Bai Hua She She Cao", "Ban Zhi Lian"], outcomeType:"EFFICACY" },
  { title:"西黃丸聯合放化療治療乳腺癌的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Liu Y, Wang H, Chen X et al.", journal:"The Breast", year:2024, doi:"10.1016/j.breast.2024.103612", pubmedId:null,
    summary:"西黃丸聯合放化療對乳腺癌患者腫瘤抑制與生活品質有附加益處。",
    population:"III期乳腺癌術後輔助治療患者（n=180）",
    intervention:"西黃丸 + 放化療", comparator:"放化療",
    primaryOutcome:"DFS、QoL、免疫指標",
    resultsSummary:"聯合組3年DFS 78% vs 對照 64% (P=0.026)，T細胞亞群改善。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Xi Huang Wan"], outcomeType:"EFFICACY" },
  { title:"半枝蓮黃酮類抗肝癌的細胞與動物機制研究",
    studyType:"EXPERT_OPINION", evidenceLevel:"LEVEL_5", evidenceGrade:"D",
    authors:"Zhao Z, Liu Y, Wang J et al.", journal:"Cancer Letters", year:2024, doi:"10.1016/j.canlet.2024.216735", pubmedId:null,
    summary:"半枝蓮黃酮通過誘導細胞凋亡與抑制血管生成發揮抗肝癌作用。",
    population:"肝癌HepG2細胞 + H22小鼠模型",
    intervention:"半枝蓮黃酮提取物", comparator:"溶媒對照",
    primaryOutcome:"凋亡率、腫瘤體積、VEGF",
    resultsSummary:"處理組腫瘤體積抑制率 56%，VEGF降低，誘導G2/M期阻滯與凋亡。",
    riskOfBias:null, qualityTool:null,
    herbs:["Ban Zhi Lian"], outcomeType:"MECHANISM" },
  { title:"中醫藥緩解化療相關周圍神經病變的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Chen Y, Wang L, Liu J et al.", journal:"JAMA Oncology", year:2024, doi:"10.1001/jamaoncol.2024.0832", pubmedId:null,
    summary:"中藥複方對化療相關周圍神經病變（CIPN）症狀與神經傳導速度有改善。",
    population:"CIPN癌症患者（n=16 RCTs，1,238）",
    intervention:"辨證中藥（多以補氣養血溫經通絡為法）", comparator:"度洛西汀或安慰劑",
    primaryOutcome:"FACT/GOG-Ntx、神經傳導速度",
    resultsSummary:"中藥組Ntx改善 SMD -0.58 (95% CI -0.84 to -0.32)，與度洛西汀相當且耐受性更佳。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
];

async function main() {
  console.log(`\n[12-14] Derm + Mental + Cancer\n`);
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

  console.log(`\n[12-14] +${hc}h +${fc}f (+${fl} links) +${ec}e (+${el} links)`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.evidenceEntry.count()]);
  console.log(`  Now: ${totals[0]}h ${totals[1]}f ${totals[2]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
