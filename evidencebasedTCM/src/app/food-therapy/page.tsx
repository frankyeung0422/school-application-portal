import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS: Record<string, string> = {
  Soup: "🍲",
  Porridge: "🥣",
  Tea: "🍵",
  Tonic: "🫕",
  Dessert: "🍮",
  Stew: "🥘",
  Drink: "🥤",
};

const SEASON_LABELS_ZH: Record<string, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
  "all-season": "四季",
};

interface SearchParams {
  searchParams: Promise<{ category?: string; season?: string; q?: string }>;
}

export default async function FoodTherapyListPage({ searchParams }: SearchParams) {
  const locale = await getLocale();
  const isZh = locale === "zh-Hant";
  const T = (zh: string, en: string) => (isZh ? zh : en);
  const sp = await searchParams;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (sp.category) where.category = sp.category;
  if (sp.season) where.season = sp.season;
  if (sp.q && sp.q.trim().length > 0) {
    const q = sp.q.trim();
    where.OR = [
      { chineseName: { contains: q } },
      { pinyinName: { contains: q, mode: "insensitive" } },
      { indication: { contains: q } },
      { ingredients: { contains: q } },
    ];
  }

  const recipes = await prisma.foodTherapyRecipe.findMany({
    where,
    orderBy: { chineseName: "asc" },
    include: {
      pattern: { select: { chineseName: true, pinyinName: true } },
      _count: { select: { conditionLinks: true } },
    },
  });

  const categories = ["Soup", "Porridge", "Tea", "Dessert", "Drink", "Stew", "Tonic"];
  const seasons = ["all-season", "spring", "summer", "autumn", "winter"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-1">{T("食療養生", "Food Therapy")}</h1>
      <p className="text-sm text-muted mb-6">
        {T(
          "經典 TCM 食療方 — 以食物配合中藥，溫和調養體質。",
          "Classical TCM food-as-medicine recipes — gentle constitutional support through everyday foods + herbs.",
        )}
      </p>

      <form className="mb-5 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted mb-1">{T("搜尋", "Search")}</label>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={T("中文 / 拼音 / 適應症 / 食材", "Chinese / pinyin / indication / ingredient")}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{T("類別", "Category")}</label>
          <select name="category" defaultValue={sp.category ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{T("全部", "All")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{T("季節", "Season")}</label>
          <select name="season" defaultValue={sp.season ?? ""} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="">{T("全部", "All")}</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{isZh ? SEASON_LABELS_ZH[s] : s}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-light">
          {T("篩選", "Filter")}
        </button>
        {(sp.q || sp.category || sp.season) && (
          <Link href="/food-therapy" className="text-sm text-muted hover:text-foreground self-end px-2 py-2">
            {T("清除", "Clear")}
          </Link>
        )}
      </form>

      <p className="text-xs text-muted mb-3">{recipes.length} {T("個食譜", "recipes")}</p>

      {recipes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface">
          <p className="text-sm text-muted">{T("沒有符合條件的食譜。", "No recipes match.")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/food-therapy/${r.id}`}
              className="block rounded-lg border border-border bg-surface p-4 hover:border-primary-light transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-base font-semibold">
                    {CATEGORY_ICONS[r.category] ?? "•"} {r.chineseName}
                  </h2>
                  <p className="text-xs text-muted">{r.pinyinName}{r.englishName && ` · ${r.englishName}`}</p>
                </div>
                {r.season && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">
                    {isZh ? SEASON_LABELS_ZH[r.season] : r.season}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted line-clamp-2 mb-2">{r.indication}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted">
                {r.pattern && (
                  <span className="rounded-full bg-background border border-border px-2 py-0.5">
                    {r.pattern.chineseName}
                  </span>
                )}
                {r.treatmentPrinciple && (
                  <span className="truncate max-w-[12rem]">· {r.treatmentPrinciple}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
