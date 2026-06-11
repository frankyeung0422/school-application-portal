import {
  EARTHLY_BRANCHES,
  EarthlyBranch,
  HeavenlyStem,
  HEAVENLY_STEMS,
  PALACE_NAMES,
  PalaceName,
} from './types';

/**
 * Twelve palaces are placed counter-clockwise starting from 命宮 at the
 * earthly branch determined by birth month and birth hour.
 *
 * 命宮位置 = (寅 + 出生月 - 出生時) (counter-clockwise)
 *
 * Reference: 紫雲《紫微斗數導讀》第3章 (TODO: pin chapter+page in P3).
 */
export function locateMingongBranch(birthMonth: number, birthHour: number): EarthlyBranch {
  // 寅 = index 2 in EARTHLY_BRANCHES
  const hourBranchIndex = Math.floor(((birthHour + 1) % 24) / 2); // 子=0, 丑=1, ...
  const idx = (2 + (birthMonth - 1) - hourBranchIndex + 12) % 12;
  return EARTHLY_BRANCHES[idx];
}

/**
 * Given the mingong branch, generate the 12 palaces in canonical order
 * (命兄夫子財疾遷友官田福父), counter-clockwise.
 */
export function generatePalaceBranches(
  mingongBranch: EarthlyBranch,
): Array<{ name: PalaceName; branch: EarthlyBranch }> {
  const startIdx = EARTHLY_BRANCHES.indexOf(mingongBranch);
  return PALACE_NAMES.map((name, i) => ({
    name,
    branch: EARTHLY_BRANCHES[(startIdx - i + 12) % 12],
  }));
}

/**
 * Year-stem → palace-stem placement (五虎遁).
 * The stem of 寅 palace is determined by the year stem; remaining palace stems
 * follow sequentially.
 */
const WU_HU_DUN: Record<HeavenlyStem, HeavenlyStem> = {
  甲: '丙', 己: '丙',
  乙: '戊', 庚: '戊',
  丙: '庚', 辛: '庚',
  丁: '壬', 壬: '壬',
  戊: '甲', 癸: '甲',
};

export function stemOfBranch(yearStem: HeavenlyStem, branch: EarthlyBranch): HeavenlyStem {
  const yinStem = WU_HU_DUN[yearStem];
  const yinStemIdx = HEAVENLY_STEMS.indexOf(yinStem);
  const branchIdx = EARTHLY_BRANCHES.indexOf(branch);
  const yinBranchIdx = 2; // 寅
  const offset = (branchIdx - yinBranchIdx + 12) % 12;
  return HEAVENLY_STEMS[(yinStemIdx + offset) % 10];
}
