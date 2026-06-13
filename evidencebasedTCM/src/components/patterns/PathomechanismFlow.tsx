import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { pathologyLabel } from "@/lib/i18n/data-labels";

interface FormulaRef {
  id: string;
  chineseName: string;
  pinyinName: string;
  englishName: string | null;
}

interface Props {
  locale?: Locale;
  pathologyType: string;
  organSystem: string | null;
  keySymptoms: string | null;
  treatmentPrinciple: string | null;
  primaryFormula: FormulaRef | null;
}

function Arrow() {
  return (
    <div className="flex items-center justify-center text-muted shrink-0" aria-hidden>
      <span className="hidden lg:inline text-2xl leading-none">→</span>
      <span className="lg:hidden text-2xl leading-none">↓</span>
    </div>
  );
}

function Step({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</h4>
      {children}
    </div>
  );
}

/** Split free-text key symptoms into chips on common Chinese/Latin delimiters. */
function splitSymptoms(text: string): string[] {
  return text
    .split(/[、，,；;。\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * 病機 (pathomechanism) flow: 病因 → 臟腑/氣血失調 → 主症 → 治則 → 主方.
 * All data is read straight from the TcmPattern record. Static layout.
 */
export function PathomechanismFlow({
  locale = "en",
  pathologyType,
  organSystem,
  keySymptoms,
  treatmentPrinciple,
  primaryFormula,
}: Props) {
  const isZh = locale === "zh-Hant";
  const symptoms = keySymptoms ? splitSymptoms(keySymptoms) : [];

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? "病機演變" : "Pathomechanism"}
        </h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh
            ? "病因病性 → 臟腑氣血失調 → 主要症狀 → 治療原則 → 代表方劑。"
            : "Cause & nature → organ / Qi-Blood disruption → key signs → treatment principle → representative formula."}
        </p>
      </figcaption>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
        <Step label={isZh ? "病因病性" : "Cause"}>
          <span className="inline-block rounded bg-purple-100 px-2 py-0.5 text-sm font-medium text-purple-800">
            {pathologyLabel(locale, pathologyType)}
          </span>
        </Step>

        <Arrow />

        <Step label={isZh ? "臟腑/氣血" : "Organ / Qi-Blood"}>
          {organSystem ? (
            <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-sm font-medium text-emerald-800">
              {organSystem}
            </span>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </Step>

        <Arrow />

        <Step label={isZh ? "主症" : "Key Signs"}>
          {symptoms.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {symptoms.map((s, i) => (
                <span key={i} className="rounded border border-border bg-background px-1.5 py-0.5 text-xs">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </Step>

        <Arrow />

        <Step label={isZh ? "治則" : "Principle"}>
          {treatmentPrinciple ? (
            <p className="text-xs leading-relaxed">{treatmentPrinciple}</p>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </Step>

        <Arrow />

        <Step label={isZh ? "主方" : "Formula"}>
          {primaryFormula ? (
            <Link
              href={`/formulas/${primaryFormula.id}`}
              className="inline-block rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:border-primary-light transition-colors"
            >
              {isZh ? primaryFormula.chineseName : primaryFormula.pinyinName}
            </Link>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </Step>
      </div>
    </figure>
  );
}
