import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function CoursePage({ params }: Props) {
  const locale = await getLocale();
  const { courseId } = await params;
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const lessons = await prisma.courseLesson.findMany({
    where: { courseId },
    orderBy: { lessonNum: "asc" },
    select: {
      id: true,
      lessonNum: true,
      title: true,
      category: true,
      courseName: true,
      instructor: true,
    },
  });

  if (lessons.length === 0) notFound();

  const courseName = lessons[0].courseName;
  const instructor = lessons[0].instructor;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/learn" className="hover:text-primary">{S("課程知識庫", "Courses")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{courseName}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-1">{courseName}</h1>
      {instructor && <p className="text-sm text-muted mb-6">{S("授課", "Instructor")}: {instructor}</p>}

      <div className="space-y-2">
        {lessons.map((l) => (
          <Link
            key={l.id}
            href={`/learn/${courseId}/${l.lessonNum}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 hover:border-primary-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted w-8">{l.lessonNum}</span>
              <span className="font-medium text-sm">{l.title}</span>
            </div>
            {l.category && (
              <span className="text-xs rounded bg-primary/10 text-primary px-2 py-0.5">{l.category}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
