import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "EDITOR")) return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "PENDING";

  const profiles = await prisma.researcherProfile.findMany({
    where: status === "ALL" ? undefined : { verificationStatus: status },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      _count: { select: { contributions: true, annotations: true } },
    },
  });

  return NextResponse.json(profiles);
}
