/**
 * Tests for the v0.5 engine additions: 格局 detection, 果老 洞微大限 / 流年宮,
 * and 三盤合參 cross-system corroboration.
 */

import { describe, it, expect } from 'vitest';
import {
  computeChart,
  computeAllSystems,
  computeQizhengChart,
  detectPatterns,
  dongweiLimits,
  activeDongweiLimitAtAge,
  activeDongweiLimitAtYear,
  annualPalace,
  analyzeCrossSystem,
  generatePalaceBranches,
  stemOfBranch,
  type BirthInfo,
  type Chart,
  type EarthlyBranch,
  type PlacedStar,
} from '../src';

const BIRTH_1990: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar',
};

/** Fabricate a chart with 命宮 at the given branch and explicit star placements. */
function makeChart(mingBranch: EarthlyBranch, starsByBranch: Partial<Record<EarthlyBranch, PlacedStar[]>>): Chart {
  const palaces = generatePalaceBranches(mingBranch).map((p) => ({
    name: p.name,
    branch: p.branch,
    ganzhi: `${stemOfBranch('甲', p.branch)}${p.branch}` as `${string}${string}` & Chart['palaces'][0]['ganzhi'],
    stars: starsByBranch[p.branch] ?? [],
    isMingong: p.name === '命宮',
    isShenGong: false,
  }));
  return {
    engineVersion: 'test',
    birthInfo: BIRTH_1990,
    solarDate: { year: 1990, month: 6, day: 15, hour: 14, minute: 0 },
    lunarDate: { year: 1990, month: 5, day: 23, isLeap: false },
    yearGanzhi: '庚午',
    bureau: { bureau: '土五局', num: 5 },
    palaces,
  };
}

describe('格局 detection', () => {
  it('detects 紫府同宮 when 紫微+天府 sit in 命宮', () => {
    const chart = makeChart('寅', { 寅: [{ name: '紫微' }, { name: '天府' }] });
    const hits = detectPatterns(chart).map((p) => p.id);
    expect(hits).toContain('zifu-tonggong');
  });

  it('detects 羊陀夾忌 (化忌坐命, 擎羊陀羅夾)', () => {
    const chart = makeChart('巳', {
      巳: [{ name: '武曲', transformation: '忌' }, { name: '祿存' }],
      午: [{ name: '擎羊' }],
      辰: [{ name: '陀羅' }],
    });
    const hit = detectPatterns(chart).find((p) => p.id === 'yangtuo-jiaji');
    expect(hit).toBeDefined();
    expect(hit!.kind).toBe('凶');
    expect(hit!.weight).toBe(5);
  });

  it('detects 火貪格 wherever 貪狼+火星 share a palace', () => {
    const chart = makeChart('寅', { 戌: [{ name: '貪狼' }, { name: '火星' }] });
    expect(detectPatterns(chart).map((p) => p.id)).toContain('huotan');
  });

  it('detects 空劫夾命 when 地空地劫 both sit in 命宮', () => {
    const chart = makeChart('亥', { 亥: [{ name: '地空' }, { name: '地劫' }, { name: '天同' }] });
    expect(detectPatterns(chart).map((p) => p.id)).toContain('kongjie-jiaming');
  });

  it('detects 命無正曜 on an empty 命宮', () => {
    const chart = makeChart('丑', {});
    expect(detectPatterns(chart).map((p) => p.id)).toContain('ming-wu-zhengyao');
  });

  it('runs clean on a real computed chart, sorted by weight desc', () => {
    const patterns = detectPatterns(computeChart(BIRTH_1990));
    for (const p of patterns) {
      expect(p.weight).toBeGreaterThanOrEqual(1);
      expect(p.weight).toBeLessThanOrEqual(5);
      expect(p.evidence.length).toBeGreaterThan(0);
    }
    const weights = patterns.map((p) => p.weight);
    expect([...weights].sort((a, b) => b - a)).toEqual(weights);
  });
});

describe('洞微大限 (qizheng limits)', () => {
  const chart = computeQizhengChart(BIRTH_1990);

  it('出限 falls in 10-20歲 and the ladder is contiguous over 12 palaces', () => {
    const { chuXianAge, limits } = dongweiLimits(chart);
    expect(chuXianAge).toBeGreaterThanOrEqual(10);
    expect(chuXianAge).toBeLessThanOrEqual(20);
    expect(limits).toHaveLength(12);
    expect(limits[0].houseName).toBe('命宮');
    expect(limits[1].houseName).toBe('相貌');
    expect(limits[2].houseName).toBe('福德');
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i].startAge).toBeCloseTo(limits[i - 1].endAge, 5);
    }
    // 「命與祿數十有五」: the post-出限 ladder spans 85.5 years.
    const span = limits[limits.length - 1].endAge - chuXianAge;
    expect(span).toBeCloseTo(85.5, 5);
  });

  it('locates the active limit by age and year, with progressed degree', () => {
    const { chuXianAge } = dongweiLimits(chart);
    const childhood = activeDongweiLimitAtAge(chart, 5)!;
    expect(childhood.houseName).toBe('命宮');
    const first = activeDongweiLimitAtAge(chart, chuXianAge + 1)!;
    expect(first.houseName).toBe('相貌');
    expect(first.degIntoLimit).toBeGreaterThanOrEqual(0);
    expect(first.degIntoLimit).toBeLessThanOrEqual(30);
    const byYear = activeDongweiLimitAtYear(chart, 1990 + Math.ceil(chuXianAge));
    expect(byYear).not.toBeNull();
    expect(first.limitLord).toBeDefined();
  });

  it('流年命宮 matches the year branch (2026 = 丙午 → 午宮)', () => {
    const ap = annualPalace(chart, 2026)!;
    expect(ap.yearBranch).toBe('午');
    const house = chart.houses.find((h) => h.name === ap.houseName)!;
    expect(house.branch).toBe('午');
  });
});

describe('三盤合參 (cross-system)', () => {
  it('produces 4 domains × 3 signals with coherent verdicts', () => {
    const all = computeAllSystems(BIRTH_1990);
    const r = analyzeCrossSystem(all.ziwei.chart, all.bazi.chart, all.qizheng.chart);
    expect(r.domains).toHaveLength(4);
    expect(r.domains.map((d) => d.domain)).toEqual(['元氣', '財富', '感情', '健康']);
    for (const d of r.domains) {
      expect(d.signals).toHaveLength(3);
      expect(['穩定', '留意', '高信度警訊']).toContain(d.verdict);
      expect(d.strainCount).toBe(d.signals.filter((s) => s.level === '弱').length);
      // verdict consistency with the practitioner rule
      if (d.strainCount >= 2) expect(d.verdict).toBe('高信度警訊');
    }
    expect(r.elementHarmony.bureauElement).toBe('土'); // 1990-06-15 14:00 → 土五局
    expect(r.summaryText).toContain('元氣');
    expect(r.summaryText).toContain('五行合參');
  });
});
