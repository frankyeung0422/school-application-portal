import { ChannelUnavailableError, missingEnv, type ChannelAdapter } from "./types";

// eBay Sell Inventory API: inventory item (by SKU) → offer → publish.
// https://developer.ebay.com/api-docs/sell/inventory/overview.html
// Listings go to EBAY_MARKETPLACE_ID (default EBAY_US) and are priced in that
// marketplace's currency, converted from HKD at EBAY_HKD_PER_UNIT (mid).

const REQUIRED = [
  "EBAY_ACCESS_TOKEN",
  "EBAY_MERCHANT_LOCATION_KEY",
  "EBAY_FULFILLMENT_POLICY_ID",
  "EBAY_PAYMENT_POLICY_ID",
  "EBAY_RETURN_POLICY_ID",
  "EBAY_CATEGORY_ID",
  "EBAY_HKD_PER_UNIT",
];

function base() {
  return process.env.EBAY_ENV === "production" ? "https://api.ebay.com" : "https://api.sandbox.ebay.com";
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.EBAY_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`eBay ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function marketPrice(priceHkdCents: number) {
  const rate = Number(process.env.EBAY_HKD_PER_UNIT);
  return { value: (priceHkdCents / 100 / rate).toFixed(2), currency: process.env.EBAY_CURRENCY ?? "USD" };
}

export const ebayChannel: ChannelAdapter = {
  channel: "EBAY",

  availability() {
    const missing = missingEnv(REQUIRED);
    return missing.length
      ? { ok: false, reason: "eBay developer app + seller policies not configured", missing }
      : { ok: true, reason: `eBay ${process.env.EBAY_ENV === "production" ? "production" : "sandbox"}`, missing };
  },

  async publish(input, mode) {
    if (mode === "DRY") return { externalId: `dry-ebay-${input.sku}` };
    if (!this.availability().ok) throw new ChannelUnavailableError(this.availability().reason);
    await call("PUT", `/sell/inventory/v1/inventory_item/${encodeURIComponent(input.sku)}`, {
      availability: { shipToLocationAvailability: { quantity: input.qty } },
      condition: "NEW",
      product: {
        title: input.title.slice(0, 80),
        description: input.description,
        imageUrls: input.imageUrl ? [input.imageUrl] : [],
      },
    });
    const offer = await call("POST", "/sell/inventory/v1/offer", {
      sku: input.sku,
      marketplaceId: process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
      format: "FIXED_PRICE",
      availableQuantity: input.qty,
      categoryId: process.env.EBAY_CATEGORY_ID,
      listingDescription: input.description,
      merchantLocationKey: process.env.EBAY_MERCHANT_LOCATION_KEY,
      pricingSummary: { price: marketPrice(input.priceHkdCents) },
      listingPolicies: {
        fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
        paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
        returnPolicyId: process.env.EBAY_RETURN_POLICY_ID,
      },
    });
    const offerId = String(offer.offerId);
    const published = await call("POST", `/sell/inventory/v1/offer/${offerId}/publish`);
    return { externalId: offerId, url: published.listingId ? `https://www.ebay.com/itm/${published.listingId}` : undefined };
  },

  async updatePrice(externalId, priceHkdCents, mode) {
    if (mode === "DRY") return;
    const offer = await call("GET", `/sell/inventory/v1/offer/${externalId}`);
    await call("PUT", `/sell/inventory/v1/offer/${externalId}`, {
      ...offer,
      pricingSummary: { price: marketPrice(priceHkdCents) },
    });
  },

  async delist(externalId, mode) {
    if (mode === "DRY") return;
    await call("POST", `/sell/inventory/v1/offer/${externalId}/withdraw`);
  },
};
