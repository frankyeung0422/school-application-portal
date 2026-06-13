import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "EDITOR")) return null;
  return user;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { verificationStatus, notes } = await request.json();

  if (!["VERIFIED", "REJECTED", "PENDING"].includes(verificationStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const profile = await prisma.researcherProfile.update({
    where: { id },
    data: {
      verificationStatus,
      verifiedAt: verificationStatus === "VERIFIED" ? new Date() : null,
      verifiedBy: verificationStatus === "VERIFIED" ? admin.id : null,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  // If verifying, also promote user role to RESEARCHER (if not already ADMIN/EDITOR)
  if (verificationStatus === "VERIFIED") {
    const user = await prisma.user.findUnique({ where: { id: profile.userId }, select: { role: true } });
    if (user?.role !== "ADMIN" && user?.role !== "EDITOR") {
      await prisma.user.update({ where: { id: profile.userId }, data: { role: "RESEARCHER" } });
    }
  }

  void notes; // reserved for future email notification
  return NextResponse.json(profile);
}
