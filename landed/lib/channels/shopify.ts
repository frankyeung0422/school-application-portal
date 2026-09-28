import { ChannelUnavailableError, missingEnv, type ChannelAdapter } from "./types";

// Shopify Admin GraphQL (productSet upserts product + variant in one call).
// Store currency is assumed HKD; SHOPIFY_API_VERSION defaults to 2025-07.

const REQUIRED = ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_TOKEN"];

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const version = process.env.SHOPIFY_API_VERSION ?? "2025-07";
  const res = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN as string, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (!res.ok || json.errors) throw new Error(`Shopify ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  return json.data as T;
}

export const shopifyChannel: ChannelAdapter = {
  channel: "SHOPIFY",

  availability() {
    const missing = missingEnv(REQUIRED);
    return missing.length
      ? { ok: false, reason: "Shopify custom app token not configured", missing }
      : { ok: true, reason: process.env.SHOPIFY_STORE_DOMAIN as string, missing };
  },

  async publish(input, mode) {
    if (mode === "DRY") return { externalId: `dry-shopify-${input.sku}` };
    if (!this.availability().ok) throw new ChannelUnavailableError(this.availability().reason);
    type R = { productSet: { product: { id: string; handle: string } | null; userErrors: { message: string }[] } };
    const data = await gql<R>(
      `mutation($input: ProductSetInput!) { productSet(synchronous: true, input: $input) { product { id handle } userErrors { message } } }`,
      {
        input: {
          title: input.title,
          descriptionHtml: input.description.replace(/\n/g, "<br>"),
          status: "ACTIVE",
          productOptions: [{ name: "Title", values: [{ name: "Default Title" }] }],
          files: input.imageUrl ? [{ originalSource: input.imageUrl, contentType: "IMAGE" }] : [],
          variants: [
            {
              optionValues: [{ optionName: "Title", name: "Default Title" }],
              sku: input.sku,
              price: (input.priceHkdCents / 100).toFixed(2),
            },
          ],
        },
      },
    );
    if (!data.productSet.product) throw new Error(data.productSet.userErrors.map((e) => e.message).join("; "));
    return {
      externalId: data.productSet.product.id,
      url: `https://${process.env.SHOPIFY_STORE_DOMAIN}/products/${data.productSet.product.handle}`,
    };
  },

  async updatePrice(externalId, priceHkdCents, mode) {
    if (mode === "DRY") return;
    type V = { product: { variants: { nodes: { id: string }[] } } };
    const v = await gql<V>(`query($id: ID!) { product(id: $id) { variants(first: 1) { nodes { id } } } }`, { id: externalId });
    const variantId = v.product.variants.nodes[0]?.id;
    if (!variantId) throw new Error("Shopify product has no variant");
    await gql(
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { message } } }`,
      { productId: externalId, variants: [{ id: variantId, price: (priceHkdCents / 100).toFixed(2) }] },
    );
  },

  async delist(externalId, mode) {
    if (mode === "DRY") return;
    await gql(`mutation($input: ProductInput!) { productUpdate(input: $input) { userErrors { message } } }`, {
      input: { id: externalId, status: "DRAFT" },
    });
  },
};
