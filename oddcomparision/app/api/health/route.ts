/**
 * Public health + odds-freshness summary endpoint. Designed for the hourly
 * remote monitor (claude.ai routine) to poll from outside this network so
 * scheduler outages or stale-odds regressions are caught without local
 * access.
 *
 * Returned shape (stable; the monitor parses this):
 *   {
 *     ok: boolean,                       // overall green/red — false if any alert fires
 *     alerts: string[],                  // human-readable reasons it's not ok
 *     now: ISOString,                    // server clock at response time
 *     lastRun: { id, status, startedAt, finishedAt, ageMin } | null,
 *     latestSnapshot: { capturedAt, ageMin } | null,
 *     upcoming: {
 *       window: "next 36h",
 *       total: number,
 *       withFreshTopBook: number,        // matches with at least one top book < 30 min old
 *       staleBookFlags: number,          // (match × top-book) pairs older than 30 min
 *     },
 *     sites: [{ site, status, matchesCount }],   // current run's per-site result
 *   }
 *
 * No team names, no per-match data. Just aggregate counts. Safe to leave
 * unauthenticated.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOP_BOOKS = [
  "winbao",
  "winbao#2",
  "titan:3",
  "titan:3#2",
  "titan:17",
  "titan:17#2",
  "titan:31",
  "titan:31#2",
  "titan:35",
  "titan:35#2",
];
const NO_RUN_MS = 30 * 60 * 1000;
const NO_SNAP_MS = 30 * 60 * 1000;
const STALE_BOOK_MS = 30 * 60 * 1000;
const UPCOMING_WINDOW_MS = 36 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  const alerts: string[] = [];

  const lastRun = await prisma.scrapeRun.findFirst({
    orderBy: { id: "desc" },
    include: { sites: true },
  });
  const latestSnap = await prisma.oddsSnapshot.findFirst({
    orderBy: { id: "desc" },
    select: { capturedAt: true },
  });

  if (!lastRun) {
    alerts.push("no scrape runs on record");
  } else if (now - lastRun.startedAt.getTime() > NO_RUN_MS) {
    alerts.push(
      `last run started ${Math.floor((now - lastRun.startedAt.getTime()) / 60000)}m ago (>${NO_RUN_MS / 60000}m)`
    );
  } else if (lastRun.status === "failed") {
    alerts.push("last run status=failed");
  }

  if (!latestSnap) {
    alerts.push("no snapshots on record");
  } else if (now - latestSnap.capturedAt.getTime() > NO_SNAP_MS) {
    alerts.push(
      `latest snapshot ${Math.floor((now - latestSnap.capturedAt.getTime()) / 60000)}m old (>${NO_SNAP_MS / 60000}m)`
    );
  }

  // Per-match freshness audit, mirrors the QC agent's stale_book_per_match
  // check but rolled up for the response. We don't list match names — keeps
  // the endpoint truly read-only-aggregate.
  const upcoming = await prisma.match.findMany({
    where: { kickoff: { gt: new Date(now), lt: new Date(now + UPCOMING_WINDOW_MS) } },
    select: { id: true },
  });
  let withFreshTopBook = 0;
  let staleBookFlags = 0;
  let matchesWithoutAnyFresh = 0;
  for (const m of upcoming) {
    const latestPerSite = await prisma.oddsSnapshot.groupBy({
      by: ["site"],
      where: { matchId: m.id, market: "AH" },
      _max: { capturedAt: true },
    });
    let anyFresh = false;
    for (const r of latestPerSite) {
      if (!TOP_BOOKS.includes(r.site)) continue;
      if (r._max.capturedAt == null) continue;
      const age = now - r._max.capturedAt.getTime();
      if (age <= STALE_BOOK_MS) anyFresh = true;
      else staleBookFlags++;
    }
    if (anyFresh) withFreshTopBook++;
    else if (latestPerSite.length > 0) matchesWithoutAnyFresh++;
  }
  if (matchesWithoutAnyFresh > 0) {
    alerts.push(
      `${matchesWithoutAnyFresh} upcoming match(es) have ZERO fresh top books`
    );
  }

  return NextResponse.json(
    {
      ok: alerts.length === 0,
      alerts,
      now: new Date(now).toISOString(),
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            startedAt: lastRun.startedAt.toISOString(),
            finishedAt: lastRun.finishedAt?.toISOString() ?? null,
            ageMin: Math.floor((now - lastRun.startedAt.getTime()) / 60000),
          }
        : null,
      latestSnapshot: latestSnap
        ? {
            capturedAt: latestSnap.capturedAt.toISOString(),
            ageMin: Math.floor((now - latestSnap.capturedAt.getTime()) / 60000),
          }
        : null,
      upcoming: {
        window: "next 36h",
        total: upcoming.length,
        withFreshTopBook,
        staleBookFlags,
      },
      sites:
        lastRun?.sites.map((s) => ({
          site: s.site,
          status: s.status,
          matchesCount: s.matchesCount,
        })) ?? [],
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
