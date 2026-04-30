/**
 * Top-league whitelist covering the leagues we track across both titan007 and
 * winbao. The two sources use different Chinese names for the same league —
 * this file holds the aliases so filtering can be consistent.
 */

/** Short canonical names used by titan007 — used for display and filter. */
export const TOP_LEAGUES_CANONICAL = [
  "英超", // Premier League
  "德甲", // Bundesliga
  "西甲", // La Liga
  "意甲", // Serie A
  "法甲", // Ligue 1
  "英冠", // EFL Championship
  "欧冠", // UEFA Champions League (欧洲冠军联赛)
  "欧联", // UEFA Europa League — the "normal" European cup. Distinct from 欧冠;
          // titan007 labels it 欧霸 and winbao 欧霸杯/欧罗巴, all aliased below.
];

/**
 * Map every accepted alias → its canonical short form. Storing the canonical
 * value on Match.league (rather than whatever the first scraper happened to
 * use) keeps the dashboard's exact-match league filter consistent across
 * sources. Match is by exact-equal — substring match would wrongly catch
 * 巴西甲 as 西甲.
 */
const ALIAS_TO_CANONICAL: Record<string, string> = {
  // Titan short forms — identity
  ...Object.fromEntries(TOP_LEAGUES_CANONICAL.map((n) => [n, n])),
  // Winbao / hga030 long forms
  "英格兰超级联赛": "英超",
  "德国甲组联赛": "德甲",
  "西班牙甲组联赛": "西甲",
  "意大利甲组联赛": "意甲",
  "法国甲组联赛": "法甲",
  "英格兰冠军联赛": "英冠",
  "欧洲冠军联赛": "欧冠",
  // titan007 labels UCL as 欧冠杯 (Champions Cup), not 欧冠 — without this
  // alias every UCL fixture is dropped by isTopLeague at scrape time.
  "欧冠杯": "欧冠",
  // Europa League aliases. The bf.titan007 Next_<DATE>.htm page labels matches
  // 欧罗巴杯 (verified 2026-04-30 against the live page); the per-cup
  // CupMatch.aspx?SclassID=113 view uses the same name. winbao / hga030 long
  // forms are 欧霸杯 / 欧洲联赛 / 欧罗巴联赛.
  "欧罗巴杯": "欧联",
  "欧罗巴": "欧联",
  "欧罗巴联赛": "欧联",
  "欧霸": "欧联",
  "欧霸杯": "欧联",
  "欧洲联赛": "欧联",
};

export function isTopLeague(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.trim() in ALIAS_TO_CANONICAL;
}

/**
 * Returns the canonical short league name for any known alias. Falls back to
 * the input (trimmed) when unknown — callers should pair this with isTopLeague
 * if they need to enforce the whitelist.
 */
export function canonicalLeague(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  return ALIAS_TO_CANONICAL[trimmed] ?? trimmed;
}
