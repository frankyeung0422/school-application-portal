import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "https://evidencebasedtcm.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Patient records, admin areas, internal APIs — never indexed.
        disallow: [
          "/api/",
          "/admin/",
          "/patients/",
          "/account/",
          "/clinic/",
          "/referrals/",
          "/login",
          "/register",
          "/uploads/",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
