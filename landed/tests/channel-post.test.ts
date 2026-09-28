import { describe, expect, it } from "vitest";
import { composeChannelPost, isIndexDay, CHANNEL_MAX_ITEMS, type ChannelItem } from "../lib/channel-post";

const item = (n: number, over: Partial<ChannelItem> = {}): ChannelItem => ({
  title: `Product ${n}`,
  url: `https://x/p/p${n}`,
  priceCents: 1990 + n,
  where: "惠康",
  why: "比 90 日平均平 20%",
  ...over,
});

describe("daily channel post", () => {
  it("lists at most five evidenced deals with links, disclosure and a staleness note", () => {
    const post = composeChannelPost([1, 2, 3, 4, 5, 6, 7].map((n) => item(n)), { dateLabel: "09-25", siteUrl: "https://x" })!;
    expect(post.issues).toEqual([]);
    expect(post.text.match(/https:\/\/x\/p\//g)).toHaveLength(CHANNEL_MAX_ITEMS);
    expect(post.text).toContain("聯盟連結");
    expect(post.text).toContain("可能已經變");
  });

  it("carries the index headline when given", () => {
    const post = composeChannelPost([item(1)], { dateLabel: "09-28", siteUrl: "https://x", indexLine: "🧺 本週超市指數：惠康最平" })!;
    expect(post.text).toContain("本週超市指數");
  });

  it("reports a banned claim instead of posting it", () => {
    const post = composeChannelPost([item(1, { title: "全港最平 AirPods" })], { dateLabel: "09-25", siteUrl: "https://x" })!;
    expect(post.issues.length).toBeGreaterThan(0);
  });

  it("posts nothing on a day with no evidenced deals", () => {
    expect(composeChannelPost([], { dateLabel: "09-25", siteUrl: "https://x" })).toBeNull();
  });

  it("Monday in Hong Kong is index day", () => {
    expect(isIndexDay(new Date("2026-09-27T17:00:00Z"))).toBe(true); // Mon 01:00 HKT
    expect(isIndexDay(new Date("2026-09-27T15:00:00Z"))).toBe(false); // Sun 23:00 HKT
  });
});
