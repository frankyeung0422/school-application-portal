import type { ChannelAdapter, NormalizedPost } from '../types';

/**
 * Threads publisher via Meta Threads Graph API.
 *
 * Two-step flow (same shape as IG):
 *   1. POST /{threads-user-id}/threads   → creation_id
 *   2. POST /{threads-user-id}/threads_publish with creation_id
 *
 * Required env:
 *   THREADS_USER_ID
 *   THREADS_ACCESS_TOKEN  — Threads-specific token (NOT the FB page token)
 *
 * Threads supports text-only posts (great for "tease + link" style).
 */

const GRAPH = () => 'https://graph.threads.net/v1.0';

function getCreds() {
  const userId = process.env.THREADS_USER_ID;
  const token = process.env.THREADS_ACCESS_TOKEN;
  if (!userId) throw new Error('THREADS_USER_ID not configured');
  if (!token) throw new Error('THREADS_ACCESS_TOKEN not configured');
  return { userId, token };
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function composeText(post: NormalizedPost): string {
  // Threads caption limit is 500 chars; keep tight for engagement.
  const body = post.body.trim();
  const cta = `${post.cta.trim()} ${post.ctaUrl}`;
  const tags = post.hashtags.slice(0, 3).join(' '); // fewer tags on Threads
  return [body, cta, tags].filter(Boolean).join('\n\n').slice(0, 480);
}

export const threadsAdapter: ChannelAdapter = {
  name: 'threads',

  async publish(post: NormalizedPost) {
    const { userId, token } = getCreds();
    const text = composeText(post);

    // Step 1: create thread container (TEXT only — IMAGE/VIDEO require image_url too)
    const params = new URLSearchParams({
      media_type: 'TEXT',
      text,
      access_token: token,
    });
    const createRes = await fetch(`${GRAPH()}/${userId}/threads`, {
      method: 'POST',
      body: params,
    });
    const createData = (await safeJson(createRes)) as { id?: string; error?: { message: string } };
    if (!createRes.ok || createData.error) {
      throw new Error(`Threads container failed: ${createData.error?.message ?? JSON.stringify(createData)}`);
    }
    if (!createData.id) throw new Error('Threads returned no container id');

    // Step 2: publish
    const publishParams = new URLSearchParams({
      creation_id: createData.id,
      access_token: token,
    });
    const publishRes = await fetch(`${GRAPH()}/${userId}/threads_publish`, {
      method: 'POST',
      body: publishParams,
    });
    const publishData = (await safeJson(publishRes)) as { id?: string; error?: { message: string } };
    if (!publishRes.ok || publishData.error) {
      throw new Error(`Threads publish failed: ${publishData.error?.message ?? JSON.stringify(publishData)}`);
    }
    if (!publishData.id) throw new Error('Threads returned no media id');

    return {
      remoteId: publishData.id,
      url: `https://www.threads.net/@${userId}/post/${publishData.id}`,
    };
  },

  async checkConnection() {
    try {
      const { userId, token } = getCreds();
      const res = await fetch(
        `${GRAPH()}/${userId}?fields=id,username,threads_profile_picture_url&access_token=${encodeURIComponent(token)}`,
      );
      const data = (await safeJson(res)) as { id?: string; username?: string; error?: unknown };
      if (!res.ok || data.error) return { ok: false, details: data };
      return { ok: true, details: { userId: data.id, username: data.username } };
    } catch (err) {
      return { ok: false, details: (err as Error).message };
    }
  },
};
