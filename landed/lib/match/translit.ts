// Bilingual bridge for cross-language blocking (Taobao/1688/JD 中文标题 ↔ Amazon/eBay
// English titles). The lexical prefilter in blocking.ts can only pair two listings
// that share tokens, but a Chinese title and an English title for the SAME product
// normally share none. This maps common brand + product-category terms to their
// latin equivalents so a CJK title also emits latin tokens that can overlap an
// English title (e.g. 小米手环9 → xiaomi + band, which overlaps "Xiaomi Smart Band 9").
//
// Heuristic and intentionally not exhaustive — it widens coverage for the highest-
// volume arbitrage categories (consumer electronics + small home appliances). When a
// GEMINI_API_KEY is set, the multimodal image judge remains the stronger matcher; this
// only affects which candidate pairs the judge gets to see.

// Chinese term → latin tokens it should also emit. Keys are matched as substrings of
// the normalized title, so keep them ≥2 chars and distinctive to avoid false hits.
export const CN_TO_LATIN: Record<string, string[]> = {
  // --- brands ---
  小米: ["xiaomi"],
  红米: ["redmi"],
  华为: ["huawei"],
  荣耀: ["honor"],
  苹果: ["apple"],
  三星: ["samsung"],
  索尼: ["sony"],
  罗技: ["logitech"],
  安克: ["anker"],
  大疆: ["dji"],
  戴森: ["dyson"],
  飞利浦: ["philips"],
  松下: ["panasonic"],
  美的: ["midea"],
  九阳: ["joyoung"],
  华硕: ["asus"],
  联想: ["lenovo"],
  雷蛇: ["razer"],
  漫步者: ["edifier"],
  森海塞尔: ["sennheiser"],
  铁三角: ["audio-technica"],
  倍思: ["baseus"],
  绿联: ["ugreen"],
  品胜: ["pisen"],
  博世: ["bosch"],
  飞科: ["flyco"],
  科沃斯: ["ecovacs"],
  石头: ["roborock"],
  // --- product categories ---
  智能手表: ["smartwatch", "smart", "watch"],
  手表: ["watch"],
  手环: ["band"],
  智能: ["smart"],
  运动: ["sport"],
  蓝牙耳机: ["earbuds", "bluetooth"],
  无线耳机: ["earbuds", "wireless"],
  降噪耳机: ["headphones", "noise-cancelling"],
  耳机: ["earphones", "earbuds", "headphones"],
  无线: ["wireless"],
  蓝牙: ["bluetooth"],
  充电宝: ["powerbank"],
  移动电源: ["powerbank"],
  电热水壶: ["kettle"],
  热水壶: ["kettle"],
  吹风机: ["hairdryer", "dryer"],
  数据线: ["cable"],
  充电线: ["cable"],
  充电器: ["charger"],
  键盘: ["keyboard"],
  鼠标: ["mouse"],
  音箱: ["speaker"],
  摄像头: ["camera"],
  相机: ["camera"],
  路由器: ["router"],
  电动牙刷: ["toothbrush"],
  剃须刀: ["shaver"],
  空气炸锅: ["airfryer"],
  扫地机器人: ["robot", "vacuum"],
  吸尘器: ["vacuum"],
  加湿器: ["humidifier"],
  平板: ["tablet"],
  手机壳: ["case"],
  腕带: ["strap", "band"],
  表带: ["strap", "band"],
};

/**
 * Latin tokens implied by any Chinese brand/category terms present in the title.
 * Returns [] for a title with no recognized CJK terms (e.g. an already-English title).
 */
export function latinBridgeTokens(normalizedTitle: string): string[] {
  const out: string[] = [];
  for (const cn in CN_TO_LATIN) {
    if (normalizedTitle.includes(cn)) out.push(...CN_TO_LATIN[cn]);
  }
  return out;
}
