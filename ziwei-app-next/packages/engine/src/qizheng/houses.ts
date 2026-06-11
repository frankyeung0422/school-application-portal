/**
 * Ascendant (命度) + 十二宮 house layout.
 *
 * The ascendant is the rising ecliptic degree, computed from local apparent
 * sidereal time + obliquity + geographic latitude. Houses use whole-sign: the
 * ascendant's sign is the 命宮, and the 果老 house sequence runs clockwise
 * (命→財帛→兄弟…), matching the 紫微 palace direction. This whole-sign +
 * clockwise model is a documented modelling choice (see plan §1, decision 5).
 */
import { SiderealTime, type AstroTime } from 'astronomy-engine';
import { norm360 } from './ayanamsa';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** 十二宮 names in 果老 order, starting from 命宮. */
export const QIZHENG_HOUSE_NAMES = [
  '命宮', '財帛', '兄弟', '田宅', '男女', '奴僕',
  '夫妻', '疾厄', '遷移', '官祿', '福德', '相貌',
] as const;

/** Mean obliquity of the ecliptic (degrees), Meeus ch. 22. T = centuries TT from J2000. */
export function meanObliquity(T: number): number {
  return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
}

/**
 * Tropical-of-date ecliptic longitude of the ascendant (degrees, 0–360).
 * @param longitudeEast geographic longitude, east-positive degrees.
 */
export function ascendantTropical(
  t: AstroTime,
  T: number,
  latitude: number,
  longitudeEast: number,
): number {
  const gast = SiderealTime(t); // apparent GAST, sidereal hours
  const ramc = norm360(gast * 15 + longitudeEast); // local apparent sidereal time, degrees
  const eps = meanObliquity(T) * RAD;
  const ramcR = ramc * RAD;
  const latR = latitude * RAD;
  const asc = Math.atan2(
    Math.cos(ramcR),
    -(Math.sin(ramcR) * Math.cos(eps) + Math.tan(latR) * Math.sin(eps)),
  );
  return norm360(asc * DEG);
}

/** House index 1–12 for a body, given its sign index and the ascendant's sign index. */
export function houseOf(bodySignIndex: number, ascSignIndex: number): number {
  return (((ascSignIndex - bodySignIndex) % 12) + 12) % 12 + 1;
}
