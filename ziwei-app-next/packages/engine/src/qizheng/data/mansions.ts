/**
 * 二十八宿 距星 (determinative stars) — J2000.0 tropical ecliptic longitudes.
 *
 * Each 宿 spans from its 距星 to the next 距星's longitude. We store the J2000
 * tropical longitude of each determinative star; the engine converts these to
 * the (fixed-star) sidereal frame once, then bins each body's sidereal longitude
 * into a 宿 — epoch-stable because both star and body live in the sidereal frame.
 *
 * [VERIFY] These longitudes are standard approximations and a few 距星
 * identifications are scholarly-disputed (notably 觜/參 ordering and 虛/危).
 * Cross-check against 《儀象考成》 / a Hipparcos recomputation before production.
 * See docs/qizheng-research.md §4.
 */
import type { MansionName } from '../types';

export interface MansionStar {
  mansion: MansionName;
  /** Determinative star (距星) identification. */
  star: string;
  /** J2000.0 tropical ecliptic longitude of the 距星, degrees. */
  lonJ2000: number;
}

export const MANSION_STARS: readonly MansionStar[] = [
  // 東方蒼龍
  { mansion: '角', star: 'α Vir (Spica)', lonJ2000: 203.84 },
  { mansion: '亢', star: 'κ Vir', lonJ2000: 218.0 },
  { mansion: '氐', star: 'α² Lib', lonJ2000: 225.1 },
  { mansion: '房', star: 'π Sco', lonJ2000: 242.6 },
  { mansion: '心', star: 'σ Sco', lonJ2000: 245.3 },
  { mansion: '尾', star: 'μ Sco', lonJ2000: 251.6 },
  { mansion: '箕', star: 'γ Sgr', lonJ2000: 261.0 },
  // 北方玄武
  { mansion: '斗', star: 'φ Sgr', lonJ2000: 271.5 },
  { mansion: '牛', star: 'β Cap', lonJ2000: 295.5 },
  { mansion: '女', star: 'ε Aqr', lonJ2000: 310.6 },
  { mansion: '虛', star: 'β Aqr', lonJ2000: 321.9 },
  { mansion: '危', star: 'α Aqr', lonJ2000: 333.2 },
  { mansion: '室', star: 'α Peg', lonJ2000: 353.5 },
  { mansion: '壁', star: 'γ Peg', lonJ2000: 8.9 },
  // 西方白虎
  { mansion: '奎', star: 'ζ And', lonJ2000: 24.0 },
  { mansion: '婁', star: 'β Ari', lonJ2000: 33.4 },
  { mansion: '胃', star: '35 Ari', lonJ2000: 41.0 },
  { mansion: '昴', star: '17 Tau', lonJ2000: 59.7 },
  { mansion: '畢', star: 'ε Tau', lonJ2000: 65.7 },
  { mansion: '觜', star: 'φ¹ Ori', lonJ2000: 74.5 },
  { mansion: '參', star: 'ζ Ori', lonJ2000: 79.0 },
  // 南方朱雀
  { mansion: '井', star: 'μ Gem', lonJ2000: 93.5 },
  { mansion: '鬼', star: 'θ Cnc', lonJ2000: 127.0 },
  { mansion: '柳', star: 'δ Hya', lonJ2000: 129.0 },
  { mansion: '星', star: 'α Hya', lonJ2000: 147.4 },
  { mansion: '張', star: 'υ¹ Hya', lonJ2000: 158.0 },
  { mansion: '翼', star: 'α Crt', lonJ2000: 160.6 },
  { mansion: '軫', star: 'γ Crv', lonJ2000: 192.5 },
] as const;
