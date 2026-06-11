import { SIGNS, signIndexOf, rulerOfSign } from './data/signs';
import { dignityOf } from './data/dignities';
import type { Dignity, Governor, QizhengChart } from './types';

/**
 * 行限 — the 果老星宗 timing layer (洞微大限 + 流年命宮).
 *
 * 洞微大限 (Dongwei decade limits), from 《星學大成·洞微限》:
 *
 *   「命與祿數十有五，福與妻十有一，田宅子孫各四年半而奴僕隨之，
 *     財帛兄弟各五，相貌獨管十年，疾厄遷移退以七八。」
 *
 * Model implemented (sources: 周新春易學網 d5168.com/qizhenxing/glxz/14622,
 * sohu.com/a/57157175_147754):
 *  - Childhood is governed by the 命宮 limit. 出限 (exit age, 虛歲) depends on
 *    the Sun's degree within its sign: 出限 = 10 + 太陽入宮度 / 3
 *    (3° ≈ 1 year; mid-sign Sun ⇒ ~15歲, matching 「命數十有五」 as the nominal).
 *  - After 出限 the limit proceeds in the diurnal direction — i.e. backwards
 *    through the house list: 相貌 → 福德 → 官祿 → 遷移 → 疾厄 → 夫妻 → 奴僕 →
 *    男女 → 田宅 → 兄弟 → 財帛 — each governing a fixed year-count.
 *  - Rate inside a palace = 30° / its year-count (相貌 3°/年, 官祿 2°/年 …).
 *
 * [VERIFY] Classical sources vary in detail (some start counting from the
 * 命度 rather than the Sun); this follows the most widely documented reading.
 * 竹羅三限 (the three parallel tracks) is NOT implemented — the surviving rule
 * descriptions are too fragmentary to encode faithfully.
 */

/** Year-counts after 出限, in progression order starting from 相貌宮. */
const LIMIT_SEQUENCE: Array<{ houseName: string; years: number }> = [
  { houseName: '相貌', years: 10 },
  { houseName: '福德', years: 11 },
  { houseName: '官祿', years: 15 },
  { houseName: '遷移', years: 8 },
  { houseName: '疾厄', years: 7 },
  { houseName: '夫妻', years: 11 },
  { houseName: '奴僕', years: 4.5 },
  { houseName: '男女', years: 4.5 },
  { houseName: '田宅', years: 4.5 },
  { houseName: '兄弟', years: 5 },
  { houseName: '財帛', years: 5 },
];

export interface DongweiLimit {
  /** 0 = childhood 命宮 limit, 1-11 = the post-出限 sequence. */
  index: number;
  houseName: string;
  sign: string;
  branch: string;
  /** Duration in years (命宮 entry = the 出限 age itself). */
  years: number;
  /** 虛歲 span [startAge, endAge). Fractional ages are meaningful. */
  startAge: number;
  endAge: number;
  /** 限主 — domicile ruler of the limit palace's sign. */
  limitLord: Governor;
  /** The 限主's natal dignity — the classical condition check for the period. */
  lordDignity: Dignity;
  /** Natal house the 限主 occupies. */
  lordHouseName: string;
}

export interface DongweiLimits {
  /** 出限虛歲 = 10 + 太陽入宮度/3. */
  chuXianAge: number;
  limits: DongweiLimit[];
}

function lordInfo(chart: QizhengChart, sign: string): {
  limitLord: Governor; lordDignity: Dignity; lordHouseName: string;
} {
  const signIndex = SIGNS.findIndex((s) => s.sign === sign);
  const limitLord = rulerOfSign(signIndex);
  const natal = chart.bodies.find((b) => b.name === limitLord);
  return {
    limitLord,
    lordDignity: natal ? dignityOf(limitLord, signIndexOf(natal.lonSidereal)) : '平和',
    lordHouseName: natal?.houseName ?? '—',
  };
}

/** Compute the full 洞微大限 ladder for a natal chart. */
export function dongweiLimits(chart: QizhengChart): DongweiLimits {
  const sun = chart.bodies.find((b) => b.name === '日');
  const sunDeg = sun ? sun.degIntoSign : 15; // defensive: mid-sign nominal
  const chuXianAge = Math.round((10 + sunDeg / 3) * 10) / 10;

  const byName = new Map(chart.houses.map((h) => [h.name, h]));
  const limits: DongweiLimit[] = [];

  const mingHouse = byName.get('命宮');
  if (mingHouse) {
    limits.push({
      index: 0,
      houseName: '命宮',
      sign: mingHouse.sign,
      branch: mingHouse.branch,
      years: chuXianAge,
      startAge: 1,
      endAge: chuXianAge,
      ...lordInfo(chart, mingHouse.sign),
    });
  }

  let age = chuXianAge;
  LIMIT_SEQUENCE.forEach((step, i) => {
    const house = byName.get(step.houseName);
    if (!house) return;
    limits.push({
      index: i + 1,
      houseName: step.houseName,
      sign: house.sign,
      branch: house.branch,
      years: step.years,
      startAge: age,
      endAge: age + step.years,
      ...lordInfo(chart, house.sign),
    });
    age += step.years;
  });

  return { chuXianAge, limits };
}

export interface ActiveDongweiLimit extends DongweiLimit {
  /** Years already spent inside this limit palace. */
  yearsIntoLimit: number;
  /** Progressed degree inside the 30° palace (rate = 30 / years). */
  degIntoLimit: number;
}

/** The limit active at a given 虛歲 (East Asian age; birth year = 1). */
export function activeDongweiLimitAtAge(
  chart: QizhengChart,
  age: number,
): ActiveDongweiLimit | null {
  const { limits } = dongweiLimits(chart);
  const hit = limits.find((l) => age >= l.startAge && age < l.endAge)
    ?? (limits.length && age >= limits[limits.length - 1].endAge ? limits[limits.length - 1] : undefined);
  if (!hit) return null;
  const yearsIntoLimit = Math.max(0, age - hit.startAge);
  return {
    ...hit,
    yearsIntoLimit: Math.round(yearsIntoLimit * 10) / 10,
    degIntoLimit: Math.round(Math.min(30, (yearsIntoLimit * 30) / hit.years) * 10) / 10,
  };
}

/** The limit active in a given Gregorian year (虛歲 = year − birthYear + 1). */
export function activeDongweiLimitAtYear(
  chart: QizhengChart,
  year: number,
): ActiveDongweiLimit | null {
  return activeDongweiLimitAtAge(chart, year - chart.birthInfo.year + 1);
}

/**
 * 流年命宮 — the natal palace the year's 太歲 (year branch) sits on.
 * Read together with the active 大限: 限宮主十年之質, 流年宮主一年之機.
 */
export interface AnnualPalace {
  year: number;
  yearBranch: string;
  houseName: string;
  sign: string;
  /** Natal bodies sitting in that palace. */
  bodies: string[];
}

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function annualPalace(chart: QizhengChart, year: number): AnnualPalace | null {
  const yearBranch = BRANCH_ORDER[(((year - 4) % 12) + 12) % 12];
  const house = chart.houses.find((h) => h.branch === yearBranch);
  if (!house) return null;
  return {
    year,
    yearBranch,
    houseName: house.name,
    sign: house.sign,
    bodies: [...house.bodies],
  };
}
