import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { Pagination } from "@/components/shared/Pagination";
import { getLocale } from "@/lib/i18n/locale-server";
import { getMessages } from "@/lib/i18n/messages";
import { t } from "@/lib/i18n/resolve-message";
import { tf } from "@/lib/i18n/format-message";
import { userRoleLabel } from "@/lib/i18n/data-labels";

const ITEMS_PER_PAGE = 20;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-800",
  EDITOR: "bg-blue-100 text-blue-800",
  PRACTITIONER: "bg-emerald-100 text-emerald-800",
  PUBLIC: "bg-gray-100 text-gray-600",
};

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const search = params.search || "";

  const where = {
    ...(search && {
      OR: [
        { email: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { bookmarks: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const dateFmt = new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-TW" : "en-US", {
    dateStyle: "medium",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t(messages, "admin.manageUsers")}</h1>
        <p className="text-sm text-muted mt-1">{tf(messages, "admin.totalUsers", { count: total })}</p>
      </div>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder={t(messages, "admin.searchUsers")}
          className="w-full max-w-md rounded-lg border border-border bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/20"
        />
      </form>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableName")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableEmail")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableRole")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableBookmarks")}</th>
              <th className="text-left px-4 py-3 font-medium text-muted">{t(messages, "admin.tableJoined")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-background/50">
                <td className="px-4 py-3 font-medium text-foreground">{user.name || t(messages, "common.dash")}</td>
                <td className="px-4 py-3 text-muted">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    label={userRoleLabel(locale, user.role)}
                    color={ROLE_COLORS[user.role] || "bg-gray-100 text-gray-600"}
                    size="sm"
                  />
                </td>
                <td className="px-4 py-3 text-muted">{user._count.bookmarks}</td>
                <td className="px-4 py-3 text-muted text-xs">{dateFmt.format(user.createdAt)}</td>
              </tr>
            ))}
            {users.length === 0 && (
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
