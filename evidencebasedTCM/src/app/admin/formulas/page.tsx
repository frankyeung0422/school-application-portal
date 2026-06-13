import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { localizeDbText } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminFormulasPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
        { englishName: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [formulas, total] = await Promise.all([
    prisma.formula.findMany({
      where,
      orderBy: { pinyinName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: { _count: { select: { herbs: true } } },
    }),
    prisma.formula.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.manageFormulas")}</h1>
          <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalFormulas", { count: total })}</p>
        </div>
        <Link
          href="/admin/formulas/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors"
        >
          {t(messages, "admin.addFormula")}
        </Link>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchFormulas")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tablePinyin")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableChinese")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableCategory")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableHerbs")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableStatus")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted">{t(messages, "admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {formulas.map((formula) => (
              <tr key={formula.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-medium text-foreground">{formula.pinyinName}</td>
                <td className="px-4 py-3 text-muted">{localizeDbText(formula.chineseName, locale)}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={localizeDbText(formula.category, locale) ?? t(messages, "common.dash")}
                    color="bg-blue-100 text-blue-800"
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-muted">{formula._count.herbs}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={formula.status === "PUBLISHED" ? t(messages, "admin.published") : t(messages, "admin.draft")}
                    color={formula.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/formulas/${formula.id}`} className="text-primary hover:underline text-xs">
                      {t(messages, "admin.view")}
                    </Link>
                    <DeleteButton entityType="formula" entityId={formula.id} entityName={formula.pinyinName} />
                  </div>
                </td>
              </tr>
            ))}
            {formulas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
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
