import type { EarthlyBranch, HeavenlyStem } from './types';
import { STEM_TO_ELEMENT, type BaziChart, type WuXing } from './bazi';

/**
 * 日主強弱 (day-master strength) scoring — the prerequisite for 用神 selection
 * that the previous engine skipped entirely (it only counted raw 五行).
 *
 * Method (classical 三要素, made numeric so the output is auditable):
 *  - 得令: day master's seasonal state vs the month branch (旺相休囚死)
 *  - 得地: roots (通根) — hidden stems of any branch matching the day master's element
 *  - 得勢: weighted support (印 + 比劫) vs drain (食傷 + 財 + 官殺) across the
 *    other 7 positions, hidden stems weighted by 藏干 share, month branch ×1.5
 *
 * Verdict bands use the support ratio; an extreme ratio with no root flags a
 * 從格 (follower structure) candidate, which inverts 用神 selection.
 */

/** 藏干 — hidden stems per branch with classical 本氣/中氣/餘氣 weights (sums to 1). */
export const HIDDEN_STEMS: Record<EarthlyBranch, Array<{ stem: HeavenlyStem; weight: number }>> = {
  子: [{ stem: '癸', weight: 1 }],
  丑: [{ stem: '己', weight: 0.6 }, { stem: '癸', weight: 0.3 }, { stem: '辛', weight: 0.1 }],
  寅: [{ stem: '甲', weight: 0.6 }, { stem: '丙', weight: 0.3 }, { stem: '戊', weight: 0.1 }],
  卯: [{ stem: '乙', weight: 1 }],
  辰: [{ stem: '戊', weight: 0.6 }, { stem: '乙', weight: 0.3 }, { stem: '癸', weight: 0.1 }],
  巳: [{ stem: '丙', weight: 0.6 }, { stem: '庚', weight: 0.3 }, { stem: '戊', weight: 0.1 }],
  午: [{ stem: '丁', weight: 0.7 }, { stem: '己', weight: 0.3 }],
  未: [{ stem: '己', weight: 0.6 }, { stem: '丁', weight: 0.3 }, { stem: '乙', weight: 0.1 }],
  申: [{ stem: '庚', weight: 0.6 }, { stem: '壬', weight: 0.3 }, { stem: '戊', weight: 0.1 }],
  酉: [{ stem: '辛', weight: 1 }],
  戌: [{ stem: '戊', weight: 0.6 }, { stem: '辛', weight: 0.3 }, { stem: '丁', weight: 0.1 }],
  亥: [{ stem: '壬', weight: 0.7 }, { stem: '甲', weight: 0.3 }],
};

/** 生 cycle: 木→火→土→金→水→木. */
const GENERATES: Record<WuXing, WuXing> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** 剋 cycle: 木→土→水→火→金→木. */
const CONTROLS: Record<WuXing, WuXing> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

export type SeasonalState = '旺' | '相' | '休' | '囚' | '死';

/** 旺相休囚死 — day-master element vs the month branch's 本氣 element. */
export function seasonalState(dayElement: WuXing, monthBranch: EarthlyBranch): SeasonalState {
  const season = HIDDEN_STEMS[monthBranch][0].stem;
  const seasonEl = STEM_TO_ELEMENT[season];
  if (seasonEl === dayElement) return '旺';
  if (GENERATES[seasonEl] === dayElement) return '相';
  if (GENERATES[dayElement] === seasonEl) return '休';
  if (CONTROLS[dayElement] === seasonEl) return '囚';
  return '死';
}

export type StrengthVerdict = '強' | '偏強' | '中和' | '偏弱' | '弱';

export interface BaziStrength {
  verdict: StrengthVerdict;
  /** support / (support + drain), 0..1. ~0.5 is balanced. */
  supportRatio: number;
  seasonalState: SeasonalState;
  /** 得令 — 旺 or 相 in the birth month. */
  deLing: boolean;
  /** 得地 — number of branches whose hidden stems root the day master's element. */
  roots: number;
  deDi: boolean;
  /** 得勢 — support score from the other stems/branches clears the drain score. */
  deShi: boolean;
  /** 從格 candidate: virtually no support and rootless — reading inverts. */
  followerCandidate: '從強' | '從弱' | null;
  /** 喜用神 — elements that help, given the verdict (or follower structure). */
  favorableElements: WuXing[];
  /** 忌神 — elements that harm. */
  unfavorableElements: WuXing[];
  /** 調候 hint for extreme-season charts (simplified 窮通寶鑑 climate rule). */
  climateAdjustment: { element: WuXing; reason: string } | null;
  /** 空亡 — the two void branches of the day pillar's 旬. */
  voidBranches: [EarthlyBranch, EarthlyBranch];
  /** Which natal pillars sit on a void branch. */
  voidPillars: Array<'year' | 'month' | 'hour'>;
}

const STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 旬空 — the two branches left uncovered by the day pillar's 旬 (decade of 60). */
export function voidBranchesOfDayPillar(dayStem: HeavenlyStem, dayBranch: EarthlyBranch): [EarthlyBranch, EarthlyBranch] {
  const s = STEMS.indexOf(dayStem);
  const b = BRANCHES.indexOf(dayBranch);
  // 甲子旬→戌亥, 甲戌旬→申酉, … each 旬 starts where stem index 0 aligns.
  const xunStartBranch = ((b - s) % 12 + 12) % 12;
  const v1 = (xunStartBranch + 10) % 12;
  return [BRANCHES[v1], BRANCHES[(v1 + 1) % 12]];
}

function isSupport(el: WuXing, dayEl: WuXing): boolean {
  return el === dayEl || GENERATES[el] === dayEl; // 比劫 + 印
}

export function analyzeBaziStrength(chart: BaziChart): BaziStrength {
  const dayEl = chart.dayMasterElement;
  const { year, month, day, hour } = chart.pillars;

  const state = seasonalState(dayEl, month.branch);
  const deLing = state === '旺' || state === '相';

  let support = 0;
  let drain = 0;
  let roots = 0;

  const addStem = (stem: HeavenlyStem, weight: number) => {
    const el = STEM_TO_ELEMENT[stem];
    if (isSupport(el, dayEl)) support += weight;
    else drain += weight;
  };

  // Visible stems (the day master itself is the subject, not a vote).
  addStem(year.stem, 1);
  addStem(month.stem, 1);
  addStem(hour.stem, 1);

  // Branches via hidden stems; the month branch (月令) carries extra weight.
  const branchSlots: Array<{ branch: EarthlyBranch; mult: number }> = [
    { branch: year.branch, mult: 1 },
    { branch: month.branch, mult: 1.5 },
    { branch: day.branch, mult: 1 },
    { branch: hour.branch, mult: 1 },
  ];
  for (const { branch, mult } of branchSlots) {
    let rooted = false;
    for (const h of HIDDEN_STEMS[branch]) {
      addStem(h.stem, h.weight * mult);
      if (STEM_TO_ELEMENT[h.stem] === dayEl) rooted = true;
    }
    if (rooted) roots += 1;
  }

  const total = support + drain;
  const ratio = total > 0 ? support / total : 0.5;
  const deDi = roots > 0;
  const deShi = support >= drain;

  let verdict: StrengthVerdict;
  if (ratio >= 0.7) verdict = '強';
  else if (ratio >= 0.55) verdict = '偏強';
  else if (ratio >= 0.45) verdict = '中和';
  else if (ratio >= 0.3) verdict = '偏弱';
  else verdict = '弱';
  // 得令 tips a borderline chart: a day master in season rarely reads weak.
  if (deLing && verdict === '偏弱') verdict = '中和';
  if (!deLing && verdict === '偏強' && !deDi) verdict = '中和';

  let followerCandidate: BaziStrength['followerCandidate'] = null;
  if (ratio >= 0.85 && deLing) followerCandidate = '從強';
  else if (ratio <= 0.12 && !deDi && !deLing) followerCandidate = '從弱';

  const producedBy = (Object.keys(GENERATES) as WuXing[]).find((e) => GENERATES[e] === dayEl)!;
  const controls = CONTROLS[dayEl];
  const controlledBy = (Object.keys(CONTROLS) as WuXing[]).find((e) => CONTROLS[e] === dayEl)!;
  const produces = GENERATES[dayEl];

  let favorable: WuXing[];
  let unfavorable: WuXing[];
  if (followerCandidate === '從弱') {
    // Follow the dominant force: feeding the day master fights the structure.
    favorable = [produces, controls, controlledBy];
    unfavorable = [dayEl, producedBy];
  } else if (followerCandidate === '從強' || verdict === '強' || verdict === '偏強') {
    favorable = [produces, controls, controlledBy]; // 食傷洩秀, 財耗, 官殺剋
    unfavorable = [producedBy, dayEl];
    if (followerCandidate === '從強') {
      favorable = [dayEl, producedBy];
      unfavorable = [controlledBy, controls];
    }
  } else if (verdict === '弱' || verdict === '偏弱') {
    favorable = [producedBy, dayEl]; // 印生, 比劫幫身
    unfavorable = [controlledBy, produces, controls];
  } else {
    favorable = [producedBy, dayEl];
    unfavorable = [controlledBy];
  }

  // Simplified 調候: deep winter wants 火, high summer wants 水 — regardless of strength.
  let climateAdjustment: BaziStrength['climateAdjustment'] = null;
  if (['亥', '子', '丑'].includes(month.branch)) {
    climateAdjustment = { element: '火', reason: '生於冬月，寒氣當令，先取火調候暖局' };
  } else if (['巳', '午', '未'].includes(month.branch)) {
    climateAdjustment = { element: '水', reason: '生於夏月，火炎土燥，先取水調候潤局' };
  }

  const voidBranches = voidBranchesOfDayPillar(day.stem, day.branch);
  const voidPillars: BaziStrength['voidPillars'] = [];
  if (voidBranches.includes(year.branch)) voidPillars.push('year');
  if (voidBranches.includes(month.branch)) voidPillars.push('month');
  if (voidBranches.includes(hour.branch)) voidPillars.push('hour');

  return {
    verdict,
    supportRatio: Math.round(ratio * 1000) / 1000,
    seasonalState: state,
    deLing,
    roots,
    deDi,
    deShi,
    followerCandidate,
    favorableElements: favorable,
    unfavorableElements: unfavorable,
    climateAdjustment,
    voidBranches,
    voidPillars,
  };
}
