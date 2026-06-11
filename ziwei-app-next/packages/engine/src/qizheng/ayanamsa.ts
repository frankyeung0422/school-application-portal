/**
 * Ayanāṃśa — the precession offset that converts a tropical-of-date longitude
 * into the sidereal (fixed-star) frame the 二十八宿 live in.
 *
 * Default = Lahiri / Chitrapakṣa, anchored to 角宿一 (Spica). At J2000.0 it is
 * ≈ 23°51′ and grows ≈ 50.26″/yr. This is a linear approximation accurate to
 * ~arc-minutes across 1900–2100, which is well within 宿/宮 binning tolerance.
 */
import { J2000_JD } from './time';

const LAHIRI_J2000_DEG = 23.8531; // 23°51′11″
const LAHIRI_RATE_DEG_PER_YEAR = 0.0139601; // ≈ 50.256″/yr

/** Ayanāṃśa in degrees for a given Julian Day. */
export function ayanamsa(julianDay: number): number {
  const years = (julianDay - J2000_JD) / 365.25;
  return LAHIRI_J2000_DEG + LAHIRI_RATE_DEG_PER_YEAR * years;
}

export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** tropical-of-date longitude → sidereal longitude. */
export function toSidereal(lonTropical: number, julianDay: number): number {
  return norm360(lonTropical - ayanamsa(julianDay));
}
