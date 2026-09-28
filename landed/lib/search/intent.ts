// "耳機 800以下", "cheapest airpods under $1,200", "惠康 維他奶": what the shopper
// actually asked for. Pure, keyless; tests/intent.test.ts. The words that are
// filters are taken out of the product query, so the crawler searches "耳機".

import { RETAILER_INFO, isRetailer, type Retailer } from "../supermarket/retailers";

export interface SearchIntent {
  /** The product words, with every filter phrase removed. */
  text: string;
  maxHkdCents: number | null;
  minHkdCents: number | null;
  /** "最平" / "cheapest": rank by price, not match quality. */
  cheapestFirst: boolean;
  /** Mentions a supermarket (or a chain): show grocery results first. */
  supermarket: boolean;
  chain: Retailer | null;
  /** Human-readable chips for what was understood. */
  chips: string[];
}

const NUM = String.raw`(?:hk\$|\$|港幣|hkd)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:k|千)?\s*(?:蚊|元|hkd|港元)?`;

function money(raw: string, suffixK: boolean): number {
  const v = Number(raw.replace(/,/g, "")) * (suffixK ? 1000 : 1);
  return Math.round(v * 100);
}

const MAX_PATTERNS = [
  new RegExp(String.raw`(?:under|below|less than|<=?|max|up to|within|唔好貴過|平過|少過|低過|不超過|以內)\s*${NUM}`, "i"),
  new RegExp(String.raw`${NUM}\s*(?:以下|以內|或以下|之內|內)`, "i"),
];
const MIN_PATTERNS = [
  new RegExp(String.raw`(?:over|above|more than|>=?|at least|貴過|多過|高過)\s*${NUM}`, "i"),
  new RegExp(String.raw`${NUM}\s*(?:以上|或以上)`, "i"),
];
const CHEAPEST = /(最平|最便宜|最抵|cheapest|lowest price|best price|格價)/i;
const SUPERMARKET = /(超市|超級市場|supermarket|grocery|groceries|藥房|pharmacy)/i;

const CHAIN_ALIASES: [Retailer, RegExp][] = [
  ["PARKNSHOP", /(百佳|park\s*n\s*shop|parknshop)/i],
  ["WELLCOME", /(惠康|wellcome)/i],
  ["JASONS", /(market\s*place|jasons)/i],
  ["AEON", /(aeon|永旺|吉之島)/i],
  ["DCHFOOD", /(大昌食品|dch\s*food)/i],
  ["WATSONS", /(屈臣氏|watsons)/i],
  ["MANNINGS", /(萬寧|mannings)/i],
  ["SASA", /(莎莎|sasa)/i],
];

export function parseIntent(raw: string): SearchIntent {
  let text = ` ${raw} `;
  const chips: string[] = [];
  let maxHkdCents: number | null = null;
  let minHkdCents: number | null = null;

  const take = (patterns: RegExp[]): number | null => {
    for (const re of patterns) {
      const m = re.exec(text);
      if (m) {
        text = text.replace(m[0], " ");
        return money(m[1], /k|千/i.test(m[0].slice(m[0].indexOf(m[1]) + m[1].length)));
      }
    }
    return null;
  };
  maxHkdCents = take(MAX_PATTERNS);
  minHkdCents = take(MIN_PATTERNS);
  if (maxHkdCents != null) chips.push(`≤ HK$${(maxHkdCents / 100).toLocaleString("en-HK")}`);
  if (minHkdCents != null) chips.push(`≥ HK$${(minHkdCents / 100).toLocaleString("en-HK")}`);

  const cheapestFirst = CHEAPEST.test(text);
  if (cheapestFirst) {
    text = text.replace(CHEAPEST, " ");
    chips.push("最平排先");
  }

  let chain: Retailer | null = null;
  for (const [code, re] of CHAIN_ALIASES) {
    if (re.test(text)) {
      chain = code;
      text = text.replace(re, " ");
      chips.push(isRetailer(code) ? RETAILER_INFO[code].zh : code);
      break;
    }
  }
  let supermarket = chain != null;
  if (SUPERMARKET.test(text)) {
    supermarket = true;
    text = text.replace(SUPERMARKET, " ");
    if (!chain) chips.push("超市");
  }

  const cleaned = text.replace(/\s+/g, " ").trim();
  return {
    // Never strip a query down to nothing: "800以下" alone still searches something.
    text: cleaned.length >= 2 ? cleaned : raw.trim(),
    maxHkdCents,
    minHkdCents,
    cheapestFirst,
    supermarket,
    chain,
    chips,
  };
}

/** Apply the price range to anything with a headline price; unpriced items stay (shown last). */
export function withinRange<T extends { bestLandedHkdCents: number | null }>(rows: T[], i: Pick<SearchIntent, "maxHkdCents" | "minHkdCents">): T[] {
  return rows.filter((r) => {
    if (r.bestLandedHkdCents == null) return i.maxHkdCents == null && i.minHkdCents == null;
    if (i.maxHkdCents != null && r.bestLandedHkdCents > i.maxHkdCents) return false;
    if (i.minHkdCents != null && r.bestLandedHkdCents < i.minHkdCents) return false;
    return true;
  });
}
