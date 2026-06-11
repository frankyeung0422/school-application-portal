/**
 * 二十八宿 binning — map a sidereal ecliptic longitude to its 宿 + 入宿度.
 *
 * Boundaries are derived once from the 距星 J2000 longitudes, converted into the
 * sidereal frame (so they track the real stars and don't drift with epoch).
 */
import { ayanamsa, norm360 } from './ayanamsa';
import { MANSION_STARS } from './data/mansions';
import { J2000_JD } from './time';
import type { MansionName } from './types';

export interface MansionBoundary {
  mansion: MansionName;
  /** Sidereal longitude where this 宿 begins (degrees, 0–360). */
  start: number;
  /** Width of this 宿 (degrees). */
  span: number;
}

/** Sidereal-frame 宿 boundaries, in canonical 28宿 order. Computed once. */
export const MANSION_BOUNDARIES: readonly MansionBoundary[] = (() => {
  const ayanJ2000 = ayanamsa(J2000_JD);
  const starts = MANSION_STARS.map((m) => ({
    mansion: m.mansion,
    start: norm360(m.lonJ2000 - ayanJ2000),
  }));
  return starts.map((s, i) => {
    const next = starts[(i + 1) % starts.length];
    return { mansion: s.mansion, start: s.start, span: norm360(next.start - s.start) };
  });
})();

export interface MansionPosition {
  mansion: MansionName;
  degIntoMansion: number;
}

/** Bin a sidereal longitude (0–360) into its 宿 + 入宿度. */
export function mansionOf(lonSidereal: number): MansionPosition {
  const L = norm360(lonSidereal);
  for (const b of MANSION_BOUNDARIES) {
    const off = norm360(L - b.start);
    if (off < b.span) return { mansion: b.mansion, degIntoMansion: off };
  }
  // Unreachable if boundaries partition the circle; fall back to first 宿.
  return { mansion: MANSION_BOUNDARIES[0].mansion, degIntoMansion: 0 };
}
