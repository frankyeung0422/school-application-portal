// @ts-expect-error - lunar-javascript has no types in DefinitelyTyped
import { Solar, Lunar } from 'lunar-javascript';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, HeavenlyStem, EarthlyBranch, type BirthInfo } from './types';

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

/**
 * 農曆 → 陽曆 reverse conversion. lunar-javascript's convention: negative
 * month = leap month (閏月). Throws if the lunar date doesn't exist in that
 * year (e.g. asking for 閏四月 in a year without one).
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeap: boolean,
  hour: number,
  minute: number,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const lunar = Lunar.fromYmdHms(year, isLeap ? -month : month, day, hour, minute, 0);
  const solar = lunar.getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour,
    minute,
  };
}

/**
 * Normalize a BirthInfo to its solar-calendar equivalent. Identity for solar
 * input; for lunar input, reverse-converts (incl. 閏月 via isLeapMonth) so
 * every engine can run its normal solar pipeline. This replaces the old
 * behavior of silently treating lunar input as solar.
 */
export function resolveSolarBirth(birth: BirthInfo): BirthInfo {
  if (birth.calendar !== 'lunar') return birth;
  const s = lunarToSolar(
    birth.year, birth.month, birth.day,
    birth.isLeapMonth ?? false,
    birth.hour, birth.minute,
  );
  return { ...birth, ...s, calendar: 'solar', isLeapMonth: undefined };
}

export function parseGanzhi(gz: string): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const stem = gz[0] as HeavenlyStem;
  const branch = gz[1] as EarthlyBranch;
  if (!HEAVENLY_STEMS.includes(stem)) throw new Error(`Invalid stem: ${stem}`);
  if (!EARTHLY_BRANCHES.includes(branch)) throw new Error(`Invalid branch: ${branch}`);
  return { stem, branch };
}
