/**
 * Canonical specialty taxonomy for the Famous Doctor directory.
 * Used for filtering, cross-listing, and URL slugs.
 */

export interface Specialty {
  key: string;
  zh: string;
  en: string;
  icon: string;
  description: { zh: string; en: string };
}

export const SPECIALTIES: Specialty[] = [
  {
    key: "internal_medicine",
    zh: "內科",
    en: "Internal Medicine",
    icon: "🩺",
    description: {
      zh: "中醫內科涵蓋外感熱病、肺系、心系、脾胃、肝膽、腎與膀胱等系統疾病的辨證論治。",
      en: "TCM internal medicine — febrile diseases, respiratory, cardiac, GI, hepatobiliary, renal systems.",
    },
  },
  {
    key: "cardiovascular",
    zh: "心血管科",
    en: "Cardiovascular",
    icon: "❤️",
    description: {
      zh: "整合中西醫治療冠心病、心力衰竭、高血壓、心律失常，活血化瘀為核心治法。",
      en: "Integrative TCM-Western treatment of CHD, heart failure, hypertension, arrhythmia; blood-stasis-resolving as core principle.",
    },
  },
  {
    key: "endocrine",
    zh: "內分泌 / 代謝",
    en: "Endocrine / Metabolic",
    icon: "🧬",
    description: {
      zh: "糖尿病（消渴）、甲狀腺疾病、肥胖、痛風、骨質疏鬆，注重整體調理。",
      en: "Diabetes (消渴), thyroid disease, obesity, gout, osteoporosis; whole-system regulation.",
    },
  },
  {
    key: "respiratory",
    zh: "呼吸科",
    en: "Respiratory",
    icon: "🫁",
    description: {
      zh: "慢性咳喘、肺氣腫、哮喘、急慢性氣管炎，宣肺、化痰、補益肺氣為主。",
      en: "Chronic cough, COPD, asthma, bronchitis; lung-qi tonifying + phlegm-resolving.",
    },
  },
  {
    key: "digestive",
    zh: "脾胃 / 消化",
    en: "Digestive",
    icon: "🍽️",
    description: {
      zh: "胃炎、潰瘍、腸躁症、慢性肝病、便秘等，重視脾胃為後天之本。",
      en: "Gastritis, ulcers, IBS, chronic liver disease, constipation; spleen-stomach as 'acquired root'.",
    },
  },
  {
    key: "gynecology",
    zh: "婦科",
    en: "Gynecology",
    icon: "🌸",
    description: {
      zh: "月經病、不孕症、更年期綜合徵、子宮肌瘤、產後調理。",
      en: "Menstrual disorders, infertility, menopause, fibroids, postpartum care.",
    },
  },
  {
    key: "pediatrics",
    zh: "兒科",
    en: "Pediatrics",
    icon: "👶",
    description: {
      zh: "小兒外感、咳嗽、厭食、遺尿、過敏、生長發育；用藥輕靈。",
      en: "Pediatric infections, cough, anorexia, enuresis, allergy, growth; gentle dosing.",
    },
  },
  {
    key: "orthopedics_traumatology",
    zh: "骨傷科",
    en: "Orthopedics / Traumatology",
    icon: "🦴",
    description: {
      zh: "頸肩腰腿痛、骨折後復康、退化性關節炎、運動傷害；針藥手法並重。",
      en: "Cervical/back/limb pain, post-fracture recovery, OA, sports injury; combined needle-herb-manipulation.",
    },
  },
  {
    key: "dermatology",
    zh: "皮膚科",
    en: "Dermatology",
    icon: "🌿",
    description: {
      zh: "濕疹、銀屑病、痤瘡、慢性蕁麻疹、白癜風，內外合治。",
      en: "Eczema, psoriasis, acne, chronic urticaria, vitiligo; combined internal-external treatment.",
    },
  },
  {
    key: "acupuncture",
    zh: "針灸推拿",
    en: "Acupuncture & Tuina",
    icon: "📍",
    description: {
      zh: "經絡腧穴辨證取穴，治療頭痛、面癱、中風後遺、頸腰痛、失眠、產後調理。",
      en: "Channel-point selection for headache, facial paralysis, post-stroke, neck/back pain, insomnia, postpartum.",
    },
  },
  {
    key: "oncology",
    zh: "腫瘤科",
    en: "Oncology",
    icon: "🎗️",
    description: {
      zh: "中西醫結合腫瘤治療，化療放療輔助、扶正培本、減毒增效。",
      en: "Integrative oncology — chemo/radio adjunct, tonifying support, toxicity reduction.",
    },
  },
  {
    key: "neurology",
    zh: "腦病 / 神經科",
    en: "Neurology",
    icon: "🧠",
    description: {
      zh: "中風後遺、帕金森、癲癇、頭痛、眩暈、認知障礙；活血通絡、補腎填精。",
      en: "Post-stroke, Parkinson's, epilepsy, headache, vertigo, cognitive decline; blood-moving + kidney essence.",
    },
  },
  {
    key: "mental_health",
    zh: "情志 / 神志科",
    en: "Mental Health",
    icon: "🧘",
    description: {
      zh: "鬱證、不寐、焦慮、抑鬱、心悸、情緒障礙；疏肝解鬱、養心安神。",
      en: "Depression (鬱證), insomnia, anxiety, mood disorders; liver-soothing, heart-spirit calming.",
    },
  },
  {
    key: "pain_management",
    zh: "疼痛管理",
    en: "Pain Management",
    icon: "💆",
    description: {
      zh: "慢性疼痛、頭痛、痹證、腰腿痛、術後痛；針藥結合多通路鎮痛。",
      en: "Chronic pain, headache, arthritis (痹證), back/limb pain, post-op pain; multi-modal needle + herb.",
    },
  },
];

export function getSpecialtyByKey(key: string): Specialty | undefined {
  return SPECIALTIES.find((s) => s.key === key);
}

export function getSpecialtyLabel(key: string, locale: "zh-Hant" | "en"): string {
  const s = getSpecialtyByKey(key);
  if (!s) return key;
  return locale === "zh-Hant" ? s.zh : s.en;
}
