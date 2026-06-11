/**
 * Public types for the 果老星宗 / 七政四餘 (QiZheng) engine.
 *
 * Unlike the ziwei (virtual-star) and bazi (ganzhi-calendar) engines, this one
 * is driven by a real ephemeris: it places the actual ecliptic positions of the
 * 七政 (seven governors) + 四餘 (four remainders) onto the 二十八宿 (28 lunar
 * mansions) and 十二宮 (zodiac signs), anchored to the 命度 (rising degree).
 *
 * Pure data — no I/O, no React, no SDK references.
 */
import type { BirthInfo } from '../types';

/** The 十一曜 — 七政 (7 governors) + 四餘 (4 remainders). Single-char canonical names. */
export const SEVEN_GOVERNORS = ['日', '月', '火', '水', '木', '金', '土'] as const;
export type Governor = (typeof SEVEN_GOVERNORS)[number];

export const FOUR_REMAINDERS = ['羅睺', '計都', '月孛', '紫氣'] as const;
export type Remainder = (typeof FOUR_REMAINDERS)[number];

export const ELEVEN_BODIES = [...SEVEN_GOVERNORS, ...FOUR_REMAINDERS] as const;
export type QizhengBodyName = (typeof ELEVEN_BODIES)[number];

/** 二十八宿 in the canonical order, grouped 東蒼龍 / 北玄武 / 西白虎 / 南朱雀. */
export const TWENTY_EIGHT_MANSIONS = [
  '角', '亢', '氐', '房', '心', '尾', '箕', // 東方蒼龍
  '斗', '牛', '女', '虛', '危', '室', '壁', // 北方玄武
  '奎', '婁', '胃', '昴', '畢', '觜', '參', // 西方白虎
  '井', '鬼', '柳', '星', '張', '翼', '軫', // 南方朱雀
] as const;
export type MansionName = (typeof TWENTY_EIGHT_MANSIONS)[number];

/**
 * 十二宮 / 十二次 — the zodiac signs, ordered by sidereal sign index
 * (0 = 白羊 starts at sidereal longitude 0°).
 */
export interface SignInfo {
  /** 西洋名 e.g. 白羊. */
  sign: string;
  /** 十二次 traditional name e.g. 降婁. */
  ci: string;
  /** Earthly branch the 次 maps to e.g. 戌. */
  branch: string;
  /** Domicile ruler (命主 candidate) of this sign. */
  ruler: Governor;
}

/** 廟旺落陷 — planetary dignity in a sign. */
export type Dignity = '廟' | '旺' | '得地' | '平和' | '落' | '陷';

/** A single 曜 placed in the sky. */
export interface PlacedBody {
  name: QizhengBodyName;
  /** Tropical ecliptic longitude of date (degrees, 0–360). */
  lonTropical: number;
  /** Sidereal longitude after subtracting ayanāṃśa (degrees, 0–360). */
  lonSidereal: number;
  /** Mansion (宿) the body falls in. */
  mansion: MansionName;
  /** 入宿度 — degrees into that mansion. */
  degIntoMansion: number;
  /** Sign / 次 the body falls in. */
  sign: string;
  /** Degrees into the sign (0–30). */
  degIntoSign: number;
  /** House number 1–12 (命宮 = 1). */
  house: number;
  /** House name e.g. 命宮. */
  houseName: string;
  /** Retrograde — only meaningful for the 5 visible planets. */
  retrograde: boolean;
  /** Dignity in the sign it occupies. */
  dignity: Dignity;
}

export interface QizhengAscendant {
  lonTropical: number;
  lonSidereal: number;
  sign: string;
  ci: string;
  branch: string;
  mansion: MansionName;
  degIntoMansion: number;
}

export interface QizhengHouse {
  /** 1–12. */
  index: number;
  /** 命宮、財帛… */
  name: string;
  /** The whole sign occupying this house. */
  sign: string;
  branch: string;
  /** Bodies sitting in this house. */
  bodies: QizhengBodyName[];
}

export interface QizhengChart {
  kind: 'qizheng';
  engineVersion: string;
  birthInfo: BirthInfo;
  julianDay: number;
  /** Ayanāṃśa (degrees) applied to convert tropical-of-date → sidereal. */
  ayanamsa: number;
  /** The configuration constants this chart was computed under (reproducibility). */
  config: {
    ayanamsa: string;
    luoCalcConvention: string;
    ziQiPeriodYears: number;
  };
  ascendant: QizhengAscendant;
  /** 命主星 — domicile ruler of the ascendant sign. */
  mingLord: Governor;
  /** 身主星 — ruler of the sign the Moon occupies (form/body ruler). */
  shenLord: Governor;
  bodies: PlacedBody[];
  houses: QizhengHouse[];
}
