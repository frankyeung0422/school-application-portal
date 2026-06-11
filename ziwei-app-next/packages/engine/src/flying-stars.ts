import {
  EARTHLY_BRANCHES,
  type Chart,
  type EarthlyBranch,
  type HeavenlyStem,
  type Palace,
  type PalaceName,
  type PlacedStar,
  type Transformation,
} from './types';
import { FOUR_TRANSFORMATIONS } from './transformations';

/**
 * 飛星四化 — each palace's stem "flies" 祿權科忌 onto the palace where the
 * target star actually sits. This (not the static star catalog) is the main
 * inference layer in 北派/飛星 schools:
 *
 *  - 離心自化: a palace's own stem transforms a star sitting in that palace
 *    (energy leaks out — weakens what the palace promises).
 *  - 向心自化: the OPPOSITE palace's stem transforms a star in this palace
 *    (energy flows in from the opposite axis).
 *  - 飛忌 chains: palace A flies 忌 into palace B — read as A "owing" B.
 *
 * Requires the chart to have 文昌/文曲/左輔/右弼 placed (engine ≥0.4),
 * otherwise the 科/忌 flights that target those stars resolve to null.
 */

export interface PalaceFlight {
  fromPalace: PalaceName;
  fromBranch: EarthlyBranch;
  stem: HeavenlyStem;
  hua: Transformation;
  star: string;
  /** Where the target star sits; null when the star isn't placed in this chart. */
  toPalace: PalaceName | null;
  toBranch: EarthlyBranch | null;
  /** 離心自化 — flies onto its own palace. */
  isSelfOutward: boolean;
}

export interface SelfTransformation {
  palace: PalaceName;
  branch: EarthlyBranch;
  kind: '離心' | '向心';
  hua: Transformation;
  star: string;
}

const HUAS: Transformation[] = ['祿', '權', '科', '忌'];

function starLocation(chart: Chart, star: string): Palace | null {
  for (const p of chart.palaces) {
    if (p.stars.some((s) => s.name === star)) return p;
  }
  return null;
}

/** All 48 flights (12 palaces × 祿權科忌). */
export function computeFlyingStars(chart: Chart): PalaceFlight[] {
  const flights: PalaceFlight[] = [];
  for (const p of chart.palaces) {
    const stem = p.ganzhi[0] as HeavenlyStem;
    const table = FOUR_TRANSFORMATIONS[stem];
    for (const hua of HUAS) {
      const star = table[hua];
      const target = starLocation(chart, star);
      flights.push({
        fromPalace: p.name,
        fromBranch: p.branch,
        stem,
        hua,
        star,
        toPalace: target?.name ?? null,
        toBranch: target?.branch ?? null,
        isSelfOutward: target !== null && target.branch === p.branch,
      });
    }
  }
  return flights;
}

/** 自化 — both 離心 (own stem) and 向心 (opposite palace's stem into this palace). */
export function computeSelfTransformations(chart: Chart): SelfTransformation[] {
  const out: SelfTransformation[] = [];
  const byBranch = new Map<EarthlyBranch, Palace>();
  for (const p of chart.palaces) byBranch.set(p.branch, p);

  for (const p of chart.palaces) {
    const ownTable = FOUR_TRANSFORMATIONS[p.ganzhi[0] as HeavenlyStem];
    const oppositeBranch = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(p.branch) + 6) % 12];
    const opposite = byBranch.get(oppositeBranch);
    const oppTable = opposite ? FOUR_TRANSFORMATIONS[opposite.ganzhi[0] as HeavenlyStem] : null;

    for (const hua of HUAS) {
      if (p.stars.some((s) => s.name === ownTable[hua])) {
        out.push({ palace: p.name, branch: p.branch, kind: '離心', hua, star: ownTable[hua] });
      }
      if (oppTable && p.stars.some((s) => s.name === oppTable[hua])) {
        out.push({ palace: p.name, branch: p.branch, kind: '向心', hua, star: oppTable[hua] });
      }
    }
  }
  return out;
}

// ── 化忌 chain tracing (飛忌連環) ─────────────────────────────────────
//
// 北派 reading: each palace's stem flies 忌 somewhere; following the 忌 from
// palace to palace exposes where a life-domain's pressure ultimately drains.
// Chain endings:
//   自化忌出 — the chain reaches a palace whose own stem 忌s a star in itself
//              (energy exits the chart; classic "leak" signature),
//   回頭忌   — the chain flies back into a palace already on the path (cycle;
//              the loop's palaces feed each other's pressure),
//   入而不出 — next hop's target star is unplaced (only on pre-0.4 charts).

export interface JiChainStep {
  fromPalace: PalaceName;
  stem: HeavenlyStem;
  star: string;
  toPalace: PalaceName;
}

export interface JiChain {
  start: PalaceName;
  steps: JiChainStep[];
  terminal: '自化忌出' | '回頭忌' | '入而不出';
  /** 祿隨忌走 — the start palace's 化祿 flies to the same palace as its 化忌. */
  luFollowsJi: boolean;
  /** Compact Chinese rendering for prompts, e.g. 命宮→夫妻→財帛(回頭忌). */
  text: string;
}

/** Trace the serial 忌 chain starting from every palace. */
export function traceJiChains(chart: Chart): JiChain[] {
  const byName = new Map<PalaceName, Palace>();
  for (const p of chart.palaces) byName.set(p.name, p);

  const jiTargetOf = (p: Palace): { star: string; to: Palace | null } => {
    const star = FOUR_TRANSFORMATIONS[p.ganzhi[0] as HeavenlyStem].忌;
    return { star, to: starLocation(chart, star) };
  };

  return chart.palaces.map((startPalace): JiChain => {
    const steps: JiChainStep[] = [];
    const visited = new Set<PalaceName>([startPalace.name]);
    let current = startPalace;
    let terminal: JiChain['terminal'] = '入而不出';

    for (let depth = 0; depth < 12; depth++) {
      const { star, to } = jiTargetOf(current);
      if (!to) { terminal = '入而不出'; break; }
      steps.push({ fromPalace: current.name, stem: current.ganzhi[0] as HeavenlyStem, star, toPalace: to.name });
      if (to.name === current.name) { terminal = '自化忌出'; break; }
      if (visited.has(to.name)) { terminal = '回頭忌'; break; }
      visited.add(to.name);
      current = to;
    }

    const startTable = FOUR_TRANSFORMATIONS[startPalace.ganzhi[0] as HeavenlyStem];
    const luTarget = starLocation(chart, startTable.祿);
    const luFollowsJi = !!luTarget && steps.length > 0 && luTarget.name === steps[0].toPalace;

    const pathNames = [startPalace.name, ...steps.map((s) => s.toPalace)];
    const text = `${pathNames.join('→')}(${terminal}${luFollowsJi ? '、祿隨忌走' : ''})`;
    return { start: startPalace.name, steps, terminal, luFollowsJi, text };
  });
}

export interface SanFangSiZheng {
  palace: PalaceName;
  /** 本宮 + 對宮 + 兩個三合宮, in that order. */
  group: Palace[];
  /** All stars across the four palaces (本宮 first). */
  stars: PlacedStar[];
}

/** 三方四正 — the palace, its opposite (+6), and the two trines (+4, +8) by branch. */
export function sanFangSiZheng(chart: Chart, palaceName: PalaceName): SanFangSiZheng {
  const base = chart.palaces.find((p) => p.name === palaceName);
  if (!base) throw new Error(`palace not found: ${palaceName}`);
  const byBranch = new Map<EarthlyBranch, Palace>();
  for (const p of chart.palaces) byBranch.set(p.branch, p);

  const baseIdx = EARTHLY_BRANCHES.indexOf(base.branch);
  const group = [base];
  for (const offset of [6, 4, 8]) {
    const p = byBranch.get(EARTHLY_BRANCHES[(baseIdx + offset) % 12]);
    if (p) group.push(p);
  }
  return {
    palace: palaceName,
    group,
    stars: group.flatMap((p) => p.stars),
  };
}
