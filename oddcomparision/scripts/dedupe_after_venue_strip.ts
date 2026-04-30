/**
 * One-shot: re-compute matchKey for every Match under the venue-strip-aware
 * normalizer (lib/scrape/normalize.ts after 2026-04-30) and merge any rows
 * that now collide. Catches the (中)/(主)/(客) duplicates that survived the
 * pre-fix dedupe — Shakhtar 中 vs Crystal Palace was the canonical case.
 *
 * For each collision: keep the lowest-id row (oldest) as canonical, repoint
 * every snapshot from the duplicates, then delete them.
 *
 * Run: tsx scripts/dedupe_after_venue_strip.ts
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { matchKey } from "../lib/scrape/normalize";

(async () => {
  const all = await prisma.match.findMany({
    select: { id: true, home: true, away: true, kickoff: true, dedupeKey: true },
    orderBy: { id: "asc" },
  });
  console.log(`scanning ${all.length} matches under updated normalizer`);

  const groups = new Map<string, typeof all>();
  for (const m of all) {
    const key = matchKey(m.home, m.away, m.kickoff ?? undefined);
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  let collisions = 0;
  let merged = 0;
  let snapsMoved = 0;

  for (const [key, rows] of groups) {
    if (rows.length < 2) continue;
    collisions++;
    const canonical = rows[0]; // lowest id
    const dups = rows.slice(1);
    console.log(
      `\nkey=${key} canonical=#${canonical.id} (${canonical.home} vs ${canonical.away})`
    );
    for (const d of dups) {
      const moved = await prisma.oddsSnapshot.updateMany({
        where: { matchId: d.id },
        data: { matchId: canonical.id },
      });
      // Update canonical's dedupeKey + names if the canonical's stored
      // dedupeKey doesn't match the new one. The Match.dedupeKey is unique,
      // so update before delete to avoid a transient unique-violation if any
      // future inserts collide.
      await prisma.match.delete({ where: { id: d.id } });
      console.log(
        `  merged #${d.id} (${d.home} vs ${d.away}) → ${moved.count} snaps moved`
      );
      merged++;
      snapsMoved += moved.count;
    }
    // Refresh canonical's dedupeKey to the new key, if it differs.
    if (canonical.dedupeKey !== key) {
      await prisma.match.update({
        where: { id: canonical.id },
        data: { dedupeKey: key },
      });
      console.log(`  rekeyed canonical → ${key}`);
    }
  }

  console.log(
    `\ndone — ${collisions} collisions, ${merged} duplicate matches deleted, ${snapsMoved} snapshots moved`
  );
  process.exit(0);
})();
