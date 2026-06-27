/**
 * Code-based 十八反/十九畏 classical herb incompatibility checker.
 * Works on herb names without DB lookups — covers all herbs regardless of seed state.
 * Matching: any herb whose chineseName CONTAINS the target string, or pinyinName matches.
 */

export interface ClassicalWarning {
  type: "十八反" | "十九畏";
  herb1: string;
  herb2: string;
  severity: "CONTRAINDICATED" | "CAUTION";
  description: string;
  classicalSource: string;
}

interface PairDef {
  type: "十八反" | "十九畏";
  severity: "CONTRAINDICATED" | "CAUTION";
  aNames: string[];   // any herb matching any of these Chinese substrings is "herb A"
  bNames: string[];   // any herb matching any of these Chinese substrings is "herb B"
  description: string;
  classicalSource: string;
}

const PAIRS: PairDef[] = [
  // ══ 十八反 ═══════════════════════════════════════════════════════════════
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["甘草", "甘甘草", "炙甘草", "生甘草"],
    bNames: ["甘遂"],
    description: "甘草反甘遂：合用可增加甘遂毒副作用，引起嚴重腹瀉、腹痛、電解質紊亂。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["甘草", "炙甘草", "生甘草"],
    bNames: ["大戟", "京大戟"],
    description: "甘草反大戟：合用可增加大戟刺激性毒性，導致嚴重嘔吐、腹瀉、脫水。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["甘草", "炙甘草", "生甘草"],
    bNames: ["海藻"],
    description: "甘草反海藻：二者藥性相反，合用可能引起不良反應，古籍明確列為禁忌。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["甘草", "炙甘草", "生甘草"],
    bNames: ["芫花"],
    description: "甘草反芫花：芫花毒性較強，與甘草合用可增加毒性反應。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["烏頭", "川烏", "草烏", "附子", "天雄", "側子"],
    bNames: ["半夏", "法半夏", "制半夏", "薑半夏", "清半夏"],
    description: "烏頭反半夏：合用可增加烏頭鹼毒性，引起心律失常、呼吸抑制等嚴重不良反應。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["烏頭", "川烏", "草烏", "附子", "天雄", "側子"],
    bNames: ["瓜蔞", "天花粉", "栝樓"],
    description: "烏頭反瓜蔞（含天花粉）：合用可能增加心臟毒性，屬十八反禁忌。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["烏頭", "川烏", "草烏", "附子", "天雄", "側子"],
    bNames: ["貝母", "川貝母", "浙貝母", "平貝母"],
    description: "烏頭反貝母：合用可能增加烏頭鹼毒性，導致心臟毒性。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["烏頭", "川烏", "草烏", "附子", "天雄", "側子"],
    bNames: ["白蘞"],
    description: "烏頭反白蘞：屬十八反之列，合用有增毒風險。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["烏頭", "川烏", "草烏", "附子", "天雄", "側子"],
    bNames: ["白及"],
    description: "烏頭反白及：屬十八反之列，二者合用有增毒風險，臨床一般禁用。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["人參", "黨參", "西洋參", "太子參"],
    description: "藜蘆反人參（含黨參、西洋參等）：藜蘆含強心苷類，與人參強心作用疊加可引起嚴重心臟毒性。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["沙參", "南沙參", "北沙參"],
    description: "藜蘆反沙參：屬十八反之列，古籍明確列為配伍禁忌。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["丹參"],
    description: "藜蘆反丹參：藥理機制複雜，歷代醫家嚴格遵循此配伍禁忌。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["玄參"],
    description: "藜蘆反玄參：屬十八反之列。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["細辛"],
    description: "藜蘆反細辛：二者均有一定毒性，合用有增毒風險。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  {
    type: "十八反", severity: "CONTRAINDICATED",
    aNames: ["藜蘆"],
    bNames: ["芍藥", "白芍", "赤芍"],
    description: "藜蘆反芍藥（白芍、赤芍）：屬十八反之列。",
    classicalSource: "神農本草經集注·陶弘景「十八反」",
  },
  // ══ 十九畏 ═══════════════════════════════════════════════════════════════
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["硫黃"],
    bNames: ["朴硝", "芒硝", "玄明粉"],
    description: "硫黃畏朴硝：硫黃與朴硝化學性質相反，合用可能影響療效或發生反應。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["水銀"],
    bNames: ["砒霜", "砒石"],
    description: "水銀畏砒霜：均為劇毒之品，合用毒性疊加，現代臨床極少使用。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["狼毒"],
    bNames: ["密陀僧"],
    description: "狼毒畏密陀僧：屬十九畏之列。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["巴豆", "巴豆霜"],
    bNames: ["牽牛子", "黑醜", "白醜"],
    description: "巴豆畏牽牛：兩者均有峻下作用，合用瀉下過烈，臨床一般禁用。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["丁香", "母丁香"],
    bNames: ["鬱金", "廣鬱金"],
    description: "丁香畏鬱金：丁香辛溫，鬱金辛苦寒，藥性相畏，合用可能影響療效。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["川烏", "草烏", "烏頭", "附子"],
    bNames: ["犀角", "水牛角"],
    description: "川烏（草烏）畏犀角：古代禁忌，現代臨床中犀角已改用水牛角代替，仍需注意。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["牙硝", "朴硝", "芒硝"],
    bNames: ["三棱"],
    description: "牙硝（朴硝）畏三棱：屬十九畏之列。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["官桂", "肉桂", "桂枝"],
    bNames: ["赤石脂", "白石脂"],
    description: "官桂（肉桂）畏赤石脂：肉桂性大熱走散，赤石脂性收斂固澀，藥性相反。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
  {
    type: "十九畏", severity: "CAUTION",
    aNames: ["人參", "黨參", "西洋參"],
    bNames: ["五靈脂"],
    description: "人參畏五靈脂：五靈脂可降低人參補氣療效。臨床一般不同時使用（某些特殊方劑如失笑散合參有例外）。",
    classicalSource: "醫經小學·劉純「十九畏」",
  },
];

function herbMatches(herbChinese: string, targets: string[]): boolean {
  const h = herbChinese.trim();
  return targets.some((t) => h.includes(t) || t.includes(h));
}

/**
 * Check a list of herbs for 十八反/十九畏 classical incompatibilities.
 * @param herbs Array of herb objects with at minimum a chineseName field.
 */
export function checkClassicalIncompatibilities(
  herbs: Array<{ chineseName: string; pinyinName: string }>
): ClassicalWarning[] {
  if (herbs.length < 2) return [];

  const warnings: ClassicalWarning[] = [];
  const seen = new Set<string>();

  for (const pair of PAIRS) {
    const herbsA = herbs.filter((h) => herbMatches(h.chineseName, pair.aNames));
    const herbsB = herbs.filter((h) => herbMatches(h.chineseName, pair.bNames));

    for (const a of herbsA) {
      for (const b of herbsB) {
        const key = [pair.type, a.chineseName, b.chineseName].sort().join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push({
          type: pair.type,
          herb1: a.chineseName,
          herb2: b.chineseName,
          severity: pair.severity,
          description: pair.description,
          classicalSource: pair.classicalSource,
        });
      }
    }
  }

  return warnings.sort((a, b) =>
    a.severity === "CONTRAINDICATED" && b.severity !== "CONTRAINDICATED" ? -1 :
    b.severity === "CONTRAINDICATED" && a.severity !== "CONTRAINDICATED" ? 1 : 0
  );
}
