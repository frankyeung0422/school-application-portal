import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

const SEASON_LABELS_ZH: Record<string, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
  "all-season": "四季皆宜",
};

export default async function FoodTherapyDetailPage({ params }: RouteCtx) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);

  const { id } = await params;
  const r = await prisma.foodTherapyRecipe.findUnique({
    where: { id },
    include: {
      pattern: { select: { id: true, chineseName: true, pinyinName: true, treatmentPrinciple: true } },
      conditionLinks: {
        include: { condition: { select: { id: true, westernName: true, icd11Code: true } } },
      },
    },
  });
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="text-xs text-muted mb-3">
        <Link href="/food-therapy" className="hover:underline">{T("← 食療列表", "← Food therapy")}</Link>
      </nav>

      <h1 className="text-3xl font-bold mb-1">{r.chineseName}</h1>
      <p className="text-sm text-muted mb-4">
        {r.pinyinName}
        {r.englishName && <> · {r.englishName}</>}
        {r.source && <> · {r.source}</>}
      </p>

      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        <span className="rounded-full bg-surface border border-border px-3 py-1">
          {T("類別：", "Category: ")}{r.category}
        </span>
        {r.season && (
          <span className="rounded-full bg-primary/10 text-primary px-3 py-1">
            {isZh ? SEASON_LABELS_ZH[r.season] : r.season}
          </span>
        )}
        {r.difficulty && (
          <span className="rounded-full bg-surface border border-border px-3 py-1">
            {T("難度：", "Difficulty: ")}{r.difficulty}
          </span>
        )}
        <span className="rounded-full bg-surface border border-border px-3 py-1">
          {T("份量：", "Serves ")}{r.servings}
        </span>
        {(r.prepTimeMinutes || r.cookTimeMinutes) && (
          <span className="rounded-full bg-surface border border-border px-3 py-1">
            ⏱ {(r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)} {T("分鐘", "min")}
          </span>
        )}
      </div>

      <section className="rounded-lg border border-border bg-surface p-5 mb-5">
        <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">
          {T("適應症狀", "Indication")}
        </h2>
        <p className="text-base leading-relaxed">{r.indication}</p>
        {r.treatmentPrinciple && (
          <p className="text-sm text-primary mt-3">
            <span className="font-medium">{T("治法：", "Treatment principle: ")}</span>
            {r.treatmentPrinciple}
          </p>
        )}
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
            {T("食材", "Ingredients")}
          </h2>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{r.ingredients}</pre>
        </section>
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
            {T("作法", "Preparation")}
          </h2>
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{r.preparation}</pre>
        </section>
      </div>

      {r.pattern && (
        <section className="rounded-lg border border-border bg-surface p-5 mt-5">
          <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">
            {T("對應證型", "TCM Pattern")}
          </h2>
          <Link href={`/patterns/${r.pattern.id}`} className="text-primary hover:underline">
            {r.pattern.chineseName} <span className="text-xs text-muted">({r.pattern.pinyinName})</span>
          </Link>
          {r.pattern.treatmentPrinciple && (
            <p className="text-xs text-muted mt-1">{r.pattern.treatmentPrinciple}</p>
          )}
        </section>
      )}

      {r.conditionLinks.length > 0 && (
        <section className="rounded-lg border border-border bg-surface p-5 mt-5">
          <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
            {T("相關病症", "Related Conditions")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {r.conditionLinks.map((cl) => (
              <Link
                key={cl.id}
                href={`/conditions/${cl.condition.id}`}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary-light"
              >
                {cl.condition.westernName}
                {cl.condition.icd11Code && <span className="text-muted ml-1">· {cl.condition.icd11Code}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {r.contraindications && (
        <section className="rounded-lg border border-yellow-400/50 bg-yellow-50/40 dark:bg-yellow-900/10 p-5 mt-5">
          <h2 className="text-sm font-bold mb-2">⚠ {T("禁忌與注意事項", "Contraindications")}</h2>
          <p className="text-sm whitespace-pre-wrap">{r.contraindications}</p>
        </section>
      )}

      {r.notes && (
        <section className="rounded-lg border border-border bg-surface p-5 mt-5">
          <h2 className="text-sm font-semibold text-muted mb-2 uppercase tracking-wide">{T("備註", "Notes")}</h2>
          <p className="text-sm whitespace-pre-wrap">{r.notes}</p>
        </section>
      )}

      <p className="text-xs text-muted mt-8 leading-relaxed">
        {T(
          "📌 食療為日常養生輔助，不能替代醫療診斷與處方治療。慢性病或特殊體質者，請先諮詢註冊中醫師。",
          "📌 Food therapy supports daily wellness but does not replace medical diagnosis or prescription. Consult a registered TCM practitioner for chronic conditions.",
        )}
      </p>
    </div>
  );
}
