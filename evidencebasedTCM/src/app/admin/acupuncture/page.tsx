import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { meridianLabel } from "@/lib/i18n/data-labels";
import { localizeDbText } from "@/lib/i18n/to-traditional";

const ITEMS_PER_PAGE = 20;

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminAcupuncturePage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { code: { contains: search, mode: "insensitive" as const } },
        { pinyinName: { contains: search, mode: "insensitive" as const } },
        { chineseName: { contains: search } },
      ],
    }),
  };

  const [acupoints, total] = await Promise.all([
    prisma.acupuncturePoint.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.acupuncturePoint.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.manageAcu")}</h1>
          <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalAcupoints", { count: total })}</p>
        </div>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchAcupoints")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableCode")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tablePinyin")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableChinese")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "detail.acupoint.meridian")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableStatus")}</th>
              <th className="text-right px-4 py-3 font-medium text-muted">{t(messages, "admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {acupoints.map((ap) => (
              <tr key={ap.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-mono font-medium text-primary">{ap.code}</td>
                <td className="px-4 py-3 font-medium text-foreground">{ap.pinyinName}</td>
                <td className="px-4 py-3 text-muted">{localizeDbText(ap.chineseName, locale)}</td>
                <td className="px-4 py-3">
                  <Badge label={meridianLabel(locale, ap.meridian)} color="bg-purple-100 text-purple-800" size="sm" />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    label={ap.status === "PUBLISHED" ? t(messages, "admin.published") : t(messages, "admin.draft")}
                    color={ap.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/acupuncture/${ap.id}`} className="text-primary hover:underline text-xs">
                      {t(messages, "admin.view")}
                    </Link>
                    <DeleteButton entityType="acupuncture" entityId={ap.id} entityName={ap.code} />
                  </div>
                </td>
              </tr>
            ))}
            {acupoints.length === 0 && (
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
