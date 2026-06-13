import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { bookmarkEntityLabel } from "@/lib/i18n/data-labels";
import type { Locale } from "@/lib/i18n/types";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

const ENTITY_TYPE_CONFIG: Record<string, { color: string; href: (id: string) => string }> = {
  HERB: { color: "bg-emerald-100 text-emerald-800", href: (id) => `/herbs/${id}` },
  FORMULA: { color: "bg-blue-100 text-blue-800", href: (id) => `/formulas/${id}` },
  ACUPOINT: { color: "bg-purple-100 text-purple-800", href: (id) => `/acupuncture/${id}` },
  PATTERN: { color: "bg-amber-100 text-amber-800", href: (id) => `/patterns/${id}` },
  EVIDENCE: { color: "bg-rose-100 text-rose-800", href: (id) => `/evidence/${id}` },
  CONDITION: { color: "bg-teal-100 text-teal-800", href: (id) => `/conditions/${id}` },
};

async function getEntityName(entityType: string, entityId: string, locale: Locale): Promise<string> {
  switch (entityType) {
    case "HERB": {
      const herb = await prisma.herb.findUnique({
        where: { id: entityId },
        select: { pinyinName: true, chineseName: true },
      });
      if (!herb) return "?";
      const zh = toTraditionalChinese(herb.chineseName, locale);
      return `${herb.pinyinName} (${zh})`;
    }
    case "FORMULA": {
      const formula = await prisma.formula.findUnique({
        where: { id: entityId },
        select: { pinyinName: true, chineseName: true },
      });
      if (!formula) return "?";
      const zh = toTraditionalChinese(formula.chineseName, locale);
      return `${formula.pinyinName} (${zh})`;
    }
    case "ACUPOINT": {
      const acupoint = await prisma.acupuncturePoint.findUnique({
        where: { id: entityId },
        select: { code: true, pinyinName: true },
      });
      return acupoint ? `${acupoint.code} ${acupoint.pinyinName}` : "?";
    }
    case "PATTERN": {
      const pattern = await prisma.tcmPattern.findUnique({
        where: { id: entityId },
        select: { pinyinName: true, chineseName: true },
      });
      if (!pattern) return "?";
      const zh = toTraditionalChinese(pattern.chineseName, locale);
      return `${pattern.pinyinName} (${zh})`;
    }
    case "EVIDENCE": {
      const evidence = await prisma.evidenceEntry.findUnique({
        where: { id: entityId },
        select: { title: true },
      });
      return evidence?.title ? toTraditionalChinese(evidence.title, locale) : "?";
    }
    case "CONDITION": {
      const condition = await prisma.conditionMapping.findUnique({
        where: { id: entityId },
        select: { westernName: true },
      });
      return condition?.westernName ? toTraditionalChinese(condition.westernName, locale) : "?";
    }
    default:
      return "?";
  }
}

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function BookmarksPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/bookmarks");

  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const filterType = params.type || "";

  const where: Record<string, unknown> = { userId: session.user.id };
  if (filterType && filterType in ENTITY_TYPE_CONFIG) {
    where.entityType = filterType;
  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const bookmarksWithNames = await Promise.all(
    bookmarks.map(async (b) => ({
      ...b,
      name: await getEntityName(b.entityType, b.entityId, locale),
    }))
  );

  const typeCounts: Record<string, number> = {};
  const allBookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    select: { entityType: true },
  });
  for (const b of allBookmarks) {
    typeCounts[b.entityType] = (typeCounts[b.entityType] || 0) + 1;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t(messages, "bookmarks.title")}</h1>
        <p className="mt-2 text-muted">{t(messages, "bookmarks.subtitle")}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/bookmarks"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            !filterType ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-foreground"
          }`}
        >
          {tf(messages, "bookmarks.allTab", { count: allBookmarks.length })}
        </Link>
        {Object.entries(ENTITY_TYPE_CONFIG).map(([type]) => {
          const count = typeCounts[type] || 0;
          if (count === 0) return null;
          const label = bookmarkEntityLabel(locale, type);
          return (
            <Link
              key={type}
              href={`/bookmarks?type=${type}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filterType === type ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              {tf(messages, "bookmarks.typeTab", { label, count })}
            </Link>
          );
        })}
      </div>

      {bookmarksWithNames.length === 0 ? (
        <EmptyState title={t(messages, "bookmarks.emptyTitle")} description={t(messages, "bookmarks.emptyDesc")} />
      ) : (
        <div className="space-y-3">
          {bookmarksWithNames.map((bookmark) => {
            const config = ENTITY_TYPE_CONFIG[bookmark.entityType];
            const typeLabel = bookmarkEntityLabel(locale, bookmark.entityType);
            return (
              <Link
                key={bookmark.id}
                href={config.href(bookmark.entityId)}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:shadow-md hover:border-primary-light/30"
              >
                <div className="flex items-center gap-3">
                  <Badge label={typeLabel} color={config.color} />
                  <span className="font-medium text-foreground">{bookmark.name}</span>
                  {bookmark.notes && (
                    <span className="text-sm text-muted">
                      {t(messages, "common.dash")} {bookmark.notes}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {new Date(bookmark.createdAt).toLocaleDateString(locale === "zh-Hant" ? "zh-TW" : "en")}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
