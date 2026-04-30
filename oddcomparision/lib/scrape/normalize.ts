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
 * Dedupe key: same match across bookmakers. Uses sorted team names + ISO date
 * (day-level) if available. Alphabetical sort makes it order-invariant, so
 * (A vs B) == (B vs A) — winbao and crown may list home/away differently.
 */
export function matchKey(home: string, away: string, kickoff?: Date): string {
  const h = normalizeTeam(home);
  const a = normalizeTeam(away);
  const [t1, t2] = [h, a].sort();
  const day = kickoff ? kickoff.toISOString().slice(0, 10) : "";
  return `${t1}__${t2}__${day}`;
}
