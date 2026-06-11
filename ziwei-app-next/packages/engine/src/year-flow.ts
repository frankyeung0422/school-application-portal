// @ts-expect-error - lunar-javascript has no types
import { Solar } from 'lunar-javascript';
import type { HeavenlyStem, EarthlyBranch, Chart, Palace, Transformation } from './types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from './types';
import type { BaziChart, LuckPillar, TenGod, WuXing } from './bazi';
import { STEM_TO_ELEMENT } from './bazi';
import { transformationsForYearStem } from './transformations';
import { branchRelation, type BranchRelation } from './branch-relations';
import { solarToLunar } from './solar-to-lunar';

/**
 * Compute the ganzhi for any solar year using lunar-javascript. Uses the
 * 立春 (Feb-4-ish) anchor — same convention as bazi 年柱.
 */
export function ganzhiOfYear(year: number): `${HeavenlyStem}${EarthlyBranch}` {
  // Solar mid-year (Aug 15) is guaranteed past 立春, so lunar.getYearInGanZhi()
  // returns the correct year-pillar regardless of edge cases near Feb 4.
  const solar = Solar.fromYmd(year, 8, 15);
  const gz = solar.getLunar().getYearInGanZhi() as string;
  return gz as `${HeavenlyStem}${EarthlyBranch}`;
}

export interface ZiweiYearFlow {
  year: number;
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  /** The natal palace whose branch matches the year branch — i.e. where 流年 lands. */
  hostPalace: Palace | null;
  age: number;
}

/**
 * For a ziwei chart, locate the natal palace that the given year's branch
 * lands in. e.g. 2026 = 丙午, branch=午 → the palace at 午 hosts 流年.
 */
export function ziweiYearFlow(chart: Chart, year: number, birthYear: number): ZiweiYearFlow {
  const gz = ganzhiOfYear(year);
  const stem = gz[0] as HeavenlyStem;
  const branch = gz[1] as EarthlyBranch;
  const hostPalace = chart.palaces.find((p) => p.branch === branch) ?? null;
  return {
    year,
    ganzhi: gz,
    stem,
    branch,
    hostPalace,
    age: year - birthYear,
  };
}

// Ten-god (十神) lookup: relation of an arbitrary stem to a day-master stem.
// Order matters: same yin/yang polarity is the "comrade" pole.
const STEM_INDEX: Record<HeavenlyStem, number> = {
  甲: 0, 乙: 1, 丙: 2, 丁: 3, 戊: 4, 己: 5, 庚: 6, 辛: 7, 壬: 8, 癸: 9,
};
const STEM_IS_YANG: Record<HeavenlyStem, boolean> = {
  甲: true, 乙: false, 丙: true, 丁: false,
  戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false,
};

const ELEMENT_GENERATING_ORDER: WuXing[] = ['木', '火', '土', '金', '水']; // generates next (相生)

/** Returns the 十神 relation FROM yearStem TO dayMaster. */
export function tenGodVsDayMaster(yearStem: HeavenlyStem, dayMaster: HeavenlyStem): TenGod {
  void STEM_INDEX;
  const dmEl = STEM_TO_ELEMENT[dayMaster];
  const yEl = STEM_TO_ELEMENT[yearStem];
  const samePolarity = STEM_IS_YANG[yearStem] === STEM_IS_YANG[dayMaster];

  const dmI = ELEMENT_GENERATING_ORDER.indexOf(dmEl);
  const yI = ELEMENT_GENERATING_ORDER.indexOf(yEl);
  // delta = (yI - dmI) mod 5, but we interpret relative to dm.
  const delta = (yI - dmI + 5) % 5;

  // delta 0 = same element → 比肩(same pol) / 劫財(diff)
  // delta 1 = dm generates y (我生) → 食神(same pol) / 傷官(diff)  — 子孫
  // delta 2 = dm controls y (我剋) → 偏財(same pol) / 正財(diff)  — 妻財
  // delta 3 = y controls dm (剋我) → 七殺(same pol) / 正官(diff)  — 官煞
  // delta 4 = y generates dm (生我) → 偏印(same pol) / 正印(diff)  — 印梟
  const map: Record<number, [TenGod, TenGod]> = {
    0: ['比肩', '劫財'],
    1: ['食神', '傷官'],
    2: ['偏財', '正財'],
    3: ['七殺', '正官'],
    4: ['偏印', '正印'],
  };
  const [same, diff] = map[delta];
  return samePolarity ? same : diff;
}

export interface BaziYearFlow {
  year: number;
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  age: number;
  /** 十神 of year stem vs day master. */
  yearTenGod: TenGod;
  /** Active 大運 covering this year (null if outside computed range). */
  activeLuckPillar: LuckPillar | null;
}

export function baziYearFlow(
  birthYear: number,
  dayMaster: HeavenlyStem,
  luckPillars: LuckPillar[],
  year: number,
): BaziYearFlow {
  const gz = ganzhiOfYear(year);
  const stem = gz[0] as HeavenlyStem;
  const branch = gz[1] as EarthlyBranch;
  const active = luckPillars.find((lp) => year >= lp.startYear && year <= lp.endYear) ?? null;
  return {
    year,
    ganzhi: gz,
    stem,
    branch,
    age: year - birthYear,
    yearTenGod: tenGodVsDayMaster(stem, dayMaster),
    activeLuckPillar: active,
  };
}

// ── 流月 / 流日 (sub-annual flow) ────────────────────────────────────
//
// Month/day granularity for ziwei + bazi. Ganzhi come from lunar-javascript,
// which anchors the month-pillar on 節氣 (solar terms) — the same clock the
// 果老 (purely solar) transits run on, so the unified snapshot stays coherent.

export type FlowScope = 'month' | 'day';

/** Ganzhi for a civil date at month or day granularity (節氣-anchored). */
function ganzhiForDate(
  date: Date,
  scope: FlowScope,
): { ganzhi: `${HeavenlyStem}${EarthlyBranch}`; stem: HeavenlyStem; branch: EarthlyBranch } {
  const { ganzhi } = solarToLunar(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    12,
    0,
  );
  const gz = scope === 'month' ? ganzhi.monthGanzhi : ganzhi.dayGanzhi;
  return { ganzhi: gz, stem: gz[0] as HeavenlyStem, branch: gz[1] as EarthlyBranch };
}

export interface ZiweiPeriodFlow {
  scope: FlowScope;
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  /** Natal palace whose branch matches the period branch — where 流月/流日命宮 lands. */
  hostPalace: Palace | null;
  /** 流四化 driven by the period stem (祿權科忌 → star name). */
  periodTransformations: Record<Transformation, string>;
  /** Where each period-transformed star sits in the natal chart (the load-bearing signal). */
  transformedNatalStars: Array<{ star: string; palace: string; hua: Transformation }>;
}

function ziweiPeriodFlow(chart: Chart, date: Date, scope: FlowScope): ZiweiPeriodFlow {
  const { ganzhi, stem, branch } = ganzhiForDate(date, scope);
  const hostPalace = chart.palaces.find((p) => p.branch === branch) ?? null;
  const trans = transformationsForYearStem(stem);
  const periodTransformations: Record<Transformation, string> = {
    祿: trans.祿,
    權: trans.權,
    科: trans.科,
    忌: trans.忌,
  };
  const transformedNatalStars: ZiweiPeriodFlow['transformedNatalStars'] = [];
  for (const hua of ['祿', '權', '科', '忌'] as Transformation[]) {
    const starName = periodTransformations[hua];
    const palace = chart.palaces.find((p) => p.stars.some((s) => s.name === starName));
    if (palace) transformedNatalStars.push({ star: starName, palace: palace.name, hua });
  }
  return { scope, ganzhi, stem, branch, hostPalace, periodTransformations, transformedNatalStars };
}

/** 流月 for a ziwei chart at the given civil date. */
export function ziweiMonthFlow(chart: Chart, date: Date): ZiweiPeriodFlow {
  return ziweiPeriodFlow(chart, date, 'month');
}

/** 流日 for a ziwei chart at the given civil date. */
export function ziweiDayFlow(chart: Chart, date: Date): ZiweiPeriodFlow {
  return ziweiPeriodFlow(chart, date, 'day');
}

export interface BaziPeriodFlow {
  scope: FlowScope;
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  /** 十神 of the period stem vs day master. */
  tenGod: TenGod;
  /** Period branch's relation (沖/刑/害/合/會) to each natal pillar branch. */
  branchRelationToNatal: Array<{ pillar: 'year' | 'month' | 'day' | 'hour'; relation: BranchRelation }>;
}

function baziPeriodFlow(bazi: BaziChart, date: Date, scope: FlowScope): BaziPeriodFlow {
  const { ganzhi, stem, branch } = ganzhiForDate(date, scope);
  const branchRelationToNatal: BaziPeriodFlow['branchRelationToNatal'] = [];
  for (const pillar of ['year', 'month', 'day', 'hour'] as const) {
    const rel = branchRelation(branch, bazi.pillars[pillar].branch);
    if (rel) branchRelationToNatal.push({ pillar, relation: rel });
  }
  return {
    scope,
    ganzhi,
    stem,
    branch,
    tenGod: tenGodVsDayMaster(stem, bazi.dayMaster),
    branchRelationToNatal,
  };
}

/** 流月 for a bazi chart at the given civil date. */
export function baziMonthFlow(bazi: BaziChart, date: Date): BaziPeriodFlow {
  return baziPeriodFlow(bazi, date, 'month');
}

/** 流日 for a bazi chart at the given civil date. */
export function baziDayFlow(bazi: BaziChart, date: Date): BaziPeriodFlow {
  return baziPeriodFlow(bazi, date, 'day');
}

// Re-export the canonical orders so tests can use them.
export { HEAVENLY_STEMS, EARTHLY_BRANCHES };
