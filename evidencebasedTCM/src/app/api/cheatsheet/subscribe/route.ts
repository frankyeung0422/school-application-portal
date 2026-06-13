import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { sendCheatsheetWelcome } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lead-magnet email capture. No login required.
 *
 * On submit: upserts an EmailSubscriber row, returns { ok, downloadUrl }.
 * The client immediately navigates to the inline-PDF preview page where the
 * cheat sheet is rendered + downloadable.
 *
 * Email delivery is deliberately NOT wired here. When you add Resend/Mailgun,
 * call deliverCheatSheetEmail(subscriber) below — it's an adapter stub.
 */

const PROFESSIONS = ["TCM Practitioner", "MD", "Pharmacist", "Student", "Other"] as const;

interface Body {
  email?: unknown;
  name?: unknown;
  profession?: unknown;
  locale?: unknown;
  source?: unknown;
}

function isValidEmail(s: string): boolean {
  // Permissive but safe; matches most real addresses, rejects obvious nonsense.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !isValidEmail(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) || null : null;
  const profession = typeof body.profession === "string" && (PROFESSIONS as readonly string[]).includes(body.profession)
    ? body.profession : null;
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 10) : null;
  const source = typeof body.source === "string" && body.source.length > 0
    ? body.source.slice(0, 80)
    : "cheatsheet-herb-drug-2026";

  try {
    await prisma.emailSubscriber.upsert({
      where: { email },
      create: { email, name, profession, locale, source, confirmed: true },
      update: { name: name ?? undefined, profession: profession ?? undefined, source, unsubscribedAt: null },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 500 },
    );
  }

  // Best-effort async email delivery — no-op if RESEND_API_KEY unset.
  void sendCheatsheetWelcome({ to: email, name, locale });

  return NextResponse.json({
    ok: true,
    downloadUrl: "/cheatsheet/herb-drug-2026/preview",
  });
}

