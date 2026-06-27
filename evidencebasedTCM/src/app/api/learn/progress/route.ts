import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId } from "@/lib/auth/tier";

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const courseId = req.nextUrl.searchParams.get("courseId");
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const rows = await prisma.userLessonProgress.findMany({
    where: { userId, courseId },
    select: { lessonNum: true },
  });

  return NextResponse.json({ completed: rows.map(r => r.lessonNum) });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { courseId, lessonNum } = body ?? {};
  if (!courseId || typeof lessonNum !== "number") {
    return NextResponse.json({ error: "courseId and lessonNum required" }, { status: 400 });
  }

  await prisma.userLessonProgress.upsert({
    where: { userId_courseId_lessonNum: { userId, courseId, lessonNum } },
    create: { userId, courseId, lessonNum },
    update: { completedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { courseId, lessonNum } = body ?? {};
  if (!courseId || typeof lessonNum !== "number") {
    return NextResponse.json({ error: "courseId and lessonNum required" }, { status: 400 });
  }

  await prisma.userLessonProgress.deleteMany({ where: { userId, courseId, lessonNum } });

  return NextResponse.json({ ok: true });
}
