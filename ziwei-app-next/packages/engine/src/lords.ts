import type { EarthlyBranch } from './types';

/**
 * 命主 / 身主 — the two personal lord stars of a 紫微 chart.
 * 命主 follows the 命宮 branch; 身主 follows the 生年支. Standard table
 * (《紫微斗數全書》安命主身主訣), identical across 三合/中州 schools.
 */

const MING_LORD_BY_MINGGONG_BRANCH: Record<EarthlyBranch, string> = {
  子: '貪狼', 丑: '巨門', 寅: '祿存', 卯: '文曲',
  辰: '廉貞', 巳: '武曲', 午: '破軍', 未: '武曲',
  申: '廉貞', 酉: '文曲', 戌: '祿存', 亥: '巨門',
};

const SHEN_LORD_BY_YEAR_BRANCH: Record<EarthlyBranch, string> = {
  子: '火星', 丑: '天相', 寅: '天梁', 卯: '天同',
  辰: '文昌', 巳: '天機', 午: '火星', 未: '天相',
  申: '天梁', 酉: '天同', 戌: '文昌', 亥: '天機',
};

export function mingLordOf(mingongBranch: EarthlyBranch): string {
  return MING_LORD_BY_MINGGONG_BRANCH[mingongBranch];
}

export function shenLordOf(yearBranch: EarthlyBranch): string {
  return SHEN_LORD_BY_YEAR_BRANCH[yearBranch];
}
