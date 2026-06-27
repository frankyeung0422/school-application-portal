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

async function buildNameMap(bookmarks: { entityType: string; entityId: string }[], locale: Locale): Promise<Map<string, string>> {
  const ids = (type: string) => bookmarks.filter(b => b.entityType === type).map(b => b.entityId);
  const herbIds     = ids("HERB");
  const formulaIds  = ids("FORMULA");
  const acuIds      = ids("ACUPOINT");
  const patternIds  = ids("PATTERN");
  const evidenceIds = ids("EVIDENCE");
  const condIds     = ids("CONDITION");

  const [herbs, formulas, acupoints, patterns, evidence, conditions] = await Promise.all([
    herbIds.length     ? prisma.herb.findMany({ where: { id: { in: herbIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    formulaIds.length  ? prisma.formula.findMany({ where: { id: { in: formulaIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    acuIds.length      ? prisma.acupuncturePoint.findMany({ where: { id: { in: acuIds } }, select: { id: true, code: true, pinyinName: true } }) : [],
    patternIds.length  ? prisma.tcmPattern.findMany({ where: { id: { in: patternIds } }, select: { id: true, pinyinName: true, chineseName: true } }) : [],
    evidenceIds.length ? prisma.evidenceEntry.findMany({ where: { id: { in: evidenceIds } }, select: { id: true, title: true } }) : [],
    condIds.length     ? prisma.conditionMapping.findMany({ where: { id: { in: condIds } }, select: { id: true, westernName: true } }) : [],
  ]);

  const map = new Map<string, string>();
  herbs.forEach(h     => map.set(h.id, `${h.pinyinName} (${toTraditionalChinese(h.chineseName, locale)})`));
  formulas.forEach(f  => map.set(f.id, `${f.pinyinName} (${toTraditionalChinese(f.chineseName, locale)})`));
  acupoints.forEach(a => map.set(a.id, `${a.code} ${a.pinyinName}`));
  patterns.forEach(p  => map.set(p.id, `${p.pinyinName} (${toTraditionalChinese(p.chineseName, locale)})`));
  evidence.forEach(e  => map.set(e.id, toTraditionalChinese(e.title, locale)));
  conditions.forEach(c => map.set(c.id, toTraditionalChinese(c.westernName, locale)));
  return map;
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

  // Fetch all bookmarks for this user once (for counts + names)
  const allBookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  // Derive type counts from the already-fetched array (no second DB query)
  const typeCounts: Record<string, number> = {};
  for (const b of allBookmarks) {
    typeCounts[b.entityType] = (typeCounts[b.entityType] || 0) + 1;
  }

  // Apply type filter after computing counts
  const bookmarks = filterType && filterType in ENTITY_TYPE_CONFIG
    ? allBookmarks.filter(b => b.entityType === filterType)
    : allBookmarks;

  // Batch-resolve entity names (at most 6 parallel queries regardless of N bookmarks)
  const nameMap = await buildNameMap(bookmarks, locale);

  const bookmarksWithNames = bookmarks.map(b => ({
    ...b,
    name: nameMap.get(b.entityId) ?? "?",
  }));

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
