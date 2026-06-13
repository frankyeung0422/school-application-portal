/**
 * Facebook Graph API client for Page posting.
 *
 * Required env vars:
 *   FB_PAGE_ID                 — numeric Page ID
 *   FB_PAGE_ACCESS_TOKEN       — long-lived Page Access Token
 *   FB_APP_ID                  — for token extension
 *   FB_APP_SECRET              — for token extension
 *
 * Setup: see SETUP-FB-AUTOMATION.md for token generation walkthrough.
 *
 * Graph API version: v19.0 (released 2024-01, stable through 2026-01)
 */

import fs from "node:fs/promises";

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION ?? "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function fbConfigured(): boolean {
  return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}

function requireConfig(): { pageId: string; token: string } {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    throw new Error(
      "Facebook not configured. Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env. See SETUP-FB-AUTOMATION.md.",
    );
  }
  return { pageId, token };
}

export interface PostOptions {
  message: string;
  imagePath?: string;       // local file path to PNG/JPG; if set, posts as photo
  scheduledFor?: Date;      // if set, schedules instead of publishing immediately
  firstCommentLink?: string; // posts a follow-up comment with this URL/text
}

export interface PostResult {
  ok: boolean;
  fbPostId?: string;
  fbPermalink?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Post a text-only update to the Page feed.
 */
async function postFeed(args: { message: string; scheduledFor?: Date; token: string; pageId: string }): Promise<Response> {
  const params = new URLSearchParams({
    message: args.message,
    access_token: args.token,
  });
  if (args.scheduledFor) {
    params.set("published", "false");
    params.set("scheduled_publish_time", String(Math.floor(args.scheduledFor.getTime() / 1000)));
  }
  return fetch(`${GRAPH_BASE}/${args.pageId}/feed`, {
    method: "POST",
    body: params,
  });
}

/**
 * Post a photo (with caption) to the Page.
 * Uses multipart upload of the local file.
 */
async function postPhoto(args: { message: string; imagePath: string; scheduledFor?: Date; token: string; pageId: string }): Promise<Response> {
  const fileBuf = await fs.readFile(args.imagePath);
  const filename = args.imagePath.split(/[/\\]/).pop() ?? "image.png";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

  const fd = new FormData();
  fd.append("caption", args.message);
  fd.append("access_token", args.token);
  if (args.scheduledFor) {
    fd.append("published", "false");
    fd.append("scheduled_publish_time", String(Math.floor(args.scheduledFor.getTime() / 1000)));
  }
  const blob = new Blob([new Uint8Array(fileBuf)], { type: mime });
  fd.append("source", blob, filename);

  return fetch(`${GRAPH_BASE}/${args.pageId}/photos`, {
    method: "POST",
    body: fd,
  });
}

/**
 * Add a comment to an already-posted item.
 */
async function postComment(args: { fbPostId: string; message: string; token: string }): Promise<Response> {
  const params = new URLSearchParams({
    message: args.message,
    access_token: args.token,
  });
  return fetch(`${GRAPH_BASE}/${args.fbPostId}/comments`, {
    method: "POST",
    body: params,
  });
}

export async function publish(opts: PostOptions): Promise<PostResult> {
  const { pageId, token } = requireConfig();

  try {
    const res = opts.imagePath
      ? await postPhoto({ message: opts.message, imagePath: opts.imagePath, scheduledFor: opts.scheduledFor, token, pageId })
      : await postFeed({ message: opts.message, scheduledFor: opts.scheduledFor, token, pageId });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 500)}` };
    }
    const json = (await res.json()) as { id?: string; post_id?: string };
    // Photo endpoint returns { id, post_id }; feed endpoint returns { id }.
    const id = json.post_id ?? json.id;
    if (!id) {
      return { ok: false, error: `No post ID in response: ${JSON.stringify(json).slice(0, 200)}` };
    }
    const permalink = `https://www.facebook.com/${id}`;

    // Best-effort first comment (only works for immediate publishes — scheduled
    // posts can't have comments until they go live).
    if (opts.firstCommentLink && !opts.scheduledFor) {
      try {
        await postComment({ fbPostId: id, message: opts.firstCommentLink, token });
      } catch {
        // Non-fatal
      }
    }

    return { ok: true, fbPostId: id, fbPermalink: permalink, raw: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Verify the token works + returns the Page's identity.
 */
export async function verifyToken(): Promise<{ ok: boolean; pageName?: string; error?: string }> {
  const { pageId, token } = requireConfig();
  try {
    const res = await fetch(`${GRAPH_BASE}/${pageId}?fields=name,id&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = (await res.json()) as { name?: string; id?: string };
    if (!json.id) return { ok: false, error: "no_id_in_response" };
    return { ok: true, pageName: json.name };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Exchange a short-lived User Access Token for a long-lived Page Access Token
 * that never expires. Used once during setup.
 */
export async function extendToLongLivedPageToken(args: {
  shortLivedUserToken: string;
  appId: string;
  appSecret: string;
  pageId: string;
}): Promise<{ ok: boolean; longLivedPageToken?: string; error?: string }> {
  try {
    // 1. Short-lived user token → long-lived user token
    const uTokRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${args.appId}&client_secret=${args.appSecret}&fb_exchange_token=${args.shortLivedUserToken}`,
    );
    if (!uTokRes.ok) {
      const body = await uTokRes.text().catch(() => "");
      return { ok: false, error: `step1 HTTP ${uTokRes.status}: ${body.slice(0, 300)}` };
    }
    const { access_token: longUserToken } = (await uTokRes.json()) as { access_token?: string };
    if (!longUserToken) return { ok: false, error: "step1: no access_token" };

    // 2. Long-lived user token → Page Access Token (never expires for this Page)
    const pTokRes = await fetch(
      `${GRAPH_BASE}/${args.pageId}?fields=access_token&access_token=${longUserToken}`,
    );
    if (!pTokRes.ok) {
      const body = await pTokRes.text().catch(() => "");
      return { ok: false, error: `step2 HTTP ${pTokRes.status}: ${body.slice(0, 300)}` };
    }
    const { access_token: pageToken } = (await pTokRes.json()) as { access_token?: string };
    if (!pageToken) return { ok: false, error: "step2: no access_token (you may lack pages_manage_posts permission)" };

    return { ok: true, longLivedPageToken: pageToken };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
