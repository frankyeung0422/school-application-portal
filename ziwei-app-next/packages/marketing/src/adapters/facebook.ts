import type { ChannelAdapter, NormalizedPost } from '../types';

/**
 * Real Facebook Page poster via Graph API v21.0.
 *
 * Required env (read at call time, not import):
 *   FB_PAGE_ID         — numeric page id
 *   FB_PAGE_ACCESS_TOKEN — long-lived Page Access Token
 *   FB_GRAPH_VERSION   — defaults to v21.0
 *
 * Posts are text-only for now (image/video support lands when SVG template
 * compositor is wired up in P5 — see CONTENT_STRATEGY.md).
 */

const GRAPH = () => `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION || 'v21.0'}`;

function getCreds() {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN;
  if (!pageId) throw new Error('FB_PAGE_ID not configured');
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');
  return { pageId, token };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function composeMessage(post: NormalizedPost): string {
  const body = post.body.trim();
  const cta = post.cta.trim();
  const ctaLine = `${cta} ${post.ctaUrl}`;
  const tags = post.hashtags.join(' ');
  return [body, ctaLine, tags].filter(Boolean).join('\n\n');
}

export const facebookAdapter: ChannelAdapter = {
  name: 'fb',

  async publish(post: NormalizedPost) {
    const { pageId, token } = getCreds();
    const message = composeMessage(post);
    const url = `${GRAPH()}/${pageId}/feed`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: token }),
    });
    const data = (await safeJson(res)) as { id?: string; error?: { message: string } };
    if (!res.ok || data.error) {
      throw new Error(`FB publish failed: ${data.error?.message ?? JSON.stringify(data)}`);
    }
    if (!data.id) throw new Error('FB returned no post id');
    return {
      remoteId: data.id,
      url: `https://www.facebook.com/${data.id}`,
    };
  },

  async checkConnection() {
    try {
      const { pageId, token } = getCreds();
      const res = await fetch(
        `${GRAPH()}/${pageId}?fields=id,name,fan_count&access_token=${encodeURIComponent(token)}`,
      );
      const data = (await safeJson(res)) as { id?: string; name?: string; fan_count?: number; error?: unknown };
      if (!res.ok || data.error) return { ok: false, details: data };
      return { ok: true, details: { pageId: data.id, name: data.name, fans: data.fan_count } };
    } catch (err) {
      return { ok: false, details: (err as Error).message };
    }
  },
};
