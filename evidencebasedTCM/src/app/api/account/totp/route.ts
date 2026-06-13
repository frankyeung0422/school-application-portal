/**
 * TOTP enrollment + disable.
 *
 * POST  /api/account/totp        action: "begin"   → returns { secret, otpauthUri }
 * POST  /api/account/totp        action: "enable"  → body: { secret, code } → enables and returns recovery codes (display once)
 * POST  /api/account/totp        action: "disable" → body: { password } → disables
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import {
  generateSecret,
  verifyTotp,
  otpauthUri,
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentUser() {
  const session = await auth();
  const u = session?.user as { id?: string; email?: string; role?: string } | undefined;
  if (!u?.id) return null;
  const dbUser = await prisma.user.findUnique({ where: { id: u.id } });
  return dbUser;
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });

  const body = (await req.json()) as { action?: string; code?: string; secret?: string; password?: string };

  if (body.action === "begin") {
    if (user.totpEnabled) {
      return NextResponse.json({ ok: false, error: "already_enabled" }, { status: 400 });
    }
    const secret = generateSecret();
    const uri = otpauthUri(secret, user.email, "EBTCM");
    return NextResponse.json({ ok: true, secret, otpauthUri: uri });
  }

  if (body.action === "enable") {
    if (user.totpEnabled) {
      return NextResponse.json({ ok: false, error: "already_enabled" }, { status: 400 });
    }
    const secret = typeof body.secret === "string" ? body.secret : "";
    const code = typeof body.code === "string" ? body.code : "";
    if (!secret || !code) {
      return NextResponse.json({ ok: false, error: "secret_and_code_required" }, { status: 400 });
    }
    if (!verifyTotp(secret, code)) {
      return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 400 });
    }
    const recoveryPlain = generateRecoveryCodes(10);
    const recoveryHashes = await hashRecoveryCodes(recoveryPlain);
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: secret, totpEnabled: true, totpRecoveryCodes: recoveryHashes },
    });
    await writeAuditLog(
      { userId: user.id, role: user.role === "PUBLIC" ? "PRACTITIONER" : (user.role as "PRACTITIONER" | "EDITOR" | "ADMIN") },
      { action: "2fa.enable", entityType: "user", entityId: user.id },
      req,
    );
    return NextResponse.json({ ok: true, recoveryCodes: recoveryPlain });
  }

  if (body.action === "disable") {
    if (!user.totpEnabled) {
      return NextResponse.json({ ok: false, error: "not_enabled" }, { status: 400 });
    }
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) return NextResponse.json({ ok: false, error: "password_required" }, { status: 400 });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 400 });
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabled: false, totpRecoveryCodes: null },
    });
    await writeAuditLog(
      { userId: user.id, role: user.role === "PUBLIC" ? "PRACTITIONER" : (user.role as "PRACTITIONER" | "EDITOR" | "ADMIN") },
      { action: "2fa.disable", entityType: "user", entityId: user.id },
      req,
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
}
