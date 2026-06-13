import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner, canAccessPatient } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id: patientId } = await params;
    const access = await canAccessPatient(ctx, patientId);
    if (!access.allowed || access.reason === "referral") {
      // Only owner/clinic-members can refer (not chain-referrals).
      return NextResponse.json({ ok: false, error: "not_found_or_read_only" }, { status: 404 });
    }
    const body = (await req.json()) as Record<string, unknown>;
    const toEmail = typeof body.toEmail === "string" ? body.toEmail.trim().toLowerCase() : "";
    const days = typeof body.days === "number" && body.days > 0 && body.days <= 90
      ? Math.round(body.days) : 14;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";

    if (!toEmail) return NextResponse.json({ ok: false, error: "to_email_required" }, { status: 400 });

    const toUser = await prisma.user.findUnique({ where: { email: toEmail }, select: { id: true, role: true } });
    if (!toUser) return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    if (toUser.role === "PUBLIC") return NextResponse.json({ ok: false, error: "user_not_practitioner" }, { status: 400 });
    if (toUser.id === ctx.userId) return NextResponse.json({ ok: false, error: "cannot_refer_self" }, { status: 400 });

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const ref = await prisma.referralRequest.create({
      data: {
        patientId,
        fromUserId: ctx.userId,
        toUserId: toUser.id,
        reason: reason || null,
        expiresAt,
        status: "PENDING",
      },
    });
    await writeAuditLog(ctx, {
      action: "referral.create",
      entityType: "referral",
      entityId: ref.id,
      meta: { patientId, toUserId: toUser.id, days },
    }, req);
    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    const access = await canAccessPatient(ctx, id);
    if (!access.allowed) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    const refs = await prisma.referralRequest.findMany({
      where: { patientId: id },
      include: {
        fromUser: { select: { name: true, email: true } },
        toUser: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, referrals: refs });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 401 },
    );
  }
}
