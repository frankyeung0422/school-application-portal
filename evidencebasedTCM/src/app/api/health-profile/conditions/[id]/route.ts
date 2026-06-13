import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const condition = await prisma.userConditionLog.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!condition || condition.profile.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, endDate, severity, notes, tcmPatternId, tcmPatternFree } = body;

  const updated = await prisma.userConditionLog.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(severity !== undefined && { severity }),
      ...(notes !== undefined && { notes }),
      ...(tcmPatternId !== undefined && { tcmPatternId }),
      ...(tcmPatternFree !== undefined && { tcmPatternFree }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const condition = await prisma.userConditionLog.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!condition || condition.profile.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userConditionLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
