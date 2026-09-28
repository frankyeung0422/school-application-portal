import type { Platform } from "../../types";
import type {
  DiscoveredCandidate,
  DiscoverOptions,
  NormalizedListing,
  PlatformAdapter,
  SearchOptions,
  SoldComps,
} from "../types";

// Deterministic canned listings for e2e/CI. Keyed by platform; every keyword
// returns the same set so tests are stable. Model numbers overlap across
// platforms so the blocking prefilter forms cross-platform candidate pairs.
const FIXTURES: Record<Platform, NormalizedListing[]> = {
  ALI1688: [
    {
      platform: "ALI1688",
      itemId: "fx-1688-band9",
      url: "https://detail.1688.com/offer/fx-1688-band9.html",
      title: "小米手环9 智能手环 NFC版 运动计步 工厂批发",
      price: 145,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "深圳智能穿戴工厂店",
      soldCount: 3200,
      moq: 2,
      priceTiers: [
        { minQty: 2, price: 145 },
        { minQty: 10, price: 138 },
        { minQty: 50, price: 129 },
      ],
    },
    {
      platform: "ALI1688",
      itemId: "fx-1688-strap",
      url: "https://detail.1688.com/offer/fx-1688-strap.html",
      title: "适用小米手环9腕带 硅胶表带 多色 批发",
      price: 3.5,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/strap/400",
      shopName: "东莞硅胶制品厂",
      soldCount: 15000,
      moq: 10,
    },
    {
      platform: "ALI1688",
      itemId: "fx-1688-earbuds",
      url: "https://detail.1688.com/offer/fx-1688-earbuds.html",
      title: "Redmi Buds 6 青春版 蓝牙耳机 真无线 一件代发",
      price: 78,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/buds6/400",
      shopName: "华强北数码批发",
      soldCount: 890,
      moq: 1,
    },
  ],
  ALIEXPRESS: [
    {
      platform: "ALIEXPRESS",
      itemId: "fx-aliexpress-band9",
      url: "https://www.aliexpress.com/item/fx-aliexpress-band9.html",
      title: "Xiaomi Smart Band 9 NFC Fitness Tracker Global Version",
      price: 26.5,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "Mi Global Store",
      soldCount: 4300,
      rating: 4.8,
    },
    {
      // Decoy: an accessory for the same product. Must never pair with the band.
      platform: "ALIEXPRESS",
      itemId: "fx-aliexpress-strap",
      url: "https://www.aliexpress.com/item/fx-aliexpress-strap.html",
      title: "Silicone Strap Replacement for Xiaomi Smart Band 9, 5 Pcs",
      price: 2.19,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/strap/400",
      shopName: "Watch Band Store",
      soldCount: 21000,
    },
  ],
  ALIBABA: [
    {
      platform: "ALIBABA",
      itemId: "fx-alibaba-kettle",
      url: "https://www.alibaba.com/product-detail/p_fx-alibaba-kettle.html",
      title: "Midea Electric Kettle 1.5L MK-SH15 Stainless Steel Fast Boil",
      price: 8.4,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/kettle/400",
      shopName: "Guangdong Home Appliance Co., Ltd.",
      moq: 50,
      priceTiers: [
        { minQty: 50, price: 8.4 },
        { minQty: 500, price: 7.6 },
        { minQty: 2000, price: 6.9 },
      ],
    },
    {
      // Decoy: a 12-pack. Must never pair with a single-unit listing.
      platform: "ALIBABA",
      itemId: "fx-alibaba-kettle-bulk",
      url: "https://www.alibaba.com/product-detail/p_fx-alibaba-kettle-bulk.html",
      title: "Wholesale Electric Kettle 1.5L, Pack of 12 Bulk Carton",
      price: 82,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/kettlebulk/400",
      shopName: "Ningbo Trading Co., Ltd.",
      moq: 10,
    },
  ],
  JD: [
    {
      platform: "JD",
      itemId: "fx-jd-band9",
      url: "https://item.jd.com/fx-jd-band9.html",
      title: "小米手环9 NFC版 智能手环 血氧监测 50米防水",
      price: 249,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "小米京东自营旗舰店",
      soldCount: 20000,
    },
    {
      platform: "JD",
      itemId: "fx-jd-earbuds",
      url: "https://item.jd.com/fx-jd-earbuds.html",
      title: "Redmi Buds 6 青春版 真无线蓝牙耳机 通话降噪",
      price: 129,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/buds6/400",
      shopName: "小米京东自营旗舰店",
      soldCount: 50000,
    },
    {
      platform: "JD",
      itemId: "fx-jd-kettle",
      url: "https://item.jd.com/fx-jd-kettle.html",
      title: "美的电热水壶 1.5L 家用烧水壶 MK-SH15",
      price: 89,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/kettle/400",
      shopName: "美的京东自营",
      soldCount: 80000,
    },
  ],
  TAOBAO: [
    {
      platform: "TAOBAO",
      itemId: "fx-tb-band9",
      url: "https://item.taobao.com/item.htm?id=fx-tb-band9",
      title: "小米手环9 NFC 智能运动手环 正品包邮",
      price: 239,
      currency: "CNY",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "小米官方旗舰店",
      soldCount: 10000,
    },
  ],
  PDD: [],
  AMAZON: [
    {
      platform: "AMAZON",
      itemId: "fx-amz-band9",
      url: "https://www.amazon.com/dp/fx-amz-band9",
      title: "Xiaomi Smart Band 9 Activity Tracker, NFC, SpO2",
      price: 49.99,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "Xiaomi US",
      soldCount: 500,
      rating: 4.4,
      reviewCount: 2130,
      boughtPastMonth: 900,
    },
    {
      platform: "AMAZON",
      itemId: "fx-amz-kettle",
      url: "https://www.amazon.com/dp/fx-amz-kettle",
      title: "Midea Electric Kettle 1.5L MK-SH15 Stainless Steel",
      price: 34.99,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/kettle/400",
      shopName: "Midea US",
      rating: 4.6,
      reviewCount: 810,
      boughtPastMonth: 400,
    },
  ],
  EBAY: [
    {
      platform: "EBAY",
      itemId: "fx-ebay-band9",
      url: "https://www.ebay.com/itm/fx-ebay-band9",
      title: "Xiaomi Smart Band 9 NFC Fitness Tracker - New",
      price: 45.0,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/band9/400",
      shopName: "gadget-deals-hk",
      soldCount: 120,
    },
    {
      platform: "EBAY",
      itemId: "fx-ebay-kettle",
      url: "https://www.ebay.com/itm/fx-ebay-kettle",
      title: "Midea Electric Kettle 1.5L MK-SH15 Fast Boil",
      price: 29.99,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/kettle/400",
      shopName: "home-goods-outlet",
      soldCount: 60,
    },
  ],
};

// Canned sold comps so fixture runs exercise the demand/scoring path without a
// network round-trip. Keyed loosely — every keyword gets the same shape.
const SOLD_COMPS_FIXTURE: Partial<Record<Platform, Omit<SoldComps, "keyword">>> = {
  EBAY: {
    platform: "EBAY",
    soldCount: 180,
    medianPriceUsd: 31.5,
    sampleSize: 42,
  },
};

// Canned bestseller/trending candidates for DISCOVER jobs. The two AMAZON
// band-9 titles distill to the same keyword — exercises dedupe. Titles line
// up with FIXTURES so the chained SEARCH_CRAWL→MATCH finds cross-platform pairs.
const DISCOVER_FIXTURES: Partial<Record<Platform, DiscoveredCandidate[]>> = {
  AMAZON: [
    {
      title: "Xiaomi Smart Band 9 NFC Fitness Tracker - New",
      url: "https://www.amazon.com/dp/fx-amz-band9",
      price: 49.99,
      currency: "USD",
      imageUrl: "https://picsum.photos/seed/band9/400",
    },
    {
      title: "Xiaomi Smart Band 9 NFC Fitness Tracker (2024)",
      url: "https://www.amazon.com/dp/fx-amz-band9-dup",
      price: 52.99,
      currency: "USD",
    },
    {
      title: "Redmi Buds 6 Lite TWS Wireless Earbuds",
      url: "https://www.amazon.com/dp/fx-amz-buds6",
      price: 24.99,
      currency: "USD",
    },
  ],
  EBAY: [
    {
      title: "Midea Electric Kettle 1.5L MK-SH15 Fast Boil",
      url: "https://www.ebay.com/itm/fx-ebay-kettle",
      price: 19.99,
      currency: "USD",
    },
  ],
};

export function createFixtureAdapter(platform: Platform): PlatformAdapter {
  return {
    platform,
    requiresLogin: false,
    async searchProducts(_keyword: string, opts?: SearchOptions) {
      const items = FIXTURES[platform] ?? [];
      return items.slice(0, opts?.maxResults ?? items.length);
    },
    async discoverProducts(opts?: DiscoverOptions) {
      const items = DISCOVER_FIXTURES[platform] ?? [];
      return items.slice(0, opts?.maxResults ?? items.length);
    },
    async fetchSoldComps(keyword: string) {
      const comps = SOLD_COMPS_FIXTURE[platform];
      return comps ? { ...comps, keyword } : null;
    },
    async checkLogin() {
      return true;
    },
    async fetchDetail(itemId: string) {
      return (FIXTURES[platform] ?? []).find((l) => l.itemId === itemId) ?? null;
    },
  };
}
