import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requirePractitioner();
    const memberships = await prisma.clinicMember.findMany({
      where: { userId: ctx.userId },
      include: {
        clinic: {
          select: {
            id: true, name: true, address: true, phone: true,
            _count: { select: { members: true, patients: true } },
          },
        },
      },
    });
    return NextResponse.json({
      ok: true,
      clinics: memberships.map((m) => ({
        clinic: m.clinic,
        myRole: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 401 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePractitioner();
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
    if (name.length === 0) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }
    const clinic = await prisma.$transaction(async (tx) => {
      const c = await tx.clinic.create({
        data: {
          name,
          address: typeof body.address === "string" ? body.address.trim().slice(0, 500) || null : null,
          phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 40) || null : null,
          email: typeof body.email === "string" ? body.email.trim().slice(0, 200) || null : null,
          notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) || null : null,
        },
      });
      // Creator becomes OWNER.
      await tx.clinicMember.create({
        data: { clinicId: c.id, userId: ctx.userId, role: "OWNER" },
      });
      return c;
    });
    await writeAuditLog(ctx, { action: "clinic.create", entityType: "clinic", entityId: clinic.id }, req);
    return NextResponse.json({ ok: true, id: clinic.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
