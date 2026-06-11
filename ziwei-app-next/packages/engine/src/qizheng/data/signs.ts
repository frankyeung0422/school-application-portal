/**
 * 十二宮 / 十二次 reference, ordered by sidereal sign index
 * (index 0 = 白羊, which starts at sidereal longitude 0°).
 *
 * Each sign carries its 西洋名, its 十二次 classical name, the 地支 the 次 maps to,
 * and its domicile ruler (used for 命主星 / 身主星 and dignity). The 次↔支↔sign
 * identification follows the standard Jesuit-era 欽天監 alignment; see
 * docs/qizheng-research.md §1/§4.
 */
import type { Governor, SignInfo } from '../types';

export const SIGNS: readonly SignInfo[] = [
  { sign: '白羊', ci: '降婁', branch: '戌', ruler: '火' }, // 0  Aries
  { sign: '金牛', ci: '大梁', branch: '酉', ruler: '金' }, // 1  Taurus
  { sign: '雙子', ci: '實沈', branch: '申', ruler: '水' }, // 2  Gemini
  { sign: '巨蟹', ci: '鶉首', branch: '未', ruler: '月' }, // 3  Cancer
  { sign: '獅子', ci: '鶉火', branch: '午', ruler: '日' }, // 4  Leo
  { sign: '處女', ci: '鶉尾', branch: '巳', ruler: '水' }, // 5  Virgo
  { sign: '天秤', ci: '壽星', branch: '辰', ruler: '金' }, // 6  Libra
  { sign: '天蝎', ci: '大火', branch: '卯', ruler: '火' }, // 7  Scorpio
  { sign: '射手', ci: '析木', branch: '寅', ruler: '木' }, // 8  Sagittarius
  { sign: '摩羯', ci: '星紀', branch: '丑', ruler: '土' }, // 9  Capricorn
  { sign: '水瓶', ci: '玄枵', branch: '子', ruler: '土' }, // 10 Aquarius
  { sign: '雙魚', ci: '娵訾', branch: '亥', ruler: '木' }, // 11 Pisces
] as const;

/** Sidereal longitude (0–360) → sign index (0–11). */
export function signIndexOf(lonSidereal: number): number {
  return Math.floor(((lonSidereal % 360) + 360) % 360 / 30);
}

export function signOf(lonSidereal: number): SignInfo {
  return SIGNS[signIndexOf(lonSidereal)];
}

/** Domicile ruler of a sign by index. */
export function rulerOfSign(signIndex: number): Governor {
  return SIGNS[((signIndex % 12) + 12) % 12].ruler;
}
