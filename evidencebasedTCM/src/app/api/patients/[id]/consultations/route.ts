import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient } from "@/lib/patients/access";
import { checkRxInteractions } from "@/lib/patients/interaction-check";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function s(v: unknown, max = 5000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}
function sReq(v: unknown, max = 5000): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}
function intOrNull(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < min || n > max) return null;
  return n;
}

interface RxHerbInput {
  herbId?: unknown;
  dosage?: unknown;
  preparation?: unknown;
  notes?: unknown;
}
interface VitalsInput {
  bpSystolic?: unknown;
  bpDiastolic?: unknown;
  heartRate?: unknown;
  temperatureC?: unknown;
  respirationRate?: unknown;
  spo2?: unknown;
  weightKg?: unknown;
  heightCm?: unknown;
  fastingGlucose?: unknown;
  randomGlucose?: unknown;
  hba1c?: unknown;
  notes?: unknown;
}
interface CreateConsultationBody {
  visitDate?: unknown;
  chiefComplaint?: unknown;
  noteFormat?: unknown;
  inquiry?: unknown;
  inspection?: unknown;
  auscultation?: unknown;
  tongueBody?: unknown;
  tongueCoat?: unknown;
  tongueNotes?: unknown;
  tonguePhotoUrl?: unknown;
  pulseLeft?: unknown;
  pulseRight?: unknown;
  pulseNotes?: unknown;
  soapSubjective?: unknown;
  soapObjective?: unknown;
  soapAssessment?: unknown;
  soapPlan?: unknown;
  patternId?: unknown;
  patternFreeText?: unknown;
  westernDiagnosis?: unknown;
  treatmentPrinciple?: unknown;
  symptomScoreBefore?: unknown;
  symptomScoreAfter?: unknown;
  outcomeNotes?: unknown;
  adverseEffects?: unknown;
  nextVisitDate?: unknown;
  vitals?: VitalsInput | null;
  prescription?: {
    formulaId?: unknown;
    dosesPerDay?: unknown;
    daysSupply?: unknown;
    preparation?: unknown;
    notes?: unknown;
    herbs?: RxHerbInput[];
  } | null;
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id: patientId } = await params;

    const access = await canAccessPatient(ctx, patientId);
    if (!access.allowed || access.reason === "referral") {
      // Referral recipients have read-only access; cannot create consultations.
      return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });
    }
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, westernMeds: true },
    });
    if (!patient) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const body = (await req.json()) as CreateConsultationBody;
    const chiefComplaint = sReq(body.chiefComplaint, 2000);
    if (chiefComplaint.length === 0) {
      return NextResponse.json({ ok: false, error: "chief_complaint_required" }, { status: 400 });
    }

    const visitDate = typeof body.visitDate === "string" && body.visitDate.length > 0
      ? new Date(body.visitDate)
      : new Date();
    if (Number.isNaN(visitDate.getTime())) {
      return NextResponse.json({ ok: false, error: "invalid_visit_date" }, { status: 400 });
    }

    // Pattern validation — if patternId given, must exist.
    const patternId = s(body.patternId, 64);
    if (patternId) {
      const pat = await prisma.tcmPattern.findUnique({ where: { id: patternId }, select: { id: true } });
      if (!pat) {
        return NextResponse.json({ ok: false, error: "invalid_pattern" }, { status: 400 });
      }
    }

    // Pre-compute interaction warnings if Rx is present.
    let warningsJson: string | null = null;
    const rx = body.prescription;
    let herbInputs: Array<{ herbId: string; dosage: string; preparation: string | null; notes: string | null }> = [];
    if (rx && Array.isArray(rx.herbs) && rx.herbs.length > 0) {
      for (const h of rx.herbs) {
        const herbId = typeof h.herbId === "string" ? h.herbId : null;
        const dosage = typeof h.dosage === "string" ? h.dosage.trim() : "";
        if (!herbId || dosage.length === 0) continue;
        herbInputs.push({
          herbId,
          dosage: dosage.slice(0, 40),
          preparation: s(h.preparation, 60),
          notes: s(h.notes, 200),
        });
      }
      // Cap at 60 herbs (sanity).
      herbInputs = herbInputs.slice(0, 60);

      if (herbInputs.length > 0) {
        const warnings = await checkRxInteractions(
          herbInputs.map((h) => h.herbId),
          { patientId: patient.id, westernMedsText: patient.westernMeds },
        );
        if (warnings.length > 0) warningsJson = JSON.stringify(warnings);
      }
    }

    const noteFormat = body.noteFormat === "SOAP" ? "SOAP" as const : "TCM_FOUR_EXAM" as const;

    const consultation = await prisma.$transaction(async (tx) => {
      const c = await tx.consultation.create({
        data: {
          patientId,
          practitionerId: ctx.userId,
          visitDate,
          noteFormat,
          chiefComplaint,
          inquiry: s(body.inquiry),
          inspection: s(body.inspection),
          auscultation: s(body.auscultation),
          tongueBody: s(body.tongueBody, 80),
          tongueCoat: s(body.tongueCoat, 80),
          tongueNotes: s(body.tongueNotes, 1000),
          tonguePhotoUrl: s(body.tonguePhotoUrl, 400),
          pulseLeft: s(body.pulseLeft, 80),
          pulseRight: s(body.pulseRight, 80),
          pulseNotes: s(body.pulseNotes, 1000),
          soapSubjective: s(body.soapSubjective),
          soapObjective: s(body.soapObjective),
          soapAssessment: s(body.soapAssessment),
          soapPlan: s(body.soapPlan),
          patternId: patternId,
          patternFreeText: s(body.patternFreeText, 200),
          westernDiagnosis: s(body.westernDiagnosis, 500),
          treatmentPrinciple: s(body.treatmentPrinciple, 1000),
          symptomScoreBefore: intOrNull(body.symptomScoreBefore, 0, 10),
          symptomScoreAfter: intOrNull(body.symptomScoreAfter, 0, 10),
          outcomeNotes: s(body.outcomeNotes),
          adverseEffects: s(body.adverseEffects, 1000),
          nextVisitDate: typeof body.nextVisitDate === "string" && body.nextVisitDate.length > 0
            ? new Date(body.nextVisitDate)
            : null,
        },
      });

      // Vitals (optional)
      if (body.vitals) {
        const v = body.vitals;
        const hasAny =
          v.bpSystolic !== undefined || v.bpDiastolic !== undefined || v.heartRate !== undefined ||
          v.temperatureC !== undefined || v.respirationRate !== undefined || v.spo2 !== undefined ||
          v.weightKg !== undefined || v.heightCm !== undefined ||
          v.fastingGlucose !== undefined || v.randomGlucose !== undefined || v.hba1c !== undefined;
        if (hasAny) {
          const weight = typeof v.weightKg === "number" ? v.weightKg : null;
          const height = typeof v.heightCm === "number" ? v.heightCm : null;
          const bmi = weight && height && height > 0
            ? Math.round((weight / ((height / 100) ** 2)) * 10) / 10
            : null;
          await tx.consultationVital.create({
            data: {
              consultationId: c.id,
              bpSystolic: intOrNull(v.bpSystolic, 50, 260),
              bpDiastolic: intOrNull(v.bpDiastolic, 30, 160),
              heartRate: intOrNull(v.heartRate, 30, 220),
              temperatureC: typeof v.temperatureC === "number" ? v.temperatureC : null,
              respirationRate: intOrNull(v.respirationRate, 6, 60),
              spo2: intOrNull(v.spo2, 50, 100),
              weightKg: weight,
              heightCm: height,
              bmi,
              fastingGlucose: typeof v.fastingGlucose === "number" ? v.fastingGlucose : null,
              randomGlucose: typeof v.randomGlucose === "number" ? v.randomGlucose : null,
              hba1c: typeof v.hba1c === "number" ? v.hba1c : null,
              notes: s(v.notes, 500),
            },
          });
        }
      }

      if (rx && herbInputs.length > 0) {
        await tx.consultationPrescription.create({
          data: {
            consultationId: c.id,
            formulaId: s(rx.formulaId, 64),
            dosesPerDay: intOrNull(rx.dosesPerDay, 1, 6) ?? 1,
            daysSupply: intOrNull(rx.daysSupply, 1, 90) ?? 7,
            preparation: s(rx.preparation, 400),
            notes: s(rx.notes, 1000),
            interactionWarnings: warningsJson,
            herbs: {
              create: herbInputs.map((h, idx) => ({
                herbId: h.herbId,
                dosage: h.dosage,
                preparation: h.preparation,
                notes: h.notes,
                ordinal: idx,
              })),
            },
          },
        });
      }

      // Bump patient's updatedAt so list ordering reflects recent activity.
      await tx.patient.update({ where: { id: patientId }, data: { updatedAt: new Date() } });

      return c;
    });

    await writeAuditLog(ctx, {
      action: "consultation.create",
      entityType: "consultation",
      entityId: consultation.id,
      meta: { patientId, hasRx: herbInputs.length > 0, warningsCount: warningsJson ? JSON.parse(warningsJson).length : 0 },
    }, req);
    return NextResponse.json({ ok: true, id: consultation.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
