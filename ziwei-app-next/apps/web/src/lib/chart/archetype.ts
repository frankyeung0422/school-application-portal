import type { Chart, MainStar, PlacedStar } from '@ziwei/engine';

/**
 * 命格標籤 — derived from the user's 命宮 main star(s).
 *
 * Mapped from the 14 主星, with combination rules for the classic doubles
 * (紫府同宮, 機梁, 殺破狼 splits, 日月同宮, etc.). Empty 命宮 falls back to
 * 對宮 借星 with a "孤宮" suffix to honour the traditional reading.
 *
 * This is *labeling*, not interpretation — the verdict line is intentionally
 * short and shareable. Full reading lives in the 深度解讀 / chat tab.
 */

export interface Archetype {
  /** Short label, 4-6 chars — fits an OG card title. */
  label: string;
  /** One-line poetic verdict, 14-22 chars. */
  tagline: string;
  /** Verb-adjective trio for the share card. */
  traits: [string, string, string];
}

const FALLBACK: Archetype = {
  label: '隱曜命',
  tagline: '命宮無正曜, 借星安身',
  traits: ['深藏', '善借勢', '後發者'],
};

const SINGLE: Record<MainStar, Archetype> = {
  紫微: { label: '帝座命', tagline: '北斗主星, 自有威儀', traits: ['領袖', '尊貴', '孤高'] },
  天機: { label: '智囊命', tagline: '善謀多變, 心思如機', traits: ['機敏', '善謀', '多思'] },
  太陽: { label: '光明命', tagline: '陽光普照, 利他能量強', traits: ['磊落', '利他', '燃燒'] },
  武曲: { label: '將軍命', tagline: '剛毅果決, 行動派財星', traits: ['果決', '務實', '剛強'] },
  天同: { label: '福德命', tagline: '溫和好福, 享受派性格', traits: ['溫和', '享受', '隨緣'] },
  廉貞: { label: '次桃花命', tagline: '剛柔並濟, 情義雙修', traits: ['熱情', '矛盾', '魅力'] },
  天府: { label: '庫府命', tagline: '南斗主星, 穩健聚財', traits: ['穩重', '聚財', '保守'] },
  太陰: { label: '月華命', tagline: '陰柔內斂, 直覺敏銳', traits: ['內斂', '直覺', '溫柔'] },
  貪狼: { label: '桃花命', tagline: '多才多藝, 慾望強烈', traits: ['多才', '熱情', '貪求'] },
  巨門: { label: '口才命', tagline: '善辯多疑, 是非交織', traits: ['口才', '多疑', '深思'] },
  天相: { label: '宰相命', tagline: '輔佐之星, 公正無私', traits: ['公正', '溫和', '輔佐'] },
  天梁: { label: '蔭德命', tagline: '逢凶化吉, 老成持重', traits: ['庇蔭', '正直', '清高'] },
  七殺: { label: '將星命', tagline: '殺破狼之首, 開疆闢土', traits: ['果敢', '獨立', '剛烈'] },
  破軍: { label: '開創命', tagline: '破而後立, 革故鼎新', traits: ['開創', '叛逆', '激烈'] },
};

/**
 * Doubles get their own label when both stars are in 命宮 — these are the
 * named格局 most 紫微 readers actually invoke in conversation.
 */
const DOUBLE_KEY = (stars: string[]) => stars.slice().sort().join('+');

const DOUBLES: Record<string, Archetype> = {
  [DOUBLE_KEY(['紫微', '天府'])]: { label: '紫府同宮', tagline: '帝庫並坐, 富貴雙全', traits: ['尊貴', '聚財', '穩健'] },
  [DOUBLE_KEY(['紫微', '貪狼'])]: { label: '紫貪同宮', tagline: '帝王好桃花, 慾望中見格局', traits: ['魅力', '野心', '多情'] },
  [DOUBLE_KEY(['紫微', '七殺'])]: { label: '紫殺同宮', tagline: '化氣為權, 開疆有威', traits: ['霸氣', '果決', '孤獨'] },
  [DOUBLE_KEY(['紫微', '破軍'])]: { label: '紫破同宮', tagline: '破立並見, 變動中得權', traits: ['革新', '不安', '魄力'] },
  [DOUBLE_KEY(['紫微', '天相'])]: { label: '紫相同宮', tagline: '帝相相佐, 名重一方', traits: ['尊貴', '公正', '受用'] },
  [DOUBLE_KEY(['天機', '太陰'])]: { label: '機陰同宮', tagline: '機巧內斂, 多謀善感', traits: ['機敏', '溫柔', '善變'] },
  [DOUBLE_KEY(['天機', '巨門'])]: { label: '機巨同宮', tagline: '口才機智並見, 善辯多變', traits: ['辯才', '機敏', '多疑'] },
  [DOUBLE_KEY(['天機', '天梁'])]: { label: '機梁同宮', tagline: '善謀又得蔭, 老成有智', traits: ['深謀', '清高', '老成'] },
  [DOUBLE_KEY(['太陽', '太陰'])]: { label: '日月同宮', tagline: '陰陽並坐, 矛盾中見格局', traits: ['雙面', '光熱', '柔情'] },
  [DOUBLE_KEY(['太陽', '巨門'])]: { label: '日巨同宮', tagline: '光明而善辯, 異域多得', traits: ['口才', '光明', '辛勞'] },
  [DOUBLE_KEY(['太陽', '天梁'])]: { label: '日梁同宮', tagline: '光輝庇蔭, 利他成名', traits: ['磊落', '庇蔭', '利他'] },
  [DOUBLE_KEY(['武曲', '天府'])]: { label: '武府同宮', tagline: '財星並坐, 富甲一方', traits: ['財運', '剛實', '穩健'] },
  [DOUBLE_KEY(['武曲', '貪狼'])]: { label: '武貪同宮', tagline: '剛中帶柔, 偏財格局', traits: ['偏財', '熱情', '果決'] },
  [DOUBLE_KEY(['武曲', '七殺'])]: { label: '武殺同宮', tagline: '雙剛並見, 武職顯赫', traits: ['剛烈', '武勇', '孤獨'] },
  [DOUBLE_KEY(['武曲', '破軍'])]: { label: '武破同宮', tagline: '破壞中見財, 動中得利', traits: ['動盪', '魄力', '辛勞'] },
  [DOUBLE_KEY(['武曲', '天相'])]: { label: '武相同宮', tagline: '剛柔並濟, 財官並美', traits: ['穩健', '公正', '財官'] },
  [DOUBLE_KEY(['天同', '太陰'])]: { label: '同陰同宮', tagline: '溫柔好福, 安享之命', traits: ['溫和', '享受', '柔情'] },
  [DOUBLE_KEY(['天同', '巨門'])]: { label: '同巨同宮', tagline: '福中藏暗, 是非交織', traits: ['口舌', '溫和', '心事'] },
  [DOUBLE_KEY(['天同', '天梁'])]: { label: '同梁同宮', tagline: '福蔭並見, 安和有助', traits: ['福德', '庇蔭', '安和'] },
  [DOUBLE_KEY(['廉貞', '天府'])]: { label: '廉府同宮', tagline: '剛柔交織, 內有府庫', traits: ['沉穩', '聚財', '矛盾'] },
  [DOUBLE_KEY(['廉貞', '貪狼'])]: { label: '廉貪同宮', tagline: '雙桃花並見, 情關難避', traits: ['熱情', '多慾', '糾結'] },
  [DOUBLE_KEY(['廉貞', '七殺'])]: { label: '廉殺同宮', tagline: '剛烈刑剋, 動靜兩極', traits: ['剛烈', '極端', '果決'] },
  [DOUBLE_KEY(['廉貞', '破軍'])]: { label: '廉破同宮', tagline: '破壞中見桃花, 動盪多情', traits: ['動盪', '多情', '波折'] },
  [DOUBLE_KEY(['廉貞', '天相'])]: { label: '廉相同宮', tagline: '剛柔輔佐, 公正中見熱情', traits: ['公正', '熱情', '矛盾'] },
};

const MAIN_STAR_SET = new Set<string>([
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
]);

function mingongMainStars(chart: Chart): MainStar[] {
  const ming = chart.palaces.find((p) => p.isMingong);
  if (!ming) return [];
  return ming.stars
    .filter((s: PlacedStar) => MAIN_STAR_SET.has(s.name))
    .map((s) => s.name as MainStar);
}

/**
 * Derive the user's archetype label. Pure function — no DB, no I/O.
 *
 * Rules:
 *  - 0 main stars in 命宮 → 隱曜命 (fallback)
 *  - 1 main star → SINGLE map
 *  - 2 main stars matching a named DOUBLE → that格局
 *  - 2 main stars no named格局 → first star's SINGLE
 *  - 3+ stars (rare via 借星) → highest-precedence single
 */
export function deriveArchetype(chart: Chart): Archetype {
  const stars = mingongMainStars(chart);
  if (stars.length === 0) return FALLBACK;
  if (stars.length === 1) return SINGLE[stars[0]];

  if (stars.length === 2) {
    const dbl = DOUBLES[DOUBLE_KEY(stars)];
    if (dbl) return dbl;
    return SINGLE[stars[0]];
  }

  // Precedence: 紫微 > 天府 > 武曲 > 廉貞 > 七殺 > 破軍 > 貪狼 > rest
  const order: MainStar[] = ['紫微', '天府', '武曲', '廉貞', '七殺', '破軍', '貪狼'];
  for (const s of order) if (stars.includes(s)) return SINGLE[s];
  return SINGLE[stars[0]];
}

/** Compact stars-in-命宮 string for prompts. */
export function mingongStarsLine(chart: Chart): string {
  const ming = chart.palaces.find((p) => p.isMingong);
  if (!ming || ming.stars.length === 0) return '命宮無正曜 (借對宮星曜)';
  return ming.stars
    .map((s) => `${s.name}${s.brightness ?? ''}${s.transformation ? '化' + s.transformation : ''}`)
    .join('、');
}
