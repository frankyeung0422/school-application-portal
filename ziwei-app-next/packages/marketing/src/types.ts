/**
 * @ziwei/marketing — types.
 *
 * Content strategy: every post must drive urgency to act. Educational
 * lecture posts do not earn the brand any revenue. The QC agent scores
 * drafts on the conversion hooks below and rejects anything < 7 average.
 *
 * See: CONTENT_STRATEGY.md
 */

export type Channel = 'fb' | 'ig' | 'threads' | 'tiktok' | 'yt-shorts' | 'xhs';

export type Slot = 'morning' | 'evening';

/**
 * Content patterns ordered by *conversion intent*, not surface format.
 * Every template must produce a post that ends in a clear CTA pointing
 * back to a paywalled product moment.
 */
export type ContentType =
  | 'urgency-daily-warning'     // "今日生肖五行X, 主Y, 速看完整命盤"
  | 'urgency-period-window'     // "本月行運入X宮, 重大轉折期, 命盤可知"
  | 'fear-loss-aversion'        // "命盤未看清前, 不要做這三件事"
  | 'social-proof-testimonial'  // "上週用戶X看完命盤, 避開Y, 親述"
  | 'social-proof-celebrity'    // "[celebrity] 的命盤揭示..."
  | 'curiosity-gap-quiz'        // "你的命宮主星是?三題立刻知道"
  | 'curiosity-gap-comparison'  // "紫微 vs 武曲坐命, 你是哪一型?"
  | 'reveal-myth-bust'          // "你以為的XX, 其實命理上是YY"
  | 'reveal-zodiac-month'       // "5月XX生肖必看, 三件事不能拖"
  | 'reveal-education-hook';    // educational, but with strong "what does YOURS say?" hook

export interface NormalizedPost {
  id: string;
  scheduledAt: Date;
  channels: Channel[];
  contentType: ContentType;
  headline: string;       // Hook line, 1 sentence, max 60 字
  body: string;           // Main copy, end-with-CTA
  cta: string;            // explicit CTA copy
  ctaUrl: string;         // with UTM
  hashtags: string[];
  imagePath?: string;     // SVG-template or DALL-E output
  videoPath?: string;
  utm: {
    source: Channel;
    medium: 'social';
    campaign: string;
    content: string;      // post id for A/B attribution
  };
}

export interface QCScores {
  accuracy: number;        // 0-10: factual correctness about ziwei/bazi claims
  brandFit: number;        // 0-10: matches premium-mystical voice
  urgency: number;         // 0-10: drives feel-need-to-act-now
  conversionHook: number;  // 0-10: ends with clear paywalled CTA
  factualClaimRisk: number; // 0-10: avoids unfalsifiable health/legal/financial promises
  religiousSensitivity: number; // 0-10: respectful, no other-faith mockery
  aiTellRisk: number;      // 0-10: free of "as an AI", em-dashes, lecture tone
  /** Average; <7 → requires human review. */
  overall: number;
  notes: string[];
}

export interface ChannelAdapter {
  name: Channel;
  publish(post: NormalizedPost): Promise<{ remoteId: string; url?: string }>;
  checkConnection(): Promise<{ ok: boolean; details?: unknown }>;
}
