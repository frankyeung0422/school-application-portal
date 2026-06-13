import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { tf } from "@/lib/i18n/format-message";
import { t } from "@/lib/i18n/resolve-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function ConditionsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { westernName: { contains: search, mode: "insensitive" as const } },
        { icd10Code: { contains: search, mode: "insensitive" as const } },
        { icd11Code: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [conditions, total] = await Promise.all([
    prisma.conditionMapping.findMany({
      where,
      orderBy: { westernName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        patternMappings: { select: { id: true } },
      },
    }),
    prisma.conditionMapping.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(messages, "conditions.title")}</h1>
        <p className="mt-2 text-muted">{tf(messages, "conditions.subtitle", { count: total })}</p>
      </div>

      <div className="mb-6">
        <form className="max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder={t(messages, "conditions.searchPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface py-2 px-4 text-sm focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
          />
        </form>
      </div>

      {conditions.length === 0 ? (
        <EmptyState title={t(messages, "conditions.emptyTitle")} description={t(messages, "conditions.emptyDesc")} />
      ) : (
        <>
          <div className="space-y-3">
            {conditions.map((condition) => (
              <Link
                key={condition.id}
                href={`/conditions/${condition.id}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-primary-light hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{localizeDbText(condition.westernName, locale)}</h3>
                    {condition.description && (
                      <p className="mt-1 text-sm text-muted line-clamp-2">
                        {localizeDbText(condition.description, locale)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {condition.icd10Code && (
                      <Badge label={`ICD-10: ${condition.icd10Code}`} color="bg-blue-100 text-blue-800" size="sm" />
                    )}
                    <Badge
                      label={`${condition.patternMappings.length}`}
                      color="bg-emerald-100 text-emerald-800"
                      size="sm"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
