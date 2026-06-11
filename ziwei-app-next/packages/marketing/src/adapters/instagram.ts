import type { ChannelAdapter, NormalizedPost } from '../types';

/**
 * Instagram Business publisher via Meta Graph API.
 *
 * Two-step publishing flow:
 *   1. POST /{ig-user-id}/media   → returns creation_id (container)
 *   2. POST /{ig-user-id}/media_publish with creation_id
 *
 * Required env:
 *   INSTAGRAM_USER_ID         — IG Business Account id (NOT the page id)
 *   FB_PAGE_ACCESS_TOKEN      — Page Access Token with `instagram_basic` + `instagram_content_publish`
 *   FB_GRAPH_VERSION          — defaults to v21.0
 *
 * IG REQUIRES an image or video. Text-only posts are not supported by the
 * Graph API. If the post has no image_path, this adapter throws.
 */

const GRAPH = () => `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION || 'v21.0'}`;

function getCreds() {
  const igUserId = process.env.INSTAGRAM_USER_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN || process.env.FB_PAGE_TOKEN;
  if (!igUserId) throw new Error('INSTAGRAM_USER_ID not configured');
  if (!token) throw new Error('FB_PAGE_ACCESS_TOKEN not configured');
  return { igUserId, token };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function composeCaption(post: NormalizedPost): string {
  const body = post.body.trim();
  const cta = `${post.cta.trim()}\n${post.ctaUrl}`;
  const tags = post.hashtags.join(' ');
  return [body, cta, tags].filter(Boolean).join('\n\n');
}

export const instagramAdapter: ChannelAdapter = {
  name: 'ig',

  async publish(post: NormalizedPost) {
    const { igUserId, token } = getCreds();
    if (!post.imagePath) {
      throw new Error('Instagram requires an image (post.imagePath missing). Generate via packages/marketing/templates first.');
    }
    const caption = composeCaption(post);
    const imageUrl = post.imagePath.startsWith('http')
      ? post.imagePath
      : `${process.env.NEXT_PUBLIC_APP_URL}${post.imagePath}`;

    // Step 1: create media container
    const containerRes = await fetch(`${GRAPH()}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
    });
    const containerData = (await safeJson(containerRes)) as { id?: string; error?: { message: string } };
    if (!containerRes.ok || containerData.error) {
      throw new Error(`IG container create failed: ${containerData.error?.message ?? JSON.stringify(containerData)}`);
    }
    if (!containerData.id) throw new Error('IG returned no container id');

    // Step 2: publish container
    const publishRes = await fetch(`${GRAPH()}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
    });
    const publishData = (await safeJson(publishRes)) as { id?: string; error?: { message: string } };
    if (!publishRes.ok || publishData.error) {
      throw new Error(`IG publish failed: ${publishData.error?.message ?? JSON.stringify(publishData)}`);
    }
    if (!publishData.id) throw new Error('IG returned no media id');

    return {
      remoteId: publishData.id,
      url: `https://www.instagram.com/p/${publishData.id}`, // approximate
    };
  },

  async checkConnection() {
    try {
      const { igUserId, token } = getCreds();
      const res = await fetch(
        `${GRAPH()}/${igUserId}?fields=id,username,followers_count&access_token=${encodeURIComponent(token)}`,
      );
      const data = (await safeJson(res)) as { id?: string; username?: string; followers_count?: number; error?: unknown };
      if (!res.ok || data.error) return { ok: false, details: data };
      return { ok: true, details: { igUserId: data.id, username: data.username, followers: data.followers_count } };
    } catch (err) {
      return { ok: false, details: (err as Error).message };
    }
  },
};
