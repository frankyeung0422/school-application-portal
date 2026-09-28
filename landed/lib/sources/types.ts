import type { Currency, Platform, PriceTier } from "../types";

export interface NormalizedListing {
  platform: Platform;
  itemId: string;
  url: string;
  title: string;
  price: number;
  currency: Currency;
  imageUrl?: string;
  shopName?: string;
  soldCount?: number;
  moq?: number;
  priceTiers?: PriceTier[];
  attributes?: Record<string, string>;
  // --- demand / cost inputs, when the platform exposes them ---
  rating?: number;
  reviewCount?: number;
  /** Amazon's "N+ bought in past month" badge. */
  boughtPastMonth?: number;
  weightKg?: number;
  category?: string;
}

/**
 * Aggregate of what actually SOLD for a keyword — the difference between a
 * price someone is asking and a price someone paid. eBay's completed-listing
 * search is the only free source of this, and it anchors both the sell price
 * and the demand estimate.
 */
export interface SoldComps {
  keyword: string;
  platform: Platform;
  soldCount: number;
  medianPriceUsd: number | null;
  /** Concurrent live listings for the same keyword — competition proxy. */
  activeListings?: number;
  sampleSize: number;
}

export interface SearchOptions {
  maxResults?: number;
}

/** A product spotted on a bestseller/trending page — keyword source, not a Listing. */
export interface DiscoveredCandidate {
  title: string;
  url?: string;
  price?: number;
  currency?: Currency;
  imageUrl?: string;
}

export interface DiscoverOptions {
  maxResults?: number;
}

export interface PlatformAdapter {
  platform: Platform;
  requiresLogin: boolean;
  searchProducts(
    keyword: string,
    opts?: SearchOptions,
  ): Promise<NormalizedListing[]>;
  /** Probe whether the persisted session is still valid. */
  checkLogin?(): Promise<boolean>;
  /** Fetch a single listing's current state (REFRESH_PRICES, 1688 tiers). */
  fetchDetail?(itemId: string): Promise<NormalizedListing | null>;
  /** Pull candidates from a public bestseller/trending page (DISCOVER jobs). */
  discoverProducts?(opts?: DiscoverOptions): Promise<DiscoveredCandidate[]>;
  /** Completed/sold listings for a keyword — real demand and real sale prices. */
  fetchSoldComps?(keyword: string): Promise<SoldComps | null>;
}

/** Thrown by adapters so the crawl handler can classify per-platform failures. */
export class CrawlError extends Error {
  constructor(
    public kind: "LOGIN_WALL" | "CAPTCHA" | "TIMEOUT" | "NOT_AVAILABLE" | "ERROR",
    message: string,
  ) {
    super(message);
    this.name = "CrawlError";
  }
}
