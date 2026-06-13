import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext, canAccessPatient } from "@/lib/patients/access";
import { PatientForm } from "@/components/patients/PatientForm";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export default async function EditPatientPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed || access.reason === "referral") notFound();
  const p = await prisma.patient.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href={`/patients/${p.id}`} className="hover:underline">
          {locale === "zh-Hant" ? "← 返回病人檔案" : "← Back to patient"}
        </Link>
      </nav>
      <h1 className="text-3xl font-bold mb-6">
        {locale === "zh-Hant" ? "編輯病人資料" : "Edit Patient"}
      </h1>
      <PatientForm
        locale={locale}
        mode="edit"
        initial={{
          id: p.id,
          name: p.name,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth?.toISOString() ?? null,
          contactPhone: p.contactPhone,
          contactEmail: p.contactEmail,
          occupation: p.occupation,
          allergies: p.allergies,
          chronicConditions: p.chronicConditions,
          westernMeds: p.westernMeds,
          notes: p.notes,
        }}
      />
    </div>
  );
}
