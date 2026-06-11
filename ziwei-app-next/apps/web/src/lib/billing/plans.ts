import type { PlanKey } from './stripe';

/**
 * Lightweight, client-safe plan display metadata (name / price / badge) shared
 * by the register form, the dashboard upgrade card, and the pricing page.
 * Full feature lists live on the pricing page itself.
 *
 * Keep ids in sync with PlanKey ('monthly' | 'annual' | 'master').
 */
export type PlanDisplay = {
  id: PlanKey;
  name: string;
  price: number;
  period: string;
  badge: string | null;
  tagline: string;
};

export const PLAN_DISPLAY: readonly PlanDisplay[] = [
  { id: 'monthly', name: '月度', price: 98, period: '/月', badge: null, tagline: '無限命盤 · 每日運勢' },
  { id: 'annual', name: '年度', price: 788, period: '/年', badge: '最受歡迎 · 省 33%', tagline: '加語音 · 視覺解讀 · PDF' },
  { id: 'master', name: '大師', price: 1888, period: '/年', badge: '人手深度服務', tagline: '含 1 次真人命理諮詢' },
] as const;

/** The plan we pre-select / recommend by default. */
export const DEFAULT_PLAN: PlanKey = 'annual';
