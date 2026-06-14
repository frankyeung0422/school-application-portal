import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/shared/Badge";
import { getLocale } from "@/lib/i18n/locale-server";
import { toTraditionalChinese } from "@/lib/i18n/to-traditional";
import { tcmEntityTitles } from "@/lib/i18n/entity-display";
import { pathologyLabel } from "@/lib/i18n/data-labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatternProtocolPage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();
  const zh = locale === "zh-Hant";

  const pattern = await prisma.tcmPattern.findUnique({
    where: { id },
    include: {
      patternFormulas: {
        include: {
          formula: {
            select: {
              id: true,
              pinyinName: true,
              chineseName: true,
              actions: true,
              indications: true,
              contraindications: true,
              dosageInstructions: true,
              herbs: {
                include: { herb: { select: { id: true, pinyinName: true, chineseName: true } } },
                orderBy: { role: "asc" },
              },
            },
          },
        },
        orderBy: { isPrimary: "desc" },
      },
      patternAcupoints: {
        include: {
          acupoint: {
            select: {
              id: true,
              code: true,
              pinyinName: true,
              chineseName: true,
              meridian: true,
              moxaApplicable: true,
              moxaContraindicated: true,
              pregnancyContraindicated: true,
              needleAngle: true,
            },
          },
        },
      },
    },
  });

  if (!pattern) notFound();

  const header = tcmEntityTitles(pattern, locale);

  const ROLE_COLOR: Record<string, string> = {
    JUN: "bg-red-100 text-red-800",
    CHEN: "bg-amber-100 text-amber-800",
    ZUO: "bg-blue-100 text-blue-800",
    SHI: "bg-green-100 text-green-800",
  };
  const ROLE_LABEL: Record<string, string> = {
    JUN: zh ? "君" : "Jun",
    CHEN: zh ? "臣" : "Chen",
    ZUO: zh ? "佐" : "Zuo",
    SHI: zh ? "使" : "Shi",
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print:py-4">
      <nav className="mb-4 text-sm text-muted print:hidden">
        <Link href="/patterns" className="hover:text-primary">{zh ? "證型" : "Patterns"}</Link>
        <span className="mx-2">/</span>
        <Link href={`/patterns/${id}`} className="hover:text-primary">{header.primary}</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{zh ? "臨床方案" : "Protocol"}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{header.primary}</h1>
          <p className="text-lg text-muted mt-1">{header.secondary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge label={pathologyLabel(locale, pattern.pathologyType)} color="bg-violet-100 text-violet-800" />
            {pattern.organSystem && (
              <Badge
                label={zh ? `臟腑：${pattern.organSystem}` : `Organ: ${pattern.organSystem}`}
                color="bg-blue-100 text-blue-800"
              />
            )}
          </div>
        </div>
        <button
          onClick={undefined}
          className="print:hidden rounded-md border border-border px-3 py-1.5 text-sm hover:bg-surface"
          aria-label="Print"
          type="button"
        >
          🖨 {zh ? "列印" : "Print"}
        </button>
      </div>

      {/* Diagnosis quick-reference */}
      {(pattern.keySymptoms || pattern.tongue || pattern.pulse) && (
        <div className="rounded-lg border border-border bg-surface p-4 mb-6 grid gap-3 sm:grid-cols-3">
          {pattern.keySymptoms && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                {zh ? "主症" : "Key Symptoms"}
              </h3>
              <p className="text-sm leading-relaxed">{pattern.keySymptoms}</p>
            </div>
          )}
          {pattern.tongue && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                {zh ? "舌象" : "Tongue"}
              </h3>
              <p className="text-sm">{toTraditionalChinese(pattern.tongue, locale)}</p>
            </div>
          )}
          {pattern.pulse && (
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                {zh ? "脈象" : "Pulse"}
              </h3>
              <p className="text-sm">{toTraditionalChinese(pattern.pulse, locale)}</p>
            </div>
          )}
        </div>
      )}

      {pattern.treatmentPrinciple && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">{zh ? "治則治法" : "Treatment Principle"}</h2>
          <p className="text-sm text-muted">{toTraditionalChinese(pattern.treatmentPrinciple, locale)}</p>
        </div>
      )}

      {pattern.contraindications && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 mb-6">
          <h3 className="text-sm font-semibold text-orange-900 mb-1">⚠ {zh ? "禁忌" : "Contraindications"}</h3>
          <p className="text-sm text-orange-800">{pattern.contraindications}</p>
        </div>
      )}

      {/* Formulas */}
      {pattern.patternFormulas.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{zh ? "方劑" : "Formulas"}</h2>
          <div className="space-y-6">
            {pattern.patternFormulas.map((pf) => {
              const fTitle = tcmEntityTitles(pf.formula, locale);
              return (
                <div key={pf.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Link href={`/formulas/${pf.formula.id}`} className="font-semibold text-primary hover:underline text-lg">
                        {fTitle.primary}
                      </Link>
                      <span className="text-muted ml-2 text-sm">{fTitle.secondary}</span>
                    </div>
                    {pf.isPrimary && (
                      <Badge label={zh ? "主方" : "Primary"} color="bg-green-100 text-green-800" />
                    )}
                  </div>

                  {/* Composition */}
                  {pf.formula.herbs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {pf.formula.herbs.map((fh) => {
                        const hName = zh
                          ? toTraditionalChinese(fh.herb.chineseName, locale)
                          : fh.herb.pinyinName;
                        return (
                          <Link
                            key={fh.id}
                            href={`/herbs/${fh.herb.id}`}
                            className={`rounded px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[fh.role] ?? "bg-gray-100 text-gray-800"}`}
                            title={`${ROLE_LABEL[fh.role]} — ${fh.dosage ?? ""}`}
                          >
                            {hName}
                            {fh.dosage && <span className="ml-1 opacity-70">{fh.dosage}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {pf.formula.dosageInstructions && (
                    <p className="text-xs text-muted mb-2">
                      <span className="font-semibold">{zh ? "用法：" : "Dosage: "}</span>
                      {pf.formula.dosageInstructions}
                    </p>
                  )}
                  {pf.formula.contraindications && (
                    <p className="text-xs text-orange-700">
                      <span className="font-semibold">⚠ </span>{pf.formula.contraindications}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Acupuncture */}
      {pattern.patternAcupoints.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{zh ? "針灸處方" : "Acupuncture Protocol"}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="py-2 pr-4 text-left">{zh ? "穴位" : "Acupoint"}</th>
                  <th className="py-2 pr-4 text-left">{zh ? "手法" : "Method"}</th>
                  <th className="py-2 pr-4 text-left">{zh ? "進針" : "Needle Angle"}</th>
                  <th className="py-2 text-left">{zh ? "灸/孕" : "Moxa/Preg"}</th>
                </tr>
              </thead>
              <tbody>
                {pattern.patternAcupoints.map((pa) => {
                  const aName = zh
                    ? toTraditionalChinese(pa.acupoint.chineseName, locale)
                    : pa.acupoint.pinyinName;
                  return (
                    <tr key={pa.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        <Link href={`/acupuncture/${pa.acupoint.id}`} className="hover:text-primary">
                          <span className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-2">
                            {pa.acupoint.code}
                          </span>
                          <span className="font-medium">{aName}</span>
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-muted">
                        {pa.stimulationMethod
                          ? toTraditionalChinese(pa.stimulationMethod, locale)
                          : zh ? "常規" : "Standard"}
                      </td>
                      <td className="py-2 pr-4 text-muted text-xs">{pa.acupoint.needleAngle ?? "—"}</td>
                      <td className="py-2 text-xs">
                        <span className="flex gap-1">
                          {pa.acupoint.moxaApplicable && !pa.acupoint.moxaContraindicated && (
                            <span title={zh ? "可灸" : "Moxa OK"} className="text-amber-600">🔥</span>
                          )}
                          {pa.acupoint.moxaContraindicated && (
                            <span title={zh ? "禁灸" : "No moxa"} className="text-gray-400">🚫灸</span>
                          )}
                          {pa.acupoint.pregnancyContraindicated && (
                            <span title={zh ? "孕婦禁針" : "Preg CI"} className="text-pink-600">🤰</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-6 flex gap-3 print:hidden">
        <Link
          href={`/patterns/${id}`}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          ← {zh ? "返回證型詳情" : "Back to Pattern"}
        </Link>
        <Link
          href="/safety/pregnancy"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-surface"
        >
          🤰 {zh ? "妊娠安全" : "Pregnancy Safety"}
        </Link>
      </div>
    </div>
  );
}
