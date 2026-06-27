import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient, type PractitionerContext } from "@/lib/patients/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const TYPES = ["DRUG", "FOOD", "ENVIRONMENTAL", "HERB", "OTHER"] as const;
const SEVS = ["MILD", "MODERATE", "SEVERE", "ANAPHYLAXIS", "UNKNOWN"] as const;

function asType(v: unknown): typeof TYPES[number] | null {
  return (TYPES as readonly string[]).includes(v as string)
    ? (v as typeof TYPES[number])
    : null;
}
function asSev(v: unknown): typeof SEVS[number] {
  return (SEVS as readonly string[]).includes(v as string)
    ? (v as typeof SEVS[number])
    : "UNKNOWN";
}

async function readableId(id: string, ctx: PractitionerContext) {
  const a = await canAccessPatient(ctx, id);
  return a.allowed;
}
async function writableId(id: string, ctx: PractitionerContext) {
  const a = await canAccessPatient(ctx, id);
  return a.allowed && a.reason !== "referral";
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    if (!(await readableId(id, ctx))) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const rows = await prisma.patientAllergy.findMany({
      where: { patientId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, allergies: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 401 },
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    if (!(await writableId(id, ctx))) {
      return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const allergen = typeof body.allergen === "string" ? body.allergen.trim().slice(0, 120) : "";
    if (allergen.length === 0) {
      return NextResponse.json({ ok: false, error: "allergen_required" }, { status: 400 });
    }
    const allergyType = asType(body.type);
    if (allergyType === null) {
      return NextResponse.json({ ok: false, error: "invalid_type. Must be one of: DRUG, FOOD, ENVIRONMENTAL, HERB, OTHER" }, { status: 400 });
    }
    const created = await prisma.patientAllergy.create({
      data: {
        patientId: id,
        type: allergyType,
        allergen,
        reaction: typeof body.reaction === "string" ? body.reaction.trim().slice(0, 200) || null : null,
        severity: asSev(body.severity),
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
      },
    });
    return NextResponse.json({ ok: true, allergy: created }, { status: 201 });
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
    if (!(await writableId(id, ctx))) {
      return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });
    }
    const url = new URL(req.url);
    const allergyId = url.searchParams.get("allergyId");
    if (!allergyId) {
      return NextResponse.json({ ok: false, error: "allergy_id_required" }, { status: 400 });
    }
    const { count } = await prisma.patientAllergy.deleteMany({ where: { id: allergyId, patientId: id } });
    if (count === 0) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
