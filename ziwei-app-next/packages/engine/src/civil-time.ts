import type { BirthInfo } from './types';

/**
 * Historical civil-time normalization — daylight saving time.
 *
 * A birth certificate records the LEGAL wall-clock time, but 排盤 must use
 * standard (solar-aligned) time. UTC+8 regions all observed DST historically:
 *   - Hong Kong: summer time 1941–1979 (and UTC+9 under occupation 1942–45)
 *   - Taiwan: 1945–1961, 1974–75, 1979
 *   - Mainland China: 1986–1991
 * A summer 1950s HK birth entered as clock time is one hour late → the hour
 * branch (時辰) and sometimes the day pillar are wrong.
 *
 * Rather than hand-maintaining transition tables, this uses the IANA tzdata
 * shipped with Node's ICU (full historical transitions) via Intl. The zone is
 * inferred from birth coordinates (engine default = Hong Kong, matching the
 * app's market); births outside the supported boxes get no correction.
 */

function offsetMinutesAt(zone: string, utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'longOffset',
    year: 'numeric',
  });
  const tzPart = dtf.formatToParts(new Date(utcMs)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+08:00';
  // "GMT+08:00" | "GMT+8" | "GMT-05:30"
  const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 480;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

/** IANA zone for the birthplace, or null when we can't safely infer one. */
export function zoneForBirth(birth: BirthInfo): string | null {
  const tz = birth.tzOffsetMinutes ?? 480;
  if (tz !== 480) return null; // only UTC+8 legal-time histories are handled
  const lat = birth.latitude ?? 22.32; // engine default = Hong Kong
  const lon = birth.longitude ?? 114.17;
  if (lat >= 21.8 && lat <= 22.7 && lon >= 113.4 && lon <= 114.5) return 'Asia/Hong_Kong';
  if (lat >= 21.5 && lat <= 25.5 && lon >= 119.5 && lon <= 122.1) return 'Asia/Taipei';
  if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) return 'Asia/Shanghai';
  return null;
}

export interface CivilTimeResult {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Minutes the wall clock was ahead of standard time (60 during DST, 0 otherwise). */
  dstCorrectionMinutes: number;
  zone: string | null;
}

/**
 * Convert the recorded legal wall-clock time to STANDARD time (UTC+8) for the
 * birthplace. Identity when the zone is unknown or no DST was in force.
 */
export function normalizeCivilTime(birth: BirthInfo): CivilTimeResult {
  const identity: CivilTimeResult = {
    year: birth.year, month: birth.month, day: birth.day,
    hour: birth.hour, minute: birth.minute,
    dstCorrectionMinutes: 0, zone: null,
  };
  const zone = zoneForBirth(birth);
  if (!zone) return identity;

  const standardOffset = birth.tzOffsetMinutes ?? 480;
  const wallMs = Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour, birth.minute);

  // Find the UTC instant whose legal local time equals the recorded wall clock
  // (fixed-point on the offset; converges in ≤2 steps for step functions).
  let offset = standardOffset;
  let utcMs = wallMs - offset * 60_000;
  for (let i = 0; i < 3; i++) {
    const o = offsetMinutesAt(zone, utcMs);
    if (o === offset) break;
    offset = o;
    utcMs = wallMs - offset * 60_000;
  }

  const correction = offset - standardOffset;
  if (correction === 0) return { ...identity, zone };

  const std = new Date(utcMs + standardOffset * 60_000);
  return {
    year: std.getUTCFullYear(),
    month: std.getUTCMonth() + 1,
    day: std.getUTCDate(),
    hour: std.getUTCHours(),
    minute: std.getUTCMinutes(),
    dstCorrectionMinutes: correction,
    zone,
  };
}

/** BirthInfo with the wall clock replaced by standard time. */
export function toStandardTimeBirth(birth: BirthInfo): BirthInfo {
  const n = normalizeCivilTime(birth);
  if (n.dstCorrectionMinutes === 0) return birth;
  return { ...birth, year: n.year, month: n.month, day: n.day, hour: n.hour, minute: n.minute };
}
