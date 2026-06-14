/**
 * Seed classicalFunctions, classicalIndications, processingMethods for key herbs.
 * Source: 《中藥學》(第2版) 張廷模主編 — standard TCM university text.
 * Idempotent — skips herbs that already have classicalFunctions set.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface HerbClassical {
  pinyinName: string;
  classicalFunctions: string;
  classicalIndications: string;
  processingMethods?: string;
}

const DATA: HerbClassical[] = [
  {
    pinyinName: "Huang Qi",
    classicalFunctions: "補氣升陽，固表止汗，利水消腫，生津養血，行滯通痹，托毒排膿，斂瘡生肌",
    classicalIndications: "脾肺氣虛，中氣下陷，表虛自汗，氣虛水腫，血虛萎黃，痹痛麻木，癰疽難潰或久潰不斂",
    processingMethods: "生用：固表止汗、利水消腫、托毒生肌；蜜炙：補中益氣力強",
  },
  {
    pinyinName: "Ren Shen",
    classicalFunctions: "大補元氣，復脈固脫，補脾益肺，生津養血，安神益智",
    classicalIndications: "元氣虛脫，脾肺氣虛，津傷口渴，內熱消渴，氣血虧虛，心神不安，久病虛贏",
    processingMethods: "生曬參：補氣生津；紅參：溫補力強，偏治陽虛；糖參（白參）：補力較弱",
  },
  {
    pinyinName: "Bai Zhu",
    classicalFunctions: "補脾益氣，燥濕利水，止汗，安胎",
    classicalIndications: "脾胃氣虛，腹脹納少，倦怠少氣，脾虛水腫，表虛自汗，胎動不安",
    processingMethods: "生用：燥濕利水；炒用：補脾止瀉；土炒：補脾止瀉力增強",
  },
  {
    pinyinName: "Fu Ling",
    classicalFunctions: "利水滲濕，健脾，寧心",
    classicalIndications: "水腫，小便不利，痰飲眩悸，脾虛食少便溏，心悸，失眠",
    processingMethods: "茯苓皮：利水消腫；茯神：寧心安神",
  },
  {
    pinyinName: "Dang Gui",
    classicalFunctions: "補血活血，調經止痛，潤腸通便",
    classicalIndications: "血虛諸症，月經不調，閉經，痛經，血虛腹痛，風寒痹痛，跌打損傷，癰疽瘡瘍，腸燥便秘",
    processingMethods: "全當歸：補血活血；當歸身：補血；當歸尾：活血；酒當歸：活血行血力強",
  },
  {
    pinyinName: "Chuan Xiong",
    classicalFunctions: "活血行氣，祛風止痛",
    classicalIndications: "血瘀氣滯，月經不調，閉經，痛經，頭痛，風濕痹痛，胸痛，跌打損傷",
    processingMethods: "生用：活血行氣；酒炒：增強行血之力",
  },
  {
    pinyinName: "Di Huang",
    classicalFunctions: "清熱涼血，養陰生津（鮮地黃）；補血滋陰，益精填髓（熟地黃）",
    classicalIndications: "熱入營血，斑疹出血，陰虛內熱，津傷口渴（生地）；血虛萎黃，心悸，月經不調，肝腎陰虛（熟地）",
    processingMethods: "鮮地黃：清熱涼血最強；生地黃：涼血養陰；熟地黃（久蒸）：補血益精",
  },
  {
    pinyinName: "Ban Xia",
    classicalFunctions: "燥濕化痰，降逆止嘔，消痞散結",
    classicalIndications: "痰多咳喘，風痰頭眩，嘔吐，胸脘痞悶，癭瘤痰核，梅核氣",
    processingMethods: "生半夏有毒外用；法半夏（甘草石灰炮製）燥濕化痰；薑半夏降逆止嘔；清半夏化痰散結",
  },
  {
    pinyinName: "Fu Zi",
    classicalFunctions: "回陽救逆，補火助陽，散寒止痛",
    classicalIndications: "亡陽虛脫，肢冷脈微，腎陽衰弱，陽虛水腫，寒痹冷痛，胸痹，陽虛外感",
    processingMethods: "黑附片（熟片）：補陽散寒；白附片：散寒除濕；淡附片：回陽救逆；炮附子：毒性最低",
  },
  {
    pinyinName: "Gan Cao",
    classicalFunctions: "補脾益氣，清熱解毒，祛痰止咳，緩急止痛，調和諸藥",
    classicalIndications: "脾胃虛弱，食少乏力，心悸氣短，咳嗽多痰，脘腹及四肢攣急疼痛，咽喉腫痛，瘡瘍，藥物毒性",
    processingMethods: "生甘草：清熱解毒；炙甘草（蜜炙）：補脾益氣、緩急止痛",
  },
  {
    pinyinName: "Huang Lian",
    classicalFunctions: "清熱燥濕，瀉火解毒",
    classicalIndications: "濕熱痞滿，嘔吐，腸鳴腹瀉，黃疸，高熱，口舌生瘡，心火亢盛，消渴，目赤腫痛，癰腫疔瘡",
    processingMethods: "生用清心胃之火；酒黃連清上焦熱；薑黃連清胃止嘔；吳茱萸炒黃連疏肝和胃",
  },
  {
    pinyinName: "Huang Bai",
    classicalFunctions: "清熱燥濕，瀉火除蒸，解毒療瘡",
    classicalIndications: "濕熱痢疾，黃疸，泄瀉，帶下，淋症，骨蒸潮熱，盜汗，遺精，瘡瘍腫毒，濕疹",
    processingMethods: "生用清熱燥濕；酒炒瀉上焦之火；鹽炒瀉腎火退虛熱；炒炭止血",
  },
  {
    pinyinName: "Huang Qin",
    classicalFunctions: "清熱燥濕，瀉火解毒，止血，安胎",
    classicalIndications: "濕溫，暑濕，胸悶嘔惡，濕熱痞滿，肺熱咳嗽，高熱煩渴，血熱吐衄，癰腫瘡毒，胎動不安",
    processingMethods: "生用清熱燥濕力強；酒炒清上焦熱；炒炭止血；條芩（子芩）清大腸濕熱；枯芩清肺",
  },
  {
    pinyinName: "Da Huang",
    classicalFunctions: "瀉下攻積，清熱瀉火，涼血解毒，逐瘀通經，利濕退黃",
    classicalIndications: "腸道積滯，大便秘結，血熱吐衄，目赤，咽痛，腸癰腹痛，癰腫疔瘡，瘀血閉經，跌打損傷，濕熱黃疸",
    processingMethods: "生大黃：瀉下力強；酒大黃：活血清上焦火；熟大黃：瀉下力緩；大黃炭：止血",
  },
  {
    pinyinName: "Chai Hu",
    classicalFunctions: "疏散退熱，疏肝解鬱，升舉陽氣",
    classicalIndications: "寒熱往來，外感發熱，少陽病，肝鬱氣滯，胸脅脹痛，月經不調，中氣下陷，久瀉脫肛",
    processingMethods: "生用：解表退熱；醋炒：疏肝止痛；鱉血炒：清熱截瘧",
  },
  {
    pinyinName: "Shan Zhu Yu",
    classicalFunctions: "補益肝腎，收澀固脫",
    classicalIndications: "腰膝酸軟，頭暈耳鳴，陽痿，遺精，遺尿，小便頻數，崩漏帶下，大汗虛脫，內熱消渴",
    processingMethods: "生用補澀固脫；酒炒補腎益精力強",
  },
  {
    pinyinName: "Ze Xie",
    classicalFunctions: "利水滲濕，泄熱，化濁降脂",
    classicalIndications: "小便不利，水腫，痰飲，泄瀉，熱淋，高脂血症",
    processingMethods: "生用利水；鹽炒瀉腎火",
  },
  {
    pinyinName: "Mu Dan Pi",
    classicalFunctions: "清熱涼血，活血化瘀",
    classicalIndications: "熱入血分，斑疹出血，骨蒸潮熱，經閉，癥瘕，跌打損傷，癰腫瘡毒",
    processingMethods: "生用清熱涼血；酒炒活血化瘀",
  },
  {
    pinyinName: "Long Yan Rou",
    classicalFunctions: "補益心脾，養血安神",
    classicalIndications: "氣血不足，心悸，失眠，健忘，血虛萎黃，脾虛洩瀉",
    processingMethods: "生用補益；炙用補力更強",
  },
  {
    pinyinName: "Shan Zha",
    classicalFunctions: "消食健胃，行氣散瘀，化濁降脂",
    classicalIndications: "食積腹脹，肉食難消，產後瘀阻腹痛，高脂血症",
    processingMethods: "生山楂：消食化積，行氣散瘀；炒山楂：和胃消食；焦山楂：消食止瀉",
  },
  {
    pinyinName: "Chen Pi",
    classicalFunctions: "理氣健脾，燥濕化痰",
    classicalIndications: "脘腹脹滿，食少，呃逆，咳嗽，痰多",
    processingMethods: "陳皮以陳久者佳；廣陳皮（廣東新會）品質最優",
  },
  {
    pinyinName: "Ban Zhi Lian",
    classicalFunctions: "清熱解毒，化瘀利尿",
    classicalIndications: "癌腫，水腫，疔瘡腫毒，跌打損傷，蛇蟲咬傷",
    processingMethods: "鮮用或生用",
  },
  {
    pinyinName: "Yin Chen",
    classicalFunctions: "清利濕熱，退黃",
    classicalIndications: "黃疸，小便不利，濕瘡，皮膚瘙癢",
    processingMethods: "生用（春季幼苗入藥）",
  },
  {
    pinyinName: "Cang Zhu",
    classicalFunctions: "燥濕健脾，祛風散寒，明目",
    classicalIndications: "濕阻脾胃，脘腹脹滿，腸鳴泄瀉，腳氣痿躄，風寒濕痹，雀目，夜盲",
    processingMethods: "生用燥濕祛風；炒用健脾止瀉；麩炒緩其燥性",
  },
  {
    pinyinName: "Yi Yi Ren",
    classicalFunctions: "利水滲濕，健脾止瀉，除痹，排膿，解毒散結",
    classicalIndications: "水腫，腳氣，痹症，肺癰，腸癰，脾虛泄瀉，帶下，癥瘕",
    processingMethods: "生薏苡仁：利水除痹清熱；炒薏苡仁：健脾止瀉",
  },
  {
    pinyinName: "Xi Xin",
    classicalFunctions: "祛風散寒，通竅止痛，溫肺化飲",
    classicalIndications: "風寒感冒，頭痛齒痛，鼻塞鼻淵，風濕痹痛，痰飲咳喘",
    processingMethods: "入煎劑1-3g；散劑0.5-1g；「細辛不過錢」古訓",
  },
  {
    pinyinName: "Jin Yin Hua",
    classicalFunctions: "清熱解毒，疏散風熱",
    classicalIndications: "癰腫疔瘡，喉痹，丹毒，熱毒血痢，風熱感冒，溫病初起",
    processingMethods: "生用偏清熱解毒；炒炭涼血止痢",
  },
  {
    pinyinName: "Lian Qiao",
    classicalFunctions: "清熱解毒，消腫散結，疏散風熱",
    classicalIndications: "癰疽，瘰癧，乳癰，丹毒，風熱感冒，溫病初起，熱入心包，高熱驚厥，斑疹",
    processingMethods: "生用；連翹心清心解毒力強",
  },
  {
    pinyinName: "Pu Gong Ying",
    classicalFunctions: "清熱解毒，消腫散結，利濕通淋",
    classicalIndications: "癰腫疔毒，乳癰，瘰癧，目赤，咽痛，肺癰，腸癰，濕熱黃疸，熱淋澀痛",
    processingMethods: "鮮用外敷；煎服清熱解毒",
  },
  {
    pinyinName: "Huang Qi",
    classicalFunctions: "補氣升陽，固表止汗，利水消腫，生津養血，行滯通痹，托毒排膿，斂瘡生肌",
    classicalIndications: "脾肺氣虛，中氣下陷，表虛自汗，氣虛水腫，血虛萎黃，痹痛麻木，癰疽難潰或久潰不斂",
    processingMethods: "生用固表止汗；蜜炙補中益氣",
  },
];

async function main() {
  console.log("Seeding classical herb data (功效/主治/炮製)...");
  let updated = 0;

  for (const entry of DATA) {
    const herbs = await prisma.herb.findMany({
      where: {
        pinyinName: { contains: entry.pinyinName, mode: "insensitive" },
        classicalFunctions: null,
      },
    });
    for (const herb of herbs) {
      await prisma.herb.update({
        where: { id: herb.id },
        data: {
          classicalFunctions: entry.classicalFunctions,
          classicalIndications: entry.classicalIndications,
          processingMethods: entry.processingMethods ?? null,
        },
      });
      console.log(`  Updated: ${herb.chineseName} (${herb.pinyinName})`);
      updated++;
    }
  }

  console.log(`Done. ${updated} herbs updated with classical data.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
