import React from "react";
import { notFound } from "next/navigation";
import {
  getMatchById,
  getMatchCompanyTable,
  getMatchCompanyTrend,
  getMatchTimeline,
} from "@/lib/queries";
import { COMPANY_NAMES } from "@/lib/scrape/titan";
import { displayLine, lineToNumber } from "@/lib/lines";
export const dynamic = "force-dynamic";

function fmtOdds(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toFixed(2);
}

function companyBase(site: string): string {
  if (site === "winbao" || site === "winbao#2") return "永利寶";
  if (site.startsWith("titan:")) {
    const id = site.slice(6).split("#")[0];
    return COMPANY_NAMES[id] || `#${id}`;
  }
  return site;
}

function panOf(site: string): string | null {
  if (site === "winbao#2") return "2";
  if (!site.startsWith("titan:")) return null;
  const parts = site.slice(6).split("#");
  return parts[1] ?? null;
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const [match, companyRows, trendRows, timeline] = await Promise.all([
    getMatchById(matchId),
    getMatchCompanyTable(matchId),
    getMatchCompanyTrend(matchId),
    getMatchTimeline(matchId),
  ]);
  if (!match) notFound();
  void companyRows;

  // Tick whose capturedAt is the latest at-or-before kickoff. For matches in
  // the future this is just the most recent tick. For matches that have
  // started, this is the closing pre-match line — what the user explicitly
  // asked to surface alongside the rolling history.
  const koMs = match.kickoff ? new Date(match.kickoff).getTime() : null;
  const preKickoffRunId = (() => {
    if (koMs == null) return timeline.ticks.at(-1)?.runId ?? null;
    let best: { runId: number; ms: number } | null = null;
    for (const t of timeline.ticks) {
      const ms = new Date(t.capturedAt).getTime();
      if (ms <= koMs && (!best || ms > best.ms)) best = { runId: t.runId, ms };
    }
    return best?.runId ?? null;
  })();

  const kickoffStr = match.kickoff
    ? new Date(match.kickoff).toISOString().replace("T", " ").slice(0, 16)
    : "—";

  return (
    <>
      {/* Match header — titan007 style */}
      <div className="match-head">
        <div className="match-head-league small muted">{match.league}</div>
        <div className="match-head-teams">
          <span className="team-home">{match.home}</span>
          <span className="vs muted">VS</span>
          <span className="team-away">{match.away}</span>
        </div>
        <div className="match-head-meta small muted">
          開賽 {kickoffStr} &nbsp;·&nbsp; {trendRows.length} 家公司
        </div>
      </div>

      {/* Tabs — mirrors titan007 secondary nav. Anchor links scroll to each section. */}
      <div className="tab-bar">
        <a className="tab active" href="#sec-ah">亞洲讓球盤</a>
        <a className="tab active" href="#sec-ou">大小球盤</a>
        <a className="tab" href="#sec-trend-ah">15分鐘走勢</a>
      </div>

      {/* Asian Handicap — titan007-style */}
      <div className="card" id="sec-ah">
        <div className="section-title">
          <span className="dot ah" /> 亞洲讓球盤 · AH
          <span className="small muted legend">
            &nbsp;·&nbsp; <span className="line-fav-tag">主</span>/
            <span className="line-fav-tag">客</span> 標示盤口屬哪方讓出 ·{" "}
            <span className="up">紅↑</span> 升盤 ·{" "}
            <span className="down">藍↓</span> 降盤 ·{" "}
            <span className="line-changed-inline">黃</span> 盤口變化
          </span>
        </div>
        <TitanOddsTable rows={trendRows} market="AH" home={match.home} away={match.away} />
      </div>

      {/* Over/Under — titan007-style */}
      <div className="card" id="sec-ou">
        <div className="section-title">
          <span className="dot ou" /> 大小球盤 · OU
          <span className="small muted legend">
            &nbsp;·&nbsp; 大 / 總球 / 小
          </span>
        </div>
        <TitanOddsTable rows={trendRows} market="OU" home={match.home} away={match.away} />
      </div>

      {/* 15-minute change history — one column per scrape tick. The column
          immediately before kickoff is highlighted so the user can see the
          closing pre-match line alongside the rolling history. */}
      <div className="card" id="sec-trend-ah">
        <div className="section-title">
          <span className="dot ah" /> 15分鐘走勢 · AH
          <span className="small muted legend">
            &nbsp;·&nbsp; {timeline.ticks.length} 個時點 · 每 15 分鐘一個資料點
            {preKickoffRunId != null && koMs != null && (
              <>
                {" "}·{" "}
                <span className="line-changed-inline">黃</span> 開賽前最終
              </>
            )}
          </span>
        </div>
        <TimelineGrid timeline={timeline} market="AH" preKickoffRunId={preKickoffRunId} />
      </div>

      <div className="card" id="sec-trend-ou">
        <div className="section-title">
          <span className="dot ou" /> 15分鐘走勢 · OU
        </div>
        <TimelineGrid timeline={timeline} market="OU" preKickoffRunId={preKickoffRunId} />
      </div>
    </>
  );
}

/**
 * Titan007-style odds table.
 * Structure: 公司 | 初盘 [主|盘|客] | 即时 [主|盘|客] | 变化时间
 * Coloring (Chinese convention): red = odds went UP vs opening, blue = DOWN.
 * Yellow cell background on 盘口 when line changed from opening.
 */
function TitanOddsTable({
  rows,
  market,
  home,
  away,
}: {
  rows: any[];
  market: "AH" | "OU";
  home: string;
  away: string;
}) {
  const filtered = rows.filter((r) => (market === "AH" ? r.ah : r.ou));
  if (filtered.length === 0) {
    return <div className="empty-state muted">尚未擷取到 {market} 賠率</div>;
  }
  const leftLabel = market === "AH" ? home : "大";
  const centerLabel = market === "AH" ? "盤口" : "總球";
  const rightLabel = market === "AH" ? away : "小";

  // Group rows by NUMERIC current (live) line so every row in a group shares
  // the same handicap as the group heading — that's the comparison the user
  // wants for live betting (apples-to-apples odds at the same line right now).
  // A book whose current line has drifted from its opening still appears in
  // the group matching where it currently sits; its OPENING column shows the
  // earlier line for context. Split ("0.5/1") and decimal ("0.75") notation
  // collapse via lineToNumber.
  const byLine = new Map<number, { displayKey: string; rows: typeof filtered }>();
  for (const r of filtered) {
    const data = market === "AH" ? r.ah : r.ou;
    const rawLine = data.current.line || data.opening.line || "—";
    const num = lineToNumber(rawLine);
    if (num == null) continue;
    let bucket = byLine.get(num);
    if (!bucket) {
      bucket = { displayKey: rawLine, rows: [] };
      byLine.set(num, bucket);
    }
    bucket.rows.push(r);
  }
  // Stable ordering: row count desc, then numeric line asc for ties.
  const lineGroups = [...byLine.entries()].sort((a, b) => {
    if (b[1].rows.length !== a[1].rows.length) return b[1].rows.length - a[1].rows.length;
    return a[0] - b[0];
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="titan-table">
        <colgroup>
          <col style={{ width: 110 }} />
          <col span={3} className="col-open" />
          <col span={3} className="col-pre" />
          <col span={3} className="col-live" />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr className="group-row">
            <th rowSpan={2}>公司</th>
            <th colSpan={3} className="group-open">初盤</th>
            <th colSpan={3} className="group-pre">開賽前</th>
            <th colSpan={3} className="group-live">即時盤</th>
            <th rowSpan={2}>變化時間</th>
          </tr>
          <tr className="sub-row">
            <th className="col-open">{leftLabel}</th>
            <th className="col-open">{centerLabel}</th>
            <th className="col-open">{rightLabel}</th>
            <th className="col-pre">{leftLabel}</th>
            <th className="col-pre">{centerLabel}</th>
            <th className="col-pre">{rightLabel}</th>
            <th className="col-live">{leftLabel}</th>
            <th className="col-live">{centerLabel}</th>
            <th className="col-live">{rightLabel}</th>
          </tr>
        </thead>
        <tbody>
          {lineGroups.map(([num, { displayKey, rows: groupRows }]) => {
            return (
              <React.Fragment key={num}>
                <tr className="line-group-header">
                  <td colSpan={11}>
                    即時盤口 · <strong>{displayLine(displayKey)}</strong>{" "}
                    <span className="small muted">
                      ({groupRows.length} 家 · 可跨公司比較 / 套利)
                    </span>
                  </td>
                </tr>
                {groupRows.map((r) => {
                  const data = market === "AH" ? r.ah : r.ou;
                  // Always show the 盤 tag on a 盤2 row so it's visually
                  // distinct from its 盤1 sibling even when the two land in
                  // different line-groups (a viewer scanning vertically
                  // would otherwise see two generic "永利寶" rows with no
                  // cue that they are different lines from the same book).
                  const showPanTag = panOf(r.site);
                  return (
                    <TitanRow
                      key={r.site}
                      site={r.site}
                      opening={data.opening}
                      preKickoff={data.preKickoff}
                      current={data.current}
                      lastUpdate={r.lastUpdate}
                      showPanTag={showPanTag}
                      market={market}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Tag a line with which team is the favorite. For AH:
 *   line < 0 → home gives the handicap → home is favorite
 *   line > 0 → away gives the handicap → away is favorite
 *   line = 0 → level, no favorite
 * For OU there's no "favorite" concept (it's a total), so this returns null.
 *
 * Falls back to the home/away odds spread when the line is zero — if odds
 * differ by more than 0.05 we can still mark the favorite even at level.
 */
function favoriteSide(
  market: "AH" | "OU",
  line: string,
  homeOdds: number | null,
  awayOdds: number | null
): "home" | "away" | null {
  if (market !== "AH") return null;
  const n = lineToNumber(line);
  if (n != null && n < 0) return "home";
  if (n != null && n > 0) return "away";
  // Line is zero — fall back to odds spread.
  if (homeOdds != null && awayOdds != null) {
    if (Math.abs(homeOdds - awayOdds) < 0.05) return null;
    return homeOdds < awayOdds ? "home" : "away";
  }
  return null;
}

function TitanRow({
  site,
  opening,
  preKickoff,
  current,
  lastUpdate,
  showPanTag,
  market,
}: {
  site: string;
  opening: { line: string; homeOdds: number | null; awayOdds: number | null };
  preKickoff: { line: string; homeOdds: number | null; awayOdds: number | null } | null;
  current: { line: string; homeOdds: number | null; awayOdds: number | null };
  lastUpdate: Date;
  showPanTag?: string | null;
  market: "AH" | "OU";
}) {
  const dH =
    current.homeOdds != null && opening.homeOdds != null
      ? current.homeOdds - opening.homeOdds
      : 0;
  const dA =
    current.awayOdds != null && opening.awayOdds != null
      ? current.awayOdds - opening.awayOdds
      : 0;
  // Chinese convention: red = up (rising), blue = down (falling)
  const cls = (d: number) => (d > 0.001 ? "up" : d < -0.001 ? "down" : "flat");
  const arrow = (d: number) => (d > 0.001 ? "↑" : d < -0.001 ? "↓" : "");
  const lineChanged = opening.line !== current.line;
  const preLineChanged = preKickoff && preKickoff.line !== opening.line;
  const pan = panOf(site);
  const effectivePanTag = showPanTag !== undefined ? showPanTag : pan;
  // Pre-kickoff cell colour vs OPENING (so the user reads "how the line
  // closed relative to where it opened"). Falls back to neutral when we
  // don't have a pre-kickoff snapshot for this book.
  const dPreH =
    preKickoff?.homeOdds != null && opening.homeOdds != null
      ? preKickoff.homeOdds - opening.homeOdds
      : 0;
  const dPreA =
    preKickoff?.awayOdds != null && opening.awayOdds != null
      ? preKickoff.awayOdds - opening.awayOdds
      : 0;
  // Determine favored side for each of the three columns separately. Lines
  // can drift between opening and live, so the favored side may flip — keep
  // each column's tag honest to its own snapshot.
  const favOpen = favoriteSide(market, opening.line, opening.homeOdds, opening.awayOdds);
  const favPre = preKickoff
    ? favoriteSide(market, preKickoff.line, preKickoff.homeOdds, preKickoff.awayOdds)
    : null;
  const favLive = favoriteSide(market, current.line, current.homeOdds, current.awayOdds);
  const favCls = (cell: "home" | "away", fav: "home" | "away" | null) =>
    fav === cell ? "fav" : "";
  // Line label tag: "主" if home is favorite, "客" if away. Only AH; OU has
  // no favorite concept so favLive will be null and the tag is omitted.
  const favTag = (fav: "home" | "away" | null) =>
    fav === "home" ? "主" : fav === "away" ? "客" : null;

  return (
    <tr>
      <td className="company-cell">
        <strong>{companyBase(site)}</strong>
        {effectivePanTag && (
          <span className="small muted" style={{ marginLeft: 4 }}>
            盤{effectivePanTag}
          </span>
        )}
      </td>
      {/* 初盤 */}
      <td className={`col-open num ${favCls("home", favOpen)}`}>{fmtOdds(opening.homeOdds)}</td>
      <td className="col-open num line-cell">
        {favTag(favOpen) && <span className="line-fav-tag">{favTag(favOpen)}</span>}
        {displayLine(opening.line)}
      </td>
      <td className={`col-open num ${favCls("away", favOpen)}`}>{fmtOdds(opening.awayOdds)}</td>
      {/* 開賽前 */}
      {preKickoff ? (
        <>
          <td className={`col-pre num ${favCls("home", favPre)}`}>
            <span className={`odds-val ${cls(dPreH)}`}>
              {fmtOdds(preKickoff.homeOdds)}
              <span className="arrow">{arrow(dPreH)}</span>
            </span>
          </td>
          <td className={`col-pre num line-cell ${preLineChanged ? "line-changed" : ""}`}>
            {favTag(favPre) && <span className="line-fav-tag">{favTag(favPre)}</span>}
            {displayLine(preKickoff.line)}
          </td>
          <td className={`col-pre num ${favCls("away", favPre)}`}>
            <span className={`odds-val ${cls(dPreA)}`}>
              {fmtOdds(preKickoff.awayOdds)}
              <span className="arrow">{arrow(dPreA)}</span>
            </span>
          </td>
        </>
      ) : (
        <>
          <td className="col-pre num muted">—</td>
          <td className="col-pre num muted">—</td>
          <td className="col-pre num muted">—</td>
        </>
      )}
      {/* 即時 */}
      <td className={`col-live num ${favCls("home", favLive)}`}>
        <span className={`odds-val ${cls(dH)}`}>
          {fmtOdds(current.homeOdds)}
          <span className="arrow">{arrow(dH)}</span>
        </span>
      </td>
      <td className={`col-live num line-cell ${lineChanged ? "line-changed" : ""}`}>
        {favTag(favLive) && <span className="line-fav-tag">{favTag(favLive)}</span>}
        {displayLine(current.line)}
      </td>
      <td className={`col-live num ${favCls("away", favLive)}`}>
        <span className={`odds-val ${cls(dA)}`}>
          {fmtOdds(current.awayOdds)}
          <span className="arrow">{arrow(dA)}</span>
        </span>
      </td>
      <td className="small muted time-cell">
        {new Date(lastUpdate).toISOString().slice(5, 16).replace("T", " ")}
      </td>
    </tr>
  );
}

/**
 * 15-minute change timeline. One column per scrape tick (capturedAt + runId),
 * one pair of rows per book (home + away decimal odds). The pre-kickoff column
 * is shaded so the closing pre-match line is obvious at a glance.
 */
function TimelineGrid({
  timeline,
  market,
  preKickoffRunId,
}: {
  timeline: { ticks: { runId: number; capturedAt: Date }[]; rows: any[] };
  market: "AH" | "OU";
  preKickoffRunId: number | null;
}) {
  const rows = timeline.rows.filter((r) => r.market === market);
  if (rows.length === 0 || timeline.ticks.length === 0) {
    return <div className="empty-state muted">尚無 {market} 歷史資料</div>;
  }
  // Show last 48 ticks (= 12h at 15-min cadence). Newest first.
  const ticks = timeline.ticks.slice(-48).reverse();

  // Stable book ordering: winbao first, then titan ids ascending.
  const orderOf = (site: string): number => {
    if (site === "winbao") return 0;
    if (site === "winbao#2") return 1;
    if (site === "titan:3") return 2;
    if (site === "titan:3#2") return 3;
    if (site === "titan:17") return 4;
    if (site === "titan:17#2") return 5;
    if (site === "titan:31") return 6;
    if (site === "titan:31#2") return 7;
    if (site === "titan:35") return 8;
    if (site === "titan:35#2") return 9;
    return 100;
  };
  const sortedRows = rows.slice().sort((a, b) => {
    const oa = orderOf(a.site);
    const ob = orderOf(b.site);
    if (oa !== ob) return oa - ob;
    return a.site.localeCompare(b.site);
  });

  const homeLabel = market === "AH" ? "主" : "大";
  const awayLabel = market === "AH" ? "客" : "小";

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="odds-table timeline">
        <thead>
          <tr>
            <th className="tl-company-head">公司</th>
            <th className="tl-side-head">主/客</th>
            {ticks.map((t) => {
              const isPreKickoff = t.runId === preKickoffRunId;
              return (
                <th
                  key={t.runId}
                  style={{ width: 78 }}
                  className={isPreKickoff ? "tl-pre-kickoff" : ""}
                >
                  <div className="small">
                    {new Date(t.capturedAt).toISOString().slice(11, 16)}
                  </div>
                  <div className="small muted">
                    {new Date(t.capturedAt).toISOString().slice(5, 10)}
                  </div>
                  {isPreKickoff && <div className="small">開賽前</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <React.Fragment key={r.site}>
              <tr className="tl-row-home">
                <td className="tl-company" rowSpan={2}>
                  <strong>{companyBase(r.site)}</strong>
                  {panOf(r.site) && (
                    <span className="small muted" style={{ marginLeft: 4 }}>
                      盤{panOf(r.site)}
                    </span>
                  )}
                </td>
                <td className="tl-side-label">{homeLabel}</td>
                {ticks.map((t, i) => {
                  const cell = r.cells[t.runId];
                  const prevTick = ticks[i + 1];
                  const prev = prevTick ? r.cells[prevTick.runId] : null;
                  return (
                    <TimelineCellView
                      key={t.runId}
                      cell={cell}
                      prev={prev}
                      side="home"
                      isPreKickoff={t.runId === preKickoffRunId}
                    />
                  );
                })}
              </tr>
              <tr className="tl-row-away">
                <td className="tl-side-label">{awayLabel}</td>
                {ticks.map((t, i) => {
                  const cell = r.cells[t.runId];
                  const prevTick = ticks[i + 1];
                  const prev = prevTick ? r.cells[prevTick.runId] : null;
                  return (
                    <TimelineCellView
                      key={t.runId}
                      cell={cell}
                      prev={prev}
                      side="away"
                      isPreKickoff={t.runId === preKickoffRunId}
                    />
                  );
                })}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineCellView({
  cell,
  prev,
  side,
  isPreKickoff,
}: {
  cell: { line: string; homeOdds: number | null; awayOdds: number | null } | undefined;
  prev: { line: string; homeOdds: number | null; awayOdds: number | null } | undefined | null;
  side: "home" | "away";
  isPreKickoff?: boolean;
}) {
  if (!cell) return <td className={`muted${isPreKickoff ? " tl-pre-kickoff" : ""}`}>—</td>;
  const val = side === "home" ? cell.homeOdds : cell.awayOdds;
  const prevVal = side === "home" ? prev?.homeOdds : prev?.awayOdds;
  const delta = val != null && prevVal != null ? val - prevVal : 0;
  const cls = (d: number) => (d > 0.001 ? "up" : d < -0.001 ? "down" : "flat");
  const lineChanged = prev && prev.line !== cell.line;
  return (
    <td
      className={`small${isPreKickoff ? " tl-pre-kickoff" : ""}`}
      style={{ whiteSpace: "nowrap" }}
    >
      {side === "home" && (
        <div className={lineChanged ? "line-changed" : ""}>{displayLine(cell.line)}</div>
      )}
      <div>
        <span className={`odds-val ${cls(delta)}`}>{val?.toFixed(2) ?? "—"}</span>
      </div>
    </td>
  );
}

