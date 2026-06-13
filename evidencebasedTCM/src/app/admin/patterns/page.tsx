import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { pathologyLabel } from "@/lib/i18n/data-labels";
import { localizeDbText } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

const PATHOLOGY_COLORS: Record<string, string> = {
  QI_DEFICIENCY: "bg-yellow-100 text-yellow-800",
  BLOOD_DEFICIENCY: "bg-red-100 text-red-800",
  YIN_DEFICIENCY: "bg-indigo-100 text-indigo-800",
  YANG_DEFICIENCY: "bg-orange-100 text-orange-800",
  STAGNATION: "bg-purple-100 text-purple-800",
  HEAT: "bg-rose-100 text-rose-800",
  COLD: "bg-cyan-100 text-cyan-800",
  DAMPNESS: "bg-teal-100 text-teal-800",
  PHLEGM: "bg-lime-100 text-lime-800",
  WIND: "bg-sky-100 text-sky-800",
  BLOOD_STASIS: "bg-fuchsia-100 text-fuchsia-800",
  DEFICIENCY: "bg-amber-100 text-amber-800",
  EXCESS: "bg-red-100 text-red-800",
};

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminPatternsPage({ searchParams }: Props) {
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

  const [patterns, total] = await Promise.all([
    prisma.tcmPattern.findMany({
      where,
      orderBy: { pinyinName: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.tcmPattern.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.managePatterns")}</h1>
          <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalPatterns", { count: total })}</p>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchPatterns")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tablePinyin")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableChinese")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableOrgan")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tablePathology")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableStatus")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted">{t(messages, "admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {patterns.map((pattern) => (
              <tr key={pattern.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-medium text-foreground">{pattern.pinyinName}</td>
                <td className="px-4 py-3 text-muted">{localizeDbText(pattern.chineseName, locale)}</td>
                <td className="px-4 py-3 text-muted">{localizeDbText(pattern.organSystem, locale)}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={pathologyLabel(locale, pattern.pathologyType)}
                    color={PATHOLOGY_COLORS[pattern.pathologyType] || "bg-gray-100 text-gray-800"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={pattern.status === "PUBLISHED" ? t(messages, "admin.published") : t(messages, "admin.draft")}
                    color={pattern.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/patterns/${pattern.id}`} className="text-primary hover:underline text-xs">
                      {t(messages, "admin.view")}
                    </Link>
                    <DeleteButton entityType="pattern" entityId={pattern.id} entityName={pattern.pinyinName} />
                  </div>
                </td>
              </tr>
            ))}
            {patterns.length === 0 && (
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
