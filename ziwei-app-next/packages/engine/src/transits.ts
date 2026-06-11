/**
 * Unified 流盤 facade — one call returns the day/month/year flow snapshot across
 * all three systems, ready for the context builders + AI prompts.
 *
 * Month boundaries follow 節氣 (solar terms) for every system: bazi's month
 * ganzhi is already 節-anchored and 果老 is purely solar, so aligning ziwei 流月
 * to the same clock keeps the三盤 snapshot coherent. The `periodKey` is the
 * idempotency seam shared with the alert engine + the Fortune cache.
 */
import type { BirthInfo } from './types';
import type { AllSystems } from './index';
import {
  baziDayFlow,
  baziMonthFlow,
  baziYearFlow,
  ziweiDayFlow,
  ziweiMonthFlow,
  ziweiYearFlow,
  type BaziPeriodFlow,
  type BaziYearFlow,
  type ZiweiPeriodFlow,
  type ZiweiYearFlow,
} from './year-flow';
import { computeQizhengTransit, type QizhengTransit, type TransitScope } from './qizheng';
import { solarToLunar } from './solar-to-lunar';

export interface TransitSnapshot {
  scope: TransitScope;
  /** ISO calendar date (YYYY-MM-DD) the snapshot was computed for. */
  date: string;
  /** Human label, e.g. "2026年 丙午年" / "庚寅月" / "2026年6月1日 甲子日". */
  periodLabel: string;
  /** Idempotency key: 'Y丙午' | 'M庚寅' | 'D2026-06-01'. Shared with alerts + Fortune cache. */
  periodKey: string;
  solar: {
    dayGanzhi: string;
    monthGanzhi: string;
    yearGanzhi: string;
    lunar: { year: number; month: number; day: number; isLeap: boolean };
  };
  ziwei: ZiweiPeriodFlow | ZiweiYearFlow;
  bazi: BaziPeriodFlow | BaziYearFlow;
  qizheng: QizhengTransit;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Compute the 流盤 for one person at the given scope + date.
 *
 * `all` is the pre-computed natal `AllSystems` (so we never recompute natal
 * charts — the cron/page already has them saved). `date` is interpreted as a
 * civil date in the subject's timezone.
 */
export function computeTransits(
  birth: BirthInfo,
  all: AllSystems,
  opts: { scope: TransitScope; date: Date },
): TransitSnapshot {
  const { scope, date } = opts;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const sl = solarToLunar(y, m, d, 12, 0);

  let ziwei: ZiweiPeriodFlow | ZiweiYearFlow;
  let bazi: BaziPeriodFlow | BaziYearFlow;
  if (scope === 'year') {
    ziwei = ziweiYearFlow(all.ziwei.chart, y, birth.year);
    bazi = baziYearFlow(birth.year, all.bazi.chart.dayMaster, all.bazi.chart.luckPillars, y);
  } else {
    ziwei = scope === 'month' ? ziweiMonthFlow(all.ziwei.chart, date) : ziweiDayFlow(all.ziwei.chart, date);
    bazi = scope === 'month' ? baziMonthFlow(all.bazi.chart, date) : baziDayFlow(all.bazi.chart, date);
  }

  const qizheng = computeQizhengTransit(all.qizheng.chart, { scope, date });

  const isoDate = `${y}-${pad2(m)}-${pad2(d)}`;
  let periodKey: string;
  let periodLabel: string;
  if (scope === 'year') {
    periodKey = `Y${sl.ganzhi.yearGanzhi}`;
    periodLabel = `${y}年 ${sl.ganzhi.yearGanzhi}年`;
  } else if (scope === 'month') {
    periodKey = `M${sl.ganzhi.monthGanzhi}`;
    periodLabel = `${sl.ganzhi.monthGanzhi}月`;
  } else {
    periodKey = `D${isoDate}`;
    periodLabel = `${y}年${m}月${d}日 ${sl.ganzhi.dayGanzhi}日`;
  }

  return {
    scope,
    date: isoDate,
    periodLabel,
    periodKey,
    solar: {
      dayGanzhi: sl.ganzhi.dayGanzhi,
      monthGanzhi: sl.ganzhi.monthGanzhi,
      yearGanzhi: sl.ganzhi.yearGanzhi,
      lunar: sl.lunar,
    },
    ziwei,
    bazi,
    qizheng,
  };
}
