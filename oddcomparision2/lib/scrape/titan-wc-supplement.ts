/**
 * Titan007 lists only ~7 WC fixtures on Next_<date>.htm, but per-match odds
 * pages (AsianOdds_n.aspx?id=…) exist for the full schedule — IDs cluster
 * around 2906700–2907200 (verified 2026-06-07: 2906757=澳大利亚/土耳其,
 * 2906713=德国/库拉索, 2906714=荷兰/日本). This supplement scans the ID
 * range, matches page titles to DB WC fixtures, and scrapes Crown + LiJi rows.
 *
 * Range scan is time-budgeted (default 2 min) and IDs are cached on disk so
 * each 15-min tick does not re-walk 2906650–2907800 (verified 2026-06-14:
 * that walk exceeded the 15-min titan site timeout and stalled all scrapes).
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../db";
import { normalizeTeam } from "./normalize";
import type { ScrapedOdds } from "./types";

const CACHE_PATH = path.join(process.cwd(), "data", "wc-titan-id-cache.json");
const SCAN_BUDGET_MS = parseInt(process.env.TITAN_WC_SCAN_BUDGET_MS || "120000", 10);
const RANGE_FETCH_TIMEOUT_MS = parseInt(process.env.TITAN_WC_RANGE_FETCH_MS || "12000", 10);

const HTTP_HEADERS: Record<string, string> = {
  Referer: "https://bf.titan007.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9",
};

const AH_URL = (id: string) => `https://vip.titan007.com/AsianOdds_n.aspx?id=${id}`;
const OU_URL = (id: string) => `https://vip.titan007.com/OverDown_n.aspx?id=${id}&l=0`;

function normTeam(s: string): string {
  return s.replace(/\(.*?\)/g, "").replace(/\s+/g, "").trim();
}

/** Canonical SC key for a DB team name: strip parentheticals then apply TC→SC alias. */
function canonTeam(s: string): string {
  return normalizeTeam(normTeam(s));
}

/** DB team name → titan title variants (titan007 shortens some WC names). */
const TEAM_ALIASES: Record<string, string[]> = {
  波斯尼亚和黑塞哥维那: ["波黑", "波斯尼亚"],
  象牙海岸: ["科特迪瓦", "象牙海岸"],
  纽西兰: ["新西兰", "纽西兰"],
  佛得角共和国: ["佛得角", "佛得角共和国"],
  刚果民主共和国: ["刚果金", "民主刚果", "刚果民主共和国"],
  库拉索: ["库拉索"],
  克罗地亚: ["克羅地亞", "克羅", "克罗"],
  美国: ["美國", "美国"],
  巴拉圭: ["巴拉圭"],
  英格兰: ["英格兰"],
};

/** Verified titan007 match IDs (title probe 2026-06-07). Range scan can miss these on fetch timeout. */
const KNOWN_WC_TITAN_IDS: Record<string, number> = {
  "美国|巴拉圭": 2906706,
  "德国|库拉索": 2906713,
  "象牙海岸|厄瓜多尔": 2906712,
  "科特迪瓦|厄瓜多尔": 2906712,
  "英格兰|克罗地亚": 2906745,
};

function titleMatches(title: string, home: string, away: string): boolean {
  const vs = title.match(/(.+?)VS(.+?)\(2026/i) || title.match(/(.+?)VS(.+?)\(/i);
  if (!vs) return false;
  const tHome = vs[1].replace(/\s+/g, "");
  const tAway = vs[2].replace(/\s+/g, "");
  const variants = (name: string) => {
    // Normalize TC→SC first so DB entries with HK traditional names still
    // match the titan007 page title (which uses mainland simplified).
    const n = canonTeam(name);
    const out = [n, n.slice(0, 2)];
    for (const a of TEAM_ALIASES[n] ?? []) out.push(a, a.slice(0, 2));
    return out.filter((v) => v.length >= 2);
  };
  const teamHit = (side: string, names: string[]) =>
    names.some((v) => side.includes(v) || v.includes(side));
  const homeVars = variants(home);
  const awayVars = variants(away);
  return (
    (teamHit(tHome, homeVars) && teamHit(tAway, awayVars)) ||
    (teamHit(tHome, awayVars) && teamHit(tAway, homeVars))
  );
}

interface CompanyOdds {
  companyId: string;
  pan: number;
  line: string;
  home: number;
  away: number;
}

function parseCompanyRows(html: string): CompanyOdds[] {
  const out: CompanyOdds[] = [];
  const trioPat =
    `<td[^>]*oddstype="wholeLastOdds"[^>]*>([\\d.]+)<\\/td>\\s*` +
    `<td goals="([-\\d./]+)"[^>]*oddstype="wholeLastOdds"[^>]*>[^<]*<\\/td>\\s*` +
    `<td[^>]*oddstype="wholeLastOdds"[^>]*>([\\d.]+)<\\/td>`;
  const mainRe = new RegExp(
    `<tr[^>]*>\\s*<td[^>]*>\\s*<input[^>]*data-id="(\\d+)"[^>]*>[\\s\\S]*?${trioPat}`,
    "g"
  );
  const seen1 = new Set<string>();
  for (const m of html.matchAll(mainRe)) {
    const companyId = m[1];
    if (seen1.has(companyId)) continue;
    const home = parseFloat(m[2]);
    const away = parseFloat(m[4]);
    if (!Number.isFinite(home) || !Number.isFinite(away) || home === 0 || away === 0) continue;
    seen1.add(companyId);
    out.push({ companyId, pan: 1, line: m[3], home, away });
  }
  const altRe = new RegExp(
    `<tr[^>]*companyID=(\\d+)[^>]*class=['"]blue_txt\\s*['"][^>]*>[\\s\\S]*?${trioPat}`,
    "g"
  );
  const seen2 = new Set<string>();
  for (const m of html.matchAll(altRe)) {
    const companyId = m[1];
    if (seen2.has(companyId)) continue;
    seen2.add(companyId);
    const home = parseFloat(m[2]);
    const away = parseFloat(m[4]);
    if (!Number.isFinite(home) || !Number.isFinite(away) || home === 0 || away === 0) continue;
    out.push({ companyId, pan: 2, line: m[3], home, away });
  }
  return out;
}

function pushRow(
  out: ScrapedOdds[],
  m: { league: string; home: string; away: string; kickoff: Date | null },
  market: "AH" | "OU",
  row: CompanyOdds
): void {
  const suffix = row.pan > 1 ? `#${row.pan}` : "";
  out.push({
    league: m.league,
    home: m.home,
    away: m.away,
    kickoff: m.kickoff ?? undefined,
    market,
    handicapLine: row.line,
    homeOdds: row.home,
    awayOdds: row.away,
    site: `titan:${row.companyId}${suffix}`,
  });
}

async function fetchHtml(url: string, retries = 3, timeoutMs = 45000): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(url, {
        headers: HTTP_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      lastErr = e;
      if (attempt < retries - 1) await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function knownIdForMatch(home: string, away: string): number | undefined {
  return (
    KNOWN_WC_TITAN_IDS[fixtureKey(home, away)] ??
    KNOWN_WC_TITAN_IDS[fixtureKey(away, home)]
  );
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function fixtureKey(home: string, away: string): string {
  return `${canonTeam(home)}|${canonTeam(away)}`;
}

function loadIdCache(): Record<string, number> {
  const raw: Record<string, number> = { ...KNOWN_WC_TITAN_IDS };
  try {
    if (fs.existsSync(CACHE_PATH)) {
      Object.assign(raw, JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8")));
    }
  } catch {}
  // Re-key all entries to SC canonical so legacy TC keys (e.g. "庫拉索|科特迪瓦")
  // resolve correctly after the normalizeTeam fix in normalize.ts.
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const parts = k.split("|");
    const nk = parts.length === 2
      ? `${canonTeam(parts[0])}|${canonTeam(parts[1])}`
      : k;
    out[nk] = v;
  }
  return out;
}

function saveIdCache(cache: Record<string, number>): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (e: any) {
    console.warn("[titan-wc-supplement] cache save failed:", e?.message || e);
  }
}

function resolvedId(
  home: string,
  away: string,
  cache: Record<string, number>
): number | undefined {
  const k = fixtureKey(home, away);
  const rev = fixtureKey(away, home);
  return cache[k] ?? cache[rev] ?? knownIdForMatch(home, away);
}

function fullyCovered(odds: ScrapedOdds[], home: string, away: string): boolean {
  const key = fixtureKey(home, away);
  let has3 = false;
  let has31 = false;
  for (const o of odds) {
    if (fixtureKey(o.home, o.away) !== key) continue;
    if (o.site?.startsWith("titan:3")) has3 = true;
    if (o.site?.startsWith("titan:31")) has31 = true;
  }
  return has3 && has31;
}

export async function scrapeTitanWcSupplement(existingOdds: ScrapedOdds[]): Promise<ScrapedOdds[]> {
  const idStart = parseInt(process.env.TITAN_WC_ID_START || "2906650", 10);
  const idEnd = parseInt(process.env.TITAN_WC_ID_END || "2907500", 10);
  const idCache = loadIdCache();

  const wcMatches = await prisma.match.findMany({
    where: { league: "世界杯", kickoff: { gte: new Date() } },
    select: { id: true, home: true, away: true, kickoff: true, league: true },
    orderBy: { kickoff: "asc" },
  });
  if (wcMatches.length === 0) return [];

  const already = existingOdds;
  const need = wcMatches.filter((m) => !fullyCovered(already, m.home, m.away));
  if (need.length === 0) {
    console.log("[titan-wc-supplement] all WC fixtures already on Next pages");
    return [];
  }
  console.log(
    `[titan-wc-supplement] ${need.length} WC fixtures missing from Next pages; ` +
      `cache=${Object.keys(idCache).length} ids, scan budget ${SCAN_BUDGET_MS}ms`
  );

  const candidates: { id: number; m: (typeof wcMatches)[0] }[] = [];
  const byDbId = new Map<number, number>();
  const scanDeadline = Date.now() + SCAN_BUDGET_MS;

  const tryResolve = async (m: (typeof wcMatches)[0], id: number, tag: string) => {
    if (byDbId.has(m.id)) return;
    try {
      const html = await fetchHtml(AH_URL(String(id)), 2, RANGE_FETCH_TIMEOUT_MS);
      const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
      if (title.includes("世界杯") && titleMatches(title, m.home, m.away)) {
        byDbId.set(m.id, id);
        candidates.push({ id, m });
        idCache[fixtureKey(m.home, m.away)] = id;
        console.log(`[titan-wc-supplement] id=${id} → ${m.home} vs ${m.away} (${tag})`);
      }
    } catch (e: any) {
      console.warn(`[titan-wc-supplement] ${tag} id=${id} failed:`, e?.message || e);
    }
  };

  // 1) Cached + known IDs — no range walk.
  for (const m of need) {
    const id = resolvedId(m.home, m.away, idCache);
    if (id) await tryResolve(m, id, "cache");
  }

  let stillNeed = need.filter((m) => !byDbId.has(m.id));
  if (stillNeed.length === 0) {
    saveIdCache(idCache);
  } else if (Date.now() < scanDeadline) {
    console.log(
      `[titan-wc-supplement] ${stillNeed.length} still missing; range scan ${idStart}–${idEnd}`
    );
    const ids: number[] = [];
    for (let id = idStart; id <= idEnd; id++) ids.push(id);

    let stopScan = false;
    await mapConcurrent(ids, 8, async (id) => {
      if (stopScan || Date.now() >= scanDeadline) {
        stopScan = true;
        return;
      }
      const open = stillNeed.filter((m) => !byDbId.has(m.id));
      if (open.length === 0) {
        stopScan = true;
        return;
      }
      try {
        const html = await fetchHtml(AH_URL(String(id)), 1, RANGE_FETCH_TIMEOUT_MS);
        if (html.length < 5000) return;
        const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
        if (!title.includes("世界杯")) return;
        for (const m of open) {
          if (byDbId.has(m.id)) continue;
          if (titleMatches(title, m.home, m.away)) {
            byDbId.set(m.id, id);
            candidates.push({ id, m });
            idCache[fixtureKey(m.home, m.away)] = id;
            console.log(`[titan-wc-supplement] id=${id} → ${m.home} vs ${m.away}`);
            break;
          }
        }
      } catch {
        /* skip */
      }
    });
    if (stopScan && stillNeed.some((m) => !byDbId.has(m.id))) {
      console.warn("[titan-wc-supplement] range scan stopped early (budget or all found)");
    }
    saveIdCache(idCache);
  }

  stillNeed = need.filter((m) => !byDbId.has(m.id));
  if (stillNeed.length > 0) {
    console.log(`[titan-wc-supplement] ${stillNeed.length} fixtures still unresolved after scan`);
  }

  const idToMatch = new Map<number, (typeof wcMatches)[0]>();
  for (const { id, m } of candidates.sort((a, b) => a.id - b.id)) {
    if (idToMatch.has(id)) continue;
    idToMatch.set(id, m);
  }

  if (idToMatch.size === 0) {
    console.log("[titan-wc-supplement] no new IDs discovered");
    return [];
  }

  const out: ScrapedOdds[] = [];
  for (const [titanId, m] of idToMatch) {
    if (Date.now() >= scanDeadline + SCAN_BUDGET_MS) {
      console.warn("[titan-wc-supplement] scrape phase budget exceeded — returning partial");
      break;
    }
    try {
      const [ahHtml, ouHtml] = await Promise.all([
        fetchHtml(AH_URL(String(titanId))),
        fetchHtml(OU_URL(String(titanId))),
      ]);
      const meta = { league: m.league, home: m.home, away: m.away, kickoff: m.kickoff };
      for (const row of parseCompanyRows(ahHtml)) {
        if (row.companyId === "3" || row.companyId === "31") pushRow(out, meta, "AH", row);
      }
      for (const row of parseCompanyRows(ouHtml)) {
        if (row.companyId === "3" || row.companyId === "31") pushRow(out, meta, "OU", row);
      }
    } catch (e: any) {
      console.warn(`[titan-wc-supplement] id=${titanId} scrape failed:`, e?.message || e);
    }
  }
  console.log(`[titan-wc-supplement] +${out.length} odds rows for ${idToMatch.size} fixtures`);
  return out;
}
