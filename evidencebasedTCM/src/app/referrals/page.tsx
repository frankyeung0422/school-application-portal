import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { ReferralActions } from "@/components/referrals/ReferralActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS_ZH: Record<string, string> = {
  PENDING: "待回應", ACCEPTED: "已接受", DECLINED: "已婉拒", EXPIRED: "已過期", REVOKED: "已撤回",
};
const STATUS_CLS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  DECLINED: "bg-gray-100 text-gray-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  REVOKED: "bg-red-100 text-red-700",
};

export default async function ReferralsPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login?next=/referrals");

  const now = new Date();

  // Auto-expire any past-due PENDING/ACCEPTED entries lazily on visit.
  await prisma.referralRequest.updateMany({
    where: {
      OR: [{ toUserId: ctx.userId }, { fromUserId: ctx.userId }],
      status: { in: ["PENDING", "ACCEPTED"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const [inbound, outbound] = await Promise.all([
    prisma.referralRequest.findMany({
      where: { toUserId: ctx.userId },
      include: {
        patient: { select: { name: true } },
        fromUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralRequest.findMany({
      where: { fromUserId: ctx.userId },
      include: {
        patient: { select: { name: true } },
        toUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{T("轉介管理", "Referrals")}</h1>
      <p className="text-sm text-muted mb-6">
        {T(
          "時限性病人轉介。接受後將獲得唯讀存取權限直至到期時間。",
          "Time-boxed patient referrals. On accept, you get read-only access until the expiry timestamp.",
        )}
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          📥 {T("收到的轉介", "Inbound")} <span className="text-xs text-muted">({inbound.length})</span>
        </h2>
        {inbound.length === 0 ? (
          <p className="text-sm text-muted">{T("尚無收到的轉介。", "No inbound referrals.")}</p>
        ) : (
          <ul className="space-y-2">
            {inbound.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="font-medium">
                      {r.patient.name}{" "}
                      <span className="text-xs text-muted">
                        {T("由", "from")} {r.fromUser.name ?? r.fromUser.email}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {T("到期", "Expires")}: {r.expiresAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLS[r.status]}`}>
                    {isZh ? STATUS_LABELS_ZH[r.status] : r.status}
                  </span>
                </div>
                {r.reason && <p className="text-xs mt-1 whitespace-pre-wrap">{r.reason}</p>}
                <div className="mt-2 flex items-center gap-2">
                  {r.status === "ACCEPTED" && (
                    <Link href={`/patients/${r.patientId}`} className="text-xs text-primary hover:underline">
                      {T("查看病人 →", "View patient →")}
                    </Link>
                  )}
                  <ReferralActions locale={locale} referralId={r.id} role="recipient" status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">
          📤 {T("送出的轉介", "Outbound")} <span className="text-xs text-muted">({outbound.length})</span>
        </h2>
        {outbound.length === 0 ? (
          <p className="text-sm text-muted">{T("尚未送出任何轉介。", "No outbound referrals yet.")}</p>
        ) : (
          <ul className="space-y-2">
            {outbound.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="font-medium">
                      {r.patient.name}{" "}
                      <span className="text-xs text-muted">
                        {T("致", "to")} {r.toUser.name ?? r.toUser.email}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      {T("到期", "Expires")}: {r.expiresAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_CLS[r.status]}`}>
                    {isZh ? STATUS_LABELS_ZH[r.status] : r.status}
                  </span>
                </div>
                {r.reason && <p className="text-xs mt-1 whitespace-pre-wrap">{r.reason}</p>}
                <div className="mt-2">
                  <ReferralActions locale={locale} referralId={r.id} role="sender" status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
