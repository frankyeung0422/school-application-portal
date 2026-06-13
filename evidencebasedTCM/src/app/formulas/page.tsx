import { prisma } from "@/lib/db/prisma";
import { FormulaCard } from "@/components/formulas/FormulaCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { t } from "@/lib/i18n/resolve-message";
import { localizePlainText } from "@/lib/i18n/entity-display";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

const FORMULA_CATEGORIES = [
  "Tonifying",
  "Heat Clearing",
  "Exterior Releasing",
  "Qi Regulating",
  "Blood Invigorating",
  "Dampness Resolving",
  "Phlegm Resolving",
  "Spirit Calming",
  "Interior Warming",
  "Purgative",
  "Harmonizing",
];

interface Props {
  searchParams: Promise<{ page?: string; search?: string; category?: string }>;
}

export default async function FormulasPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";
  const category = params.category || "";

  const where = {
    status: "PUBLISHED" as const,
    ...(search && {
      OR: [
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
        { englishName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(category && { category }),
  };

  const [formulas, total] = await Promise.all([
    prisma.formula.findMany({
      where,
      orderBy: { pinyinName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        herbs: { select: { id: true } },
        evidenceLinks: {
          include: { evidence: { select: { evidenceGrade: true } } },
        },
      },
    }),
    prisma.formula.count({ where }),
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
        <h1 className="text-3xl font-bold">{t(messages, "formulas.title")}</h1>
        <p className="mt-2 text-muted">{tf(messages, "formulas.subtitle", { count: total })}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <form className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "formulas.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/formulas"
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              !category ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t(messages, "common.all")}
          </Link>
          {FORMULA_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/formulas?category=${encodeURIComponent(cat)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                category === cat ? "bg-primary text-white border-primary" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {localizePlainText(cat, locale) ?? cat}
            </Link>
          ))}
        </div>
      </div>

      {formulas.length === 0 ? (
        <EmptyState title={t(messages, "formulas.emptyTitle")} description={t(messages, "formulas.emptyDesc")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {formulas.map((formula) => {
              const chineseTc = toTraditionalChinese(formula.chineseName, locale);
              const primary = locale === "zh-Hant" ? chineseTc : formula.pinyinName;
              const secondary = locale === "zh-Hant" ? formula.pinyinName : formula.chineseName;
              const sourcePrefix = t(messages, "formulas.sourcePrefix");
              const sourceLine =
                formula.sourceText != null
                  ? `${sourcePrefix}: ${localizePlainText(formula.sourceText, locale) ?? ""}`
                  : null;
              return (
                <FormulaCard
                  key={formula.id}
                  id={formula.id}
                  primaryName={primary}
                  secondaryLine={secondary}
                  englishLine={formula.englishName}
                  categoryLabel={localizePlainText(formula.category, locale) ?? formula.category}
                  herbCountLabel={tf(messages, "formulas.herbsCount", { count: formula.herbs.length })}
                  sourceLine={sourceLine}
                  highestGrade={getHighestGrade(formula.evidenceLinks)}
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
