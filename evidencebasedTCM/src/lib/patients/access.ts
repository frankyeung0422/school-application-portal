import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";

/**
 * Patient records are PHI — readable by:
 *   1. the owning practitioner, OR
 *   2. an active ClinicMember of the patient's clinic, OR
 *   3. a recipient of an active (ACCEPTED, not expired) ReferralRequest.
 *
 * EDITOR / ADMIN roles also bypass for support purposes.
 *
 * Routes/pages should call `requirePractitioner()` at entry to assert role,
 * then use `canAccessPatient(ctx, patientId)` to authorize a specific record.
 */
export interface PractitionerContext {
  userId: string;
  role: "PRACTITIONER" | "EDITOR" | "ADMIN";
}

export async function getPractitionerContext(): Promise<PractitionerContext | null> {
  const session = await auth();
  const u = session?.user as { id?: string; role?: string } | undefined;
  if (!u?.id) return null;
  const r = u.role;
  if (r !== "PRACTITIONER" && r !== "EDITOR" && r !== "ADMIN") return null;
  return { userId: u.id, role: r as PractitionerContext["role"] };
}

export async function requirePractitioner(): Promise<PractitionerContext> {
  const ctx = await getPractitionerContext();
  if (!ctx) throw new Error("practitioner_required");
  return ctx;
}

/**
 * Resolve the effective practitionerId for a query. Practitioners only see
 * their own patients; staff (EDITOR/ADMIN) may pass an explicit override.
 */
export function effectivePractitionerId(
  ctx: PractitionerContext,
  override?: string | null,
): string | undefined {
  if (ctx.role === "EDITOR" || ctx.role === "ADMIN") {
    return override ?? undefined;
  }
  return ctx.userId;
}

/**
 * Authorise access to a specific patient. Returns true if the caller is
 * the owning practitioner, a fellow clinic member, or an accepted active
 * referral recipient. EDITOR/ADMIN are always allowed.
 *
 * Use the returned `reason` for audit logging — it records WHY access was
 * permitted.
 */
export interface AccessResult {
  allowed: boolean;
  reason: "owner" | "clinic_member" | "referral" | "staff" | "denied";
}

export async function canAccessPatient(
  ctx: PractitionerContext,
  patientId: string,
): Promise<AccessResult> {
  if (ctx.role === "EDITOR" || ctx.role === "ADMIN") {
    return { allowed: true, reason: "staff" };
  }
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, practitionerId: true, clinicId: true },
  });
  if (!patient) return { allowed: false, reason: "denied" };

  if (patient.practitionerId === ctx.userId) {
    return { allowed: true, reason: "owner" };
  }

  if (patient.clinicId) {
    const member = await prisma.clinicMember.findUnique({
      where: { clinicId_userId: { clinicId: patient.clinicId, userId: ctx.userId } },
      select: { id: true },
    });
    if (member) return { allowed: true, reason: "clinic_member" };
  }

  const activeReferral = await prisma.referralRequest.findFirst({
    where: {
      patientId,
      toUserId: ctx.userId,
      status: "ACCEPTED",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (activeReferral) return { allowed: true, reason: "referral" };

  return { allowed: false, reason: "denied" };
}

/**
 * Build a Prisma `where` clause that yields ALL patients the current
 * caller is allowed to see (owner + clinic + active referrals).
 */
export async function visiblePatientsWhere(
  ctx: PractitionerContext,
): Promise<Record<string, unknown>> {
  if (ctx.role === "EDITOR" || ctx.role === "ADMIN") {
    return {}; // no restriction
  }
  // Find the clinic IDs the user is a member of.
  const memberships = await prisma.clinicMember.findMany({
    where: { userId: ctx.userId },
    select: { clinicId: true },
  });
  const clinicIds = memberships.map((m) => m.clinicId);

  // Find patientIds with active referrals to me.
  const activeRefs = await prisma.referralRequest.findMany({
    where: { toUserId: ctx.userId, status: "ACCEPTED", expiresAt: { gt: new Date() } },
    select: { patientId: true },
  });
  const referredPatientIds = activeRefs.map((r) => r.patientId);

  const or: Array<Record<string, unknown>> = [
    { practitionerId: ctx.userId },
  ];
  if (clinicIds.length > 0) or.push({ clinicId: { in: clinicIds } });
  if (referredPatientIds.length > 0) or.push({ id: { in: referredPatientIds } });

  return { OR: or };
}
