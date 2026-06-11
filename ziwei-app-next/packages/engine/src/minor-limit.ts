import {
  EARTHLY_BRANCHES,
  PALACE_NAMES,
  type Chart,
  type DecadeLuck,
  type EarthlyBranch,
  type Gender,
  type Palace,
  type PalaceName,
} from './types';

/**
 * 小限 (annual minor limit) + 大限疊宮 (decade palace overlay).
 *
 * 小限 (《全書》安小限訣): start branch by 生年支三合 —
 *   寅午戌人起辰, 申子辰人起戌, 巳酉丑人起未, 亥卯未人起丑 —
 * 1歲 in the start branch, then 男順行(branch+1)/女逆行(branch−1) one palace
 * per 虛歲, regardless of year-stem polarity (unlike 大限).
 *
 * 疊宮: the active 大限's palace becomes the 大限命宮; the other 11 大限宮
 * are laid counter-clockwise from it exactly like the natal layout. Reading a
 * decade = reading each 大限宮 stacked on the natal palace at the same branch
 * (e.g. 大限夫妻 falls on natal 福德 ⇒ marriage matters route through 福德).
 */

const MINOR_LIMIT_START: Record<EarthlyBranch, EarthlyBranch> = {
  寅: '辰', 午: '辰', 戌: '辰',
  申: '戌', 子: '戌', 辰: '戌',
  巳: '未', 酉: '未', 丑: '未',
  亥: '丑', 卯: '丑', 未: '丑',
};

export interface MinorLimit {
  /** 虛歲. */
  age: number;
  /** Gregorian year (虛歲 anchored to birth year). */
  year: number;
  branch: EarthlyBranch;
  /** The natal palace the 小限 lands on. */
  palaceName: PalaceName;
  /** Natal stars in that palace. */
  stars: string[];
}

/** The 小限 palace for a given 虛歲. */
export function minorLimitAtAge(
  chart: Chart,
  yearBranch: EarthlyBranch,
  gender: Gender,
  age: number,
): MinorLimit | null {
  if (age < 1) return null;
  const start = EARTHLY_BRANCHES.indexOf(MINOR_LIMIT_START[yearBranch]);
  const dir = gender === 'M' ? 1 : -1;
  const idx = (((start + dir * (age - 1)) % 12) + 12) % 12;
  const branch = EARTHLY_BRANCHES[idx];
  const palace = chart.palaces.find((p) => p.branch === branch);
  if (!palace) return null;
  return {
    age,
    year: chart.birthInfo.year + age - 1,
    branch,
    palaceName: palace.name,
    stars: palace.stars.map((s) => s.name),
  };
}

/** The 小限 for a Gregorian year (虛歲 = year − birthYear + 1). */
export function minorLimitAtYear(chart: Chart, year: number): MinorLimit | null {
  const yearBranch = chart.yearGanzhi[1] as EarthlyBranch;
  return minorLimitAtAge(chart, yearBranch, chart.birthInfo.gender, year - chart.birthInfo.year + 1);
}

export interface OverlayPair {
  /** 大限宮 name (e.g. 大限夫妻). */
  decadePalace: PalaceName;
  branch: EarthlyBranch;
  /** The natal palace sitting at that branch. */
  natalPalace: PalaceName;
  /** Natal stars there (what the decade palace "inherits"). */
  stars: string[];
}

/**
 * 大限疊宮 — lay the 12 decade palaces from the decade's 大限命宮 and pair
 * each with the natal palace at the same branch.
 */
export function decadeOverlay(chart: Chart, decade: DecadeLuck): OverlayPair[] {
  const byBranch = new Map<EarthlyBranch, Palace>();
  for (const p of chart.palaces) byBranch.set(p.branch, p);
  const startIdx = EARTHLY_BRANCHES.indexOf(decade.branch);
  return PALACE_NAMES.map((name, i) => {
    const branch = EARTHLY_BRANCHES[((startIdx - i) % 12 + 12) % 12];
    const natal = byBranch.get(branch);
    return {
      decadePalace: name,
      branch,
      natalPalace: natal?.name ?? name,
      stars: natal?.stars.map((s) => s.name) ?? [],
    };
  });
}
