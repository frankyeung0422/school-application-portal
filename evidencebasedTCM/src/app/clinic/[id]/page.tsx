import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { ClinicMemberManager } from "@/components/clinic/ClinicMemberManager";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export default async function ClinicDetailPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const me = await prisma.clinicMember.findUnique({
    where: { clinicId_userId: { clinicId: id, userId: ctx.userId } },
  });
  if (!me && ctx.role !== "ADMIN" && ctx.role !== "EDITOR") notFound();

  const clinic = await prisma.clinic.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { patients: true } },
    },
  });
  if (!clinic) notFound();

  const isOwner = (me?.role === "OWNER") || ctx.role === "ADMIN";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href="/clinic" className="hover:underline">← {T("診所列表", "Clinics")}</Link>
      </nav>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{clinic.name}</h1>
          <p className="text-sm text-muted mt-1">
            {clinic.address && <>{clinic.address} · </>}
            {clinic._count.patients} {T("位病人", "patients")} · {clinic.members.length} {T("位成員", "members")}
          </p>
        </div>
        {isOwner && (
          <Link
            href={`/clinic/${clinic.id}/audit`}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-surface"
          >
            📜 {T("審計日誌", "Audit log")}
          </Link>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-3">{T("團隊成員", "Team members")}</h2>
      <ClinicMemberManager
        locale={locale}
        clinicId={clinic.id}
        isOwner={isOwner}
        members={clinic.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        }))}
      />
    </div>
  );
}
