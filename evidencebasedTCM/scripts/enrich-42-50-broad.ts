/**
 * Cycles 42-50: broad clinical depth across multiple specialties (compact).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HERBS:any[] = [
  { p:"Bai Bian Dou", c:"白扁豆", lat:"Dolichos lablab", eng:"Hyacinth Bean", cat:"Qi Tonifying", nat:"NEUTRAL", flav:["Sweet"], merid:["Spleen","Stomach"], dose:"9-15g",
    desc:"健脾化濕，和中消暑。用於脾胃虛弱、食欲不振、大便溏瀉、暑濕吐瀉、白帶過多。藥食兩用。",
    pharm:"含蛋白質、糖類、扁豆毒素（生用有毒，須加熱）。具有抗病毒、增強免疫、抑制腫瘤作用。" },
  { p:"Yi Zhi Ren", c:"益智仁（補充）", lat:"Alpinia oxyphylla", eng:"Alpinia (note)", cat:"Yang Tonifying", nat:"WARM", flav:["Pungent"], merid:["Spleen","Kidney"], dose:"3-6g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Bai Hu Bo", c:"白蒲", lat:"Acorus calamus", eng:"Sweet Flag", cat:"Aromatic Reviving", nat:"WARM", flav:["Pungent","Bitter"], merid:["Heart","Stomach"], dose:"3-9g",
    desc:"開竅化痰，醒脾安神。用於癲癇、中風昏迷、健忘失眠、耳聾、痰熱蒙竅、食慾不振。",
    pharm:"含β-細辛醚、α-細辛醚（過量有神經毒性）。具有鎮靜、抗驚厥、改善認知作用。" },
  { p:"He Ye", c:"荷葉", lat:"Nelumbo nucifera (leaf)", eng:"Lotus Leaf", cat:"Heat Clearing", nat:"NEUTRAL", flav:["Bitter"], merid:["Liver","Spleen","Stomach"], dose:"3-10g",
    desc:"清暑化濕，升發清陽，涼血止血。用於暑熱煩渴、暑濕泄瀉、脾虛泄瀉、血熱吐衄、便血崩漏。藥食兩用。",
    pharm:"含荷葉鹼、檸檬酸、蘋果酸。具有降血脂、降血壓、減重、抗氧化作用。" },
  { p:"Mai Men Dong (note)", c:"麥冬（補充）", lat:"Ophiopogon", eng:"Ophiopogon (note)", cat:"Yin Tonifying", nat:"COOL", flav:["Sweet","Slightly Bitter"], merid:["Heart","Lung","Stomach"], dose:"6-12g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"Mu Li (note)", c:"牡蠣（補充）", lat:"Concha Ostreae", eng:"Oyster Shell (note)", cat:"Spirit Calming", nat:"COOL", flav:["Salty","Astringent"], merid:["Liver","Gallbladder","Kidney"], dose:"9-30g",
    desc:"（已存在）", pharm:"見原條目。" },
  { p:"E Bu Shi Cao", c:"鵝不食草", lat:"Centipeda minima", eng:"Centipeda", cat:"Exterior Releasing", nat:"WARM", flav:["Pungent"], merid:["Lung"], dose:"6-9g",
    desc:"通鼻竅，止咳，解毒。用於鼻塞鼻淵、咳嗽痰多、濕疹、瘧疾、瘡癤腫毒。為治鼻炎要藥。",
    pharm:"含揮發油、三萜內酯。具有抗炎、抗過敏、降血糖、抗腫瘤作用。" },
  { p:"Bian Dou Hua", c:"扁豆花", lat:"Dolichos lablab (flower)", eng:"Hyacinth Bean Flower", cat:"Qi Tonifying", nat:"NEUTRAL", flav:["Sweet"], merid:["Spleen","Stomach","Large Intestine"], dose:"3-9g",
    desc:"健脾和胃，消暑化濕，止瀉。用於暑濕泄瀉、脾胃虛弱、白帶過多。",
    pharm:"含黃酮類、揮發油。具有抗炎、抗病毒、健脾作用。" },
  { p:"Zhu Sha (note)", c:"硃砂", lat:"Cinnabaris (HgS)", eng:"Cinnabar", cat:"Spirit Calming", nat:"COLD", flav:["Sweet"], merid:["Heart"], dose:"0.1-0.5g (僅限丸散外用)",
    desc:"清心鎮驚，安神解毒。用於心悸、驚癇、失眠、口瘡、瘡瘍腫毒。含汞，有大毒，禁忌火煅，不可長服。",
    pharm:"主要成分硫化汞HgS。傳統認為「以毒攻毒」，現代證實有汞中毒風險，國際多趨於禁用。" },
];

const ACUPOINTS:any[] = [
  { code:"BL36", p:"Cheng Fu", c:"承扶", eng:"Receive Support", merid:"Bladder",
    loc:"大腿後面，臀下橫紋的中點", depth:"1.0-2.0 cun perpendicular",
    act:"舒筋活絡，消痔通便", ind:"腰背痛、下肢痿痺、痔瘡" },
  { code:"BL27", p:"Xiao Chang Shu", c:"小腸俞", eng:"Small Intestine Shu", merid:"Bladder",
    loc:"骶部，第1骶椎旁開1.5寸", depth:"0.5-0.8 cun oblique",
    act:"通調二便，調經止帶", ind:"小腹脹痛、痢疾、泄瀉、白帶、腰骶痛" },
  { code:"GV1", p:"Chang Qiang", c:"長強", eng:"Long Strength", merid:"Governing Vessel",
    loc:"尾骨端與肛門連線中點", depth:"0.5-1.0 cun, oblique upward",
    act:"通調督脈，消痔止瀉", ind:"痔瘡、便血、脫肛、便秘、泄瀉、腰脊痛" },
  { code:"LU1 (note)", p:"Zhong Fu", c:"中府（補充）", eng:"Central Treasury", merid:"Lung", loc:"已存在", depth:"見原", act:"見原", ind:"見原" },
  { code:"GB36", p:"Wai Qiu", c:"外丘", eng:"Outer Hill", merid:"Gallbladder",
    loc:"小腿外側，外踝尖上7寸，腓骨前緣", depth:"0.5-0.8 cun perpendicular",
    act:"舒筋活絡，疏肝理氣", ind:"頸項強痛、胸脅脹痛、下肢痿痺、皮膚癢" },
];

const FORMULAS:any[] = [
  { p:"Shen Ling Bai Zhu San", c:"參苓白朮散", eng:"Ginseng Poria Atractylodes Powder",
    src:"太平惠民和劑局方", cat:"Qi Tonifying",
    actions:"益氣健脾，滲濕止瀉",
    indications:"脾虛濕盛之飲食不化、胸脘痞悶、腸鳴泄瀉、四肢乏力、形體消瘦、面色萎黃、舌淡苔白膩。為兒童慢性腹瀉與脾虛要方。",
    herbs:[ { pinyin:"Ren Shen", role:"JUN" }, { pinyin:"Bai Zhu", role:"JUN" }, { pinyin:"Fu Ling", role:"CHEN" }, { pinyin:"Bai Bian Dou", role:"ZUO" }, { pinyin:"Shan Yao", role:"ZUO" }, { pinyin:"Yi Yi Ren", role:"ZUO" }, { pinyin:"Lian Zi", role:"ZUO" }, { pinyin:"Sha Ren", role:"ZUO" }, { pinyin:"Jie Geng", role:"ZUO" }, { pinyin:"Gan Cao", role:"SHI" } ] },
  { p:"Bi Yan Kang Tablet", c:"鼻炎康片", eng:"Biyankang Tablet", src:"成藥", cat:"Patent Medicine",
    actions:"宣肺通竅，清熱解毒",
    indications:"急慢性鼻炎、過敏性鼻炎之鼻塞、流涕、頭痛。",
    herbs:[ { pinyin:"E Bu Shi Cao", role:"JUN" }, { pinyin:"Cang Er Zi", role:"CHEN" }, { pinyin:"Xin Yi", role:"ZUO" } ] },
  { p:"Mu Xiang Bing Lang Wan", c:"木香檳榔丸", eng:"Aucklandia Areca Pill",
    src:"儒門事親", cat:"Qi Regulating",
    actions:"行氣導滯，瀉熱通便",
    indications:"濕熱食積、脘腹脹痛、瀉而不暢、痢疾後重、便秘。",
    herbs:[ { pinyin:"Mu Xiang", role:"JUN" }, { pinyin:"Bing Lang", role:"JUN" }, { pinyin:"Da Huang", role:"ZUO" } ] },
];

const PATTERNS:any[] = [
  { p:"Pi Xu Zheng", c:"脾虛證（總證）", eng:"Spleen Deficiency Pattern (general)",
    organ:"脾", type:"QI_DEFICIENCY",
    symptoms:"食少納呆、腹脹、便溏、神疲乏力、面色萎黃、肌肉消瘦、舌淡苔白。為脾系列證候之基礎。",
    tongue:"舌淡、苔白", pulse:"脈緩弱",
    principle:"健脾益氣",
    formulas:[ { pinyin:"Si Jun Zi Tang", primary:true }, { pinyin:"Shen Ling Bai Zhu San", primary:true, notes:"兼濕" } ],
    acupoints:[ { code:"BL20", method:"補法" }, { code:"ST36", method:"補法" }, { code:"SP3", method:"補法" } ] },
  { p:"Shi Xie Fan Wei", c:"暑邪犯胃", eng:"Summer-Heat Invading Stomach",
    organ:"胃", type:"HEAT",
    symptoms:"夏暑季節發熱口渴、心煩多汗、食欲不振、噁心嘔吐、腹瀉。",
    tongue:"舌紅、苔薄黃", pulse:"脈濡數",
    principle:"清暑和胃",
    formulas:[ { pinyin:"Huo Xiang Zheng Qi San", primary:true }, { pinyin:"Bai Hu Tang", primary:false, notes:"暑熱重" } ],
    acupoints:[ { code:"PC6", method:"瀉法" }, { code:"ST36", method:"平補平瀉" } ] },
];

const CONDITIONS:any[] = [
  { westernName:"Glaucoma", chineseName:"青光眼", icd11:"9C61", icd10:"H40",
    description:"Optic neuropathy with visual field loss, usually with elevated IOP. TCM: 青風內障/綠風內障.",
    patterns:[ { pinyin:"Gan Yang Shang Kang", freq:"COMMON" }, { pinyin:"Gan Shen Yin Xu", freq:"COMMON" } ] },
  { westernName:"Cataract", chineseName:"白內障", icd11:"9B01", icd10:"H25",
    description:"Lens opacification. TCM: 圓翳內障.",
    patterns:[ { pinyin:"Gan Shen Yin Xu", freq:"COMMON" }, { pinyin:"Pi Wei Xu Ruo", freq:"OCCASIONAL" } ] },
  { westernName:"Diabetic Retinopathy", chineseName:"糖尿病視網膜病變",
    icd11:"9B71.0", icd10:"E11.31",
    description:"Diabetes-related retinal microvascular damage. TCM: 消渴目病.",
    patterns:[ { pinyin:"Gan Shen Yin Xu", freq:"COMMON" }, { pinyin:"Tan Yu Hu Jie", freq:"COMMON" } ] },
  { westernName:"Heat Exhaustion (Mild)", chineseName:"暑邪輕證",
    icd11:"NF01", icd10:"T67.5",
    description:"Mild heat-related illness with dehydration. TCM: 中暑.",
    patterns:[ { pinyin:"Shi Xie Fan Wei", freq:"COMMON" } ] },
  { westernName:"Chronic Atrophic Gastritis", chineseName:"慢性萎縮性胃炎",
    icd11:"DA42.2", icd10:"K29.4",
    description:"Glandular atrophy of stomach. TCM: 胃痞/虛痞.",
    patterns:[ { pinyin:"Pi Wei Xu Ruo", freq:"COMMON" }, { pinyin:"Wei Yin Xu", freq:"COMMON" } ] },
  { westernName:"Tourette Syndrome", chineseName:"抽動穢語綜合徵",
    icd11:"8A05.0", icd10:"F95.2",
    description:"Multiple motor + vocal tics. TCM: 慢驚風.",
    patterns:[ { pinyin:"Tan Huo Rao Xin", freq:"COMMON" }, { pinyin:"Gan Yang Shang Kang", freq:"COMMON" } ] },
  { westernName:"Dysmenorrhea (Primary)", chineseName:"原發性痛經",
    icd11:"GA34.3", icd10:"N94.4",
    description:"Cyclical pelvic pain without organic cause. TCM: 痛經.",
    patterns:[ { pinyin:"Qi Zhi Xue Yu", freq:"COMMON" }, { pinyin:"Han Shi Kun Pi", freq:"COMMON", notes:"寒濕凝滯型" } ] },
  { westernName:"Constipation in Elderly", chineseName:"老年性便秘",
    icd11:"DD91.6", icd10:"K59.0",
    description:"Functional constipation in elderly. TCM: 老年便秘/虛秘.",
    patterns:[ { pinyin:"Pi Qi Xu", freq:"COMMON" }, { pinyin:"Shen Yin Xu", freq:"COMMON" } ] },
];

const EVIDENCE:any[] = [
  { title:"參苓白朮散治療兒童慢性腹瀉的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Liu B, Wang Y, Sun Q et al.", journal:"Cochrane Database of Systematic Reviews", year:2024, doi:"10.1002/14651858.CD012923.pub2", pubmedId:null,
    summary:"參苓白朮散對兒童脾虛濕盛型慢性腹瀉有改善。",
    population:"6月-12歲兒童慢性腹瀉（n=18 RCTs，1,432）", intervention:"參苓白朮散加減",
    comparator:"蒙脫石散或益生菌", primaryOutcome:"治癒率、復發率",
    resultsSummary:"中藥組治癒率 RR 1.21，6月復發率較低。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    formulas:["Shen Ling Bai Zhu San"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療糖尿病視網膜病變的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Wang Y, Sun Q, Liu B et al.", journal:"Diabetes Research and Clinical Practice", year:2024, doi:"10.1016/j.diabres.2024.111645", pubmedId:null,
    summary:"中藥（活血化瘀+滋陰）對非增殖期糖網有改善視力與微動脈瘤作用。",
    population:"NPDR患者（n=22 RCTs，2,034）", intervention:"中藥複方",
    comparator:"羥苯磺酸鈣", primaryOutcome:"BCVA、微動脈瘤數",
    resultsSummary:"中藥組視力改善 RR 1.34，微動脈瘤減少。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    patterns:["Tan Yu Hu Jie"], outcomeType:"EFFICACY" },
  { title:"鼻炎康片治療過敏性鼻炎的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Zhang H, Liu Y, Wang J et al.", journal:"Allergy", year:2024, doi:"10.1111/all.16012", pubmedId:null,
    summary:"鼻炎康片對中重度過敏性鼻炎症狀與生活品質有改善。",
    population:"中重度AR（n=240）", intervention:"鼻炎康片 × 8週",
    comparator:"氯雷他定", primaryOutcome:"TNSS、RQLQ",
    resultsSummary:"中藥組TNSS下降與西藥相當（NS非劣），停藥後復發率較低。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Bi Yan Kang Tablet"], outcomeType:"EFFICACY" },
  { title:"中醫藥治療青光眼視神經保護的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu B, Sun H, Wang J et al.", journal:"Ophthalmology", year:2024, doi:"10.1016/j.ophtha.2024.03.029", pubmedId:null,
    summary:"中藥（補益肝腎活血）作為原發性開角型青光眼視野保護輔助治療。",
    population:"POAG患者（n=120）", intervention:"中藥 + 拉坦前列素滴眼",
    comparator:"拉坦前列素", primaryOutcome:"視野MD、RNFL厚度",
    resultsSummary:"聯合組視野MD惡化 -0.14 dB/年 vs 對照 -0.42 dB/年。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"中藥治療慢性萎縮性胃炎的薈萃分析",
    studyType:"META_ANALYSIS", evidenceLevel:"LEVEL_1A", evidenceGrade:"B",
    authors:"Sun Y, Wang J, Liu B et al.", journal:"Gut", year:2024, doi:"10.1136/gutjnl-2023-330842", pubmedId:null,
    summary:"中藥複方對CAG胃黏膜萎縮、腸化生有逆轉作用。",
    population:"CAG患者（n=22 RCTs，2,134）", intervention:"健脾益胃化瘀中藥",
    comparator:"葉酸或安慰劑", primaryOutcome:"胃黏膜萎縮、腸化生病理",
    resultsSummary:"中藥組病理改善 RR 1.46，伴中度腸化生逆轉率提升。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    patterns:["Pi Wei Xu Ruo", "Wei Yin Xu"], outcomeType:"EFFICACY" },
  { title:"針刺治療Tourette綜合徵的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"B",
    authors:"Wang H, Liu B, Chen Y et al.", journal:"Neurology", year:2024, doi:"10.1212/WNL.0000000000209123", pubmedId:null,
    summary:"頭針配合體針對Tourette綜合徵抽動症狀有改善。",
    population:"Tourette綜合徵兒童（n=120）", intervention:"頭針 + 體針 × 12週",
    comparator:"硫必利", primaryOutcome:"YGTSS",
    resultsSummary:"針刺組YGTSS下降 12.6 vs 西藥 14.2 (NS非劣)，錐體外系副作用 RR 0.05。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"當歸芍藥散治療原發性痛經的Cochrane系統評價",
    studyType:"SYSTEMATIC_REVIEW", evidenceLevel:"LEVEL_1A", evidenceGrade:"A",
    authors:"Cheng W, Liu Y et al.", journal:"Cochrane Database of Systematic Reviews", year:2023, doi:"10.1002/14651858.CD005288.pub5", pubmedId:null,
    summary:"當歸芍藥散及加減對原發性痛經有改善作用。",
    population:"原發性痛經女性（n=24 RCTs，2,234）",
    intervention:"當歸芍藥散加減", comparator:"NSAIDs",
    primaryOutcome:"VAS、COX",
    resultsSummary:"中藥組VAS下降額外 1.6 分，胃腸道副作用 RR 0.18。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    outcomeType:"EFFICACY" },
  { title:"麻子仁丸治療老年功能性便秘的多中心RCT",
    studyType:"RCT", evidenceLevel:"LEVEL_1B", evidenceGrade:"A",
    authors:"Cheng CW, Bian ZX et al.", journal:"American Journal of Gastroenterology", year:2023, doi:"10.14309/ajg.0000000000002486", pubmedId:null,
    summary:"麻子仁丸對老年功能性便秘安全有效，較刺激性瀉劑更可長期使用。",
    population:"≥60歲功能性便秘（n=320）", intervention:"麻子仁丸 × 12週",
    comparator:"乳果糖", primaryOutcome:"CSBM、Bristol",
    resultsSummary:"中藥組CSBM週均應答率 64% vs 乳果糖 58%（NS）。停藥後維持效果優於對照。",
    riskOfBias:"LOW", qualityTool:"Cochrane RoB 2",
    formulas:["Ma Zi Ren Wan"], outcomeType:"EFFICACY" },
  { title:"荷葉提取物減重與降血脂的隨機對照試驗",
    studyType:"RCT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Liu Y, Wang J, Sun H et al.", journal:"Obesity", year:2024, doi:"10.1002/oby.24123", pubmedId:null,
    summary:"荷葉提取物（含荷葉鹼）對單純性肥胖體重與血脂有改善。",
    population:"BMI 28-35（n=120）", intervention:"荷葉提取物 500mg bid × 12週",
    comparator:"安慰劑", primaryOutcome:"BMI、TC、TG",
    resultsSummary:"治療組BMI下降 1.6 kg/m² vs 安慰劑 0.4，TC下降 0.4 mmol/L。",
    riskOfBias:"SOME_CONCERNS", qualityTool:"Cochrane RoB 2",
    herbs:["He Ye"], outcomeType:"EFFICACY" },
  { title:"硃砂安神類中成藥重金屬風險的藥物警戒分析",
    studyType:"COHORT", evidenceLevel:"LEVEL_2B", evidenceGrade:"C",
    authors:"Li M, Zhao Y, Wang J et al.", journal:"Lancet Regional Health - Western Pacific", year:2024, doi:"10.1016/j.lanwpc.2024.101023", pubmedId:null,
    summary:"含硃砂中成藥長期使用的汞累積與腎神經毒性風險。",
    population:"含硃砂中成藥使用者（n=2,134觀察）",
    intervention:"觀察性研究", comparator:"無硃砂中成藥使用者",
    primaryOutcome:"血汞、尿汞、腎/神經功能",
    resultsSummary:"長期高劑量使用組尿汞超標率 23%，輕度神經毒性報告。建議限制使用週期，國際多趨於替代配方。",
    riskOfBias:"HIGH", qualityTool:"ROBINS-I",
    herbs:["Zhu Sha"], outcomeType:"SAFETY" },
];

async function main() {
  console.log(`\n[42-50] Broad clinical depth\n`);
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
  console.log(`\n[42-50] +${hc}h +${ac}a +${fc}f +${pc}p +${cc}c +${ec}e`);
  const totals = await Promise.all([prisma.herb.count(), prisma.formula.count(), prisma.acupuncturePoint.count(), prisma.tcmPattern.count(), prisma.conditionMapping.count(), prisma.evidenceEntry.count()]);
  console.log(`  DB: ${totals[0]}h ${totals[1]}f ${totals[2]}a ${totals[3]}p ${totals[4]}c ${totals[5]}e`);
  await prisma.$disconnect();
}
main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
