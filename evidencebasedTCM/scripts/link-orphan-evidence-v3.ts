/**
 * Pass 3: maximally permissive condition→pattern linking.
 *
 *  - Aliases map a Chinese/English keyword to a list of westernName substrings.
 *  - Look up conditions whose westernName contains any of those substrings.
 *  - Aggregate primary patterns from those conditions.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// keyword → list of westernName substrings that signal the same condition family
const aliasMap: { keyword: string; matchesWestern: string[] }[] = [
  // Mental health & sleep
  { keyword: "失眠", matchesWestern: ["Insomnia"] },
  { keyword: "睡眠障礙", matchesWestern: ["Insomnia", "Sleep"] },
  { keyword: "睡眠呼吸暫停", matchesWestern: ["Sleep Apnea"] },
  { keyword: "OSA", matchesWestern: ["Sleep Apnea"] },
  { keyword: "焦慮", matchesWestern: ["Anxiety"] },
  { keyword: "GAD", matchesWestern: ["Anxiety"] },
  { keyword: "抑鬱", matchesWestern: ["Depress"] },
  { keyword: "抑郁", matchesWestern: ["Depress"] },
  { keyword: "depression", matchesWestern: ["Depress"] },
  { keyword: "強迫症", matchesWestern: ["Obsessive"] },
  { keyword: "OCD", matchesWestern: ["Obsessive"] },
  { keyword: "雙相", matchesWestern: ["Bipolar"] },
  { keyword: "Tourette", matchesWestern: ["Tourette", "Tic"] },
  { keyword: "抽動", matchesWestern: ["Tic"] },
  { keyword: "物質使用", matchesWestern: ["Substance", "Addict"] },
  { keyword: "戒斷", matchesWestern: ["Substance", "Addict"] },

  // Pain & musculoskeletal
  { keyword: "下背痛", matchesWestern: ["Low Back", "Back Pain"] },
  { keyword: "腰背痛", matchesWestern: ["Low Back", "Back Pain"] },
  { keyword: "腰痛", matchesWestern: ["Low Back", "Back Pain"] },
  { keyword: "頸椎", matchesWestern: ["Cervical Spondyl", "Neck"] },
  { keyword: "膝骨關節炎", matchesWestern: ["Knee Osteoarthritis"] },
  { keyword: "骨關節炎", matchesWestern: ["Osteoarthritis"] },
  { keyword: "類風濕", matchesWestern: ["Rheumatoid"] },
  { keyword: "纖維肌痛", matchesWestern: ["Fibromyalgia"] },
  { keyword: "椎間盤", matchesWestern: ["Disc", "Sciatica"] },
  { keyword: "椎體壓縮", matchesWestern: ["Vertebral", "Compression"] },
  { keyword: "脊柱側彎", matchesWestern: ["Scoliosis", "Spine"] },
  { keyword: "踝關節", matchesWestern: ["Ankle"] },
  { keyword: "足踝", matchesWestern: ["Ankle"] },
  { keyword: "幻肢痛", matchesWestern: ["Phantom"] },
  { keyword: "CRPS", matchesWestern: ["Complex Regional"] },
  { keyword: "複雜性區域", matchesWestern: ["Complex Regional"] },
  { keyword: "慢性疼痛", matchesWestern: ["Chronic Pain"] },
  { keyword: "骨質疏鬆", matchesWestern: ["Osteoporosis"] },
  { keyword: "肌少症", matchesWestern: ["Sarcopenia"] },
  { keyword: "衰弱", matchesWestern: ["Frailty"] },
  { keyword: "跌倒", matchesWestern: ["Fall"] },
  { keyword: "腰椎間盤突出", matchesWestern: ["Disc"] },

  // Headache
  { keyword: "偏頭痛", matchesWestern: ["Migraine"] },
  { keyword: "緊張性頭痛", matchesWestern: ["Tension Headache"] },
  { keyword: "緊張型頭痛", matchesWestern: ["Tension Headache"] },
  { keyword: "叢集性頭痛", matchesWestern: ["Cluster Headache"] },
  { keyword: "頭痛", matchesWestern: ["Headache"] },

  // Neuro
  { keyword: "中風", matchesWestern: ["Stroke", "Cerebrovascular"] },
  { keyword: "腦卒中", matchesWestern: ["Stroke"] },
  { keyword: "認知障礙", matchesWestern: ["Cognitive", "Dementia", "Alzheimer"] },
  { keyword: "MCI", matchesWestern: ["Cognitive Impairment"] },
  { keyword: "失智", matchesWestern: ["Dementia", "Alzheimer"] },
  { keyword: "癡呆", matchesWestern: ["Dementia", "Alzheimer"] },
  { keyword: "阿茲海默", matchesWestern: ["Alzheimer"] },
  { keyword: "帕金森", matchesWestern: ["Parkinson"] },
  { keyword: "周圍神經病變", matchesWestern: ["Neuropathy"] },
  { keyword: "CIPN", matchesWestern: ["Neuropathy"] },

  // Cardio
  { keyword: "高血壓", matchesWestern: ["Hypertension"] },
  { keyword: "難治性高血壓", matchesWestern: ["Refractory Hypertension"] },
  { keyword: "POTS", matchesWestern: ["Postural Orthostatic", "POTS"] },
  { keyword: "體位性心動過速", matchesWestern: ["Postural Orthostatic"] },
  { keyword: "心力衰竭", matchesWestern: ["Heart Failure"] },
  { keyword: "心衰", matchesWestern: ["Heart Failure"] },
  { keyword: "冠心病", matchesWestern: ["Coronary"] },
  { keyword: "心律失常", matchesWestern: ["Arrhythmia"] },

  // Endocrine
  { keyword: "糖尿病", matchesWestern: ["Diabetes"] },
  { keyword: "T2DM", matchesWestern: ["Type 2 Diabetes"] },
  { keyword: "甲狀腺", matchesWestern: ["Thyroid"] },
  { keyword: "代謝症候群", matchesWestern: ["Metabolic Syndrome"] },

  // GI / Hepatic
  { keyword: "消化不良", matchesWestern: ["Dyspepsia"] },
  { keyword: "腸躁症", matchesWestern: ["Irritable Bowel"] },
  { keyword: "IBS", matchesWestern: ["Irritable Bowel"] },
  { keyword: "便秘", matchesWestern: ["Constipation"] },
  { keyword: "胃食道逆流", matchesWestern: ["Gastroesophageal", "GERD"] },
  { keyword: "胃食管反流", matchesWestern: ["Gastroesophageal", "GERD"] },
  { keyword: "克羅恩", matchesWestern: ["Crohn"] },
  { keyword: "潰瘍性結腸炎", matchesWestern: ["Ulcerative Colitis"] },
  { keyword: "非酒精性脂肪肝", matchesWestern: ["Fatty Liver", "Steatosis"] },
  { keyword: "NAFLD", matchesWestern: ["Fatty Liver", "Steatosis"] },
  { keyword: "脂肪肝", matchesWestern: ["Fatty Liver", "Steatosis"] },
  { keyword: "乙肝", matchesWestern: ["Hepatitis B"] },
  { keyword: "乙型肝炎", matchesWestern: ["Hepatitis B"] },
  { keyword: "肝硬化", matchesWestern: ["Cirrhosis"] },
  { keyword: "肝細胞癌", matchesWestern: ["Hepatocellular"] },
  { keyword: "腸絞痛", matchesWestern: ["Colic"] },

  // Respiratory
  { keyword: "哮喘", matchesWestern: ["Asthma"] },
  { keyword: "氣喘", matchesWestern: ["Asthma"] },
  { keyword: "COPD", matchesWestern: ["Pulmonary Disease", "COPD"] },
  { keyword: "慢阻肺", matchesWestern: ["Pulmonary Disease", "COPD"] },
  { keyword: "支原體肺炎", matchesWestern: ["Pneumonia", "Mycoplasma"] },
  { keyword: "肺炎", matchesWestern: ["Pneumonia"] },
  { keyword: "肺纖維化", matchesWestern: ["Pulmonary Fibrosis"] },
  { keyword: "新冠", matchesWestern: ["COVID"] },
  { keyword: "Omicron", matchesWestern: ["COVID"] },
  { keyword: "過敏性鼻炎", matchesWestern: ["Allergic Rhinitis"] },
  { keyword: "鼻炎", matchesWestern: ["Rhinitis"] },

  // Dermatology
  { keyword: "異位性皮膚炎", matchesWestern: ["Atopic Dermatitis"] },
  { keyword: "特應性皮炎", matchesWestern: ["Atopic Dermatitis"] },
  { keyword: "濕疹", matchesWestern: ["Eczema", "Atopic"] },
  { keyword: "牛皮癬", matchesWestern: ["Psoriasis"] },
  { keyword: "銀屑病", matchesWestern: ["Psoriasis"] },
  { keyword: "蕁麻疹", matchesWestern: ["Urticaria"] },
  { keyword: "痤瘡", matchesWestern: ["Acne"] },
  { keyword: "斑禿", matchesWestern: ["Alopecia"] },
  { keyword: "白癜風", matchesWestern: ["Vitiligo"] },
  { keyword: "口腔扁平苔蘚", matchesWestern: ["Lichen"] },
  { keyword: "OLP", matchesWestern: ["Lichen"] },

  // Reproductive / Women
  { keyword: "PCOS", matchesWestern: ["Polycystic Ovary"] },
  { keyword: "多囊卵巢", matchesWestern: ["Polycystic Ovary"] },
  { keyword: "子宮內膜異位", matchesWestern: ["Endometriosis"] },
  { keyword: "痛經", matchesWestern: ["Dysmenorrhea"] },
  { keyword: "更年期", matchesWestern: ["Menopause", "Perimenopause"] },
  { keyword: "圍絕經期", matchesWestern: ["Menopause", "Perimenopause"] },
  { keyword: "潮熱", matchesWestern: ["Menopause", "Hot"] },
  { keyword: "不孕", matchesWestern: ["Infertility"] },
  { keyword: "盆腔疼痛", matchesWestern: ["Pelvic Pain"] },
  { keyword: "CPP", matchesWestern: ["Pelvic Pain"] },

  // Cancer
  { keyword: "癌症相關疲勞", matchesWestern: ["Cancer Related Fatigue", "Cancer Fatigue"] },
  { keyword: "CRF", matchesWestern: ["Cancer Related Fatigue", "Cancer Fatigue"] },
  { keyword: "乳腺癌", matchesWestern: ["Breast Cancer"] },
  { keyword: "肺癌", matchesWestern: ["Lung Cancer"] },
  { keyword: "結直腸癌", matchesWestern: ["Colorectal"] },
  { keyword: "大腸癌", matchesWestern: ["Colorectal"] },
  { keyword: "白血病", matchesWestern: ["Leukemia"] },
  { keyword: "白血球減少", matchesWestern: ["Leukopenia"] },
  { keyword: "化療相關認知障礙", matchesWestern: ["Cognitive"] },
  { keyword: "化療相關周圍神經病變", matchesWestern: ["Neuropathy"] },

  // Renal / Urology
  { keyword: "腎病綜合徵", matchesWestern: ["Nephrotic"] },
  { keyword: "IgA腎病", matchesWestern: ["IgA Nephropathy", "Nephropathy"] },
  { keyword: "前列腺增生", matchesWestern: ["Prostatic Hyperplasia", "BPH"] },
  { keyword: "膀胱過動", matchesWestern: ["Overactive Bladder"] },

  // Eye / ENT
  { keyword: "青光眼", matchesWestern: ["Glaucoma"] },
  { keyword: "POAG", matchesWestern: ["Glaucoma"] },
  { keyword: "乾眼", matchesWestern: ["Dry Eye"] },
  { keyword: "耳鳴", matchesWestern: ["Tinnitus"] },

  // Misc
  { keyword: "慢性疲勞", matchesWestern: ["Chronic Fatigue", "CFS"] },
  { keyword: "CFS", matchesWestern: ["Chronic Fatigue"] },
  { keyword: "妊娠", matchesWestern: ["Pregnancy", "Gestational"] },
  { keyword: "產後", matchesWestern: ["Postpartum"] },

  // Final-pass targeted aliases
  { keyword: "支原體肺炎", matchesWestern: ["Pneumonia", "Mycoplasma", "Bronch"] },
  { keyword: "踝關節扭傷", matchesWestern: ["Ankle", "Sprain"] },
  { keyword: "踝扭傷", matchesWestern: ["Ankle", "Sprain"] },
  { keyword: "脊柱側彎", matchesWestern: ["Scoliosis", "Spine", "Spinal"] },
  { keyword: "脊柱側凸", matchesWestern: ["Scoliosis", "Spine", "Spinal"] },
  { keyword: "急性早幼粒", matchesWestern: ["Leukemia", "Promyelocytic"] },
  { keyword: "慢性腎臟病", matchesWestern: ["Chronic Kidney", "Renal"] },
  { keyword: "CKD", matchesWestern: ["Chronic Kidney", "Renal"] },
  { keyword: "慢性腎病", matchesWestern: ["Chronic Kidney", "Renal", "Nephritis", "Nephropathy"] },
  { keyword: "腎炎", matchesWestern: ["Nephritis", "Nephropathy"] },
  { keyword: "心房顫動", matchesWestern: ["Atrial", "Arrhythmia"] },
  { keyword: "房顫", matchesWestern: ["Atrial", "Arrhythmia"] },
  { keyword: "慢性鼻竇炎", matchesWestern: ["Sinusitis", "Rhinitis"] },
  { keyword: "鼻竇炎", matchesWestern: ["Sinusitis", "Rhinitis"] },
  { keyword: "鼻息肉", matchesWestern: ["Polyp", "Sinusitis"] },
  { keyword: "牙周炎", matchesWestern: ["Periodonti", "Gingivitis"] },
  { keyword: "肛裂", matchesWestern: ["Fissure", "Hemorrhoid", "Constipation"] },
  { keyword: "痔瘡", matchesWestern: ["Hemorrhoid"] },
  { keyword: "膀胱過動", matchesWestern: ["Overactive Bladder", "OAB", "Bladder"] },
  { keyword: "慢性宮頸炎", matchesWestern: ["Cervic", "Pelvic"] },
  { keyword: "宮頸炎", matchesWestern: ["Cervic", "Pelvic"] },
  { keyword: "慢性盆腔炎", matchesWestern: ["Pelvic", "PID"] },
  { keyword: "盆腔炎", matchesWestern: ["Pelvic", "PID"] },
  { keyword: "多動症", matchesWestern: ["Attention Deficit", "ADHD", "Hyperactivity"] },
  { keyword: "ADHD", matchesWestern: ["Attention Deficit", "ADHD", "Hyperactivity"] },
  { keyword: "多發性骨髓瘤", matchesWestern: ["Myeloma"] },
  { keyword: "白血病", matchesWestern: ["Leukemia"] },
  { keyword: "白血球減少", matchesWestern: ["Leukopenia", "Cytopenia"] },
  { keyword: "視網膜色素變性", matchesWestern: ["Retinitis", "Retinal"] },
  { keyword: "帶狀皰疹後遺神經痛", matchesWestern: ["Postherpetic", "Herpes", "Neuralgia"] },
  { keyword: "帶狀皰疹", matchesWestern: ["Herpes", "Postherpetic"] },
  { keyword: "後遺神經痛", matchesWestern: ["Postherpetic", "Neuralgia"] },
  { keyword: "神經痛", matchesWestern: ["Neuralgia"] },
  { keyword: "網球肘", matchesWestern: ["Epicondyl", "Elbow", "Tennis"] },
  { keyword: "扳機指", matchesWestern: ["Trigger Finger", "Tenosynovitis"] },
  { keyword: "腱鞘炎", matchesWestern: ["Tenosynovitis", "Trigger"] },
  { keyword: "乳腺炎", matchesWestern: ["Mastitis", "Breast"] },
  { keyword: "功能性腹痛", matchesWestern: ["Abdominal Pain", "Functional"] },
  { keyword: "腹痛", matchesWestern: ["Abdominal", "Functional Dyspepsia"] },
  { keyword: "亞健康", matchesWestern: ["Subhealth", "Sub-health"] },
  { keyword: "體質", matchesWestern: ["Constitution", "Subhealth"] },
  { keyword: "氣鬱", matchesWestern: ["Depress", "Anxiety", "Stagnation"] },
  { keyword: "化療", matchesWestern: ["Chemotherapy", "Cancer"] },
  { keyword: "癌症", matchesWestern: ["Cancer", "Tumor", "Carcinoma"] },
  { keyword: "腫瘤", matchesWestern: ["Cancer", "Tumor", "Carcinoma"] },
  { keyword: "免疫", matchesWestern: ["Immune", "Autoimmune"] },
  { keyword: "認知", matchesWestern: ["Cognitive", "Dementia"] },
  { keyword: "老年", matchesWestern: ["Aging", "Geriatric", "Frailty"] },
  { keyword: "兒童", matchesWestern: ["Pediatric", "Childhood"] },
  { keyword: "小兒", matchesWestern: ["Pediatric", "Childhood"] },
  { keyword: "嬰幼兒", matchesWestern: ["Infant", "Pediatric"] },
];

async function main() {
  console.log("Loading conditions and pattern mappings…");
  const conditions = await prisma.conditionMapping.findMany({
    select: {
      id: true, westernName: true,
      patternMappings: {
        where: { frequency: { in: ["COMMON", "OCCASIONAL"] } },
        select: { patternId: true },
      },
    },
  });

  // Build keyword → set of pattern IDs
  type AliasResolved = { keyword: string; patternIds: Set<string> };
  const resolved: AliasResolved[] = [];
  for (const a of aliasMap) {
    const matchedConditions = conditions.filter((c) =>
      a.matchesWestern.some((sub) => c.westernName.toLowerCase().includes(sub.toLowerCase()))
    );
    if (matchedConditions.length === 0) continue;
    const patternIds = new Set<string>();
    for (const c of matchedConditions) for (const p of c.patternMappings) patternIds.add(p.patternId);
    if (patternIds.size === 0) continue;
    resolved.push({ keyword: a.keyword, patternIds });
  }
  // Sort by keyword length desc — prefer most-specific match first
  resolved.sort((a, b) => b.keyword.length - a.keyword.length);
  console.log(`Resolved ${resolved.length}/${aliasMap.length} keyword aliases.`);

  const orphans = await prisma.evidenceEntry.findMany({
    where: { AND: [
      { herbLinks: { none: {} } }, { formulaLinks: { none: {} } },
      { acupointLinks: { none: {} } }, { patternLinks: { none: {} } },
    ] },
    select: { id: true, title: true, intervention: true, summary: true, primaryOutcome: true, population: true },
  });
  console.log(`\nProcessing ${orphans.length} remaining orphan evidence entries.\n`);

  let linkedEv = 0;
  let totalLinks = 0;
  const stillOrphan: string[] = [];

  for (const e of orphans) {
    const text = [e.title, e.intervention, e.summary, e.primaryOutcome, e.population].filter(Boolean).join(" ");
    const textLower = text.toLowerCase();
    const patternIds = new Set<string>();

    for (const r of resolved) {
      // Case-insensitive match for ASCII keywords; Chinese keywords match as-is
      const kwLower = r.keyword.toLowerCase();
      if (textLower.includes(kwLower)) {
        for (const pid of r.patternIds) patternIds.add(pid);
      }
    }

    const capped = Array.from(patternIds).slice(0, 4);
    if (capped.length === 0) { stillOrphan.push(e.title); continue; }

    let added = 0;
    for (const patternId of capped) {
      try {
        await prisma.evidencePatternLink.create({ data: { evidenceId: e.id, patternId, outcomeType: "EFFICACY", effectDirection: "POSITIVE" } });
        added++;
      } catch {}
    }
    if (added > 0) { linkedEv++; totalLinks += added; }
  }

  console.log(`[result] Linked ${linkedEv} more evidence entries to ${totalLinks} pattern links.`);
  console.log(`[remaining] ${stillOrphan.length} entries still without any link:`);
  for (const t of stillOrphan) console.log(`  - ${t}`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
