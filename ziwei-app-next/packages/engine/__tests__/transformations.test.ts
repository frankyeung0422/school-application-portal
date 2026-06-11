import { describe, it, expect } from 'vitest';
import { transformationsForYearStem, FOUR_TRANSFORMATIONS } from '../src/transformations';

describe('FOUR_TRANSFORMATIONS', () => {
  it('has all 10 heavenly stems', () => {
    const stems = Object.keys(FOUR_TRANSFORMATIONS);
    expect(stems).toHaveLength(10);
    expect(stems).toEqual(expect.arrayContaining(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']));
  });

  it('each stem has all four transformations', () => {
    for (const stem of Object.keys(FOUR_TRANSFORMATIONS)) {
      const t = FOUR_TRANSFORMATIONS[stem as keyof typeof FOUR_TRANSFORMATIONS];
      expect(new Set(Object.keys(t))).toEqual(new Set(['祿', '權', '科', '忌']));
    }
  });

  // Reference: 紫雲《紫微斗數導讀》ch.9 table 9-1 page 134
  it.each([
    ['甲', '廉貞', '破軍', '武曲', '太陽'],
    ['乙', '天機', '天梁', '紫微', '太陰'],
    ['丙', '天同', '天機', '文昌', '廉貞'],
    ['丁', '太陰', '天同', '天機', '巨門'],
    ['癸', '破軍', '巨門', '太陰', '貪狼'],
  ])('stem %s: 祿=%s 權=%s 科=%s 忌=%s', (stem, lu, quan, ke, ji) => {
    const t = transformationsForYearStem(stem as any);
    expect(t.祿).toBe(lu);
    expect(t.權).toBe(quan);
    expect(t.科).toBe(ke);
    expect(t.忌).toBe(ji);
  });
});
