import type { Channel } from "../types";
import { ChannelUnavailableError, type ChannelAdapter } from "./types";
import { ebayChannel } from "./ebay";
import { shopifyChannel } from "./shopify";
import { metaChannel } from "./meta";

// Our own storefront is always a channel: listing a product there means its
// product page shows the buy box.
const storefrontChannel: ChannelAdapter = {
  channel: "STOREFRONT",
  availability: () => ({ ok: true, reason: "built in", missing: [] }),
  async publish(input) {
    return { externalId: `storefront-${input.sku}`, url: input.productUrl };
  },
  async updatePrice() {},
  async delist() {},
};

/**
 * Regional marketplaces whose seller APIs require an approved seller account
 * and an app review before a single call works. They are stubs until then —
 * visible in the UI with the reason, never silently "succeeding".
 */
function notAvailable(channel: Channel, reason: string): ChannelAdapter {
  const fail = async (): Promise<never> => {
    throw new ChannelUnavailableError(reason);
  };
  return {
    channel,
    availability: () => ({ ok: false, reason, missing: [] }),
    publish: fail,
    updatePrice: fail,
    delist: fail,
  };
}

const ADAPTERS: Record<Channel, ChannelAdapter> = {
  STOREFRONT: storefrontChannel,
  EBAY: ebayChannel,
  SHOPIFY: shopifyChannel,
  META: metaChannel,
  TIKTOK_SHOP: notAvailable("TIKTOK_SHOP", "TikTok Shop Partner API needs an approved HK/SEA seller account + app review"),
  SHOPEE: notAvailable("SHOPEE", "Shopee Open Platform needs an approved seller + partner app"),
  HKTVMALL: notAvailable("HKTVMALL", "HKTVmall merchant onboarding (no public listing API) — apply as a merchant"),
};

export function getChannel(channel: Channel): ChannelAdapter {
  return ADAPTERS[channel];
}
