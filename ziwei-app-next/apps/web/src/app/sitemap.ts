import type { MetadataRoute } from 'next';
import { CELEBRITIES } from '@/data/celebrities';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://aifortunetelling.org';
const ZODIAC_SIGNS = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const currentYear = now.getFullYear();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,         priority: 1.0, changeFrequency: 'daily',   lastModified: now },
    { url: `${BASE}/sample`,   priority: 0.9, changeFrequency: 'weekly',  lastModified: now },
    { url: `${BASE}/pricing`,  priority: 0.9, changeFrequency: 'monthly', lastModified: now },
    { url: `${BASE}/login`,    priority: 0.3, changeFrequency: 'yearly',  lastModified: now },
    { url: `${BASE}/register`, priority: 0.5, changeFrequency: 'yearly',  lastModified: now },
  ];

  const celebrityPages: MetadataRoute.Sitemap = CELEBRITIES.map((c) => ({
    url: `${BASE}/celebrity/${c.slug}`,
    priority: 0.7,
    changeFrequency: 'monthly' as const,
    lastModified: now,
  }));

  // Zodiac pages for current + next year
  const zodiacPages: MetadataRoute.Sitemap = [];
  for (const year of [currentYear, currentYear + 1]) {
    for (const sign of ZODIAC_SIGNS) {
      zodiacPages.push({
        url: `${BASE}/zodiac/${sign}/${year}`,
        priority: 0.8,
        changeFrequency: 'weekly',
        lastModified: now,
      });
    }
  }

  return [...staticPages, ...celebrityPages, ...zodiacPages];
}
