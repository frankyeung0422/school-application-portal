import type { BirthInfo } from './types';

/**
 * 真太陽時 (apparent solar time) correction.
 *
 * Clock time is standard-meridian mean time; the hour pillar (and through it
 * 命宮/時柱) should be derived from the Sun's actual position at the
 * birthplace. Two corrections:
 *  1. Longitude: +4 min per degree east of the timezone's central meridian.
 *  2. Equation of time: ±16 min seasonal wobble (Spencer-style approximation,
 *     accurate to ~1 min — enough, since the hour branch is a 2-hour window).
 */

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayOfYear(year: number, month: number, day: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  let n = day;
  for (let m = 0; m < month - 1; m++) n += DAYS_IN_MONTH[m] + (m === 1 && leap ? 1 : 0);
  return n;
}

/** Equation of time in minutes (apparent − mean). */
export function equationOfTimeMinutes(year: number, month: number, day: number): number {
  const n = dayOfYear(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export interface SolarTimeResult {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Total correction applied, in minutes (longitude + equation of time). */
  correctionMinutes: number;
}

/**
 * Convert the birth clock time to apparent solar time. Defaults match the
 * rest of the engine: HKT (+480) and Hong Kong longitude 114.17°E.
 */
export function toApparentSolarTime(birth: BirthInfo): SolarTimeResult {
  const tz = birth.tzOffsetMinutes ?? 480;
  const longitude = birth.longitude ?? 114.17;
  const centralMeridian = tz / 4; // 15° per hour
  const correction =
    4 * (longitude - centralMeridian) +
    equationOfTimeMinutes(birth.year, birth.month, birth.day);

  const t = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute);
  const adj = new Date(t + Math.round(correction) * 60_000);
  return {
    year: adj.getUTCFullYear(),
    month: adj.getUTCMonth() + 1,
    day: adj.getUTCDate(),
    hour: adj.getUTCHours(),
    minute: adj.getUTCMinutes(),
    correctionMinutes: Math.round(correction),
  };
}

/**
 * The (possibly corrected) solar datetime the pillar/palace derivations should
 * use. Identity unless `birth.trueSolarTime` is set.
 */
export function effectiveBirthMoment(birth: BirthInfo): SolarTimeResult {
  if (birth.trueSolarTime) return toApparentSolarTime(birth);
  return {
    year: birth.year, month: birth.month, day: birth.day,
    hour: birth.hour, minute: birth.minute, correctionMinutes: 0,
  };
}
