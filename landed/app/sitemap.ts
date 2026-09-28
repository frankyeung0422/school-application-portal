import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/listings";

// Every product page plus the evergreen sections. Rebuilt hourly; ~8k URLs is
// well under the 50k-per-file limit, so one file.
export const revalidate = 3600;

const STATIC: { path: string; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", freq: "daily", priority: 1 },
  { path: "/supermarket", freq: "daily", priority: 0.9 },
  { path: "/price-index", freq: "weekly", priority: 0.8 },
  { path: "/shrinkflation", freq: "weekly", priority: 0.7 },
  { path: "/promo-truth", freq: "daily", priority: 0.8 },
  { path: "/luxury", freq: "weekly", priority: 0.6 },
  { path: "/pools", freq: "daily", priority: 0.6 },
  { path: "/travel", freq: "weekly", priority: 0.5 },
  { path: "/near", freq: "weekly", priority: 0.5 },
  { path: "/instore", freq: "weekly", priority: 0.4 },
  { path: "/how", freq: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = publicOrigin();
  const products = await prisma.product.findMany({
    where: { sourceCount: { gt: 0 } },
    select: { slug: true, updatedAt: true, segment: true },
    orderBy: { id: "asc" },
    take: 45_000,
  });
  return [
    ...STATIC.map((s) => ({ url: `${origin}${s.path}`, changeFrequency: s.freq, priority: s.priority })),
    ...products.map((p) => ({
      url: `${origin}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: (p.segment === "SUPERMARKET" ? "daily" : "weekly") as MetadataRoute.Sitemap[number]["changeFrequency"],
      priority: 0.5,
    })),
  ];
}
