import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/listings";

export default function robots(): MetadataRoute.Robots {
  return {
    // Outbound /go links are clicks, not pages: crawling them would fake demand evidence.
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/go/", "/login", "/register", "/basket"] },
    sitemap: `${publicOrigin()}/sitemap.xml`,
  };
}
