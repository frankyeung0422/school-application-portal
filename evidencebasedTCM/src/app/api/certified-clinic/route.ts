import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendCertAppConfirmation, sendCertAppNotification } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  clinicName?: unknown;
  contactName?: unknown;
  email?: unknown;
  phone?: unknown;
  practitionerCount?: unknown;
  district?: unknown;
  specialties?: unknown;
  existingEbtcmAccount?: unknown;
  ebtcmAccountEmail?: unknown;
  notes?: unknown;
}

function s(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = (await req.json()) as Body; }
  catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }

  const clinicName = s(body.clinicName, 200);
  const contactName = s(body.contactName, 120);
  const email = s(body.email, 200);
  if (!clinicName || !contactName || !email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "required_fields_missing" }, { status: 400 });
  }
  const pc = typeof body.practitionerCount === "number" && Number.isFinite(body.practitionerCount)
    ? Math.max(1, Math.min(200, Math.round(body.practitionerCount)))
    : 1;

  const created = await prisma.certifiedClinicApplication.create({
    data: {
      clinicName,
      contactName,
      email: email.toLowerCase(),
      phone: s(body.phone, 40),
      practitionerCount: pc,
      district: s(body.district, 100),
      specialties: s(body.specialties, 1000),
      existingEbtcmAccount: body.existingEbtcmAccount === true,
      ebtcmAccountEmail: s(body.ebtcmAccountEmail, 200),
      notes: s(body.notes, 2000),
      status: "PENDING",
    },
    select: { id: true },
  });

  // Fire-and-forget emails (no-op if RESEND_API_KEY not configured).
  void sendCertAppConfirmation({ to: email.toLowerCase(), clinicName, contactName });
  void sendCertAppNotification({
    clinicName, contactName, email: email.toLowerCase(),
    practitionerCount: pc, district: s(body.district, 100),
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
