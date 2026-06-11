/**
 * Tests for the v0.4 engine additions: minor stars, 大限, 飛星四化/自化,
 * 三方四正, bazi strength (旺相休囚死/得令得地得勢/用神/空亡), 真太陽時.
 *
 * Placement expectations come from the standard 安星訣 (school-invariant for
 * these stars): 甲祿到寅 / 甲戊庚牛羊 / 戌起子時逆數文昌 / 辰起正月順數左輔 /
 * 亥起子時順數地劫 etc.
 */

import { describe, it, expect } from 'vitest';
import {
  computeChart,
  computeBazi,
  chartHash,
  baziHash,
  placeMinorStars,
  computeDecadeLuck,
  computeFlyingStars,
  computeSelfTransformations,
  sanFangSiZheng,
  seasonalState,
  voidBranchesOfDayPillar,
  analyzeBaziStrength,
  equationOfTimeMinutes,
  toApparentSolarTime,
  type BirthInfo,
} from '../src';

const BIRTH_1990: BirthInfo = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 0, gender: 'M', calendar: 'solar',
};

describe('minor star placement (安星訣)', () => {
  it('places year-stem stars: 甲年 祿存寅 擎羊卯 陀羅丑 魁丑 鉞未', () => {
    const m = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, hourBranchIndex: 0 });
    expect(m.get('祿存')).toBe('寅');
    expect(m.get('擎羊')).toBe('卯');
    expect(m.get('陀羅')).toBe('丑');
    expect(m.get('天魁')).toBe('丑');
    expect(m.get('天鉞')).toBe('未');
  });

  it('places year-stem stars: 戊年 祿存巳 / 辛年 魁午 鉞寅', () => {
    const wu = placeMinorStars({ yearStem: '戊', yearBranch: '午', lunarMonth: 1, hourBranchIndex: 0 });
    expect(wu.get('祿存')).toBe('巳');
    expect(wu.get('擎羊')).toBe('午');
    expect(wu.get('陀羅')).toBe('辰');
    const xin = placeMinorStars({ yearStem: '辛', yearBranch: '酉', lunarMonth: 1, hourBranchIndex: 0 });
    expect(xin.get('天魁')).toBe('午');
    expect(xin.get('天鉞')).toBe('寅');
  });

  it('places hour stars: 子時 昌戌曲辰 空劫同在亥; 午時 昌辰曲戌 空劫同在巳', () => {
    const zi = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, hourBranchIndex: 0 });
    expect(zi.get('文昌')).toBe('戌');
    expect(zi.get('文曲')).toBe('辰');
    expect(zi.get('地劫')).toBe('亥');
    expect(zi.get('地空')).toBe('亥');
    const wu = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, hourBranchIndex: 6 });
    expect(wu.get('文昌')).toBe('辰');
    expect(wu.get('文曲')).toBe('戌');
    expect(wu.get('地劫')).toBe('巳');
    expect(wu.get('地空')).toBe('巳');
  });

  it('places month stars: 正月 輔辰弼戌; 十二月 輔卯弼亥', () => {
    const m1 = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, hourBranchIndex: 0 });
    expect(m1.get('左輔')).toBe('辰');
    expect(m1.get('右弼')).toBe('戌');
    const m12 = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 12, hourBranchIndex: 0 });
    expect(m12.get('左輔')).toBe('卯');
    expect(m12.get('右弼')).toBe('亥');
  });

  it('places 火鈴 by year-branch trine + hour, 天馬 by trine', () => {
    // 午 (寅午戌): 火起丑 鈴起卯, 子時 → 丑/卯
    const horse = placeMinorStars({ yearStem: '戊', yearBranch: '午', lunarMonth: 1, hourBranchIndex: 0 });
    expect(horse.get('火星')).toBe('丑');
    expect(horse.get('鈴星')).toBe('卯');
    expect(horse.get('天馬')).toBe('申');
    // 子 (申子辰): 火起寅 鈴起戌, 卯時(3) → 巳/丑
    const rat = placeMinorStars({ yearStem: '甲', yearBranch: '子', lunarMonth: 1, hourBranchIndex: 3 });
    expect(rat.get('火星')).toBe('巳');
    expect(rat.get('鈴星')).toBe('丑');
    expect(rat.get('天馬')).toBe('寅');
  });

  it('computeChart includes all 28 stars (14 main + 14 minor)', () => {
    const chart = computeChart(BIRTH_1990);
    const names = chart.palaces.flatMap((p) => p.stars.map((s) => s.name));
    expect(names).toHaveLength(28);
    for (const star of ['祿存', '擎羊', '陀羅', '天魁', '天鉞', '文昌', '文曲', '左輔', '右弼', '火星', '鈴星', '地空', '地劫', '天馬']) {
      expect(names).toContain(star);
    }
  });
});

describe('大限 decade luck', () => {
  it('starts at 命宮 with 虛歲 = 局數 and runs 12 decades', () => {
    const chart = computeChart(BIRTH_1990);
    const d = chart.decades!;
    expect(d).toHaveLength(12);
    expect(d[0].palaceName).toBe('命宮');
    expect(d[0].startAge).toBe(chart.bureau.num);
    expect(d[0].endAge).toBe(chart.bureau.num + 9);
    expect(d[11].endAge).toBe(chart.bureau.num + 119);
  });

  it('陽男 runs forward (second decade = 父母), 陽女 runs backward (= 兄弟)', () => {
    // 1990 = 庚午, 庚 is yang.
    const male = computeChart(BIRTH_1990).decades!;
    expect(male[1].palaceName).toBe('父母');
    const female = computeChart({ ...BIRTH_1990, gender: 'F' }).decades!;
    expect(female[1].palaceName).toBe('兄弟');
  });

  it('each decade carries its natal palace stem and 四化', () => {
    const chart = computeChart(BIRTH_1990);
    for (const d of chart.decades!) {
      const palace = chart.palaces.find((p) => p.name === d.palaceName)!;
      expect(d.stem).toBe(palace.ganzhi[0]);
      expect(Object.keys(d.transformations).sort()).toEqual(['祿', '科', '忌', '權'].sort());
    }
  });
});

describe('飛星四化 + 自化 + 三方四正', () => {
  it('produces 48 flights and every resolved target actually hosts the star', () => {
    const chart = computeChart(BIRTH_1990);
    const flights = computeFlyingStars(chart);
    expect(flights).toHaveLength(48);
    for (const f of flights) {
      expect(f.toPalace).not.toBeNull(); // all 四化 stars are placed since v0.4
      const target = chart.palaces.find((p) => p.name === f.toPalace)!;
      expect(target.stars.some((s) => s.name === f.star)).toBe(true);
    }
  });

  it('自化 entries are consistent with flights', () => {
    const chart = computeChart(BIRTH_1990);
    const flights = computeFlyingStars(chart);
    const self = computeSelfTransformations(chart);
    const outward = self.filter((s) => s.kind === '離心');
    const outwardFlights = flights.filter((f) => f.isSelfOutward);
    expect(outward.length).toBe(outwardFlights.length);
    for (const s of self) {
      const palace = chart.palaces.find((p) => p.name === s.palace)!;
      expect(palace.stars.some((st) => st.name === s.star)).toBe(true);
    }
  });

  it('三方四正 returns 本宮+對宮+三合 with correct branches', () => {
    const chart = computeChart(BIRTH_1990);
    const g = sanFangSiZheng(chart, '命宮');
    expect(g.group).toHaveLength(4);
    expect(g.group[0].name).toBe('命宮');
    expect(g.group[1].name).toBe('遷移'); // opposite of 命宮 is always 遷移
    const names = g.group.map((p) => p.name);
    expect(names).toContain('財帛');
    expect(names).toContain('官祿');
  });
});

describe('bazi strength (旺相休囚死 / 用神 / 空亡)', () => {
  it('seasonalState follows the classical cycle for 卯月', () => {
    expect(seasonalState('木', '卯')).toBe('旺');
    expect(seasonalState('火', '卯')).toBe('相');
    expect(seasonalState('水', '卯')).toBe('休');
    expect(seasonalState('金', '卯')).toBe('囚');
    expect(seasonalState('土', '卯')).toBe('死');
  });

  it('旬空: 甲子旬 → 戌亥, 甲戌旬 → 申酉', () => {
    expect(voidBranchesOfDayPillar('甲', '子')).toEqual(['戌', '亥']);
    expect(voidBranchesOfDayPillar('癸', '酉')).toEqual(['戌', '亥']); // last of 甲子旬
    expect(voidBranchesOfDayPillar('庚', '辰')).toEqual(['申', '酉']); // 甲戌旬
    expect(voidBranchesOfDayPillar('甲', '寅')).toEqual(['子', '丑']); // 甲寅旬
  });

  it('computeBazi attaches a coherent strength analysis', () => {
    const bazi = computeBazi(BIRTH_1990);
    const s = bazi.strength!;
    expect(['強', '偏強', '中和', '偏弱', '弱']).toContain(s.verdict);
    expect(s.supportRatio).toBeGreaterThanOrEqual(0);
    expect(s.supportRatio).toBeLessThanOrEqual(1);
    expect(s.favorableElements.length).toBeGreaterThan(0);
    expect(s.voidBranches).toHaveLength(2);
    // strength must agree with its own components
    const recomputed = analyzeBaziStrength(bazi);
    expect(recomputed.verdict).toBe(s.verdict);
    // 6月 = 午/巳-month territory → summer climate adjustment expects 水
    if (s.climateAdjustment) expect(['水', '火']).toContain(s.climateAdjustment.element);
  });
});

describe('真太陽時 (apparent solar time)', () => {
  it('equation of time peaks around early Nov (+16m) and mid Feb (−14m)', () => {
    expect(equationOfTimeMinutes(2000, 11, 3)).toBeGreaterThan(13);
    expect(equationOfTimeMinutes(2000, 2, 12)).toBeLessThan(-12);
    expect(Math.abs(equationOfTimeMinutes(2000, 9, 1))).toBeLessThan(6);
  });

  it('Hong Kong birth shifts ~−23m for longitude (114.17°E vs 120°E meridian)', () => {
    const r = toApparentSolarTime({ ...BIRTH_1990, trueSolarTime: true });
    expect(r.correctionMinutes).toBeGreaterThan(-45);
    expect(r.correctionMinutes).toBeLessThan(0);
  });

  it('flag changes the hashes (cache safety) and can shift the hour pillar', () => {
    const plain: BirthInfo = { ...BIRTH_1990 };
    const tst: BirthInfo = { ...BIRTH_1990, trueSolarTime: true };
    expect(chartHash(plain)).not.toBe(chartHash(tst));
    expect(baziHash(plain)).not.toBe(baziHash(tst));
    const b = computeBazi(tst);
    expect(b.solarTimeCorrectionMinutes).not.toBe(0);
  });
});
