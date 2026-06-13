import type { Locale } from "./types";

function pick<T extends Record<string, string>>(locale: Locale, en: T, zh: T, key: string): string {
  const map = locale === "zh-Hant" ? zh : en;
  return map[key] ?? key;
}

const HERB_NATURE_EN: Record<string, string> = {
  WARM: "Warm",
  HOT: "Hot",
  COOL: "Cool",
  COLD: "Cold",
  NEUTRAL: "Neutral",
};

const HERB_NATURE_ZH: Record<string, string> = {
  WARM: "溫",
  HOT: "熱",
  COOL: "涼",
  COLD: "寒",
  NEUTRAL: "平",
};

const HERB_FLAVOR_EN: Record<string, string> = {
  sweet: "Sweet",
  bitter: "Bitter",
  sour: "Sour",
  salty: "Salty",
  pungent: "Pungent",
  bland: "Bland",
  astringent: "Astringent",
};

const HERB_FLAVOR_ZH: Record<string, string> = {
  sweet: "甘",
  bitter: "苦",
  sour: "酸",
  salty: "鹹",
  pungent: "辛",
  bland: "淡",
  astringent: "澀",
};

const MERIDIAN_EN: Record<string, string> = {
  Lung: "Lung",
  "Large Intestine": "Large Intestine",
  Stomach: "Stomach",
  Spleen: "Spleen",
  Heart: "Heart",
  "Small Intestine": "Small Intestine",
  Bladder: "Bladder",
  Kidney: "Kidney",
  Pericardium: "Pericardium",
  "Triple Energizer": "Triple Energizer",
  Gallbladder: "Gallbladder",
  Liver: "Liver",
  "Governing Vessel": "Governing Vessel",
  "Conception Vessel": "Conception Vessel",
};

const MERIDIAN_ZH: Record<string, string> = {
  Lung: "肺經",
  "Large Intestine": "大腸經",
  Stomach: "胃經",
  Spleen: "脾經",
  Heart: "心經",
  "Small Intestine": "小腸經",
  Bladder: "膀胱經",
  Kidney: "腎經",
  Pericardium: "心包經",
  "Triple Energizer": "三焦經",
  Gallbladder: "膽經",
  Liver: "肝經",
  "Governing Vessel": "督脈",
  "Conception Vessel": "任脈",
};

const HERB_CATEGORY_EN: Record<string, string> = Object.fromEntries(
  [
    "Qi Tonifying",
    "Blood Tonifying",
    "Yin Tonifying",
    "Yang Tonifying",
    "Heat Clearing",
    "Exterior Releasing",
    "Qi Regulating",
    "Blood Invigorating",
    "Dampness Draining",
    "Wind-Damp Dispelling",
    "Spirit Calming",
    "Food Stagnation Relieving",
    "Phlegm Resolving",
    "Astringent",
    "Interior Warming",
    "Purgative",
  ].map((k) => [k, k])
);

const HERB_CATEGORY_ZH: Record<string, string> = {
  "Qi Tonifying": "補氣藥",
  "Blood Tonifying": "補血藥",
  "Yin Tonifying": "補陰藥",
  "Yang Tonifying": "補陽藥",
  "Heat Clearing": "清熱藥",
  "Exterior Releasing": "解表藥",
  "Qi Regulating": "理氣藥",
  "Blood Invigorating": "活血藥",
  "Dampness Draining": "利濕藥",
  "Wind-Damp Dispelling": "祛風濕藥",
  "Spirit Calming": "安神藥",
  "Food Stagnation Relieving": "消導藥",
  "Phlegm Resolving": "化痰藥",
  Astringent: "收澀藥",
  "Interior Warming": "溫裏藥",
  Purgative: "瀉下藥",
};

const PATHOLOGY_EN: Record<string, string> = {
  DEFICIENCY: "Deficiency",
  EXCESS: "Excess",
  STAGNATION: "Stagnation",
  HEAT: "Heat",
  COLD: "Cold",
  DAMPNESS: "Dampness",
  PHLEGM: "Phlegm",
  WIND: "Wind",
  BLOOD_STASIS: "Blood Stasis",
  YIN_DEFICIENCY: "Yin Deficiency",
  YANG_DEFICIENCY: "Yang Deficiency",
  QI_DEFICIENCY: "Qi Deficiency",
  BLOOD_DEFICIENCY: "Blood Deficiency",
};

const PATHOLOGY_ZH: Record<string, string> = {
  DEFICIENCY: "虛",
  EXCESS: "實",
  STAGNATION: "鬱滯",
  HEAT: "熱",
  COLD: "寒",
  DAMPNESS: "濕",
  PHLEGM: "痰",
  WIND: "風",
  BLOOD_STASIS: "血瘀",
  YIN_DEFICIENCY: "陰虛",
  YANG_DEFICIENCY: "陽虛",
  QI_DEFICIENCY: "氣虛",
  BLOOD_DEFICIENCY: "血虛",
};

const STUDY_TYPE_EN: Record<string, string> = {
  SYSTEMATIC_REVIEW: "Systematic Review",
  META_ANALYSIS: "Meta-Analysis",
  RCT: "Randomized Controlled Trial",
  COHORT: "Cohort Study",
  CASE_CONTROL: "Case-Control Study",
  CASE_SERIES: "Case Series",
  CASE_REPORT: "Case Report",
  EXPERT_OPINION: "Expert Opinion",
  TRADITIONAL_USE: "Traditional Use",
};

const STUDY_TYPE_ZH: Record<string, string> = {
  SYSTEMATIC_REVIEW: "系統性綜述",
  META_ANALYSIS: "統合分析",
  RCT: "隨機對照試驗",
  COHORT: "世代研究",
  CASE_CONTROL: "病例對照研究",
  CASE_SERIES: "病例系列",
  CASE_REPORT: "病例報告",
  EXPERT_OPINION: "專家意見",
  TRADITIONAL_USE: "傳統應用",
};

const EVIDENCE_LEVEL_EN: Record<string, string> = {
  LEVEL_1A: "1a — Systematic Review of RCTs",
  LEVEL_1B: "1b — Individual RCT",
  LEVEL_2A: "2a — Systematic Review of Cohort Studies",
  LEVEL_2B: "2b — Individual Cohort Study",
  LEVEL_3A: "3a — Systematic Review of Case-Control Studies",
  LEVEL_3B: "3b — Individual Case-Control Study",
  LEVEL_4: "4 — Case Series",
  LEVEL_5: "5 — Expert Opinion",
};

const EVIDENCE_LEVEL_ZH: Record<string, string> = {
  LEVEL_1A: "1a — 隨機對照試驗之系統性綜述",
  LEVEL_1B: "1b — 單一隨機對照試驗",
  LEVEL_2A: "2a — 世代研究之系統性綜述",
  LEVEL_2B: "2b — 單一世代研究",
  LEVEL_3A: "3a — 病例對照研究之系統性綜述",
  LEVEL_3B: "3b — 單一病例對照研究",
  LEVEL_4: "4 — 病例系列",
  LEVEL_5: "5 — 專家意見",
};

const GRADE_QUALITY_EN: Record<string, string> = {
  A: "High",
  B: "Moderate",
  C: "Low",
  D: "Very Low",
};

const GRADE_QUALITY_ZH: Record<string, string> = {
  A: "高",
  B: "中等",
  C: "低",
  D: "極低",
};

const INTERACTION_SEVERITY_EN: Record<string, string> = {
  MAJOR: "Major",
  MODERATE: "Moderate",
  MINOR: "Minor",
  THEORETICAL: "Theoretical",
};

const INTERACTION_SEVERITY_ZH: Record<string, string> = {
  MAJOR: "重大",
  MODERATE: "中度",
  MINOR: "輕微",
  THEORETICAL: "理論性",
};

const FORMULA_ROLE_EN: Record<string, string> = {
  JUN: "Emperor (Jun)",
  CHEN: "Minister (Chen)",
  ZUO: "Assistant (Zuo)",
  SHI: "Envoy (Shi)",
};

const FORMULA_ROLE_ZH: Record<string, string> = {
  JUN: "君藥",
  CHEN: "臣藥",
  ZUO: "佐藥",
  SHI: "使藥",
};

const OUTCOME_TYPE_EN: Record<string, string> = {
  EFFICACY: "Efficacy",
  SAFETY: "Safety",
  PHARMACOKINETICS: "Pharmacokinetics",
  MECHANISM: "Mechanism",
};

const OUTCOME_TYPE_ZH: Record<string, string> = {
  EFFICACY: "療效",
  SAFETY: "安全性",
  PHARMACOKINETICS: "藥物動力學",
  MECHANISM: "作用機轉",
};

const EFFECT_DIRECTION_EN: Record<string, string> = {
  POSITIVE: "Positive",
  NEGATIVE: "Negative",
  NEUTRAL: "Neutral",
  MIXED: "Mixed",
};

const EFFECT_DIRECTION_ZH: Record<string, string> = {
  POSITIVE: "正面",
  NEGATIVE: "負面",
  NEUTRAL: "中性",
  MIXED: "混合",
};

const RISK_OF_BIAS_EN: Record<string, string> = {
  LOW: "Low",
  SOME_CONCERNS: "Some concerns",
  HIGH: "High",
};

const RISK_OF_BIAS_ZH: Record<string, string> = {
  LOW: "低",
  SOME_CONCERNS: "部分疑慮",
  HIGH: "高",
};

const PREGNANCY_EN: Record<string, string> = {
  SAFE: "Safe",
  CAUTION: "Caution",
  CONTRAINDICATED: "Contraindicated",
  UNKNOWN: "Unknown",
};

const PREGNANCY_ZH: Record<string, string> = {
  SAFE: "安全",
  CAUTION: "慎用",
  CONTRAINDICATED: "禁忌",
  UNKNOWN: "不明",
};

const BOOKMARK_ENTITY_EN: Record<string, string> = {
  HERB: "Herb",
  FORMULA: "Formula",
  ACUPOINT: "Acupoint",
  PATTERN: "Pattern",
  EVIDENCE: "Evidence",
  CONDITION: "Condition",
};

const BOOKMARK_ENTITY_ZH: Record<string, string> = {
  HERB: "中藥",
  FORMULA: "方劑",
  ACUPOINT: "穴位",
  PATTERN: "證型",
  EVIDENCE: "文獻證據",
  CONDITION: "病症",
};

const MAPPING_FREQUENCY_EN: Record<string, string> = {
  COMMON: "Common",
  OCCASIONAL: "Occasional",
  RARE: "Rare",
};

const MAPPING_FREQUENCY_ZH: Record<string, string> = {
  COMMON: "常見",
  OCCASIONAL: "偶見",
  RARE: "罕見",
};

const INTERACTION_MECHANISM_EN: Record<string, string> = {
  PHARMACOKINETIC: "Pharmacokinetic",
  PHARMACODYNAMIC: "Pharmacodynamic",
};

const INTERACTION_MECHANISM_ZH: Record<string, string> = {
  PHARMACOKINETIC: "藥物動力學",
  PHARMACODYNAMIC: "藥效學",
};

const SAFETY_EVIDENCE_QUALITY_EN: Record<string, string> = {
  ESTABLISHED: "Established",
  PROBABLE: "Probable",
  SUSPECTED: "Suspected",
  THEORETICAL: "Theoretical",
};

const SAFETY_EVIDENCE_QUALITY_ZH: Record<string, string> = {
  ESTABLISHED: "已確立",
  PROBABLE: "很可能",
  SUSPECTED: "疑似",
  THEORETICAL: "理論性",
};

const CLASSICAL_INTERACTION_EN: Record<string, string> = {
  XIANG_FAN: "Xiang Fan (incompatible)",
  XIANG_WEI: "Xiang Wei (fearful)",
  XIANG_XU: "Xiang Xu (mutually required)",
  XIANG_SHA: "Xiang Sha (mutually destructive)",
  XIANG_WU: "Xiang Wu (mutually restraining)",
  XIANG_JI: "Xiang Ji (mutually irritating)",
};

const CLASSICAL_INTERACTION_ZH: Record<string, string> = {
  XIANG_FAN: "相反",
  XIANG_WEI: "相畏",
  XIANG_XU: "相須",
  XIANG_SHA: "相殺",
  XIANG_WU: "相惡",
  XIANG_JI: "相激",
};

export function herbNatureLabel(locale: Locale, key: string): string {
  return pick(locale, HERB_NATURE_EN, HERB_NATURE_ZH, key);
}

export function herbFlavorLabel(locale: Locale, key: string): string {
  const k = key.toLowerCase();
  return pick(locale, HERB_FLAVOR_EN, HERB_FLAVOR_ZH, k);
}

export function meridianLabel(locale: Locale, key: string): string {
  return pick(locale, MERIDIAN_EN, MERIDIAN_ZH, key);
}

export function herbCategoryLabel(locale: Locale, key: string): string {
  return pick(locale, HERB_CATEGORY_EN, HERB_CATEGORY_ZH, key);
}

export function pathologyLabel(locale: Locale, key: string): string {
  return pick(locale, PATHOLOGY_EN, PATHOLOGY_ZH, key);
}

export function studyTypeLabel(locale: Locale, key: string): string {
  return pick(locale, STUDY_TYPE_EN, STUDY_TYPE_ZH, key);
}

export function evidenceLevelLabel(locale: Locale, key: string): string {
  return pick(locale, EVIDENCE_LEVEL_EN, EVIDENCE_LEVEL_ZH, key);
}

export function gradeQualityLabel(locale: Locale, grade: string): string {
  return pick(locale, GRADE_QUALITY_EN, GRADE_QUALITY_ZH, grade);
}

export function interactionSeverityLabel(locale: Locale, key: string): string {
  return pick(locale, INTERACTION_SEVERITY_EN, INTERACTION_SEVERITY_ZH, key);
}

export function formulaRoleLabel(locale: Locale, key: string): string {
  return pick(locale, FORMULA_ROLE_EN, FORMULA_ROLE_ZH, key);
}

export function outcomeTypeLabel(locale: Locale, key: string): string {
  return pick(locale, OUTCOME_TYPE_EN, OUTCOME_TYPE_ZH, key);
}

export function effectDirectionLabel(locale: Locale, key: string): string {
  return pick(locale, EFFECT_DIRECTION_EN, EFFECT_DIRECTION_ZH, key);
}

export function riskOfBiasLabel(locale: Locale, key: string): string {
  return pick(locale, RISK_OF_BIAS_EN, RISK_OF_BIAS_ZH, key);
}

export function pregnancyCategoryLabel(locale: Locale, key: string): string {
  return pick(locale, PREGNANCY_EN, PREGNANCY_ZH, key);
}

const USER_ROLE_EN: Record<string, string> = {
  ADMIN: "Admin",
  EDITOR: "Editor",
  PRACTITIONER: "Practitioner",
  PUBLIC: "Public",
};

const USER_ROLE_ZH: Record<string, string> = {
  ADMIN: "管理員",
  EDITOR: "編輯",
  PRACTITIONER: "執業醫事",
  PUBLIC: "一般用戶",
};

export function userRoleLabel(locale: Locale, key: string): string {
  return pick(locale, USER_ROLE_EN, USER_ROLE_ZH, key);
}

export function bookmarkEntityLabel(locale: Locale, key: string): string {
  return pick(locale, BOOKMARK_ENTITY_EN, BOOKMARK_ENTITY_ZH, key);
}

export function mappingFrequencyLabel(locale: Locale, key: string): string {
  return pick(locale, MAPPING_FREQUENCY_EN, MAPPING_FREQUENCY_ZH, key);
}

export function interactionMechanismLabel(locale: Locale, key: string): string {
  return pick(locale, INTERACTION_MECHANISM_EN, INTERACTION_MECHANISM_ZH, key);
}

export function safetyEvidenceQualityLabel(locale: Locale, key: string): string {
  return pick(locale, SAFETY_EVIDENCE_QUALITY_EN, SAFETY_EVIDENCE_QUALITY_ZH, key);
}

export function classicalInteractionLabel(locale: Locale, key: string): string {
  return pick(locale, CLASSICAL_INTERACTION_EN, CLASSICAL_INTERACTION_ZH, key);
}
