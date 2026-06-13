import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

async function getProfile(userId: string) {
  return prisma.userHealthProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function getAuthUserId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);
  const conditions = await prisma.userConditionLog.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(conditions);
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);

  const body = await request.json();
  const { westernName, icd10Code, tcmPatternId, tcmPatternFree, startDate, severity, notes } = body;
  if (!westernName) return NextResponse.json({ error: "westernName required" }, { status: 400 });

  const condition = await prisma.userConditionLog.create({
    data: {
      profileId: profile.id,
      westernName,
      icd10Code: icd10Code || null,
      tcmPatternId: tcmPatternId || null,
      tcmPatternFree: tcmPatternFree || null,
      startDate: startDate ? new Date(startDate) : null,
      severity: severity ?? null,
      notes: notes || null,
      status: "ACTIVE",
    },
  });
  return NextResponse.json(condition, { status: 201 });
}
