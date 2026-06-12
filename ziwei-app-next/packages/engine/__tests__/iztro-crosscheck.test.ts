/**
 * Cross-validation against iztro (https://github.com/SylarLong/iztro, MIT) —
 * the de-facto reference ziwei implementation. ~200 seeded pseudo-random
 * births; compares per-branch placement of all 28 stars, 生年四化, 命宮/身宮,
 * and 大限 start ages.
 *
 * Deliberately NOT compared:
 *  - brightness (廟旺利陷) — legitimate school variance;
 *  - hour 23 births (晚子時) — day-attribution conventions differ;
 *  - 流耀/雜曜 — not implemented here.
 * Any systematic mismatch found by this suite means a real placement bug in
 * one of the two engines — investigate before "fixing" to match.
 */

import { describe, it, expect } from 'vitest';
import { astro } from 'iztro';
import { computeChart, toStandardTimeBirth, type BirthInfo } from '../src';

/** Deterministic LCG so failures are reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function randomBirths(n: number, seed: number): BirthInfo[] {
  const rnd = lcg(seed);
  const births: BirthInfo[] = [];
  while (births.length < n) {
    const year = 1920 + Math.floor(rnd() * 101); // 1920-2020
    const month = 1 + Math.floor(rnd() * 12);
    const day = 1 + Math.floor(rnd() * (DAYS_IN_MONTH[month - 1] - (month === 2 ? 1 : 0)));
    const hour = Math.floor(rnd() * 23); // 0-22; skip 晚子時 (23)
    const gender = rnd() < 0.5 ? 'M' : 'F';
    const b: BirthInfo = { year, month, day, hour, minute: 0, gender, calendar: 'solar' };
    // Our engine normalizes historical DST internally; iztro doesn't. The
    // comparison passes the RAW birth to our engine and the manually
    // normalized standard time to iztro — validating the DST pipeline too.
    if (toStandardTimeBirth(b).hour === 23) continue; // lands on 晚子時 — skip
    births.push(b);
  }
  return births;
}

const ALL_STARS = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '左輔', '右弼', '文昌', '文曲', '天魁', '天鉞', '祿存', '天馬',
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
  '紅鸞', '天喜', '天姚', '天刑', '咸池',
];

interface IztroView {
  starBranch: Map<string, string>;
  mutagenStar: Map<string, string>; // 祿/權/科/忌 → star
  soulBranch: string;
  bodyBranch: string;
  decadeStartByBranch: Map<string, number>;
}

function iztroChart(raw: BirthInfo): IztroView {
  const b = toStandardTimeBirth(raw); // iztro needs standard time supplied explicitly
  const timeIndex = Math.floor((b.hour + 1) / 2); // hour 0 → 0 (早子), 1-2 → 1 (丑) …
  const dateStr = `${b.year}-${b.month}-${b.day}`;
  const horoscope = astro.bySolar(dateStr, timeIndex as 0, b.gender === 'M' ? '男' : '女', true, 'zh-TW');
  const starBranch = new Map<string, string>();
  const mutagenStar = new Map<string, string>();
  let bodyBranch = '';
  const decadeStartByBranch = new Map<string, number>();
  for (const p of horoscope.palaces) {
    if (p.isBodyPalace) bodyBranch = p.earthlyBranch;
    decadeStartByBranch.set(p.earthlyBranch, p.decadal.range[0]);
    for (const s of [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]) {
      starBranch.set(s.name, p.earthlyBranch);
      if (s.mutagen) mutagenStar.set(s.mutagen, s.name);
    }
  }
  return {
    starBranch,
    mutagenStar,
    soulBranch: horoscope.earthlyBranchOfSoulPalace,
    bodyBranch,
    decadeStartByBranch,
  };
}

describe('iztro cross-validation (200 seeded births)', () => {
  const births = randomBirths(200, 0x5eed);

  it('matches star placements, 四化, 命/身宮 and 大限 start ages', () => {
    const mismatches: string[] = [];

    for (const b of births) {
      const label = `${b.year}-${b.month}-${b.day} ${b.hour}h ${b.gender}`;
      let ours;
      let theirs;
      try {
        ours = computeChart(b);
        theirs = iztroChart(b);
      } catch (err) {
        mismatches.push(`${label}: threw ${(err as Error).message}`);
        continue;
      }

      const ourStarBranch = new Map<string, string>();
      for (const p of ours.palaces) for (const s of p.stars) ourStarBranch.set(s.name, p.branch);

      for (const star of ALL_STARS) {
        const a = ourStarBranch.get(star);
        const z = theirs.starBranch.get(star);
        if (a && z && a !== z) mismatches.push(`${label}: ${star} ours=${a} iztro=${z}`);
      }

      // 生年四化 — compare star assignment per mutagen.
      const ourMutagen = new Map<string, string>();
      for (const p of ours.palaces) {
        for (const s of p.stars) if (s.transformation) ourMutagen.set(s.transformation, s.name);
      }
      for (const hua of ['祿', '權', '科', '忌']) {
        const a = ourMutagen.get(hua);
        const z = theirs.mutagenStar.get(hua);
        if (a && z && a !== z) mismatches.push(`${label}: 化${hua} ours=${a} iztro=${z}`);
      }

      // 命宮 / 身宮 branches.
      const ourSoul = ours.palaces.find((p) => p.isMingong)!.branch;
      if (ourSoul !== theirs.soulBranch) {
        mismatches.push(`${label}: 命宮 ours=${ourSoul} iztro=${theirs.soulBranch}`);
      }
      const ourBody = ours.palaces.find((p) => p.isShenGong)?.branch;
      if (ourBody && theirs.bodyBranch && ourBody !== theirs.bodyBranch) {
        mismatches.push(`${label}: 身宮 ours=${ourBody} iztro=${theirs.bodyBranch}`);
      }

      // 大限 start age per branch (direction + 起運 in one check).
      for (const d of ours.decades ?? []) {
        const z = theirs.decadeStartByBranch.get(d.branch);
        if (z !== undefined && z !== d.startAge) {
          mismatches.push(`${label}: 大限@${d.branch} ours=${d.startAge} iztro=${z}`);
        }
      }
    }

    if (mismatches.length) {
      const sample = mismatches.slice(0, 40).join('\n');
      throw new Error(`${mismatches.length} mismatches vs iztro:\n${sample}`);
    }
    expect(mismatches).toHaveLength(0);
  });
});
