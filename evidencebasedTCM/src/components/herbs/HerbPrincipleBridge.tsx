import Link from "next/link";
import type { Locale } from "@/lib/i18n/types";
import {
  deriveHerbActions,
  meridiansToElements,
  DIRECTION_GLYPH,
  ELEMENT_COLOR,
  ELEMENT_LABEL,
  MERIDIAN_TO_ELEMENT,
  CATEGORY_TO_PATHOLOGY,
  HEURISTIC_DISCLAIMER,
} from "@/lib/tcm/herb-action-heuristics";
import { HERB_NATURE_CONFIG, HERB_FLAVOR_CONFIG } from "@/lib/utils/tcm-constants";
import { MERIDIAN_THEME } from "@/components/shared/MeridianBadge";
import {
  herbNatureLabel,
  herbFlavorLabel,
  meridianLabel,
  pathologyLabel,
} from "@/lib/i18n/data-labels";

interface PatternRef {
  id: string;
  chineseName: string;
  pinyinName: string;
  englishName: string | null;
  pathologyType: string;
  isPrimary: boolean;
}

interface CompoundRef {
  compoundName: string;
  mechanismOfAction: string | null;
}

interface HerbPrincipleBridgeProps {
  locale?: Locale;
  nature: string;
  flavors: string[];
  meridians: string[];
  category: string;
  patterns: PatternRef[];
  compounds: CompoundRef[];
}

const COLUMN_TITLES = [
  { zh: "性味歸經", en: "Nature · Flavor · Meridian" },
  { zh: "作用趨向", en: "Action Tendency" },
  { zh: "作用標的", en: "Body Target" },
  { zh: "現代藥理", en: "Modern Pharmacology" },
] as const;

/**
 * Horizontal pedagogical flow connecting a herb's reliable classical properties
 * → heuristically-derived action tendency → the organs / patterns it targets →
 * its modern pharmacological correlate. Pure presentational, server-renderable.
 *
 * Layers 1, 3 (organs/patterns) and 4 are reliable data; layer 2 is a heuristic
 * inference and is visually flagged as such (dashed "推導" tag + disclaimer).
 */
export function HerbPrincipleBridge({
  locale = "en",
  nature,
  flavors,
  meridians,
  category,
  patterns,
  compounds,
}: HerbPrincipleBridgeProps) {
  const isZh = locale === "zh-Hant";

  const natureCfg = HERB_NATURE_CONFIG[nature as keyof typeof HERB_NATURE_CONFIG];
  const derived = deriveHerbActions({ nature, flavors });
  const elements = meridiansToElements(meridians);

  // Layer 3: prefer real primary-pattern linkage; fall back to category map.
  const primaryPatterns = patterns.filter((p) => p.isPrimary);
  const shownPatterns = primaryPatterns.length > 0 ? primaryPatterns : patterns;
  const fallbackPathologies =
    shownPatterns.length === 0 ? CATEGORY_TO_PATHOLOGY[category] ?? [] : [];

  const colTitle = (i: number) => (isZh ? COLUMN_TITLES[i].zh : COLUMN_TITLES[i].en);

  return (
    <figure className="rounded-lg border border-border bg-surface/50 p-4 not-prose">
      <figcaption className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight">
          {isZh ? "藥性 → 作用 → 標的 → 機轉" : "Property → Action → Target → Mechanism"}
        </h3>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {isZh ? HEURISTIC_DISCLAIMER.zh : HEURISTIC_DISCLAIMER.en}
        </p>
      </figcaption>

      <div className="flex flex-col md:flex-row md:items-stretch gap-2">
        {/* Layer 1 — properties (reliable) */}
        <Column title={colTitle(0)}>
          <div className="flex flex-wrap gap-1.5">
            {natureCfg && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${natureCfg.color}`}>
                {herbNatureLabel(locale, nature)}
              </span>
            )}
            {flavors.map((f) => {
              const cfg = HERB_FLAVOR_CONFIG[f.toLowerCase()];
              return (
                <span
                  key={f}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg?.color ?? "bg-gray-100 text-gray-800"}`}
                >
                  {herbFlavorLabel(locale, f)}
                </span>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {meridians.map((m) => {
              const theme = MERIDIAN_THEME[m];
              return (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                  style={{
                    color: theme?.fg ?? "#475569",
                    backgroundColor: theme?.bg ?? "#f1f5f9",
                    borderColor: theme?.ring ?? "#cbd5e1",
                  }}
                >
                  {meridianLabel(locale, m)}
                </span>
              );
            })}
          </div>
        </Column>

        <ConnectorArrow />

        {/* Layer 2 — derived action (heuristic) */}
        <Column title={colTitle(1)}>
          <span className="mb-2 inline-block rounded border border-dashed border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
            {isZh ? "推導 · 示意" : "Derived · heuristic"}
          </span>
          {derived.length === 0 ? (
            <p className="text-xs text-muted">—</p>
          ) : (
            <ul className="space-y-1.5">
              {derived.map((d) => (
                <li
                  key={d.actionZh}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-2 py-1 text-xs"
                >
                  <span className="font-mono text-sm text-primary" aria-hidden>
                    {DIRECTION_GLYPH[d.direction]}
                  </span>
                  <span className="font-medium">{isZh ? d.actionZh : d.actionEn}</span>
                </li>
              ))}
            </ul>
          )}
        </Column>

        <ConnectorArrow />

        {/* Layer 3 — body target (reliable: organs + patterns) */}
        <Column title={colTitle(2)}>
          {elements.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {meridians
                .filter((m) => MERIDIAN_TO_ELEMENT[m])
                .map((m) => {
                  const el = MERIDIAN_TO_ELEMENT[m]!;
                  const theme = MERIDIAN_THEME[m];
                  return (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: ELEMENT_COLOR[el] }}
                      title={`${isZh ? ELEMENT_LABEL[el].zh : ELEMENT_LABEL[el].en}`}
                    >
                      {isZh ? theme?.ch ?? m : m}
                    </span>
                  );
                })}
            </div>
          )}
          {shownPatterns.length > 0 ? (
            <ul className="space-y-1">
              {shownPatterns.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/patterns/${p.id}`}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs hover:border-primary-light transition-colors"
                  >
                    <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-800">
                      {pathologyLabel(locale, p.pathologyType)}
                    </span>
                    <span className="font-medium">{isZh ? p.chineseName : p.pinyinName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : fallbackPathologies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {fallbackPathologies.map((pt) => (
                <span
                  key={pt}
                  className="rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-800"
                >
                  {pathologyLabel(locale, pt)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">{isZh ? "尚無對應證型" : "No mapped pattern"}</p>
          )}
        </Column>

        <ConnectorArrow />

        {/* Layer 4 — modern pharmacology (reliable) */}
        <Column title={colTitle(3)}>
          {compounds.length > 0 ? (
            <ul className="space-y-1.5">
              {compounds.slice(0, 4).map((c, i) => (
                <li key={`${c.compoundName}-${i}`} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                  <span className="font-medium">{c.compoundName}</span>
                  {c.mechanismOfAction && (
                    <span className="mt-0.5 block text-muted line-clamp-2">{c.mechanismOfAction}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted">{isZh ? "尚無收載" : "Not yet catalogued"}</p>
          )}
        </Column>
      </div>
    </figure>
  );
}

function ConnectorArrow() {
  return (
    <div className="flex items-center justify-center text-muted shrink-0" aria-hidden>
      <span className="hidden md:inline text-2xl leading-none">→</span>
      <span className="md:hidden text-2xl leading-none">↓</span>
    </div>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-border bg-surface p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h4>
      {children}
    </div>
  );
}
