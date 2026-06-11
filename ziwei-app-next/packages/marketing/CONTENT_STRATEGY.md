# Content Strategy — @ziwei/marketing

## North-star principle

**Every post must produce urgency to pay.** Educational lecture posts do not earn the brand any revenue. If a draft would feel at home on a free zodiac blog, it has failed.

The user feedback that drove this rule (2026-05-16):

> the marketing plan should be something to promote and make the audience feel like having urgency to pay and get the answer

## The 4-beat structure (every post)

Every post — every channel, every format — follows this 4-beat structure:

1. **Time-bounded hook** (今日/本週/本月/立刻) — establish that this matters NOW
2. **Stakes / loss aversion** — what they LOSE by not knowing, not what they gain by knowing
3. **1 specific tease** — one concrete, verifiable, curiosity-opening claim. Never vague blessings.
4. **Tight CTA** to a paywalled moment — `/sample` (free reading hook) or `/pricing` (intent shown)

If a draft is missing any beat, the QC agent fails it.

## Content types (priority order)

| Type | What it does | Best channel | Frequency |
|------|--------------|--------------|-----------|
| `urgency-daily-warning` | Today's chi flags 3 zodiacs (1 good, 1 mid, 1 caution) | All | Daily AM |
| `urgency-period-window` | "This month's chart enters palace X" | FB, Threads | Monthly |
| `fear-loss-aversion` | "Don't do these 3 things until you've seen your chart" | FB, IG | Weekly |
| `social-proof-testimonial` | User saw chart → avoided X (marked as 示例) | FB, IG | Bi-weekly |
| `social-proof-celebrity` | "[Celebrity]'s chart shows..." (Wikipedia data only) | FB, IG, XHS | Weekly |
| `curiosity-gap-quiz` | "3 questions → your main star" | IG, Threads | Weekly |
| `curiosity-gap-comparison` | "紫微 vs 武曲: which are you?" | IG, Threads | Weekly |
| `reveal-myth-bust` | "You think X but ziwei says Y" | All | Weekly |
| `reveal-zodiac-month` | "This month, [zodiac] must..." | All | Monthly per zodiac |
| `reveal-education-hook` | Concept explainer ending in "what does YOURS say?" | All | 2-3x per week |

## Forbidden patterns

- ❌ Medical claims (cure, heal, lifespan)
- ❌ Legal or specific investment advice
- ❌ Mockery of other faiths or schools
- ❌ Personalized predictions about specific named individuals without consent
- ❌ Pure educational posts ending with "I hope this was helpful" (no urgency, no CTA)
- ❌ Em-dashes, "as an AI", "please note", "dear reader", "I'm so excited to share"
- ❌ Generic blessings ("祝大家好運")
- ❌ Calls to "follow for more" without a paywalled destination

## CTA URLs (UTM-tagged)

Every CTA URL is constructed via the scheduler:

```
https://aifortunetelling.org/sample?utm_source={channel}&utm_medium=social&utm_campaign={contentType}&utm_content={postId}
```

PostHog dashboards group by `utm_source` × `utm_campaign` to surface what's actually converting.

## A/B testing

Every template emits 2 variants per scheduled date. Adapter publishes A to 50% of cross-platform set, B to other 50%. After 24h, the scheduler measures clicks via UTM → conversions → retains the winning headline for the next cycle.

## QC agent gate

Before publish, every draft passes through `qc-agent.ts` (Claude Opus 4.7, low temp). Scores 7 dimensions:

- accuracy (factual ziwei/bazi correctness)
- brandFit (premium-mystical voice)
- urgency (does it drive act-now?)
- conversionHook (does it end with paywalled CTA?)
- factualClaimRisk (safe = no unverifiable claims)
- religiousSensitivity (safe = respectful)
- aiTellRisk (safe = no AI tells)

Average < 7 → queued at `/admin/content-queue` for human review. Average ≥ 7 → auto-publish (when `MARKETING_AUTOPUBLISH=true`).

## Channel-specific tweaks

| Channel | Tweaks |
|---------|--------|
| FB | Long-form OK (80-120 字), link in post body, image required |
| IG | Square or 4:5 image, caption ≤ 125 字 before "more", first line is hook, link in bio |
| Threads | 30-60 字, threaded post for longer ideas (max 3 thread items) |
| TikTok | 30-second vertical video, on-screen captions, voice TTS via ElevenLabs |
| YT Shorts | Same as TikTok asset, with description containing UTM CTA |
| XHS (小紅書) | 3-9 image carousel preferred; text caption short, hashtags many |
