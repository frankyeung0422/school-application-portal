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

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const logs = await prisma.symptomLog.findMany({
    where: {
      profileId: profile.id,
      ...(from && { logDate: { gte: new Date(from) } }),
      ...(to && { logDate: { lte: new Date(to) } }),
    },
    orderBy: { logDate: "desc" },
    take: 100,
  });
  return NextResponse.json(logs);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await getProfile(userId);

  const body = await request.json();
  const { logDate, symptoms, tongueNotes, energyLevel, sleepQuality, stressLevel, notes } = body;
  if (!logDate) return NextResponse.json({ error: "logDate required" }, { status: 400 });

  const log = await prisma.symptomLog.create({
    data: {
      profileId: profile.id,
      logDate: new Date(logDate),
      symptoms: Array.isArray(symptoms) ? JSON.stringify(symptoms) : (symptoms ?? "[]"),
      tongueNotes: tongueNotes || null,
      energyLevel: energyLevel ?? null,
      sleepQuality: sleepQuality ?? null,
      stressLevel: stressLevel ?? null,
      notes: notes || null,
    },
  });
  return NextResponse.json(log, { status: 201 });
}
