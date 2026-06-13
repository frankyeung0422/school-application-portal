import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePractitioner } from "@/lib/patients/access";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const ctx = await requirePractitioner();
    const { id } = await params;
    const body = (await req.json()) as { action?: string };
    const ref = await prisma.referralRequest.findUnique({ where: { id } });
    if (!ref) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const now = new Date();
    if (body.action === "accept") {
      if (ref.toUserId !== ctx.userId) return NextResponse.json({ ok: false, error: "not_recipient" }, { status: 403 });
      if (ref.status !== "PENDING") return NextResponse.json({ ok: false, error: "not_pending" }, { status: 400 });
      if (ref.expiresAt <= now) return NextResponse.json({ ok: false, error: "already_expired" }, { status: 400 });
      await prisma.referralRequest.update({
        where: { id }, data: { status: "ACCEPTED", acceptedAt: now },
      });
      await writeAuditLog(ctx, { action: "referral.accept", entityType: "referral", entityId: id, meta: { patientId: ref.patientId } }, req);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "decline") {
      if (ref.toUserId !== ctx.userId) return NextResponse.json({ ok: false, error: "not_recipient" }, { status: 403 });
      if (ref.status !== "PENDING") return NextResponse.json({ ok: false, error: "not_pending" }, { status: 400 });
      await prisma.referralRequest.update({
        where: { id }, data: { status: "DECLINED", declinedAt: now },
      });
      await writeAuditLog(ctx, { action: "referral.decline", entityType: "referral", entityId: id }, req);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "revoke") {
      // Only sender can revoke.
      if (ref.fromUserId !== ctx.userId) return NextResponse.json({ ok: false, error: "not_sender" }, { status: 403 });
      if (ref.status === "DECLINED" || ref.status === "REVOKED") {
        return NextResponse.json({ ok: false, error: "already_closed" }, { status: 400 });
      }
      await prisma.referralRequest.update({
        where: { id }, data: { status: "REVOKED", revokedAt: now },
      });
      await writeAuditLog(ctx, { action: "referral.revoke", entityType: "referral", entityId: id }, req);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
