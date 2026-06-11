import type { EarthlyBranch, HeavenlyStem } from './types';
import { EARTHLY_BRANCHES } from './types';

/**
 * 神煞 — symbolic stars derived from pillar stems/branches. Hand-rolled
 * standard tables (《三命通會》/《淵海子平》 conventions) rather than
 * delegating to lunar-javascript, so every rule is auditable here.
 *
 * Each detector reports WHICH pillar's branch triggered it — practitioners
 * read 神煞 differently by palace (年=祖上/early life, 月=父母/career,
 * 日=self/spouse, 時=children/late life).
 */

export type PillarKey = 'year' | 'month' | 'day' | 'hour';

export interface ShenShaHit {
  name: string;
  /** 吉 / 凶 / 中性 flavour for quick filtering. */
  kind: '吉' | '凶' | '中性';
  /** Which pillar's branch (or pillar itself for 魁罡) matched. */
  pillar: PillarKey;
  /** What the rule keyed on, e.g. 日干甲見丑. */
  basis: string;
}

interface PillarsInput {
  year: { stem: HeavenlyStem; branch: EarthlyBranch };
  month: { stem: HeavenlyStem; branch: EarthlyBranch };
  day: { stem: HeavenlyStem; branch: EarthlyBranch };
  hour: { stem: HeavenlyStem; branch: EarthlyBranch };
}

const PILLAR_KEYS: PillarKey[] = ['year', 'month', 'day', 'hour'];

/** 天乙貴人: 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 壬癸→卯巳, 辛→午寅. */
const TIANYI: Record<HeavenlyStem, EarthlyBranch[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};

/** 文昌貴人 by day stem. */
const WENCHANG: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉',
  己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯',
};

/** 祿神 by day stem (same table as ziwei 祿存). */
const LU_SHEN: Record<HeavenlyStem, EarthlyBranch> = {
  甲: '寅', 乙: '卯', 丙: '巳', 戊: '巳', 丁: '午',
  己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子',
};

/** 羊刃 — yang stems only: 祿前一位. */
const YANG_REN: Partial<Record<HeavenlyStem, EarthlyBranch>> = {
  甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子',
};

/** Trine-keyed stars: 桃花(咸池)/驛馬/華蓋/將星, keyed on 年支 AND 日支. */
const TRINE_STAR: Record<EarthlyBranch, { 桃花: EarthlyBranch; 驛馬: EarthlyBranch; 華蓋: EarthlyBranch; 將星: EarthlyBranch }> = {
  申: { 桃花: '酉', 驛馬: '寅', 華蓋: '辰', 將星: '子' },
  子: { 桃花: '酉', 驛馬: '寅', 華蓋: '辰', 將星: '子' },
  辰: { 桃花: '酉', 驛馬: '寅', 華蓋: '辰', 將星: '子' },
  寅: { 桃花: '卯', 驛馬: '申', 華蓋: '戌', 將星: '午' },
  午: { 桃花: '卯', 驛馬: '申', 華蓋: '戌', 將星: '午' },
  戌: { 桃花: '卯', 驛馬: '申', 華蓋: '戌', 將星: '午' },
  巳: { 桃花: '午', 驛馬: '亥', 華蓋: '丑', 將星: '酉' },
  酉: { 桃花: '午', 驛馬: '亥', 華蓋: '丑', 將星: '酉' },
  丑: { 桃花: '午', 驛馬: '亥', 華蓋: '丑', 將星: '酉' },
  亥: { 桃花: '子', 驛馬: '巳', 華蓋: '未', 將星: '卯' },
  卯: { 桃花: '子', 驛馬: '巳', 華蓋: '未', 將星: '卯' },
  未: { 桃花: '子', 驛馬: '巳', 華蓋: '未', 將星: '卯' },
};

/** 魁罡 day pillars. */
const KUI_GANG = new Set(['庚辰', '庚戌', '壬辰', '戊戌']);

/** 孤辰/寡宿 by year-branch season group. */
const GU_GUA: Record<EarthlyBranch, { 孤辰: EarthlyBranch; 寡宿: EarthlyBranch }> = {
  亥: { 孤辰: '寅', 寡宿: '戌' }, 子: { 孤辰: '寅', 寡宿: '戌' }, 丑: { 孤辰: '寅', 寡宿: '戌' },
  寅: { 孤辰: '巳', 寡宿: '丑' }, 卯: { 孤辰: '巳', 寡宿: '丑' }, 辰: { 孤辰: '巳', 寡宿: '丑' },
  巳: { 孤辰: '申', 寡宿: '辰' }, 午: { 孤辰: '申', 寡宿: '辰' }, 未: { 孤辰: '申', 寡宿: '辰' },
  申: { 孤辰: '亥', 寡宿: '未' }, 酉: { 孤辰: '亥', 寡宿: '未' }, 戌: { 孤辰: '亥', 寡宿: '未' },
};

export function computeShenSha(pillars: PillarsInput): ShenShaHit[] {
  const hits: ShenShaHit[] = [];
  const dayStem = pillars.day.stem;
  const branchesOf = (skipDay = false) =>
    PILLAR_KEYS.filter((k) => !(skipDay && k === 'day')).map((k) => ({ key: k, branch: pillars[k].branch }));

  // Branch-target stars keyed on the day stem.
  for (const { key, branch } of branchesOf()) {
    if (TIANYI[dayStem].includes(branch)) {
      hits.push({ name: '天乙貴人', kind: '吉', pillar: key, basis: `日干${dayStem}見${branch}` });
    }
    if (WENCHANG[dayStem] === branch) {
      hits.push({ name: '文昌貴人', kind: '吉', pillar: key, basis: `日干${dayStem}見${branch}` });
    }
    if (LU_SHEN[dayStem] === branch) {
      hits.push({ name: '祿神', kind: '吉', pillar: key, basis: `日干${dayStem}祿在${branch}` });
    }
    if (YANG_REN[dayStem] === branch) {
      hits.push({ name: '羊刃', kind: '凶', pillar: key, basis: `日干${dayStem}刃在${branch}` });
    }
  }

  // Trine stars — keyed on 年支 and 日支 (both bases are standard practice).
  for (const baseKey of ['year', 'day'] as const) {
    const base = pillars[baseKey].branch;
    const t = TRINE_STAR[base];
    for (const { key, branch } of branchesOf()) {
      if (key === baseKey) continue;
      if (t.桃花 === branch) hits.push({ name: '桃花', kind: '中性', pillar: key, basis: `${baseKey === 'year' ? '年' : '日'}支${base}見${branch}` });
      if (t.驛馬 === branch) hits.push({ name: '驛馬', kind: '中性', pillar: key, basis: `${baseKey === 'year' ? '年' : '日'}支${base}見${branch}` });
      if (t.華蓋 === branch) hits.push({ name: '華蓋', kind: '中性', pillar: key, basis: `${baseKey === 'year' ? '年' : '日'}支${base}見${branch}` });
      if (t.將星 === branch) hits.push({ name: '將星', kind: '吉', pillar: key, basis: `${baseKey === 'year' ? '年' : '日'}支${base}見${branch}` });
    }
  }

  // 魁罡 — day pillar itself.
  const dayGz = `${pillars.day.stem}${pillars.day.branch}`;
  if (KUI_GANG.has(dayGz)) {
    hits.push({ name: '魁罡', kind: '中性', pillar: 'day', basis: `日柱${dayGz}` });
  }

  // 孤辰/寡宿 — year-branch group vs the other branches.
  const gg = GU_GUA[pillars.year.branch];
  for (const { key, branch } of branchesOf()) {
    if (key === 'year') continue;
    if (gg.孤辰 === branch) hits.push({ name: '孤辰', kind: '凶', pillar: key, basis: `年支${pillars.year.branch}見${branch}` });
    if (gg.寡宿 === branch) hits.push({ name: '寡宿', kind: '凶', pillar: key, basis: `年支${pillars.year.branch}見${branch}` });
  }

  // 紅鸞/天喜 — 卯起子年逆行; 天喜 = 紅鸞對宮.
  const yIdx = EARTHLY_BRANCHES.indexOf(pillars.year.branch);
  const hongLuan = EARTHLY_BRANCHES[((3 - yIdx) % 12 + 12) % 12];
  const tianXi = EARTHLY_BRANCHES[(EARTHLY_BRANCHES.indexOf(hongLuan) + 6) % 12];
  for (const { key, branch } of branchesOf()) {
    if (key === 'year') continue;
    if (branch === hongLuan) hits.push({ name: '紅鸞', kind: '吉', pillar: key, basis: `年支${pillars.year.branch}鸞在${hongLuan}` });
    if (branch === tianXi) hits.push({ name: '天喜', kind: '吉', pillar: key, basis: `年支${pillars.year.branch}喜在${tianXi}` });
  }

  // Dedupe identical (name, pillar) pairs that fired from both 年/日 bases.
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = `${h.name}|${h.pillar}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
