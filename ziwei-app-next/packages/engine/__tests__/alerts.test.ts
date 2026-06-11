import { describe, it, expect } from 'vitest';
import {
  analyzeZiweiAlerts,
  analyzeAlerts,
  computeAllSystems,
  type BirthInfo,
  type TransitSnapshot,
} from '../src';

const sample: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 30,
  gender: 'M', calendar: 'solar', latitude: 22.32, longitude: 114.17, tzOffsetMinutes: 480,
};

const all = computeAllSystems(sample);

/** A synthetic snapshot exercising one rule per system, with a shared 'health' type. */
function makeSnapshot(periodKey = 'D2026-06-01'): TransitSnapshot {
  return {
    scope: 'day',
    date: '2026-06-01',
    periodLabel: '2026年6月1日 測試日',
    periodKey,
    solar: {
      dayGanzhi: '甲子', monthGanzhi: '庚寅', yearGanzhi: '丙午',
      lunar: { year: 2026, month: 4, day: 16, isLeap: false },
    },
    ziwei: {
      scope: 'day', ganzhi: '甲子', stem: '甲', branch: '子', hostPalace: null,
      periodTransformations: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
      transformedNatalStars: [{ star: '太陽', palace: '疾厄', hua: '忌' }],
    },
    bazi: {
      scope: 'day', ganzhi: '庚午', stem: '庚', branch: '午', tenGod: '七殺',
      branchRelationToNatal: [{ pillar: 'day', relation: '沖' }],
    },
    qizheng: {
      scope: 'day', instant: '', windowStart: '', windowEnd: '', bodies: [], ingresses: [],
      aspects: [
        { transiting: '土', natal: '命主', kind: '沖', exactDeg: 180, orbDeg: 0.3, applying: true, malefic: true },
      ],
    },
  };
}

describe('analyzeZiweiAlerts — unchanged natal analyzer', () => {
  it('returns a severity-sorted array', () => {
    const alerts = analyzeZiweiAlerts(all.ziwei.chart, sample.year);
    expect(Array.isArray(alerts)).toBe(true);
    for (let i = 1; i < alerts.length; i++) {
      expect(alerts[i - 1].severity).toBeGreaterThanOrEqual(alerts[i].severity);
    }
  });
});

describe('analyzeAlerts — scoped multi-system', () => {
  it('fires one alert per system plus a cross-consensus alert', () => {
    const alerts = analyzeAlerts({
      ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart,
      birthYear: sample.year, scope: 'day', snapshot: makeSnapshot(),
    });
    const systems = new Set(alerts.map((a) => a.system));
    expect(systems.has('ziwei')).toBe(true);   // 流忌入疾厄 (health)
    expect(systems.has('bazi')).toBe(true);     // 七殺沖日支 (career)
    expect(systems.has('qizheng')).toBe(true);  // 土沖命主 (health)
    // health flagged by ziwei + qizheng → cross consensus at bumped severity
    const cross = alerts.find((a) => a.system === 'cross' && a.type === 'health');
    expect(cross).toBeDefined();
    expect(cross!.severity).toBe(5);
  });

  it('dedups within a period but re-fires across periods', () => {
    const a1 = analyzeAlerts({
      ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart,
      birthYear: sample.year, scope: 'day', snapshot: makeSnapshot('D2026-06-01'),
    });
    const a2 = analyzeAlerts({
      ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart,
      birthYear: sample.year, scope: 'day', snapshot: makeSnapshot('D2026-06-01'),
    });
    const a3 = analyzeAlerts({
      ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart,
      birthYear: sample.year, scope: 'day', snapshot: makeSnapshot('D2026-06-02'),
    });
    expect(a1.map((a) => a.id).sort()).toEqual(a2.map((a) => a.id).sort()); // same period → same ids
    expect(a1.map((a) => a.id).sort()).not.toEqual(a3.map((a) => a.id).sort()); // new period → new ids
  });

  it('delegates scope=natal to the ziwei analyzer', () => {
    const natal = analyzeAlerts({
      ziwei: all.ziwei.chart, bazi: all.bazi.chart, qizheng: all.qizheng.chart,
      birthYear: sample.year, scope: 'natal',
    });
    expect(natal.every((a) => a.scope === 'natal' && a.system === 'ziwei')).toBe(true);
  });
});
