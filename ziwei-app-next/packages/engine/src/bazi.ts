// @ts-expect-error - lunar-javascript has no types
import { Solar } from 'lunar-javascript';
import type { BirthInfo, HeavenlyStem, EarthlyBranch } from './types';
import { HEAVENLY_STEMS, EARTHLY_BRANCHES } from './types';
import { effectiveBirthMoment } from './solar-time';
import { resolveSolarBirth } from './solar-to-lunar';
import { analyzeBaziStrength, type BaziStrength } from './bazi-strength';
import { computeShenSha, type ShenShaHit } from './bazi-shensha';

/**
 * Bazi (八字) computation. Wraps lunar-javascript's EightChar API and
 * normalises it into typed structures so the rest of the app (server actions,
 * AI prompts, cost ledger) can consume without `any`.
 */

export type WuXing = '木' | '火' | '土' | '金' | '水';
export type TenGod =
  | '比肩' | '劫財' | '食神' | '傷官'
  | '偏財' | '正財' | '七殺' | '正官'
  | '偏印' | '正印';

// lunar-javascript returns 简体 names — normalise to 繁體 so the UI stays consistent.
const TEN_GOD_S2T: Record<string, TenGod> = {
  '比肩': '比肩', '劫财': '劫財', '劫財': '劫財',
  '食神': '食神', '伤官': '傷官', '傷官': '傷官',
  '偏财': '偏財', '偏財': '偏財', '正财': '正財', '正財': '正財',
  '七杀': '七殺', '七殺': '七殺', '正官': '正官',
  '偏印': '偏印', '正印': '正印',
};
function normalizeTenGod(raw: unknown): TenGod | null {
  if (typeof raw !== 'string') return null;
  return TEN_GOD_S2T[raw] ?? null;
}

// 納音 occasionally comes back in 简体 too (e.g. "钗钏金" vs "釵釧金").
// Keep it as-returned for now — display only, not used in logic.

export const STEM_TO_ELEMENT: Record<HeavenlyStem, WuXing> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
};

export const BRANCH_TO_ELEMENT: Record<EarthlyBranch, WuXing> = {
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金',
  亥: '水', 子: '水',
};

export interface BaziPillar {
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  /** 十神 for stem relative to day master. Empty on the day pillar itself (day master = 日主). */
  stemTenGod: TenGod | '日主';
  /** 十神 for each hidden stem (人元) in this branch. 1-3 entries. */
  branchTenGods: TenGod[];
  /** 納音 — three-character description like "海中金". */
  nayin: string;
  /** Pillar's primary element, derived from its stem. */
  element: WuXing;
}

export interface LuckPillar {
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  startAge: number;
  startYear: number;
  endYear: number;
}

export interface BaziChart {
  kind: 'bazi';
  engineVersion: string;
  birthInfo: BirthInfo;
  solarDate: { year: number; month: number; day: number; hour: number; minute: number };
  lunarDate: { year: number; month: number; day: number; isLeap: boolean };
  pillars: {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    hour: BaziPillar;
  };
  dayMaster: HeavenlyStem;
  dayMasterElement: WuXing;
  /** Count of each 五行 across all 4 pillars (stem + branch). */
  fiveElements: Record<WuXing, number>;
  /** Most-numerous and least-numerous 五行 — quick balance hints. */
  dominantElement: WuXing;
  weakestElement: WuXing;
  /** 大運 — typically 8 entries covering ~80 years from startAge. */
  luckPillars: LuckPillar[];
  /** 日主強弱 + 用神 + 空亡 analysis. Optional: absent on charts cached by engine <0.2. */
  strength?: BaziStrength;
  /** Minutes added to clock time when 真太陽時 was applied (0 otherwise). */
  solarTimeCorrectionMinutes?: number;
  /** 神煞 hits. Optional: absent on charts cached by engine <0.3. */
  shenSha?: ShenShaHit[];
  /** 胎元 ganzhi (conception pillar). Optional: engine ≥0.3. */
  taiYuan?: string;
  /** 八字命宮 ganzhi. Optional: engine ≥0.3. */
  mingGong?: string;
}

export const BAZI_ENGINE_VERSION = '0.3.0' as const;

function asStem(s: string): HeavenlyStem {
  if (!HEAVENLY_STEMS.includes(s as HeavenlyStem)) throw new Error(`Bad stem: ${s}`);
  return s as HeavenlyStem;
}
function asBranch(s: string): EarthlyBranch {
  if (!EARTHLY_BRANCHES.includes(s as EarthlyBranch)) throw new Error(`Bad branch: ${s}`);
  return s as EarthlyBranch;
}

export function computeBazi(birth: BirthInfo): BaziChart {
  // Lunar input → solar equivalent (incl. 閏月) first, then 真太陽時 (opt-in)
  // shifts the moment before any pillar derivation.
  const solarBirth = resolveSolarBirth(birth);
  const eff = effectiveBirthMoment(solarBirth);
  const solar = Solar.fromYmdHms(eff.year, eff.month, eff.day, eff.hour, eff.minute, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const dayMaster = asStem(ec.getDayGan());
  const dayMasterElement = STEM_TO_ELEMENT[dayMaster];

  const buildPillar = (
    gz: string,
    stemTenGodRaw: unknown,
    branchTenGodsRaw: unknown,
    nayin: string,
    isDay = false,
  ): BaziPillar => {
    const stem = asStem(gz[0]);
    const branch = asBranch(gz[1]);
    const arr = Array.isArray(branchTenGodsRaw) ? branchTenGodsRaw : [];
    const stemTenGod: TenGod | '日主' = isDay ? '日主' : (normalizeTenGod(stemTenGodRaw) ?? '比肩');
    const branchTenGods = arr
      .map(normalizeTenGod)
      .filter((g): g is TenGod => g !== null);
    return {
      ganzhi: `${stem}${branch}` as BaziPillar['ganzhi'],
      stem, branch,
      stemTenGod,
      branchTenGods,
      nayin,
      element: STEM_TO_ELEMENT[stem],
    };
  };

  const pillars = {
    year: buildPillar(
      ec.getYear(),
      ec.getYearShiShenGan(),
      ec.getYearShiShenZhi(),
      ec.getYearNaYin(),
    ),
    month: buildPillar(
      ec.getMonth(),
      ec.getMonthShiShenGan(),
      ec.getMonthShiShenZhi(),
      ec.getMonthNaYin(),
    ),
    day: buildPillar(
      ec.getDay(),
      null,
      ec.getDayShiShenZhi(),
      ec.getDayNaYin(),
      true,
    ),
    hour: buildPillar(
      ec.getTime(),
      ec.getTimeShiShenGan(),
      ec.getTimeShiShenZhi(),
      ec.getTimeNaYin(),
    ),
  };

  // 5-element tally: each pillar contributes 1 from its stem and 1 from its branch (using primary element).
  const fiveElements: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    fiveElements[STEM_TO_ELEMENT[p.stem]] += 1;
    fiveElements[BRANCH_TO_ELEMENT[p.branch]] += 1;
  }

  // Pick dominant / weakest (deterministic tie-break by canonical order).
  const elementOrder: WuXing[] = ['木', '火', '土', '金', '水'];
  const sorted = [...elementOrder].sort((a, b) => fiveElements[b] - fiveElements[a]);
  const dominantElement = sorted[0];
  const weakestElement = [...elementOrder].sort((a, b) => fiveElements[a] - fiveElements[b])[0];

  // 大運 — lunar-javascript's getYun(gender, sect?). gender: 1=male, 0=female. Sect 1 = 立春換年.
  // Note: getDaYun()[0] is a synthetic pre-period with empty ganzhi — filter it out.
  let luckPillars: LuckPillar[] = [];
  try {
    const yun = ec.getYun(birth.gender === 'M' ? 1 : 0);
    const dayunArr = yun.getDaYun() as unknown[];
    luckPillars = dayunArr
      .map((d: unknown): LuckPillar | null => {
        const row = d as {
          getGanZhi: () => string;
          getStartYear: () => number;
          getEndYear: () => number;
          getStartAge: () => number;
        };
        const gz = row.getGanZhi();
        if (!gz || gz.length < 2) return null;
        return {
          ganzhi: gz as LuckPillar['ganzhi'],
          startAge: row.getStartAge(),
          startYear: row.getStartYear(),
          endYear: row.getEndYear(),
        };
      })
      .filter((p): p is LuckPillar => p !== null)
      .slice(0, 9);
  } catch {
    luckPillars = [];
  }

  const lunarMonth = lunar.getMonth();

  const chart: BaziChart = {
    kind: 'bazi',
    engineVersion: BAZI_ENGINE_VERSION,
    birthInfo: birth,
    solarDate: {
      year: solarBirth.year, month: solarBirth.month, day: solarBirth.day,
      hour: solarBirth.hour, minute: solarBirth.minute,
    },
    lunarDate: {
      year: lunar.getYear(),
      month: Math.abs(lunarMonth),
      day: lunar.getDay(),
      isLeap: lunarMonth < 0,
    },
    pillars,
    dayMaster,
    dayMasterElement,
    fiveElements,
    dominantElement,
    weakestElement,
    luckPillars,
    solarTimeCorrectionMinutes: eff.correctionMinutes,
  };
  chart.strength = analyzeBaziStrength(chart);
  chart.shenSha = computeShenSha(pillars);
  // 胎元/命宮 from lunar-javascript's EightChar (standard 三命通會 rules).
  try {
    chart.taiYuan = ec.getTaiYuan();
    chart.mingGong = ec.getMingGong();
  } catch {
    // older lunar-javascript builds may lack these — fields stay undefined
  }
  return chart;
}

/** Stable hash for cache lookup. Same shape as ziwei chartHash. */
export function baziHash(birth: BirthInfo): string {
  const tst = birth.trueSolarTime ? '-tst' : '';
  const leap = birth.calendar === 'lunar' && birth.isLeapMonth ? '-leap' : '';
  const canonical = `bazi-${birth.year}-${birth.month}-${birth.day}-${birth.hour}-${birth.minute}-${birth.gender}-${birth.calendar}${tst}${leap}`;
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) + h + canonical.charCodeAt(i)) | 0;
  return `b_${(h >>> 0).toString(16)}_${birth.year}${birth.month}${birth.day}`;
}
