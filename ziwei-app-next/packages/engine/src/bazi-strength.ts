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

/**
 * 調候用神表 (《窮通寶鑑》) — day master × month branch → climate-adjustment
 * stems, primary first. This is the canonical 10×12 lookup widely reproduced
 * in practitioner literature (and encoded in e.g. china-testing/bazi); the
 * primary stem's element overrides/modulates the strength-derived 用神 in
 * extreme-climate charts.
 */
export const TIAOHOU: Record<HeavenlyStem, Record<EarthlyBranch, { primary: HeavenlyStem; secondary: HeavenlyStem[] }>> = {
  甲: {
    寅: { primary: '丙', secondary: ['癸'] }, 卯: { primary: '庚', secondary: ['戊', '己'] },
    辰: { primary: '庚', secondary: ['丁', '壬'] }, 巳: { primary: '癸', secondary: ['庚', '丁'] },
    午: { primary: '癸', secondary: ['庚', '丁'] }, 未: { primary: '癸', secondary: ['庚', '丁'] },
    申: { primary: '庚', secondary: ['丁', '壬'] }, 酉: { primary: '庚', secondary: ['丁', '丙'] },
    戌: { primary: '庚', secondary: ['甲', '丁', '壬', '癸'] }, 亥: { primary: '庚', secondary: ['丁', '戊', '丙'] },
    子: { primary: '丁', secondary: ['庚', '丙'] }, 丑: { primary: '丁', secondary: ['庚', '丙'] },
  },
  乙: {
    寅: { primary: '丙', secondary: ['癸'] }, 卯: { primary: '丙', secondary: ['癸'] },
    辰: { primary: '癸', secondary: ['丙', '戊'] }, 巳: { primary: '癸', secondary: [] },
    午: { primary: '癸', secondary: ['丙'] }, 未: { primary: '癸', secondary: ['丙'] },
    申: { primary: '丙', secondary: ['癸', '己'] }, 酉: { primary: '癸', secondary: ['丙', '丁'] },
    戌: { primary: '癸', secondary: ['辛'] }, 亥: { primary: '丙', secondary: ['戊'] },
    子: { primary: '丙', secondary: [] }, 丑: { primary: '丙', secondary: [] },
  },
  丙: {
    寅: { primary: '壬', secondary: ['庚'] }, 卯: { primary: '壬', secondary: ['己'] },
    辰: { primary: '壬', secondary: ['甲'] }, 巳: { primary: '壬', secondary: ['庚', '癸'] },
    午: { primary: '壬', secondary: ['庚'] }, 未: { primary: '壬', secondary: ['庚'] },
    申: { primary: '壬', secondary: ['戊'] }, 酉: { primary: '壬', secondary: ['癸'] },
    戌: { primary: '甲', secondary: ['壬'] }, 亥: { primary: '甲', secondary: ['戊', '庚', '壬'] },
    子: { primary: '壬', secondary: ['戊', '己'] }, 丑: { primary: '壬', secondary: ['甲'] },
  },
  丁: {
    寅: { primary: '甲', secondary: ['庚'] }, 卯: { primary: '庚', secondary: ['甲'] },
    辰: { primary: '甲', secondary: ['庚'] }, 巳: { primary: '甲', secondary: ['庚'] },
    午: { primary: '壬', secondary: ['庚', '癸'] }, 未: { primary: '甲', secondary: ['壬', '庚'] },
    申: { primary: '甲', secondary: ['庚', '丙', '戊'] }, 酉: { primary: '甲', secondary: ['庚', '丙', '戊'] },
    戌: { primary: '甲', secondary: ['庚', '戊'] }, 亥: { primary: '甲', secondary: ['庚'] },
    子: { primary: '甲', secondary: ['庚'] }, 丑: { primary: '甲', secondary: ['庚'] },
  },
  戊: {
    寅: { primary: '丙', secondary: ['甲', '癸'] }, 卯: { primary: '丙', secondary: ['甲', '癸'] },
    辰: { primary: '甲', secondary: ['丙', '癸'] }, 巳: { primary: '甲', secondary: ['丙', '癸'] },
    午: { primary: '壬', secondary: ['甲', '丙'] }, 未: { primary: '癸', secondary: ['丙', '甲'] },
    申: { primary: '丙', secondary: ['癸', '甲'] }, 酉: { primary: '丙', secondary: ['癸'] },
    戌: { primary: '甲', secondary: ['丙', '癸'] }, 亥: { primary: '甲', secondary: ['丙'] },
    子: { primary: '丙', secondary: ['甲'] }, 丑: { primary: '丙', secondary: ['甲'] },
  },
  己: {
    寅: { primary: '丙', secondary: ['庚', '甲'] }, 卯: { primary: '甲', secondary: ['癸', '丙'] },
    辰: { primary: '丙', secondary: ['癸', '甲'] }, 巳: { primary: '癸', secondary: ['丙'] },
    午: { primary: '癸', secondary: ['丙'] }, 未: { primary: '癸', secondary: ['丙'] },
    申: { primary: '丙', secondary: ['癸'] }, 酉: { primary: '丙', secondary: ['癸'] },
    戌: { primary: '甲', secondary: ['丙', '癸'] }, 亥: { primary: '丙', secondary: ['甲', '戊'] },
    子: { primary: '丙', secondary: ['甲', '戊'] }, 丑: { primary: '丙', secondary: ['甲', '戊'] },
  },
  庚: {
    寅: { primary: '戊', secondary: ['甲', '壬', '丙', '丁'] }, 卯: { primary: '丁', secondary: ['甲', '庚', '丙'] },
    辰: { primary: '甲', secondary: ['丁', '壬', '癸'] }, 巳: { primary: '壬', secondary: ['戊', '丙', '丁'] },
    午: { primary: '壬', secondary: ['癸'] }, 未: { primary: '丁', secondary: ['甲'] },
    申: { primary: '丁', secondary: ['甲'] }, 酉: { primary: '丁', secondary: ['甲', '丙'] },
    戌: { primary: '甲', secondary: ['壬'] }, 亥: { primary: '丁', secondary: ['丙'] },
    子: { primary: '丁', secondary: ['甲', '丙'] }, 丑: { primary: '丙', secondary: ['丁', '甲'] },
  },
  辛: {
    寅: { primary: '己', secondary: ['壬', '庚'] }, 卯: { primary: '壬', secondary: ['甲'] },
    辰: { primary: '壬', secondary: ['甲'] }, 巳: { primary: '壬', secondary: ['甲', '癸'] },
    午: { primary: '壬', secondary: ['己', '癸'] }, 未: { primary: '壬', secondary: ['庚', '甲'] },
    申: { primary: '壬', secondary: ['甲', '戊'] }, 酉: { primary: '壬', secondary: ['甲'] },
    戌: { primary: '壬', secondary: ['甲'] }, 亥: { primary: '壬', secondary: ['丙'] },
    子: { primary: '丙', secondary: ['戊', '壬', '甲'] }, 丑: { primary: '丙', secondary: ['壬', '戊', '己'] },
  },
  壬: {
    寅: { primary: '庚', secondary: ['丙', '戊'] }, 卯: { primary: '戊', secondary: ['辛', '庚'] },
    辰: { primary: '甲', secondary: ['庚'] }, 巳: { primary: '壬', secondary: ['辛', '庚', '癸'] },
    午: { primary: '癸', secondary: ['庚', '辛'] }, 未: { primary: '辛', secondary: ['甲'] },
    申: { primary: '戊', secondary: ['丁'] }, 酉: { primary: '甲', secondary: ['庚'] },
    戌: { primary: '甲', secondary: ['丙'] }, 亥: { primary: '戊', secondary: ['丙', '庚'] },
    子: { primary: '戊', secondary: ['丙'] }, 丑: { primary: '丙', secondary: ['丁', '甲'] },
  },
  癸: {
    寅: { primary: '辛', secondary: ['丙'] }, 卯: { primary: '庚', secondary: ['辛'] },
    辰: { primary: '丙', secondary: ['辛', '甲'] }, 巳: { primary: '辛', secondary: [] },
    午: { primary: '庚', secondary: ['辛', '壬', '癸'] }, 未: { primary: '庚', secondary: ['辛', '壬', '癸'] },
    申: { primary: '丁', secondary: [] }, 酉: { primary: '辛', secondary: ['丙'] },
    戌: { primary: '辛', secondary: ['甲', '壬', '癸'] }, 亥: { primary: '庚', secondary: ['辛', '戊', '丁'] },
    子: { primary: '丙', secondary: ['辛'] }, 丑: { primary: '丙', secondary: ['丁'] },
  },
};

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
  /** 調候用神 from the full 窮通寶鑑 table (primary stem + element + backups). */
  climateAdjustment: { element: WuXing; reason: string; primaryStem?: HeavenlyStem; secondaryStems?: HeavenlyStem[] } | null;
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

  // 調候 — full 窮通寶鑑 table lookup (day master × month branch).
  // (Previously a simplified winter→火 / summer→水 rule.)
  const th = TIAOHOU[day.stem][month.branch];
  const climateAdjustment: BaziStrength['climateAdjustment'] = {
    element: STEM_TO_ELEMENT[th.primary],
    primaryStem: th.primary,
    secondaryStems: th.secondary,
    reason: `窮通寶鑑調候: ${day.stem}日主生於${month.branch}月，先取${th.primary}${th.secondary.length ? `，次取${th.secondary.join('、')}` : ''}`,
  };

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
