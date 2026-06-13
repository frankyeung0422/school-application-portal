/**
 * Seed 30+ classical 食療 recipes (public-domain TCM food therapy).
 *
 * Idempotent — skips by pinyinName. Run repeatedly to top up.
 *
 * Run: npx tsx scripts/seed-food-therapy.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface Recipe {
  pinyinName: string;
  chineseName: string;
  englishName: string;
  category: "Soup" | "Porridge" | "Tea" | "Tonic" | "Dessert" | "Stew" | "Drink";
  difficulty: "easy" | "medium" | "hard";
  servings: number;
  prep: number;
  cook: number;
  ingredients: string;
  preparation: string;
  indication: string;
  principle: string;
  season?: "spring" | "summer" | "autumn" | "winter" | "all-season";
  contraindications?: string;
  notes?: string;
  source?: string;
  patternPinyin?: string;
  conditionWestern?: string[];
}

const RECIPES: Recipe[] = [
  {
    pinyinName: "Si Shen Tang",
    chineseName: "四神湯",
    englishName: "Four Spirits Soup",
    category: "Soup",
    difficulty: "easy",
    servings: 4,
    prep: 15,
    cook: 60,
    ingredients: "- 山藥 30g\n- 蓮子 30g\n- 芡實 30g\n- 茯苓 20g\n- 豬肚或排骨 300g\n- 薑片 3 片\n- 米酒 1 茶匙\n- 鹽 適量",
    preparation:
      "1. 蓮子、芡實、山藥溫水浸泡 30 分鐘。\n2. 豬肚（或排骨）汆水後切塊。\n3. 全部材料連薑片、米酒入鍋，加水至蓋過食材。\n4. 大火煮沸後轉小火燉 60 分鐘。\n5. 起鍋前加鹽調味即可。",
    indication: "食慾不振、腹脹便溏、倦怠乏力、面色萎黃、脾胃虛弱、消化不良、慢性腹瀉者。",
    principle: "健脾益氣，利濕止瀉，培土固本。",
    season: "all-season",
    contraindications: "濕熱內盛、舌苔黃膩者慎用。",
    source: "公有領域 — 民間經典食療",
    patternPinyin: "Pi Qi Xu",
    conditionWestern: ["Irritable Bowel Syndrome", "Functional Dyspepsia"],
  },
  {
    pinyinName: "Dang Gui Sheng Jiang Yang Rou Tang",
    chineseName: "當歸生薑羊肉湯",
    englishName: "Angelica, Ginger and Lamb Stew",
    category: "Stew",
    difficulty: "easy",
    servings: 4,
    prep: 15,
    cook: 90,
    ingredients: "- 當歸 15g\n- 生薑 30g\n- 羊肉 500g\n- 黃酒 2 湯匙\n- 鹽 適量",
    preparation:
      "1. 羊肉切塊汆水。\n2. 當歸洗淨，生薑切片。\n3. 全部材料入砂鍋，加水沒過食材。\n4. 武火煮沸後文火燉 90 分鐘。\n5. 加入黃酒、鹽調味即可。",
    indication: "產後血虛、虛寒腹痛、手足不溫、月經量少色淡、痛經、虛寒體質。",
    principle: "溫經養血，散寒止痛。",
    season: "winter",
    contraindications: "陰虛火旺、舌紅口乾、咽喉腫痛者忌服。",
    source: "《金匱要略》（張仲景）",
    patternPinyin: "Shen Yang Xu",
  },
  {
    pinyinName: "Yin Er Lian Zi Tang",
    chineseName: "銀耳蓮子湯",
    englishName: "White Fungus and Lotus Seed Sweet Soup",
    category: "Dessert",
    difficulty: "easy",
    servings: 4,
    prep: 30,
    cook: 60,
    ingredients: "- 銀耳 1 朵（約 15g）\n- 蓮子 50g\n- 冰糖 30g\n- 紅棗 8 枚\n- 枸杞 10g\n- 清水 1500ml",
    preparation:
      "1. 銀耳冷水浸泡 30 分鐘至發脹，去蒂撕小朵。\n2. 蓮子去芯，紅棗去核。\n3. 銀耳、蓮子、紅棗入鍋，加水煮沸後文火 60 分鐘至銀耳出膠。\n4. 加冰糖煮溶。\n5. 起鍋前加枸杞，再煮 2 分鐘即成。",
    indication: "口乾舌燥、咳嗽少痰、皮膚乾燥、虛火上炎、午後潮熱、失眠多夢。",
    principle: "滋陰潤肺，養胃生津，清心安神。",
    season: "autumn",
    contraindications: "風寒咳嗽、痰多色白者不宜。",
    source: "公有領域 — 江南民間食療",
    patternPinyin: "Shen Yin Xu",
  },
  {
    pinyinName: "Hong Zao Jiang Cha",
    chineseName: "紅棗薑茶",
    englishName: "Red Date and Ginger Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 2,
    prep: 5,
    cook: 20,
    ingredients: "- 紅棗 10 枚\n- 生薑 5 片\n- 紅糖 1 湯匙\n- 清水 800ml",
    preparation:
      "1. 紅棗去核切半，生薑切薄片。\n2. 全部材料入鍋，水煮沸後文火 20 分鐘。\n3. 加紅糖煮至溶化，趁熱飲用。",
    indication: "經期小腹冷痛、手足冰涼、面色蒼白、體虛畏寒、感冒初起。",
    principle: "溫中散寒，補血養氣。",
    season: "winter",
    contraindications: "陰虛內熱、糖尿病者慎用。",
    source: "公有領域",
  },
  {
    pinyinName: "Fu Ling Yi Mi Zhou",
    chineseName: "茯苓薏米粥",
    englishName: "Poria and Job's Tears Porridge",
    category: "Porridge",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 60,
    ingredients: "- 茯苓 15g\n- 薏苡仁 30g\n- 粳米 50g\n- 紅棗 5 枚\n- 清水 1200ml",
    preparation:
      "1. 薏苡仁溫水浸泡 30 分鐘。\n2. 茯苓研末或切薄片。\n3. 全部材料入鍋，水煮沸後文火熬 60 分鐘成稠粥。",
    indication: "脾虛濕盛、肢體沉重、水腫、小便不利、慢性腹瀉、舌苔白膩。",
    principle: "健脾利濕，化濁消腫。",
    season: "summer",
    contraindications: "陰虛體質、便秘者慎用。",
    source: "公有領域",
    patternPinyin: "Tan Shi Nei Zu",
  },
  {
    pinyinName: "Chuan Bei Dun Xue Li",
    chineseName: "川貝燉雪梨",
    englishName: "Fritillaria-Stewed Pear",
    category: "Dessert",
    difficulty: "easy",
    servings: 1,
    prep: 10,
    cook: 45,
    ingredients: "- 雪梨 1 個\n- 川貝母 3g\n- 冰糖 10g\n- 清水 200ml",
    preparation:
      "1. 雪梨去皮頂部切蓋，挖去果芯。\n2. 川貝母研末，與冰糖一同放入梨中。\n3. 加少許水，蓋上梨蓋。\n4. 隔水燉 45 分鐘。連湯帶肉食用。",
    indication: "肺燥乾咳、痰少黏稠難咯、咽乾喉痛、聲音嘶啞。",
    principle: "潤肺化痰，止咳生津。",
    season: "autumn",
    contraindications: "風寒咳嗽、痰多色白清稀者忌服。",
    source: "公有領域 — 嶺南民間食療",
  },
  {
    pinyinName: "Huang Qi Dang Shen Ji Tang",
    chineseName: "黃芪黨參雞湯",
    englishName: "Astragalus and Codonopsis Chicken Soup",
    category: "Soup",
    difficulty: "easy",
    servings: 4,
    prep: 15,
    cook: 90,
    ingredients: "- 黃芪 20g\n- 黨參 15g\n- 紅棗 8 枚\n- 雞 1 隻或半隻\n- 薑片 3 片\n- 鹽 適量",
    preparation:
      "1. 雞汆水洗淨切塊。\n2. 黃芪、黨參、紅棗洗淨。\n3. 全部材料連薑片入砂鍋，加水沒過食材。\n4. 武火煮沸後文火燉 90 分鐘。\n5. 加鹽調味即可。",
    indication: "氣短乏力、自汗畏風、面色淡白、容易感冒、術後或產後體虛者。",
    principle: "補氣固表，益氣生血。",
    season: "all-season",
    contraindications: "外感發熱期間、實熱體質者慎用。",
    source: "公有領域",
    patternPinyin: "Fei Qi Xu",
  },
  {
    pinyinName: "Hong Dou Yi Mi Zhou",
    chineseName: "紅豆薏米粥",
    englishName: "Red Bean and Job's Tears Porridge",
    category: "Porridge",
    difficulty: "easy",
    servings: 2,
    prep: 60,
    cook: 90,
    ingredients: "- 紅豆 50g\n- 薏苡仁 50g\n- 清水 1500ml",
    preparation:
      "1. 紅豆、薏苡仁分別浸泡 1 小時。\n2. 入鍋加水煮沸，轉文火熬至豆爛粥稠（約 90 分鐘）。\n3. 可加少許冰糖或不加。",
    indication: "面部浮腫、體型虛胖、舌苔白膩、便溏、濕氣重者。",
    principle: "利水消腫，健脾去濕。",
    season: "summer",
    contraindications: "體質虛寒、孕婦、經期女性慎用。",
    source: "公有領域",
    patternPinyin: "Tan Shi Nei Zu",
  },
  {
    pinyinName: "Bai He Lian Zi Tang Shui",
    chineseName: "百合蓮子糖水",
    englishName: "Lily Bulb and Lotus Seed Sweet Soup",
    category: "Dessert",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 45,
    ingredients: "- 鮮百合 30g（或乾百合 15g）\n- 蓮子 30g\n- 冰糖 20g\n- 枸杞 5g\n- 清水 800ml",
    preparation:
      "1. 蓮子去芯浸泡 30 分鐘。\n2. 百合洗淨。\n3. 蓮子先煮 30 分鐘，加百合、冰糖再煮 15 分鐘。\n4. 起鍋前加枸杞。",
    indication: "心煩失眠、虛煩驚悸、多夢易醒、口乾舌燥、更年期煩躁。",
    principle: "養心安神，滋陰潤肺。",
    season: "all-season",
    source: "公有領域",
    patternPinyin: "Xin Shen Bu Jiao",
    conditionWestern: ["Primary Insomnia", "Menopausal Syndrome"],
  },
  {
    pinyinName: "Ju Hua Gou Qi Cha",
    chineseName: "菊花枸杞茶",
    englishName: "Chrysanthemum and Goji Berry Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 1,
    prep: 2,
    cook: 5,
    ingredients: "- 杭白菊 5g\n- 枸杞 10g\n- 沸水 500ml",
    preparation: "1. 菊花、枸杞置於茶壺。\n2. 沸水沖泡，加蓋燜 5 分鐘即可飲用。\n3. 可續水 2–3 次。",
    indication: "目赤腫痛、視物模糊、頭暈目眩、肝陽上亢之頭痛、長時間用眼者。",
    principle: "清肝明目，滋補肝腎。",
    season: "all-season",
    contraindications: "脾胃虛寒、腹瀉者少飲。",
    source: "公有領域",
    patternPinyin: "Gan Shen Yin Xu",
  },
  {
    pinyinName: "Shan Yao Pai Gu Tang",
    chineseName: "山藥排骨湯",
    englishName: "Chinese Yam and Pork Rib Soup",
    category: "Soup",
    difficulty: "easy",
    servings: 4,
    prep: 15,
    cook: 90,
    ingredients: "- 鮮山藥 300g\n- 豬排骨 500g\n- 紅棗 6 枚\n- 薑片 3 片\n- 枸杞 10g\n- 鹽 適量",
    preparation:
      "1. 排骨汆水切塊。\n2. 山藥去皮切段。\n3. 排骨、薑片、紅棗加水煮沸後文火 60 分鐘。\n4. 加入山藥再煮 20 分鐘。\n5. 起鍋前加枸杞、鹽。",
    indication: "脾胃虛弱、食少便溏、肺虛久咳、腎虛遺精、消化不良、術後恢復。",
    principle: "補脾養胃，益肺固腎。",
    season: "all-season",
    source: "公有領域",
    patternPinyin: "Pi Qi Xu",
  },
  {
    pinyinName: "Mai Dong Ren Shen Cha",
    chineseName: "麥冬人參茶",
    englishName: "Ophiopogon and Ginseng Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 1,
    prep: 5,
    cook: 20,
    ingredients: "- 麥冬 10g\n- 人參 3g（或黨參 10g）\n- 五味子 5g\n- 清水 500ml",
    preparation: "1. 全部藥材入壺。\n2. 加水煮沸後文火 20 分鐘。\n3. 代茶飲，可續水 1–2 次。",
    indication: "氣陰兩虛、口乾舌燥、心悸氣短、自汗、聲音嘶啞、夏日中暑後乏力。",
    principle: "益氣養陰，生津止渴。",
    season: "summer",
    contraindications: "外感發熱、感冒期間忌服。",
    notes: "本方化裁自《內外傷辨惑論》生脈散。",
    source: "公有領域 — 化裁自生脈散",
  },
  {
    pinyinName: "Hei Dou Sang Shen Zhou",
    chineseName: "黑豆桑椹粥",
    englishName: "Black Bean and Mulberry Porridge",
    category: "Porridge",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 60,
    ingredients: "- 黑豆 50g\n- 桑椹 30g（或乾品 15g）\n- 粳米 50g\n- 紅糖 適量",
    preparation:
      "1. 黑豆浸泡一夜。\n2. 黑豆、粳米加水煮沸後文火 45 分鐘。\n3. 加桑椹再煮 15 分鐘。\n4. 加紅糖調味。",
    indication: "腎陰虧虛、頭暈耳鳴、鬚髮早白、腰膝酸軟、便秘、虛勞失眠。",
    principle: "補肝腎，益精血，烏鬚髮。",
    season: "all-season",
    source: "公有領域",
    patternPinyin: "Shen Yin Xu",
  },
  {
    pinyinName: "Dong Gua Yi Mi Tang",
    chineseName: "冬瓜薏米湯",
    englishName: "Winter Melon and Job's Tears Soup",
    category: "Soup",
    difficulty: "easy",
    servings: 3,
    prep: 15,
    cook: 60,
    ingredients: "- 冬瓜 500g（連皮）\n- 薏苡仁 50g\n- 排骨 300g\n- 薑片 2 片\n- 鹽 適量",
    preparation:
      "1. 排骨汆水，冬瓜連皮切大塊。\n2. 薏苡仁、排骨、薑片入鍋，水煮沸後文火 40 分鐘。\n3. 加冬瓜再煮 20 分鐘。\n4. 加鹽調味。",
    indication: "暑熱煩渴、水腫、小便不利、面部痤瘡、肥胖、夏季中暑。",
    principle: "清熱利水，健脾去濕，消腫減重。",
    season: "summer",
    contraindications: "體質虛寒、脾胃虛弱者少食。",
    source: "公有領域",
  },
  {
    pinyinName: "Mu Er Hong Zao Tang",
    chineseName: "木耳紅棗湯",
    englishName: "Wood Ear and Red Date Sweet Soup",
    category: "Dessert",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 45,
    ingredients: "- 黑木耳 20g\n- 紅棗 10 枚\n- 冰糖 20g\n- 清水 800ml",
    preparation:
      "1. 黑木耳泡發 30 分鐘，撕小朵。\n2. 紅棗去核切半。\n3. 入鍋加水煮沸後文火 30 分鐘。\n4. 加冰糖煮溶即可。",
    indication: "血虛面色萎黃、月經量少、血脂偏高、便秘、皮膚乾燥。",
    principle: "補血養顏，潤腸通便。",
    season: "all-season",
    source: "公有領域",
  },
  {
    pinyinName: "Gui Pi Hong Zao Cha",
    chineseName: "桂圓紅棗茶",
    englishName: "Longan and Red Date Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 1,
    prep: 5,
    cook: 15,
    ingredients: "- 桂圓肉 10g\n- 紅棗 6 枚\n- 枸杞 5g\n- 清水 500ml",
    preparation: "1. 紅棗去核切半。\n2. 全部材料入壺，加水煮沸後文火 15 分鐘。\n3. 代茶飲。",
    indication: "心脾兩虛、心悸失眠、健忘多夢、面色蒼白、女性血虛、思慮過度。",
    principle: "補益心脾，養血安神。",
    season: "winter",
    contraindications: "陰虛火旺、痰濕內盛者慎用。",
    source: "公有領域",
    patternPinyin: "Xin Xue Xu",
  },
  {
    pinyinName: "Xing Ren Lu",
    chineseName: "杏仁露",
    englishName: "Almond Milk Sweet Drink",
    category: "Drink",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 30,
    ingredients: "- 南杏 30g\n- 北杏 5g\n- 粳米 30g\n- 冰糖 20g\n- 清水 800ml",
    preparation:
      "1. 南杏、北杏、粳米浸泡 30 分鐘。\n2. 連水放入攪拌機打成漿。\n3. 入鍋加冰糖煮沸後不斷攪拌，文火 20 分鐘至濃稠。\n4. 過篩去渣即可。",
    indication: "肺燥乾咳、皮膚乾燥粗糙、便秘、秋季養顏。",
    principle: "潤肺止咳，潤腸通便，養顏。",
    season: "autumn",
    contraindications: "脾虛便溏者少飲。北杏（苦杏仁）有小毒，用量不可超過 9g。",
    source: "公有領域 — 嶺南傳統食療",
  },
  {
    pinyinName: "Ren Shen Han Yang Tang",
    chineseName: "人參燉牛肉湯",
    englishName: "Ginseng-Stewed Beef Soup",
    category: "Stew",
    difficulty: "medium",
    servings: 3,
    prep: 15,
    cook: 120,
    ingredients: "- 人參 5g\n- 牛肉 500g\n- 紅棗 6 枚\n- 薑片 4 片\n- 黃酒 1 湯匙\n- 鹽 適量",
    preparation:
      "1. 牛肉切塊汆水。\n2. 人參、紅棗、薑片入鍋，加水、黃酒。\n3. 武火煮沸後文火燉 2 小時。\n4. 加鹽調味。",
    indication: "大病初癒、極度虛弱、氣短乏力、四肢不溫、食慾不振。",
    principle: "大補元氣，溫養脾胃。",
    season: "winter",
    contraindications: "高血壓、陰虛火旺、外感發熱、實熱體質禁用。",
    notes: "人參溫熱，不可久服或大量服用。",
    source: "公有領域",
  },
  {
    pinyinName: "Lu Dou Tang",
    chineseName: "綠豆湯",
    englishName: "Mung Bean Soup",
    category: "Drink",
    difficulty: "easy",
    servings: 4,
    prep: 30,
    cook: 60,
    ingredients: "- 綠豆 100g\n- 冰糖 30g（可省）\n- 清水 1500ml",
    preparation:
      "1. 綠豆浸泡 30 分鐘。\n2. 入鍋加水煮沸後文火 60 分鐘至豆爛開花。\n3. 加冰糖煮溶（亦可不加）。\n4. 冷藏後夏日飲用尤佳。",
    indication: "暑熱煩渴、口乾、青春痘、皮膚痘瘡、夏季中暑、藥物中毒輕症。",
    principle: "清熱解毒，消暑利水。",
    season: "summer",
    contraindications: "脾胃虛寒、腹瀉、經期女性少飲。服中藥期間應避免（恐解藥性）。",
    source: "公有領域",
  },
  {
    pinyinName: "Ai Cao Shu Tang Shui",
    chineseName: "艾草薯糖水",
    englishName: "Mugwort and Sweet Potato Sweet Soup",
    category: "Dessert",
    difficulty: "easy",
    servings: 2,
    prep: 15,
    cook: 45,
    ingredients: "- 艾草 30g（新鮮）\n- 番薯 300g\n- 紅糖 30g\n- 老薑 3 片\n- 清水 1000ml",
    preparation:
      "1. 艾草洗淨切段，番薯去皮切塊。\n2. 老薑、艾草入鍋煮沸 10 分鐘。\n3. 加入番薯文火 25 分鐘。\n4. 加紅糖煮溶。",
    indication: "經期受寒、虛寒腹痛、宮寒不孕、產後血虛、四肢冰涼。",
    principle: "溫經散寒，活血止痛。",
    season: "winter",
    contraindications: "陰虛血熱、月經量過多者忌服。",
    source: "公有領域 — 客家傳統食療",
    patternPinyin: "Feng Han",
  },
  {
    pinyinName: "He Tao Hei Zhi Ma Hu",
    chineseName: "核桃黑芝麻糊",
    englishName: "Walnut and Black Sesame Paste",
    category: "Dessert",
    difficulty: "easy",
    servings: 2,
    prep: 5,
    cook: 20,
    ingredients: "- 核桃仁 30g\n- 黑芝麻 50g\n- 糯米粉 20g\n- 冰糖 20g\n- 清水 600ml",
    preparation:
      "1. 黑芝麻、核桃乾鍋炒香（不焦）。\n2. 加糯米粉、水、冰糖一同入攪拌機打成漿。\n3. 入鍋邊煮邊攪拌至濃稠（約 15 分鐘）。",
    indication: "腎虛腰膝酸軟、鬚髮早白、便秘、產後乳少、健腦益智。",
    principle: "補腎益精，烏髮潤腸。",
    season: "autumn",
    contraindications: "脾虛便溏者少食。",
    source: "公有領域",
    patternPinyin: "Shen Yin Xu",
  },
  {
    pinyinName: "Mao Gen Ma Ti Shui",
    chineseName: "茅根馬蹄水",
    englishName: "Imperata and Water Chestnut Drink",
    category: "Drink",
    difficulty: "easy",
    servings: 4,
    prep: 10,
    cook: 60,
    ingredients: "- 鮮白茅根 60g（或乾品 30g）\n- 馬蹄（荸薺）10 個\n- 竹蔗 1 段\n- 冰糖 適量\n- 清水 1500ml",
    preparation:
      "1. 馬蹄去皮，竹蔗切段拍裂。\n2. 全部材料入鍋加水。\n3. 武火煮沸後文火 60 分鐘。\n4. 隔渣，加冰糖飲用。",
    indication: "肺胃熱盛、口渴煩躁、小便短赤、咽喉腫痛、口腔潰瘍、暑熱口乾。",
    principle: "清熱利尿，生津止渴。",
    season: "summer",
    contraindications: "脾胃虛寒、孕婦慎用。",
    source: "公有領域 — 嶺南傳統涼茶",
  },
  {
    pinyinName: "Yu Mi Xu Cha",
    chineseName: "玉米鬚茶",
    englishName: "Corn Silk Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 1,
    prep: 5,
    cook: 15,
    ingredients: "- 玉米鬚 30g（鮮品 50g）\n- 清水 500ml",
    preparation: "1. 玉米鬚洗淨。\n2. 入壺加水煮沸後文火 15 分鐘。\n3. 代茶飲，可續水。",
    indication: "水腫、小便不利、血壓偏高、血糖偏高、慢性腎炎、膽石症輔助調理。",
    principle: "利水消腫，清肝利膽。",
    season: "all-season",
    source: "公有領域",
    conditionWestern: ["Essential Hypertension", "Type 2 Diabetes Mellitus"],
  },
  {
    pinyinName: "Suan Zao Ren Zhou",
    chineseName: "酸棗仁粥",
    englishName: "Sour Jujube Seed Porridge",
    category: "Porridge",
    difficulty: "easy",
    servings: 2,
    prep: 30,
    cook: 60,
    ingredients: "- 炒酸棗仁 30g\n- 粳米 60g\n- 冰糖 10g\n- 清水 1200ml",
    preparation:
      "1. 酸棗仁打碎或保留整粒，先煎 20 分鐘取汁。\n2. 入粳米同煮成粥（約 40 分鐘）。\n3. 加冰糖調味。睡前 1 小時溫服。",
    indication: "虛煩失眠、多夢易醒、心悸、盜汗、神經衰弱。",
    principle: "養心安神，斂汗除煩。",
    season: "all-season",
    source: "公有領域 — 化裁自《金匱要略》酸棗仁湯",
    patternPinyin: "Xin Xue Xu",
    conditionWestern: ["Primary Insomnia"],
  },
  {
    pinyinName: "Tian Ma Yu Tou Tang",
    chineseName: "天麻魚頭湯",
    englishName: "Gastrodia and Fish Head Soup",
    category: "Soup",
    difficulty: "medium",
    servings: 3,
    prep: 15,
    cook: 60,
    ingredients: "- 天麻 15g\n- 鰱魚頭 1 個（約 500g）\n- 川芎 5g\n- 薑片 3 片\n- 葱段 適量\n- 鹽 適量",
    preparation:
      "1. 魚頭洗淨煎兩面金黃。\n2. 天麻溫水浸泡 30 分鐘切片。\n3. 全部材料入砂鍋加水。\n4. 武火煮沸後文火 45 分鐘。\n5. 加鹽、葱調味。",
    indication: "頭暈頭痛、肝陽上亢之眩暈、神經性頭痛、偏頭痛、高血壓頭暈。",
    principle: "息風止痙，平肝潛陽，活血通絡。",
    season: "all-season",
    contraindications: "氣血虛弱之頭暈者單用天麻效果欠佳。",
    source: "公有領域",
    conditionWestern: ["Migraine", "Essential Hypertension"],
  },
  {
    pinyinName: "Bai He Ji Dan Tang",
    chineseName: "百合雞蛋湯",
    englishName: "Lily Bulb and Egg Yolk Soup",
    category: "Soup",
    difficulty: "easy",
    servings: 1,
    prep: 5,
    cook: 30,
    ingredients: "- 鮮百合 50g（或乾百合 25g）\n- 雞蛋黃 1 個\n- 冰糖 10g\n- 清水 500ml",
    preparation:
      "1. 百合先煮 25 分鐘至軟爛。\n2. 雞蛋黃打散沖入溫熱湯中。\n3. 加冰糖溶化即可。",
    indication: "更年期煩躁不安、心煩失眠、虛勞乾咳、口乾舌燥。",
    principle: "養陰潤肺，清心安神。",
    season: "all-season",
    source: "公有領域 — 化裁自《金匱要略》百合雞子黃湯",
    conditionWestern: ["Menopausal Syndrome", "Primary Insomnia"],
  },
  {
    pinyinName: "Pu Gong Ying Da Mi Zhou",
    chineseName: "蒲公英大米粥",
    englishName: "Dandelion Rice Porridge",
    category: "Porridge",
    difficulty: "easy",
    servings: 2,
    prep: 10,
    cook: 45,
    ingredients: "- 蒲公英 30g（鮮品 50g）\n- 粳米 50g\n- 鹽 少許\n- 清水 1000ml",
    preparation:
      "1. 蒲公英洗淨切碎。\n2. 粳米加水煮沸後文火 30 分鐘。\n3. 加蒲公英續煮 10 分鐘。\n4. 加少許鹽調味。",
    indication: "肝胃鬱熱、口苦口臭、咽喉腫痛、乳房脹痛、急性炎症、痤瘡。",
    principle: "清熱解毒，消癰散結。",
    season: "summer",
    contraindications: "陽虛體質、慢性腹瀉者慎用。",
    source: "公有領域",
  },
  {
    pinyinName: "Du Zhong Yao Zi Tang",
    chineseName: "杜仲腰子湯",
    englishName: "Eucommia and Kidney Soup",
    category: "Soup",
    difficulty: "medium",
    servings: 2,
    prep: 20,
    cook: 60,
    ingredients: "- 杜仲 15g\n- 豬腰 1 對\n- 枸杞 10g\n- 薑片 3 片\n- 米酒 1 湯匙\n- 鹽 適量",
    preparation:
      "1. 豬腰剖開去除尿臊腺，切片，用米酒、薑片醃 10 分鐘後汆水。\n2. 杜仲、枸杞加水煮 20 分鐘。\n3. 加豬腰煮 10 分鐘。\n4. 加鹽調味。",
    indication: "腎虛腰膝酸痛、夜尿頻多、性功能減退、慢性下背痛。",
    principle: "補肝腎，強筋骨。",
    season: "winter",
    source: "公有領域",
    patternPinyin: "Shen Yang Xu",
    conditionWestern: ["Chronic Low Back Pain"],
  },
  {
    pinyinName: "Ling Zhi Cao Cha",
    chineseName: "靈芝草茶",
    englishName: "Reishi Tea",
    category: "Tea",
    difficulty: "easy",
    servings: 2,
    prep: 10,
    cook: 60,
    ingredients: "- 靈芝（薄片）10g\n- 紅棗 5 枚\n- 枸杞 10g\n- 清水 800ml",
    preparation: "1. 靈芝切薄片或購買切片產品。\n2. 全部材料入壺，加水煮沸後文火 60 分鐘。\n3. 代茶飲，可續水 2 次。",
    indication: "免疫力低下、疲勞、失眠、慢性疲勞綜合徵、化療後體虛。",
    principle: "扶正固本，補氣安神。",
    season: "all-season",
    contraindications: "出血傾向、術前 2 週應停用（抗凝作用）。",
    source: "公有領域",
    conditionWestern: ["Chronic Fatigue Syndrome"],
  },
];

async function main() {
  console.log(`[seed-food-therapy] inserting ${RECIPES.length} recipes…\n`);
  const patterns = await prisma.tcmPattern.findMany({ select: { id: true, pinyinName: true } });
  const patternByPinyin = new Map(patterns.map((p) => [p.pinyinName, p.id]));
  const conds = await prisma.conditionMapping.findMany({ select: { id: true, westernName: true } });
  const condByName = new Map(conds.map((c) => [c.westernName, c.id]));

  let added = 0, skipped = 0, condLinks = 0;
  for (const r of RECIPES) {
    const existing = await prisma.foodTherapyRecipe.findUnique({
      where: { pinyinName: r.pinyinName },
      select: { id: true },
    });
    if (existing) {
      console.log(`  ↷ ${r.chineseName} (${r.pinyinName}) — exists`);
      skipped++;
      continue;
    }
    const patternId = r.patternPinyin ? patternByPinyin.get(r.patternPinyin) ?? null : null;
    const recipe = await prisma.foodTherapyRecipe.create({
      data: {
        pinyinName: r.pinyinName,
        chineseName: r.chineseName,
        englishName: r.englishName,
        category: r.category,
        difficulty: r.difficulty,
        servings: r.servings,
        prepTimeMinutes: r.prep,
        cookTimeMinutes: r.cook,
        ingredients: r.ingredients,
        preparation: r.preparation,
        indication: r.indication,
        treatmentPrinciple: r.principle,
        season: r.season,
        contraindications: r.contraindications,
        notes: r.notes,
        source: r.source,
        patternId,
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    added++;
    for (const w of r.conditionWestern ?? []) {
      const cid = condByName.get(w);
      if (cid) {
        try {
          await prisma.foodTherapyConditionLink.create({ data: { recipeId: recipe.id, conditionId: cid } });
          condLinks++;
        } catch { /* dup */ }
      }
    }
    console.log(`  ✓ ${r.chineseName} (${r.pinyinName})${r.patternPinyin ? ` → ${r.patternPinyin}` : ""}`);
  }
  console.log(`\n[seed-food-therapy] +${added} new, ${skipped} skipped, +${condLinks} condition links.`);
  const total = await prisma.foodTherapyRecipe.count();
  console.log(`  DB total food-therapy recipes: ${total}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
