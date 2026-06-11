/**
 * 地支關係 — the canonical 沖/刑/害/合/會 relations between two earthly branches.
 *
 * These tables were previously inlined inside `alerts.ts` (沖/刑/害 only). They
 * are lifted here so both the alert engine and the 流月/流日 flow engine share a
 * single source of truth, and extended with 六合 (合) and 三合 (會) which the
 * period-flow analysis needs.
 *
 * Index convention matches `EARTHLY_BRANCHES`: 子=0, 丑=1, … 亥=11.
 */
import type { EarthlyBranch } from './types';
import { EARTHLY_BRANCHES } from './types';

export type BranchRelation = '沖' | '刑' | '害' | '合' | '會';

const IDX: Record<EarthlyBranch, number> = EARTHLY_BRANCHES.reduce(
  (acc, b, i) => {
    acc[b] = i;
    return acc;
  },
  {} as Record<EarthlyBranch, number>,
);

/** 沖 — branches 6 apart (子午, 丑未, …). */
export const CLASH_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];
/** 刑 — punishment groups (三刑 + 子卯相刑). */
export const PUNISHMENT_GROUPS: ReadonlyArray<readonly number[]> = [
  [2, 5, 8],  // 寅巳申
  [1, 10, 7], // 丑戌未
  [0, 3],     // 子卯
];
/** 自刑 — self-punishment branches (辰午酉亥). */
export const SELF_PUNISHMENT: readonly number[] = [4, 6, 9, 11];
/** 害 — harm pairs. */
export const HARM_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];
/** 六合 — six-harmony pairs (子丑, 寅亥, 卯戌, 辰酉, 巳申, 午未). */
export const SIX_HARMONY: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
/** 三合 — three-harmony bureaus (申子辰水, 寅午戌火, 巳酉丑金, 亥卯未木). */
export const THREE_HARMONY: ReadonlyArray<readonly number[]> = [
  [8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7],
];

export function branchIndex(b: EarthlyBranch): number {
  return IDX[b];
}

/**
 * Strongest relation between two branches, by precedence
 * 沖 > 刑 > 害 > 合(六合) > 會(三合). Returns null if unrelated.
 */
export function branchRelation(a: EarthlyBranch, b: EarthlyBranch): BranchRelation | null {
  const ai = IDX[a];
  const bi = IDX[b];

  for (const [x, y] of CLASH_PAIRS) {
    if ((ai === x && bi === y) || (ai === y && bi === x)) return '沖';
  }
  if (ai === bi && SELF_PUNISHMENT.includes(ai)) return '刑';
  for (const g of PUNISHMENT_GROUPS) {
    if (g.includes(ai) && g.includes(bi) && ai !== bi) return '刑';
  }
  for (const [x, y] of HARM_PAIRS) {
    if ((ai === x && bi === y) || (ai === y && bi === x)) return '害';
  }
  for (const [x, y] of SIX_HARMONY) {
    if ((ai === x && bi === y) || (ai === y && bi === x)) return '合';
  }
  for (const g of THREE_HARMONY) {
    if (g.includes(ai) && g.includes(bi) && ai !== bi) return '會';
  }
  return null;
}
