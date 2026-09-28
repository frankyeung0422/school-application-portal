// Luxury detection. Pure; tests/luxury.test.ts.
//
// Luxury is a different shopping problem from a kettle: the cheapest listing is
// very often a counterfeit, and Hong Kong (no duty, no VAT) is already one of
// the cheapest legitimate markets in the world. So these products are compared
// and risk-flagged, never fulfilled by us.

import { isSubItemTitle } from "../match/attributes";

export const LUXURY_CATEGORIES = ["WATCH", "BAG", "JEWELLERY", "FRAGRANCE", "APPAREL", "ACCESSORY"] as const;
export type LuxuryCategory = (typeof LUXURY_CATEGORIES)[number];

export const LUXURY_CATEGORY_LABELS: Record<LuxuryCategory, string> = {
  WATCH: "腕錶 Watches",
  BAG: "手袋／皮具 Bags & leather",
  JEWELLERY: "珠寶 Jewellery",
  FRAGRANCE: "香水／美妝 Fragrance & beauty",
  APPAREL: "服飾 Apparel",
  ACCESSORY: "配飾 Accessories",
};

/** Brand → its usual category. Matched case-insensitively on word boundaries. */
const BRANDS: Record<string, LuxuryCategory> = {
  rolex: "WATCH",
  omega: "WATCH",
  cartier: "JEWELLERY",
  "patek philippe": "WATCH",
  "audemars piguet": "WATCH",
  "vacheron constantin": "WATCH",
  "jaeger-lecoultre": "WATCH",
  iwc: "WATCH",
  panerai: "WATCH",
  breitling: "WATCH",
  hublot: "WATCH",
  tudor: "WATCH",
  longines: "WATCH",
  "tag heuer": "WATCH",
  zenith: "WATCH",
  chopard: "JEWELLERY",
  "grand seiko": "WATCH",
  "louis vuitton": "BAG",
  hermes: "BAG",
  "hermès": "BAG",
  chanel: "BAG",
  gucci: "BAG",
  prada: "BAG",
  "miu miu": "BAG",
  fendi: "BAG",
  dior: "BAG",
  celine: "BAG",
  "céline": "BAG",
  loewe: "BAG",
  balenciaga: "BAG",
  "bottega veneta": "BAG",
  "saint laurent": "BAG",
  ysl: "BAG",
  givenchy: "BAG",
  valentino: "APPAREL",
  burberry: "APPAREL",
  "moncler": "APPAREL",
  "canada goose": "APPAREL",
  versace: "APPAREL",
  armani: "APPAREL",
  "dolce & gabbana": "APPAREL",
  "bvlgari": "JEWELLERY",
  bulgari: "JEWELLERY",
  tiffany: "JEWELLERY",
  "van cleef": "JEWELLERY",
  graff: "JEWELLERY",
  mikimoto: "JEWELLERY",
  "jo malone": "FRAGRANCE",
  "creed": "FRAGRANCE",
  "tom ford": "FRAGRANCE",
  "le labo": "FRAGRANCE",
  "diptyque": "FRAGRANCE",
  "la mer": "FRAGRANCE",
  "sk-ii": "FRAGRANCE",
  goyard: "BAG",
  delvaux: "BAG",
  rimowa: "ACCESSORY",
  montblanc: "ACCESSORY",
  "ray-ban": "ACCESSORY",
  oakley: "ACCESSORY",
};

/** Chinese names shoppers actually search with. */
const ZH_ALIASES: Record<string, string> = {
  勞力士: "rolex",
  歐米茄: "omega",
  卡地亞: "cartier",
  百達翡麗: "patek philippe",
  愛彼: "audemars piguet",
  江詩丹頓: "vacheron constantin",
  萬國: "iwc",
  沛納海: "panerai",
  百年靈: "breitling",
  宇舶: "hublot",
  帝舵: "tudor",
  浪琴: "longines",
  豪雅: "tag heuer",
  蕭邦: "chopard",
  路易威登: "louis vuitton",
  愛馬仕: "hermes",
  香奈兒: "chanel",
  古馳: "gucci",
  普拉達: "prada",
  芬迪: "fendi",
  迪奧: "dior",
  賽琳: "celine",
  羅意威: "loewe",
  巴黎世家: "balenciaga",
  葆蝶家: "bottega veneta",
  聖羅蘭: "saint laurent",
  紀梵希: "givenchy",
  巴寶莉: "burberry",
  博柏利: "burberry",
  寶格麗: "bvlgari",
  蒂芙尼: "tiffany",
  梵克雅寶: "van cleef",
  御木本: "mikimoto",
};

export interface LuxuryMatch {
  brand: string;
  category: LuxuryCategory;
}

/**
 * A pochette, wallet or charm is small leather goods, not the house's handbag —
 * judging a HK$1,999 genuine pochette against handbag prices called it a fake.
 */
function categoryFor(brand: string, title: string): LuxuryCategory {
  const base = BRANDS[brand];
  return base === "BAG" && isSubItemTitle(title) ? "ACCESSORY" : base;
}

export function detectLuxury(title: string): LuxuryMatch | null {
  const t = ` ${title.toLowerCase().replace(/[^\p{Script=Han}a-z0-9&\-\s]/gu, " ").replace(/\s+/g, " ")} `;
  for (const [zh, brand] of Object.entries(ZH_ALIASES)) {
    if (title.includes(zh)) return { brand, category: categoryFor(brand, title) };
  }
  let best: LuxuryMatch | null = null;
  for (const brand of Object.keys(BRANDS)) {
    // Word-boundary match so "dior" doesn't fire on "corridor".
    if (new RegExp(`(^|[\\s\\-])${brand.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}([\\s\\-]|$)`).test(t)) {
      if (!best || brand.length > best.brand.length) best = { brand, category: categoryFor(brand, title) };
    }
  }
  return best;
}

export function luxuryBrandLabel(brand: string): string {
  return brand.replace(/(^|\s|-)([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
}
