/**
 * 鐵板神數 (Iron Plate Divine Numbers) — SKELETON.
 *
 * This module computes the verse-set ("條文") for a birth chart per
 * 鐵板神數 conventions. Multiple schools exist (邵偉華, 黃春霖, 紫雲); the
 * engine picks one canonical school and discloses the source on the result
 * page (per plan §F risk mitigation).
 *
 * Full implementation lands in P3 alongside the corpus tests.
 */

import type { BirthInfo } from './types';

export interface IronPlateVerse {
  number: number;
  category: '父母' | '兄弟' | '夫妻' | '子女' | '本人' | '功名' | '財祿' | '壽元';
  text: string; // classical Chinese verse
  interpretation: string; // modern interpretation (added by AI in P4)
}

export interface IronPlateReading {
  school: '邵偉華' | '黃春霖' | '紫雲';
  verses: IronPlateVerse[];
}

export function computeIronPlate(_birth: BirthInfo): IronPlateReading {
  throw new Error('computeIronPlate: not yet implemented — P3');
}
