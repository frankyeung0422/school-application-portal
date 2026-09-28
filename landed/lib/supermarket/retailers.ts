// HK supermarket & personal-care chains covered by the Consumer Council's
// Online Price Watch open data (DATA.GOV.HK). Codes are the dataset's own.

/** Chains the Consumer Council feed prices for us. */
export const OPW_RETAILERS = [
  "PARKNSHOP",
  "WELLCOME",
  "JASONS",
  "AEON",
  "DCHFOOD",
  "LUNGFUNG",
  "WATSONS",
  "MANNINGS",
  "SASA",
] as const;

/**
 * Chains with no published prices anywhere — their websites list shops and
 * products but never prices, and the Price Watch feed does not cover them.
 * They exist here for shop locations and shopper-reported in-store prices.
 */
export const REPORT_ONLY_RETAILERS = ["AJI", "BESTMART360", "STORE759"] as const;

export const RETAILERS = [...OPW_RETAILERS, ...REPORT_ONLY_RETAILERS] as const;
export type Retailer = (typeof RETAILERS)[number];
export type OpwRetailer = (typeof OPW_RETAILERS)[number];

export function isOpwRetailer(v: string): v is OpwRetailer {
  return (OPW_RETAILERS as readonly string[]).includes(v);
}

export function isRetailer(v: string): v is Retailer {
  return (RETAILERS as readonly string[]).includes(v);
}

export const RETAILER_INFO: Record<Retailer, { zh: string; en: string; kind: "SUPERMARKET" | "PERSONAL_CARE" | "SNACK"; color: string }> = {
  PARKNSHOP: { zh: "百佳", en: "PARKnSHOP", kind: "SUPERMARKET", color: "#e30613" },
  WELLCOME: { zh: "惠康", en: "Wellcome", kind: "SUPERMARKET", color: "#d71920" },
  JASONS: { zh: "Market Place", en: "Market Place (Jasons)", kind: "SUPERMARKET", color: "#006b3f" },
  AEON: { zh: "AEON", en: "AEON", kind: "SUPERMARKET", color: "#b5007f" },
  DCHFOOD: { zh: "大昌食品", en: "DCH Food Mart", kind: "SUPERMARKET", color: "#0072bc" },
  LUNGFUNG: { zh: "龍豐", en: "Lung Fung", kind: "SUPERMARKET", color: "#f39200" },
  WATSONS: { zh: "屈臣氏", en: "Watsons", kind: "PERSONAL_CARE", color: "#009ca6" },
  MANNINGS: { zh: "萬寧", en: "Mannings", kind: "PERSONAL_CARE", color: "#f7a600" },
  SASA: { zh: "莎莎", en: "Sa Sa", kind: "PERSONAL_CARE", color: "#e4007f" },
  AJI: { zh: "優之良品", en: "Aji Ichiban", kind: "SNACK", color: "#c8102e" },
  BESTMART360: { zh: "優品360", en: "Best Mart 360", kind: "SNACK", color: "#f5a623" },
  STORE759: { zh: "759阿信屋", en: "759 Store", kind: "SNACK", color: "#e2001a" },
};

/** These chains publish no prices online; everything we show for them is shopper-reported. */
export function pricesArePublished(code: string): boolean {
  return isOpwRetailer(code);
}

export function retailerName(code: string): string {
  if (!isRetailer(code)) return code;
  const { zh, en } = RETAILER_INFO[code];
  // "Market Place" / "AEON" are already Latin — don't print them twice.
  return /[a-z]/i.test(zh) ? zh : `${zh} ${en}`;
}

export const OPW_URL = "https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json";
export const OPW_ATTRIBUTION =
  "資料來源：消費者委員會「網上價格一覽」（DATA.GOV.HK）· Source: Consumer Council Online Price Watch via DATA.GOV.HK. Prices are the chains' online prices and may differ in store.";
