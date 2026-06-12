/**
 * Public types for @ziwei/engine.
 * Pure data — no I/O, no React, no SDK references.
 */

export type Gender = 'M' | 'F';
export type CalendarType = 'solar' | 'lunar';

export interface BirthInfo {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;  // 0-23
  minute: number; // 0-59
  gender: Gender;
  calendar: CalendarType;
  /** Only meaningful with calendar='lunar': the month is a 閏月 (leap month). */
  isLeapMonth?: boolean;
  /** Optional timezone offset in minutes (default: HKT +480). */
  tzOffsetMinutes?: number;
  /** Birthplace latitude, north-positive degrees. Only used by the 果老 engine (default: Hong Kong 22.32). */
  latitude?: number;
  /** Birthplace longitude, east-positive degrees. Only used by the 果老 engine (default: Hong Kong 114.17). */
  longitude?: number;
  /**
   * Convert clock time to apparent solar time (真太陽時) before deriving the
   * hour/day pillars (uses longitude + equation of time). Opt-in: existing
   * cached charts were computed from clock time, and the flag is folded into
   * the chart hashes.
   */
  trueSolarTime?: boolean;
}

export type HeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type EarthlyBranch =
  | '子' | '丑' | '寅' | '卯' | '辰' | '巳'
  | '午' | '未' | '申' | '酉' | '戌' | '亥';

export const HEAVENLY_STEMS: readonly HeavenlyStem[] = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
] as const;

export const EARTHLY_BRANCHES: readonly EarthlyBranch[] = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const;

export const PALACE_NAMES = [
  '命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄',
  '遷移', '交友', '官祿', '田宅', '福德', '父母',
] as const;
export type PalaceName = (typeof PALACE_NAMES)[number];

export const MAIN_STARS = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
] as const;
export type MainStar = (typeof MAIN_STARS)[number];

export const AUX_STARS = ['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞'] as const;
export type AuxStar = (typeof AUX_STARS)[number];

export const FOUR_MALEFICS = ['擎羊', '陀羅', '火星', '鈴星'] as const;
export type Malefic = (typeof FOUR_MALEFICS)[number];

/** 祿存/天馬 (吉) and 地空/地劫 (凶) — placed alongside aux + malefic stars. */
export const EXTRA_STARS = ['祿存', '天馬', '地空', '地劫'] as const;
export type ExtraStar = (typeof EXTRA_STARS)[number];

/** All 煞星 the alert rules key on. */
export const ALL_MALEFICS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'] as const;

/** 雜曜 — marriage/桃花-relevant adjective stars (engine ≥0.6). */
export const ADJECTIVE_STARS = ['紅鸞', '天喜', '天姚', '天刑', '咸池'] as const;
export type AdjectiveStar = (typeof ADJECTIVE_STARS)[number];

export type StarName = MainStar | AuxStar | Malefic | ExtraStar | AdjectiveStar;

export type StarBrightness = '廟' | '旺' | '得地' | '利益' | '平和' | '不得地' | '陷';

export type Transformation = '祿' | '權' | '科' | '忌';

export interface PlacedStar {
  name: StarName;
  brightness?: StarBrightness;
  transformation?: Transformation;
}

export interface Palace {
  name: PalaceName;
  branch: EarthlyBranch;
  ganzhi: `${HeavenlyStem}${EarthlyBranch}`;
  stars: PlacedStar[];
  isMingong: boolean;
  isShenGong: boolean;
}

export interface FiveElementsBureau {
  bureau: '水二局' | '木三局' | '金四局' | '土五局' | '火六局';
  num: 2 | 3 | 4 | 5 | 6;
}

/** One 大限 decade: ages are 虛歲 (inclusive), stem comes from the natal palace it sits on. */
export interface DecadeLuck {
  /** 1-based decade index. */
  index: number;
  startAge: number;
  endAge: number;
  palaceName: PalaceName;
  branch: EarthlyBranch;
  stem: HeavenlyStem;
  /** 大限四化 from this decade's palace stem. */
  transformations: Record<Transformation, string>;
}

export interface Chart {
  engineVersion: string;
  birthInfo: BirthInfo;
  solarDate: { year: number; month: number; day: number; hour: number; minute: number };
  lunarDate: { year: number; month: number; day: number; isLeap: boolean };
  yearGanzhi: `${HeavenlyStem}${EarthlyBranch}`;
  bureau: FiveElementsBureau;
  palaces: Palace[]; // length 12, in canonical order starting from 命宮
  /** 大限 decades (12, covering ~120 years). Optional: absent on charts cached by engine <0.4. */
  decades?: DecadeLuck[];
  /** 命主 star (by 命宮 branch). Optional: absent on charts cached by engine <0.5. */
  mingLord?: string;
  /** 身主 star (by 生年支). Optional: absent on charts cached by engine <0.5. */
  shenLord?: string;
}
