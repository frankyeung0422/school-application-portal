import { describe, expect, it } from "vitest";
import { needsLogin, parseProductUrl } from "../lib/sources/url";

describe("parseProductUrl", () => {
  it("reads the item id out of each supported platform's URL", () => {
    expect(parseProductUrl("https://www.amazon.com/dp/B0CHX1W1XY")).toMatchObject({ platform: "AMAZON", itemId: "B0CHX1W1XY" });
    expect(parseProductUrl("https://www.amazon.co.uk/gp/product/B0CHX1W1XY/ref=abc")).toMatchObject({ platform: "AMAZON", itemId: "B0CHX1W1XY" });
    expect(parseProductUrl("https://www.ebay.com/itm/226789012345")).toMatchObject({ platform: "EBAY", itemId: "226789012345" });
    expect(parseProductUrl("https://www.ebay.com/itm/Tudor-Black-Bay/226789012345?hash=item1")).toMatchObject({ itemId: "226789012345" });
    expect(parseProductUrl("https://www.aliexpress.com/item/1005006543210987.html")).toMatchObject({ platform: "ALIEXPRESS", itemId: "1005006543210987" });
    expect(parseProductUrl("https://item.taobao.com/item.htm?id=654321987654")).toMatchObject({ platform: "TAOBAO", itemId: "654321987654" });
    expect(parseProductUrl("https://detail.tmall.com/item.htm?id=654321987654&spm=a1z10")).toMatchObject({ platform: "TAOBAO" });
    expect(parseProductUrl("https://item.jd.com/100012345678.html")).toMatchObject({ platform: "JD", itemId: "100012345678" });
    expect(parseProductUrl("https://detail.1688.com/offer/654321098765.html")).toMatchObject({ platform: "ALI1688", itemId: "654321098765" });
  });

  it("strips tracking parameters so the same product is one URL", () => {
    const r = parseProductUrl("https://www.aliexpress.com/item/1005006543210987.html?spm=a2g0o.detail&utm_source=ig&pdp_npi=4&aff_fcid=x");
    expect(r!.url).toBe("https://www.aliexpress.com/item/1005006543210987.html?pdp_npi=4");
  });

  it("refuses anything that is not a product page we can price", () => {
    expect(parseProductUrl("https://www.amazon.com/s?k=kettle")).toBeNull();
    expect(parseProductUrl("https://evil.example/dp/B0CHX1W1XY")).toBeNull();
    expect(parseProductUrl("https://amazon.com.evil.io/dp/B0CHX1W1XY")).toBeNull();
    expect(parseProductUrl("javascript:alert(1)")).toBeNull();
    expect(parseProductUrl("not a url")).toBeNull();
    expect(parseProductUrl("https://www.ebay.com/itm/abc")).toBeNull();
  });

  it("knows which platforms need a one-time QR login", () => {
    expect(needsLogin("TAOBAO")).toBe(true);
    expect(needsLogin("ALI1688")).toBe(true);
    expect(needsLogin("AMAZON")).toBe(false);
  });
});
