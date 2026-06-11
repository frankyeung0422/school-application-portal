import {
  EARTHLY_BRANCHES,
  type DecadeLuck,
  type Gender,
  type HeavenlyStem,
  type Palace,
} from './types';
import { FOUR_TRANSFORMATIONS } from './transformations';

/**
 * 大限 (decade luck) — starts at 命宮 with 虛歲 = 五行局數, each palace rules
 * ten years.
 *
 * Direction: 陽男陰女順行 (second decade in 父母宮, branch index +1),
 * 陰男陽女逆行 (second decade in 兄弟宮, branch index -1).
 * 陽年 = year stem 甲丙戊庚壬.
 *
 * Each decade carries the natal palace's stem (五虎遁), which drives the
 * 大限四化 — the layer practitioners read against 生年四化 for timing.
 */

const YANG_STEMS: ReadonlySet<HeavenlyStem> = new Set(['甲', '丙', '戊', '庚', '壬']);

export function computeDecadeLuck(
  palaces: Palace[],
  yearStem: HeavenlyStem,
  gender: Gender,
  bureauNum: number,
): DecadeLuck[] {
  const mingong = palaces.find((p) => p.isMingong);
  if (!mingong) throw new Error('chart has no 命宮');

  const isYangYear = YANG_STEMS.has(yearStem);
  const forward = (isYangYear && gender === 'M') || (!isYangYear && gender === 'F');
  const dir = forward ? 1 : -1;

  const byBranchIdx = new Map<number, Palace>();
  for (const p of palaces) byBranchIdx.set(EARTHLY_BRANCHES.indexOf(p.branch), p);

  const startIdx = EARTHLY_BRANCHES.indexOf(mingong.branch);
  const decades: DecadeLuck[] = [];
  for (let i = 0; i < 12; i++) {
    const idx = ((startIdx + dir * i) % 12 + 12) % 12;
    const palace = byBranchIdx.get(idx);
    if (!palace) continue;
    const stem = palace.ganzhi[0] as HeavenlyStem;
    decades.push({
      index: i + 1,
      startAge: bureauNum + i * 10,
      endAge: bureauNum + i * 10 + 9,
      palaceName: palace.name,
      branch: palace.branch,
      stem,
      transformations: { ...FOUR_TRANSFORMATIONS[stem] },
    });
  }
  return decades;
}

/** The decade active at a given 虛歲 (East Asian age: birth year counts as 1). */
export function decadeAtAge(decades: DecadeLuck[], age: number): DecadeLuck | undefined {
  return decades.find((d) => age >= d.startAge && age <= d.endAge);
}

/** The decade active in a given Gregorian year. 虛歲 = year - birthYear + 1. */
export function decadeAtYear(
  decades: DecadeLuck[],
  birthYear: number,
  year: number,
): DecadeLuck | undefined {
  return decadeAtAge(decades, year - birthYear + 1);
}
