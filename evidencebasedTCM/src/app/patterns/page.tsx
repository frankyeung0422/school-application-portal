import { prisma } from "@/lib/db/prisma";
import { PatternCard } from "@/components/patterns/PatternCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { PATHOLOGY_TYPE_LABELS } from "@/lib/utils/tcm-constants";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { t } from "@/lib/i18n/resolve-message";
import { pathologyLabel } from "@/lib/i18n/data-labels";
import { localizePlainText } from "@/lib/i18n/entity-display";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string; pathology?: string }>;
}

export default async function PatternsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const pathology = params.pathology || "";

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
        { englishName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(pathology && {
      pathologyType: pathology as
        | "DEFICIENCY"
        | "EXCESS"
        | "STAGNATION"
        | "HEAT"
        | "COLD"
        | "DAMPNESS"
        | "PHLEGM"
        | "WIND"
        | "BLOOD_STASIS"
        | "YIN_DEFICIENCY"
        | "YANG_DEFICIENCY"
        | "QI_DEFICIENCY"
        | "BLOOD_DEFICIENCY",
    }),
  };

  const [patterns, total] = await Promise.all([
    prisma.tcmPattern.findMany({
      where,
      orderBy: { pinyinName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        patternFormulas: { select: { id: true } },
      },
    }),
    prisma.tcmPattern.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(messages, "patterns.title")}</h1>
        <p className="mt-2 text-muted">{tf(messages, "patterns.subtitle", { count: total })}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <form className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "patterns.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/patterns"
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              !pathology ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t(messages, "common.all")}
          </Link>
          {Object.keys(PATHOLOGY_TYPE_LABELS).map((key) => (
            <Link
              key={key}
              href={`/patterns?pathology=${key}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                pathology === key ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {pathologyLabel(locale, key)}
            </Link>
          ))}
        </div>
      </div>

      {patterns.length === 0 ? (
        <EmptyState title={t(messages, "patterns.emptyTitle")} description={t(messages, "patterns.emptyDesc")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {patterns.map((pattern) => {
              const chineseTc = toTraditionalChinese(pattern.chineseName, locale);
              const primary = locale === "zh-Hant" ? chineseTc : pattern.pinyinName;
              const secondary = locale === "zh-Hant" ? pattern.pinyinName : pattern.chineseName;
              const organ =
                pattern.organSystem != null
                  ? (localizePlainText(pattern.organSystem, locale) ?? pattern.organSystem)
                  : null;
              return (
                <PatternCard
                  key={pattern.id}
                  id={pattern.id}
                  primaryName={primary}
                  secondaryLine={secondary}
                  englishLine={pattern.englishName}
                  organSystemLabel={organ}
                  pathologyLabel={pathologyLabel(locale, pattern.pathologyType)}
                  pathologyType={pattern.pathologyType}
                  formulaCountLabel={tf(messages, "patterns.formulaCount", {
                    count: pattern.patternFormulas.length,
                  })}
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
