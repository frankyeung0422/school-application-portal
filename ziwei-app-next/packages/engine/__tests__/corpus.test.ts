/**
 * Corpus regression suite.
 *
 * Each JSON fixture under __tests__/corpus/ describes a known-good birth →
 * expected chart fields. This test loads all of them and asserts the engine
 * still produces the same output.
 *
 * Fixtures with `expected: null` are SKIPPED (intentional placeholders
 * waiting for textbook-verified data).
 */

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { computeChart, MAIN_STARS } from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.join(__dirname, 'corpus');

interface Fixture {
  id: string;
  source: string;
  note?: string;
  birth: Parameters<typeof computeChart>[0];
  expected: null | {
    engineVersion?: string;
    mingongBranch?: string;
    yearGanzhi?: string;
    bureau?: string;
    mingongMainStars?: string[]; // sorted, main (14) stars only
    palaceStarCount?: number; // total MAIN stars across palaces (always 14)
  };
}

function loadFixtures(): Fixture[] {
  return readdirSync(CORPUS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = readFileSync(path.join(CORPUS_DIR, f), 'utf8');
      return JSON.parse(raw) as Fixture;
    });
}

describe('engine corpus regression', () => {
  const fixtures = loadFixtures();

  if (fixtures.length === 0) {
    it.skip('no corpus fixtures', () => {});
    return;
  }

  for (const fx of fixtures) {
    if (fx.expected === null) {
      it.skip(`${fx.id} — placeholder (no expected data)`, () => {});
      continue;
    }

    it(`${fx.id}`, () => {
      const chart = computeChart(fx.birth);
      const mingong = chart.palaces.find((p) => p.isMingong)!;
      const isMain = (n: string) => (MAIN_STARS as readonly string[]).includes(n);
      const mingongStars = mingong.stars.map((s) => s.name).filter(isMain).sort();

      if (fx.expected.engineVersion) expect(chart.engineVersion).toBe(fx.expected.engineVersion);
      if (fx.expected.mingongBranch) expect(mingong.branch).toBe(fx.expected.mingongBranch);
      if (fx.expected.yearGanzhi) expect(chart.yearGanzhi).toBe(fx.expected.yearGanzhi);
      if (fx.expected.bureau) expect(chart.bureau.bureau).toBe(fx.expected.bureau);
      if (fx.expected.mingongMainStars) {
        expect(new Set(mingongStars)).toEqual(new Set(fx.expected.mingongMainStars));
      }
      if (typeof fx.expected.palaceStarCount === 'number') {
        const total = chart.palaces.flatMap((p) => p.stars).filter((s) => isMain(s.name)).length;
        expect(total).toBe(fx.expected.palaceStarCount);
      }
    });
  }
});
