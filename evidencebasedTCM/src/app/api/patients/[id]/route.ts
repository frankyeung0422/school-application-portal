import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient, type PractitionerContext } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readablePatient(id: string, ctx: PractitionerContext) {
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed) return null;
  return prisma.patient.findUnique({ where: { id } });
}

/**
 * Mutations (PUT/DELETE) still require ownership OR clinic membership —
 * referral recipients get read-only access.
 */
async function writablePatient(id: string, ctx: PractitionerContext) {
  const access = await canAccessPatient(ctx, id);
  if (!access.allowed) return null;
  if (access.reason === "referral") return null; // read-only
  return prisma.patient.findUnique({ where: { id } });
}

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    const access = await canAccessPatient(ctx, id);
    if (!access.allowed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    await writeAuditLog(ctx, {
      action: "patient.view", entityType: "patient", entityId: id, meta: { via: access.reason },
    }, req);
    const p = await prisma.patient.findUnique({
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
                id: true,
                baseFormula: { select: { chineseName: true } },
                herbs: { select: { id: true } },
              },
            },
            symptomScoreBefore: true,
            symptomScoreAfter: true,
          },
        },
      },
    });
    if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, patient: p });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    const status = msg === "practitioner_required" || msg === "auth:unauthenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

const GENDERS = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
function asGender(v: unknown): typeof GENDERS[number] | undefined {
  return (GENDERS as readonly string[]).includes(v as string)
    ? (v as typeof GENDERS[number])
    : undefined;
}
function asNullableString(v: unknown, max = 5000): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    const existing = await writablePatient(id, ctx);
    if (!existing) return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const dob = body.dateOfBirth;
    const dobVal =
      dob === undefined
        ? undefined
        : dob === null || dob === ""
          ? null
          : new Date(String(dob));
    if (dobVal instanceof Date && Number.isNaN(dobVal.getTime())) {
      return NextResponse.json({ ok: false, error: "invalid_dob" }, { status: 400 });
    }

    await prisma.patient.update({
      where: { id },
      data: {
        name: typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim().slice(0, 120) : undefined,
        gender: asGender(body.gender),
        dateOfBirth: dobVal,
        contactPhone: asNullableString(body.contactPhone, 40),
        contactEmail: asNullableString(body.contactEmail, 200),
        occupation: asNullableString(body.occupation, 80),
        allergies: asNullableString(body.allergies),
        chronicConditions: asNullableString(body.chronicConditions),
        westernMeds: asNullableString(body.westernMeds),
        notes: asNullableString(body.notes),
        archived: typeof body.archived === "boolean" ? body.archived : undefined,
      },
    });
    await writeAuditLog(ctx, {
      action: typeof body.archived === "boolean" && body.archived ? "patient.archive" : "patient.update",
      entityType: "patient",
      entityId: id,
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    const existing = await writablePatient(id, ctx);
    if (!existing) return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });
    // Soft-archive instead of hard-delete — clinical records should be retained.
    await prisma.patient.update({ where: { id }, data: { archived: true } });
    await writeAuditLog(ctx, { action: "patient.archive", entityType: "patient", entityId: id }, req);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
