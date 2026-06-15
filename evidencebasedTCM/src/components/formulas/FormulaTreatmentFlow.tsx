import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import { formulaRoleLabel, pathologyLabel } from "@/lib/i18n/data-labels";
import { FORMULA_ROLE_CONFIG } from "@/lib/utils/tcm-constants";

interface PatternRef {
  id: string;
  chineseName: string;
  pinyinName: string;
  pathologyType: string;
  isPrimary: boolean;
}

interface HerbRef {
  id: string;
  role: "JUN" | "CHEN" | "ZUO" | "SHI";
  chineseName: string;
  pinyinName: string;
}

interface Props {
  locale?: Locale;
  actions: string | null;
  patterns: PatternRef[];
  herbs: HerbRef[];
}

const ROLE_ORDER: HerbRef["role"][] = ["JUN", "CHEN", "ZUO", "SHI"];

function Arrow() {
  return (
    <div className="flex items-center justify-center text-muted shrink-0" aria-hidden>
      <span className="hidden md:inline text-2xl leading-none">→</span>
      <span className="md:hidden text-2xl leading-none">↓</span>
    </div>
  );
}

/**
 * 證 → 治法 → 君臣佐使 causal flow. Complements CompositionWheel (which shows
 * structure) by showing *why* that structure is assembled. Static SVG-free
 * layout (HTML flex) — naturally responsive, stacks on mobile.
 */
export function FormulaTreatmentFlow({ locale = "en", actions, patterns, herbs }: Props) {
  const isZh = locale === "zh-Hant";
  const shownPatterns = patterns.filter((p) => p.isPrimary).length
    ? patterns.filter((p) => p.isPrimary)
    : patterns;

  const grouped: Record<HerbRef["role"], HerbRef[]> = { JUN: [], CHEN: [], ZUO: [], SHI: [] };
  for (const h of herbs) grouped[h.role].push(h);

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? "證型 → 治法 → 君臣佐使" : "Pattern → Strategy → Hierarchy"}
        </h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh
            ? "從所治證型，到確立治法，再到方中君臣佐使的配伍邏輯。"
            : "From the pattern treated, to the therapeutic strategy, to the emperor/minister/assistant/envoy logic of the formula."}
        </p>
      </figcaption>

      <div className="flex flex-col md:flex-row md:items-stretch gap-2">
        {/* Pattern */}
        <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{isZh ? "主治證型" : "Pattern"}</h4>
          {shownPatterns.length > 0 ? (
            <ul className="space-y-1">
              {shownPatterns.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/patterns/${p.id}`}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-primary-light transition-colors"
                  >
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800">
                      {pathologyLabel(locale, p.pathologyType)}
                    </span>
                    <span className="font-medium">{isZh ? p.chineseName : p.pinyinName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </div>

        <Arrow />

        {/* Strategy (治法) */}
        <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{isZh ? "治法" : "Strategy"}</h4>
          {actions ? (
            <p className="whitespace-pre-line text-xs leading-relaxed">{actions}</p>
          ) : (
            <p className="text-xs text-muted">—</p>
          )}
        </div>

        <Arrow />

        {/* Hierarchy (君臣佐使) */}
        <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{isZh ? "配伍" : "Hierarchy"}</h4>
          <div className="space-y-1.5">
            {ROLE_ORDER.filter((r) => grouped[r].length > 0).map((role) => (
              <div key={role} className="flex items-start gap-1.5 text-xs">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${FORMULA_ROLE_CONFIG[role].color}`}>
                  {formulaRoleLabel(locale, role)}
                </span>
                <span className="flex flex-wrap gap-1">
                  {grouped[role].map((h) => (
                    <Link key={h.id} href={`/herbs/${h.id}`} className="rounded bg-background px-1 hover:text-primary">
                      {isZh ? h.chineseName : h.pinyinName}
                    </Link>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
