// Authenticity risk for luxury listings. Pure; tests/luxury.test.ts.
//
// For a kettle, the cheapest trustworthy listing wins. For a HK$90,000 watch,
// the cheapest listing is the single most likely fake, and our comparison would
// be actively harmful if it pointed there. So luxury offers carry an explicit
// risk level, high-risk sources can never be "cheapest", and the reasons are
// spelled out instead of hidden behind a score.

import type { LuxuryCategory } from "./brands";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface PlatformPolicy {
  /** How the platform controls counterfeits for luxury goods. */
  note: string;
  base: RiskLevel;
  /** Categories covered by a platform authentication programme. */
  authenticated?: LuxuryCategory[];
}

export const PLATFORM_POLICY: Record<string, PlatformPolicy> = {
  EBAY: {
    base: "MEDIUM",
    authenticated: ["WATCH", "BAG", "JEWELLERY"],
    note: "eBay Authenticity Guarantee covers eligible watches, handbags and jewellery above a price threshold — check the listing carries the badge.",
  },
  AMAZON: {
    base: "MEDIUM",
    note: "Mixed marketplace: 'Ships from and sold by Amazon' or the brand's own store is safer than a third-party seller.",
  },
  ALIEXPRESS: { base: "HIGH", note: "Counterfeits of luxury brands are endemic; no brand authorisation." },
  ALIBABA: { base: "HIGH", note: "B2B wholesale of branded goods is almost never authorised." },
  TAOBAO: { base: "HIGH", note: "Counterfeits and 'super copies' are common; buy only from brand flagship stores." },
  ALI1688: { base: "HIGH", note: "Wholesale replica supply; not a legitimate source for branded luxury." },
  JD: { base: "MEDIUM", note: "JD自營 and brand flagship stores are authorised; marketplace sellers vary." },
  PDD: { base: "HIGH", note: "Counterfeit risk is high for branded goods." },
};

export interface RiskInput {
  platform: string;
  category: LuxuryCategory;
  priceCents: number;
  /** Median landed price of the trusted offers for the same product. */
  medianTrustedCents: number | null;
  sellerRating?: number | null;
  reviewCount?: number | null;
}

export interface RiskResult {
  level: RiskLevel;
  reasons: string[];
  /** True when this offer must never be presented as the cheapest. */
  excludeFromBest: boolean;
}

/** Below this share of the market median, a luxury price is not a bargain. */
export const TOO_GOOD_RATIO = 0.55;

export function authenticityRisk(i: RiskInput): RiskResult {
  const policy = PLATFORM_POLICY[i.platform] ?? { base: "MEDIUM" as RiskLevel, note: "Unknown platform." };
  const reasons: string[] = [policy.note];
  let level = policy.base;

  if (i.medianTrustedCents && i.priceCents < i.medianTrustedCents * TOO_GOOD_RATIO) {
    level = "HIGH";
    reasons.push(
      `價錢只係市場中位數嘅 ${Math.round((i.priceCents / i.medianTrustedCents) * 100)}% — 正品極少會平咁多 · far below the market median for this reference`,
    );
  }
  if (policy.authenticated?.includes(i.category) && level !== "HIGH") {
    level = "LOW";
    reasons.push("此類別有平台認證服務 · platform authentication programme covers this category");
  }
  if (i.sellerRating != null && i.sellerRating < 4.5 && level !== "HIGH") {
    level = "MEDIUM";
    reasons.push(`賣家評分 ${i.sellerRating} 偏低 · seller rating below 4.5`);
  }
  if ((i.reviewCount ?? 0) < 20 && level === "LOW") {
    level = "MEDIUM";
    reasons.push("賣家紀錄少 · thin seller history");
  }
  return { level, reasons, excludeFromBest: level === "HIGH" };
}

// ── Counterfeit elimination ─────────────────────────────────────────────────
//
// Risk levels rank listings; this decides which ones do not belong in a price
// comparison at all. A HK$1,403 "Louis Vuitton Neverfull" or a HK$156 "Jo
// Malone 100ml" is not a bargain to weigh against the boutique price — it is a
// different (fake) product, and showing it as a price makes the whole page lie.
//
// Floors are the cheapest price a GENUINE item of that brand and category
// plausibly sells for in Hong Kong, including well-worn second-hand. They are
// deliberately conservative: the aim is to remove the obvious fakes, not to
// judge every listing.

const FLOOR_DEFAULT: Record<LuxuryCategory, number> = {
  WATCH: 2_500_00,
  BAG: 1_200_00,
  JEWELLERY: 800_00,
  FRAGRANCE: 200_00,
  APPAREL: 500_00,
  ACCESSORY: 300_00,
};

/**
 * brand → category → floor in HKD cents.
 *
 * Calibrated at roughly a quarter of entry retail: genuine pre-owned trades at
 * 35–60% of retail and must survive, so these catch only the listings that
 * cannot be real (a HK$1,400 Neverfull, a HK$9 "TAG Heuer").
 */
const BRAND_FLOORS: Record<string, Partial<Record<LuxuryCategory, number>>> = {
  rolex: { WATCH: 20_000_00 },
  "patek philippe": { WATCH: 50_000_00 },
  "audemars piguet": { WATCH: 40_000_00 },
  "vacheron constantin": { WATCH: 30_000_00 },
  omega: { WATCH: 6_000_00 },
  tudor: { WATCH: 6_000_00 },
  cartier: { WATCH: 8_000_00, JEWELLERY: 3_000_00 },
  "tag heuer": { WATCH: 2_500_00 },
  breitling: { WATCH: 5_000_00 },
  panerai: { WATCH: 8_000_00 },
  hublot: { WATCH: 10_000_00 },
  iwc: { WATCH: 8_000_00 },
  "jaeger-lecoultre": { WATCH: 10_000_00 },
  longines: { WATCH: 2_000_00 },
  "grand seiko": { WATCH: 5_000_00 },
  zenith: { WATCH: 6_000_00 },
  chopard: { WATCH: 8_000_00, JEWELLERY: 3_000_00 },
  hermes: { BAG: 6_000_00, APPAREL: 1_500_00 },
  "hermès": { BAG: 6_000_00 },
  chanel: { BAG: 6_000_00, APPAREL: 2_000_00 },
  "louis vuitton": { BAG: 2_500_00 },
  goyard: { BAG: 3_000_00 },
  delvaux: { BAG: 5_000_00 },
  dior: { BAG: 3_000_00 },
  celine: { BAG: 3_000_00 },
  "céline": { BAG: 3_000_00 },
  loewe: { BAG: 3_000_00 },
  gucci: { BAG: 1_500_00 },
  prada: { BAG: 1_500_00 },
  "miu miu": { BAG: 1_500_00 },
  fendi: { BAG: 2_000_00 },
  balenciaga: { BAG: 1_500_00 },
  "bottega veneta": { BAG: 2_500_00 },
  "saint laurent": { BAG: 1_800_00 },
  ysl: { BAG: 1_800_00 },
  givenchy: { BAG: 1_800_00 },
  tiffany: { JEWELLERY: 1_000_00 },
  "van cleef": { JEWELLERY: 5_000_00 },
  graff: { JEWELLERY: 10_000_00 },
  bvlgari: { JEWELLERY: 2_000_00 },
  bulgari: { JEWELLERY: 2_000_00 },
  mikimoto: { JEWELLERY: 1_200_00 },
  "jo malone": { FRAGRANCE: 250_00 },
  creed: { FRAGRANCE: 500_00 },
  "tom ford": { FRAGRANCE: 350_00 },
  "le labo": { FRAGRANCE: 400_00 },
  diptyque: { FRAGRANCE: 250_00 },
  "la mer": { FRAGRANCE: 400_00 },
  moncler: { APPAREL: 1_200_00 },
  "canada goose": { APPAREL: 1_000_00 },
  rimowa: { ACCESSORY: 1_000_00 },
};

export function genuineFloorCents(brand: string, category: LuxuryCategory): number {
  return BRAND_FLOORS[brand.toLowerCase()]?.[category] ?? FLOOR_DEFAULT[category];
}

/** Wording sellers of replicas use, in English and Chinese. */
const REPLICA_PATTERNS = [
  /\b(replica|repli[ck]a|super\s*clone|clone|1:1|aaa\+?\s*(quality|grade)?|mirror\s*quality|unauthentic|inspired\s+by|dupe|knock\s*off)\b/i,
  /(精仿|高仿|復刻|复刻|A貨|a货|同款平替|原單|原单)/,
];

export function replicaSignals(title: string): string[] {
  return REPLICA_PATTERNS.filter((re) => re.test(title)).map(() => "標題有冒牌用語 replica wording in the title");
}

/**
 * Below this share of the brand's own HK price a listing is treated as fake.
 * Genuine pre-owned sits at 35–60% of retail, so the bar is deliberately low —
 * anything between this and TOO_GOOD_RATIO is flagged HIGH risk but still shown.
 */
export const OFFICIAL_FAKE_RATIO = 0.35;

export interface CounterfeitInput {
  brand: string | null;
  category: LuxuryCategory;
  title: string;
  priceHkdCents: number;
  /** The brand's own HK boutique price for this exact reference, when known. */
  officialHkCents?: number | null;
}

export interface CounterfeitVerdict {
  suspect: boolean;
  reasons: string[];
}

export function counterfeitCheck(i: CounterfeitInput): CounterfeitVerdict {
  const reasons: string[] = [...replicaSignals(i.title)];
  if (i.officialHkCents && i.priceHkdCents < i.officialHkCents * OFFICIAL_FAKE_RATIO) {
    reasons.push(
      `只係官方價 ${Math.round((i.priceHkdCents / i.officialHkCents) * 100)}%，低過真品可能範圍 · only ${Math.round((i.priceHkdCents / i.officialHkCents) * 100)}% of the brand's own HK price`,
    );
  }
  if (i.brand) {
    const floor = genuineFloorCents(i.brand, i.category);
    if (i.priceHkdCents < floor) {
      reasons.push(
        `低於 ${i.brand} ${i.category} 真品合理底價（約 HK$${(floor / 100).toLocaleString()}）· below the plausible genuine floor for this brand and category`,
      );
    }
  }
  return { suspect: reasons.length > 0, reasons };
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "風險較低 Lower risk",
  MEDIUM: "要核實 Verify first",
  HIGH: "高風險 High counterfeit risk",
};

/** Curated searches that populate the luxury page with real listings. */
export const LUXURY_SEED_QUERIES = [
  "Rolex Submariner 126610LN",
  "Omega Seamaster 300M 42mm",
  "Cartier Love bracelet",
  "Louis Vuitton Neverfull MM",
  "Chanel Classic Flap medium",
  "Gucci Marmont shoulder bag",
  "Hermes Evelyne PM",
  "Tudor Black Bay 58",
  "Tiffany T wire bracelet",
  "Jo Malone London Wood Sage 100ml",
];
