import { describe, it, expect } from 'vitest';
import {
  computeQizhengChart,
  qizhengHash,
  MANSION_BOUNDARIES,
  QIZHENG_CONFIG,
  QIZHENG_ENGINE_VERSION,
  TWENTY_EIGHT_MANSIONS,
  ELEVEN_BODIES,
  type BirthInfo,
} from '../src';
import { mansionOf } from '../src/qizheng/mansions';
import { ayanamsa } from '../src/qizheng/ayanamsa';

const sample: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 30,
  gender: 'M', calendar: 'solar', latitude: 22.32, longitude: 114.17,
};

describe('果老 mansion boundaries', () => {
  it('partition the full circle (Σspans = 360°)', () => {
    const sum = MANSION_BOUNDARIES.reduce((a, m) => a + m.span, 0);
    expect(sum).toBeCloseTo(360, 6);
  });

  it('cover all 28 宿 with strictly positive spans', () => {
    expect(MANSION_BOUNDARIES).toHaveLength(28);
    expect(MANSION_BOUNDARIES.every((m) => m.span > 0)).toBe(true);
    expect(MANSION_BOUNDARIES.map((m) => m.mansion)).toEqual([...TWENTY_EIGHT_MANSIONS]);
  });

  it('map every ecliptic degree to exactly one 宿', () => {
    for (let d = 0; d < 360; d += 0.5) {
      const { mansion, degIntoMansion } = mansionOf(d);
      expect(TWENTY_EIGHT_MANSIONS).toContain(mansion);
      expect(degIntoMansion).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('computeQizhengChart — structure', () => {
  const chart = computeQizhengChart(sample);

  it('stamps engine version + config for reproducibility', () => {
    expect(chart.engineVersion).toBe(QIZHENG_ENGINE_VERSION);
    expect(chart.config.ayanamsa).toBe('lahiri');
    expect(chart.config.ziQiPeriodYears).toBe(QIZHENG_CONFIG.ziQiPeriodYears);
  });

  it('places all 11 曜, each in a valid house (1–12)', () => {
    expect(chart.bodies.map((b) => b.name)).toEqual([...ELEVEN_BODIES]);
    for (const b of chart.bodies) {
      expect(b.house).toBeGreaterThanOrEqual(1);
      expect(b.house).toBeLessThanOrEqual(12);
      expect(b.lonSidereal).toBeGreaterThanOrEqual(0);
      expect(b.lonSidereal).toBeLessThan(360);
    }
  });

  it('builds 12 houses starting from 命宮', () => {
    expect(chart.houses).toHaveLength(12);
    expect(chart.houses[0].name).toBe('命宮');
    expect(chart.houses[0].sign).toBe(chart.ascendant.sign);
  });

  it('derives 命主星 as the ascendant-sign ruler', () => {
    // 處女 ascendant for this birth → 水 rules 處女.
    expect(chart.ascendant.sign).toBe('處女');
    expect(chart.mingLord).toBe('水');
  });
});

describe('computeQizhengChart — astronomy regression anchors', () => {
  const chart = computeQizhengChart(sample);
  const body = (n: string) => chart.bodies.find((b) => b.name === n)!;

  it('puts the Sun in sidereal 雙子 for mid-June', () => {
    expect(body('日').sign).toBe('雙子');
  });

  it('finds Saturn retrograde in its domicile 摩羯 (廟) in 1990', () => {
    const sat = body('土');
    expect(sat.sign).toBe('摩羯');
    expect(sat.dignity).toBe('廟');
    expect(sat.retrograde).toBe(true);
  });

  it('keeps the J2000 ayanāṃśa near 23.85° (Lahiri)', () => {
    expect(ayanamsa(2451545.0)).toBeCloseTo(23.8531, 3);
  });
});

describe('果老 ascendant is birthplace-sensitive', () => {
  it('differs for a far-apart longitude at the same instant', () => {
    const hk = computeQizhengChart(sample);
    const london = computeQizhengChart({ ...sample, latitude: 51.5, longitude: -0.13, tzOffsetMinutes: 480 });
    // Same UTC instant, very different place → different rising degree.
    expect(Math.abs(london.ascendant.lonSidereal - hk.ascendant.lonSidereal)).toBeGreaterThan(1);
  });
});

describe('qizhengHash', () => {
  it('is stable and place-sensitive', () => {
    expect(qizhengHash(sample)).toBe(qizhengHash({ ...sample }));
    expect(qizhengHash(sample)).not.toBe(qizhengHash({ ...sample, longitude: 0 }));
  });
});
