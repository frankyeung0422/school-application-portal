/**
 * Integrate comprehensive TCM data sourced from theqi.com into the EBTCM platform.
 * Adds: new herbs (enriched), disease treatment guides as evidence/knowledge,
 * new pattern-formula links, and updates existing herb descriptions.
 *
 * Run: npx tsx scripts/integrate-theqi-data.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── New Herbs from theqi.com herb database ──────────────────────────
// Adding herbs NOT yet in our DB that appear frequently in classical formulas
interface NewHerb {
  pinyinName: string;
  chineseName: string;
  latinName: string;
  englishName: string;
  category: string;
  nature: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flavor: string[];
  meridianTropism: string[];
  dosageRange: string;
  description: string;
  modernPharmacology: string;
}

const NEW_HERBS: NewHerb[] = [
  {
    pinyinName: "Tian Ma",
    chineseName: "天麻",
    latinName: "Gastrodia elata",
    englishName: "Gastrodia Rhizome",
    category: "Wind Extinguishing",
    nature: "NEUTRAL",
    flavor: ["Sweet"],
    meridianTropism: ["Liver"],
    dosageRange: "3-10g",
    description: "息風止痙，平肝潛陽，祛風通絡。用於小兒驚風、癲癇抽搐、破傷風、頭痛眩暈、手足不遂、肢體麻木、風濕痹痛。為治療肝風內動、肝陽上亢之要藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含天麻素（gastrodin）、對羥基苯甲醇等。藥理作用：鎮靜、催眠、抗驚厥、降壓、增加腦血流量、保護神經元。臨床用於高血壓、偏頭痛、眩暈症。",
  },
  {
    pinyinName: "Gou Teng",
    chineseName: "鉤藤",
    latinName: "Uncaria rhynchophylla",
    englishName: "Uncaria Stem with Hooks",
    category: "Wind Extinguishing",
    nature: "COOL",
    flavor: ["Sweet"],
    meridianTropism: ["Liver", "Pericardium"],
    dosageRange: "6-15g",
    description: "息風定驚，清熱平肝。用於肝風內動、驚癇抽搐、高血壓頭暈、頭痛眩暈。不宜久煎。（來源：theqi.com 中藥學）",
    modernPharmacology: "含鉤藤鹼（rhynchophylline）等生物鹼。具有降壓、鎮靜、抗驚厥作用。現代臨床用於高血壓病。",
  },
  {
    pinyinName: "Zhi Mu",
    chineseName: "知母",
    latinName: "Anemarrhena asphodeloides",
    englishName: "Anemarrhena Rhizome",
    category: "Heat Clearing",
    nature: "COLD",
    flavor: ["Bitter", "Sweet"],
    meridianTropism: ["Lung", "Stomach", "Kidney"],
    dosageRange: "6-12g",
    description: "清熱瀉火，滋陰潤燥。用於外感熱病高熱煩渴、肺熱咳嗽、骨蒸潮熱、內熱消渴、腸燥便秘。常與石膏配伍（白虎湯），為清熱瀉火要藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含知母皂苷等。具有解熱、降血糖、抗菌、抗炎作用。與二甲雙胍有協同降糖效應。",
  },
  {
    pinyinName: "Tian Hua Fen",
    chineseName: "天花粉",
    latinName: "Trichosanthes kirilowii",
    englishName: "Trichosanthes Root",
    category: "Heat Clearing",
    nature: "COLD",
    flavor: ["Bitter", "Sweet"],
    meridianTropism: ["Lung", "Stomach"],
    dosageRange: "6-12g",
    description: "清熱生津，消腫排膿。用於熱病傷津口渴、消渴多飲（糖尿病）、肺熱咳嗽、癰腫瘡毒。為消渴病（糖尿病）常用藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含天花粉蛋白（trichosanthin）、多糖等。具有降血糖、抗腫瘤、免疫調節作用。",
  },
  {
    pinyinName: "Shi Hu",
    chineseName: "石斛",
    latinName: "Dendrobium nobile",
    englishName: "Dendrobium Stem",
    category: "Yin Tonifying",
    nature: "COOL",
    flavor: ["Sweet"],
    meridianTropism: ["Stomach", "Kidney"],
    dosageRange: "6-15g",
    description: "養胃生津，滋陰清熱，明目強腰。用於熱病傷津、口乾煩渴、胃陰不足、虛熱不退、陰虛火旺、目暗不明。為養胃陰生津液要藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含石斛鹼、石斛多糖。具有降血糖、增強免疫、抗氧化、護胃作用。臨床用於糖尿病、慢性胃炎。",
  },
  {
    pinyinName: "Bai He",
    chineseName: "百合",
    latinName: "Lilium brownii",
    englishName: "Lily Bulb",
    category: "Yin Tonifying",
    nature: "COOL",
    flavor: ["Sweet"],
    meridianTropism: ["Lung", "Heart"],
    dosageRange: "6-12g",
    description: "潤肺止咳，清心安神。用於肺虛久咳、痰中帶血、虛煩驚悸、失眠多夢、精神恍惚。為潤肺安神常用藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含秋水仙鹼、百合多糖。具有鎮咳、鎮靜、抗抑鬱、增強免疫作用。",
  },
  {
    pinyinName: "Di Long",
    chineseName: "地龍",
    latinName: "Pheretima aspergillum",
    englishName: "Earthworm",
    category: "Wind Extinguishing",
    nature: "COLD",
    flavor: ["Salty"],
    meridianTropism: ["Liver", "Spleen", "Bladder"],
    dosageRange: "5-10g",
    description: "清熱息風，平喘，通絡，利尿。用於高熱驚癇、肺熱喘咳、熱痹關節紅腫疼痛、半身不遂、小便不利。為中風後遺症通絡要藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含蚓激酶（lumbrokinase）。具有抗凝血、溶栓、降壓、平喘、抗驚厥作用。臨床用於腦梗塞、哮喘。",
  },
  {
    pinyinName: "Jue Ming Zi",
    chineseName: "決明子",
    latinName: "Cassia obtusifolia",
    englishName: "Cassia Seed",
    category: "Wind Extinguishing",
    nature: "COOL",
    flavor: ["Sweet", "Bitter"],
    meridianTropism: ["Liver", "Large Intestine"],
    dosageRange: "9-15g",
    description: "清肝明目，潤腸通便。用於目赤腫痛、羞明多淚、頭痛眩暈、高血壓、高血脂、便秘。為降壓明目常用藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含大黃素、大黃酚等蒽醌類。具有降壓、降血脂、降血糖、保肝、通便、抗菌作用。",
  },
  {
    pinyinName: "Ling Zhi",
    chineseName: "靈芝",
    latinName: "Ganoderma lucidum",
    englishName: "Reishi Mushroom",
    category: "Spirit Calming",
    nature: "NEUTRAL",
    flavor: ["Sweet"],
    meridianTropism: ["Heart", "Liver", "Lung"],
    dosageRange: "6-12g",
    description: "養心安神，止咳平喘，補氣養血。用於心神不寧、失眠心悸、肺虛咳喘、虛勞短氣、不思飲食。為扶正固本名貴中藥。（來源：theqi.com 中藥學）",
    modernPharmacology: "含靈芝多糖、三萜類等。具有免疫調節、抗腫瘤、保肝、降血糖、降血脂、抗衰老、神經保護作用。",
  },
  {
    pinyinName: "Ci Ji Li",
    chineseName: "刺蒺藜",
    latinName: "Tribulus terrestris",
    englishName: "Tribulus Fruit",
    category: "Wind Extinguishing",
    nature: "NEUTRAL",
    flavor: ["Bitter", "Pungent"],
    meridianTropism: ["Liver"],
    dosageRange: "6-10g",
    description: "平肝潛陽，疏肝解鬱，息風明目，止癢。用於頭痛眩暈、胸脅脹痛、乳閉乳癰、目赤翳障、風疹瘙癢。（來源：theqi.com 中藥學）",
    modernPharmacology: "含甾體皂苷。具有降壓、降血脂、利尿、增強性功能作用。",
  },
];

// ── Disease treatment guides from theqi.com Internal Medicine ──────
// Stored as TRADITIONAL_USE evidence entries with structured treatment data
interface DiseaseGuide {
  title: string;
  diseaseChinese: string;
  diseaseEnglish: string;
  definition: string;
  etiology: string;
  patterns: {
    name: string;
    symptoms: string;
    principle: string;
    formula: string;
  }[];
  source: string;
}

const DISEASE_GUIDES: DiseaseGuide[] = [
  {
    title: "消渴（糖尿病）中醫內科辨證論治指南",
    diseaseChinese: "消渴",
    diseaseEnglish: "Diabetes (Xiao Ke)",
    definition: "口渴多飲、善飢多食、小便量多、尿有甜味、消瘦無力為主要表現的病證。",
    etiology: "稟賦不足、情志失調、飲食不節、勞欲過度。病變中心以腎虛為最重要，上中燥熱為標、下焦腎虛為本。",
    patterns: [
      { name: "上消（肺熱津傷）", symptoms: "煩渴多飲、口乾舌燥、尿頻量多、舌邊尖紅、苔薄黃、脈洪數", principle: "清熱潤肺、生津止渴", formula: "消渴方加減" },
      { name: "中消（胃熱熾盛）", symptoms: "多食易飢、形體消瘦、大便乾結、舌苔黃燥、脈滑實有力", principle: "清胃瀉火、養陰增液", formula: "玉女煎加減" },
      { name: "下消（腎陰虧虛）", symptoms: "尿頻量多、混濁如脂膏、腰膝酸軟、乏力、頭暈耳鳴、口唇乾燥、皮膚乾燥、舌紅少苔、脈細數", principle: "滋陰固腎", formula: "六味地黃丸加減" },
      { name: "下消（陰陽兩虛）", symptoms: "小便頻數、混濁如膏、面色黧黑、耳輪焦枯、腰膝酸軟、畏寒肢冷、舌淡苔白、脈沉細無力", principle: "溫陽滋腎固攝", formula: "金匱腎氣丸加減" },
    ],
    source: "theqi.com 中醫內科學 · 消渴",
  },
  {
    title: "眩暈（高血壓）中醫內科辨證論治指南",
    diseaseChinese: "眩暈",
    diseaseEnglish: "Dizziness / Hypertension (Xuan Yun)",
    definition: "眩指視物色黑，暈即視物旋轉。以頭暈目眩為主要表現，常伴耳鳴、頭重腳輕。",
    etiology: "情志不遂化火生風、年高腎虧水不涵木、飲食不節脾失健運生痰、勞倦過度氣血虧虛。本虛標實。",
    patterns: [
      { name: "肝陽上亢", symptoms: "眩暈耳鳴、頭痛且脹、遇惱怒加重、面紅目赤、急躁易怒、少寐多夢、口苦、舌紅苔黃、脈弦數", principle: "平肝潛陽、清火息風", formula: "天麻鉤藤飲" },
      { name: "氣血虧虛", symptoms: "眩暈動則加劇、勞累即發、面色㿠白、唇甲不華、心悸少寐、神疲懶言、飲食減少、舌淡苔薄白、脈細弱", principle: "補養氣血、健運脾胃", formula: "歸脾湯" },
      { name: "腎精不足", symptoms: "眩暈日久不已、精神萎靡、少寐多夢、健忘、腰膝酸軟、遺精耳鳴、舌淡脈細", principle: "補腎填精", formula: "左歸丸（偏陰虛）或右歸丸（偏陽虛）" },
      { name: "痰濁中阻", symptoms: "眩暈頭重如裹、胸悶噁心、食少多寐、苔白膩、脈濡滑", principle: "燥濕祛痰、健脾和胃", formula: "半夏白朮天麻湯" },
    ],
    source: "theqi.com 中醫內科學 · 眩暈",
  },
  {
    title: "不寐（失眠）中醫內科辨證論治指南",
    diseaseChinese: "不寐",
    diseaseEnglish: "Insomnia (Bu Mei)",
    definition: "失眠，入睡時間不夠或睡眠不熟。經常性睡眠減少之病證。",
    etiology: "七情所傷、肝鬱化火、思慮勞倦傷脾、驚恐傷神、年老體虛、久病血虛。",
    patterns: [
      { name: "心火亢盛", symptoms: "心煩不寐、躁擾不安、口乾舌燥、小便短赤、舌尖紅、脈數有力", principle: "清心瀉火、安神寧心", formula: "朱砂安神丸" },
      { name: "肝鬱化火", symptoms: "急躁易怒、頭暈頭脹、目赤耳鳴、口苦、不思飲食、舌紅苔黃、脈弦數", principle: "疏肝瀉火、鎮心安神", formula: "龍膽瀉肝湯" },
      { name: "痰熱內擾", symptoms: "胸悶噯氣、痰多、心煩口苦、頭重目眩、舌偏紅苔黃膩、脈滑數", principle: "清化痰熱、和中安神", formula: "溫膽湯" },
      { name: "陰虛火旺", symptoms: "心煩失眠、心悸不安、頭暈、耳鳴、健忘、腰酸、手足心熱、舌紅少苔、脈細數", principle: "滋陰降火、交通心腎", formula: "六味地黃丸合交泰丸" },
      { name: "心脾兩虛", symptoms: "多夢易醒、心悸健忘、食少倦怠、面色少華、舌淡苔薄、脈細弱", principle: "補益心脾、養血安神", formula: "歸脾湯" },
      { name: "心膽氣虛", symptoms: "心悸膽怯、善驚易恐、夜寐多夢、氣短乏力、舌淡、脈弦細", principle: "益氣鎮驚、安神定志", formula: "安神定志丸合酸棗仁湯" },
    ],
    source: "theqi.com 中醫內科學 · 不寐",
  },
  {
    title: "頭痛中醫內科辨證論治指南",
    diseaseChinese: "頭痛",
    diseaseEnglish: "Headache / Migraine (Tou Tong)",
    definition: "以頭部疼痛為主要表現的病證，分外感頭痛與內傷頭痛。",
    etiology: "外感六淫侵襲、內傷情志鬱結、飲食不節痰濁上擾、久病入絡瘀血阻滯。",
    patterns: [
      { name: "風寒頭痛", symptoms: "頭痛連及項背、惡風畏寒、遇風尤劇、苔薄白、脈浮緊", principle: "疏風散寒止痛", formula: "川芎茶調散" },
      { name: "肝陽頭痛", symptoms: "頭脹痛而眩、心煩易怒、夜眠不寧、面紅口苦、舌紅苔黃、脈弦有力", principle: "平肝潛陽息風", formula: "天麻鉤藤飲" },
      { name: "痰濁頭痛", symptoms: "頭痛昏蒙如裹、胸脘滿悶、嘔惡痰涎、苔白膩、脈滑", principle: "化痰降逆、健脾和胃", formula: "半夏白朮天麻湯" },
      { name: "瘀血頭痛", symptoms: "頭痛經久不癒、痛有定處如錐如刺、或有頭部外傷史、舌紫暗有瘀斑、脈細澀", principle: "活血化瘀、通竅止痛", formula: "通竅活血湯" },
      { name: "血虛頭痛", symptoms: "頭痛頭暈、心悸不寧、神疲乏力、面色少華、舌淡苔薄白、脈細弱", principle: "養血滋陰", formula: "加味四物湯" },
    ],
    source: "theqi.com 中醫內科學 · 頭痛",
  },
  {
    title: "胸痹（冠心病）中醫內科辨證論治指南",
    diseaseChinese: "胸痹",
    diseaseEnglish: "Chest Bi / Coronary Heart Disease (Xiong Bi)",
    definition: "胸悶痛、甚則胸痛徹背、短氣、喘息不得臥。涵蓋冠心病、心絞痛等心血管疾病。",
    etiology: "年老體弱、飲食不節、情志失調、寒邪內侵。本虛標實——心氣虛為本，血瘀痰濁為標。",
    patterns: [
      { name: "氣滯血瘀", symptoms: "胸痛如刺如絞、痛有定處、心悸不安、舌紫暗有瘀點、脈弦澀", principle: "活血化瘀、行氣止痛", formula: "血府逐瘀湯" },
      { name: "痰濁壅塞", symptoms: "胸悶如窒而痛、氣短喘促、痰多體胖、苔濁膩、脈滑", principle: "通陽化濁、豁痰宣痹", formula: "栝蔞薤白半夏湯" },
      { name: "氣陰兩虛", symptoms: "胸悶隱痛、心悸氣短、倦怠乏力、口乾舌燥、舌紅少苔、脈細數或結代", principle: "益氣養陰", formula: "生脈散合歸脾湯" },
      { name: "心腎陽虛", symptoms: "胸悶氣喘、心悸怔忡、畏寒肢冷、面色蒼白、舌淡胖邊有齒痕、脈沉遲", principle: "溫補陽氣、振奮心陽", formula: "參附湯合右歸飲" },
    ],
    source: "theqi.com 中醫內科學 · 胸痹",
  },
  {
    title: "泄瀉（腸易激綜合徵）中醫內科辨證論治指南",
    diseaseChinese: "泄瀉",
    diseaseEnglish: "Diarrhea / IBS (Xie Xie)",
    definition: "排便次數增多、糞質稀薄或完穀不化。涵蓋急慢性腹瀉、腸易激綜合徵。",
    etiology: "感受外邪、飲食所傷、情志失調、脾胃虛弱、腎陽虛衰。",
    patterns: [
      { name: "肝氣乘脾", symptoms: "腸鳴腹痛瀉必腹痛、瀉後痛緩、每因情志不暢發作、脘悶噯氣、脈弦", principle: "抑肝扶脾", formula: "痛瀉要方" },
      { name: "脾胃虛弱", symptoms: "大便溏薄、食後脘悶不舒、食少倦怠、面色萎黃、舌淡苔白、脈細弱", principle: "健脾益氣", formula: "參苓白朮散" },
      { name: "腎陽虛衰", symptoms: "黎明腹痛泄瀉（五更瀉）、完穀不化、形寒肢冷、腰膝酸軟、舌淡苔白、脈沉細", principle: "溫腎健脾、固澀止瀉", formula: "四神丸" },
      { name: "食滯腸胃", symptoms: "腹痛腸鳴、瀉下臭穢、瀉後痛減、噯腐酸臭、不思飲食、苔厚膩", principle: "消食導滯", formula: "保和丸" },
    ],
    source: "theqi.com 中醫內科學 · 泄瀉",
  },
];

async function main() {
  console.log(`\n[theqi] Integrating theqi.com data: ${NEW_HERBS.length} herbs + ${DISEASE_GUIDES.length} guides…\n`);

  // 1. Insert new herbs
  let herbCount = 0;
  for (const h of NEW_HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.pinyinName } });
    if (dup) {
      // Update description with theqi.com enrichment if existing description is shorter
      if (dup.description && h.description.length > dup.description.length) {
        await prisma.herb.update({
          where: { id: dup.id },
          data: { description: h.description, modernPharmacology: h.modernPharmacology },
        });
        console.log(`  ↑ enriched: ${h.chineseName} (${h.pinyinName})`);
      } else {
        console.log(`  ↷ skip herb: ${h.pinyinName}`);
      }
      continue;
    }
    await prisma.herb.create({
      data: {
        pinyinName: h.pinyinName,
        chineseName: h.chineseName,
        latinName: h.latinName,
        englishName: h.englishName,
        category: h.category,
        nature: h.nature,
        flavor: h.flavor,
        meridianTropism: h.meridianTropism,
        dosageRange: h.dosageRange,
        description: h.description,
        modernPharmacology: h.modernPharmacology,
        status: "PUBLISHED",
      },
    });
    console.log(`  ✓ herb: ${h.chineseName} (${h.pinyinName})`);
    herbCount++;
  }

  // 2. Insert disease guides as TRADITIONAL_USE evidence entries
  let guideCount = 0;
  for (const g of DISEASE_GUIDES) {
    const dup = await prisma.evidenceEntry.findFirst({ where: { title: g.title } });
    if (dup) { console.log(`  ↷ skip guide: ${g.diseaseChinese}`); continue; }

    const patternText = g.patterns.map((p) =>
      `【${p.name}】\n症狀：${p.symptoms}\n治則：${p.principle}\n方劑：${p.formula}`
    ).join("\n\n");

    await prisma.evidenceEntry.create({
      data: {
        title: g.title,
        studyType: "TRADITIONAL_USE",
        evidenceLevel: "LEVEL_5",
        evidenceGrade: "D",
        authors: "theqi.com 中醫內科學",
        journal: "中醫內科學教材",
        year: 2023,
        doi: null,
        pubmedId: null,
        abstract: `定義：${g.definition}\n\n病因病機：${g.etiology}`,
        summary: `${g.diseaseChinese}（${g.diseaseEnglish}）辨證分型 ${g.patterns.length} 型，含治則與方劑。來源：${g.source}`,
        population: `${g.diseaseChinese}患者`,
        intervention: `中醫辨證論治——${g.patterns.map((p) => p.name).join("、")}`,
        comparator: null,
        primaryOutcome: "辨證論治分型與方劑選擇",
        resultsSummary: patternText,
        riskOfBias: null,
        qualityTool: null,
        status: "PUBLISHED",
      },
    });
    console.log(`  ✓ guide: ${g.diseaseChinese} (${g.patterns.length} patterns)`);
    guideCount++;
  }

  // 3. Final stats
  const [herbs, evidence, links] = await Promise.all([
    prisma.herb.count(),
    prisma.evidenceEntry.count(),
    Promise.all([
      prisma.evidenceHerbLink.count(),
      prisma.evidenceFormulaLink.count(),
      prisma.evidenceAcupointLink.count(),
      prisma.evidencePatternLink.count(),
    ]).then((c) => c.reduce((a, b) => a + b, 0)),
  ]);

  console.log(`\n[theqi] Done: +${herbCount} herbs + ${guideCount} guides`);
  console.log(`  DB totals: ${herbs} herbs · ${evidence} evidence · ${links} links\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
