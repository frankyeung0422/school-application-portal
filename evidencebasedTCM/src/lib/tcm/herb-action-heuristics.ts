/**
 * Herb-action heuristics — the single source of truth for DERIVING a herb's
 * therapeutic tendency from its classical 性味歸經 (nature / flavor / meridian)
 * and category.
 *
 * IMPORTANT: this is a *pedagogical simplification*, not a formal scoring
 * system. The flavor→action and nature→action doctrines below are real TCM
 * theory (《中藥學》總論) but admit many exceptions (e.g. 五味子 is sour yet also
 * tonifies). The UI must:
 *   1. render HEURISTIC_DISCLAIMER alongside any derived layer, and
 *   2. visually flag derived actions as "推導 / heuristic", distinct from the
 *      reliable enum/array data (nature, flavor, meridian) they came from.
 *
 * Prefer the herb's *actual* category→pathology mapping and real pattern
 * linkage over pure 性味 inference wherever both are available.
 *
 * Pure data + pure functions only — no React, no Prisma imports.
 */

export type ActionDirection =
  | "ascend"
  | "descend"
  | "disperse"
  | "astringe"
  | "soften"
  | "tonify"
  | "drainDown"
  | "balanced";

/**
 * Glyph hint for the direction (rendered inside SVG <text>). Restricted to
 * widely-supported characters — exotic Unicode arrows can trigger missing-glyph
 * font fetches in some rendering paths, so only ↑ ↓ ↔ + ~ · are used.
 */
export const DIRECTION_GLYPH: Record<ActionDirection, string> = {
  ascend: "↑",
  descend: "↓",
  disperse: "↔",
  astringe: "~",
  soften: "~",
  tonify: "+",
  drainDown: "↓",
  balanced: "·",
};

interface ActionEntry {
  actionZh: string;
  actionEn: string;
  direction: ActionDirection;
}

/**
 * 五味 → action. Keyed by lowercase flavor (data casing is inconsistent — always
 * look up with `.toLowerCase()`).
 */
export const FLAVOR_ACTIONS: Record<string, ActionEntry> = {
  pungent: { actionZh: "發散行氣", actionEn: "Disperses & moves Qi", direction: "disperse" },
  sweet: { actionZh: "補益和中", actionEn: "Tonifies & harmonizes", direction: "tonify" },
  // 苦 has three classical functions: 泄(降泄)、燥(燥濕)、堅(堅陰).
  bitter: { actionZh: "清泄燥濕堅陰", actionEn: "Drains, dries damp & preserves Yin", direction: "descend" },
  sour: { actionZh: "收斂固澀", actionEn: "Astringes & consolidates", direction: "astringe" },
  // 鹹 also 瀉下/潛降 (e.g. 芒硝) beyond its defining 軟堅散結.
  salty: { actionZh: "軟堅散結", actionEn: "Softens hardness; also purges downward", direction: "soften" },
  bland: { actionZh: "滲濕利水", actionEn: "Leaches damp & promotes urination", direction: "drainDown" },
  astringent: { actionZh: "收澀固脫", actionEn: "Astringes & stops leakage", direction: "astringe" },
};

/** 四氣 → action. Keyed by the HerbNature enum value. */
export const NATURE_ACTIONS: Record<string, ActionEntry> = {
  HOT: { actionZh: "溫陽散寒", actionEn: "Warms Yang, dispels cold", direction: "ascend" },
  WARM: { actionZh: "溫陽散寒", actionEn: "Warms Yang, dispels cold", direction: "ascend" },
  COOL: { actionZh: "清熱瀉火", actionEn: "Clears heat, drains fire", direction: "descend" },
  COLD: { actionZh: "清熱瀉火", actionEn: "Clears heat, drains fire", direction: "descend" },
  NEUTRAL: { actionZh: "性平和緩", actionEn: "Balanced, gentle action", direction: "balanced" },
};

export type Element = "wood" | "fire" | "earth" | "metal" | "water";

/** Five-element palette (matches FiveElementCycle.tsx). */
export const ELEMENT_COLOR: Record<Element, string> = {
  wood: "#16a34a",
  fire: "#ef4444",
  earth: "#ca8a04",
  metal: "#a3a3a3",
  water: "#1e3a8a",
};

export const ELEMENT_LABEL: Record<Element, { zh: string; en: string }> = {
  wood: { zh: "木", en: "Wood" },
  fire: { zh: "火", en: "Fire" },
  earth: { zh: "土", en: "Earth" },
  metal: { zh: "金", en: "Metal" },
  water: { zh: "水", en: "Water" },
};

/**
 * Meridian (English key, as stored in Herb.meridianTropism) → five element.
 * Lets the body-target layer tie organs back to five-element principle.
 * Vessels (Ren/Du) have no element → null.
 */
export const MERIDIAN_TO_ELEMENT: Record<string, Element | null> = {
  Liver: "wood",
  Gallbladder: "wood",
  Heart: "fire",
  "Small Intestine": "fire",
  Pericardium: "fire",
  "Triple Energizer": "fire",
  Spleen: "earth",
  Stomach: "earth",
  Lung: "metal",
  "Large Intestine": "metal",
  Kidney: "water",
  Bladder: "water",
  "Governing Vessel": null,
  "Conception Vessel": null,
};

/**
 * Herb category → the PathologyType enum values it characteristically addresses.
 * Used as the body-target fallback when a herb has no primary-pattern linkage.
 * Keys match HERB_CATEGORIES in src/lib/utils/tcm-constants.ts.
 */
export const CATEGORY_TO_PATHOLOGY: Record<string, string[]> = {
  "Qi Tonifying": ["QI_DEFICIENCY", "DEFICIENCY"],
  "Blood Tonifying": ["BLOOD_DEFICIENCY", "DEFICIENCY"],
  "Yin Tonifying": ["YIN_DEFICIENCY", "DEFICIENCY"],
  "Yang Tonifying": ["YANG_DEFICIENCY", "COLD"],
  "Heat Clearing": ["HEAT"],
  "Exterior Releasing": ["WIND", "COLD", "HEAT"],
  "Qi Regulating": ["STAGNATION"],
  "Blood Invigorating": ["BLOOD_STASIS", "STAGNATION"],
  "Dampness Draining": ["DAMPNESS"],
  "Wind-Damp Dispelling": ["WIND", "DAMPNESS"],
  "Spirit Calming": ["EXCESS", "DEFICIENCY"],
  // 食積 is a 實證 (substantial accumulation), not mere qi stagnation.
  "Food Stagnation Relieving": ["STAGNATION", "EXCESS"],
  "Phlegm Resolving": ["PHLEGM"],
  // 收澀 treats 滑脫不禁, most often rooted in 氣(腎)虛不固.
  Astringent: ["DEFICIENCY", "QI_DEFICIENCY"],
  "Interior Warming": ["COLD", "YANG_DEFICIENCY"],
  // 瀉下 spans 攻下(裡實熱結) and 峻下逐水(水飲) subsets.
  Purgative: ["EXCESS", "HEAT", "DAMPNESS"],
};

export interface DerivedAction extends ActionEntry {
  /** Where this action was inferred from, for the UI's source tag. */
  source: "nature" | "flavor";
}

/**
 * Derive a herb's action tendency from nature + flavors. Returns a deduped,
 * ordered list (nature first, then flavors in input order). Flavor keys are
 * normalized case-insensitively.
 */
export function deriveHerbActions({
  nature,
  flavors,
}: {
  nature: string;
  flavors: string[];
}): DerivedAction[] {
  const out: DerivedAction[] = [];
  const seen = new Set<string>();

  const natureEntry = NATURE_ACTIONS[nature?.toUpperCase?.() ?? nature];
  if (natureEntry && !seen.has(natureEntry.actionZh)) {
    out.push({ ...natureEntry, source: "nature" });
    seen.add(natureEntry.actionZh);
  }

  for (const f of flavors ?? []) {
    const entry = FLAVOR_ACTIONS[f.toLowerCase()];
    if (entry && !seen.has(entry.actionZh)) {
      out.push({ ...entry, source: "flavor" });
      seen.add(entry.actionZh);
    }
  }

  return out;
}

/** Map a list of meridians → distinct elements (drops vessels / unknowns). */
export function meridiansToElements(meridians: string[]): Element[] {
  const out: Element[] = [];
  for (const m of meridians ?? []) {
    const el = MERIDIAN_TO_ELEMENT[m];
    if (el && !out.includes(el)) out.push(el);
  }
  return out;
}

export const HEURISTIC_DISCLAIMER = {
  zh: "作用趨向為性味推導示意，非正式評分；臨床以實際藥物分類與證型連結為準。",
  en: "Action tendencies are heuristic inferences from nature & flavor — not a formal score. Clinically, defer to the herb's actual category and pattern linkage.",
} as const;
