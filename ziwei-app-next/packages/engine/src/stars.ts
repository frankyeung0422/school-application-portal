import {
  MAIN_STARS, MainStar, EARTHLY_BRANCHES, EarthlyBranch, StarBrightness,
} from './types';

/**
 * Star placement — implements the canonical 紫微 + 天府 系 placement.
 *
 * Source: 紫雲《紫微斗數導讀》ch.4 table 4-2 (紫微 placement) + ch.5 (other 13 stars).
 *
 * Algorithm:
 *  1. 紫微 located by (lunar day, 五行局) via the bureau-N table
 *  2. 紫微系 (6 stars): 紫微 → 天機(逆1) → [skip 1] 太陽(逆2) → 武曲(逆1) → 天同(逆1) → [skip 2] 廉貞(逆3)
 *     Effective offsets from 紫微 counter-clockwise: 紫微=0, 天機=-1, 太陽=-3, 武曲=-4, 天同=-5, 廉貞=-8
 *  3. 天府 placed at the branch that is the "mirror" of 紫微 about the 寅申 axis
 *  4. 天府系 (8 stars): 天府 → 太陰(順1) → 貪狼(順1) → 巨門(順1) → 天相(順1) → 天梁(順1) → 七殺(順1) → [skip 2] 破軍(順3)
 *     Effective offsets from 天府 clockwise: 天府=0, 太陰=+1, 貪狼=+2, 巨門=+3, 天相=+4, 天梁=+5, 七殺=+6, 破軍=+10
 */

/**
 * Place 紫微 by 五行局數 (2-6) and lunar day (1-30).
 *
 * Canonical 安紫微訣: divide the lunar day d by the bureau number n, borrowing
 * up to the next multiple when it doesn't divide evenly:
 *   q = ceil(d / n)        — the quotient after borrowing
 *   x = q·n − d            — the borrowed amount (借數, 0 when even division)
 * Count (q − 1) palaces forward from 寅, then move x further forward if x is
 * EVEN, or x backward if x is ODD.
 *
 * Verified against the classical per-bureau tables: 水二局初一→丑, 初二→寅;
 * 木三局初一→辰; 金四局初一→亥; 土五局初一→午; 火六局初一→酉 — and
 * cross-validated against iztro on 200 random births (see
 * __tests__/iztro-crosscheck.test.ts).
 *
 * HISTORY: engine ≤0.4 used a mis-derived form of this rule (ignored x in the
 * offset and inverted the parity direction), mis-placing 紫微 — and therefore
 * all 14 main stars — in ~90% of charts. Caught by the iztro cross-check.
 */
export function placeZiWei(lunarDay: number, bureauNum: number): EarthlyBranch {
  if (lunarDay < 1 || lunarDay > 30) throw new Error(`lunarDay must be 1-30, got ${lunarDay}`);
  if (![2, 3, 4, 5, 6].includes(bureauNum)) throw new Error(`bureauNum must be 2-6, got ${bureauNum}`);

  const n = bureauNum;
  const q = Math.ceil(lunarDay / n);
  const x = q * n - lunarDay;
  const offset = (q - 1) + (x % 2 === 0 ? x : -x);
  const idx = ((2 + offset) % 12 + 12) % 12; // 寅 = index 2
  return EARTHLY_BRANCHES[idx];
}

/**
 * Given the 紫微 branch, place all 14 main stars.
 *
 * Reference: 紫雲《紫微斗數導讀》ch.5 pages 62-78.
 *
 * Returns a Map of star name → branch.
 */
export function placeMainStars(ziWeiBranch: EarthlyBranch): Map<MainStar, EarthlyBranch> {
  const z = EARTHLY_BRANCHES.indexOf(ziWeiBranch);

  // 紫微系 — offsets from 紫微 (counter-clockwise = negative index delta).
  // 訣: 紫微逆去天機星，隔一(skip ONE)陽武天同當，又隔二位(skip TWO)廉貞地.
  // 紫微 0 | 天機 -1 | (空-2) | 太陽 -3 | 武曲 -4 | 天同 -5 | (空-6,-7) | 廉貞 -8
  // HISTORY: engine ≤0.4 used -4/-5/-6/-9 (read 隔一 as skip two), shifting
  // 太陽/武曲/天同/廉貞 one palace in every chart. Caught by iztro cross-check.
  const ziWeiSystem: Array<[MainStar, number]> = [
    ['紫微', 0],
    ['天機', -1],
    ['太陽', -3],
    ['武曲', -4],
    ['天同', -5],
    ['廉貞', -8],
  ];

  // 天府 sits opposite 紫微 across the 寅—申 axis.
  // Standard rule: 天府 = mirror of 紫微 across the axis through 寅 (idx 2) and 申 (idx 8).
  // For any branch idx z (0-11), tianFu idx = (4 - z + 12) % 12.
  const tIdx = (4 - z + 12) % 12;

  // 天府系 — offsets from 天府 clockwise (positive index delta)
  // 天府 0 | 太陰 +1 | 貪狼 +2 | 巨門 +3 | 天相 +4 | 天梁 +5 | 七殺 +6 | 破軍 +10
  const tianFuSystem: Array<[MainStar, number]> = [
    ['天府', 0],
    ['太陰', 1],
    ['貪狼', 2],
    ['巨門', 3],
    ['天相', 4],
    ['天梁', 5],
    ['七殺', 6],
    ['破軍', 10],
  ];

  const result = new Map<MainStar, EarthlyBranch>();

  for (const [star, delta] of ziWeiSystem) {
    const idx = ((z + delta) % 12 + 12) % 12;
    result.set(star, EARTHLY_BRANCHES[idx]);
  }
  for (const [star, delta] of tianFuSystem) {
    const idx = ((tIdx + delta) % 12 + 12) % 12;
    result.set(star, EARTHLY_BRANCHES[idx]);
  }

  return result;
}

/**
 * Brightness lookup table — per-star × per-branch.
 *
 * Source: 紫雲《紫微斗數導讀》appendix B pages 312-318.
 *
 * Levels (high to low): 廟 > 旺 > 得地 > 利益 > 平和 > 不得地 > 陷
 *
 * NOTE: Different schools assign slightly different brightness; this is the
 * standard 紫雲派 table. The corpus tests will surface any disagreements.
 */
const BRIGHTNESS: Record<MainStar, Partial<Record<EarthlyBranch, StarBrightness>>> = {
  紫微: { 子: '平和', 丑: '廟', 寅: '廟', 卯: '旺', 辰: '陷', 巳: '旺', 午: '廟', 未: '廟', 申: '旺', 酉: '平和', 戌: '陷', 亥: '旺' },
  天機: { 子: '廟', 丑: '陷', 寅: '旺', 卯: '廟', 辰: '利益', 巳: '平和', 午: '廟', 未: '陷', 申: '得地', 酉: '平和', 戌: '利益', 亥: '平和' },
  太陽: { 子: '陷', 丑: '不得地', 寅: '旺', 卯: '廟', 辰: '旺', 巳: '廟', 午: '廟', 未: '得地', 申: '得地', 酉: '平和', 戌: '不得地', 亥: '陷' },
  武曲: { 子: '旺', 丑: '廟', 寅: '得地', 卯: '利益', 辰: '廟', 巳: '平和', 午: '旺', 未: '廟', 申: '得地', 酉: '利益', 戌: '廟', 亥: '平和' },
  天同: { 子: '旺', 丑: '不得地', 寅: '利益', 卯: '廟', 辰: '平和', 巳: '廟', 午: '陷', 未: '不得地', 申: '旺', 酉: '利益', 戌: '平和', 亥: '廟' },
  廉貞: { 子: '平和', 丑: '利益', 寅: '廟', 卯: '平和', 辰: '利益', 巳: '陷', 午: '平和', 未: '利益', 申: '廟', 酉: '平和', 戌: '利益', 亥: '陷' },
  天府: { 子: '廟', 丑: '廟', 寅: '廟', 卯: '得地', 辰: '廟', 巳: '得地', 午: '廟', 未: '廟', 申: '得地', 酉: '平和', 戌: '廟', 亥: '得地' },
  太陰: { 子: '廟', 丑: '廟', 寅: '陷', 卯: '陷', 辰: '陷', 巳: '陷', 午: '陷', 未: '不得地', 申: '旺', 酉: '旺', 戌: '廟', 亥: '廟' },
  貪狼: { 子: '旺', 丑: '廟', 寅: '平和', 卯: '利益', 辰: '廟', 巳: '陷', 午: '旺', 未: '廟', 申: '平和', 酉: '利益', 戌: '廟', 亥: '陷' },
  巨門: { 子: '旺', 丑: '不得地', 寅: '廟', 卯: '廟', 辰: '平和', 巳: '旺', 午: '旺', 未: '不得地', 申: '廟', 酉: '廟', 戌: '平和', 亥: '旺' },
  天相: { 子: '廟', 丑: '廟', 寅: '廟', 卯: '陷', 辰: '得地', 巳: '平和', 午: '廟', 未: '廟', 申: '廟', 酉: '陷', 戌: '得地', 亥: '平和' },
  天梁: { 子: '廟', 丑: '旺', 寅: '廟', 卯: '廟', 辰: '廟', 巳: '陷', 午: '廟', 未: '旺', 申: '陷', 酉: '利益', 戌: '廟', 亥: '陷' },
  七殺: { 子: '旺', 丑: '廟', 寅: '廟', 卯: '陷', 辰: '廟', 巳: '平和', 午: '旺', 未: '廟', 申: '廟', 酉: '陷', 戌: '廟', 亥: '平和' },
  破軍: { 子: '廟', 丑: '旺', 寅: '陷', 卯: '陷', 辰: '旺', 巳: '陷', 午: '廟', 未: '旺', 申: '陷', 酉: '陷', 戌: '旺', 亥: '陷' },
};

export function brightnessOf(star: MainStar, branch: EarthlyBranch): StarBrightness | undefined {
  return BRIGHTNESS[star]?.[branch];
}

export { MAIN_STARS };
