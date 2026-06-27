import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { getCurrentUserId } from "@/lib/auth/tier";
import { LessonProgressButton } from "@/components/learn/LessonProgressButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ courseId: string; lessonNum: string }>;
}

export default async function LessonPage({ params }: Props) {
  const locale = await getLocale();
  const { courseId, lessonNum } = await params;
  const num = parseInt(lessonNum, 10);
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const lesson = await prisma.courseLesson.findUnique({
    where: { courseId_lessonNum: { courseId, lessonNum: num } },
  });

  if (!lesson) notFound();

  // Check user's progress for this lesson
  const userId = await getCurrentUserId();
  const lessonDone = userId
    ? !!(await prisma.userLessonProgress.findUnique({
        where: { userId_courseId_lessonNum: { userId, courseId, lessonNum: num } },
        select: { id: true },
      }))
    : false;

  // Nav: prev/next
  const [prev, next] = await Promise.all([
    prisma.courseLesson.findFirst({ where: { courseId, lessonNum: { lt: num } }, orderBy: { lessonNum: "desc" }, select: { lessonNum: true, title: true } }),
    prisma.courseLesson.findFirst({ where: { courseId, lessonNum: { gt: num } }, orderBy: { lessonNum: "asc" }, select: { lessonNum: true, title: true } }),
  ]);

  // Parse herb/formula refs
  let herbRefs: string[] = [];
  let formulaRefs: string[] = [];
  try { if (lesson.herbsMentioned) herbRefs = JSON.parse(lesson.herbsMentioned); } catch { /* ignore */ }
  try { if (lesson.formulasMentioned) formulaRefs = JSON.parse(lesson.formulasMentioned); } catch { /* ignore */ }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/learn" className="hover:text-primary">{S("課程", "Courses")}</Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${courseId}`} className="hover:text-primary">{lesson.courseName}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{S("第", "L")}{num}{S("講", "")}</span>
      </nav>

      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-mono text-sm bg-primary/10 text-primary px-2 py-1 rounded">
            {S("第", "#")}{num}{S("講", "")}
          </span>
          {lesson.category && (
            <span className="text-xs rounded bg-teal-50 text-teal-800 px-2 py-0.5">{lesson.category}</span>
          )}
        </div>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        {lesson.instructor && <p className="text-sm text-muted mt-1">{lesson.instructor}</p>}
        {userId && (
          <div className="mt-3">
            <LessonProgressButton
              courseId={courseId}
              lessonNum={num}
              initialDone={lessonDone}
              locale={locale}
            />
          </div>
        )}
      </header>

      {/* Key Points */}
      {lesson.keyPoints && (
        <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
          <h2 className="text-sm font-semibold text-amber-900 mb-2">{S("重點摘要", "Key Points")}</h2>
          <div className="text-sm text-amber-800 whitespace-pre-line">{lesson.keyPoints}</div>
        </div>
      )}

      {/* Clinical Pearls */}
      {lesson.clinicalPearls && (
        <div className="mb-6 rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h2 className="text-sm font-semibold text-primary mb-2">{S("臨床要點", "Clinical Pearls")}</h2>
          <div className="text-sm whitespace-pre-line">{lesson.clinicalPearls}</div>
        </div>
      )}

      {/* Referenced herbs & formulas */}
      {(herbRefs.length > 0 || formulaRefs.length > 0) && (
        <div className="mb-6 flex flex-wrap gap-4">
          {herbRefs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted mb-1">{S("提及中藥", "Herbs Mentioned")}</h3>
              <div className="flex flex-wrap gap-1">
                {herbRefs.map((h) => (
                  <span key={h} className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs text-green-800">{h}</span>
                ))}
              </div>
            </div>
          )}
          {formulaRefs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted mb-1">{S("提及方劑", "Formulas Mentioned")}</h3>
              <div className="flex flex-wrap gap-1">
                {formulaRefs.map((f) => (
                  <span key={f} className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs text-violet-800">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <article className="prose prose-sm max-w-none">
        <div className="whitespace-pre-line text-sm leading-relaxed">{lesson.content}</div>
      </article>

      {/* Prev / Next */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        {prev ? (
          <Link href={`/learn/${courseId}/${prev.lessonNum}`} className="text-sm text-primary hover:underline">
            ← {S("第", "#")}{prev.lessonNum}{S("講", "")} {prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/learn/${courseId}/${next.lessonNum}`} className="text-sm text-primary hover:underline">
            {S("第", "#")}{next.lessonNum}{S("講", "")} {next.title} →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
