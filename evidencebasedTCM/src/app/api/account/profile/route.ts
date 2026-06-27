import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/tier";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, credentials: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    if (body.name.length === 0 || body.name.length > 200)
      return NextResponse.json({ error: "Name must be 1–200 characters" }, { status: 400 });
    data.name = body.name;
  }

  if (typeof body.credentials === "string") {
    if (body.credentials.length > 500)
      return NextResponse.json({ error: "Credentials must be ≤500 characters" }, { status: 400 });
    data.credentials = body.credentials || null;
  }

  // Password change
  if (body.newPassword !== undefined) {
    if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string")
      return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
    if (body.newPassword.length < 8)
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    data.passwordHash = await bcrypt.hash(body.newPassword, 12);
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { name: true, email: true, credentials: true, role: true },
  });

  return NextResponse.json(updated);
}
