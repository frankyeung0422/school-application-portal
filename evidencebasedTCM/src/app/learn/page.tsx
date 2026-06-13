import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { CourseSearch } from "@/components/learn/CourseSearch";
import { FiveElementCycle } from "@/components/shared/FiveElementCycle";

export const dynamic = "force-dynamic";

const COURSES = [
  { id: "class1", name: "傷寒論", nameEn: "Treatise on Cold Damage", instructor: "郝萬山", lessons: 70, icon: "📜" },
  { id: "class2", name: "金匱要略", nameEn: "Synopsis of the Golden Chamber", instructor: "王雪華", lessons: 80, icon: "📖" },
  { id: "class3", name: "診斷學", nameEn: "TCM Diagnostics", instructor: "朱文鋒", lessons: 75, icon: "🔍" },
  { id: "class4", name: "方劑學", nameEn: "Formula Studies", instructor: "鄧中甲", lessons: 82, icon: "⚗️" },
  { id: "class5", name: "中醫基礎理論", nameEn: "TCM Basic Theory", instructor: "", lessons: 75, icon: "☯️" },
  { id: "class6", name: "中藥學", nameEn: "Chinese Materia Medica", instructor: "張廷模", lessons: 79, icon: "🌿" },
  { id: "class7", name: "黃帝內經", nameEn: "Yellow Emperor's Inner Classic", instructor: "王洪圖", lessons: 80, icon: "👑" },
  { id: "class8", name: "溫病學", nameEn: "Warm Disease Studies", instructor: "劉景源", lessons: 72, icon: "🔥" },
];

export default async function LearnPage() {
  const locale = await getLocale();
  const S = (zh: string, en: string) => (locale === "zh-Hant" ? zh : en);

  const lessonCounts = await prisma.courseLesson.groupBy({
    by: ["courseId"],
    _count: true,
  });
  const countMap = new Map(lessonCounts.map((c) => [c.courseId, c._count]));

  const totalLessons = await prisma.courseLesson.count();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{S("中醫課程知識庫", "TCM Course Knowledge Base")}</h1>
      <p className="text-sm text-muted mb-6">
        {S(
          `源自 theqi.com 八門中醫名師課程筆記（共 613 講），已匯入 ${totalLessons} 講。涵蓋基礎理論、診斷、中藥、方劑、經典研究。`,
          `Sourced from 8 master-level TCM courses on theqi.com (613 total lectures), ${totalLessons} imported. Covers theory, diagnostics, materia medica, formulas, and classics.`,
        )}
      </p>

      <CourseSearch locale={locale} />

      <div className="my-6">
        <FiveElementCycle locale={locale} cycle="both" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {COURSES.map((c) => {
          const imported = countMap.get(c.id) ?? 0;
          return (
            <Link
              key={c.id}
              href={`/learn/${c.id}`}
              className="group rounded-xl border border-border bg-surface p-5 hover:border-primary-light transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{c.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-bold group-hover:text-primary">{c.name}</h2>
                  <p className="text-sm text-muted">{c.nameEn}</p>
                  {c.instructor && (
                    <p className="text-xs text-muted mt-1">
                      {S("授課", "Instructor")}: {c.instructor}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="rounded bg-primary/10 text-primary px-2 py-0.5">
                      {imported} / {c.lessons} {S("講", "lessons")}
                    </span>
                    {imported > 0 && (
                      <div className="flex-1 h-1.5 bg-border rounded overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.round((imported / c.lessons) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
