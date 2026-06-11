import { HeavenlyStem, EarthlyBranch, FiveElementsBureau } from './types';

/**
 * 五行局 (Five Elements Bureau) calculation.
 *
 * Rule: derived from the 命宮 stem+branch via 納音五行 (sound-of-nature) lookup.
 * The 60-jiazi cycle maps each stem+branch combo to one of five elements;
 * we collapse those into the 5 ziwei bureau categories.
 *
 * Source: 紫雲《紫微斗數導讀》ch.4 page 51.
 * Standard 紫雲派 table.
 */

// 納音五行 table — sound-of-nature element for each 60-jiazi combo.
// Each pair of consecutive ganzhi share the same nayin element.
// Reference: standard 60 甲子納音五行 chart.
const NAYIN_TABLE: Record<string, 'water' | 'wood' | 'metal' | 'earth' | 'fire'> = {
  甲子: 'metal', 乙丑: 'metal', 丙寅: 'fire', 丁卯: 'fire', 戊辰: 'wood', 己巳: 'wood',
  庚午: 'earth', 辛未: 'earth', 壬申: 'metal', 癸酉: 'metal', 甲戌: 'fire', 乙亥: 'fire',
  丙子: 'water', 丁丑: 'water', 戊寅: 'earth', 己卯: 'earth', 庚辰: 'metal', 辛巳: 'metal',
  壬午: 'wood', 癸未: 'wood', 甲申: 'water', 乙酉: 'water', 丙戌: 'earth', 丁亥: 'earth',
  戊子: 'fire', 己丑: 'fire', 庚寅: 'wood', 辛卯: 'wood', 壬辰: 'water', 癸巳: 'water',
  甲午: 'metal', 乙未: 'metal', 丙申: 'fire', 丁酉: 'fire', 戊戌: 'wood', 己亥: 'wood',
  庚子: 'earth', 辛丑: 'earth', 壬寅: 'metal', 癸卯: 'metal', 甲辰: 'fire', 乙巳: 'fire',
  丙午: 'water', 丁未: 'water', 戊申: 'earth', 己酉: 'earth', 庚戌: 'metal', 辛亥: 'metal',
  壬子: 'wood', 癸丑: 'wood', 甲寅: 'water', 乙卯: 'water', 丙辰: 'earth', 丁巳: 'earth',
  戊午: 'fire', 己未: 'fire', 庚申: 'wood', 辛酉: 'wood', 壬戌: 'water', 癸亥: 'water',
};

const ELEMENT_TO_BUREAU: Record<string, FiveElementsBureau> = {
  water: { bureau: '水二局', num: 2 },
  wood:  { bureau: '木三局', num: 3 },
  metal: { bureau: '金四局', num: 4 },
  earth: { bureau: '土五局', num: 5 },
  fire:  { bureau: '火六局', num: 6 },
};

/**
 * Compute 五行局 from the 命宮 stem + branch.
 */
export function bureauFromMingong(
  stem: HeavenlyStem,
  branch: EarthlyBranch,
): FiveElementsBureau {
  const key = `${stem}${branch}`;
  const element = NAYIN_TABLE[key];
  if (!element) throw new Error(`Unknown nayin for ${key}`);
  return ELEMENT_TO_BUREAU[element];
}
