import type { HerbStatus } from "@/generated/prisma/client";

/**
 * Seed data for 20 classical Traditional Chinese Medicine formulas.
 */

export const formulasData = [
  {
    pinyinName: "Bu Zhong Yi Qi Tang",
    chineseName: "补中益气汤",
    englishName: "Tonify the Middle and Augment the Qi Decoction",
    sourceText: "Pi Wei Lun (脾胃论) by Li Dong-Yuan, 1249",
    category: "Qi-Tonifying",
    actions:
      "補中益氣，升陽舉陷。",
    indications:
      "脾胃氣虛，中氣下陷證。症見食少腹脹、體倦肢軟、少氣懶言、面色萎白、大便稀溏、脈大而虛，舌淡苔白。亦治氣虛發熱、氣虛下陷之脫肛、子宮脫垂、久瀉久痢等。",
    modifications:
      "氣虛甚者，重用黃芪。頭痛因氣虛者，加蔓荊子、藁本。脫肛者，加枳殼。血虛者，加當歸。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Liu Wei Di Huang Wan",
    chineseName: "六味地黄丸",
    englishName: "Six-Ingredient Rehmannia Pill",
    sourceText: "Xiao Er Yao Zheng Zhi Jue (小儿药证直诀) by Qian Yi, 1119",
    category: "Yin-Tonifying",
    actions:
      "滋補腎陰。",
    indications:
      "腎陰虧損證。症見腰膝酸軟、頭暈耳鳴、盜汗遺精、骨蒸潮熱、手足心熱、口燥咽乾、牙齒動搖、足跟作痛、小便淋瀝，以及小兒囟門不合。舌紅少苔，脈細數。",
    modifications:
      "陰虛火旺甚者，加知母、黃柏（知柏地黃丸）。肝腎陰虛兼目昏者，加枸杞子、菊花（杞菊地黃丸）。肺腎陰虛者，加五味子、麥冬（麥味地黃丸）。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Si Jun Zi Tang",
    chineseName: "四君子汤",
    englishName: "Four Gentlemen Decoction",
    sourceText: "Tai Ping Hui Min He Ji Ju Fang (太平惠民和剂局方), 1107",
    category: "Qi-Tonifying",
    actions:
      "益氣健脾。",
    indications:
      "脾胃氣虛證。症見面色萎白、語聲低微、食少便溏、四肢無力。舌淡苔白，脈虛弱。",
    modifications:
      "氣虛甚者，加黃芪。食少兼食滯者，加山楂、麥芽。嘔惡者，加半夏。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Si Wu Tang",
    chineseName: "四物汤",
    englishName: "Four Substance Decoction",
    sourceText: "Tai Ping Hui Min He Ji Ju Fang (太平惠民和剂局方), 1107",
    category: "Blood-Tonifying",
    actions:
      "補血調肝，調經化瘀。",
    indications:
      "營血虛滯證。症見頭暈目眩、面色無華、唇甲色淡、心悸失眠、月經不調、量少色淡或經閉不行、臍腹作痛。舌淡苔白，脈細弦或細澀。",
    modifications:
      "血瘀者，加桃仁、紅花（桃紅四物湯）。血虛有寒者，加艾葉、香附。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Ba Zhen Tang",
    chineseName: "八珍汤",
    englishName: "Eight Treasure Decoction",
    sourceText: "Zheng Ti Lei Yao (正体类要) by Xue Ji, 1529",
    category: "Qi-and-Blood Tonifying",
    actions:
      "益氣補血。",
    indications:
      "氣血兩虛證。症見面色蒼白或萎黃、心悸怔忡、食少體倦、少氣懶言、頭暈目眩、肢體酸軟。舌淡苔白，脈細弱或虛。",
    modifications:
      "血虛甚者，重用熟地黃、當歸。四肢不溫、陽虛者，加肉桂、黃芪。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Xiao Yao San",
    chineseName: "逍遥散",
    englishName: "Free and Easy Wanderer Powder",
    sourceText: "Tai Ping Hui Min He Ji Ju Fang (太平惠民和剂局方), 1107",
    category: "Harmonizing",
    actions:
      "疏肝解鬱，健脾養血，調和肝脾。",
    indications:
      "肝鬱脾虛血虛證。症見兩脅作痛、頭痛目眩、口燥咽乾、神疲食少、或見寒熱往來、月經不調、乳房脹痛。舌淡紅，脈弦而虛。",
    modifications:
      "肝鬱化火者，加牡丹皮、梔子（加味逍遙散／丹梔逍遙散）。血虛甚者，重用當歸、白芍。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Gui Pi Tang",
    chineseName: "归脾汤",
    englishName: "Restore the Spleen Decoction",
    sourceText: "Ji Sheng Fang (济生方) by Yan Yong-He, 1253",
    category: "Qi-and-Blood Tonifying",
    actions:
      "益氣補血，健脾養心。",
    indications:
      "心脾兩虛，氣血不足證。症見心悸怔忡、失眠多夢、健忘、食少體倦、面色萎黃，或月經超前、量多色淡、淋漓不止，或皮下出血。舌淡苔白，脈細弱。",
    modifications:
      "失眠甚者，重用酸棗仁、龍眼肉。崩漏不止者，加阿膠、艾葉。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Yin Qiao San",
    chineseName: "银翘散",
    englishName: "Honeysuckle and Forsythia Powder",
    sourceText: "Wen Bing Tiao Bian (温病条辨) by Wu Ju-Tong, 1798",
    category: "Exterior-Releasing (Wind-Heat)",
    actions:
      "辛涼透表，清熱解毒。",
    indications:
      "溫病初起，風熱犯衛證。症見發熱、微惡風寒、頭痛、口渴、咳嗽、咽痛。舌尖紅苔薄白或薄黃，脈浮數。",
    modifications:
      "咽喉腫痛甚者，加馬勃、射干。渴甚傷津者，加天花粉。咳嗽甚者，重用薄荷，加杏仁。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Ma Xing Shi Gan Tang",
    chineseName: "麻杏石甘汤",
    englishName: "Ephedra, Apricot Kernel, Gypsum, and Licorice Decoction",
    sourceText: "Shang Han Lun (伤寒论) by Zhang Zhong-Jing, c. 220",
    category: "Heat-Clearing",
    actions:
      "宣肺清熱，止咳平喘。",
    indications:
      "邪熱壅肺證。症見身熱、有汗或無汗、口渴、喘息氣急、咳嗽、鼻翼煽動。舌紅苔黃，脈滑數。",
    modifications:
      "痰黃稠多者，加黃芩、瓜蔞。高熱甚者，重用石膏。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Xiao Chai Hu Tang",
    chineseName: "小柴胡汤",
    englishName: "Minor Bupleurum Decoction",
    sourceText: "Shang Han Lun (伤寒论) by Zhang Zhong-Jing, c. 220",
    category: "Harmonizing",
    actions:
      "和解少陽，調和肝脾。",
    indications:
      "少陽病證（半表半裏）。症見寒熱往來、胸脅苦滿、默默不欲飲食、心煩喜嘔、口苦咽乾、目眩。舌苔薄白，脈弦。",
    modifications:
      "胸脅滿悶甚者，去大棗，加瓜蔞皮。渴者，去半夏，加天花粉。腹痛者，加白芍。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Ban Xia Xie Xin Tang",
    chineseName: "半夏泻心汤",
    englishName: "Pinellia Decoction to Drain the Epigastrium",
    sourceText: "Shang Han Lun (伤寒论) by Zhang Zhong-Jing, c. 220",
    category: "Harmonizing",
    actions:
      "和胃降逆，開結消痞，寒熱並調。",
    indications:
      "寒熱互結之痞證，脾胃不和。症見心下痞滿、按之不痛、但滿而不硬、噁心嘔吐、腸鳴下利。舌苔薄黃而膩，脈弦數。",
    modifications:
      "嘔吐甚者，重用半夏。下利甚者，重用黃連。食少者，加陳皮、白朮。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Liu Jun Zi Tang",
    chineseName: "六君子汤",
    englishName: "Six Gentlemen Decoction",
    sourceText: "Yi Xue Zheng Zhuan (医学正传) by Yu Tuan, 1515",
    category: "Qi-Tonifying",
    actions:
      "益氣健脾，燥濕化痰。",
    indications:
      "脾胃氣虛兼痰濕證。症見食少、噁心嘔吐、胸脘痞悶、咳嗽痰多色白、大便溏薄。舌淡苔白膩，脈細滑。",
    modifications:
      "嘔吐甚者，加砂仁。胸悶腹脹者，加香附、木香。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Er Chen Tang",
    chineseName: "二陈汤",
    englishName: "Two Aged Ingredients Decoction",
    sourceText: "Tai Ping Hui Min He Ji Ju Fang (太平惠民和剂局方), 1107",
    category: "Phlegm-Resolving",
    actions:
      "燥濕化痰，理氣和中。",
    indications:
      "濕痰內阻證。症見咳嗽痰多色白易咯、胸膈痞悶、噁心嘔吐、頭暈心悸。舌胖苔白膩，脈滑。",
    modifications:
      "風痰眩暈者，加天麻、白朮。痰熱者，加黃芩、瓜蔞。食滯者，加山楂、神曲。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Tian Wang Bu Xin Dan",
    chineseName: "天王补心丹",
    englishName: "Emperor of Heaven's Special Pill to Tonify the Heart",
    sourceText: "She Sheng Mi Pou (摄生秘剖) by Hong Ji, 1638",
    category: "Yin-Tonifying (Heart-Nourishing)",
    actions:
      "滋陰養血，補心安神。",
    indications:
      "陰虧血少，心腎不交證。症見心悸怔忡、虛煩失眠、多夢健忘、神疲、夢遺、低熱盜汗、大便乾結、口舌生瘡。舌紅少苔，脈細數。",
    modifications:
      "失眠甚者，重用酸棗仁、柏子仁。心悸甚者，加龍骨、牡蠣。便秘者，加火麻仁。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Du Huo Ji Sheng Tang",
    chineseName: "独活寄生汤",
    englishName: "Angelica Pubescens and Sang-Ji-Sheng Decoction",
    sourceText: "Bei Ji Qian Jin Yao Fang (备急千金要方) by Sun Si-Miao, 652",
    category: "Wind-Dampness Dispelling",
    actions:
      "祛風濕，止痺痛，補肝腎，益氣血。",
    indications:
      "痺證日久，肝腎兩虧，氣血不足證。症見腰膝酸痛沉重、關節屈伸不利、或麻木不仁、遇寒加重、心悸氣短、畏寒肢冷。舌淡苔白，脈細弱遲。",
    modifications:
      "寒痛甚者，加附子、細辛。血瘀明顯者，加桃仁、紅花。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Suan Zao Ren Tang",
    chineseName: "酸枣仁汤",
    englishName: "Sour Jujube Decoction",
    sourceText: "Jin Gui Yao Lue (金匮要略) by Zhang Zhong-Jing, c. 220",
    category: "Spirit-Calming",
    actions:
      "養血安神，清熱除煩。",
    indications:
      "肝血不足，虛熱內擾證。症見虛煩失眠、心悸不安、盜汗、頭暈目眩、口燥咽乾。舌紅少苔，脈弦細或細數。",
    modifications:
      "心悸甚者，加龍骨、牡蠣。汗出甚者，加五味子、黃芪。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Gui Zhi Tang",
    chineseName: "桂枝汤",
    englishName: "Cinnamon Twig Decoction",
    sourceText: "Shang Han Lun (伤寒论) by Zhang Zhong-Jing, c. 220",
    category: "Exterior-Releasing (Wind-Cold)",
    actions:
      "解肌發表，調和營衛。",
    indications:
      "外感風寒表虛證（太陽中風）。症見發熱、頭痛、汗出、惡風、鼻塞、項強、噴嚏。舌淡紅苔薄白而潤，脈浮緩或浮弱。",
    modifications:
      "惡寒甚而身痛者，加附子（桂枝加附子湯）。胸悶者，加厚朴、杏仁。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Bu Yang Huan Wu Tang",
    chineseName: "补阳还五汤",
    englishName: "Tonify Yang to Restore Five-Tenths Decoction",
    sourceText: "Yi Lin Gai Cuo (医林改错) by Wang Qing-Ren, 1830",
    category: "Blood-Invigorating",
    actions:
      "補氣活血，通經活絡。",
    indications:
      "中風後遺症，氣虛血瘀證。症見半身不遂、口眼㖞斜、語言蹇澀、口角流涎、小便頻數或遺尿不禁、下肢痿廢。舌暗淡苔白，脈緩或沉。",
    modifications:
      "上肢偏重者，加桂枝、桑枝。下肢偏重者，加杜仲、牛膝。面癱者，加白附子、全蠍。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Huang Lian Jie Du Tang",
    chineseName: "黄连解毒汤",
    englishName: "Coptis Decoction to Relieve Toxicity",
    sourceText: "Wai Tai Mi Yao (外台秘要) by Wang Tao, 752",
    category: "Heat-Clearing and Toxin-Resolving",
    actions:
      "瀉火解毒。",
    indications:
      "三焦火毒證。症見大熱煩躁、口燥咽乾、譫語不眠、或熱病吐血衄血、或熱甚發斑、或身熱下利、或濕熱黃疸、或外科癰疽瘡瘍。舌紅苔黃，脈數有力。",
    modifications:
      "吐血衄血甚者，加生地黃、牡丹皮。癰疽瘡瘍者，加金銀花、連翹。",
    status: "PUBLISHED" as HerbStatus,
  },
  {
    pinyinName: "Sheng Mai San",
    chineseName: "生脉散",
    englishName: "Generate the Pulse Powder",
    sourceText: "Yi Xue Qi Yuan (医学启源) by Zhang Yuan-Su, 1186",
    category: "Qi-and-Yin Tonifying",
    actions:
      "益氣生津，斂陰止汗。",
    indications:
      "氣陰兩虧，肺虛久咳證。症見久咳不已、痰少而稀、氣短自汗、口乾舌燥、神疲乏力、心悸。舌淡紅而乾苔薄，脈虛數或細。亦治暑熱耗傷氣陰。",
    modifications:
      "氣虛甚者，加黃芪。陰虛有熱者，加生地黃、石斛。",
    status: "PUBLISHED" as HerbStatus,
  },
];

export const formulaCompositions = [
  // 1. Bu Zhong Yi Qi Tang
  {
    formulaPinyin: "Bu Zhong Yi Qi Tang",
    herbs: [
      { herbPinyin: "Huang Qi", role: "JUN" as const, dosage: "15-30g", notes: "Tonifies Spleen and Lung Qi, raises the Yang Qi" },
      { herbPinyin: "Ren Shen", role: "CHEN" as const, dosage: "9-12g", notes: "Strongly tonifies the primal Qi" },
      { herbPinyin: "Bai Zhu", role: "CHEN" as const, dosage: "9g", notes: "Strengthens the Spleen, dries Dampness" },
      { herbPinyin: "Dang Gui", role: "ZUO" as const, dosage: "9g", notes: "Tonifies and invigorates the Blood" },
      { herbPinyin: "Chen Pi", role: "ZUO" as const, dosage: "6g", notes: "Regulates Qi, prevents Qi stagnation from tonifying herbs" },
      { herbPinyin: "Chai Hu", role: "ZUO" as const, dosage: "6g", notes: "Raises the Yang Qi of the Stomach and Spleen" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Tonifies the Spleen, harmonizes the formula" },
      { herbPinyin: "Da Zao", role: "SHI" as const, dosage: "6g", notes: "Tonifies the Spleen, nourishes the Blood" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "3 slices", notes: "Harmonizes the Stomach" },
    ],
  },
  // 2. Liu Wei Di Huang Wan
  {
    formulaPinyin: "Liu Wei Di Huang Wan",
    herbs: [
      { herbPinyin: "Shu Di Huang", role: "JUN" as const, dosage: "24g", notes: "Nourishes Kidney Yin, fills the marrow" },
      { herbPinyin: "Shan Zhu Yu", role: "CHEN" as const, dosage: "12g", notes: "Nourishes the Liver, secures the Kidney essence" },
      { herbPinyin: "Shan Yao", role: "CHEN" as const, dosage: "12g", notes: "Tonifies the Spleen, stabilizes the Kidney" },
      { herbPinyin: "Ze Xie", role: "ZUO" as const, dosage: "9g", notes: "Drains Kidney fire, prevents Shu Di Huang from being cloying" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Leeches out Dampness, assists Shan Yao in strengthening the Spleen" },
      { herbPinyin: "Mu Xiang", role: "SHI" as const, dosage: "9g", notes: "Moves Qi, aids absorption" },
    ],
  },
  // 3. Si Jun Zi Tang
  {
    formulaPinyin: "Si Jun Zi Tang",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN" as const, dosage: "9g", notes: "Powerfully tonifies the primal Qi of the Spleen and Stomach" },
      { herbPinyin: "Bai Zhu", role: "CHEN" as const, dosage: "9g", notes: "Strengthens the Spleen, dries Dampness" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Leaches out Dampness, strengthens the Spleen" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Tonifies the Spleen, harmonizes the other herbs" },
    ],
  },
  // 4. Si Wu Tang
  {
    formulaPinyin: "Si Wu Tang",
    herbs: [
      { herbPinyin: "Shu Di Huang", role: "JUN" as const, dosage: "12-15g", notes: "Nourishes the Blood, enriches the Yin" },
      { herbPinyin: "Dang Gui", role: "CHEN" as const, dosage: "9-12g", notes: "Tonifies and invigorates the Blood, regulates menstruation" },
      { herbPinyin: "Bai Shao", role: "ZUO" as const, dosage: "9-12g", notes: "Nourishes the Blood, preserves the Yin, softens the Liver" },
      { herbPinyin: "Chuan Xiong", role: "SHI" as const, dosage: "6-9g", notes: "Invigorates Blood, moves Qi, prevents stasis from tonifying herbs" },
    ],
  },
  // 5. Ba Zhen Tang
  {
    formulaPinyin: "Ba Zhen Tang",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN" as const, dosage: "9g", notes: "Tonifies the primal Qi" },
      { herbPinyin: "Shu Di Huang", role: "JUN" as const, dosage: "15g", notes: "Nourishes the Blood, enriches Yin" },
      { herbPinyin: "Bai Zhu", role: "CHEN" as const, dosage: "9g", notes: "Strengthens the Spleen, dries Dampness" },
      { herbPinyin: "Dang Gui", role: "CHEN" as const, dosage: "9g", notes: "Tonifies and invigorates the Blood" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Leaches out Dampness, strengthens the Spleen" },
      { herbPinyin: "Bai Shao", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Blood, preserves the Yin" },
      { herbPinyin: "Chuan Xiong", role: "ZUO" as const, dosage: "6g", notes: "Invigorates Blood, moves Qi" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "3g", notes: "Harmonizes the formula" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "3 slices", notes: "Harmonizes the Stomach" },
      { herbPinyin: "Da Zao", role: "SHI" as const, dosage: "3 pieces", notes: "Tonifies the Spleen, nourishes the Blood" },
    ],
  },
  // 6. Xiao Yao San
  {
    formulaPinyin: "Xiao Yao San",
    herbs: [
      { herbPinyin: "Chai Hu", role: "JUN" as const, dosage: "9g", notes: "Soothes the Liver, resolves depression" },
      { herbPinyin: "Dang Gui", role: "CHEN" as const, dosage: "9g", notes: "Tonifies and invigorates the Blood" },
      { herbPinyin: "Bai Shao", role: "CHEN" as const, dosage: "9g", notes: "Nourishes the Blood, softens the Liver, alleviates pain" },
      { herbPinyin: "Bai Zhu", role: "ZUO" as const, dosage: "9g", notes: "Strengthens the Spleen" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Strengthens the Spleen, leaches Dampness" },
      { herbPinyin: "Bo He", role: "ZUO" as const, dosage: "3g", notes: "Assists Chai Hu in spreading Liver Qi" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "3 slices", notes: "Harmonizes the Stomach" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Harmonizes the formula, moderates the Liver" },
    ],
  },
  // 7. Gui Pi Tang
  {
    formulaPinyin: "Gui Pi Tang",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN" as const, dosage: "9g", notes: "Tonifies the Spleen and Heart Qi" },
      { herbPinyin: "Huang Qi", role: "JUN" as const, dosage: "12g", notes: "Augments the Qi, raises the Yang" },
      { herbPinyin: "Bai Zhu", role: "CHEN" as const, dosage: "9g", notes: "Strengthens the Spleen" },
      { herbPinyin: "Dang Gui", role: "CHEN" as const, dosage: "9g", notes: "Tonifies and nourishes the Blood" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Strengthens the Spleen, calms the Spirit" },
      { herbPinyin: "Suan Zao Ren", role: "ZUO" as const, dosage: "12g", notes: "Nourishes the Heart, calms the Spirit" },
      { herbPinyin: "Long Yan Rou", role: "ZUO" as const, dosage: "12g", notes: "Nourishes the Blood, calms the Spirit" },
      { herbPinyin: "Yuan Zhi", role: "ZUO" as const, dosage: "6g", notes: "Calms the Spirit, promotes communication between Heart and Kidney" },
      { herbPinyin: "Mu Xiang", role: "ZUO" as const, dosage: "6g", notes: "Moves Qi, prevents stagnation from tonifying herbs" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "3g", notes: "Harmonizes the formula" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "3 slices", notes: "Harmonizes the Stomach" },
      { herbPinyin: "Da Zao", role: "SHI" as const, dosage: "3 pieces", notes: "Tonifies the Spleen, nourishes the Blood" },
    ],
  },
  // 8. Yin Qiao San
  {
    formulaPinyin: "Yin Qiao San",
    herbs: [
      { herbPinyin: "Jin Yin Hua", role: "JUN" as const, dosage: "15g", notes: "Clears Heat, resolves toxin" },
      { herbPinyin: "Lian Qiao", role: "JUN" as const, dosage: "15g", notes: "Clears Heat, resolves toxin, disperses Wind-Heat" },
      { herbPinyin: "Bo He", role: "CHEN" as const, dosage: "6g", notes: "Disperses Wind-Heat, benefits the throat" },
      { herbPinyin: "Ge Gen", role: "ZUO" as const, dosage: "9g", notes: "Releases the exterior, generates fluids" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Clears Heat, resolves toxin, harmonizes" },
    ],
  },
  // 9. Ma Xing Shi Gan Tang
  {
    formulaPinyin: "Ma Xing Shi Gan Tang",
    herbs: [
      { herbPinyin: "Ma Huang", role: "JUN" as const, dosage: "6g", notes: "Facilitates Lung Qi, releases the exterior, calms wheezing" },
      { herbPinyin: "Shi Gao", role: "CHEN" as const, dosage: "24g", notes: "Clears Lung Heat, generates fluids" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Harmonizes the formula, moistens the Lung" },
    ],
  },
  // 10. Xiao Chai Hu Tang
  {
    formulaPinyin: "Xiao Chai Hu Tang",
    herbs: [
      { herbPinyin: "Chai Hu", role: "JUN" as const, dosage: "12-24g", notes: "Resolves the Shao Yang, clears Heat" },
      { herbPinyin: "Huang Qin", role: "CHEN" as const, dosage: "9g", notes: "Clears interior Heat of the Shao Yang" },
      { herbPinyin: "Ban Xia", role: "ZUO" as const, dosage: "9g", notes: "Harmonizes the Stomach, descends rebellious Qi" },
      { herbPinyin: "Ren Shen", role: "ZUO" as const, dosage: "6g", notes: "Tonifies the Spleen Qi to prevent pathogen penetration" },
      { herbPinyin: "Sheng Jiang", role: "ZUO" as const, dosage: "9g", notes: "Harmonizes the Stomach, assists Ban Xia" },
      { herbPinyin: "Da Zao", role: "SHI" as const, dosage: "4 pieces", notes: "Tonifies the Spleen, nourishes fluids" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Harmonizes the formula" },
    ],
  },
  // 11. Ban Xia Xie Xin Tang
  {
    formulaPinyin: "Ban Xia Xie Xin Tang",
    herbs: [
      { herbPinyin: "Ban Xia", role: "JUN" as const, dosage: "12g", notes: "Descends rebellious Qi, disperses focal distention, harmonizes the Stomach" },
      { herbPinyin: "Huang Qin", role: "CHEN" as const, dosage: "9g", notes: "Clears Heat from the middle Jiao" },
      { herbPinyin: "Huang Lian", role: "CHEN" as const, dosage: "3g", notes: "Clears Heat, dries Dampness" },
      { herbPinyin: "Ren Shen", role: "ZUO" as const, dosage: "9g", notes: "Tonifies the Spleen Qi" },
      { herbPinyin: "Gan Cao", role: "ZUO" as const, dosage: "6g", notes: "Tonifies the Spleen, harmonizes the formula" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "9g", notes: "Warms the middle Jiao, harmonizes the Stomach" },
      { herbPinyin: "Da Zao", role: "SHI" as const, dosage: "4 pieces", notes: "Tonifies the Spleen, nourishes the Blood" },
    ],
  },
  // 12. Liu Jun Zi Tang
  {
    formulaPinyin: "Liu Jun Zi Tang",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN" as const, dosage: "9g", notes: "Tonifies the primal Qi of the Spleen" },
      { herbPinyin: "Bai Zhu", role: "CHEN" as const, dosage: "9g", notes: "Strengthens the Spleen, dries Dampness" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Leaches out Dampness, strengthens the Spleen" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Tonifies the Spleen, harmonizes" },
      { herbPinyin: "Chen Pi", role: "ZUO" as const, dosage: "6g", notes: "Regulates Qi, dries Dampness, transforms Phlegm" },
      { herbPinyin: "Ban Xia", role: "ZUO" as const, dosage: "9g", notes: "Dries Dampness, transforms Phlegm, descends rebellious Qi" },
    ],
  },
  // 13. Er Chen Tang
  {
    formulaPinyin: "Er Chen Tang",
    herbs: [
      { herbPinyin: "Ban Xia", role: "JUN" as const, dosage: "15g", notes: "Dries Dampness, transforms Phlegm, descends rebellious Qi" },
      { herbPinyin: "Chen Pi", role: "CHEN" as const, dosage: "15g", notes: "Regulates Qi, dries Dampness, transforms Phlegm" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Strengthens the Spleen, leaches out Dampness" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "5g", notes: "Harmonizes the formula" },
      { herbPinyin: "Sheng Jiang", role: "SHI" as const, dosage: "7 slices", notes: "Restrains the toxicity of Ban Xia, transforms Phlegm" },
    ],
  },
  // 14. Tian Wang Bu Xin Dan
  {
    formulaPinyin: "Tian Wang Bu Xin Dan",
    herbs: [
      { herbPinyin: "Shu Di Huang", role: "JUN" as const, dosage: "12g", notes: "Nourishes Kidney Yin, enriches the Blood" },
      { herbPinyin: "Ren Shen", role: "CHEN" as const, dosage: "6g", notes: "Tonifies the Qi, calms the Spirit" },
      { herbPinyin: "Dan Shen", role: "CHEN" as const, dosage: "6g", notes: "Clears Heat from the Heart, nourishes the Blood, calms the Spirit" },
      { herbPinyin: "Mai Men Dong", role: "CHEN" as const, dosage: "9g", notes: "Nourishes Yin, clears Heart Heat" },
      { herbPinyin: "Dang Gui", role: "ZUO" as const, dosage: "9g", notes: "Tonifies and nourishes the Blood" },
      { herbPinyin: "Wu Wei Zi", role: "ZUO" as const, dosage: "6g", notes: "Prevents leakage of Heart Qi, calms the Spirit" },
      { herbPinyin: "Suan Zao Ren", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Heart Blood, calms the Spirit" },
      { herbPinyin: "Bai Zi Ren", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Heart, calms the Spirit" },
      { herbPinyin: "Yuan Zhi", role: "ZUO" as const, dosage: "6g", notes: "Calms the Spirit, promotes Heart-Kidney communication" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "6g", notes: "Strengthens the Spleen, calms the Spirit" },
      { herbPinyin: "Gou Qi Zi", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Liver and Kidney Yin" },
    ],
  },
  // 15. Du Huo Ji Sheng Tang
  {
    formulaPinyin: "Du Huo Ji Sheng Tang",
    herbs: [
      { herbPinyin: "Du Huo", role: "JUN" as const, dosage: "9g", notes: "Dispels Wind-Dampness from the lower Jiao and joints" },
      { herbPinyin: "Sang Ji Sheng", role: "CHEN" as const, dosage: "9g", notes: "Tonifies the Liver and Kidneys, strengthens sinews and bones, expels Wind-Dampness" },
      { herbPinyin: "Du Zhong", role: "CHEN" as const, dosage: "9g", notes: "Tonifies the Liver and Kidneys, strengthens sinews and bones" },
      { herbPinyin: "Qiang Huo", role: "CHEN" as const, dosage: "6g", notes: "Dispels Wind-Dampness from the upper body and exterior" },
      { herbPinyin: "Dang Gui", role: "ZUO" as const, dosage: "9g", notes: "Tonifies and invigorates the Blood" },
      { herbPinyin: "Chuan Xiong", role: "ZUO" as const, dosage: "6g", notes: "Invigorates Blood, moves Qi, alleviates pain" },
      { herbPinyin: "Shu Di Huang", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Blood, enriches the Kidney Yin" },
      { herbPinyin: "Bai Shao", role: "ZUO" as const, dosage: "9g", notes: "Nourishes the Blood, softens the Liver" },
      { herbPinyin: "Ren Shen", role: "ZUO" as const, dosage: "6g", notes: "Tonifies the Qi" },
      { herbPinyin: "Fu Ling", role: "ZUO" as const, dosage: "9g", notes: "Strengthens the Spleen, leaches out Dampness" },
      { herbPinyin: "Gui Zhi", role: "ZUO" as const, dosage: "6g", notes: "Warms the channels, disperses Cold" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Harmonizes the formula" },
    ],
  },
  // 16. Suan Zao Ren Tang
  {
    formulaPinyin: "Suan Zao Ren Tang",
    herbs: [
      { herbPinyin: "Suan Zao Ren", role: "JUN" as const, dosage: "15-18g", notes: "Nourishes the Heart and Liver Blood, calms the Spirit" },
      { herbPinyin: "Fu Ling", role: "CHEN" as const, dosage: "6g", notes: "Calms the Spirit, strengthens the Spleen" },
      { herbPinyin: "Chuan Xiong", role: "ZUO" as const, dosage: "6g", notes: "Invigorates Blood, moves Qi, soothes the Liver" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "3g", notes: "Harmonizes the formula" },
    ],
  },
  // 17. Gui Zhi Tang
  {
    formulaPinyin: "Gui Zhi Tang",
    herbs: [
      { herbPinyin: "Gui Zhi", role: "JUN" as const, dosage: "9g", notes: "Releases the exterior, warms the channels, adjusts the Ying and Wei" },
      { herbPinyin: "Bai Shao", role: "CHEN" as const, dosage: "9g", notes: "Nourishes the Ying Qi, harmonizes with Gui Zhi" },
      { herbPinyin: "Sheng Jiang", role: "ZUO" as const, dosage: "9g", notes: "Assists Gui Zhi in releasing the exterior" },
      { herbPinyin: "Da Zao", role: "ZUO" as const, dosage: "4 pieces", notes: "Assists Bai Shao in nourishing the Ying" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "6g", notes: "Harmonizes the formula, moderates the herbs" },
    ],
  },
  // 18. Bu Yang Huan Wu Tang
  {
    formulaPinyin: "Bu Yang Huan Wu Tang",
    herbs: [
      { herbPinyin: "Huang Qi", role: "JUN" as const, dosage: "120g", notes: "Heavily tonifies the Qi to invigorate Blood circulation" },
      { herbPinyin: "Dang Gui", role: "CHEN" as const, dosage: "6g", notes: "Tonifies and invigorates the Blood" },
      { herbPinyin: "Chuan Xiong", role: "ZUO" as const, dosage: "3g", notes: "Invigorates Blood, moves Qi through the channels" },
      { herbPinyin: "Tao Ren", role: "ZUO" as const, dosage: "3g", notes: "Breaks up Blood stasis" },
      { herbPinyin: "Hong Hua", role: "ZUO" as const, dosage: "3g", notes: "Invigorates Blood, dispels stasis" },
      { herbPinyin: "Bai Shao", role: "ZUO" as const, dosage: "6g", notes: "Nourishes the Blood, preserves the Yin" },
    ],
  },
  // 19. Huang Lian Jie Du Tang
  {
    formulaPinyin: "Huang Lian Jie Du Tang",
    herbs: [
      { herbPinyin: "Huang Lian", role: "JUN" as const, dosage: "9g", notes: "Drains fire from the Heart and middle Jiao, resolves toxin" },
      { herbPinyin: "Huang Qin", role: "CHEN" as const, dosage: "6g", notes: "Clears Heat from the upper Jiao (Lung)" },
      { herbPinyin: "Huang Bai", role: "ZUO" as const, dosage: "6g", notes: "Drains fire from the lower Jiao (Kidney)" },
      { herbPinyin: "Gan Cao", role: "SHI" as const, dosage: "3g", notes: "Harmonizes the formula, resolves toxin" },
    ],
  },
  // 20. Sheng Mai San
  {
    formulaPinyin: "Sheng Mai San",
    herbs: [
      { herbPinyin: "Ren Shen", role: "JUN" as const, dosage: "9g", notes: "Tonifies the Lung Qi, generates fluids" },
      { herbPinyin: "Mai Men Dong", role: "CHEN" as const, dosage: "9g", notes: "Nourishes Lung Yin, clears deficiency Heat, generates fluids" },
      { herbPinyin: "Wu Wei Zi", role: "ZUO" as const, dosage: "6g", notes: "Prevents leakage of Lung Qi, astringes sweat, generates fluids" },
    ],
  },
];
