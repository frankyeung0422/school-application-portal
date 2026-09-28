// Candidate-pair prefilter: cheap deterministic blocking so the Gemini judge
// only sees plausible same-product pairs instead of the full N×M cross join.

import { incompatibleReason, parsePackQty } from "./attributes";
import { latinBridgeTokens } from "./translit";
import { isResaleVenue } from "../types";

const CN_STOPWORDS = [
  "正品",
  "包邮",
  "旗舰店",
  "官方",
  "新款",
  "热卖",
  "促销",
  "特价",
  "批发",
  "现货",
  "一件代发",
  "工厂",
  "免运费",
  "自营",
  "原装",
  "行货",
];

export interface TitleTokens {
  bigrams: Set<string>;
  modelTokens: Set<string>;
}

// A number glued to a measurement unit is a spec, never a model number.
const UNIT_TOKEN_RE =
  /^\d+(?:\.\d+)?(?:oz|ml|l|g|kg|lb|lbs|mm|cm|m|in|ft|pcs|pc|pack|pk|ct|count|w|v|mah|wh|kwh|ah|hz|khz|ghz|db|fps|ppi|dpi|rpm|psi|mp|gb|tb|mb|k|p|h|min|s)$/;
// Standards and ratings that look like model numbers but are shared by
// thousands of unrelated products. Treating "ipx7" as a model code matched a
// $25 AUKEY earbud to a $120 generic earbud in the live data.
const SPEC_TOKEN_RE =
  /^(?:ipx?\d+|ip\d{2}|usb\d?|usb-c|type-?c|bt\d+(?:\.\d+)?|hdmi\d?|cat\d|a2dp|qi\d?|pd\d+|qc\d+(?:\.\d+)?|wifi\d?|802\d*|\d{3,4}p|4k|8k|hd|uhd)$/;

export function isUnitToken(word: string): boolean {
  return UNIT_TOKEN_RE.test(word) || SPEC_TOKEN_RE.test(word);
}

export function normalizeTitle(title: string): string {
  let t = title.toLowerCase();
  for (const w of CN_STOPWORDS) t = t.split(w).join(" ");
  // strip punctuation/emoji, keep CJK + latin + digits
  t = t.replace(/[^\p{Script=Han}a-z0-9\s-]/gu, " ");
  return t.replace(/\s+/g, " ").trim();
}

export function tokenize(title: string): TitleTokens {
  const norm = normalizeTitle(title);
  const bigrams = new Set<string>();
  const modelTokens = new Set<string>();

  // CJK bigrams
  const han = norm.match(/\p{Script=Han}+/gu) ?? [];
  for (const run of han) {
    if (run.length === 1) bigrams.add(run);
    for (let i = 0; i < run.length - 1; i++) bigrams.add(run.slice(i, i + 2));
  }
  // latin/digit words count as bigram tokens too
  const words = norm.match(/[a-z0-9][a-z0-9-]*/g) ?? [];
  for (const w of words) {
    bigrams.add(w);
    // Model-number heuristic: >=4 chars, mixing letters AND digits, and not a
    // measurement. "wh-1000xm5" is a model; "32oz" and "1000" are not — treating
    // "32oz" as a model number is what matched a $15 straw to a $225 tumbler.
    if (w.length >= 4 && /\d/.test(w) && /[a-z]/.test(w) && !isUnitToken(w)) {
      modelTokens.add(w);
    }
  }
  // Cross-language bridge: a Chinese title also emits the latin tokens implied by
  // its brand/category terms, so it can overlap an English title for the same product
  // (e.g. 小米手环 → xiaomi + band). Added as bigrams only — never as model tokens —
  // to avoid inventing spurious model-number matches.
  for (const t of latinBridgeTokens(norm)) bigrams.add(t);
  return { bigrams, modelTokens };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function sharesModelToken(a: TitleTokens, b: TitleTokens): boolean {
  for (const t of a.modelTokens) if (b.modelTokens.has(t)) return true;
  return false;
}

export interface BlockableListing {
  id: number;
  platform: string;
  title: string;
  priceCny: number; // FX-normalized
  /** Cached from Listing when available; parsed from the title otherwise. */
  packQty?: number | null;
  isAccessory?: boolean;
}

export interface CandidatePair {
  buy: BlockableListing; // cheaper side
  sell: BlockableListing;
  score: number; // jaccard, for ranking
}

/** Price per sellable unit — a 16-roll pack is not 8x more expensive per roll. */
export function perUnitPrice(l: BlockableListing): number {
  const qty = (l.packQty !== undefined ? l.packQty : parsePackQty(l.title)) ?? 1;
  return qty > 0 ? l.priceCny / qty : l.priceCny;
}

export interface BlockingOptions {
  minJaccard?: number; // default 0.2
  topKPerListing?: number; // default 5
  maxPairs?: number; // default 120
  /**
   * PriceArb only wants pairs whose expensive side is a resale venue. A buyer
   * comparing where to purchase does not care — any two sources of the same
   * product are a comparison. Default true keeps the resale semantics.
   */
  requireResaleVenue?: boolean;
  /** Allowed cheap÷expensive per-unit ratio. Resale wants a real spread (≤0.95); a buyer comparison accepts equal prices (≤1). */
  priceBand?: [number, number];
}

/**
 * Cross-platform candidate pairs:
 *  - different platforms
 *  - no hard incompatibility (accessory vs product, pack size, capacity, brand)
 *  - shared model token OR bigram Jaccard >= minJaccard
 *  - per-unit buy price within 5–95% of the per-unit sell price
 *  - top-K candidates per listing, global cap maxPairs
 */
export function generateCandidatePairs(
  listings: BlockableListing[],
  opts: BlockingOptions = {},
): CandidatePair[] {
  const minJaccard = opts.minJaccard ?? 0.2;
  const topK = opts.topKPerListing ?? 5;
  const maxPairs = opts.maxPairs ?? 120;
  const requireResale = opts.requireResaleVenue ?? true;
  const [minRatio, maxRatio] = opts.priceBand ?? [0.05, 0.95];

  const tokens = new Map<number, TitleTokens>();
  for (const l of listings) tokens.set(l.id, tokenize(l.title));

  const perListing = new Map<number, CandidatePair[]>();
  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const a = listings[i];
      const b = listings[j];
      if (a.platform === b.platform) continue;
      // Deterministic rejects first — they are cheaper than tokenizing and they
      // are what stops the judge (and any Gemini spend) seeing nonsense pairs.
      if (incompatibleReason(a, b)) continue;

      const ua = perUnitPrice(a);
      const ub = perUnitPrice(b);
      const [buy, sell] = ua <= ub ? [a, b] : [b, a];
      const [buyUnit, sellUnit] = ua <= ub ? [ua, ub] : [ub, ua];
      if (sellUnit <= 0) continue;
      // The expensive side has to be somewhere you can actually resell.
      if (requireResale && !isResaleVenue(sell.platform)) continue;
      const ratio = buyUnit / sellUnit;
      if (ratio < minRatio || ratio > maxRatio) continue;

      const ta = tokens.get(a.id)!;
      const tb = tokens.get(b.id)!;
      const jac = jaccard(ta.bigrams, tb.bigrams);
      if (!sharesModelToken(ta, tb) && jac < minJaccard) continue;

      const pair: CandidatePair = { buy, sell, score: jac };
      for (const id of [a.id, b.id]) {
        const arr = perListing.get(id) ?? [];
        arr.push(pair);
        perListing.set(id, arr);
      }
    }
  }

  const selected = new Set<CandidatePair>();
  for (const arr of perListing.values()) {
    arr.sort((x, y) => y.score - x.score);
    for (const p of arr.slice(0, topK)) selected.add(p);
  }
  return [...selected].sort((x, y) => y.score - x.score).slice(0, maxPairs);
}
