import { describe, it, expect } from 'vitest';
import { computeChart, ENGINE_VERSION, MAIN_STARS, PALACE_NAMES } from '../src';

describe('computeChart — smoke', () => {
  const sample = {
    year: 1990, month: 6, day: 15, hour: 14, minute: 0,
    gender: 'M' as const, calendar: 'solar' as const,
  };

  it('returns a chart with 12 palaces', () => {
    const chart = computeChart(sample);
    expect(chart.palaces).toHaveLength(12);
    expect(chart.palaces.map((p) => p.name)).toEqual([...PALACE_NAMES]);
  });

  it('flags exactly one 命宮', () => {
    const chart = computeChart(sample);
    expect(chart.palaces.filter((p) => p.isMingong)).toHaveLength(1);
    expect(chart.palaces[0].isMingong).toBe(true);
  });

  it('places exactly 14 main stars across the chart', () => {
    const chart = computeChart(sample);
    const allStars = chart.palaces.flatMap((p) => p.stars).map((s) => s.name);
    const mainStarsPlaced = allStars.filter((n) => (MAIN_STARS as readonly string[]).includes(n));
    expect(mainStarsPlaced).toHaveLength(14);
    const unique = new Set(mainStarsPlaced);
    expect(unique.size).toBe(14);
  });

  it('marks exactly 4 transformations (one each: 祿/權/科/忌)', () => {
    const chart = computeChart(sample);
    const transformations = chart.palaces
      .flatMap((p) => p.stars)
      .map((s) => s.transformation)
      .filter(Boolean) as string[];
    expect(new Set(transformations)).toEqual(new Set(['祿', '權', '科', '忌']));
    expect(transformations).toHaveLength(4);
  });

  it('engineVersion is current', () => {
    const chart = computeChart(sample);
    expect(chart.engineVersion).toBe(ENGINE_VERSION);
  });

  it('returns deterministic output for same input', () => {
    const a = computeChart(sample);
    const b = computeChart(sample);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('handles different genders without crashing', () => {
    expect(() => computeChart({ ...sample, gender: 'F' })).not.toThrow();
  });

  it('handles all hour edge cases', () => {
    for (let h = 0; h <= 23; h++) {
      expect(() => computeChart({ ...sample, hour: h })).not.toThrow();
    }
  });

  it('placed 紫微 has a brightness assigned', () => {
    const chart = computeChart(sample);
    const ziwei = chart.palaces.flatMap((p) => p.stars).find((s) => s.name === '紫微');
    expect(ziwei?.brightness).toBeDefined();
  });

  it('marks exactly one 身宮', () => {
    const chart = computeChart(sample);
    expect(chart.palaces.filter((p) => p.isShenGong)).toHaveLength(1);
  });
});
