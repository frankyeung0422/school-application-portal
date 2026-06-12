export * from './types';
export * from './palaces';
export * from './stars';
export * from './minor-stars';
export * from './decade-luck';
export * from './flying-stars';
export * from './bureau';
export * from './transformations';
export * from './solar-to-lunar';
export * from './solar-time';
export * from './bazi-strength';
export * from './patterns';
export * from './cross-system';
export * from './lords';
export * from './minor-limit';
export * from './bazi-shensha';
export * from './civil-time';
export * from './iron-plate';
export * from './bazi';
export * from './bazi-mangpai';
export * from './branch-relations';
export * from './alerts';
export * from './year-flow';
export * from './health-timeline';
export * from './qizheng';
export * from './transits';

import {
  type BirthInfo,
  type Chart,
  type Palace,
  type PlacedStar,
  type PalaceName,
  type HeavenlyStem,
  type EarthlyBranch,
  PALACE_NAMES,
  EARTHLY_BRANCHES,
} from './types';
import { locateMingongBranch, generatePalaceBranches, stemOfBranch } from './palaces';
import { placeMainStars, placeZiWei, brightnessOf } from './stars';
import { placeMinorStars } from './minor-stars';
import { computeDecadeLuck } from './decade-luck';
import { bureauFromMingong } from './bureau';
import { transformationsForYearStem } from './transformations';
import { solarToLunar, parseGanzhi, resolveSolarBirth } from './solar-to-lunar';
import { mingLordOf, shenLordOf } from './lords';
import { effectiveBirthMoment } from './solar-time';
import { toStandardTimeBirth } from './civil-time';

export const ENGINE_VERSION = '0.6.0' as const;

/**
 * Compute a full ziwei chart from birth info.
 *
 * Pipeline:
 *  1. solar → lunar via lunar-javascript
 *  2. locate 命宮 branch from lunar month + birth hour
 *  3. compute palace stems via 五虎遁 from year stem
 *  4. derive 五行局 from 命宮 stem+branch (納音五行)
 *  5. place 紫微 by (lunar day, bureau num)
 *  6. place all 14 main stars
 *  7. compute 四化 transformations from year stem
 *  8. assemble palaces with brightness + transformation badges
 */
export function computeChart(birth: BirthInfo): Chart {
  // Step 0: lunar input → solar equivalent (incl. 閏月), then historical DST →
  // standard time, then one solar pipeline.
  const solarBirth = toStandardTimeBirth(resolveSolarBirth(birth));

  // 真太陽時 correction (opt-in) on the solar moment.
  const eff = effectiveBirthMoment(solarBirth);

  // Step 1: solar → lunar
  const { lunar, ganzhi } = solarToLunar(eff.year, eff.month, eff.day, eff.hour, eff.minute);
  const yearGanzhi: `${HeavenlyStem}${EarthlyBranch}` = ganzhi.yearGanzhi;

  // 閏月過半作下月 — mainstream convention (matches iztro fixLeap): a birth in
  // the second half of a leap month counts as the next month for all
  // month-keyed placements (命宮/身宮/左輔/右弼).
  const effectiveMonth = lunar.isLeap && lunar.day > 15 ? lunar.month + 1 : lunar.month;

  const { stem: yearStem, branch: yearBranch } = parseGanzhi(yearGanzhi);

  // Step 2: 命宮 branch
  const mingongBranch = locateMingongBranch(effectiveMonth, eff.hour);

  // 身宮 = 命宮 + 生月 + 生時 (both forward, clockwise).
  // Equivalent: from 寅, advance (lunar.month - 1) + hourBranchIndex.
  // Source: 紫雲《紫微斗數導讀》ch.3 page 42.
  const hourBranchIndex = Math.floor(((eff.hour + 1) % 24) / 2);
  const shenGongIdx = (2 + (effectiveMonth - 1) + hourBranchIndex) % 12;
  const shenGongBranch = EARTHLY_BRANCHES[shenGongIdx];

  // Step 3: palace stems
  const palaceBranches = generatePalaceBranches(mingongBranch);
  const palacesWithStems: Array<{ name: PalaceName; branch: EarthlyBranch; stem: HeavenlyStem }> = palaceBranches.map((p) => ({
    name: p.name,
    branch: p.branch,
    stem: stemOfBranch(yearStem, p.branch),
  }));

  // Step 4: 五行局
  const mingongPalace = palacesWithStems[0];
  const bureau = bureauFromMingong(mingongPalace.stem, mingongPalace.branch);

  // Step 5: place 紫微
  const ziWeiBranch = placeZiWei(lunar.day, bureau.num);

  // Step 6: place all 14 main stars
  const starPlacements = placeMainStars(ziWeiBranch);

  // Step 6.5: place the 14 minor stars (吉星 + 煞星) — alert rules and
  // aux-star 四化 (文昌/文曲/左輔/右弼) depend on these being in the chart.
  const minorPlacements = placeMinorStars({
    yearStem,
    yearBranch,
    lunarMonth: effectiveMonth,
    hourBranchIndex,
  });

  // Step 7: 四化 transformations
  const trans = transformationsForYearStem(yearStem);
  const transformedStar: Partial<Record<string, '祿' | '權' | '科' | '忌'>> = {
    [trans.祿]: '祿',
    [trans.權]: '權',
    [trans.科]: '科',
    [trans.忌]: '忌',
  };

  // Step 8: assemble palaces — main stars first, then minor stars.
  const branchToStars = new Map<EarthlyBranch, PlacedStar[]>();
  for (const [star, branch] of starPlacements) {
    const list = branchToStars.get(branch) ?? [];
    const placed: PlacedStar = {
      name: star,
      brightness: brightnessOf(star, branch),
      transformation: transformedStar[star],
    };
    list.push(placed);
    branchToStars.set(branch, list);
  }
  for (const [star, branch] of minorPlacements) {
    const list = branchToStars.get(branch) ?? [];
    list.push({ name: star, transformation: transformedStar[star] });
    branchToStars.set(branch, list);
  }

  const palaces: Palace[] = palacesWithStems.map((p) => ({
    name: p.name,
    branch: p.branch,
    ganzhi: `${p.stem}${p.branch}` as Palace['ganzhi'],
    stars: branchToStars.get(p.branch) ?? [],
    isMingong: p.name === '命宮',
    isShenGong: p.branch === shenGongBranch,
  }));

  // Step 9: 大限 decades (陽男陰女順行 / 陰男陽女逆行, 起虛歲 = 局數).
  const decades = computeDecadeLuck(palaces, yearStem, birth.gender, bureau.num);

  return {
    engineVersion: ENGINE_VERSION,
    birthInfo: birth,
    solarDate: {
      year: solarBirth.year, month: solarBirth.month, day: solarBirth.day,
      hour: solarBirth.hour, minute: solarBirth.minute,
    },
    lunarDate: lunar,
    yearGanzhi,
    bureau,
    palaces,
    decades,
    mingLord: mingLordOf(mingongBranch),
    shenLord: shenLordOf(yearBranch),
  };
}

/** Stable hash for cache lookup. */
export function chartHash(birth: BirthInfo): string {
  const tst = birth.trueSolarTime ? '-tst' : '';
  const leap = birth.calendar === 'lunar' && birth.isLeapMonth ? '-leap' : '';
  const canonical = `${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}-${birth.gender}-${birth.calendar}${tst}${leap}`;
  // Lightweight non-crypto fingerprint; consumers can layer SHA-256 on top if needed.
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) + h + canonical.charCodeAt(i)) | 0;
  return `c_${(h >>> 0).toString(16)}_${birth.year}${birth.month}${birth.day}`;
}

import { computeBazi, baziHash, type BaziChart } from './bazi';
import { computeQizhengChart, qizhengHash, type QizhengChart } from './qizheng';

/**
 * All three system charts computed from a single birth input, with each
 * system's cache hash. 紫微 and 八字 ignore latitude/longitude; 果老 uses them
 * (and folds them into its hash) — so a unified subject keyed on one birth
 * gets one ziwei/bazi pair but a location-specific qizheng chart.
 */
export interface AllSystems {
  ziwei: { chart: Chart; hash: string };
  bazi: { chart: BaziChart; hash: string };
  qizheng: { chart: QizhengChart; hash: string };
}

/** Compute 紫微 + 八字 + 果老 for one person in a single call. */
export function computeAllSystems(birth: BirthInfo): AllSystems {
  return {
    ziwei: { chart: computeChart(birth), hash: chartHash(birth) },
    bazi: { chart: computeBazi(birth), hash: baziHash(birth) },
    qizheng: { chart: computeQizhengChart(birth), hash: qizhengHash(birth) },
  };
}
