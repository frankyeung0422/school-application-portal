import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; action?: string }>;
}

const PER_PAGE = 50;

const ACTION_LABEL_ZH: Record<string, string> = {
  "patient.view": "查看病人",
  "patient.create": "新增病人",
  "patient.update": "更新病人",
  "patient.archive": "封存病人",
  "consultation.create": "新增診療紀錄",
  "consultation.view": "查看診療紀錄",
  "clinic.create": "建立診所",
  "clinic.member.add": "新增成員",
  "clinic.member.remove": "移除成員",
  "referral.create": "建立轉介",
  "referral.accept": "接受轉介",
  "referral.decline": "婉拒轉介",
  "referral.revoke": "撤回轉介",
  "audit.view": "查看審計",
  "2fa.enable": "啟用 2FA",
  "2fa.disable": "停用 2FA",
};

export default async function ClinicAuditPage({ params, searchParams }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const actionFilter = sp.action?.trim() || null;

  const me = await prisma.clinicMember.findUnique({
    where: { clinicId_userId: { clinicId: id, userId: ctx.userId } },
  });
  const isOwner = me?.role === "OWNER" || ctx.role === "ADMIN";
  if (!isOwner) notFound();

  // The audit log is global per-user; for a clinic-scoped view we filter by
  // actors who are members of the clinic.
  const memberIds = (await prisma.clinicMember.findMany({
    where: { clinicId: id },
    select: { userId: true },
  })).map((m) => m.userId);

  const where = {
    actorUserId: { in: memberIds },
    ...(actionFilter ? { action: actionFilter } : {}),
  };
  const [total, logs, distinctActions] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
      include: { actor: { select: { email: true, name: true } } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      where: { actorUserId: { in: memberIds } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
  ]);

  await writeAuditLog(ctx, { action: "audit.view", entityType: "clinic", entityId: id });

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href={`/clinic/${id}`} className="hover:underline">← {T("返回診所", "Back to clinic")}</Link>
      </nav>
      <h1 className="text-3xl font-bold mb-1">📜 {T("審計日誌", "Audit Log")}</h1>
      <p className="text-sm text-muted mb-6">
        {T(
          "記錄診所成員對病人資料的所有存取行為（HIPAA 風格）。包含查看、修改、處方、轉介等。",
          "All clinic-member accesses to patient data are recorded (HIPAA-style). Views, edits, prescriptions, referrals.",
        )}
      </p>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-xs text-muted">{T("篩選：", "Filter: ")}</span>
        <Link
          href={`/clinic/${id}/audit`}
          className={`text-xs px-2 py-1 rounded border ${!actionFilter ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
        >
          {T("全部", "All")} <span className="opacity-60">({total})</span>
        </Link>
        {distinctActions.map((a) => (
          <Link
            key={a.action}
            href={`/clinic/${id}/audit?action=${encodeURIComponent(a.action)}`}
            className={`text-xs px-2 py-1 rounded border ${
              actionFilter === a.action
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            {isZh ? (ACTION_LABEL_ZH[a.action] ?? a.action) : a.action} <span className="opacity-60">({a._count._all})</span>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-background text-xs text-muted">
            <tr>
              <th className="text-left px-3 py-2 font-medium">{T("時間", "When")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("操作者", "Actor")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("動作", "Action")}</th>
              <th className="text-left px-3 py-2 font-medium">{T("對象", "Entity")}</th>
              <th className="text-left px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs whitespace-nowrap">{l.createdAt.toISOString().replace("T", " ").slice(0, 16)}</td>
                <td className="px-3 py-2 text-xs">{l.actor.name ?? l.actor.email}</td>
                <td className="px-3 py-2">
                  <span className="font-mono text-xs">{l.action}</span>
                </td>
                <td className="px-3 py-2 text-xs text-muted">
                  {l.entityType}{l.entityId && `:${l.entityId.slice(0, 8)}`}
                </td>
                <td className="px-3 py-2 text-xs text-muted">{l.ipAddress ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted text-xs">{T("無記錄", "No records")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>{T("頁", "Page")} {page} / {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/clinic/${id}/audit?page=${page - 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className="rounded border border-border bg-background px-3 py-1 hover:bg-surface"
              >
                {T("← 上頁", "← Prev")}
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/clinic/${id}/audit?page=${page + 1}${actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : ""}`}
                className="rounded border border-border bg-background px-3 py-1 hover:bg-surface"
              >
                {T("下頁 →", "Next →")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
