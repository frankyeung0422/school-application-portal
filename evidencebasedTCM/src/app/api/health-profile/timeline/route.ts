import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userHealthProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ events: [] });

  const [symptomLogs, checkIns, conditions, constitutions] = await Promise.all([
    prisma.symptomLog.findMany({
      where: { profileId: profile.id },
      orderBy: { logDate: "desc" },
      take: 50,
    }),
    prisma.healthCheckIn.findMany({
      where: { profileId: profile.id },
      orderBy: { checkInDate: "desc" },
      take: 52,
    }),
    prisma.userConditionLog.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.patientConstitution.findMany({
      where: { userId },
      orderBy: { takenAt: "desc" },
      take: 10,
    }),
  ]);

  type TimelineEvent =
    | { type: "symptom_log"; date: string; data: typeof symptomLogs[0] }
    | { type: "check_in"; date: string; data: typeof checkIns[0] }
    | { type: "condition"; date: string; data: typeof conditions[0] }
    | { type: "constitution"; date: string; data: typeof constitutions[0] };

  const events: TimelineEvent[] = [
    ...symptomLogs.map((l) => ({ type: "symptom_log" as const, date: l.logDate.toISOString(), data: l })),
    ...checkIns.map((c) => ({ type: "check_in" as const, date: c.checkInDate.toISOString(), data: c })),
    ...conditions.map((c) => ({ type: "condition" as const, date: c.createdAt.toISOString(), data: c })),
    ...constitutions.map((c) => ({ type: "constitution" as const, date: c.takenAt.toISOString(), data: c })),
  ];

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ events, profile });
}
