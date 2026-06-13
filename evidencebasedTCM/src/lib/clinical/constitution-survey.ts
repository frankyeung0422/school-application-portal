/**
 * 王琦 9-Constitution Assessment (簡化版).
 *
 * Standard CCMI (Constitution in Chinese Medicine Inventory) is 60 items;
 * we ship a condensed 4-per-type variant (36 items) suitable for in-clinic
 * use without sacrificing differentiation between the 9 types.
 *
 * Scoring (transformed score per type, 0–100):
 *   transformed = (raw - n) / (4n) * 100
 * where raw = sum of Likert 1..5, n = number of items in that subscale.
 *
 * Interpretation thresholds (per Wang Qi 2009):
 *   - 平和質 (balanced): score ≥ 60 AND all other types < 30
 *   - Other types: PRESENT if score ≥ 40, TENDENCY if 30–39
 *
 * One person may have multiple type-present results — composite/mixed
 * constitutions are normal.
 *
 * For items marked `reverse: true`, the score is inverted (1↔5, 2↔4).
 * The 平和 subscale uses reverse items: a "never feel tired" answer should
 * contribute toward higher 平和 score.
 */

export type ConstitutionKey =
  | "ping_he"   // 平和質 Balanced
  | "qi_xu"     // 氣虛質 Qi-deficiency
  | "yang_xu"   // 陽虛質 Yang-deficiency
  | "yin_xu"    // 陰虛質 Yin-deficiency
  | "tan_shi"   // 痰濕質 Phlegm-dampness
  | "shi_re"    // 濕熱質 Damp-heat
  | "xue_yu"    // 血瘀質 Blood-stasis
  | "qi_yu"     // 氣鬱質 Qi-stagnation
  | "te_bing";  // 特稟質 Special (allergic)

export interface ConstitutionType {
  key: ConstitutionKey;
  chineseName: string;
  englishName: string;
  description: { zh: string; en: string };
  recommendations: { zh: string; en: string };
}

export const CONSTITUTION_TYPES: ConstitutionType[] = [
  { key: "ping_he", chineseName: "平和質", englishName: "Balanced",
    description: {
      zh: "氣血陰陽協調，體態勻稱，性格開朗，平素少病，對外界適應強。",
      en: "Harmonious qi, blood, yin, yang; even build; cheerful; rare illness; strong adaptability.",
    },
    recommendations: {
      zh: "保持規律作息、均衡飲食、適度運動，避免暴飲暴食與長期熬夜。",
      en: "Maintain regular routine, balanced diet, moderate exercise; avoid bingeing and chronic sleep loss.",
    },
  },
  { key: "qi_xu", chineseName: "氣虛質", englishName: "Qi-Deficient",
    description: {
      zh: "元氣不足，疲乏、氣短、自汗，肌肉鬆軟，易感冒，舌淡苔薄白。",
      en: "Insufficient vital qi: fatigue, shortness of breath, easy sweating, loose muscle, frequent colds.",
    },
    recommendations: {
      zh: "補氣健脾 — 飲食可用黃芪、黨參、山藥、紅棗；避免過勞、過汗。",
      en: "Tonify qi & strengthen spleen — Huang Qi, Dang Shen, Shan Yao, Hong Zao. Avoid overwork, excess sweating.",
    },
  },
  { key: "yang_xu", chineseName: "陽虛質", englishName: "Yang-Deficient",
    description: {
      zh: "陽氣不足，畏寒、四肢不溫、面色㿠白、性格沉靜內向，喜熱飲。",
      en: "Deficient yang qi: cold intolerance, cold limbs, pale complexion, introverted, prefers warm drinks.",
    },
    recommendations: {
      zh: "溫補腎陽 — 多曬太陽、艾灸關元/命門；食物如羊肉、生薑、桂圓。忌食生冷。",
      en: "Warm kidney yang — sunlight exposure, moxa to CV4/GV4; lamb, ginger, longan. Avoid raw/cold foods.",
    },
  },
  { key: "yin_xu", chineseName: "陰虛質", englishName: "Yin-Deficient",
    description: {
      zh: "陰液虧少，口乾咽燥、手足心熱、潮熱盜汗、大便偏乾、性情急躁。",
      en: "Yin-fluid depletion: dry mouth/throat, hot palms/soles, hot flashes, night sweats, dry stool, irritable.",
    },
    recommendations: {
      zh: "滋陰潤燥 — 銀耳、百合、麥冬、枸杞；避免辛辣、熬夜、桑拿。",
      en: "Nourish yin & moisten — silver fungus, lily bulb, Mai Dong, goji. Avoid spicy food, late nights, saunas.",
    },
  },
  { key: "tan_shi", chineseName: "痰濕質", englishName: "Phlegm-Damp",
    description: {
      zh: "痰濕凝聚，體型肥胖、腹部鬆軟、面部出油、口黏苔膩、性格溫和。",
      en: "Phlegm-damp accumulation: overweight, soft abdomen, oily skin, sticky mouth, greasy tongue coat.",
    },
    recommendations: {
      zh: "化痰祛濕 — 薏苡仁、茯苓、冬瓜；多運動，少甜食油膩，控制體重。",
      en: "Resolve phlegm & damp — Job's tears, Fu Ling, winter melon; exercise more, less sugar/oil.",
    },
  },
  { key: "shi_re", chineseName: "濕熱質", englishName: "Damp-Heat",
    description: {
      zh: "濕熱內蘊，面油痤瘡、口苦口臭、小便短黃、大便黏滯，男性陰囊濕，女性帶下黃。",
      en: "Damp-heat: acne, bitter mouth, scant dark urine, sticky stool; scrotal/vaginal dampness.",
    },
    recommendations: {
      zh: "清熱利濕 — 綠豆、苦瓜、馬齒莧；忌辛辣油炸、菸酒。",
      en: "Clear heat & drain damp — mung bean, bitter melon, purslane; avoid fried/spicy food, smoking, alcohol.",
    },
  },
  { key: "xue_yu", chineseName: "血瘀質", englishName: "Blood-Stasis",
    description: {
      zh: "血行不暢，面色晦暗、唇色暗、皮膚易瘀青、刺痛固定、舌紫暗。",
      en: "Sluggish blood flow: dull complexion, dark lips, easy bruising, fixed sharp pain, purplish tongue.",
    },
    recommendations: {
      zh: "活血化瘀 — 山楂、桃仁、紅花（適量）、丹參；多活動，保持心情舒暢。",
      en: "Move blood & resolve stasis — hawthorn, peach kernel, Dan Shen; stay active, keep stress low.",
    },
  },
  { key: "qi_yu", chineseName: "氣鬱質", englishName: "Qi-Stagnation",
    description: {
      zh: "氣機鬱滯，情緒低落、敏感多慮、胸脅脹悶、善太息、女性月經不調。",
      en: "Qi stagnation: low mood, oversensitive, chest/side fullness, frequent sighing, irregular menses.",
    },
    recommendations: {
      zh: "疏肝理氣 — 玫瑰花茶、香附、合歡花；多戶外活動、心理疏導。",
      en: "Soothe liver & move qi — rose tea, Xiang Fu, He Huan; outdoor activity, psychological support.",
    },
  },
  { key: "te_bing", chineseName: "特稟質", englishName: "Special (Allergic)",
    description: {
      zh: "先天稟賦不足，過敏體質或遺傳性疾病傾向，易過敏性鼻炎、哮喘、蕁麻疹。",
      en: "Constitutional sensitivity / hereditary tendency: prone to allergic rhinitis, asthma, urticaria.",
    },
    recommendations: {
      zh: "固表脫敏 — 玉屏風散加減；避開已知過敏原，居室通風防黴。",
      en: "Stabilize defense — Yu Ping Feng San; avoid known allergens, ventilate living spaces, prevent mold.",
    },
  },
];

export interface SurveyItem {
  id: string;
  type: ConstitutionKey;
  zh: string;
  en: string;
  reverse?: boolean;
}

/**
 * 36-item condensed survey. 4 items per type. Item phrasing is in plain
 * patient-facing language. The 平和 items are reverse-scored where indicated.
 */
export const SURVEY_ITEMS: SurveyItem[] = [
  // 平和質
  { id: "ph1", type: "ping_he", zh: "我精力充沛、不易感到疲倦。", en: "I feel energetic and rarely tired." },
  { id: "ph2", type: "ping_he", zh: "我的睡眠品質良好。", en: "My sleep quality is good." },
  { id: "ph3", type: "ping_he", zh: "我的腸胃功能正常、大便規律。", en: "My digestion is normal and bowel movements are regular." },
  { id: "ph4", type: "ping_he", zh: "我心情通常平和、適應力強。", en: "My mood is generally calm and I adapt well." },

  // 氣虛質
  { id: "qx1", type: "qi_xu", zh: "我容易感到疲乏、體力不支。", en: "I tire easily and feel low on energy." },
  { id: "qx2", type: "qi_xu", zh: "我講話聲音較低、容易氣短。", en: "My voice is low and I'm easily short of breath." },
  { id: "qx3", type: "qi_xu", zh: "我容易出虛汗（自汗），活動時尤甚。", en: "I sweat easily (spontaneous sweating), especially with light activity." },
  { id: "qx4", type: "qi_xu", zh: "我比一般人更易感冒。", en: "I catch colds more easily than others." },

  // 陽虛質
  { id: "yax1", type: "yang_xu", zh: "我手腳發涼，怕冷。", en: "My hands and feet feel cold; I'm sensitive to cold." },
  { id: "yax2", type: "yang_xu", zh: "我胃部/腹部/腰背部容易感到發涼。", en: "My stomach / abdomen / lower back feels cold." },
  { id: "yax3", type: "yang_xu", zh: "我吃涼食/喝冷飲就會不舒服。", en: "Eating cold food or drinks makes me feel uncomfortable." },
  { id: "yax4", type: "yang_xu", zh: "我夜尿較多或小便清長。", en: "I have frequent nocturia or pale dilute urine." },

  // 陰虛質
  { id: "yix1", type: "yin_xu", zh: "我手心、腳心、胸口發熱。", en: "My palms, soles, or chest feel hot." },
  { id: "yix2", type: "yin_xu", zh: "我有口乾、咽乾的感覺。", en: "I often feel dry in the mouth or throat." },
  { id: "yix3", type: "yin_xu", zh: "我大便偏乾燥、不易解出。", en: "My stools are dry and hard to pass." },
  { id: "yix4", type: "yin_xu", zh: "我容易煩躁、睡眠淺易醒。", en: "I'm irritable; my sleep is light and broken." },

  // 痰濕質
  { id: "ts1", type: "tan_shi", zh: "我的腹部肥滿鬆軟。", en: "My abdomen is large and soft." },
  { id: "ts2", type: "tan_shi", zh: "我額頭或鼻子容易出油。", en: "My forehead or nose is oily." },
  { id: "ts3", type: "tan_shi", zh: "我感到身體沉重、不爽快。", en: "I feel my body is heavy and sluggish." },
  { id: "ts4", type: "tan_shi", zh: "我口中常感黏膩或痰多。", en: "My mouth feels sticky or I have a lot of phlegm." },

  // 濕熱質
  { id: "sr1", type: "shi_re", zh: "我面部或鼻部常油亮、易長痤瘡。", en: "My face/nose is oily; I get acne easily." },
  { id: "sr2", type: "shi_re", zh: "我口苦、口臭、口中異味。", en: "I have bitter taste, bad breath, or odd taste in my mouth." },
  { id: "sr3", type: "shi_re", zh: "我小便偏黃、量少。", en: "My urine is dark yellow and scanty." },
  { id: "sr4", type: "shi_re", zh: "我大便黏滯不爽，或感覺排不乾淨。", en: "My stools are sticky, hard to pass cleanly." },

  // 血瘀質
  { id: "xy1", type: "xue_yu", zh: "我皮膚容易出現瘀青、紫斑。", en: "I bruise easily; purple patches appear on my skin." },
  { id: "xy2", type: "xue_yu", zh: "我面色晦暗或有色斑。", en: "My complexion is dull or has dark spots." },
  { id: "xy3", type: "xue_yu", zh: "我身體某處出現過固定不移的刺痛。", en: "I sometimes have fixed sharp/stabbing pain in one area." },
  { id: "xy4", type: "xue_yu", zh: "我口唇顏色偏暗、舌下脈絡明顯。", en: "My lips are dusky; sublingual veins are prominent." },

  // 氣鬱質
  { id: "qy1", type: "qi_yu", zh: "我感到情緒低落、無故悶悶不樂。", en: "I feel down or gloomy for no clear reason." },
  { id: "qy2", type: "qi_yu", zh: "我容易胸脅、乳房或腹部脹悶。", en: "My chest, sides, breasts, or abdomen feel distended." },
  { id: "qy3", type: "qi_yu", zh: "我常嘆氣，似有東西卡在喉嚨。", en: "I sigh often, as if something is stuck in my throat." },
  { id: "qy4", type: "qi_yu", zh: "我容易被小事影響情緒、敏感。", en: "Small things easily affect my mood; I'm oversensitive." },

  // 特稟質
  { id: "tb1", type: "te_bing", zh: "我有過敏性鼻炎（打噴嚏、流清涕、鼻癢）。", en: "I have allergic rhinitis (sneezing, clear runny nose, nasal itch)." },
  { id: "tb2", type: "te_bing", zh: "我容易起風團、蕁麻疹。", en: "I get hives or wheals easily." },
  { id: "tb3", type: "te_bing", zh: "我對某些食物、藥物、花粉或寵物毛過敏。", en: "I'm allergic to certain foods, drugs, pollen, or pet dander." },
  { id: "tb4", type: "te_bing", zh: "我有過敏性哮喘或反覆咳喘的家族史。", en: "I have asthma or a family history of recurrent wheezing." },
];

export interface ScoredConstitution {
  scores: Record<ConstitutionKey, number>;   // 0..100
  primary: ConstitutionKey;
  secondary: ConstitutionKey | null;
  presentTypes: ConstitutionKey[];           // ≥ 40
  tendencyTypes: ConstitutionKey[];          // 30–39
}

/**
 * answers: { itemId → 1..5 (Likert) }. Missing items count as 3 (neutral).
 */
export function scoreSurvey(answers: Record<string, number>): ScoredConstitution {
  // Group raw sums per type.
  const rawByType: Record<ConstitutionKey, number> = {
    ping_he: 0, qi_xu: 0, yang_xu: 0, yin_xu: 0, tan_shi: 0,
    shi_re: 0, xue_yu: 0, qi_yu: 0, te_bing: 0,
  };
  const countByType: Record<ConstitutionKey, number> = {
    ping_he: 0, qi_xu: 0, yang_xu: 0, yin_xu: 0, tan_shi: 0,
    shi_re: 0, xue_yu: 0, qi_yu: 0, te_bing: 0,
  };
  for (const item of SURVEY_ITEMS) {
    const a = answers[item.id] ?? 3;
    const v = item.reverse ? 6 - a : a;
    rawByType[item.type] += v;
    countByType[item.type] += 1;
  }
  const scores: Record<ConstitutionKey, number> = {} as Record<ConstitutionKey, number>;
  for (const k of Object.keys(rawByType) as ConstitutionKey[]) {
    const n = countByType[k] || 1;
    const raw = rawByType[k];
    scores[k] = Math.max(0, Math.min(100, Math.round(((raw - n) / (4 * n)) * 100)));
  }
  // Determine primary: 平和 wins if ≥ 60 AND no other type ≥ 40.
  const otherTypes = (Object.keys(scores) as ConstitutionKey[]).filter((k) => k !== "ping_he");
  const otherAnyHigh = otherTypes.some((k) => scores[k] >= 40);
  let primary: ConstitutionKey;
  if (scores.ping_he >= 60 && !otherAnyHigh) {
    primary = "ping_he";
  } else {
    primary = otherTypes.reduce((best, k) => (scores[k] > scores[best] ? k : best), otherTypes[0]);
  }
  const sortedNonPrimary = (Object.keys(scores) as ConstitutionKey[])
    .filter((k) => k !== primary && k !== "ping_he")
    .sort((a, b) => scores[b] - scores[a]);
  const secondary = sortedNonPrimary.length > 0 && scores[sortedNonPrimary[0]] >= 30
    ? sortedNonPrimary[0]
    : null;

  const presentTypes = otherTypes.filter((k) => scores[k] >= 40);
  const tendencyTypes = otherTypes.filter((k) => scores[k] >= 30 && scores[k] < 40);
  return { scores, primary, secondary, presentTypes, tendencyTypes };
}
