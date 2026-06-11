/**
 * 果老星宗 行運 (true transits).
 *
 * The natal pipeline in `index.ts` is already fully time-parameterised — every
 * primitive (`sevenGovernors`, `fourRemainders`, `toSidereal`, `mansionOf`,
 * `signIndexOf`, `dignityOf`) takes an instant, not a birth. A transit chart is
 * therefore the SAME placement run for an arbitrary moment, then diffed against
 * the saved natal `QizhengChart`:
 *
 *   • aspects   — transiting 曜 vs natal 曜 / 命度 / 命主 / 身主, snapped to the
 *                 classical sidereal-longitude angles 合(0)/會(60)/刑(90)/拱(120)/沖(180)
 *                 within an orb, flagged applying/separating and benefic/malefic.
 *   • ingresses — a transiting 曜 changing 宿 or 宮 across the period window, with
 *                 the natal house (by the natal ascendant) it now transits.
 *
 * No new astronomy is introduced here — only a new time entry point + diffing.
 */
import { norm360, toSidereal } from './ayanamsa';
import { dignityOf } from './data/dignities';
import { SIGNS, signIndexOf } from './data/signs';
import { sevenGovernors } from './ephemeris';
import { fourRemainders } from './four-yu';
import { houseOf, QIZHENG_HOUSE_NAMES } from './houses';
import { mansionOf } from './mansions';
import { instantToAstroTime, julianCenturiesTT, julianDayTT } from './time';
import {
  ELEVEN_BODIES,
  FOUR_REMAINDERS,
  type Dignity,
  type Governor,
  type MansionName,
  type QizhengBodyName,
  type QizhengChart,
  type Remainder,
} from './types';

const FOUR_REMAINDER_SET = new Set<string>(FOUR_REMAINDERS);

export type TransitScope = 'day' | 'month' | 'year';

/** A 曜 placed in the sky at the transit instant (no house — house is natal-relative). */
export interface TransitBody {
  name: QizhengBodyName;
  lonSidereal: number;
  sign: string;
  mansion: MansionName;
  degIntoMansion: number;
  dignity: Dignity;
  retrograde: boolean;
}

/** Classical 果老 longitude aspects. */
export type AspectKind = '合' | '會' | '刑' | '拱' | '沖';

/** A natal point a transit can aspect: any natal 曜, or the 命度/命主/身主. */
export type NatalTargetName = QizhengBodyName | '命度' | '命主' | '身主';

export interface TransitAspect {
  transiting: QizhengBodyName;
  natal: NatalTargetName;
  kind: AspectKind;
  /** Ideal separation for this aspect (0/60/90/120/180). */
  exactDeg: number;
  /** |actual − ideal| in degrees; smaller = tighter = stronger. */
  orbDeg: number;
  /** True when the orb is shrinking over the next day — an applying (intensifying) aspect. */
  applying: boolean;
  /** True when the transiting body is 火/土/羅睺/計都/月孛 (a malefic) onto the target. */
  malefic: boolean;
}

export interface TransitIngress {
  body: QizhengBodyName;
  enteredSign?: string;
  enteredMansion?: MansionName;
  /** Natal house (1–12, by the natal ascendant) this body now transits. */
  natalHouse: number;
  natalHouseName: string;
}

export interface QizhengTransit {
  scope: TransitScope;
  /** ISO instant the bodies were placed at (representative moment of the period). */
  instant: string;
  windowStart: string;
  windowEnd: string;
  bodies: TransitBody[];
  /** Sorted: tightest malefic aspects first. */
  aspects: TransitAspect[];
  ingresses: TransitIngress[];
}

const ASPECTS: { kind: AspectKind; deg: number }[] = [
  { kind: '合', deg: 0 },
  { kind: '會', deg: 60 },
  { kind: '刑', deg: 90 },
  { kind: '拱', deg: 120 },
  { kind: '沖', deg: 180 },
];

/** Orb allowance (degrees) by transiting body class. */
function orbFor(name: QizhengBodyName): number {
  if (name === '日' || name === '月') return 8;
  if (FOUR_REMAINDER_SET.has(name)) return 3;
  return 6; // 火水木金土
}

const MALEFIC_BODIES = new Set<QizhengBodyName>(['火', '土', '羅睺', '計都', '月孛']);

/** Half-window (ms) around the representative instant, used for ingress diffing. */
const HALF_WINDOW_MS: Record<TransitScope, number> = {
  day: 12 * 3_600_000,
  month: 15 * 86_400_000,
  year: 183 * 86_400_000,
};

/** Angular separation 0–180° between two ecliptic longitudes. */
function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a - b));
  return d > 180 ? 360 - d : d;
}

interface RawBody {
  lonSidereal: number;
  retrograde: boolean;
}

/** Sidereal longitudes (+retrograde) of all 11 曜 at an instant. */
function rawBodiesAt(instant: Date): Record<QizhengBodyName, RawBody> {
  const t = instantToAstroTime(instant);
  const jd = julianDayTT(t);
  const T = julianCenturiesTT(t);
  const governors = sevenGovernors(t);
  const remainders = fourRemainders(T, jd);
  const out = {} as Record<QizhengBodyName, RawBody>;
  for (const name of ELEVEN_BODIES) {
    const lonTropical = FOUR_REMAINDER_SET.has(name)
      ? remainders[name as Remainder]
      : governors[name as Governor].lon;
    const retrograde = FOUR_REMAINDER_SET.has(name)
      ? false
      : governors[name as Governor].retrograde;
    out[name] = { lonSidereal: toSidereal(lonTropical, jd), retrograde };
  }
  return out;
}

/** Place every 曜 at an instant (sign / mansion / dignity / retro). */
export function transitingBodies(instant: Date): TransitBody[] {
  const raw = rawBodiesAt(instant);
  return ELEVEN_BODIES.map((name) => {
    const { lonSidereal, retrograde } = raw[name];
    const signIndex = signIndexOf(lonSidereal);
    const { mansion, degIntoMansion } = mansionOf(lonSidereal);
    return {
      name,
      lonSidereal,
      sign: SIGNS[signIndex].sign,
      mansion,
      degIntoMansion,
      dignity: dignityOf(name, signIndex),
      retrograde,
    };
  });
}

/** Representative UTC instant for the period: local noon of `date` in the chart's tz. */
function representativeInstant(date: Date, tzOffsetMinutes: number): Date {
  const utcMs =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0) -
    tzOffsetMinutes * 60_000;
  return new Date(utcMs);
}

/**
 * True 果老 transits for `date` at the given scope, diffed against the natal chart.
 * The Moon is omitted from month/year aspects + ingresses (it sweeps the zodiac
 * monthly, so it carries no signal at those scales).
 */
export function computeQizhengTransit(
  natal: QizhengChart,
  opts: { scope: TransitScope; date: Date },
): QizhengTransit {
  const { scope, date } = opts;
  const tz = natal.birthInfo.tzOffsetMinutes ?? 480;
  const instant = representativeInstant(date, tz);
  const half = HALF_WINDOW_MS[scope];
  const windowStart = new Date(instant.getTime() - half);
  const windowEnd = new Date(instant.getTime() + half);
  const omitMoon = scope !== 'day';

  // --- natal targets (sidereal longitudes) ---
  const natalLonByName = new Map<QizhengBodyName, number>(
    natal.bodies.map((b) => [b.name, b.lonSidereal]),
  );
  const natalAscSignIndex = signIndexOf(natal.ascendant.lonSidereal);
  const targets: { name: NatalTargetName; lon: number }[] = [
    ...natal.bodies.map((b) => ({ name: b.name as NatalTargetName, lon: b.lonSidereal })),
    { name: '命度', lon: natal.ascendant.lonSidereal },
  ];
  const mingLordLon = natalLonByName.get(natal.mingLord);
  if (mingLordLon !== undefined) targets.push({ name: '命主', lon: mingLordLon });
  const shenLordLon = natalLonByName.get(natal.shenLord);
  if (shenLordLon !== undefined) targets.push({ name: '身主', lon: shenLordLon });

  // --- transiting bodies now (representative) and at the window edges for orb trend ---
  const bodies = transitingBodies(instant);
  const rawTomorrow = rawBodiesAt(new Date(instant.getTime() + 86_400_000));

  // --- aspects ---
  const aspects: TransitAspect[] = [];
  for (const tb of bodies) {
    if (omitMoon && tb.name === '月') continue;
    const orb = orbFor(tb.name);
    for (const target of targets) {
      // skip a body aspecting its own natal position by 合 (always ~exact, no signal)
      const sep = separation(tb.lonSidereal, target.lon);
      let best: { kind: AspectKind; deg: number; orbDeg: number } | null = null;
      for (const asp of ASPECTS) {
        const orbDeg = Math.abs(sep - asp.deg);
        if (orbDeg <= orb && (best === null || orbDeg < best.orbDeg)) {
          best = { kind: asp.kind, deg: asp.deg, orbDeg };
        }
      }
      if (!best) continue;
      const sepTomorrow = separation(rawTomorrow[tb.name].lonSidereal, target.lon);
      const applying = Math.abs(sepTomorrow - best.deg) < Math.abs(sep - best.deg);
      aspects.push({
        transiting: tb.name,
        natal: target.name,
        kind: best.kind,
        exactDeg: best.deg,
        orbDeg: Number(best.orbDeg.toFixed(2)),
        applying,
        malefic: MALEFIC_BODIES.has(tb.name),
      });
    }
  }
  // tightest malefic aspects first
  aspects.sort((a, b) => {
    if (a.malefic !== b.malefic) return a.malefic ? -1 : 1;
    return a.orbDeg - b.orbDeg;
  });

  // --- ingresses (sign / mansion change across the window) ---
  const startBodies = transitingBodies(windowStart);
  const endBodies = transitingBodies(windowEnd);
  const startByName = new Map(startBodies.map((b) => [b.name, b]));
  const ingresses: TransitIngress[] = [];
  for (const eb of endBodies) {
    if (omitMoon && eb.name === '月') continue;
    const sb = startByName.get(eb.name);
    if (!sb) continue;
    const enteredSign = sb.sign !== eb.sign ? eb.sign : undefined;
    const enteredMansion = sb.mansion !== eb.mansion ? eb.mansion : undefined;
    if (!enteredSign && !enteredMansion) continue;
    const house = houseOf(signIndexOf(eb.lonSidereal), natalAscSignIndex);
    ingresses.push({
      body: eb.name,
      enteredSign,
      enteredMansion,
      natalHouse: house,
      natalHouseName: QIZHENG_HOUSE_NAMES[house - 1],
    });
  }

  return {
    scope,
    instant: instant.toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    bodies,
    aspects,
    ingresses,
  };
}
