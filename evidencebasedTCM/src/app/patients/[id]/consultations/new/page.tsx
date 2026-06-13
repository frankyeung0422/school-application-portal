import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext, canAccessPatient } from "@/lib/patients/access";
import { ConsultationForm } from "@/components/patients/ConsultationForm";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export default async function NewConsultationPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed || access.reason === "referral") notFound();
  const [patient, patterns, formulas, herbs] = await Promise.all([
    prisma.patient.findUnique({
      where: { id },
      select: { id: true, name: true, westernMeds: true },
    }),
    prisma.tcmPattern.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { chineseName: "asc" },
      select: { id: true, chineseName: true, pinyinName: true, treatmentPrinciple: true },
    }),
    prisma.formula.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { chineseName: "asc" },
      select: {
        id: true,
        chineseName: true,
        pinyinName: true,
        category: true,
        herbs: {
          orderBy: { role: "asc" },
          select: {
            herbId: true,
            dosage: true,
            notes: true,
            herb: { select: { chineseName: true, pinyinName: true } },
          },
        },
      },
    }),
    prisma.herb.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { pinyinName: "asc" },
      select: { id: true, chineseName: true, pinyinName: true, category: true, dosageRange: true },
    }),
  ]);
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href={`/patients/${patient.id}`} className="hover:underline">
          {locale === "zh-Hant" ? `← ${patient.name} 的檔案` : `← ${patient.name}`}
        </Link>
      </nav>
      <h1 className="text-3xl font-bold mb-1">
        {locale === "zh-Hant" ? "新增就診紀錄" : "New Consultation"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {patient.name}
        {patient.westernMeds && (
          <span className="ml-2 text-yellow-700 dark:text-yellow-300">
            · {locale === "zh-Hant" ? "正在服用" : "Taking"}: {patient.westernMeds}
          </span>
        )}
      </p>

      <ConsultationForm
        locale={locale}
        patientId={patient.id}
        patientWesternMeds={patient.westernMeds}
        patterns={patterns}
        formulas={formulas.map((f) => ({
          ...f,
          herbs: f.herbs.map((h) => ({
            herbId: h.herbId,
            dosage: h.dosage ?? "",
            notes: h.notes ?? null,
            chineseName: h.herb.chineseName,
            pinyinName: h.herb.pinyinName,
          })),
        }))}
        herbs={herbs}
      />
    </div>
  );
}
