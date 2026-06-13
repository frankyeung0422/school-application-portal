import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese, localizeDbText } from "@/lib/i18n/to-traditional";
import { formulaRoleLabel } from "@/lib/i18n/data-labels";

interface Props {
  searchParams: Promise<{ a?: string; b?: string }>;
}

export default async function FormulaComparePage({ searchParams }: Props) {
  const locale = await getLocale();
  const { a, b } = await searchParams;

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
              include: { herb: { select: { id: true, pinyinName: true, chineseName: true } } },
            },
          },
        })
      : Promise.resolve(null);

  const [fa, fb] = await Promise.all([fetchOne(a), fetchOne(b)]);

  const renderPicker = (name: "a" | "b", current?: string) => (
    <select
      name={name}
      defaultValue={current ?? ""}
      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
    >
      <option value="">—</option>
      {allFormulas.map((f) => (
        <option key={f.id} value={f.id}>
          {locale === "zh-Hant" ? toTraditionalChinese(f.chineseName, locale) : f.pinyinName}
        </option>
      ))}
    </select>
  );

  const renderFormula = (f: NonNullable<Awaited<ReturnType<typeof fetchOne>>>) => {
    const name =
      locale === "zh-Hant" ? toTraditionalChinese(f.chineseName, locale) : f.pinyinName;
    return (
      <div className="rounded-lg border border-border p-4 bg-surface">
        <h2 className="text-lg font-bold mb-2">{name}</h2>
        <dl className="grid grid-cols-[80px_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Category</dt>
          <dd>{f.category}</dd>
          <dt className="text-muted">Source</dt>
          <dd>{f.sourceText ?? "—"}</dd>
          <dt className="text-muted">Actions</dt>
          <dd className="text-xs leading-relaxed">{localizeDbText(f.actions ?? "—", locale)}</dd>
          <dt className="text-muted">Indications</dt>
          <dd className="text-xs leading-relaxed">
            {localizeDbText(f.indications ?? "—", locale)}
          </dd>
        </dl>
        <div className="mt-3">
          <h3 className="text-sm font-semibold mb-2">Composition ({f.herbs.length})</h3>
          <ul className="space-y-1 text-xs">
            {f.herbs.map((fh) => (
              <li key={fh.id} className="flex items-center justify-between">
                <Link href={`/herbs/${fh.herb.id}`} className="hover:text-primary">
                  <span className="font-medium">
                    {locale === "zh-Hant"
                      ? toTraditionalChinese(fh.herb.chineseName, locale)
                      : fh.herb.pinyinName}
                  </span>
                  <span className="ml-1 text-muted">{formulaRoleLabel(locale, fh.role)}</span>
                </Link>
                <span className="font-mono text-muted">{fh.dosage ?? "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Overlap analysis
  const aHerbIds = new Set(fa?.herbs.map((h) => h.herbId) ?? []);
  const bHerbIds = new Set(fb?.herbs.map((h) => h.herbId) ?? []);
  const shared = [...aHerbIds].filter((id) => bHerbIds.has(id));
  const aOnly = [...aHerbIds].filter((id) => !bHerbIds.has(id));
  const bOnly = [...bHerbIds].filter((id) => !aHerbIds.has(id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/formulas" className="hover:text-primary">Formulas</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Compare</span>
      </nav>

      <h1 className="text-3xl font-bold mb-6">Compare Formulas</h1>

      <form method="GET" className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        {renderPicker("a", a)}
        {renderPicker("b", b)}
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Compare
        </button>
      </form>

      {fa && fb && (
        <div className="mb-6 rounded-lg border border-border p-4 bg-primary/5">
          <h3 className="text-sm font-semibold mb-2">Overlap Analysis</h3>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <div className="rounded bg-green-50 p-2">
              <div className="font-semibold text-green-800 mb-1">Shared ({shared.length})</div>
              <div className="text-green-700">{shared.length > 0 ? "Both formulas share these herbs" : "No shared herbs"}</div>
            </div>
            <div className="rounded bg-blue-50 p-2">
              <div className="font-semibold text-blue-800 mb-1">A only ({aOnly.length})</div>
            </div>
            <div className="rounded bg-amber-50 p-2">
              <div className="font-semibold text-amber-800 mb-1">B only ({bOnly.length})</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {fa ? renderFormula(fa) : <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted">Select formula A</div>}
        {fb ? renderFormula(fb) : <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted">Select formula B</div>}
      </div>
    </div>
  );
}
