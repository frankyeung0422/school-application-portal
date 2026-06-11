/**
 * Ephemeris wrapper — geocentric ecliptic longitude of-date for the 七政.
 *
 * Uses astronomy-engine's GeoVector (geocentric, aberration-corrected) rotated
 * into the true ecliptic of date (EQJ→ECT), which is the frame the ayanāṃśa
 * subtraction expects.
 */
import {
  Body,
  GeoVector,
  RotateVector,
  Rotation_EQJ_ECT,
  type AstroTime,
} from 'astronomy-engine';
import type { Governor } from './types';
import { norm360 } from './ayanamsa';

const RAD = 180 / Math.PI;

const GOVERNOR_BODY: Record<Governor, Body> = {
  日: Body.Sun,
  月: Body.Moon,
  水: Body.Mercury,
  金: Body.Venus,
  火: Body.Mars,
  木: Body.Jupiter,
  土: Body.Saturn,
};

/** Geocentric ecliptic longitude of date (degrees, 0–360) for one body. */
export function eclipticLonOfDate(body: Body, t: AstroTime): number {
  const gv = GeoVector(body, t, true); // aberration-corrected
  const v = RotateVector(Rotation_EQJ_ECT(t), gv);
  return norm360(Math.atan2(v.y, v.x) * RAD);
}

export interface GovernorPosition {
  lon: number;
  retrograde: boolean;
}

/** Longitudes of the 七政 at time t, with retrograde flag for the 5 planets. */
export function sevenGovernors(t: AstroTime): Record<Governor, GovernorPosition> {
  const dayLater = t.AddDays(1);
  const out = {} as Record<Governor, GovernorPosition>;
  for (const name of Object.keys(GOVERNOR_BODY) as Governor[]) {
    const body = GOVERNOR_BODY[name];
    const lon = eclipticLonOfDate(body, t);
    // 日/月 never retrograde; for planets, compare longitude one day later.
    let retrograde = false;
    if (name !== '日' && name !== '月') {
      const lonNext = eclipticLonOfDate(body, dayLater);
      let delta = lonNext - lon;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      retrograde = delta < 0;
    }
    out[name] = { lon, retrograde };
  }
  return out;
}
