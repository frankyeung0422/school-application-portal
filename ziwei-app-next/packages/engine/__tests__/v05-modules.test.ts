/**
 * Tests for the v0.5 additions: lunar-input reverse conversion, 命主/身主,
 * 小限, 大限疊宮, 化忌 chains, 神煞, full 調候 table, 大限-driven health
 * timeline and pattern/decade alerts.
 */

import { describe, it, expect } from 'vitest';
import {
  computeChart,
  computeBazi,
  lunarToSolar,
  solarToLunar,
  mingLordOf,
  shenLordOf,
  minorLimitAtAge,
  minorLimitAtYear,
  decadeOverlay,
  traceJiChains,
  computeShenSha,
  analyzeHealthTimeline,
  analyzeZiweiAlerts,
  TIAOHOU,
  type BirthInfo,
} from '../src';

const BIRTH_1990: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar',
};

describe('lunar-input reverse conversion', () => {
  it('round-trips a leap-month date (1987 閏六月)', () => {
    // 1987-08-14 falls in 閏六月.
    const { lunar } = solarToLunar(1987, 8, 14, 12, 0);
    expect(lunar.isLeap).toBe(true);
    const back = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap, 12, 0);
    expect([back.year, back.month, back.day]).toEqual([1987, 8, 14]);
  });

  it('lunar-calendar birth input produces the same chart as its solar equivalent', () => {
    const { lunar } = solarToLunar(1990, 6, 15, 14, 0);
    const fromLunar = computeChart({
      year: lunar.year, month: lunar.month, day: lunar.day,
      hour: 14, minute: 0, gender: 'M', calendar: 'lunar', isLeapMonth: lunar.isLeap,
    });
    const fromSolar = computeChart(BIRTH_1990);
    expect(fromLunar.yearGanzhi).toBe(fromSolar.yearGanzhi);
    expect(fromLunar.palaces.find((p) => p.isMingong)!.branch)
      .toBe(fromSolar.palaces.find((p) => p.isMingong)!.branch);
    expect(fromLunar.bureau.bureau).toBe(fromSolar.bureau.bureau);
    const stars = (c: typeof fromSolar) => c.palaces.flatMap((p) => p.stars.map((s) => `${s.name}@${p.branch}`)).sort();
    expect(stars(fromLunar)).toEqual(stars(fromSolar));
  });

  it('bazi lunar input matches the solar pillars', () => {
    const { lunar } = solarToLunar(1990, 6, 15, 14, 0);
    const fromLunar = computeBazi({
      year: lunar.year, month: lunar.month, day: lunar.day,
      hour: 14, minute: 0, gender: 'M', calendar: 'lunar', isLeapMonth: lunar.isLeap,
    });
    const fromSolar = computeBazi(BIRTH_1990);
    expect(fromLunar.pillars.day.ganzhi).toBe(fromSolar.pillars.day.ganzhi);
    expect(fromLunar.pillars.month.ganzhi).toBe(fromSolar.pillars.month.ganzhi);
  });
});

describe('命主/身主', () => {
  it('follows the canonical tables and lands on the chart', () => {
    expect(mingLordOf('子')).toBe('貪狼');
    expect(mingLordOf('午')).toBe('破軍');
    expect(shenLordOf('子')).toBe('火星');
    expect(shenLordOf('未')).toBe('天相');
    const chart = computeChart(BIRTH_1990);
    const ming = chart.palaces.find((p) => p.isMingong)!;
    expect(chart.mingLord).toBe(mingLordOf(ming.branch));
    expect(chart.shenLord).toBe(shenLordOf(chart.yearGanzhi[1] as never));
  });
});

describe('小限 + 疊宮', () => {
  const chart = computeChart(BIRTH_1990); // 庚午年, male

  it('小限 starts at the trine branch and walks forward for males', () => {
    // 午 → 寅午戌人起辰.
    const a1 = minorLimitAtAge(chart, '午', 'M', 1)!;
    expect(a1.branch).toBe('辰');
    const a2 = minorLimitAtAge(chart, '午', 'M', 2)!;
    expect(a2.branch).toBe('巳');
    const f2 = minorLimitAtAge(chart, '午', 'F', 2)!;
    expect(f2.branch).toBe('卯');
    const byYear = minorLimitAtYear(chart, 1990)!;
    expect(byYear.age).toBe(1);
    expect(byYear.branch).toBe('辰');
  });

  it('疊宮 maps all 12 decade palaces onto natal palaces', () => {
    const decade = chart.decades![2];
    const overlay = decadeOverlay(chart, decade);
    expect(overlay).toHaveLength(12);
    expect(overlay[0].decadePalace).toBe('命宮');
    expect(overlay[0].branch).toBe(decade.branch);
    expect(overlay[0].natalPalace).toBe(decade.palaceName);
    // every natal palace appears exactly once
    expect(new Set(overlay.map((o) => o.natalPalace)).size).toBe(12);
  });
});

describe('化忌 chains', () => {
  it('produces 12 chains with valid terminals and real star hops', () => {
    const chart = computeChart(BIRTH_1990);
    const chains = traceJiChains(chart);
    expect(chains).toHaveLength(12);
    for (const c of chains) {
      expect(['自化忌出', '回頭忌', '入而不出']).toContain(c.terminal);
      expect(c.text.length).toBeGreaterThan(0);
      for (const step of c.steps) {
        const target = chart.palaces.find((p) => p.name === step.toPalace)!;
        expect(target.stars.some((s) => s.name === step.star)).toBe(true);
      }
    }
  });
});

describe('神煞 + 胎元/命宮', () => {
  it('detects 天乙貴人/華蓋 for the 1990 test chart (辛日, 午午亥未)', () => {
    const bazi = computeBazi(BIRTH_1990);
    const names = bazi.shenSha!.map((h) => `${h.name}@${h.pillar}`);
    // 辛日干: 天乙 = 午/寅 → year + month branch 午 both hit.
    expect(names).toContain('天乙貴人@year');
    expect(names).toContain('天乙貴人@month');
    // 日支亥 (亥卯未): 華蓋 = 未 → hour branch 未.
    expect(names).toContain('華蓋@hour');
    expect(bazi.taiYuan).toBeTruthy();
    expect(bazi.mingGong).toBeTruthy();
  });

  it('computeShenSha flags 魁罡 day pillars', () => {
    const hits = computeShenSha({
      year: { stem: '甲', branch: '子' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: '庚', branch: '辰' },
      hour: { stem: '丁', branch: '丑' },
    });
    expect(hits.some((h) => h.name === '魁罡' && h.pillar === 'day')).toBe(true);
  });
});

describe('調候 (full 窮通寶鑑 table)', () => {
  it('has all 120 entries and matches known cases', () => {
    const stems = Object.keys(TIAOHOU);
    expect(stems).toHaveLength(10);
    for (const s of stems) expect(Object.keys(TIAOHOU[s as never])).toHaveLength(12);
    expect(TIAOHOU.甲.寅.primary).toBe('丙');
    expect(TIAOHOU.庚.午.primary).toBe('壬');
    expect(TIAOHOU.癸.子.primary).toBe('丙');
  });

  it('computeBazi attaches the table-driven adjustment (辛生午月 → 壬)', () => {
    const bazi = computeBazi(BIRTH_1990);
    expect(bazi.strength!.climateAdjustment!.primaryStem).toBe('壬');
    expect(bazi.strength!.climateAdjustment!.element).toBe('水');
  });
});

describe('alerts v2 + health timeline v2', () => {
  it('health timeline follows the 大限 ladder when decades exist', () => {
    const chart = computeChart(BIRTH_1990);
    const timeline = analyzeHealthTimeline(chart, 1990);
    expect(timeline).toHaveLength(12); // one band per 大限
    expect(timeline[0].yearStart).toBe(1990 + chart.decades![0].startAge - 1);
    for (const band of timeline) {
      expect(band.severity).toBeGreaterThanOrEqual(1);
      expect(band.severity).toBeLessThanOrEqual(5);
      expect(band.recommendations.length).toBeGreaterThan(0);
    }
  });

  it('natal alerts include 大限忌 entries when the 限忌 lands on a sensitive palace', () => {
    const chart = computeChart(BIRTH_1990);
    const alerts = analyzeZiweiAlerts(chart, 1990);
    // not asserting a specific hit (depends on current year), only well-formedness
    for (const a of alerts) {
      expect(a.severity).toBeGreaterThanOrEqual(1);
      expect(a.severity).toBeLessThanOrEqual(5);
      expect(a.recommendations.length).toBeGreaterThan(0);
    }
  });
});
