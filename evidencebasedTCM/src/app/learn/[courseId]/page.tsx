import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getCurrentUserId } from "@/lib/auth/tier";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const locale = await getLocale();
  const { courseId } = await params;
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const [lessons, userId] = await Promise.all([
    prisma.courseLesson.findMany({
      where: { courseId },
      orderBy: { lessonNum: "asc" },
      select: { id: true, lessonNum: true, title: true, category: true, courseName: true, instructor: true },
    }),
    getCurrentUserId(),
  ]);

  if (lessons.length === 0) notFound();

  const courseName = lessons[0].courseName;
  const instructor = lessons[0].instructor;

  // Fetch completed lesson numbers for this user and course
  const completedNums = userId
    ? new Set(
        (await prisma.userLessonProgress.findMany({
          where: { userId, courseId },
          select: { lessonNum: true },
        })).map(r => r.lessonNum)
      )
    : new Set<number>();

  const completedCount = completedNums.size;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/learn" className="hover:text-primary">{S("課程知識庫", "Courses")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{courseName}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-1">{courseName}</h1>
      {instructor && <p className="text-sm text-muted">{S("授課", "Instructor")}: {instructor}</p>}

      {userId && (
        <div className="mt-3 mb-5 flex items-center gap-3">
          <span className="text-sm text-muted">
            {S(`已完成 ${completedCount} / ${lessons.length} 講`, `${completedCount} / ${lessons.length} lessons completed`)}
          </span>
          <div className="flex-1 max-w-xs h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-primary font-semibold">{pct}%</span>
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((l) => {
          const done = completedNums.has(l.lessonNum);
          return (
            <Link
              key={l.id}
              href={`/learn/${courseId}/${l.lessonNum}`}
              className={`flex items-center justify-between rounded-lg border p-3 hover:border-primary-light transition-colors ${
                done ? "border-green-200 bg-green-50/40" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs w-8 ${done ? "text-green-600" : "text-muted"}`}>
                  {done ? "✓" : l.lessonNum}
                </span>
                <span className={`font-medium text-sm ${done ? "text-green-800" : ""}`}>{l.title}</span>
              </div>
              {l.category && (
                <span className="text-xs rounded bg-primary/10 text-primary px-2 py-0.5">{l.category}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
