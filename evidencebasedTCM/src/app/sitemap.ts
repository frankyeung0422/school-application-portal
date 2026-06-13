/**
 * Dynamic sitemap including all published doctors, conditions, herbs, formulas,
 * and the marketing landing pages. Generated at request time + cached.
 *
 * Configured via SITE_URL env (defaults to evidencebasedtcm.com).
 */
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db/prisma";

const BASE = process.env.SITE_URL ?? "https://evidencebasedtcm.com";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static high-value routes
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/certified-clinic`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/doctors`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/interactions`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/cheatsheet/herb-drug-2026`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/herbs`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/formulas`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/conditions`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/acupuncture`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/patterns`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/food-therapy`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/evidence`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/diagnose/symptoms`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/diagnose/constitution`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${BASE}/learn`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/research`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];

  // Dynamic — pull from DB. Each is a separate query but they're all indexed.
  const [doctors, herbs, formulas, conditions, acupoints, patterns, recipes] = await Promise.all([
    prisma.famousDoctor.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    prisma.herb.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    prisma.formula.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    prisma.conditionMapping.findMany({
      select: { id: true, updatedAt: true },
    }),
    prisma.acupuncturePoint.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    prisma.tcmPattern.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
    prisma.foodTherapyRecipe.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    }),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...doctors.map((d) => ({
      url: `${BASE}/doctors/${d.id}`,
      lastModified: d.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...herbs.map((h) => ({
      url: `${BASE}/herbs/${h.id}`,
      lastModified: h.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...formulas.map((f) => ({
      url: `${BASE}/formulas/${f.id}`,
      lastModified: f.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...conditions.map((c) => ({
      url: `${BASE}/conditions/${c.id}`,
      lastModified: c.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...acupoints.map((a) => ({
      url: `${BASE}/acupuncture/${a.id}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...patterns.map((p) => ({
      url: `${BASE}/patterns/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...recipes.map((r) => ({
      url: `${BASE}/food-therapy/${r.id}`,
      lastModified: r.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
