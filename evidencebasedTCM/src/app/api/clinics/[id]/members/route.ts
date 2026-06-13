import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, type PractitionerContext } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const ROLES = ["OWNER", "PRACTITIONER", "RECEPTIONIST"] as const;
function asRole(v: unknown): typeof ROLES[number] {
  return (ROLES as readonly string[]).includes(v as string)
    ? (v as typeof ROLES[number])
    : "PRACTITIONER";
}

async function isOwner(clinicId: string, ctx: PractitionerContext): Promise<boolean> {
  if (ctx.role === "ADMIN") return true;
  const m = await prisma.clinicMember.findUnique({
    where: { clinicId_userId: { clinicId, userId: ctx.userId } },
    select: { role: true },
  });
  return m?.role === "OWNER";
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    // Member of clinic can list members.
    const me = await prisma.clinicMember.findUnique({
      where: { clinicId_userId: { clinicId: id, userId: ctx.userId } },
    });
    if (!me && ctx.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const members = await prisma.clinicMember.findMany({
      where: { clinicId: id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return NextResponse.json({ ok: true, members, myRole: me?.role ?? "ADMIN" });
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
    if (!(await isOwner(id, ctx))) {
      return NextResponse.json({ ok: false, error: "owner_required" }, { status: 403 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length === 0) {
      return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }
    if (user.role === "PUBLIC") {
      return NextResponse.json({ ok: false, error: "user_not_practitioner" }, { status: 400 });
    }
    try {
      const member = await prisma.clinicMember.create({
        data: { clinicId: id, userId: user.id, role: asRole(body.role) },
      });
      await writeAuditLog(ctx, {
        action: "clinic.member.add",
        entityType: "clinic", entityId: id,
        meta: { addedUserId: user.id, role: member.role },
      }, req);
      return NextResponse.json({ ok: true, memberId: member.id }, { status: 201 });
    } catch (e) {
      // Unique violation = already a member.
      return NextResponse.json({ ok: false, error: "already_member" }, { status: 409 });
    }
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
    if (!(await isOwner(id, ctx))) {
      return NextResponse.json({ ok: false, error: "owner_required" }, { status: 403 });
    }
    const url = new URL(req.url);
    const memberId = url.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ ok: false, error: "member_id_required" }, { status: 400 });

    const member = await prisma.clinicMember.findFirst({ where: { id: memberId, clinicId: id } });
    if (!member) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Prevent removing the last OWNER.
    if (member.role === "OWNER") {
      const ownerCount = await prisma.clinicMember.count({ where: { clinicId: id, role: "OWNER" } });
      if (ownerCount <= 1) {
        return NextResponse.json({ ok: false, error: "cannot_remove_last_owner" }, { status: 400 });
      }
    }
    await prisma.clinicMember.delete({ where: { id: memberId } });
    await writeAuditLog(ctx, {
      action: "clinic.member.remove",
      entityType: "clinic", entityId: id,
      meta: { removedUserId: member.userId },
    }, req);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
