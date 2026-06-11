import { HeavenlyStem, MainStar, Transformation } from './types';

/**
 * 四化星 (Four Transformations) table.
 * Each year-stem activates 化祿/化權/化科/化忌 on specific stars.
 *
 * Reference: 紫雲《紫微斗數導讀》ch. 9, table 9-1.
 * Standard 紫雲派 table (other schools differ slightly — see RULES.md).
 *
 * This table is canonical for the engine; the calc-audit admin page in P3
 * will let us swap schools per chart for comparison.
 */
export const FOUR_TRANSFORMATIONS: Record<
  HeavenlyStem,
  Record<Transformation, MainStar | '左輔' | '右弼' | '文昌' | '文曲'>
> = {
  甲: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
  乙: { 祿: '天機', 權: '天梁', 科: '紫微', 忌: '太陰' },
  丙: { 祿: '天同', 權: '天機', 科: '文昌', 忌: '廉貞' },
  丁: { 祿: '太陰', 權: '天同', 科: '天機', 忌: '巨門' },
  戊: { 祿: '貪狼', 權: '太陰', 科: '右弼', 忌: '天機' },
  己: { 祿: '武曲', 權: '貪狼', 科: '天梁', 忌: '文曲' },
  庚: { 祿: '太陽', 權: '武曲', 科: '太陰', 忌: '天同' },
  辛: { 祿: '巨門', 權: '太陽', 科: '文曲', 忌: '文昌' },
  壬: { 祿: '天梁', 權: '紫微', 科: '左輔', 忌: '武曲' },
  癸: { 祿: '破軍', 權: '巨門', 科: '太陰', 忌: '貪狼' },
};

export function transformationsForYearStem(stem: HeavenlyStem) {
  return FOUR_TRANSFORMATIONS[stem];
}
