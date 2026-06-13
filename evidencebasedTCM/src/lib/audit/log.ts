import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { PractitionerContext } from "@/lib/patients/access";

/**
 * One-line audit log writer. Always returns void; never throws into the
 * caller — audit logging must never break a clinical request.
 *
 * Use canonical action strings:
 *   patient.view / patient.create / patient.update / patient.archive
 *   consultation.create / consultation.view
 *   allergy.add / allergy.remove / medication.add / medication.remove
 *   rx.print / vitals.add / lab.add
 *   clinic.member.add / clinic.member.remove
 *   referral.create / referral.accept / referral.decline / referral.revoke
 *   audit.view / 2fa.enable / 2fa.disable
 */
export interface AuditEvent {
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

function clientIp(req: NextRequest | null | undefined): string | null {
  if (!req) return null;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export async function writeAuditLog(
  ctx: PractitionerContext,
  evt: AuditEvent,
  req?: NextRequest | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: ctx.userId,
        actorRole: ctx.role,
        action: evt.action,
        entityType: evt.entityType,
        entityId: evt.entityId ?? null,
        meta: evt.meta ? JSON.stringify(evt.meta) : null,
        ipAddress: clientIp(req),
        userAgent: req?.headers.get("user-agent")?.slice(0, 300) ?? null,
      },
    });
  } catch {
    // Audit failure must never propagate. A monitoring hook could be added
    // here to alert ops if writes fail repeatedly.
  }
}
