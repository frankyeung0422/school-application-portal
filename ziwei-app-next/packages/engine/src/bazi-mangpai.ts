/**
 * 盲派八字 — Blind-School structural scaffold over a computed `BaziChart`.
 *
 * 盲派 reads the same four pillars as 子平 but through different levers:
 *   • 宮位象法 — each pillar is a life "palace" (年根/月提綱/日配/時嗣), and its
 *     十神 is read as a concrete 象 (image) of people/affairs in that palace.
 *   • 主賓/體用 — 日主 is 主/體 (the self); the 提綱 (month order) sets 賓/用,
 *     the dominant external force the self must engage.
 *   • 制化 — how the four branches 沖/刑/害/合/會 each other decides whether the
 *     用 is delivered (成) or blocked (破).
 *
 * This module only derives the STRUCTURE. The 取象 (turning structure into a
 * vivid life reading) is the LLM's job — see the bazi/unified prompts.
 */
import { branchRelation, type BranchRelation } from './branch-relations';
import {
  STEM_TO_ELEMENT,
  type BaziChart,
  type TenGod,
  type WuXing,
} from './bazi';
import type { HeavenlyStem } from './types';

type PillarKey = 'year' | 'month' | 'day' | 'hour';

export interface MangpaiPalace {
  pillar: PillarKey;
  /** 宮位 name in 盲派 terms. */
  palace: string;
  ganzhi: string;
  /** Stem 十神 (or 日主 on the day pillar). */
  stemGod: TenGod | '日主';
  /** Hidden-stem 十神 of the branch. */
  branchGods: TenGod[];
  /** Short 象 hint to seed the LLM's reading. */
  hint: string;
}

export interface MangpaiView {
  palaces: MangpaiPalace[];
  /** 主/體 — the self. */
  host: { stem: HeavenlyStem; element: WuXing; strength: '偏旺' | '中和' | '偏弱' };
  /** 賓/用 — the 提綱 (month order) the self must engage. */
  guest: { tenGod: TenGod | '日主' | null; note: string };
  /** 制化 — pairwise branch relations that deliver or break the 用. */
  controls: Array<{ a: PillarKey; b: PillarKey; relation: BranchRelation }>;
  summary: string;
}

const PALACE_OF: Record<PillarKey, string> = {
  year: '祖基宮（年根）',
  month: '事業提綱（月令）',
  day: '配偶宮（日支）',
  hour: '子嗣宮（時）',
};

const PALACE_HINT: Record<PillarKey, string> = {
  year: '祖上、根基、少年、外在格局',
  month: '父母、事業、社會舞台、用神所出',
  day: '配偶、自身近身之人事',
  hour: '子女、下屬、晚景、結果',
};

// element that GENERATES x (印 / 生我) in the 木火土金水 生 cycle.
const GENERATOR_OF: Record<WuXing, WuXing> = {
  木: '水', 火: '木', 土: '火', 金: '土', 水: '金',
};

function hostStrength(bazi: BaziChart): '偏旺' | '中和' | '偏弱' {
  const self = bazi.fiveElements[bazi.dayMasterElement];
  const support = bazi.fiveElements[GENERATOR_OF[bazi.dayMasterElement]];
  const score = self + support; // out of 8 stem+branch slots
  if (score >= 4) return '偏旺';
  if (score <= 2) return '偏弱';
  return '中和';
}

/** Derive the 盲派 structural scaffold from a computed bazi chart. */
export function mangpaiView(bazi: BaziChart): MangpaiView {
  const order: PillarKey[] = ['year', 'month', 'day', 'hour'];
  const palaces: MangpaiPalace[] = order.map((pillar) => {
    const p = bazi.pillars[pillar];
    return {
      pillar,
      palace: PALACE_OF[pillar],
      ganzhi: p.ganzhi,
      stemGod: p.stemTenGod,
      branchGods: p.branchTenGods,
      hint: PALACE_HINT[pillar],
    };
  });

  // 提綱 / 用 = the month order's leading ten-god.
  const month = bazi.pillars.month;
  const guestGod: TenGod | '日主' | null = month.branchTenGods[0] ?? month.stemTenGod ?? null;

  const controls: MangpaiView['controls'] = [];
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const rel = branchRelation(bazi.pillars[order[i]].branch, bazi.pillars[order[j]].branch);
      if (rel) controls.push({ a: order[i], b: order[j], relation: rel });
    }
  }

  const strength = hostStrength(bazi);
  const host = {
    stem: bazi.dayMaster,
    element: bazi.dayMasterElement,
    strength,
  };

  const summary =
    `主（體）為${bazi.dayMaster}${bazi.dayMasterElement}、${strength}；` +
    `提綱（用）取${guestGod ?? '無明顯十神'}。` +
    (controls.length
      ? `地支見${controls.map((c) => `${PALACE_OF[c.a][0]}${c.relation}${PALACE_OF[c.b][0]}`).join('、')}，制化定成敗。`
      : '四支無明顯沖合，格局較靜。');

  return {
    palaces,
    host,
    guest: {
      tenGod: guestGod,
      note: guestGod ? `提綱所透之${guestGod}為賓位主力，主自身一生所追逐／所受制之事。` : '提綱十神不顯，宜參大運引動。',
    },
    controls,
    summary,
  };
}
