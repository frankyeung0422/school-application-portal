import { describe, it, expect } from 'vitest';
import {
  computeAllSystems,
  computeQizhengChart,
  computeQizhengTransit,
  computeTransits,
  transitingBodies,
  ziweiMonthFlow,
  ziweiDayFlow,
  baziMonthFlow,
  branchRelation,
  ELEVEN_BODIES,
  type BirthInfo,
} from '../src';

const sample: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 30,
  gender: 'M', calendar: 'solar', latitude: 22.32, longitude: 114.17, tzOffsetMinutes: 480,
};

describe('branchRelation', () => {
  it('detects 沖 / 刑 / 害 / 合 / 會', () => {
    expect(branchRelation('子', '午')).toBe('沖');
    expect(branchRelation('寅', '巳')).toBe('刑'); // 寅巳申 三刑
    expect(branchRelation('辰', '辰')).toBe('刑'); // 自刑
    expect(branchRelation('子', '未')).toBe('害');
    expect(branchRelation('子', '丑')).toBe('合'); // 六合
    expect(branchRelation('申', '辰')).toBe('會'); // 申子辰 三合
    expect(branchRelation('甲' as never, '乙' as never)).toBe(null);
    expect(branchRelation('子', '寅')).toBe(null);
  });
});

describe('transitingBodies — reuses the natal pipeline', () => {
  it('places all 11 曜 with valid sidereal longitudes', () => {
    const utc = Date.UTC(2026, 5, 1, 12, 0, 0) - 480 * 60_000;
    const bodies = transitingBodies(new Date(utc));
    expect(bodies.map((b) => b.name)).toEqual([...ELEVEN_BODIES]);
    for (const b of bodies) {
      expect(b.lonSidereal).toBeGreaterThanOrEqual(0);
      expect(b.lonSidereal).toBeLessThan(360);
      expect(b.degIntoMansion).toBeGreaterThanOrEqual(0);
    }
  });

  it('matches the natal pipeline longitudes for the identical instant', () => {
    // BirthInfo at a civil instant → natal chart; transitingBodies at the same
    // UTC instant must produce identical sidereal longitudes (same math, no drift).
    const birth: BirthInfo = {
      year: 2026, month: 6, day: 1, hour: 14, minute: 30,
      gender: 'M', calendar: 'solar', tzOffsetMinutes: 480,
    };
    const utc = Date.UTC(2026, 5, 1, 14, 30, 0) - 480 * 60_000;
    const natal = computeQizhengChart(birth);
    const transit = transitingBodies(new Date(utc));
    for (const name of ELEVEN_BODIES) {
      const n = natal.bodies.find((b) => b.name === name)!;
      const t = transit.find((b) => b.name === name)!;
      expect(t.lonSidereal).toBeCloseTo(n.lonSidereal, 6);
      expect(t.sign).toBe(n.sign);
      expect(t.mansion).toBe(n.mansion);
    }
  });
});

describe('computeQizhengTransit', () => {
  const natal = computeQizhengChart(sample);

  it('returns well-formed aspects within orb on classical angles', () => {
    const tr = computeQizhengTransit(natal, { scope: 'day', date: new Date(2026, 5, 1) });
    expect(tr.scope).toBe('day');
    for (const a of tr.aspects) {
      expect([0, 60, 90, 120, 180]).toContain(a.exactDeg);
      const orb = a.transiting === '日' || a.transiting === '月' ? 8
        : ['羅睺', '計都', '月孛', '紫氣'].includes(a.transiting) ? 3 : 6;
      expect(a.orbDeg).toBeLessThanOrEqual(orb);
    }
    // sorted: malefic-first
    const firstNonMalefic = tr.aspects.findIndex((a) => !a.malefic);
    if (firstNonMalefic >= 0) {
      expect(tr.aspects.slice(firstNonMalefic).every((a) => !a.malefic)).toBe(true);
    }
  });

  it('omits the Moon from month/year aspects but keeps it for day', () => {
    const day = computeQizhengTransit(natal, { scope: 'day', date: new Date(2026, 5, 1) });
    const month = computeQizhengTransit(natal, { scope: 'month', date: new Date(2026, 5, 1) });
    expect(month.aspects.some((a) => a.transiting === '月')).toBe(false);
    expect(month.ingresses.some((i) => i.body === '月')).toBe(false);
    // day scope generally surfaces the fast Moon somewhere (aspect or just present in bodies)
    expect(day.bodies.some((b) => b.name === '月')).toBe(true);
  });
});

describe('流月 / 流日 flow', () => {
  const all = computeAllSystems(sample);

  it('ziweiMonthFlow lands the host palace on the period branch', () => {
    const f = ziweiMonthFlow(all.ziwei.chart, new Date(2026, 5, 1));
    expect(f.ganzhi).toHaveLength(2);
    if (f.hostPalace) expect(f.hostPalace.branch).toBe(f.branch);
    for (const ts of f.transformedNatalStars) {
      expect(['祿', '權', '科', '忌']).toContain(ts.hua);
    }
  });

  it('ziweiDayFlow + baziMonthFlow produce typed period flows', () => {
    const z = ziweiDayFlow(all.ziwei.chart, new Date(2026, 5, 1));
    expect(z.scope).toBe('day');
    const b = baziMonthFlow(all.bazi.chart, new Date(2026, 5, 1));
    expect(b.scope).toBe('month');
    expect(b.ganzhi).toHaveLength(2);
  });
});

describe('computeTransits facade', () => {
  const all = computeAllSystems(sample);

  it('keys each scope with the documented periodKey scheme', () => {
    const day = computeTransits(sample, all, { scope: 'day', date: new Date(2026, 5, 1) });
    const month = computeTransits(sample, all, { scope: 'month', date: new Date(2026, 5, 1) });
    const year = computeTransits(sample, all, { scope: 'year', date: new Date(2026, 5, 1) });
    expect(day.periodKey).toBe('D2026-06-01');
    expect(month.periodKey).toMatch(/^M..$/u);
    expect(year.periodKey).toMatch(/^Y..$/u);
    expect(day.qizheng.bodies).toHaveLength(11);
    expect(day.ziwei).toBeDefined();
    expect(day.bazi).toBeDefined();
  });
});
