import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getPractitionerContext, canAccessPatient } from "@/lib/patients/access";
import { ConsultationPrint } from "@/components/patients/ConsultationPrint";
import type { InteractionWarning } from "@/lib/patients/interaction-check";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; cid: string }>;
}

function parseWarnings(json: string | null): InteractionWarning[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as InteractionWarning[]) : [];
  } catch {
    return [];
  }
}

export default async function ConsultationDetailPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const ctx = await getPractitionerContext();
  if (!ctx) redirect("/login");

  const { id, cid } = await params;
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed) notFound();
  const c = await prisma.consultation.findFirst({
    where: { id: cid, patientId: id },
    include: {
      patient: { select: { id: true, name: true, gender: true, dateOfBirth: true, contactPhone: true } },
      pattern: { select: { chineseName: true, pinyinName: true } },
      practitioner: { select: { name: true, email: true } },
      prescription: {
        include: {
          baseFormula: { select: { id: true, chineseName: true, pinyinName: true } },
          herbs: {
            orderBy: { ordinal: "asc" },
            include: { herb: { select: { chineseName: true, pinyinName: true, category: true } } },
          },
        },
      },
      vitals: { orderBy: { measuredAt: "desc" } },
    },
  });
  if (!c) notFound();

  const warnings = parseWarnings(c.prescription?.interactionWarnings ?? null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-xs text-muted mb-3 print:hidden">
        <Link href={`/patients/${c.patient.id}`} className="hover:underline">
          {T("←", "←")} {c.patient.name}
        </Link>
      </nav>

      <div className="flex items-start justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">{T("就診紀錄", "Consultation")}</h1>
          <p className="text-sm text-muted">{c.visitDate.toISOString().slice(0, 10)} · {c.patient.name}</p>
        </div>
        <ConsultationPrint locale={locale} />
      </div>

      {warnings.length > 0 && (
        <div className="mb-5 rounded-lg border border-red-400/50 bg-red-50/60 dark:bg-red-900/10 p-4 print:break-inside-avoid">
          <h2 className="text-sm font-bold mb-2 text-red-700 dark:text-red-300">
            ⚠ {T("中藥-西藥交互作用警示", "Herb-Drug Interaction Warnings")}
          </h2>
          <ul className="space-y-2 text-xs">
            {warnings.map((w, i) => (
              <li key={i} className="border-l-2 border-red-400 pl-3">
                <div>
                  <span className="font-semibold">{w.herbChineseName}</span> ({w.herbPinyinName}) ×{" "}
                  <span className="font-semibold">{w.drugMatched}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-[10px] font-medium">
                    {w.severity}
                  </span>
                </div>
                {w.clinicalEffect && <div className="text-muted mt-0.5">{T("臨床效應：", "Effect: ")}{w.clinicalEffect}</div>}
                {w.management && <div className="text-muted">{T("處置：", "Management: ")}{w.management}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Printable area */}
      <div className="rounded-lg border border-border bg-surface p-6 space-y-5 print:border-0 print:shadow-none">
        <header className="print:block hidden border-b border-border pb-3 mb-3">
          <h1 className="text-2xl font-bold">{T("中醫診療紀錄", "TCM Consultation Record")}</h1>
          <p className="text-xs text-muted">
            {c.practitioner.name} ({c.practitioner.email}) · {c.visitDate.toISOString().slice(0, 10)}
          </p>
        </header>

        <Section title={T("病人資料", "Patient")}>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted">{T("姓名：", "Name: ")}</span>{c.patient.name}</div>
            <div><span className="text-muted">{T("聯絡：", "Phone: ")}</span>{c.patient.contactPhone ?? "—"}</div>
          </div>
        </Section>

        <Section title={T("主訴", "Chief Complaint")}>
          <p className="text-sm whitespace-pre-wrap">{c.chiefComplaint}</p>
        </Section>

        {/* SOAP rendering when noteFormat === SOAP */}
        {c.noteFormat === "SOAP" && (
          <div className="space-y-3">
            {c.soapSubjective && (
              <Section title="S — Subjective">
                <p className="text-sm whitespace-pre-wrap">{c.soapSubjective}</p>
              </Section>
            )}
            {c.soapObjective && (
              <Section title="O — Objective">
                <p className="text-sm whitespace-pre-wrap">{c.soapObjective}</p>
              </Section>
            )}
            {c.soapAssessment && (
              <Section title="A — Assessment">
                <p className="text-sm whitespace-pre-wrap">{c.soapAssessment}</p>
              </Section>
            )}
            {c.soapPlan && (
              <Section title="P — Plan">
                <p className="text-sm whitespace-pre-wrap">{c.soapPlan}</p>
              </Section>
            )}
          </div>
        )}

        {/* Vitals — shown in both modes when present */}
        {c.vitals.length > 0 && (
          <Section title={T("生命徵象", "Vitals")}>
            {c.vitals.map((v) => {
              const items: Array<[string, string]> = [];
              if (v.bpSystolic && v.bpDiastolic) items.push([T("血壓", "BP"), `${v.bpSystolic}/${v.bpDiastolic} mmHg`]);
              if (v.heartRate) items.push([T("心率", "HR"), `${v.heartRate} bpm`]);
              if (v.temperatureC !== null && v.temperatureC !== undefined) items.push([T("體溫", "Temp"), `${v.temperatureC.toFixed(1)}℃`]);
              if (v.respirationRate) items.push([T("呼吸", "RR"), `${v.respirationRate}`]);
              if (v.spo2) items.push(["SpO₂", `${v.spo2}%`]);
              if (v.weightKg) items.push([T("體重", "Weight"), `${v.weightKg} kg`]);
              if (v.heightCm) items.push([T("身高", "Height"), `${v.heightCm} cm`]);
              if (v.bmi) items.push(["BMI", `${v.bmi}`]);
              if (v.fastingGlucose) items.push([T("空腹血糖", "FBG"), `${v.fastingGlucose} mmol/L`]);
              if (v.hba1c) items.push(["HbA1c", `${v.hba1c}%`]);
              return (
                <div key={v.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  {items.map(([k, val]) => (
                    <div key={k}>
                      <span className="text-muted">{k}: </span>
                      <span className="font-medium">{val}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </Section>
        )}

        {c.inquiry && (
          <Section title={T("問診", "Inquiry (問)")}>
            <p className="text-sm whitespace-pre-wrap">{c.inquiry}</p>
          </Section>
        )}

        {(c.inspection || c.auscultation) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {c.inspection && (
              <Section title={T("望診", "Inspection (望)")}>
                <p className="text-sm whitespace-pre-wrap">{c.inspection}</p>
              </Section>
            )}
            {c.auscultation && (
              <Section title={T("聞診", "Auscultation (聞)")}>
                <p className="text-sm whitespace-pre-wrap">{c.auscultation}</p>
              </Section>
            )}
          </div>
        )}

        {(c.tongueBody || c.tongueCoat || c.tongueNotes || c.tonguePhotoUrl) && (
          <Section title={T("舌診", "Tongue")}>
            <div className="grid gap-3 sm:grid-cols-[1fr,auto] items-start">
              <dl className="text-sm space-y-1">
                {c.tongueBody && <Row label={T("舌質", "Body")} value={c.tongueBody} />}
                {c.tongueCoat && <Row label={T("舌苔", "Coat")} value={c.tongueCoat} />}
                {c.tongueNotes && <Row label={T("備註", "Notes")} value={c.tongueNotes} />}
              </dl>
              {c.tonguePhotoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={c.tonguePhotoUrl} alt="tongue" className="h-32 w-32 object-cover rounded border border-border" />
              )}
            </div>
          </Section>
        )}

        {(c.pulseLeft || c.pulseRight || c.pulseNotes) && (
          <Section title={T("脈診", "Pulse")}>
            <dl className="text-sm space-y-1">
              {c.pulseLeft && <Row label={T("左", "Left")} value={c.pulseLeft} />}
              {c.pulseRight && <Row label={T("右", "Right")} value={c.pulseRight} />}
              {c.pulseNotes && <Row label={T("備註", "Notes")} value={c.pulseNotes} />}
            </dl>
          </Section>
        )}

        {(c.pattern || c.patternFreeText || c.westernDiagnosis) && (
          <Section title={T("辨證 / 診斷", "Diagnosis")}>
            {(c.pattern || c.patternFreeText) && (
              <p className="text-sm">
                <span className="text-muted text-xs">{T("TCM：", "TCM: ")}</span>
                {c.pattern
                  ? <><span className="font-medium">{c.pattern.chineseName}</span> <span className="text-muted">({c.pattern.pinyinName})</span></>
                  : c.patternFreeText}
              </p>
            )}
            {c.westernDiagnosis && (
              <p className="text-sm mt-1">
                <span className="text-muted text-xs">{T("西醫：", "Western: ")}</span>
                {c.westernDiagnosis}
              </p>
            )}
            {c.treatmentPrinciple && (
              <p className="text-sm mt-2">
                <span className="text-muted">{T("治法：", "Principle: ")}</span>{c.treatmentPrinciple}
              </p>
            )}
          </Section>
        )}

        {c.prescription && c.prescription.herbs.length > 0 && (
          <Section title={T("處方", "Prescription")}>
            {c.prescription.baseFormula && (
              <p className="text-sm mb-2">
                <span className="text-muted">{T("方劑：", "Formula: ")}</span>
                <span className="font-medium">{c.prescription.baseFormula.chineseName}</span>{" "}
                <span className="text-muted text-xs">({c.prescription.baseFormula.pinyinName})</span>
              </p>
            )}
            <table className="w-full text-sm border border-border">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">{T("藥材", "Herb")}</th>
                  <th className="text-left px-3 py-1.5 font-medium w-24">{T("劑量", "Dosage")}</th>
                  <th className="text-left px-3 py-1.5 font-medium w-28">{T("煎法", "Prep")}</th>
                  <th className="text-left px-3 py-1.5 font-medium">{T("備註", "Notes")}</th>
                </tr>
              </thead>
              <tbody>
                {c.prescription.herbs.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{h.herb.chineseName}</span>{" "}
                      <span className="text-xs text-muted">{h.herb.pinyinName}</span>
                    </td>
                    <td className="px-3 py-1.5">{h.dosage}</td>
                    <td className="px-3 py-1.5 text-muted">{h.preparation ?? ""}</td>
                    <td className="px-3 py-1.5 text-muted">{h.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-2">
              {c.prescription.dosesPerDay}{T(" 劑/日 × ", " dose/day × ")}{c.prescription.daysSupply}{T(" 日", " days")}
              {c.prescription.preparation && ` · ${c.prescription.preparation}`}
            </p>
            {c.prescription.notes && (
              <p className="text-sm mt-2 whitespace-pre-wrap">{c.prescription.notes}</p>
            )}
          </Section>
        )}

        {(c.symptomScoreBefore !== null || c.symptomScoreAfter !== null || c.outcomeNotes || c.adverseEffects) && (
          <Section title={T("療效評估", "Outcome")}>
            {c.symptomScoreBefore !== null && c.symptomScoreAfter !== null && (
              <p className="text-sm">
                {T("VAS 變化：", "VAS change: ")}
                <span className="font-medium">{c.symptomScoreBefore} → {c.symptomScoreAfter}</span>
                {c.symptomScoreAfter < c.symptomScoreBefore && (
                  <span className="ml-2 text-green-600">↓ {c.symptomScoreBefore - c.symptomScoreAfter}</span>
                )}
              </p>
            )}
            {c.outcomeNotes && <p className="text-sm mt-2 whitespace-pre-wrap">{c.outcomeNotes}</p>}
            {c.adverseEffects && (
              <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                {T("不良反應：", "Adverse effects: ")}{c.adverseEffects}
              </p>
            )}
          </Section>
        )}

        {c.nextVisitDate && (
          <p className="text-sm">
            <span className="text-muted">{T("下次預約：", "Next visit: ")}</span>
            <span className="font-medium">{c.nextVisitDate.toISOString().slice(0, 10)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="text-muted w-20 shrink-0">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
