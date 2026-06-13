import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function requireAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || (user.role !== "ADMIN" && user.role !== "EDITOR")) {
    return null;
  }
  return user.id;
}

export async function GET(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "PENDING";

  const contributions = await prisma.evidenceContribution.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    include: {
      researcher: {
        select: {
          institution: true,
          verificationStatus: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
  return NextResponse.json(contributions);
}
