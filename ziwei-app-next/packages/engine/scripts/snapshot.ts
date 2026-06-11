// Helper script to dump current engine output for corpus snapshots.
// Run with: pnpm --filter @ziwei/engine exec tsx scripts/snapshot.ts
// Writes the fixtures under __tests__/corpus/ directly (UTF-8, no BOM).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeChart, MAIN_STARS } from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, '..', '__tests__', 'corpus');

const cases = [
  { id: 'snap-1990-06-15-14-M', note: 'Regression snapshot. Replace with textbook-verified values once 紫雲 corpus is loaded.', birth: { year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M' as const, calendar: 'solar' as const } },
  { id: 'snap-1985-01-01-08-F', note: 'Regression snapshot. Replace with textbook-verified values once 紫雲 corpus is loaded.', birth: { year: 1985, month: 1, day: 1, hour: 8, minute: 0, gender: 'F' as const, calendar: 'solar' as const } },
  { id: 'snap-2000-12-25-23-M', note: 'Regression snapshot. Late 子時 edge case (23:00).', birth: { year: 2000, month: 12, day: 25, hour: 23, minute: 0, gender: 'M' as const, calendar: 'solar' as const } },
  { id: 'snap-jay-chou', note: 'Jay Chou 周杰倫 — birth time unknown, computed at noon. Used to validate celebrity-page consistency.', birth: { year: 1979, month: 1, day: 18, hour: 12, minute: 0, gender: 'M' as const, calendar: 'solar' as const } },
  { id: 'snap-chow-yun-fat', note: 'Chow Yun-fat 周潤發 — birth time unknown, computed at noon. Used to validate celebrity-page consistency.', birth: { year: 1955, month: 5, day: 18, hour: 12, minute: 0, gender: 'M' as const, calendar: 'solar' as const } },
];

const isMain = (n: string) => (MAIN_STARS as readonly string[]).includes(n);

for (const c of cases) {
  const ch = computeChart(c.birth);
  const mg = ch.palaces.find((p) => p.isMingong)!;
  const fixture = {
    id: c.id,
    source: 'engine-snapshot-2026-06',
    note: c.note,
    birth: c.birth,
    expected: {
      engineVersion: ch.engineVersion,
      mingongBranch: mg.branch,
      yearGanzhi: ch.yearGanzhi,
      bureau: ch.bureau.bureau,
      mingongMainStars: mg.stars.map((s) => s.name).filter(isMain).sort(),
      palaceStarCount: ch.palaces.flatMap((p) => p.stars).filter((s) => isMain(s.name)).length,
    },
  };
  const file = path.join(CORPUS_DIR, `${c.id}.json`);
  writeFileSync(file, JSON.stringify(fixture, null, 2) + '\n', 'utf8');
  console.log(`wrote ${file}`);
}
