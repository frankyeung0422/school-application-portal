/**
 * External-oracle and invariant validation for the bazi + qizheng engines
 * (the iztro cross-check guards ziwei; these guard the other two).
 *
 * BaZi: structural invariants that don't need an oracle — day pillars advance
 * exactly one step of the 60-cycle per day; year pillar flips at 立春; month
 * pillar changes exactly 12 times per solar year.
 *
 * Qizheng: the Sun's tropical longitude at published equinox/solstice instants
 * must be 0/90/180/270° to within arcminutes — this validates the whole
 * ephemeris + frame pipeline (astronomy-engine wiring, obliquity, time math).
 */

import { describe, it, expect } from 'vitest';
import { solarToLunar, computeBazi, computeQizhengChart, type BirthInfo } from '../src';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function ganzhiIndex(gz: string): number {
  const s = STEMS.indexOf(gz[0]);
  const b = BRANCHES.indexOf(gz[1]);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  throw new Error(`bad ganzhi ${gz}`);
}

describe('bazi invariants', () => {
  it('day pillar advances exactly one 60-cycle step per day (400-day window)', () => {
    let prev: number | null = null;
    const start = Date.UTC(2023, 0, 1, 4, 0); // 12:00 HKT
    for (let i = 0; i < 400; i++) {
      const d = new Date(start + i * 86_400_000);
      const { ganzhi } = solarToLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 12, 0);
      const idx = ganzhiIndex(ganzhi.dayGanzhi);
      if (prev !== null) expect(idx).toBe((prev + 1) % 60);
      prev = idx;
    }
  });

  it('bazi year pillar flips at 立春 (2024-02-04); ziwei yearGanzhi flips at CNY', () => {
    // BaZi convention: 立春 boundary.
    const mk = (month: number, day: number): BirthInfo =>
      ({ year: 2024, month, day, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });
    expect(computeBazi(mk(2, 3)).pillars.year.ganzhi).toBe('癸卯');
    expect(computeBazi(mk(2, 5)).pillars.year.ganzhi).toBe('甲辰');
    // Ziwei convention (matches iztro): 農曆正月初一 boundary — CNY 2024 = Feb 10.
    expect(solarToLunar(2024, 2, 5, 12, 0).ganzhi.yearGanzhi).toBe('癸卯');
    expect(solarToLunar(2024, 2, 12, 12, 0).ganzhi.yearGanzhi).toBe('甲辰');
    expect(solarToLunar(2024, 1, 1, 12, 0).ganzhi.yearGanzhi).toBe('癸卯');
  });

  it('month pillar changes exactly 12 times over a solar year (節氣 boundaries)', () => {
    let prev = '';
    let transitions = 0;
    const start = Date.UTC(2024, 1, 5, 4, 0); // just after 立春 2024
    for (let i = 0; i < 365; i++) {
      const d = new Date(start + i * 86_400_000);
      const { ganzhi } = solarToLunar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), 12, 0);
      if (prev && ganzhi.monthGanzhi !== prev) transitions++;
      prev = ganzhi.monthGanzhi;
    }
    expect(transitions).toBe(12);
  });

  it('大運 direction: 陽男 forward / 陽女 backward from the month pillar', () => {
    const male = computeBazi({ year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar' });
    const female = computeBazi({ year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'F', calendar: 'solar' });
    const monthIdx = ganzhiIndex(male.pillars.month.ganzhi);
    expect(ganzhiIndex(male.luckPillars[0].ganzhi)).toBe((monthIdx + 1) % 60);
    expect(ganzhiIndex(female.luckPillars[0].ganzhi)).toBe((monthIdx + 59) % 60);
  });
});

describe('qizheng ephemeris precision', () => {
  // Published instants (UTC) of the 2000 equinoxes/solstices; engine input is
  // HKT (UTC+8). Sun's tropical longitude must be 0/90/180/270 ± a few arcmin.
  const cases: Array<{ label: string; birth: BirthInfo; lon: number }> = [
    { label: 'March equinox 2000 (07:35 UTC)', birth: { year: 2000, month: 3, day: 20, hour: 15, minute: 35, gender: 'M', calendar: 'solar' }, lon: 0 },
    { label: 'June solstice 2000 (01:48 UTC)', birth: { year: 2000, month: 6, day: 21, hour: 9, minute: 48, gender: 'M', calendar: 'solar' }, lon: 90 },
    { label: 'Sept equinox 2000 (17:28 UTC)', birth: { year: 2000, month: 9, day: 23, hour: 1, minute: 28, gender: 'M', calendar: 'solar' }, lon: 180 },
    { label: 'Dec solstice 2000 (13:37 UTC)', birth: { year: 2000, month: 12, day: 21, hour: 21, minute: 37, gender: 'M', calendar: 'solar' }, lon: 270 },
  ];

  for (const c of cases) {
    it(`Sun at ${c.lon}° tropical — ${c.label}`, () => {
      const chart = computeQizhengChart(c.birth);
      const sun = chart.bodies.find((b) => b.name === '日')!;
      const diff = Math.abs(((sun.lonTropical - c.lon + 540) % 360) - 180);
      expect(diff).toBeLessThan(0.05); // 3 arcmin
    });
  }

  it('all 11 bodies have valid longitudes and the Moon moves ~13°/day', () => {
    const day1 = computeQizhengChart({ year: 2010, month: 5, day: 1, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });
    const day2 = computeQizhengChart({ year: 2010, month: 5, day: 2, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });
    for (const b of day1.bodies) {
      expect(b.lonTropical).toBeGreaterThanOrEqual(0);
      expect(b.lonTropical).toBeLessThan(360);
    }
    const m1 = day1.bodies.find((b) => b.name === '月')!.lonTropical;
    const m2 = day2.bodies.find((b) => b.name === '月')!.lonTropical;
    const moved = ((m2 - m1 + 360) % 360);
    expect(moved).toBeGreaterThan(11);
    expect(moved).toBeLessThan(16);
  });

  it('羅睺/計都 are exactly opposite; ayanamsa ≈ 23.9°–24.3° for 2000-2026', () => {
    const chart = computeQizhengChart({ year: 2020, month: 1, day: 1, hour: 12, minute: 0, gender: 'M', calendar: 'solar' });
    const rahu = chart.bodies.find((b) => b.name === '羅睺')!.lonTropical;
    const ketu = chart.bodies.find((b) => b.name === '計都')!.lonTropical;
    expect(Math.abs(((rahu - ketu + 360) % 360) - 180)).toBeLessThan(1e-6);
    expect(chart.ayanamsa).toBeGreaterThan(23.9);
    expect(chart.ayanamsa).toBeLessThan(24.3);
  });
});
