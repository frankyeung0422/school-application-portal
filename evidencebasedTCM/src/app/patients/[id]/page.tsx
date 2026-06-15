import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext } from "@/lib/patients/access";
import { AllergyManager } from "@/components/patients/AllergyManager";
import { MedicationManager } from "@/components/patients/MedicationManager";
import { VitalsChart } from "@/components/patients/VitalsChart";
import { canAccessPatient } from "@/lib/patients/access";
import { ReferPatientButton } from "@/components/referrals/ReferPatientButton";

export const dynamic = "force-dynamic";

function age(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const yrs = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
  return yrs >= 0 && yrs < 150 ? yrs : null;
}

const CONSTITUTION_LABEL: Record<string, string> = {
  ping_he: "平和質", qi_xu: "氣虛質", yang_xu: "陽虛質", yin_xu: "陰虛質",
  tan_shi: "痰濕質", shi_re: "濕熱質", xue_yu: "血瘀質", qi_yu: "氣鬱質", te_bing: "特稟質",
};
function primaryLabel(key: string): string {
  return CONSTITUTION_LABEL[key] ?? key;
}

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id } = await params;
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed) notFound();
  const p = await prisma.patient.findFirst({
    where: { id },
    include: {
      consultations: {
        orderBy: { visitDate: "desc" },
        select: {
          id: true,
          visitDate: true,
          chiefComplaint: true,
          patternFreeText: true,
          pattern: { select: { chineseName: true, pinyinName: true } },
          prescription: {
            select: {
              baseFormula: { select: { chineseName: true } },
              herbs: { select: { id: true } },
              interactionWarnings: true,
            },
          },
          symptomScoreBefore: true,
          symptomScoreAfter: true,
          nextVisitDate: true,
        },
      },
      constitutions: { orderBy: { takenAt: "desc" }, take: 5 },
    },
  });
  if (!p) notFound();

  const a = age(p.dateOfBirth);
  const genderLabel = ({
    MALE: T("男", "M"),
    FEMALE: T("女", "F"),
    OTHER: T("其他", "Other"),
    UNDISCLOSED: "—",
  } as const)[p.gender];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href="/patients" className="hover:underline">{T("← 病人列表", "← Patients")}</Link>
      </nav>

      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{p.name}</h1>
          <p className="text-sm text-muted mt-1">
            {genderLabel}
            {a !== null && <> · {a}{T("歲", " yrs")}</>}
            {p.contactPhone && <> · {p.contactPhone}</>}
            {p.occupation && <> · {p.occupation}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/patients/${p.id}/consultations/new`}
            className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-light"
          >
            + {T("新增複診", "New visit")}
          </Link>
          <Link
            href={`/diagnose/constitution?patient=${p.id}`}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-surface"
          >
            🧬 {T("體質評估", "Constitution")}
          </Link>
          {access.reason !== "referral" && (
            <ReferPatientButton locale={locale} patientId={p.id} />
          )}
          <Link
            href={`/patients/${p.id}/edit`}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-surface"
          >
            {T("編輯資料", "Edit")}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h3 className="text-xs font-semibold text-muted mb-2">{T("過敏史", "Allergies")}</h3>
          <AllergyManager locale={locale} patientId={p.id} />
          {p.allergies && (
            <p className="text-xs text-muted mt-2 italic">{T("舊版備註：", "Legacy notes: ")}{p.allergies}</p>
          )}
        </div>
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-50/30 dark:bg-yellow-900/5 p-4">
          <h3 className="text-xs font-semibold text-muted mb-2">{T("目前西藥", "Current Western Meds")}</h3>
          <MedicationManager locale={locale} patientId={p.id} />
          {p.westernMeds && (
            <p className="text-xs text-muted mt-2 italic">{T("舊版備註：", "Legacy notes: ")}{p.westernMeds}</p>
          )}
        </div>
      </div>

      {p.chronicConditions && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <h3 className="text-xs font-semibold text-muted mb-2">{T("慢性病史", "Chronic conditions")}</h3>
          <p className="text-sm whitespace-pre-wrap">{p.chronicConditions}</p>
        </div>
      )}

      <div className="mb-6">
        <VitalsChart patientId={p.id} locale={locale} />
      </div>

      {p.constitutions.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-3">
            🧬 {T("體質辨識歷程", "Constitution History")}{" "}
            <span className="text-xs text-muted font-normal">({p.constitutions.length})</span>
          </h3>
          <ul className="space-y-1 text-sm">
            {p.constitutions.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-muted w-24">{c.takenAt.toISOString().slice(0, 10)}</span>
                <span className="font-medium">{primaryLabel(c.primary)}</span>
                {c.secondary && <span className="text-xs text-muted">+ {primaryLabel(c.secondary)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.notes && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6">
          <h3 className="text-xs font-semibold text-muted mb-2">{T("備註", "Notes")}</h3>
          <p className="text-sm whitespace-pre-wrap">{p.notes}</p>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">
        {T("就診紀錄", "Consultation history")}{" "}
        <span className="text-xs text-muted font-normal">({p.consultations.length})</span>
      </h2>

      {p.consultations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface">
          <p className="text-sm text-muted">
            {T("尚無就診紀錄。點擊「新增複診」開始記錄。", "No consultations yet. Click \"New visit\" to start.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {p.consultations.map((c) => {
            const hasWarnings =
              c.prescription?.interactionWarnings && c.prescription.interactionWarnings.length > 2;
            return (
              <Link
                key={c.id}
                href={`/patients/${p.id}/consultations/${c.id}`}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-primary-light transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="font-medium">
                    {c.visitDate.toISOString().slice(0, 10)}
                    {hasWarnings && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        ⚠ {T("交互作用警示", "Interaction warning")}
                      </span>
                    )}
                  </div>
                  {c.prescription && (
                    <span className="text-xs text-muted whitespace-nowrap">
                      💊 {c.prescription.baseFormula?.chineseName ?? T("自擬方", "Custom Rx")} · {c.prescription.herbs.length}{T("味", "")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted line-clamp-2">{c.chiefComplaint}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted">
                  {(c.pattern || c.patternFreeText) && (
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">
                      {c.pattern ? `${c.pattern.chineseName} (${c.pattern.pinyinName})` : c.patternFreeText}
                    </span>
                  )}
                  {c.symptomScoreBefore !== null && c.symptomScoreAfter !== null && (
                    <span>
                      VAS {c.symptomScoreBefore} → {c.symptomScoreAfter}
                    </span>
                  )}
                  {c.nextVisitDate && (
                    <span>
                      {T("下次", "Next")}: {c.nextVisitDate.toISOString().slice(0, 10)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  body,
  empty,
  highlight,
}: {
  title: string;
  body: string | null;
  empty: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight && body
          ? "border-yellow-400/50 bg-yellow-50/40 dark:bg-yellow-900/10"
          : "border-border bg-surface"
      }`}
    >
      <h3 className="text-xs font-semibold text-muted mb-2">{title}</h3>
      <p className="text-sm whitespace-pre-wrap">{body && body.length > 0 ? body : <span className="text-muted">{empty}</span>}</p>
    </div>
  );
}
