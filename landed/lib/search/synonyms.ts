// Words people use interchangeably when they shop. Each group is one concept;
// the FIRST latin member is its canonical form (used for query signatures).
// Chinese members are written in Simplified because every string is folded to
// Simplified before matching (see foldText in ./fuzzy.ts) — 耳機 and 耳机 both
// land on 耳机. Pure data; tests/fuzzy.test.ts.

export const SYNONYM_GROUPS: string[][] = [
  // electronics
  ["earbuds", "earphones", "earphone", "headphones", "headphone", "headset", "耳机"],
  ["phone", "smartphone", "mobile", "手机"],
  ["charger", "充电器", "叉电器", "火牛"],
  ["powerbank", "尿袋", "充电宝", "移动电源"],
  ["cable", "数据线", "充电线"],
  ["watch", "smartwatch", "手表", "腕表"],
  ["band", "手环"],
  ["laptop", "notebook", "笔记本电脑", "手提电脑"],
  ["tablet", "ipad", "平板"],
  ["tv", "television", "电视"],
  ["speaker", "音箱", "喇叭"],
  ["keyboard", "键盘"],
  ["mouse", "鼠标"],
  ["camera", "相机", "摄像头"],
  ["router", "路由器"],
  ["case", "手机壳", "保护壳"],
  // home appliances
  ["vacuum", "吸尘器", "吸尘机"],
  ["kettle", "热水壶", "电热水壶", "水煲"],
  ["hairdryer", "dryer", "风筒", "吹风机"],
  ["airfryer", "空气炸锅"],
  ["fridge", "refrigerator", "雪柜", "冰箱"],
  ["aircon", "空调", "冷气机"],
  ["humidifier", "加湿器"],
  ["toothbrush", "牙刷"],
  ["shaver", "razor", "剃须刀", "须刨"],
  // groceries / personal care (supermarket feed titles)
  ["tissue", "纸巾", "面纸"],
  ["toilet", "卫生纸", "厕纸"],
  ["shampoo", "洗发水", "洗头水"],
  ["toothpaste", "牙膏"],
  ["detergent", "洗衣液", "洗衣粉"],
  ["milk", "牛奶"],
  ["soymilk", "豆奶"],
  ["noodles", "noodle", "即食面", "公仔面"],
  ["vitasoy", "维他奶"],
  ["colgate", "高露洁"],
  ["nissin", "日清"],
  ["darlie", "黑人"],
];

const GROUP_OF = new Map<string, number>();
SYNONYM_GROUPS.forEach((g, i) => g.forEach((w) => GROUP_OF.set(w, i)));

const isLatin = (w: string) => /^[a-z0-9-]+$/.test(w);

/** Every other way to say `word` (empty when it has no group). */
export function synonymsOf(word: string): string[] {
  const g = GROUP_OF.get(word);
  return g == null ? [] : SYNONYM_GROUPS[g].filter((w) => w !== word);
}

/** Canonical latin form of a latin word, or the word itself. */
export function canonicalLatin(word: string): string {
  const g = GROUP_OF.get(word);
  if (g == null) return word;
  return SYNONYM_GROUPS[g].find(isLatin) ?? word;
}

/** CJK synonym entries (≥2 chars, to avoid single-character false hits) and their canonical latin word. */
export const CJK_SYNONYMS: [string, string][] = SYNONYM_GROUPS.flatMap((g) => {
  const canon = g.find(isLatin);
  return canon ? g.filter((w) => !isLatin(w) && w.length >= 2).map((w) => [w, canon] as [string, string]) : [];
});
