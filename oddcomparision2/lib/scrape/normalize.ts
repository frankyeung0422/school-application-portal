/**
 * Team-name normalization. winbao and crown/titan007 display the same teams
 * in slightly different Chinese forms — sometimes zh-CN vs zh-TW, sometimes
 * abbreviation vs full name, sometimes trailing year suffixes. We canonicalize
 * before computing the dedupe key.
 *
 * This is deliberately conservative — we only touch patterns that are clearly
 * the same entity. When in doubt, leave as-is so we don't merge unrelated matches.
 */
const STRIP_RE = /\s*(FC|CF|SC|AC|AFC|CFC|BC|Club|队|隊|俱樂部|俱乐部)$/i;

/**
 * Venue markers winbao appends to a team name when the fixture is played at a
 * neutral or reversed venue (UEFA cup ties played at a third country, derby on
 * away ground, etc.). titan007 omits them entirely, so without stripping we
 * end up with two Match rows for one physical fixture. The substring is
 * removed wherever it appears, not just at end-of-string, because winbao places
 * it inside parentheses immediately after the home team only.
 *
 * (中)  = 中立 / neutral venue
 * (主)  = playing at home — redundant marker but seen on a few rows
 * (客)  = playing at away ground — usually the away team field is correct on
 *         its own, this marker only appears as a clarification suffix
 */
const VENUE_RE = /[（(](中|主|客|中立)[)）]/g;

/**
 * Bidirectional alias table: each key maps to the canonical form used in
 * `matchKey`. Add pairs here whenever you observe a same-team, same-day match
 * failing to dedup because the two books render the name differently.
 *
 * Canonical form is usually the shorter / more common one. Direction doesn't
 * matter for dedup since both variants map to the same canonical string.
 */
const TEAM_ALIASES: Record<string, string> = {
  // Bundesliga
  奥格斯堡: "奥斯堡",
  柏林联合: "柏林联",
  海登海默: "海登海姆",
  美因茨05: "美因茨",
  // Premier League
  纽卡斯尔联: "纽卡斯尔",
  曼彻斯特联: "曼联",
  曼彻斯特城: "曼城",
  // La Liga (winbao ↔ titan name variants)
  马略卡: "马洛卡",
  华伦西亚: "巴伦西亚",
  皇家贝迪斯: "皇家贝蒂斯",
  爱斯宾奴: "西班牙人",
  皇家苏斯达: "皇家社会",
  艾尔切: "埃尔切",
  维戈塞尔塔: "塞尔塔",
  利云特: "莱万特",
  奥维多: "皇家奥维耶多",
  比雷亚雷亚尔: "比利亚雷亚尔",
  // Ligue 1
  图鲁兹: "图卢兹",
  // Serie A (winbao traditional/longer ↔ titan canonical)
  克雷莫内塞: "克雷莫纳",
  科木: "科莫",
  // La Liga (crown vs others)
  赫塔费: "赫塔菲",
  // FIFA World Cup national teams — titan007 uses mainland-simplified country
  // names; winbao/HG uses HK/abbreviated forms. The winbao rows are already in
  // the DB (their dedupeKey is locked to the winbao spelling), so the mapping
  // direction is titan-mainland → winbao-stored form so titan's WC odds dedupe
  // onto the existing winbao match rows instead of creating orphan duplicates.
  // Verified 2026-06-04 against titan's live 国际友谊 team names: these 5 are
  // the only WC nations whose titan spelling differs from the winbao row
  // (刚果民主共和国 / 韩国 / 日本 / 沙特阿拉伯 / 哥伦比亚 etc. already match).
  新西兰: "纽西兰", // New Zealand
  科特迪瓦: "象牙海岸", // Côte d'Ivoire (SC variant)
  波黑: "波斯尼亚和黑塞哥维那", // Bosnia and Herzegovina (abbreviation)
  乌兹别克斯坦: "乌兹别克", // Uzbekistan (full → short)
  佛得角: "佛得角共和国", // Cape Verde (short → full)
  // Traditional Chinese (繁體 / HK) WC national team names → Simplified Chinese
  // winbao / HG scrapes use HK traditional; titan007 uses mainland simplified.
  // Without these, each WC match creates two Match rows — one per source.
  // odds-monitor.ts uses fixtureIdentityKey → normalizeTeam so it auto-merges
  // the existing TC duplicate rows on its next run once these are present.
  剛果民主共和國: "刚果民主共和国", // DRC
  英格蘭: "英格兰", // England
  克羅地亞: "克罗地亚", // Croatia
  加納: "加纳", // Ghana
  巴拿馬: "巴拿马", // Panama
  阿爾及利亞: "阿尔及利亚", // Algeria
  波斯尼亞: "波斯尼亚和黑塞哥维那", // Bosnia — TC abbreviation maps to SC full name
  卡塔爾: "卡塔尔", // Qatar
  烏茲別克: "乌兹别克", // Uzbekistan (TC)
  哥倫比亞: "哥伦比亚", // Colombia
  美國: "美国", // USA
  澳洲: "澳大利亚", // Australia (HK short form)
  蘇格蘭: "苏格兰", // Scotland
  南韓: "韩国", // South Korea (HK form)
  荷蘭: "荷兰", // Netherlands
  德國: "德国", // Germany
  厄瓜多爾: "厄瓜多尔", // Ecuador
  庫拉索: "库拉索", // Curaçao
  突尼西亞: "突尼斯", // Tunisia
  沙地阿拉伯: "沙特阿拉伯", // Saudi Arabia (HK form)
  比利時: "比利时", // Belgium
  烏拉圭: "乌拉圭", // Uruguay
  佛得角共和國: "佛得角共和国", // Cape Verde (TC character 國 vs SC 国)
  奧地利: "奥地利", // Austria
  法國: "法国", // France
  塞內加爾: "塞内加尔", // Senegal
  約旦: "约旦", // Jordan
};

export function normalizeTeam(s: string): string {
  const stripped = s
    .replace(VENUE_RE, "")
    .replace(STRIP_RE, "")
    .replace(/\s+/g, "")
    .trim();
  return TEAM_ALIASES[stripped] || stripped;
}

/**
 * Calendar date in Asia/Hong_Kong for dedupe bucketing. Using UTC (`toISOString`
 * `.slice(0,10)`) split the same fixture across two Match rows when one source
 * stored e.g. 05-17 03:00 HKT as a UTC instant on 05-16 and another used 05-17
 * evening — identical kickoff in HK, different UTC calendar days.
 */
function kickoffDedupeDayHkt(kickoff: Date): string {
  return kickoff.toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
}

/**
 * Dedupe key: same match across bookmakers. Uses sorted team names + HK
 * calendar day when kickoff is known. Alphabetical sort makes it order-invariant.
 */
export function matchKey(home: string, away: string, kickoff?: Date): string {
  const h = normalizeTeam(home);
  const a = normalizeTeam(away);
  const [t1, t2] = [h, a].sort();
  const day = kickoff ? kickoffDedupeDayHkt(kickoff) : "";
  return `${t1}__${t2}__${day}`;
}

/**
 * Stable identity for "same fixture" clustering beyond day-level `matchKey`.
 * `league` must already be canonical (see `canonicalLeague` at scrape time).
 */
export function fixtureIdentityKey(league: string, home: string, away: string): string {
  const [t1, t2] = [normalizeTeam(home), normalizeTeam(away)].sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN")
  );
  return `${league}|${t1}|${t2}`;
}
