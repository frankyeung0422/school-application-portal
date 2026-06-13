export const HERB_NATURE_CONFIG = {
  WARM: { label: "Warm", color: "bg-amber-100 text-amber-800" },
  HOT: { label: "Hot", color: "bg-red-100 text-red-800" },
  COOL: { label: "Cool", color: "bg-cyan-100 text-cyan-800" },
  COLD: { label: "Cold", color: "bg-blue-100 text-blue-800" },
  NEUTRAL: { label: "Neutral", color: "bg-gray-100 text-gray-800" },
} as const;

export const HERB_FLAVOR_CONFIG: Record<string, { label: string; color: string }> = {
  sweet: { label: "Sweet", color: "bg-yellow-100 text-yellow-800" },
  bitter: { label: "Bitter", color: "bg-stone-100 text-stone-800" },
  sour: { label: "Sour", color: "bg-lime-100 text-lime-800" },
  salty: { label: "Salty", color: "bg-indigo-100 text-indigo-800" },
  pungent: { label: "Pungent", color: "bg-orange-100 text-orange-800" },
  bland: { label: "Bland", color: "bg-slate-100 text-slate-800" },
  astringent: { label: "Astringent", color: "bg-purple-100 text-purple-800" },
};

export const FORMULA_ROLE_CONFIG = {
  JUN: { label: "Emperor (Jun)", color: "bg-red-100 text-red-800 border-red-300" },
  CHEN: { label: "Minister (Chen)", color: "bg-amber-100 text-amber-800 border-amber-300" },
  ZUO: { label: "Assistant (Zuo)", color: "bg-blue-100 text-blue-800 border-blue-300" },
  SHI: { label: "Envoy (Shi)", color: "bg-green-100 text-green-800 border-green-300" },
} as const;

export const MERIDIAN_LIST = [
  "Lung", "Large Intestine", "Stomach", "Spleen",
  "Heart", "Small Intestine", "Bladder", "Kidney",
  "Pericardium", "Triple Energizer", "Gallbladder", "Liver",
  "Governing Vessel", "Conception Vessel",
] as const;

export const HERB_CATEGORIES = [
  "Qi Tonifying", "Blood Tonifying", "Yin Tonifying", "Yang Tonifying",
  "Heat Clearing", "Exterior Releasing", "Qi Regulating", "Blood Invigorating",
  "Dampness Draining", "Wind-Damp Dispelling", "Spirit Calming",
  "Food Stagnation Relieving", "Phlegm Resolving", "Astringent",
  "Interior Warming", "Purgative",
] as const;

export const PATHOLOGY_TYPE_LABELS: Record<string, string> = {
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
