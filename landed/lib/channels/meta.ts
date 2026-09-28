import { ChannelUnavailableError, missingEnv, type ChannelAdapter } from "./types";
import type { RunMode } from "../actions/kinds";

// Meta: a Commerce Manager catalog item (so the product can be tagged in shops
// and ads) plus Page / Instagram posts. Instagram publishing is two-step —
// create a media container, wait for it to finish, then media_publish — ported
// from marketing-dashboard/server/social.ts.

const GRAPH = "https://graph.facebook.com/v21.0";
const CATALOG_REQUIRED = ["META_CATALOG_ID", "META_SYSTEM_USER_TOKEN"];
const PAGE_REQUIRED = ["META_PAGE_ID", "META_PAGE_TOKEN"];

export function describeMetaError(body: unknown): string {
  const err = (body as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
  if (!err) return JSON.stringify(body).slice(0, 300);
  if (err.code === 190) return `Token expired or revoked — reconnect the Page (${err.message})`;
  if (err.code === 10 || err.code === 200) return `Missing permission — the app needs pages_manage_posts / catalog_management (${err.message})`;
  if (err.code === 4 || err.code === 32) return `Rate limited by Meta — try later (${err.message})`;
  return err.message ?? "Unknown Meta error";
}

async function graph(path: string, params: Record<string, string>, method: "POST" | "GET" = "POST") {
  const url = new URL(`${GRAPH}${path}`);
  const init: RequestInit = { method, signal: AbortSignal.timeout(30000) };
  if (method === "GET") for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else init.body = new URLSearchParams(params);
  const res = await fetch(url, init);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || json.error) throw new Error(describeMetaError(json));
  return json;
}

export const metaChannel: ChannelAdapter = {
  channel: "META",

  availability() {
    const missing = missingEnv(CATALOG_REQUIRED);
    return missing.length
      ? { ok: false, reason: "Meta Commerce catalog not connected", missing }
      : { ok: true, reason: `catalog ${process.env.META_CATALOG_ID}`, missing };
  },

  async publish(input, mode) {
    if (mode === "DRY") return { externalId: `dry-meta-${input.sku}` };
    if (!this.availability().ok) throw new ChannelUnavailableError(this.availability().reason);
    await graph(`/${process.env.META_CATALOG_ID}/items_batch`, {
      access_token: process.env.META_SYSTEM_USER_TOKEN as string,
      item_type: "PRODUCT_ITEM",
      requests: JSON.stringify([
        {
          method: "UPDATE",
          data: {
            id: input.sku,
            title: input.title.slice(0, 150),
            description: input.description.slice(0, 5000),
            availability: input.qty > 0 ? "in stock" : "out of stock",
            condition: "new",
            price: `${(input.priceHkdCents / 100).toFixed(2)} HKD`,
            link: input.productUrl,
            image_link: input.imageUrl ?? "",
          },
        },
      ]),
    });
    return { externalId: input.sku };
  },

  async updatePrice(externalId, priceHkdCents, mode) {
    if (mode === "DRY") return;
    await graph(`/${process.env.META_CATALOG_ID}/items_batch`, {
      access_token: process.env.META_SYSTEM_USER_TOKEN as string,
      item_type: "PRODUCT_ITEM",
      requests: JSON.stringify([{ method: "UPDATE", data: { id: externalId, price: `${(priceHkdCents / 100).toFixed(2)} HKD` } }]),
    });
  },

  async delist(externalId, mode) {
    if (mode === "DRY") return;
    await graph(`/${process.env.META_CATALOG_ID}/items_batch`, {
      access_token: process.env.META_SYSTEM_USER_TOKEN as string,
      item_type: "PRODUCT_ITEM",
      requests: JSON.stringify([{ method: "DELETE", data: { id: externalId } }]),
    });
  },
};

export function socialAvailability(platform: "FACEBOOK" | "INSTAGRAM") {
  const req = platform === "FACEBOOK" ? PAGE_REQUIRED : [...PAGE_REQUIRED, "META_IG_USER_ID"];
  const missing = missingEnv(req);
  return { ok: missing.length === 0, missing };
}

export async function publishSocial(
  post: { platform: "FACEBOOK" | "INSTAGRAM"; caption: string; imageUrl: string | null; link: string },
  mode: RunMode,
): Promise<{ externalId: string }> {
  if (mode === "DRY") return { externalId: `dry-${post.platform.toLowerCase()}-${Date.now()}` };
  const avail = socialAvailability(post.platform);
  if (!avail.ok) throw new ChannelUnavailableError(`Missing ${avail.missing.join(", ")}`);
  const token = process.env.META_PAGE_TOKEN as string;

  if (post.platform === "FACEBOOK") {
    const r = post.imageUrl
      ? await graph(`/${process.env.META_PAGE_ID}/photos`, { url: post.imageUrl, caption: `${post.caption}\n${post.link}`, access_token: token })
      : await graph(`/${process.env.META_PAGE_ID}/feed`, { message: post.caption, link: post.link, access_token: token });
    return { externalId: String(r.post_id ?? r.id) };
  }

  if (!post.imageUrl) throw new Error("Instagram posts need an image");
  const igUser = process.env.META_IG_USER_ID as string;
  const container = await graph(`/${igUser}/media`, { image_url: post.imageUrl, caption: post.caption, access_token: token });
  const creationId = String(container.id);
  for (let i = 0; i < 10; i++) {
    const s = await graph(`/${creationId}`, { fields: "status_code", access_token: token }, "GET");
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram container ${s.status_code}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const published = await graph(`/${igUser}/media_publish`, { creation_id: creationId, access_token: token });
  return { externalId: String(published.id) };
}
