/**
 * Time handling: local civil birth time → astronomy-engine AstroTime + Julian Day.
 */
import { MakeTime, type AstroTime } from 'astronomy-engine';
import type { BirthInfo } from '../types';

export const J2000_JD = 2451545.0;

/**
 * Convert local civil birth time (with tz offset, default HKT +480) to an
 * AstroTime. astronomy-engine treats the supplied Date as UTC, so we shift the
 * local wall-clock time back by the timezone offset to get the true UTC instant.
 */
export function birthToAstroTime(birth: BirthInfo): AstroTime {
  const tzOffsetMinutes = birth.tzOffsetMinutes ?? 480;
  const utcMs =
    Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute, 0) -
    tzOffsetMinutes * 60_000;
  return MakeTime(new Date(utcMs));
}

/**
 * Convert an absolute UTC instant to an AstroTime. Sibling of `birthToAstroTime`
 * for transit work, where the instant is already an exact UTC `Date` (no local
 * wall-clock shifting needed). astronomy-engine treats the supplied Date as UTC.
 */
export function instantToAstroTime(d: Date): AstroTime {
  return MakeTime(d);
}

/** Julian Day (TT) from an AstroTime. astronomy-engine's `.tt` is days from J2000 noon. */
export function julianDayTT(t: AstroTime): number {
  return t.tt + J2000_JD;
}

/** Julian centuries (TT) from J2000.0 — the T used in Meeus polynomials. */
export function julianCenturiesTT(t: AstroTime): number {
  return t.tt / 36525;
}
