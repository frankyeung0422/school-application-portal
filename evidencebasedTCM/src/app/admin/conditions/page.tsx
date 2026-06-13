import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminConditionsPage({ searchParams }: Props) {
  const messages = getMessages(await getLocale());
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { westernName: { contains: search, mode: "insensitive" as const } },
        { icd10Code: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [conditions, total] = await Promise.all([
    prisma.conditionMapping.findMany({
      where,
      orderBy: { westernName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: { _count: { select: { patternMappings: true } } },
    }),
    prisma.conditionMapping.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.manageConditions")}</h1>
          <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalConditions", { count: total })}</p>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchConditions")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableWesternName")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableICD10")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableIcd11")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tablePatterns")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted">{t(messages, "admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {conditions.map((cond) => (
              <tr key={cond.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-medium text-foreground">{cond.westernName}</td>
                <td className="px-4 py-3">
                  {cond.icd10Code && <Badge label={cond.icd10Code} color="bg-blue-100 text-blue-800" size="sm" />}
                </td>
                <td className="px-4 py-3">
                  {cond.icd11Code && <Badge label={cond.icd11Code} color="bg-purple-100 text-purple-800" size="sm" />}
                </td>
                <td className="px-4 py-3 text-muted">{cond._count.patternMappings}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/conditions/${cond.id}`} className="text-primary hover:underline text-xs">
                      {t(messages, "admin.view")}
                    </Link>
                    <DeleteButton entityType="condition" entityId={cond.id} entityName={cond.westernName} />
                  </div>
                </td>
              </tr>
            ))}
            {conditions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {t(messages, "admin.noResults")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > ITEMS_PER_PAGE && (
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={Math.ceil(total / ITEMS_PER_PAGE)} />
        </div>
      )}
    </div>
  );
}
