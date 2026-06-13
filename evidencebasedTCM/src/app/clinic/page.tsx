import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { ClinicCreateForm } from "@/components/clinic/ClinicCreateForm";

export const dynamic = "force-dynamic";

export default async function ClinicHubPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login?next=/clinic");

  const memberships = await prisma.clinicMember.findMany({
    where: { userId: ctx.userId },
    include: {
      clinic: {
        include: {
          _count: { select: { members: true, patients: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{T("診所 / 多人協作", "Clinic / Multi-Practitioner")}</h1>
      <p className="text-sm text-muted mb-6">
        {T(
          "建立診所將病人檔案在團隊內共享。每位成員可有不同角色（負責人 / 醫師 / 接待員）。",
          "Create a clinic to share patient records across a team. Each member has a role (Owner / Practitioner / Receptionist).",
        )}
      </p>

      <h2 className="text-lg font-semibold mb-3">
        {T("您所屬的診所", "Your Clinics")} <span className="text-xs text-muted">({memberships.length})</span>
      </h2>
      {memberships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 bg-surface mb-6 text-center">
          <p className="text-sm text-muted">{T("尚未加入任何診所。", "You're not part of any clinic yet.")}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {memberships.map((m) => (
            <Link
              key={m.id}
              href={`/clinic/${m.clinicId}`}
              className="block rounded-lg border border-border bg-surface p-4 hover:border-primary-light"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{m.clinic.name}</h3>
                  <p className="text-xs text-muted">
                    {m.clinic._count.members} {T("位成員", "members")} · {m.clinic._count.patients} {T("位病人", "patients")}
                    {m.clinic.address && ` · ${m.clinic.address}`}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5">
                  {m.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">{T("建立新診所", "Create a new clinic")}</h2>
      <ClinicCreateForm locale={locale} />
    </div>
  );
}
