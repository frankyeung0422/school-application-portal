// @ts-expect-error - lunar-javascript has no types in DefinitelyTyped
import { Solar } from 'lunar-javascript';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, HeavenlyStem, EarthlyBranch } from './types';

/**
 * Wraps `lunar-javascript` for typed access. All ziwei math operates in
 * lunar calendar terms; this is the single conversion seam.
 */

export interface LunarDate {
  year: number;
  month: number; // 1-12 (negative for leap, e.g. -6 = 閏6月 — but we expose isLeap separately)
  day: number;
  isLeap: boolean;
}

export interface SolarTerms {
  yearGanzhi: `${HeavenlyStem}${EarthlyBranch}`;
  monthGanzhi: `${HeavenlyStem}${EarthlyBranch}`;
  dayGanzhi: `${HeavenlyStem}${EarthlyBranch}`;
  hourGanzhi: `${HeavenlyStem}${EarthlyBranch}`;
}

export function solarToLunar(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): { lunar: LunarDate; ganzhi: SolarTerms } {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  const lunarMonth = lunar.getMonth();
  return {
    lunar: {
      year: lunar.getYear(),
      month: Math.abs(lunarMonth),
      day: lunar.getDay(),
      isLeap: lunarMonth < 0,
    },
    ganzhi: {
      yearGanzhi: lunar.getYearInGanZhi() as SolarTerms['yearGanzhi'],
      monthGanzhi: lunar.getMonthInGanZhi() as SolarTerms['monthGanzhi'],
      dayGanzhi: lunar.getDayInGanZhi() as SolarTerms['dayGanzhi'],
      hourGanzhi: lunar.getTimeInGanZhi() as SolarTerms['hourGanzhi'],
    },
  };
}

export function parseGanzhi(gz: string): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const stem = gz[0] as HeavenlyStem;
  const branch = gz[1] as EarthlyBranch;
  if (!HEAVENLY_STEMS.includes(stem)) throw new Error(`Invalid stem: ${stem}`);
  if (!EARTHLY_BRANCHES.includes(branch)) throw new Error(`Invalid branch: ${branch}`);
  return { stem, branch };
}
