import Link from "next/link";
import React from "react";
import {
  getLatestOdds,
  getLastRun,
  type LatestOdds,
  type MatchStatus,
  type SiteMarketRow,
} from "@/lib/queries";
import { COMPANY_NAMES } from "@/lib/scrape/titan";
import { TOP_LEAGUES_CANONICAL } from "@/lib/scrape/leagues";
import { lineToNumber } from "@/lib/lines";

export const revalidate = 60;

// Index columns. Each entry is a `site` key as stored on OddsSnapshot.site.
// Both 盤1 and 盤2 of the same book share one column — render whichever exists,
// prefer the one matching the consensus line.
//
// Order is operator-set: 永利寶 → 皇冠 → 利記 → 明陞 → 盈禾.
const BOOK_COLUMNS: { key: string; label: string; alt?: string }[] = [
  { key: "winbao", label: "永利寶", alt: "winbao#2" },
  { key: "titan:3", label: "皇冠", alt: "titan:3#2" },
  { key: "titan:31", label: "利記", alt: "titan:31#2" },
  { key: "titan:17", label: "明陞", alt: "titan:17#2" },
  { key: "titan:35", label: "盈禾", alt: "titan:35#2" },
];

const STATUS_TABS: { key: "all" | MatchStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "live", label: "滾球中" },
  { key: "upcoming", label: "未開賽" },
  { key: "finished", label: "已完場" },
];

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2);
}

function fmtKickoff(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toISOString().slice(5, 16).replace("T", " ");
}

function timeAgo(d: Date | null | undefined): string {
  if (!d) return "never";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toISOString().slice(0, 16).replace("T", " ");
}

void COMPANY_NAMES;

// Most common (numeric) line across the books for one match+market. Ties
// broken by first-encountered. Returns the numeric value or null.
function consensusLine(rows: (SiteMarketRow | undefined)[]): number | null {
  const counts = new Map<number, number>();
  for (const r of rows) {
    if (!r) continue;
    const n = lineToNumber(r.line);
    if (n == null) continue;
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [n, c] of counts) {
    if (c > bestN) {
      best = n;
      bestN = c;
    }
  }
  return best;
}

// Pick the entry (盤1 preferred, else 盤2) whose line matches `target`. If
// neither matches, return undefined so the cell renders blank — fair
// apples-to-apples comparison across books.
function pickRowAtLine(
  m: LatestOdds,
  col: { key: string; alt?: string },
  market: "AH" | "OU",
  target: number | null
): SiteMarketRow | undefined {
  const bag = m.markets[market];
  const r1 = bag[col.key];
  const r2 = col.alt ? bag[col.alt] : undefined;
  if (target == null) return r1 || r2;
  const matches = (r: SiteMarketRow | undefined) =>
    r != null && lineToNumber(r.line) === target;
  if (matches(r1)) return r1;
  if (matches(r2)) return r2;
  return undefined;
}

function buildHref(status: string, league: string): string {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  if (league && league !== "all") params.set("league", league);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; league?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = (sp.status || "all") as "all" | MatchStatus;
  const leagueFilter = sp.league || "all";

  const [allMatches, lastRun] = await Promise.all([getLatestOdds(), getLastRun()]);

  // Apply filters
  const matches = allMatches.filter((m) => {
    if (leagueFilter !== "all" && m.league !== leagueFilter) return false;
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  // Partition for the "all" view: live+upcoming go in main table, finished below.
  const showFinishedSeparately = statusFilter === "all";
  const mainRows = showFinishedSeparately
    ? matches.filter((m) => m.status !== "finished")
    : matches;
  const finishedRows = showFinishedSeparately
    ? matches.filter((m) => m.status === "finished")
    : [];

  return (
    <>
      <div className="status-row">
        <span
          className={`status-pill ${
            lastRun?.status === "ok"
              ? "ok"
              : lastRun?.status === "failed"
              ? "bad"
              : "warn"
          }`}
        >
          Last run: {lastRun ? `${lastRun.status} · ${timeAgo(lastRun.finishedAt || lastRun.startedAt)}` : "never"}
        </span>
        <span className="status-pill">{allMatches.length} matches tracked</span>
      </div>

      <nav className="status-tabs" aria-label="match status">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.key}
            href={buildHref(t.key, leagueFilter)}
            className={statusFilter === t.key ? "active" : ""}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <nav className="league-strip" aria-label="league filter">
        <Link
          href={buildHref(statusFilter, "all")}
          className={leagueFilter === "all" ? "active" : ""}
        >
          全部
        </Link>
        {TOP_LEAGUES_CANONICAL.map((lg) => (
          <Link
            key={lg}
            href={buildHref(statusFilter, lg)}
            className={leagueFilter === lg ? "active" : ""}
          >
            {lg}
          </Link>
        ))}
      </nav>

      {mainRows.length === 0 && finishedRows.length === 0 ? (
        <div className="card empty-state">
          <h3>尚無資料</h3>
          <p className="muted">
            未擷取到符合條件的賽事。前往 <Link href="/admin">管理頁</Link> 手動觸發爬蟲，或調整上方篩選。
          </p>
        </div>
      ) : (
        <>
          {mainRows.length > 0 && <IndexallTable rows={mainRows} />}
          {finishedRows.length > 0 && (
            <div className="finished-region">
              <h3 className="finished-title">已完場</h3>
              <IndexallTable rows={finishedRows} dimmed />
            </div>
          )}
        </>
      )}
    </>
  );
}

function IndexallTable({ rows, dimmed }: { rows: LatestOdds[]; dimmed?: boolean }) {
  // Group by league, preserving the order of TOP_LEAGUES_CANONICAL.
  const byLeague = new Map<string, LatestOdds[]>();
  for (const m of rows) {
    const k = m.league || "未分類";
    if (!byLeague.has(k)) byLeague.set(k, []);
    byLeague.get(k)!.push(m);
  }
  const leagueOrder = (a: string, b: string) => {
    const ia = TOP_LEAGUES_CANONICAL.indexOf(a);
    const ib = TOP_LEAGUES_CANONICAL.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  };
  const groups = [...byLeague.entries()].sort((a, b) => leagueOrder(a[0], b[0]));

  return (
    <div className="indexall-wrap">
      <table className="indexall-table">
        <thead>
          <tr>
            <th className="col-time">時間</th>
            <th className="col-league">聯賽</th>
            <th className="col-home">主隊</th>
            <th className="col-away">客隊</th>
            {BOOK_COLUMNS.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th className="col-detail">詳細</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([league, matches]) => (
            <React.Fragment key={league}>
              <tr className="indexall-league-header">
                <td colSpan={5 + BOOK_COLUMNS.length}>
                  {league} <span className="muted small">· {matches.length} 場</span>
                </td>
              </tr>
              {matches.map((m) => {
                // Pick one consensus line per market across all 12 entries
                // (6 books × 2 panels). Each book column then renders odds at
                // that single line so columns are directly comparable.
                const ahLine = consensusLine(Object.values(m.markets.AH));
                const ouLine = consensusLine(Object.values(m.markets.OU));
                return (
                  <tr key={m.matchId} className={dimmed || m.status === "finished" ? "finished" : ""}>
                    <td className="small muted col-time">{fmtKickoff(m.kickoff)}</td>
                    <td className="small muted col-league">{m.league}</td>
                    <td className="col-home">{m.home}</td>
                    <td className="col-away">{m.away}</td>
                    {BOOK_COLUMNS.map((c) => (
                      <td key={c.key} className="col-book">
                        <BookCell
                          ah={pickRowAtLine(m, c, "AH", ahLine)}
                          ou={pickRowAtLine(m, c, "OU", ouLine)}
                        />
                      </td>
                    ))}
                    <td className="col-detail">
                      <Link href={`/match/${m.matchId}`}>賠率</Link>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Determine which side is the favorite for an AH row. Mirrors the same logic
 * as the match page so a row that shows "主" here will also show "主" on the
 * detail page — apples-to-apples.
 *
 * Convention: line < 0 → home gives the handicap → home is favorite.
 *             line > 0 → away gives the handicap → away is favorite.
 *             line = 0 → fall back to odds spread (whichever side priced
 *                        cheaper is favored), unless within 0.05 (level).
 */
function ahFavorite(
  line: string,
  homeOdds: number | null,
  awayOdds: number | null
): "home" | "away" | null {
  const n = lineToNumber(line);
  if (n != null && n < 0) return "home";
  if (n != null && n > 0) return "away";
  if (homeOdds != null && awayOdds != null) {
    if (Math.abs(homeOdds - awayOdds) < 0.05) return null;
    return homeOdds < awayOdds ? "home" : "away";
  }
  return null;
}

function BookCell({
  ah,
  ou,
}: {
  ah: { line: string; homeOdds: number | null; awayOdds: number | null } | undefined;
  ou: { line: string; homeOdds: number | null; awayOdds: number | null } | undefined;
}) {
  if (!ah && !ou) return <span className="muted">—</span>;
  const ahFav = ah ? ahFavorite(ah.line, ah.homeOdds, ah.awayOdds) : null;
  const tag = ahFav === "home" ? "主" : ahFav === "away" ? "客" : null;
  return (
    <div className="indexall-cell">
      {ah && (
        <div className="row">
          <span className="line">
            {tag && <span className="line-fav-tag-sm">{tag}</span>}
            {ah.line || "—"}
          </span>
          <span className="odds">
            <span className={ahFav === "home" ? "fav" : ""}>{fmtOdds(ah.homeOdds)}</span>
            /
            <span className={ahFav === "away" ? "fav" : ""}>{fmtOdds(ah.awayOdds)}</span>
          </span>
        </div>
      )}
      {ou && (
        <div className="row ou">
          <span className="line">{ou.line || "—"}</span>
          <span className="odds">
            {fmtOdds(ou.homeOdds)}/{fmtOdds(ou.awayOdds)}
          </span>
        </div>
      )}
    </div>
  );
}
