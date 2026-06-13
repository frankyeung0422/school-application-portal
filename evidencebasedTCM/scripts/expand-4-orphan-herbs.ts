/**
 * Batch expansion #4 — add herbs referenced by formulas but missing from DB,
 * plus normalize residual hyphenated "Exterior-Releasing" categories.
 *
 * Idempotent — skips by pinyinName/code.
 *
 * Run: npx tsx scripts/expand-4-orphan-herbs.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface H {
  p: string; c: string; lat: string; eng: string;
  cat: string; nat: "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL";
  flav: string[]; merid: string[]; dose: string; desc: string; pharm: string;
}

// Herbs referenced by classical formulas in expand-3 but not yet in DB.
const HERBS: H[] = [
  { p: "Gan Jiang", c: "乾薑", lat: "Zingiber officinale (dried)", eng: "Dried Ginger", cat: "Interior Warming", nat: "HOT",
    flav: ["Pungent"], merid: ["Spleen", "Stomach", "Heart", "Lung"], dose: "3-10g",
    desc: "溫中散寒，回陽通脈，溫肺化飲。用於脾胃虛寒、脘腹冷痛、嘔吐泄瀉、肢冷脈微、寒飲咳喘、寒濕痺痛。為理中湯、四逆湯主藥。",
    pharm: "含薑辣素、薑烯酚、薑酮。具有抗炎、抗氧化、止吐、保護胃黏膜、強心、抗血栓作用。" },
  { p: "Pao Jiang", c: "炮薑", lat: "Zingiber officinale (blast-fried)", eng: "Blast-Fried Ginger", cat: "Interior Warming", nat: "HOT",
    flav: ["Bitter", "Astringent"], merid: ["Spleen", "Stomach", "Liver"], dose: "3-9g",
    desc: "溫經止血，溫中止痛。用於陽虛失血、吐衄崩漏、脾胃虛寒、腹痛吐瀉。生化湯之要藥。",
    pharm: "炮製後揮發油減少，止血成分增加。具有止血、抗炎、保肝作用。" },
  { p: "Sheng Di Huang", c: "生地黃", lat: "Rehmannia glutinosa (fresh/dried)", eng: "Raw Rehmannia Root", cat: "Heat Clearing", nat: "COLD",
    flav: ["Sweet", "Bitter"], merid: ["Heart", "Liver", "Kidney"], dose: "9-15g",
    desc: "清熱涼血，養陰生津。用於熱入營血、溫毒發斑、吐血衄血、熱病傷陰、舌絳煩渴、津傷便秘、陰虛發熱、骨蒸勞熱、內熱消渴。",
    pharm: "含梓醇、地黃苷、甘露醇。具有降血糖、抗炎、免疫調節、止血、強心作用。" },
  { p: "Mai Dong", c: "麥冬", lat: "Ophiopogon japonicus", eng: "Dwarf Lilyturf Tuber", cat: "Yin Tonifying", nat: "COOL",
    flav: ["Sweet", "Slightly Bitter"], merid: ["Heart", "Lung", "Stomach"], dose: "6-12g",
    desc: "養陰生津，潤肺清心。用於肺燥乾咳、虛勞咳嗽、津傷口渴、內熱消渴、心煩失眠、腸燥便秘。為生脈散主藥。",
    pharm: "含麥冬皂苷、麥冬多糖、高異黃酮。具有抗心律失常、抗心肌缺血、降血糖、免疫調節作用。" },
  { p: "Sha Shen", c: "沙參", lat: "Adenophora stricta / Glehnia littoralis", eng: "Glehnia / Adenophora Root", cat: "Yin Tonifying", nat: "COOL",
    flav: ["Sweet", "Slightly Bitter"], merid: ["Lung", "Stomach"], dose: "9-15g",
    desc: "養陰清肺，益胃生津。用於肺熱燥咳、勞嗽痰血、胃陰不足、熱病津傷、口渴咽乾。北沙參偏潤肺，南沙參兼益氣。",
    pharm: "含沙參多糖、香豆素、揮發油。具有免疫調節、祛痰鎮咳、抗氧化作用。" },
  { p: "Zhi Zi", c: "梔子", lat: "Gardenia jasminoides", eng: "Gardenia Fruit", cat: "Heat Clearing", nat: "COLD",
    flav: ["Bitter"], merid: ["Heart", "Lung", "Triple Energizer", "Stomach"], dose: "6-10g",
    desc: "瀉火除煩，清熱利尿，涼血解毒。用於熱病心煩、濕熱黃疸、淋證澀痛、血熱吐衄、目赤腫痛、火毒瘡瘍。",
    pharm: "含梔子苷、藏紅花苷。具有保肝利膽、降血壓、解熱、抗炎、鎮靜作用。" },
  { p: "Long Dan Cao", c: "龍膽草", lat: "Gentiana scabra", eng: "Chinese Gentian Root", cat: "Heat Clearing", nat: "COLD",
    flav: ["Bitter"], merid: ["Liver", "Gallbladder"], dose: "3-6g",
    desc: "清熱燥濕，瀉肝膽火。用於濕熱黃疸、陰腫陰癢、帶下、濕疹瘙癢、肝火頭痛、目赤耳聾、脅痛、口苦、強中、驚風抽搐。為龍膽瀉肝湯主藥。",
    pharm: "含龍膽苦苷、龍膽鹼。具有保肝、利膽、抗炎、抗菌、降血壓作用。" },
  { p: "Yin Chen Hao", c: "茵陳蒿", lat: "Artemisia capillaris", eng: "Capillary Artemisia", cat: "Dampness Draining", nat: "COOL",
    flav: ["Bitter", "Pungent"], merid: ["Spleen", "Stomach", "Liver", "Gallbladder"], dose: "6-15g",
    desc: "清利濕熱，利膽退黃。用於黃疸尿少、濕溫暑濕、濕瘡瘙癢。為治黃疸要藥。",
    pharm: "含香豆素類、揮發油。具有利膽、保肝、降血脂、抗病原微生物、解熱、抗炎作用。" },
  { p: "Zhi Shi", c: "枳實", lat: "Citrus aurantium (immature)", eng: "Immature Bitter Orange", cat: "Qi Regulating", nat: "COOL",
    flav: ["Bitter", "Pungent", "Sour"], merid: ["Spleen", "Stomach", "Large Intestine"], dose: "3-10g",
    desc: "破氣消積，化痰散痞。用於積滯內停、痞滿脹痛、瀉痢後重、大便不通、痰滯氣阻胸痺、結胸、胃下垂、子宮脫垂、脫肛。",
    pharm: "含辛弗林、N-甲基酪胺。具有興奮胃腸平滑肌、強心升壓、抗潰瘍、利尿作用。" },
  { p: "Xing Ren", c: "杏仁", lat: "Prunus armeniaca", eng: "Apricot Seed", cat: "Phlegm Resolving", nat: "WARM",
    flav: ["Bitter"], merid: ["Lung", "Large Intestine"], dose: "5-10g",
    desc: "降氣止咳平喘，潤腸通便。用於咳嗽氣喘、胸滿痰多、血虛津枯、腸燥便秘。有小毒，注意用量。",
    pharm: "含苦杏仁苷（amygdalin）、脂肪油。具有鎮咳平喘、潤腸通便作用。代謝產氫氰酸過量可中毒。" },
  { p: "Huo Xiang", c: "藿香", lat: "Agastache rugosa / Pogostemon cablin", eng: "Patchouli / Korean Mint", cat: "Aromatic Dampness Dissolving", nat: "WARM",
    flav: ["Pungent"], merid: ["Spleen", "Stomach", "Lung"], dose: "3-10g",
    desc: "芳香化濕，和中止嘔，發表解暑。用於濕濁中阻、脘痞嘔吐、暑濕倦怠、胸悶不舒、寒濕閉暑、腹痛吐瀉、鼻淵頭痛。為藿香正氣散主藥。",
    pharm: "含揮發油（廣藿香醇、廣藿香酮）。具有抗菌、抗病毒、調節胃腸、解熱作用。" },
  { p: "Zhu Ling", c: "豬苓", lat: "Polyporus umbellatus", eng: "Polyporus Sclerotium", cat: "Dampness Draining", nat: "NEUTRAL",
    flav: ["Sweet", "Bland"], merid: ["Kidney", "Bladder"], dose: "6-12g",
    desc: "利水滲濕。用於小便不利、水腫、泄瀉、淋濁、帶下。利水之力強於茯苓而無補益作用。",
    pharm: "含豬苓多糖、麥角甾醇。具有利尿、免疫調節、抗腫瘤、保肝作用。" },
  { p: "Zhu Ru", c: "竹茹", lat: "Bambusa textilis (shavings)", eng: "Bamboo Shavings", cat: "Phlegm Resolving", nat: "COOL",
    flav: ["Sweet"], merid: ["Lung", "Stomach", "Gallbladder"], dose: "5-10g",
    desc: "清熱化痰，除煩止嘔。用於痰熱咳嗽、膽火夾痰、煩熱嘔吐、驚悸失眠、中風痰迷、舌強不語、胃熱嘔吐、妊娠惡阻、胎動不安。為溫膽湯要藥。",
    pharm: "具有抗菌、止嘔、降血脂、解熱作用。" },
  { p: "Zi Su Ye", c: "紫蘇葉", lat: "Perilla frutescens (leaf)", eng: "Perilla Leaf", cat: "Exterior Releasing", nat: "WARM",
    flav: ["Pungent"], merid: ["Lung", "Spleen"], dose: "5-10g",
    desc: "解表散寒，行氣和胃。用於風寒感冒、咳嗽嘔惡、妊娠嘔吐、魚蟹中毒。後下煎服，不宜久煎。",
    pharm: "含揮發油（紫蘇醛）、迷迭香酸。具有解熱、抗過敏、抗炎、抗菌、止吐作用。" },
  { p: "Lian Qiao", c: "連翹", lat: "Forsythia suspensa", eng: "Forsythia Fruit", cat: "Heat Clearing", nat: "COOL",
    flav: ["Bitter"], merid: ["Lung", "Heart", "Small Intestine"], dose: "6-15g",
    desc: "清熱解毒，消腫散結，疏散風熱。用於癰疽、瘰癧、乳癰、丹毒、風熱感冒、溫病初起、溫熱入營、高熱煩渴、神昏發斑、熱淋澀痛。為「瘡家聖藥」。",
    pharm: "含連翹苷、連翹酯苷。具有廣譜抗菌、抗病毒、抗炎、解熱、保肝作用。" },
  { p: "Bo He", c: "薄荷", lat: "Mentha haplocalyx", eng: "Field Mint", cat: "Exterior Releasing", nat: "COOL",
    flav: ["Pungent"], merid: ["Lung", "Liver"], dose: "3-6g",
    desc: "疏散風熱，清利頭目，利咽，透疹，疏肝行氣。用於風熱感冒、風溫初起、頭痛、目赤、喉痺、口瘡、風疹、麻疹、胸脅脹悶。後下。",
    pharm: "含揮發油（薄荷醇、薄荷酮）。具有解熱、發汗、抗病毒、抗炎、利膽作用。" },
  { p: "Shan Zhu Yu", c: "山茱萸", lat: "Cornus officinalis", eng: "Asian Cornelian Cherry Fruit", cat: "Yin Tonifying", nat: "WARM",
    flav: ["Sour", "Astringent"], merid: ["Liver", "Kidney"], dose: "6-12g",
    desc: "補益肝腎，收澀固脫。用於眩暈耳鳴、腰膝酸痛、陽痿遺精、遺尿尿頻、崩漏帶下、大汗虛脫、內熱消渴。六味地黃丸要藥。",
    pharm: "含山茱萸苷、馬錢苷、熊果酸。具有降血糖、強心、抗炎、抗氧化、免疫調節作用。" },
  { p: "Tu Si Zi", c: "菟絲子", lat: "Cuscuta chinensis", eng: "Chinese Dodder Seed", cat: "Yang Tonifying", nat: "WARM",
    flav: ["Sweet"], merid: ["Liver", "Kidney", "Spleen"], dose: "6-12g",
    desc: "補益肝腎，固精縮尿，安胎，明目，止瀉。用於肝腎不足、腰膝酸軟、陽痿遺精、遺尿尿頻、腎虛胎漏、胎動不安、目昏耳鳴、脾腎虛瀉。",
    pharm: "含黃酮類（金絲桃苷）、多糖。具有性激素樣作用、保肝、增強免疫、抗骨質疏鬆、改善視網膜功能。" },
  { p: "Che Qian Zi", c: "車前子", lat: "Plantago asiatica", eng: "Asian Plantain Seed", cat: "Dampness Draining", nat: "COLD",
    flav: ["Sweet"], merid: ["Liver", "Kidney", "Lung", "Small Intestine"], dose: "9-15g",
    desc: "清熱利尿通淋，滲濕止瀉，明目，祛痰。用於熱淋澀痛、水腫脹滿、暑濕泄瀉、痰熱咳嗽、目赤腫痛、目暗昏花、翳障。包煎。",
    pharm: "含車前子苷、桃葉珊瑚苷、車前膠。具有利尿、降血壓、降血脂、祛痰、抗潰瘍作用。" },
  { p: "Mu Tong", c: "木通", lat: "Akebia quinata", eng: "Akebia Stem", cat: "Heat Clearing", nat: "COOL",
    flav: ["Bitter"], merid: ["Heart", "Small Intestine", "Bladder"], dose: "3-6g",
    desc: "利尿通淋，清心除煩，通經下乳。用於淋證、水腫、心煩尿赤、口舌生瘡、經閉乳少、濕熱痺痛。注意：須用木通科木通，避免馬兜鈴科關木通（腎毒性）。",
    pharm: "含齊墩果酸、常春藤皂苷元。具有利尿、抗菌、抗炎作用。" },
];

async function main() {
  console.log(`\n[expand-4] Add orphan herbs + final category cleanup\n`);

  // Final hyphen cleanup for any residual formula categories
  const renames: Array<[string, string]> = [
    ["Exterior-Releasing (Wind-Cold)", "Exterior Releasing (Wind-Cold)"],
    ["Exterior-Releasing (Wind-Heat)", "Exterior Releasing (Wind-Heat)"],
  ];
  for (const [from, to] of renames) {
    const r = await prisma.formula.updateMany({
      where: { category: from },
      data: { category: to },
    });
    if (r.count > 0) console.log(`  ↻ formula category: "${from}" → "${to}" — ${r.count} formulas`);
  }

  let hc = 0;
  for (const h of HERBS) {
    const dup = await prisma.herb.findFirst({ where: { pinyinName: h.p } });
    if (dup) { console.log(`  ↷ herb: ${h.p}`); continue; }
    await prisma.herb.create({
      data: {
        pinyinName: h.p, chineseName: h.c, latinName: h.lat, englishName: h.eng,
        category: h.cat, nature: h.nat, flavor: h.flav, meridianTropism: h.merid,
        dosageRange: h.dose, description: h.desc, modernPharmacology: h.pharm,
        status: "PUBLISHED",
      },
    });
    console.log(`  ✓ herb: ${h.c} (${h.p}) — ${h.cat}`);
    hc++;
  }

  // Backfill formula-herb links: now that orphan herbs exist, retry linking
  // for any formula-pinyin pair that was skipped earlier.
  console.log(`\n  Backfilling formula-herb links for newly-added herbs…`);
  const newHerbs = await prisma.herb.findMany({
    where: { pinyinName: { in: HERBS.map((h) => h.p) } },
    select: { id: true, pinyinName: true },
  });
  // Nothing to backfill from data here — the expand-3 script's missingHerbs
  // are not persisted, so we can only re-run formula seeding manually.
  // But the next time expand-3 is rerun, the herbs will be found.
  console.log(`  (To attach these herbs to existing formulas, edit and rerun expand-3 with idempotent retries.)`);

  console.log(`\n[expand-4] +${hc} herbs\n`);

  const [herbCount, formulaCount, acuCount] = await Promise.all([
    prisma.herb.count(),
    prisma.formula.count(),
    prisma.acupuncturePoint.count(),
  ]);
  console.log(`  DB totals: ${herbCount} herbs · ${formulaCount} formulas · ${acuCount} acupoints`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
