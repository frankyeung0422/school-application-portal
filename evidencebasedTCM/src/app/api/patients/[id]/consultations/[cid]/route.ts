import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient } from "@/lib/patients/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; cid: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id, cid } = await params;
    const access = await canAccessPatient(ctx, id);
    if (!access.allowed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    const c = await prisma.consultation.findFirst({
      where: { id: cid, patientId: id },
      include: {
        patient: { select: { id: true, name: true, gender: true, dateOfBirth: true } },
        pattern: { select: { id: true, chineseName: true, pinyinName: true } },
        prescription: {
          include: {
            baseFormula: { select: { id: true, chineseName: true, pinyinName: true } },
            herbs: {
              orderBy: { ordinal: "asc" },
              include: {
                herb: { select: { id: true, chineseName: true, pinyinName: true, category: true } },
              },
            },
          },
        },
      },
    });
    if (!c) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, consultation: c });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 401 },
    );
  }
}
