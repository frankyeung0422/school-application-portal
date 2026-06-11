/**
 * 四餘 — the four computed points that are not visible bodies.
 *
 *   羅睺 (Rāhu)  = Moon's mean ascending node (北交點)
 *   計都 (Ketu)  = 羅睺 + 180° (descending node, 南交點)
 *   月孛         = Moon's mean apogee (line of apsides far point ≈ mean Lilith)
 *   紫氣         = synthetic point on a ~28-year cycle (no astronomical body)
 *
 * 羅睺/計都/月孛 use the Meeus (Astronomical Algorithms, ch. 47) mean-element
 * polynomials, referred to the mean equinox of date — i.e. tropical-of-date,
 * consistent with the planet longitudes. T = Julian centuries TT from J2000.
 */
import { norm360 } from './ayanamsa';
import { QIZHENG_CONFIG } from './config';
import { J2000_JD } from './time';
import type { Remainder } from './types';

/** Moon's mean ascending node Ω (degrees). 羅睺 = Ω. */
export function meanAscendingNode(T: number): number {
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return norm360(omega);
}

/** Moon's mean apogee (degrees) = (L′ − M′) + 180°. */
export function meanApogee(T: number): number {
  const Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    (T * T * T) / 538841 -
    (T * T * T * T) / 65194000;
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    (T * T * T) / 69699 -
    (T * T * T * T) / 14712000;
  const perigee = Lp - Mp; // longitude of perigee ϖ
  return norm360(perigee + 180);
}

/**
 * 紫氣 — synthetic uniform-motion point. λ(jd) = λ0 + 360·(jd − jd0)/(period·365.25).
 * The epoch longitude is a documented placeholder pending calibration; see config.
 */
export function ziQiLongitude(julianDay: number): number {
  const { ziQiEpochLon, ziQiEpochJd, ziQiPeriodYears } = QIZHENG_CONFIG;
  const periodDays = ziQiPeriodYears * 365.25;
  return norm360(ziQiEpochLon + (360 * (julianDay - ziQiEpochJd)) / periodDays);
}

/** All four 餘 longitudes (tropical of date) for the given time. */
export function fourRemainders(T: number, julianDay: number): Record<Remainder, number> {
  const rahu = meanAscendingNode(T);
  return {
    羅睺: rahu,
    計都: norm360(rahu + 180),
    月孛: meanApogee(T),
    紫氣: ziQiLongitude(julianDay),
  };
}

export { J2000_JD };
