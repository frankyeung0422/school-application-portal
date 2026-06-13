import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { studyTypeLabel } from "@/lib/i18n/data-labels";

const ITEMS_PER_PAGE = 20;

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-rose-100 text-rose-800",
};

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminEvidencePage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" as const } },
        { authors: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [entries, total] = await Promise.all([
    prisma.evidenceEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.evidenceEntry.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.manageEvidence")}</h1>
          <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalEvidence", { count: total })}</p>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchEvidence")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableGrade")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableTitle")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableStudyType")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableYear")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableStatus")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted">{t(messages, "admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-background/50">
                <td className="px-4 py-3">
                  <Badge
                    label={tf(messages, "admin.badgeGrade", { grade: entry.evidenceGrade })}
                    color={GRADE_COLORS[entry.evidenceGrade]}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{entry.title}</td>
                <td className="px-4 py-3 text-muted">{studyTypeLabel(locale, entry.studyType)}</td>
                <td className="px-4 py-3 text-muted">{entry.year ?? t(messages, "common.dash")}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={entry.status === "PUBLISHED" ? t(messages, "admin.published") : t(messages, "admin.draft")}
                    color={entry.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/evidence/${entry.id}`} className="text-primary hover:underline text-xs">
                      {t(messages, "admin.view")}
                    </Link>
                    <DeleteButton entityType="evidence" entityId={entry.id} entityName={entry.title.slice(0, 30)} />
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
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
