/**
 * 廟旺落陷 — planetary dignity of the 七政 by sign.
 *
 * 果老星宗 inherited the Hellenistic domicile/exaltation/detriment/fall scheme
 * onto its 十二次, so this table is the classical rulership grid:
 *   廟 = domicile (本宮),  旺 = exaltation (升旺),
 *   陷 = detriment (失位), 落 = fall (降落).
 * Where a sign is both domicile+exaltation (e.g. 水 in 處女), domicile wins.
 * Where both detriment+fall coincide, the more debilitating label is used.
 * Default for any unlisted (planet, sign) pair is 平和. The 四餘 are not graded
 * (treated 平和) in this MVP. See docs/qizheng-research.md §5.
 */
import type { Dignity, Governor } from '../types';

// signIndex: 0白羊 1金牛 2雙子 3巨蟹 4獅子 5處女 6天秤 7天蝎 8射手 9摩羯 10水瓶 11雙魚
const DIGNITY_TABLE: Record<Governor, Partial<Record<number, Dignity>>> = {
  日: { 4: '廟', 0: '旺', 6: '落', 10: '陷' },
  月: { 3: '廟', 1: '旺', 7: '落', 9: '陷' },
  水: { 2: '廟', 5: '廟', 8: '陷', 11: '陷' },
  金: { 1: '廟', 6: '廟', 11: '旺', 5: '落', 0: '陷', 7: '陷' },
  火: { 0: '廟', 7: '廟', 9: '旺', 3: '落', 6: '陷', 1: '陷' },
  木: { 8: '廟', 11: '廟', 3: '旺', 9: '落', 2: '陷', 5: '陷' },
  土: { 9: '廟', 10: '廟', 6: '旺', 0: '落', 3: '陷', 4: '陷' },
};

export function dignityOf(body: string, signIndex: number): Dignity {
  const row = DIGNITY_TABLE[body as Governor];
  if (!row) return '平和';
  return row[((signIndex % 12) + 12) % 12] ?? '平和';
}
