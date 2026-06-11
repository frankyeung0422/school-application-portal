import type { ContentType } from '../types';

/**
 * Content templates — every prompt produces a post that drives URGENCY
 * and points to a paywalled moment.
 *
 * Voice rules baked into every template:
 *  - Open with a specific, time-bounded hook (今日, 本月, 本週)
 *  - Establish stakes (what they LOSE by not knowing)
 *  - Tease specific insight (1 concrete claim, not vague)
 *  - End with a tight CTA pointing to /sample or /pricing
 *  - Tone: scholarly authority + warmth, never lecture, never AI-tell
 */

interface TemplateInput {
  zodiac?: string;
  month?: number;
  day?: number;
  weekday?: number;
  celebrity?: string;
}

interface TemplateOutput {
  systemPrompt: string;
  userPrompt: string;
}

const SHARED_SYSTEM = `
你是「紫微閣」的內容主筆 — 結合千年命理智慧與現代心理洞察的高端品牌。

**寫作鐵律 (每條必守, 違者即廢稿)**：
1. 開首必含時間錨點 (今日 / 本週 / 本月 / 立刻), 製造迫切感
2. 必須提出「不知道會錯過什麼」的損失感, 而非「知道有多好」
3. 提出 1 個具體、可驗證、引人好奇的命理事實 (非空泛祝福)
4. 結尾必含明確 CTA, 指向 https://aifortunetelling.org/sample 或 /pricing
5. 字數: 60-120 字 (FB/IG); 30-60 字 (Threads); 配 hashtag 4-6 個
6. 語氣: 智者 + 朋友, 不教訓不說教, 絕無 "作為一個AI"、"請注意"、"親愛的讀者" 等 AI 口頭禪
7. 不使用破折號 (— 或 ——), 不使用感嘆號連發, 不使用無意義 emoji
8. 紫微/八字術語要正確, 但要附上 1 句現代化解釋讓非命理愛好者也看得懂

**禁止的內容**：
- 醫療斷言 (如「定治百病」、「壽元XX年」)
- 法律 / 投資建議
- 其他宗教 / 流派的負面評論
- 未經當事人同意的個人化預測
`.trim();

export const TEMPLATES: Record<ContentType, (input: TemplateInput) => TemplateOutput> = {
  'urgency-daily-warning': ({ zodiac, weekday }) => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
今日是星期${weekday}, ${zodiac ?? '[填入今日當值生肖]'}日。
請撰寫一則今日運勢警示貼文 — 點出今日五行氣場對 3 個生肖的具體影響 (1個吉/1個中/1個凶),
凶者要提出具體要避開的事 (不超過 1 句), 並引導讀者 "看自己命盤更準" → /sample。
    `.trim(),
  }),

  'urgency-period-window': ({ month }) => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
${month}月行運入特定宮位,是 1 年中重要轉折期之一。請寫一則貼文點出本月命理大勢 —
明確指出 1 個 "本月必須留意" 的命理現象 (如某星化忌、某宮空亡), 並說明對一般人最容易出狀況的領域,
結尾 CTA: "你的命盤本月走到哪一宮?7天免費試用看完整流年" → /sample。
    `.trim(),
  }),

  'fear-loss-aversion': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
寫一則 "命盤未看清前, 不要做的 3 件事" 風格貼文。事件要具體 (如: 簽長期合約 / 大額投資 / 開公司 / 結婚),
解釋命理上為何特定命盤特別忌諱這些事 (但不指名特定命盤, 避免責任承擔), 結尾引導 "30 秒看你的命盤是否在警示期" → /sample。
    `.trim(),
  }),

  'social-proof-testimonial': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
撰寫一則用戶見證風格貼文 — 虛構 (聲明為示例) 一位香港/台灣中年用戶看了完整命盤後避開某事的情境,
引述 "她看完命盤後的決定" (3 句以內), 結尾 CTA: "今天就能看你自己的"。
**重要**: 開首必須有 (示例) 標註, 不可誤導讀者以為真實個案。
    `.trim(),
  }),

  'social-proof-celebrity': ({ celebrity }) => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
${celebrity ?? '[本週主打名人]'} 的紫微命盤揭示了哪 1 個關鍵特質?
請從命宮主星 + 1 個重要四化切入, 連結到該名人的公開人生選擇 (僅用維基百科可查的公開資料),
結尾 CTA: "想知道你的命宮跟誰相似?" → /sample。
    `.trim(),
  }),

  'curiosity-gap-quiz': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
寫一則 "3 題測你的命宮主星" 的好奇心缺口貼文。3 題要具體 (性格 / 行為 / 價值觀),
答案分流到 3-4 種主星類型 (紫微 / 武曲 / 廉貞 / 七殺 等), 結尾 CTA: "想知道真實答案?排出你的命盤" → /sample。
    `.trim(),
  }),

  'curiosity-gap-comparison': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
比較 2 個常見坐命主星 (如: 紫微 vs 武曲, 太陽 vs 太陰, 七殺 vs 破軍) 的性格 / 事業 / 感情差異,
每星 2 句, 結尾: "你是哪一型?排盤才有答案" → /sample。
    `.trim(),
  }),

  'reveal-myth-bust': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
打破 1 個關於紫微斗數的常見誤解 (如「化忌一定不好」、「七殺坐命人生坎坷」), 用 2 句正確說法澄清,
結尾: "想看你自己命盤真正的吉凶?" → /sample。
    `.trim(),
  }),

  'reveal-zodiac-month': ({ zodiac, month }) => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
本月 (${month}月) 屬${zodiac ?? '[填入]'}者必看 — 寫出 3 件本月必須處理 / 必須避免的事,
理由用紫微角度 (沖太歲 / 流年化忌 等), 結尾: "看你完整命盤怎麼說" → /sample。
    `.trim(),
  }),

  'reveal-education-hook': () => ({
    systemPrompt: SHARED_SYSTEM,
    userPrompt: `
解釋 1 個紫微概念 (如四化、大限、流年、三方四正), 用 80 字以內白話講清楚,
結尾必須是 "在你的命盤上, 這個概念如何展現?" → /sample。
**不可**寫成純教學 — 必須在最後 1 句轉回個人化。
    `.trim(),
  }),
};

/**
 * Weekly rotation — what content type runs which day, which slot.
 * Designed to mix urgency drivers throughout the week to avoid fatigue.
 */
export const WEEKLY_ROTATION: Record<number, Record<'morning' | 'evening', ContentType>> = {
  0: { morning: 'urgency-daily-warning',   evening: 'social-proof-celebrity' },  // Sun
  1: { morning: 'urgency-daily-warning',   evening: 'fear-loss-aversion' },      // Mon
  2: { morning: 'urgency-daily-warning',   evening: 'curiosity-gap-quiz' },      // Tue
  3: { morning: 'urgency-daily-warning',   evening: 'reveal-myth-bust' },        // Wed
  4: { morning: 'urgency-daily-warning',   evening: 'curiosity-gap-comparison' },// Thu
  5: { morning: 'urgency-daily-warning',   evening: 'urgency-period-window' },   // Fri
  6: { morning: 'reveal-zodiac-month',     evening: 'social-proof-testimonial' },// Sat
};
