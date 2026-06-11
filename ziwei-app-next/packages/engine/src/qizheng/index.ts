/**
 * 果老星宗 / 七政四餘 engine — public entry point.
 *
 * Pipeline (computeQizhengChart):
 *  1. local birth time → AstroTime + Julian Day (time.ts)
 *  2. 七政 geocentric ecliptic longitudes of date (ephemeris.ts)
 *  3. 四餘 from Meeus polynomials + synthetic 紫氣 (four-yu.ts)
 *  4. tropical-of-date → sidereal via ayanāṃśa (ayanamsa.ts)
 *  5. bin each 曜 into 宿 + 入宿度 (mansions.ts) and 宮 + 入宮度 (signs.ts)
 *  6. ascendant (命度) + whole-sign 十二宮 houses (houses.ts)
 *  7. dignities (廟旺落陷) + 命主星 / 身主星 (dignities.ts / signs.ts)
 */
import type { BirthInfo } from '../types';
import { resolveSolarBirth } from '../solar-to-lunar';
import { toSidereal, norm360, ayanamsa } from './ayanamsa';
import { QIZHENG_CONFIG, QIZHENG_ENGINE_VERSION, DEFAULT_LATITUDE, DEFAULT_LONGITUDE } from './config';
import { dignityOf } from './data/dignities';
import { SIGNS, signIndexOf, rulerOfSign } from './data/signs';
import { sevenGovernors } from './ephemeris';
import { fourRemainders } from './four-yu';
import { ascendantTropical, houseOf, QIZHENG_HOUSE_NAMES } from './houses';
import { mansionOf } from './mansions';
import { birthToAstroTime, julianCenturiesTT, julianDayTT } from './time';
import {
  ELEVEN_BODIES,
  FOUR_REMAINDERS,
  type Governor,
  type PlacedBody,
  type QizhengBodyName,
  type QizhengChart,
  type QizhengHouse,
  type Remainder,
} from './types';

export * from './types';
export * from './transits';
export * from './limits';
export { QIZHENG_ENGINE_VERSION, QIZHENG_CONFIG } from './config';
export { MANSION_BOUNDARIES } from './mansions';

const FOUR_REMAINDER_SET = new Set<string>(FOUR_REMAINDERS);

export function computeQizhengChart(birthInput: BirthInfo): QizhengChart {
  // Lunar input → solar equivalent (incl. 閏月) before any time math.
  const birth = resolveSolarBirth(birthInput);
  const t = birthToAstroTime(birth);
  const jd = julianDayTT(t);
  const T = julianCenturiesTT(t);
  const ayan = ayanamsa(jd);

  const latitude = birth.latitude ?? DEFAULT_LATITUDE;
  const longitude = birth.longitude ?? DEFAULT_LONGITUDE;

  // --- ascendant (命度) ---
  const ascTropical = ascendantTropical(t, T, latitude, longitude);
  const ascSidereal = toSidereal(ascTropical, jd);
  const ascSignIndex = signIndexOf(ascSidereal);
  const ascSign = SIGNS[ascSignIndex];
  const ascMansion = mansionOf(ascSidereal);

  // --- gather raw tropical longitudes for all 11 曜 ---
  const governors = sevenGovernors(t);
  const remainders = fourRemainders(T, jd);
  const retroOf = (name: QizhengBodyName): boolean =>
    name in governors ? governors[name as Governor].retrograde : false;
  const tropicalLonOf = (name: QizhengBodyName): number =>
    FOUR_REMAINDER_SET.has(name) ? remainders[name as Remainder] : governors[name as Governor].lon;

  // --- place each 曜 ---
  const bodies: PlacedBody[] = ELEVEN_BODIES.map((name) => {
    const lonTropical = tropicalLonOf(name);
    const lonSidereal = toSidereal(lonTropical, jd);
    const signIndex = signIndexOf(lonSidereal);
    const sign = SIGNS[signIndex];
    const { mansion, degIntoMansion } = mansionOf(lonSidereal);
    return {
      name,
      lonTropical,
      lonSidereal,
      mansion,
      degIntoMansion,
      sign: sign.sign,
      degIntoSign: norm360(lonSidereal) - signIndex * 30,
      house: houseOf(signIndex, ascSignIndex),
      houseName: QIZHENG_HOUSE_NAMES[houseOf(signIndex, ascSignIndex) - 1],
      retrograde: retroOf(name),
      dignity: dignityOf(name, signIndex),
    };
  });

  // --- 命主星 / 身主星 ---
  const mingLord: Governor = rulerOfSign(ascSignIndex);
  const moon = bodies.find((b) => b.name === '月')!;
  const shenLord: Governor = rulerOfSign(signIndexOf(moon.lonSidereal));

  // --- whole-sign houses ---
  const houses: QizhengHouse[] = QIZHENG_HOUSE_NAMES.map((houseName, i) => {
    const signIndex = (((ascSignIndex - i) % 12) + 12) % 12;
    const sign = SIGNS[signIndex];
    return {
      index: i + 1,
      name: houseName,
      sign: sign.sign,
      branch: sign.branch,
      bodies: bodies.filter((b) => b.house === i + 1).map((b) => b.name),
    };
  });

  return {
    kind: 'qizheng',
    engineVersion: QIZHENG_ENGINE_VERSION,
    birthInfo: birthInput,
    julianDay: jd,
    ayanamsa: ayan,
    config: {
      ayanamsa: QIZHENG_CONFIG.ayanamsa,
      luoCalcConvention: QIZHENG_CONFIG.luoCalcConvention,
      ziQiPeriodYears: QIZHENG_CONFIG.ziQiPeriodYears,
    },
    ascendant: {
      lonTropical: ascTropical,
      lonSidereal: ascSidereal,
      sign: ascSign.sign,
      ci: ascSign.ci,
      branch: ascSign.branch,
      mansion: ascMansion.mansion,
      degIntoMansion: ascMansion.degIntoMansion,
    },
    mingLord,
    shenLord,
    bodies,
    houses,
  };
}

/** Stable hash for cache lookup. Includes lat/long since the ascendant depends on place. */
export function qizhengHash(birth: BirthInfo): string {
  const lat = birth.latitude ?? DEFAULT_LATITUDE;
  const lon = birth.longitude ?? DEFAULT_LONGITUDE;
  const leap = birth.calendar === 'lunar' && birth.isLeapMonth ? '-leap' : '';
  const canonical = `qz-${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}-${birth.gender}-${birth.calendar}${leap}-${lat}-${lon}`;
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) + h + canonical.charCodeAt(i)) | 0;
  return `q_${(h >>> 0).toString(16)}_${birth.year}${birth.month}${birth.day}`;
}
