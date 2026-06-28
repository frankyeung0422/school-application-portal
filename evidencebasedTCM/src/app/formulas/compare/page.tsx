import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { formulaRoleLabel } from "@/lib/i18n/data-labels";

interface Props {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export const metadata = { title: "方劑比較 — EBTCM" };

const GRADE_COLOR: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-gray-100 text-gray-600",
};

const NATURE_LABEL: Record<string, string> = {
  HOT: "熱", WARM: "溫", NEUTRAL: "平", COOL: "涼", COLD: "寒",
};

export default async function FormulaComparePage({ searchParams }: Props) {
  const locale = await getLocale();
  const { a, b } = await searchParams;
  const zh = locale === "zh-Hant";
  const T = (zh_: string, en: string) => (zh ? zh_ : en);

  const allFormulas = await prisma.formula.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, pinyinName: true, chineseName: true },
    orderBy: { pinyinName: "asc" },
  });

  const fetchOne = (id?: string) =>
    id
      ? prisma.formula.findUnique({
          where: { id },
          include: {
            herbs: {
              include: {
                herb: {
                  select: {
                    id: true,
                    pinyinName: true,
                    chineseName: true,
                    nature: true,
                    flavor: true,
                    toxicityClass: true,
                  },
                },
              },
              orderBy: { role: "asc" },
            },
            patternFormulas: {
              include: { pattern: { select: { chineseName: true, pinyinName: true } } },
              take: 4,
            },
            evidenceLinks: {
              include: { evidence: { select: { evidenceGrade: true } } },
            },
          },
        })
      : Promise.resolve(null);

  const [fa, fb] = await Promise.all([fetchOne(a), fetchOne(b)]);

  const renderPicker = (name: "a" | "b", current?: string, label?: string) => (
    <div className="flex-1 min-w-0">
      {label && <label className="block text-xs text-muted mb-1">{label}</label>}
      <select
        name={name}
        defaultValue={current ?? ""}
        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
      >
        <option value="">{T("— 選擇方劑 —", "— Select formula —")}</option>
        {allFormulas.map((f) => (
          <option key={f.id} value={f.id}>
            {zh ? toTraditionalChinese(f.chineseName, locale) : f.pinyinName}
          </option>
        ))}
      </select>
    </div>
  );

  // Overlap analysis
  const aHerbIds = new Set(fa?.herbs.map((h) => h.herbId) ?? []);
  const bHerbIds = new Set(fb?.herbs.map((h) => h.herbId) ?? []);
  const sharedIds = new Set([...aHerbIds].filter((id) => bHerbIds.has(id)));

  // Evidence grade counts helper
  const gradeCounts = (links: { evidence: { evidenceGrade: string } }[]) => {
    const counts: Record<string, number> = {};
    for (const l of links) {
      counts[l.evidence.evidenceGrade] = (counts[l.evidence.evidenceGrade] ?? 0) + 1;
    }
    return counts;
  };

  const renderFormulaCard = (
    f: NonNullable<Awaited<ReturnType<typeof fetchOne>>>,
    side: "a" | "b",
    otherHerbIds: Set<string>,
  ) => {
    const name = zh ? toTraditionalChinese(f.chineseName, locale) : f.pinyinName;
    const grades = gradeCounts(f.evidenceLinks);
    const totalEvidence = f.evidenceLinks.length;

    return (
      <div className={`rounded-xl border-2 p-5 ${side === "a" ? "border-blue-300 bg-blue-50/40" : "border-violet-300 bg-violet-50/40"}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${side === "a" ? "text-blue-600" : "text-violet-600"}`}>
              {side === "a" ? T("方劑 A", "Formula A") : T("方劑 B", "Formula B")}
            </span>
            <h2 className="text-xl font-bold leading-tight mt-0.5">{name}</h2>
            <p className="text-sm text-muted">{f.pinyinName}</p>
          </div>
          <Link
            href={`/formulas/${f.id}`}
            className="text-xs rounded-lg border border-border bg-white px-2 py-1 hover:bg-primary/5 hover:border-primary-light transition-colors shrink-0"
          >
            {T("詳細 →", "Detail →")}
          </Link>
        </div>

        {/* Category + source */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="rounded-full bg-violet-100 text-violet-800 text-xs px-2 py-0.5">{f.category}</span>
          {f.sourceText && (
            <span className="rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-0.5 italic">{f.sourceText}</span>
          )}
        </div>

        {/* Evidence */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-muted mb-1">{T("實證等級分佈", "Evidence grades")} ({totalEvidence})</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(grades).length > 0 ? (
              Object.entries(grades)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([grade, count]) => (
                  <span key={grade} className={`text-xs rounded px-1.5 py-0.5 font-medium ${GRADE_COLOR[grade] ?? "bg-gray-100 text-gray-600"}`}>
                    {grade}: {count}
                  </span>
                ))
            ) : (
              <span className="text-xs text-muted">{T("無實證資料", "No evidence linked")}</span>
            )}
          </div>
        </div>

        {/* Patterns */}
        {f.patternFormulas.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted mb-1">{T("適用證型", "TCM Patterns")}</p>
            <div className="flex flex-wrap gap-1">
              {f.patternFormulas.map((pf) => (
                <span key={pf.pattern.chineseName} className="text-xs rounded-full bg-teal-50 text-teal-800 px-2 py-0.5">
                  {zh ? pf.pattern.chineseName : pf.pattern.pinyinName}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {f.actions && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted mb-1">{T("功效", "Actions")}</p>
            <p className="text-xs leading-relaxed">{f.actions}</p>
          </div>
        )}

        {/* Indications */}
        {f.indications && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-muted mb-1">{T("主治", "Indications")}</p>
            <p className="text-xs leading-relaxed">{f.indications}</p>
          </div>
        )}

        {/* Herb list */}
        <div>
          <p className="text-xs font-semibold text-muted mb-2">
            {T("組成藥材", "Herbs")} ({f.herbs.length})
          </p>
          <div className="space-y-1">
            {f.herbs.map((fh) => {
              const isShared = sharedIds.has(fh.herbId);
              const isUnique = !otherHerbIds.has(fh.herbId);
              return (
                <div
                  key={fh.id}
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                    isShared
                      ? "bg-green-50 border border-green-200"
                      : isUnique
                      ? `${side === "a" ? "bg-blue-50 border border-blue-200" : "bg-violet-50 border border-violet-200"}`
                      : "bg-surface border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isShared && <span className="text-green-600 shrink-0">⟷</span>}
                    <Link href={`/herbs/${fh.herb.id}`} className="hover:text-primary font-medium truncate">
                      {zh ? fh.herb.chineseName : fh.herb.pinyinName}
                    </Link>
                    {fh.herb.nature && (
                      <span className="text-muted shrink-0">({NATURE_LABEL[fh.herb.nature] ?? fh.herb.nature})</span>
                    )}
                    {fh.role && (
                      <span className="text-muted shrink-0">{formulaRoleLabel(locale, fh.role)}</span>
                    )}
                    {fh.herb.toxicityClass && fh.herb.toxicityClass !== "無毒" && (
                      <span className="text-amber-600 shrink-0">⚠</span>
                    )}
                  </div>
                  {fh.dosage && <span className="font-mono text-muted ml-2 shrink-0">{fh.dosage}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contraindications */}
        {f.contraindications && (
          <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2">
            <p className="text-xs font-semibold text-rose-800 mb-0.5">{T("禁忌", "Contraindications")}</p>
            <p className="text-xs text-rose-700 leading-relaxed">{f.contraindications}</p>
          </div>
        )}
      </div>
    );
  };

  const aOnlyCount = [...aHerbIds].filter((id) => !bHerbIds.has(id)).length;
  const bOnlyCount = [...bHerbIds].filter((id) => !aHerbIds.has(id)).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/formulas" className="hover:text-primary">{T("方劑", "Formulas")}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{T("方劑比較", "Compare")}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-2">{T("方劑比較工具", "Formula Comparison")}</h1>
      <p className="text-sm text-muted mb-6">
        {T("並排比較兩首方劑的組成、功效、實證等級及適用證型，共用藥材以綠色標記。",
           "Compare two formulas side-by-side: herbs, actions, evidence grades, and TCM patterns. Shared herbs are highlighted in green.")}
      </p>

      <form method="GET" className="mb-6 flex flex-wrap gap-3 items-end">
        {renderPicker("a", a, T("方劑 A", "Formula A"))}
        <div className="text-2xl text-muted self-end pb-1">⟷</div>
        {renderPicker("b", b, T("方劑 B", "Formula B"))}
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark transition-colors self-end"
        >
          {T("比較", "Compare")}
        </button>
      </form>

      {/* Overlap summary */}
      {fa && fb && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold mb-3">
            {T("重疊分析", "Overlap Analysis")}：{fa.chineseName} vs {fb.chineseName}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="text-2xl font-bold text-green-700 tabular-nums">{sharedIds.size}</div>
              <div className="text-xs text-green-800 mt-0.5">{T("共用藥材", "Shared herbs")}</div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <div className="text-2xl font-bold text-blue-700 tabular-nums">{aOnlyCount}</div>
              <div className="text-xs text-blue-800 mt-0.5">{T("方劑 A 獨有", "A only")}</div>
            </div>
            <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
              <div className="text-2xl font-bold text-violet-700 tabular-nums">{bOnlyCount}</div>
              <div className="text-xs text-violet-800 mt-0.5">{T("方劑 B 獨有", "B only")}</div>
            </div>
          </div>
          {sharedIds.size > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="text-xs text-muted">{T("共用：", "Shared: ")}</span>
              {fa.herbs
                .filter((fh) => sharedIds.has(fh.herbId))
                .map((fh) => (
                  <span key={fh.herbId} className="text-xs rounded-full bg-green-100 text-green-800 px-2 py-0.5">
                    {zh ? fh.herb.chineseName : fh.herb.pinyinName}
                  </span>
                ))}
            </div>
          )}
          {/* Evidence comparison */}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div className="text-xs">
              <span className="font-semibold">{fa.chineseName}</span>{" "}
              {T("實證：", "evidence: ")}<span className="text-primary font-mono">{fa.evidenceLinks.length}</span>
            </div>
            <div className="text-xs">
              <span className="font-semibold">{fb.chineseName}</span>{" "}
              {T("實證：", "evidence: ")}<span className="text-primary font-mono">{fb.evidenceLinks.length}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {fa
          ? renderFormulaCard(fa, "a", bHerbIds)
          : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
              {T("選擇方劑 A", "Select Formula A")}
            </div>
          )}
        {fb
          ? renderFormulaCard(fb, "b", aHerbIds)
          : (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
              {T("選擇方劑 B", "Select Formula B")}
            </div>
          )}
      </div>

      {/* Legend */}
      <div className="mt-6 rounded-lg bg-surface border border-border p-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-200 border border-green-400"></span>
          {T("共用藥材", "Shared herb")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-200 border border-blue-400"></span>
          {T("方劑 A 獨有", "A only")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-violet-200 border border-violet-400"></span>
          {T("方劑 B 獨有", "B only")}
        </span>
        <span className="flex items-center gap-1">
          <span>⚠</span>
          {T("含毒性", "Contains toxics")}
        </span>
        <span className="flex items-center gap-1">
          <span>⟷</span>
          {T("兩方共用", "Shared")}
        </span>
      </div>
    </div>
  );
}
