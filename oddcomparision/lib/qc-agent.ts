/**
 * QC agent — quality-control sweep that runs after every scrape tick (and on
 * standalone bootstrap). It complements lib/audit.ts, which is read-only:
 * QC both detects when odds may be unavailable / "off" and applies known-safe
 * auto-fixes inline so an operator doesn't need to react to every blip.
 *
 * Detections:
 *   no_recent_run         last successful ScrapeRun > NO_RUN_MS old
 *   no_recent_snapshots   newest OddsSnapshot > NO_SNAP_MS old
 *   site_failed           a site in this run finished with status!=ok
 *   site_output_drop      a site's snapshot count < 50% of its trailing-5 median
 *   orphans_with_sibling  Match rows with kickoff=null whose teams match a dated sibling
 *   inverted_ah_recent    AH rows in last hour whose line sign contradicts odds direction
 *
 * Auto-fixes (silent when nothing to do; logged when applied):
 *   reap_stale            mark SiteScrape/ScrapeRun rows still "running" > 20m as failed
 *   merge_orphans         repoint snapshots from orphan match → sibling, delete orphan
 *   fix_inverted_ah       rewrite handicapLine via normalizeAhSign for offending rows
 *   clear_browser_locks   kill chromium pids holding a site's profile dir + remove
 *                         SingletonLock / parent.lock so the next launchPersistentContext
 *                         doesn't fail. Triggered only when the site is actively failing
 *                         or had a sharp output drop — clearing locks for a healthy site
 *                         could race a normally-running scrape.
 *
 * What QC does NOT do:
 *   - Restart a dead scheduler process. The Windows scheduled task
 *     "OddComparison-Scheduler" handles that with RestartCount=99 / 1-min
 *     interval (see scripts/install-task.ps1). QC runs INSIDE the scheduler,
 *     so process-level resilience must come from outside it.
 *   - Re-run a scraper inline. The scheduler holds a tick mutex; calling
 *     runScrapeCycle from within QC would deadlock. Site failures wait for the
 *     next cron tick — QC's job is to prepare the ground (clear locks, reap
 *     stale rows) so that retry has a clean slate.
 */
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { prisma } from "./db";
import { normalizeAhSign } from "./scrape/line";

const PROFILES_ROOT = path.join(process.cwd(), ".browser_profiles");
const STALE_RUN_MS = 20 * 60 * 1000;
const NO_RUN_MS = 25 * 60 * 1000;
const NO_SNAP_MS = 30 * 60 * 1000;
const SITE_DROP_THRESHOLD = 0.5;
/** Per-match staleness: any upcoming match whose newest snapshot from a top
 *  book is older than this is flagged. Two cron ticks (15+15) covers a
 *  legitimate single-tick failure without crying wolf. */
const MATCH_STALE_MS = 30 * 60 * 1000;
/** Window we audit for upcoming matches. Far-future fixtures (3+ days out)
 *  legitimately have no recent snapshot from every book. */
const UPCOMING_WINDOW_MS = 36 * 60 * 60 * 1000;
/** Top books we expect to cover every upcoming top-league match. Mirrors the
 *  BOOK_COLUMNS render order in app/page.tsx. */
const TOP_BOOKS_FOR_AUDIT = [
  "winbao",
  "titan:3",
  "titan:31",
  "titan:17",
  "titan:35",
];

type Severity = "warn" | "error";
interface Finding {
  code: string;
  severity: Severity;
  detail?: string;
}
interface Fix {
  code: string;
  detail: string;
}

export interface QcReport {
  findings: Finding[];
  fixes: Fix[];
}

export async function runQcAgent(currentRunId?: number): Promise<QcReport> {
  const findings: Finding[] = [];
  const fixes: Fix[] = [];
  const now = Date.now();

  // ---- detections that only need DB reads -----------------------------------

  const lastOk = await prisma.scrapeRun.findFirst({
    where: { status: { in: ["ok", "partial"] } },
    orderBy: { id: "desc" },
  });
  if (!lastOk || now - lastOk.startedAt.getTime() > NO_RUN_MS) {
    findings.push({
      code: "no_recent_run",
      severity: "error",
      detail: lastOk
        ? `last ok run ${Math.floor((now - lastOk.startedAt.getTime()) / 60000)}m ago`
        : "no successful run on record",
    });
  }

  const lastSnap = await prisma.oddsSnapshot.findFirst({
    orderBy: { id: "desc" },
    select: { capturedAt: true },
  });
  if (!lastSnap || now - lastSnap.capturedAt.getTime() > NO_SNAP_MS) {
    findings.push({
      code: "no_recent_snapshots",
      severity: "error",
      detail: lastSnap
        ? `last snap ${Math.floor((now - lastSnap.capturedAt.getTime()) / 60000)}m ago`
        : "no snapshots ever",
    });
  }

  const runForCheck = currentRunId
    ? await prisma.scrapeRun.findUnique({
        where: { id: currentRunId },
        include: { sites: true },
      })
    : await prisma.scrapeRun.findFirst({
        orderBy: { id: "desc" },
        include: { sites: true },
      });

  const failedSites: string[] = (runForCheck?.sites || [])
    .filter((s) => s.status !== "ok")
    .map((s) => s.site);
  if (failedSites.length) {
    findings.push({
      code: "site_failed",
      severity: "error",
      detail: failedSites.join(","),
    });
  }

  // Per-site output drop — compare this run's count to the median of the last
  // 5 successful per-site rows. Catches a parser regression that returns rows
  // (so site=ok) but far fewer than usual.
  const droppedSites: string[] = [];
  if (runForCheck) {
    const recent = await prisma.siteScrape.findMany({
      where: {
        status: "ok",
        runId: { not: runForCheck.id },
        finishedAt: { not: null },
      },
      orderBy: { id: "desc" },
      take: 30,
    });
    const bySite = new Map<string, number[]>();
    for (const s of recent) {
      const arr = bySite.get(s.site) ?? [];
      if (arr.length < 5) arr.push(s.matchesCount);
      bySite.set(s.site, arr);
    }
    for (const cur of runForCheck.sites) {
      if (cur.status !== "ok") continue;
      const hist = bySite.get(cur.site);
      if (!hist || hist.length < 3) continue;
      const sorted = [...hist].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      if (median > 0 && cur.matchesCount < median * SITE_DROP_THRESHOLD) {
        findings.push({
          code: "site_output_drop",
          severity: "warn",
          detail: `${cur.site} ${cur.matchesCount} vs median ${median}`,
        });
        droppedSites.push(cur.site);
      }
    }
  }

  // ---- auto-fixes -----------------------------------------------------------

  // 1) Reap stale "running" rows. The scheduler does this on boot only; QC
  //    repeats it every tick so a hang that didn't crash the daemon still
  //    surfaces as a failure rather than a perpetual "running" row.
  const staleCutoff = new Date(now - STALE_RUN_MS);
  const staleSites = await prisma.siteScrape.updateMany({
    where: { status: "running", startedAt: { lt: staleCutoff } },
    data: {
      status: "failed",
      error: "reaped by QC agent (stale)",
      finishedAt: new Date(),
    },
  });
  const staleRuns = await prisma.scrapeRun.updateMany({
    where: { status: "running", startedAt: { lt: staleCutoff } },
    data: {
      status: "failed",
      error: "reaped by QC agent (stale)",
      finishedAt: new Date(),
    },
  });
  if (staleSites.count + staleRuns.count > 0) {
    fixes.push({
      code: "reap_stale",
      detail: `${staleSites.count} SiteScrape + ${staleRuns.count} ScrapeRun`,
    });
  }

  // 2) Merge orphan matches whose teams match a dated sibling. Every orphan
  //    with a sibling is a dedupe miss caused by winbao's 今日 tab returning
  //    no kickoff for a few matches; the orphan accumulates snapshots until
  //    we collapse it.
  const orphans = await prisma.match.findMany({ where: { kickoff: null } });
  let mergedOrphans = 0;
  let mergedSnaps = 0;
  for (const o of orphans) {
    const sibling = await prisma.match.findFirst({
      where: {
        id: { not: o.id },
        home: o.home,
        away: o.away,
        kickoff: { not: null },
      },
    });
    if (!sibling) continue;
    const moved = await prisma.oddsSnapshot.updateMany({
      where: { matchId: o.id },
      data: { matchId: sibling.id },
    });
    await prisma.match.delete({ where: { id: o.id } });
    mergedOrphans++;
    mergedSnaps += moved.count;
  }
  if (mergedOrphans > 0) {
    fixes.push({
      code: "merge_orphans",
      detail: `${mergedOrphans} matches, ${mergedSnaps} snaps`,
    });
  }

  // 3) Rewrite inverted AH rows in the last hour. normalizeAhSign already runs
  //    at persist time, so we expect zero matches here — but if a parser
  //    regression slipped through we recover the rows in-place rather than
  //    leaving the dashboard with bad data until next tick.
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const recentAh = await prisma.oddsSnapshot.findMany({
    where: { market: "AH", capturedAt: { gt: hourAgo } },
    select: { id: true, handicapLine: true, homeOdds: true, awayOdds: true },
  });
  let invertedFixed = 0;
  for (const r of recentAh) {
    if (r.homeOdds == null || r.awayOdds == null) continue;
    const fixed = normalizeAhSign(r.handicapLine, r.homeOdds, r.awayOdds);
    if (fixed !== r.handicapLine) {
      await prisma.oddsSnapshot.update({
        where: { id: r.id },
        data: { handicapLine: fixed },
      });
      invertedFixed++;
    }
  }
  if (invertedFixed > 0) {
    findings.push({
      code: "inverted_ah_recent",
      severity: "error",
      detail: `${invertedFixed} rows`,
    });
    fixes.push({ code: "fix_inverted_ah", detail: `${invertedFixed} rows` });
  }

  // 4) Clear browser-profile locks for sites that just failed or dropped
  //    output. We don't sweep every profile every tick — clearing a lock for
  //    a site that's currently scraping inside its own daemon would race.
  const sitesToUnlock = new Set<string>();
  for (const s of failedSites) {
    const dir = siteToProfileDir(s);
    if (dir) sitesToUnlock.add(dir);
  }
  for (const s of droppedSites) {
    const dir = siteToProfileDir(s);
    if (dir) sitesToUnlock.add(dir);
  }
  for (const dir of sitesToUnlock) {
    const cleared = clearChromiumLocks(path.join(PROFILES_ROOT, dir));
    if (cleared.length) {
      fixes.push({
        code: "clear_browser_locks",
        detail: `${dir}: ${cleared.join(",")}`,
      });
    }
  }

  // 5) Orphan-with-sibling check is now satisfied by the merge fix above —
  //    surface the count we resolved as a warn so it shows up in summary even
  //    when the merge ran cleanly.
  if (mergedOrphans === 0) {
    // Re-check in case there are orphans WITHOUT siblings (we skipped those).
    const orphansLeft = await prisma.match.count({ where: { kickoff: null } });
    if (orphansLeft > 0) {
      findings.push({
        code: "orphans_no_sibling",
        severity: "warn",
        detail: `${orphansLeft} matches`,
      });
    }
  }

  // 6) Per-match staleness audit. For every upcoming match in the next 36h,
  //    confirm at least one top book has a snapshot fresher than 30 min. A
  //    match that goes silent across every book usually means the fixture
  //    was removed from the source feed (delayed kickoff, postponement, or
  //    UI collapse) — operator should investigate. We log up to 5 examples
  //    on the [qc] line so the failure surfaces immediately.
  const koWindowEnd = new Date(now + UPCOMING_WINDOW_MS);
  const upcoming = await prisma.match.findMany({
    where: { kickoff: { gt: new Date(now), lt: koWindowEnd } },
    select: { id: true, home: true, away: true, league: true, kickoff: true },
  });
  // Per-book per-match staleness: a book that priced this match historically
  // is expected to keep pricing it through kickoff. If it stops updating for
  // 30+ min while OTHER books continue, that's a source-side regression
  // worth surfacing. Catches the case where winbao silently drops a fixture
  // from its 早盘 tab even though titan still covers it (= 21+ hour gap on
  // the dashboard for that one book column).
  const staleBookEntries: { match: string; site: string; ageMin: number }[] = [];
  const missingBookMatches: { match: string; missing: string[] }[] = [];
  for (const m of upcoming) {
    const latestPerSite = await prisma.oddsSnapshot.groupBy({
      by: ["site"],
      where: { matchId: m.id, market: "AH" },
      _max: { capturedAt: true },
    });
    const seenSites = new Set(latestPerSite.map((r) => r.site));
    for (const r of latestPerSite) {
      if (!TOP_BOOKS_FOR_AUDIT.includes(r.site)) continue;
      if (r._max.capturedAt == null) continue;
      const age = now - r._max.capturedAt.getTime();
      if (age > MATCH_STALE_MS) {
        staleBookEntries.push({
          match: `${m.home} vs ${m.away}`,
          site: r.site,
          ageMin: Math.floor(age / 60000),
        });
      }
    }
    // Missing-book = some top book has NEVER snapshotted this fixture. Less
    // severe than stale (could just be a book that doesn't price the league),
    // but worth surfacing for matches in the next 24h.
    if (m.kickoff && m.kickoff.getTime() < now + 24 * 60 * 60 * 1000) {
      const missing = TOP_BOOKS_FOR_AUDIT.filter((b) => !seenSites.has(b));
      if (missing.length > 0 && missing.length < TOP_BOOKS_FOR_AUDIT.length) {
        // Skip matches where ALL top books are missing — those are usually
        // matches discovered very recently and not yet covered by any book;
        // the next 1-2 ticks will populate them.
        missingBookMatches.push({
          match: `${m.home} vs ${m.away}`,
          missing,
        });
      }
    }
  }
  if (staleBookEntries.length > 0) {
    // Group by match so the summary tells the operator "match X is stale on
    // book Y" not "10 stale rows scattered everywhere". The first 3 examples
    // land on the [qc] line; the rest are noted by count.
    const byMatch = new Map<string, string[]>();
    for (const e of staleBookEntries) {
      const arr = byMatch.get(e.match) ?? [];
      arr.push(`${e.site}@${e.ageMin}m`);
      byMatch.set(e.match, arr);
    }
    const examples = [...byMatch.entries()]
      .slice(0, 3)
      .map(([m, sites]) => `${m} [${sites.join(",")}]`);
    findings.push({
      code: "stale_book_per_match",
      severity: "warn",
      detail: `${staleBookEntries.length} rows across ${byMatch.size} matches (${examples.join("; ")}${byMatch.size > 3 ? ` …+${byMatch.size - 3}` : ""})`,
    });
  }
  if (missingBookMatches.length > 0) {
    findings.push({
      code: "match_missing_book",
      severity: "warn",
      detail: `${missingBookMatches.length} matches (e.g. ${missingBookMatches[0].match} missing ${missingBookMatches[0].missing.join(",")})`,
    });
  }

  return { findings, fixes };
}

/**
 * Map a SiteScrape.site key ("winbao", "titan", "winbao#2") to the directory
 * name under .browser_profiles. titan uses raw HTTP and has no profile, so
 * those sites return empty.
 */
function siteToProfileDir(site: string): string {
  const base = site.replace(/#.*$/, "").replace(/:.*$/, "");
  if (base === "winbao") return "winbao";
  return "";
}

/**
 * Best-effort browser-profile unlock. Kills any chrome.exe whose command line
 * references the profile dir, then removes the well-known lock files. Returns
 * a list of actions taken so the QC summary can report them.
 */
function clearChromiumLocks(profileDir: string): string[] {
  if (!fs.existsSync(profileDir)) return [];
  const actions: string[] = [];

  try {
    const escaped = profileDir.replace(/\\/g, "\\\\").replace(/'/g, "''");
    const ps = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | ` +
          `Where-Object { $_.CommandLine -match [regex]::Escape('${escaped}') } | ` +
          `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; ` +
          `Write-Output ("killed_chrome_" + $_.ProcessId) }`,
      ],
      { encoding: "utf8", timeout: 10000 }
    );
    if (ps.stdout) {
      ps.stdout
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => actions.push(s));
    }
  } catch {
    /* PowerShell may be unavailable on non-Windows; ignore. */
  }

  // Lock files Chromium creates in a persistent profile. Removing them after
  // the holding process is dead lets launchPersistentContext succeed on the
  // next attempt. Symlinks on Linux/macOS are skipped via lstat checks.
  const lockNames = [
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
    "parent.lock",
  ];
  for (const f of lockNames) {
    const p = path.join(profileDir, f);
    try {
      const st = fs.lstatSync(p);
      if (st.isFile() || st.isSymbolicLink()) {
        fs.unlinkSync(p);
        actions.push(`removed_${f}`);
      }
    } catch {
      /* file not present — nothing to do */
    }
  }
  return actions;
}

/** One-line summary for the scheduler log. */
export function formatQcSummary(r: QcReport): string {
  const tags: string[] = [];
  for (const f of r.findings) {
    const sev = f.severity === "error" ? "✗" : "!";
    tags.push(`${sev}${f.code}${f.detail ? `=${f.detail}` : ""}`);
  }
  for (const fx of r.fixes) {
    tags.push(`✓${fx.code}=${fx.detail}`);
  }
  if (tags.length === 0) return "[qc] ✓ clean";
  return `[qc] ${tags.join(" | ")}`;
}
