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

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);

  const checkIns = await prisma.healthCheckIn.findMany({
    where: { profileId: profile.id },
    orderBy: { checkInDate: "desc" },
    take: 52,
  });
  return NextResponse.json(checkIns);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);

  const body = await request.json();
  const { checkInDate, overallScore, energyScore, painScore, sleepScore, stressScore, digestiveScore, notes } = body;

  if (overallScore === undefined) return NextResponse.json({ error: "overallScore required" }, { status: 400 });

  // Snapshot active conditions at check-in time
  const activeConditions = await prisma.userConditionLog.findMany({
    where: { profileId: profile.id, status: "ACTIVE" },
    select: { westernName: true, tcmPatternFree: true },
  });

  const checkIn = await prisma.healthCheckIn.create({
    data: {
      profileId: profile.id,
      checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
      overallScore,
      energyScore: energyScore ?? null,
      painScore: painScore ?? null,
      sleepScore: sleepScore ?? null,
      stressScore: stressScore ?? null,
      digestiveScore: digestiveScore ?? null,
      activeConditions: JSON.stringify(activeConditions),
      notes: notes || null,
    },
  });
  return NextResponse.json(checkIn, { status: 201 });
}
