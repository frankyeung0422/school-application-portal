import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePractitioner();
    const url = new URL(req.url);
    const search = url.searchParams.get("q")?.trim() ?? "";
    const archived = url.searchParams.get("archived") === "true";

    const where = {
      practitionerId: ctx.userId,
      archived,
      ...(search.length > 0
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { contactPhone: { contains: search, mode: "insensitive" as const } },
              { contactEmail: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        gender: true,
        dateOfBirth: true,
        contactPhone: true,
        updatedAt: true,
        _count: { select: { consultations: true } },
      },
    });
    return NextResponse.json({ ok: true, patients });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "internal";
    const status = msg === "practitioner_required" || msg === "auth:unauthenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

interface CreateBody {
  name?: unknown;
  gender?: unknown;
  dateOfBirth?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
  occupation?: unknown;
  allergies?: unknown;
  chronicConditions?: unknown;
  westernMeds?: unknown;
  notes?: unknown;
}

const GENDERS = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
function asGender(v: unknown): typeof GENDERS[number] {
  return (GENDERS as readonly string[]).includes(v as string)
    ? (v as typeof GENDERS[number])
    : "UNDISCLOSED";
}
function asString(v: unknown, max: number = 5000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePractitioner();
    const body = (await req.json()) as CreateBody;
    const name = asString(body.name, 120);
    if (!name) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }
    const dob = typeof body.dateOfBirth === "string" && body.dateOfBirth.length > 0
      ? new Date(body.dateOfBirth)
      : null;
    if (dob && Number.isNaN(dob.getTime())) {
      return NextResponse.json({ ok: false, error: "invalid_dob" }, { status: 400 });
    }
    const patient = await prisma.patient.create({
      data: {
        practitionerId: ctx.userId,
        name,
        gender: asGender(body.gender),
        dateOfBirth: dob,
        contactPhone: asString(body.contactPhone, 40),
        contactEmail: asString(body.contactEmail, 200),
        occupation: asString(body.occupation, 80),
        allergies: asString(body.allergies),
        chronicConditions: asString(body.chronicConditions),
        westernMeds: asString(body.westernMeds),
        notes: asString(body.notes),
      },
      select: { id: true },
    });
    await writeAuditLog(ctx, { action: "patient.create", entityType: "patient", entityId: patient.id }, req);
    return NextResponse.json({ ok: true, id: patient.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
