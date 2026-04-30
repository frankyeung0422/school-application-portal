/**
 * Orchestrator — runs all site scrapers for one scrape cycle, persists results,
 * and records a ScrapeRun summary.
 */
import { prisma } from "../db";
import { scrapeWinbao } from "./winbao";
import { scrapeTitan } from "./titan";
import { scrapeCrown } from "./crown";
import { matchKey } from "./normalize";
import { isTopLeague, canonicalLeague } from "./leagues";
import { normalizeAhSign } from "./line";
import type { ScrapeResult } from "./types";

export interface RunSummary {
  runId: number;
  status: "ok" | "partial" | "failed";
  sites: { site: string; ok: boolean; count: number; error?: string }[];
  totalSnapshots: number;
}

export async function runScrapeCycle(): Promise<RunSummary> {
  const run = await prisma.scrapeRun.create({ data: { status: "running" } });

  // Run site scrapers in parallel — they use separate browser profiles, no contention.
  // Crown is gated on CROWN_USER being set: an empty value means the operator
  // has not provisioned credentials, so we skip the run instead of producing a
  // failed SiteScrape every 15 min.
  const crownEnabled = !!process.env.CROWN_USER;
  const [winbao, titan, crown] = await Promise.all([
    runOneSite(run.id, scrapeWinbao, "winbao"),
    runOneSite(run.id, scrapeTitan, "titan"),
    crownEnabled
      ? runOneSite(run.id, scrapeCrown, "crown")
      : Promise.resolve({ site: "crown", ok: true, count: 0 }),
  ]);

  const results = crownEnabled ? [winbao, titan, crown] : [winbao, titan];
  const anyFailed = results.some((r) => !r.ok);
  const allFailed = results.every((r) => !r.ok);
  const status = allFailed ? "failed" : anyFailed ? "partial" : "ok";

  const totalSnapshots = results.reduce((s, r) => s + r.count, 0);

  await prisma.scrapeRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      status,
    },
  });

  return {
    runId: run.id,
    status,
    sites: results,
    totalSnapshots,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function runOneSite(
  runId: number,
  scraper: () => Promise<ScrapeResult>,
  site: string
): Promise<{ site: string; ok: boolean; count: number; error?: string }> {
  const siteScrape = await prisma.siteScrape.create({
    data: { runId, site, status: "running" },
  });

  // Hard per-site timeout. Without this, a hung Playwright stack (Imperva
  // throttle, silent context-close, dangling waitForTimeout) leaves the cron
  // tick locked forever and the SiteScrape row stuck at "running".
  const timeoutMs = parseInt(process.env.SCRAPE_SITE_TIMEOUT_MS || "900000", 10);
  let result: ScrapeResult;
  try {
    result = await Promise.race<ScrapeResult>([
      scraper(),
      new Promise<ScrapeResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`scraper timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  } catch (e: any) {
    await prisma.siteScrape.update({
      where: { id: siteScrape.id },
      data: { status: "failed", error: String(e?.message || e), finishedAt: new Date() },
    });
    return { site, ok: false, count: 0, error: String(e?.message || e) };
  }

  if (!result.ok) {
    await prisma.siteScrape.update({
      where: { id: siteScrape.id },
      data: { status: "failed", error: result.error, finishedAt: new Date() },
    });
    return { site, ok: false, count: 0, error: result.error };
  }

  // Persist in batches instead of per-row upserts to avoid SQLite connector
  // timeouts on large scrape cycles.
  const filtered = result.odds.filter((o) => isTopLeague(o.league));

  // Pre-resolve kickoffs for rows where the source didn't provide one. Live
  // (滚球) matches show "上半场 18'" not a date, so winbao parseKickoff returns
  // null and the dedupeKey ends up with no date — every live tick would then
  // create a fresh orphan match instead of merging with titan's dated record.
  // Look up by normalized teams against existing Match rows that DO have a
  // kickoff and inherit it. Any same-team Match is used; this is safe because
  // top-league fixtures don't repeat within the scrape window.
  const needsKickoff = filtered.filter((o) => !o.kickoff);
  if (needsKickoff.length > 0) {
    const teamsTried = new Set<string>();
    for (const o of needsKickoff) {
      const k = `${o.home}__${o.away}`;
      if (teamsTried.has(k)) continue;
      teamsTried.add(k);
      const sibling = await prisma.match.findFirst({
        where: { home: o.home, away: o.away, kickoff: { not: null } },
        select: { kickoff: true },
        orderBy: { id: "desc" },
      });
      if (sibling?.kickoff) {
        // Apply to every filtered row sharing these teams
        for (const r of filtered) {
          if (!r.kickoff && r.home === o.home && r.away === o.away) {
            r.kickoff = sibling.kickoff;
          }
        }
      }
    }
  }

  const keyMap = new Map<
    string,
    { dedupeKey: string; league: string; home: string; away: string; kickoff: Date | null }
  >();
  for (const o of filtered) {
    const dedupeKey = matchKey(o.home, o.away, o.kickoff);
    if (!keyMap.has(dedupeKey)) {
      keyMap.set(dedupeKey, {
        dedupeKey,
        league: canonicalLeague(o.league),
        home: o.home,
        away: o.away,
        kickoff: o.kickoff ?? null,
      });
    }
  }

  const keys = [...keyMap.keys()];
  const byKey = new Map<string, number>();

  // Existing match's stored kickoff, by dedupeKey. Used below to detect
  // mismatches against the value parsed in this scrape.
  const existingKickoff = new Map<string, Date | null>();

  for (const keysChunk of chunk(keys, 300)) {
    if (keysChunk.length === 0) continue;
    const existing = await prisma.match.findMany({
      where: { dedupeKey: { in: keysChunk } },
      select: { id: true, dedupeKey: true, kickoff: true },
    });
    for (const m of existing) {
      byKey.set(m.dedupeKey, m.id);
      existingKickoff.set(m.dedupeKey, m.kickoff);
    }
  }

  // Self-heal kickoffs from titan. winbao early-tab once-stored kickoffs in
  // HG-server time but parsed them as HKT, leaving rows with kickoffs 12h
  // earlier than reality. Titan's parse is unambiguous (M-D HH:MM, HKT), so
  // when titan sees an existing match whose stored kickoff differs by more
  // than an hour, overwrite. Only titan does this — winbao never overrides
  // titan's value.
  if (site === "titan") {
    const updates: { id: number; kickoff: Date }[] = [];
    for (const [key, info] of keyMap) {
      const id = byKey.get(key);
      if (!id || !info.kickoff) continue;
      const stored = existingKickoff.get(key);
      if (!stored) continue;
      const drift = Math.abs(info.kickoff.getTime() - stored.getTime());
      if (drift > 60 * 60 * 1000) {
        updates.push({ id, kickoff: info.kickoff });
      }
    }
    if (updates.length > 0) {
      console.log(`[titan] correcting ${updates.length} match kickoffs`);
      for (const u of updates) {
        await prisma.match.update({ where: { id: u.id }, data: { kickoff: u.kickoff } });
      }
    }
  }

  const missing = keys
    .filter((k) => !byKey.has(k))
    .map((k) => {
      const m = keyMap.get(k)!;
      return {
        dedupeKey: m.dedupeKey,
        league: m.league,
        home: m.home,
        away: m.away,
        kickoff: m.kickoff,
      };
    });

  for (const missingChunk of chunk(missing, 200)) {
    if (missingChunk.length === 0) continue;
    try {
      await prisma.match.createMany({ data: missingChunk });
    } catch {
      // Concurrent run may have inserted some keys; refresh map below.
    }
  }

  // Refresh IDs so every dedupe key can be mapped to a matchId.
  for (const keysChunk of chunk(keys, 300)) {
    if (keysChunk.length === 0) continue;
    const rows = await prisma.match.findMany({
      where: { dedupeKey: { in: keysChunk } },
      select: { id: true, dedupeKey: true },
    });
    for (const m of rows) byKey.set(m.dedupeKey, m.id);
  }

  const snapshots: {
    runId: number;
    matchId: number;
    site: string;
    market: string;
    handicapLine: string;
    homeOdds: number | null;
    awayOdds: number | null;
  }[] = [];
  for (const o of filtered) {
    const dedupeKey = matchKey(o.home, o.away, o.kickoff);
    const matchId = byKey.get(dedupeKey);
    if (!matchId) continue;
    // Defensive sign-normalizer: catches any AH row whose stored line sign
    // contradicts which side the odds actually favor. Applies to every site —
    // winbao, titan, and anything added later — so a single source-side
    // regression cannot leak inverted lines into the DB. OU is symmetric and
    // exempt.
    const normalizedLine =
      o.market === "AH"
        ? normalizeAhSign(o.handicapLine, o.homeOdds ?? null, o.awayOdds ?? null)
        : o.handicapLine;
    snapshots.push({
      runId,
      matchId,
      site: o.site ?? result.site,
      market: o.market,
      handicapLine: normalizedLine,
      homeOdds: o.homeOdds ?? null,
      awayOdds: o.awayOdds ?? null,
    });
  }

  for (const snapChunk of chunk(snapshots, 500)) {
    if (snapChunk.length === 0) continue;
    await prisma.oddsSnapshot.createMany({ data: snapChunk });
  }
  const saved = snapshots.length;

  await prisma.siteScrape.update({
    where: { id: siteScrape.id },
    data: {
      status: "ok",
      matchesCount: saved,
      finishedAt: new Date(),
    },
  });

  return { site, ok: true, count: saved };
}
