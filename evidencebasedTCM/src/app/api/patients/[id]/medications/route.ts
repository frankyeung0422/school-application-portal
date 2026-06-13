import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient, type PractitionerContext } from "@/lib/patients/access";
import { getDrugByGeneric } from "@/lib/safety/rxnorm-subset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
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
    const rows = await prisma.patientMedication.findMany({
      where: { patientId: id },
      orderBy: [{ endDate: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, medications: rows });
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
    const generic = typeof body.drugGeneric === "string" ? body.drugGeneric.trim().toLowerCase() : "";
    if (generic.length === 0) {
      return NextResponse.json({ ok: false, error: "drug_required" }, { status: 400 });
    }
    const known = getDrugByGeneric(generic);
    const displayName = typeof body.displayName === "string" && body.displayName.trim().length > 0
      ? body.displayName.trim().slice(0, 120)
      : known?.display ?? generic;
    const drugClass = known?.className ?? (typeof body.drugClass === "string" ? body.drugClass : null);

    const startDate = typeof body.startDate === "string" && body.startDate.length > 0
      ? new Date(body.startDate) : null;
    const endDate = typeof body.endDate === "string" && body.endDate.length > 0
      ? new Date(body.endDate) : null;

    const created = await prisma.patientMedication.create({
      data: {
        patientId: id,
        drugGeneric: generic,
        displayName,
        drugClass,
        dose: typeof body.dose === "string" ? body.dose.trim().slice(0, 80) || null : null,
        route: typeof body.route === "string" ? body.route.trim().slice(0, 30) || null : null,
        prn: body.prn === true,
        startDate,
        endDate,
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) || null : null,
      },
    });
    return NextResponse.json({ ok: true, medication: created }, { status: 201 });
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
    const medId = url.searchParams.get("medicationId");
    if (!medId) {
      return NextResponse.json({ ok: false, error: "med_id_required" }, { status: 400 });
    }
    await prisma.patientMedication.deleteMany({ where: { id: medId, patientId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
