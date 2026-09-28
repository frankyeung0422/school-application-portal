import { CrawlError, type PlatformAdapter } from "../types";

// Pinduoduo has no usable web search without a logged-in session plus a
// rotating anti_content token — not worth fighting with a browser. This stub
// keeps PDD selectable in the schema; swap in an aggregator-API adapter via
// ADAPTER_PDD when one is provisioned.
export function createPddAdapter(): PlatformAdapter {
  return {
    platform: "PDD",
    requiresLogin: true,
    async searchProducts() {
      throw new CrawlError(
        "NOT_AVAILABLE",
        "PDD crawling is not supported (anti_content token). Configure an aggregator API adapter via ADAPTER_PDD.",
      );
    },
  };
}
