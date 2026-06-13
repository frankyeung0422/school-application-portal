import { prisma } from "@/lib/db/prisma";
import { HerbCard } from "@/components/herbs/HerbCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { HERB_CATEGORIES, HERB_FLAVOR_CONFIG, HERB_NATURE_CONFIG } from "@/lib/utils/tcm-constants";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { t } from "@/lib/i18n/resolve-message";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import { herbCategoryLabel, herbFlavorLabel, herbNatureLabel, meridianLabel } from "@/lib/i18n/data-labels";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string; category?: string; nature?: string }>;
}

export default async function HerbsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const category = params.category || "";
  const nature = params.nature || "";

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
        { englishName: { contains: search, mode: "insensitive" as const } },
        { latinName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
    ...(nature && { nature: nature as "WARM" | "HOT" | "COOL" | "COLD" | "NEUTRAL" }),
  };

  const [herbs, total] = await Promise.all([
    prisma.herb.findMany({
      where,
      orderBy: { pinyinName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        evidenceLinks: {
          include: { evidence: { select: { evidenceGrade: true } } },
        },
      },
    }),
    prisma.herb.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  function getHighestGrade(evidenceLinks: { evidence: { evidenceGrade: string } }[]): string | null {
    const grades = evidenceLinks.map((l) => l.evidence.evidenceGrade);
    if (grades.includes("A")) return "A";
    if (grades.includes("B")) return "B";
    if (grades.includes("C")) return "C";
    if (grades.includes("D")) return "D";
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(messages, "herbs.title")}</h1>
        <p className="mt-2 text-muted">
          {tf(messages, "herbs.subtitle", { count: total })}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <form className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "herbs.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/herbs"
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              !category && !nature ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t(messages, "common.all")}
          </Link>
          {HERB_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/herbs?category=${encodeURIComponent(cat)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                category === cat ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {herbCategoryLabel(locale, cat)}
            </Link>
          ))}
        </div>
      </div>

      {herbs.length === 0 ? (
        <EmptyState
          title={t(messages, "herbs.emptyTitle")}
          description={t(messages, "herbs.emptyDesc")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {herbs.map((herb) => {
              const { primary, secondary } = tcmEntityTitles(herb, locale);
              const natureConfig = HERB_NATURE_CONFIG[herb.nature as keyof typeof HERB_NATURE_CONFIG];
              const flavorBadges = herb.flavor.map((f) => {
                const config = HERB_FLAVOR_CONFIG[f.toLowerCase()];
                return {
                  label: herbFlavorLabel(locale, f),
                  color: config?.color ?? "bg-gray-100 text-gray-800",
                };
              });
              return (
                <HerbCard
                  key={herb.id}
                  id={herb.id}
                  primaryName={primary}
                  secondaryLine={secondary}
                  categoryLabel={herbCategoryLabel(locale, herb.category)}
                  categoryKey={herb.category}
                  natureLabel={herbNatureLabel(locale, herb.nature)}
                  natureColor={natureConfig?.color ?? "bg-gray-100 text-gray-800"}
                  meridianLabels={herb.meridianTropism.map((m) => meridianLabel(locale, m))}
                  flavorBadges={flavorBadges}
                  highestGrade={getHighestGrade(herb.evidenceLinks)}
                  locale={locale}
                />
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
