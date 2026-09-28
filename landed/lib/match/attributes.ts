// Structured product attributes parsed out of a listing title.
//
// The lexical prefilter in blocking.ts used to pair anything with overlapping
// tokens, which produced the two failure modes that dominated the live database:
//
//   1. accessory vs product — "Straw Lid Replacement for HydroJug Traveler 32oz"
//      ($15) matched "HydroJug Traveler 32oz Tumbler" ($225) because both share
//      the token "32oz", and the 93% "spread" ranked first on the dashboard.
//   2. pack-size mismatch — "2 Family Triple Rolls" matched "16 Family Rolls".
//
// Both are cheap to reject deterministically once the title is parsed instead of
// tokenized, so these run before the Jaccard score and before any Gemini spend.
//
// Everything here is pure and operates on the RAW lowercased title — not
// normalizeTitle(), which strips the "." in "1.5L" and the unit boundaries.

export type SizeDim = "volume" | "mass" | "length" | "ounce" | "count";

export interface UnitSize {
  /** Value converted to the dimension's base unit (ml / g / mm / oz). */
  value: number;
  dim: SizeDim;
  /** Canonical rendering, e.g. "946ml", "32oz" — cached on Listing.unitSize. */
  label: string;
}

export interface TitleAttributes {
  /** Units per listing: "16 Family Rolls" -> 16. null when not stated. */
  packQty: number | null;
  /** Replacement part / spare / add-on for another product. */
  isAccessory: boolean;
  unitSize: UnitSize | null;
  /** Best-guess brand: first meaningful latin token. */
  brand: string | null;
}

// --- accessory detection ---------------------------------------------------

// Phrases that make a listing an add-on on their own.
const ACCESSORY_STRONG = [
  /\breplacements?\b/,
  /\brefills?\b/,
  /\bcompatible (?:with|for)\b/,
  /\bfits\s+(?:for\s+)?[a-z]/,
  /\bfor use with\b/,
  /\bdesigned for\b/,
  /\bspare parts?\b/,
  /\baccessor(?:y|ies)\b/,
  /\bscreen protector\b/,
  /\bcarrying case\b/,
  // Aftermarket goods sold *for* a luxury item: organisers, shapers, protective
  // film, replacement crystals. Without these, a HK$400 bag organiser was listed
  // on the luxury page as if it were the Chanel bag.
  /\bbag organi[sz]er\b/,
  /\borgani[sz]er for\b/,
  /\bpurse (?:insert|organi[sz]er|shaper)\b/,
  /\bbase shaper\b/,
  /\bdust bags?\b/,
  /\bprotection film\b/,
  /\bwatch (?:crystal|guard|bezel insert)\b/,
  /\bbezel insert\b/,
  /\bwatch (?:band|strap)\b/,
  // "…LINK FOR 41MM ROLEX SUBMARINER": allow size/colour words between.
  /\bfor\b(?:\s+[\w.-]+){0,3}\s+(?:rolex|omega|cartier|hermes|chanel|gucci|prada|dior|louis vuitton|tudor|breitling|panerai)\b/,
  // CJK: 适用(于) / 配件 / 替换 / 保护套 / 贴膜 / 专用
  /适用/,
  /配件/,
  /替换/,
  /保护套/,
  /贴膜/,
  /专用(?!.*整机)/,
];

// Accessory nouns only count as evidence when the title says they are FOR
// something else — "Straws for HydroJug" is a part, "Xiaomi Smart Band 9" is not.
const ACCESSORY_NOUNS =
  "lids?|straws?|caps?|cases?|covers?|sleeves?|straps?|bands?|protectors?|adapters?|mounts?|holders?|filters?|inserts?|liners?|pouches|gaskets?|seals?|nozzles?|brush(?:es)?|cables?|chargers?|links?|crystals?|bezels?|organi[sz]ers?|films?|shapers?";
const ACCESSORY_FOR = new RegExp(
  `\\b(?:${ACCESSORY_NOUNS})\\b[^.,;]{0,30}?\\bfor\\b`,
);

export function isAccessoryTitle(title: string): boolean {
  const t = title.toLowerCase();
  if (ACCESSORY_STRONG.some((re) => re.test(t))) return true;
  return ACCESSORY_FOR.test(t);
}

// --- pack quantity ---------------------------------------------------------

const PACK_NOUNS =
  "packs?|pk|pcs|pc|pieces?|counts?|ct|rolls?|pairs?|tablets?|capsules?|bottles?|cans?|bags?|sheets?|wipes|sticks?|bars?|units?";

// "pack of 6", "set of 3", "lot of 12"
const PACK_OF = new RegExp(`\\b(?:pack|set|lot|box|case|bundle)\\s+of\\s+(\\d{1,4})\\b`);
// "2 Family Triple Rolls", "16 Family Rolls", "5Pcs", "2-Pack", "40 count"
// Up to two filler words between the number and the noun — marketing copy loves
// stuffing adjectives in there ("2 Family Triple Rolls").
const PACK_SUFFIX = new RegExp(
  `\\b(\\d{1,4})\\s*(?:[a-z]+\\s+){0,2}[-\\s]?(?:${PACK_NOUNS})\\b`,
);
// CJK: 10个装 / 5件装 / 2支装 — plus the traditional forms the HK feed uses (５包裝).
const PACK_CJK = /(\d{1,4})\s*[件個个隻只支條条雙双包盒套排片]\s*[装裝]/;
// "250毫升 x 6" and "6 x 250ml": the multi-pack notation the feed writes both ways.
const PACK_X_AFTER = /[x×]\s*(\d{1,3})(?:\s|$)/;
const PACK_X_BEFORE = /(\d{1,3})\s*[x×]\s*\d/;

export function parsePackQty(title: string): number | null {
  const t = normaliseDigits(title).toLowerCase().replace(/\s+/g, " ");
  for (const re of [PACK_OF, PACK_SUFFIX, PACK_CJK, PACK_X_AFTER, PACK_X_BEFORE]) {
    const m = t.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1 && n <= 5000) return n;
    }
  }
  return null;
}

// --- unit size -------------------------------------------------------------

// Unit -> [dimension, multiplier to base]. `oz` deliberately gets its own
// dimension: on a bottle it is fluid ounces, on food it is weight, and guessing
// wrong would reject good pairs. Same-unit comparisons still work.
const UNITS: Record<string, [SizeDim, number]> = {
  ml: ["volume", 1],
  l: ["volume", 1000],
  ltr: ["volume", 1000],
  litre: ["volume", 1000],
  litres: ["volume", 1000],
  liter: ["volume", 1000],
  liters: ["volume", 1000],
  // "fl oz" shares the ounce dimension with bare "oz" on purpose: drink
  // containers label themselves both ways, and a 32 oz bottle vs a 24 fl oz
  // bottle has to register as a conflict. Converting fl oz to ml instead put
  // them in different dimensions, so the mismatch slipped through.
  "fl oz": ["ounce", 1],
  floz: ["ounce", 1],
  oz: ["ounce", 1],
  ounce: ["ounce", 1],
  ounces: ["ounce", 1],
  g: ["mass", 1],
  gm: ["mass", 1],
  gms: ["mass", 1],
  gram: ["mass", 1],
  grams: ["mass", 1],
  kg: ["mass", 1000],
  lb: ["mass", 453.592],
  lbs: ["mass", 453.592],
  pound: ["mass", 453.592],
  pounds: ["mass", 453.592],
  mm: ["length", 1],
  cm: ["length", 10],
  // Bare "m" and "in" are omitted on purpose: "2 in Black" / "50 m" would parse
  // as sizes and cause false rejects. Spelled-out inch is unambiguous.
  inch: ["length", 25.4],
  inches: ["length", 25.4],
  ft: ["length", 304.8],
};

/**
 * Chinese units and countable units, for the supermarket feed: its titles read
 * 「豆漿 236毫升」 or 「方包 8片」, which the Latin table above cannot see. A
 * count is a real size for comparison — 8片 vs 6片 bread is not the same buy.
 * No \b boundary here: CJK characters are not word characters in JS regexes.
 */
const CJK_UNITS: Record<string, [SizeDim, number]> = {
  毫升: ["volume", 1],
  公升: ["volume", 1000],
  升: ["volume", 1000],
  毫克: ["mass", 0.001],
  千克: ["mass", 1000],
  公斤: ["mass", 1000],
  克: ["mass", 1],
  磅: ["mass", 453.592],
  安士: ["ounce", 1],
  片: ["count", 1],
  塊: ["count", 1],
  粒: ["count", 1],
  顆: ["count", 1],
  條: ["count", 1],
  卷: ["count", 1],
  排: ["count", 1],
  對: ["count", 1],
  袋: ["count", 1],
  罐: ["count", 1],
  支: ["count", 1],
  隻: ["count", 1],
};

const COUNT_UNITS_EN = "slices?|pieces?|pcs?|tablets?|capsules?|rolls?|sheets?|bags?|sachets?|ct|count";

const BASE_LABEL: Record<SizeDim, string> = {
  volume: "ml",
  count: "pc",
  mass: "g",
  length: "mm",
  ounce: "oz",
};

const SIZE_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(fl\\s?oz|${Object.keys(UNITS)
    .filter((u) => u !== "fl oz" && u !== "floz")
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
);

const CJK_SIZE_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${Object.keys(CJK_UNITS).sort((a, b) => b.length - a.length).join("|")})`,
);
const COUNT_EN_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${COUNT_UNITS_EN})\\b`);

/** 「６片裝」: the feed uses full-width digits, which parseFloat cannot read. */
export function normaliseDigits(s: string): string {
  return s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

export function parseUnitSize(title: string): UnitSize | null {
  const t = normaliseDigits(title).toLowerCase().replace(/\s+/g, " ");
  const m = t.match(SIZE_RE) ?? t.match(CJK_SIZE_RE) ?? t.match(COUNT_EN_RE);
  if (!m) return null;
  const raw = parseFloat(m[1]);
  const key = m[2].replace(/\s+/g, " ") === "fl oz" ? "fl oz" : m[2];
  const entry: [SizeDim, number] | undefined =
    UNITS[key] ?? CJK_UNITS[key] ?? (new RegExp(`^(?:${COUNT_UNITS_EN})$`).test(key) ? ["count", 1] : undefined);
  if (!entry || !Number.isFinite(raw) || raw <= 0) return null;
  const [dim, mult] = entry;
  const value = raw * mult;
  return {
    value,
    dim,
    label: `${Math.round(value * 100) / 100}${BASE_LABEL[dim]}`,
  };
}

/** Same dimension and >5% apart = physically different products. */
export function sizesConflict(
  a: UnitSize | null,
  b: UnitSize | null,
): boolean {
  if (!a || !b || a.dim !== b.dim) return false;
  const hi = Math.max(a.value, b.value);
  const lo = Math.min(a.value, b.value);
  return lo <= 0 || hi / lo > 1.05;
}

// --- brand -----------------------------------------------------------------

// Words that lead a title but say nothing about who made it.
const NON_BRAND = new Set([
  "the", "new", "for", "with", "and", "set", "pack", "premium", "upgraded",
  "universal", "original", "genuine", "authentic", "official", "clear", "black",
  "white", "blue", "red", "green", "pink", "grey", "gray", "silver", "gold",
  "purple", "brown", "yellow", "orange", "large", "small", "mini", "portable",
  "wireless", "smart", "electric", "stainless", "metal", "plastic", "silicone",
  "replacement", "compatible", "insulated", "reusable", "adjustable", "heavy",
  "professional", "womens", "mens", "women", "men", "kids", "baby", "unisex",
]);

export function brandToken(title: string): string | null {
  const words = title.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  for (const w of words) {
    if (!NON_BRAND.has(w)) return w;
  }
  return null;
}

/**
 * Two titles name different brands. Deliberately forgiving: a conflict requires
 * both sides to have a brand AND neither brand to appear anywhere in the other
 * title, so concatenation noise ("BountyPaper Towels" vs "Paper Towels") and
 * brand-in-the-middle titles do not cause false rejects.
 */
export function brandsConflict(titleA: string, titleB: string): boolean {
  const a = brandToken(titleA);
  const b = brandToken(titleB);
  if (!a || !b || a === b) return false;
  const la = titleA.toLowerCase();
  const lb = titleB.toLowerCase();
  return !lb.includes(a) && !la.includes(b);
}

// --- combined --------------------------------------------------------------

export function parseAttributes(title: string): TitleAttributes {
  return {
    packQty: parsePackQty(title),
    isAccessory: isAccessoryTitle(title),
    unitSize: parseUnitSize(title),
    brand: brandToken(title),
  };
}

// Consumables restate their size as an equivalence: "8 Family Triple Rolls =
// 27 Regular Rolls" vs "8 Family Rolls = 20 Regular Rolls". Both say "8", but
// they are not the same product — the live data paired them at a 125% "ROI".
const EQUIVALENT_RE = /=\s*(\d{1,4})\s*(?:[a-z]+\s+){0,2}(?:rolls?|sheets?|counts?|ct|pcs|loads?|servings?|uses?)\b/i;

export function parseEquivalentCount(title: string): number | null {
  const m = title.toLowerCase().replace(/\s+/g, " ").match(EQUIVALENT_RE);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Both pack sizes stated and different — a 2-roll is not a 16-roll. */
export function packsConflict(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  return a != null && b != null && a !== b;
}

/**
 * Hard incompatibilities between two listings, checked before scoring and
 * before any judge call. Returns the reason, or null when the pair may proceed.
 */
/**
 * Small items sold alongside (or inside) a bigger one: a Neverfull's pochette,
 * a charm, a wallet. They are genuine products in their own right but never the
 * same product as the bag — clustering them together made a HK$1,999 pouch look
 * like a suspiciously cheap HK$16,000 tote.
 */
const SUB_ITEM_RE = /\b(pochette|pouch|charm|key\s?ring|key\s?chain|wallet|card\s?holder|cardholder|mini\s+accessoires)\b/i;

export function isSubItemTitle(title: string): boolean {
  return SUB_ITEM_RE.test(title);
}

export function subItemMismatch(a: string, b: string): boolean {
  return SUB_ITEM_RE.test(a) !== SUB_ITEM_RE.test(b);
}

export function incompatibleReason(
  a: { title: string; packQty?: number | null; isAccessory?: boolean },
  b: { title: string; packQty?: number | null; isAccessory?: boolean },
): string | null {
  const accA = a.isAccessory ?? isAccessoryTitle(a.title);
  const accB = b.isAccessory ?? isAccessoryTitle(b.title);
  if (accA !== accB) return "accessory vs product";

  const qa = a.packQty !== undefined ? a.packQty : parsePackQty(a.title);
  const qb = b.packQty !== undefined ? b.packQty : parsePackQty(b.title);
  if (packsConflict(qa, qb)) return `pack size ${qa} vs ${qb}`;

  const ea = parseEquivalentCount(a.title);
  const eb = parseEquivalentCount(b.title);
  if (ea !== null && eb !== null && ea !== eb) {
    return `different quantity equivalence (${ea} vs ${eb})`;
  }

  if (sizesConflict(parseUnitSize(a.title), parseUnitSize(b.title))) {
    return "different size/capacity";
  }
  if (brandsConflict(a.title, b.title)) return "different brand";
  if (subItemMismatch(a.title, b.title)) return "sub-item (pochette/wallet/charm) vs the main product";
  return null;
}
