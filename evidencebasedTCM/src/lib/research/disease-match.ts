import type { DiseaseTarget } from "./disease-catalog";

/**
 * Shared disease⇄text keyword matching. Evidence is not disease-tagged in the
 * schema, so association is inferred by keyword (CJK substring ≥2 chars, or
 * English substring ≥4 chars). Used by synthesize/discovery/benchmark/
 * evidence-map so they all agree on what "matches a disease".
 */

export interface DiseaseKeywords {
  cjk: string[];
  en: string[];
}

export function diseaseKeywords(d: DiseaseTarget): DiseaseKeywords {
  return {
    cjk: [...d.tcmTermsZh, ...d.keywordsZh],
    en: d.keywordsEn.map((k) => k.toLowerCase()),
  };
}

export function textMatchesDisease(text: string, kw: DiseaseKeywords): boolean {
  const lower = text.toLowerCase();
  for (const c of kw.cjk) if (c.length >= 2 && text.includes(c)) return true;
  for (const e of kw.en) if (e.length >= 4 && lower.includes(e)) return true;
  return false;
}
