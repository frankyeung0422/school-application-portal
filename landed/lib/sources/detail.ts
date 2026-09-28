import { CrawlError } from "./types";

// fetchDetail returns null ONLY for a listing the page says is gone: the refresh
// job marks a null as out of stock. A page we merely failed to read (layout
// change, soft block, interstitial) must throw, or real offers get delisted.

const GONE =
  /(no longer available|item (is )?(not found|unavailable)|page (not found|does not exist)|this (item|listing|product) (has been|was) (removed|ended|deleted)|商品已下架|该商品已下柜|商品不存在|已下架|宝贝不存在|页面不存在|sorry, (this|the) (item|page))/i;

export function saysGone(pageText: string | null | undefined): boolean {
  return GONE.test(pageText ?? "");
}

/** Call when title/price did not parse: null if the page says the item is gone, else throw. */
export function unreadableDetail(platform: string, itemId: string, pageText: string | null | undefined): null {
  if (saysGone(pageText)) return null;
  throw new CrawlError("ERROR", `${platform} ${itemId}: could not read title/price (page not marked as removed)`);
}
