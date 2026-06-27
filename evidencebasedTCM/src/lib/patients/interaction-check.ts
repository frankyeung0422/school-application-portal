import { prisma } from "@/lib/db/prisma";
import { getDrugByGeneric } from "@/lib/safety/rxnorm-subset";
import { predictPkInteractions } from "@/lib/safety/predict-interactions";

/**
 * Cross-reference a patient's prescription against their current Western
 * meds. Accepts EITHER:
 *   - a `patientId` (preferred) — uses structured PatientMedication[] with
 *     active-only filtering and falls back to the legacy `westernMeds`
 *     free-text field if no structured entries exist.
 *   - or a `westernMedsText` (legacy callers) — comma-separated free-text.
 *
 * Returns the warnings to store on the prescription so they survive future
 * edits — clinicians want a record of what was flagged at signing time.
 */
export interface InteractionWarning {
  herbId: string;
  herbChineseName: string;
  herbPinyinName: string;
  drugMatched: string;
  drugClass: string | null;
  severity: "MAJOR" | "MODERATE" | "MINOR" | "THEORETICAL" | string;
  mechanism: string | null;
  clinicalEffect: string | null;
  management: string | null;
  /** true = predicted (CYP/transporter-based), not a curated record */
  predicted?: boolean;
}

interface DrugCandidate {
  display: string;
  generic: string | null;       // RxNorm key if known
  className: string | null;
}

async function resolvePatientDrugs(
  patientId: string | null,
  westernMedsText: string | null | undefined,
): Promise<DrugCandidate[]> {
  if (patientId) {
    const meds = await prisma.patientMedication.findMany({
      where: {
        patientId,
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      select: { drugGeneric: true, displayName: true, drugClass: true },
    });
    if (meds.length > 0) {
      return meds.map((m) => ({
        display: m.displayName,
        generic: m.drugGeneric,
        className: m.drugClass,
      }));
    }
  }
  // Fallback to legacy free-text.
  if (westernMedsText && westernMedsText.trim().length > 0) {
    return westernMedsText
      .split(/[,，;；、\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => {
        const rx = getDrugByGeneric(s);
        return rx
          ? { display: rx.display, generic: rx.generic, className: rx.className }
          : { display: s, generic: null, className: null };
      });
  }
  return [];
}

export async function checkRxInteractions(
  herbIds: string[],
  patientOrText: { patientId?: string | null; westernMedsText?: string | null } | string | null | undefined,
): Promise<InteractionWarning[]> {
  if (herbIds.length === 0) return [];

  // Backwards-compatible argument: a bare string is treated as legacy free-text.
  const patientId = typeof patientOrText === "string" || !patientOrText
    ? null
    : patientOrText.patientId ?? null;
  const westernMedsText = typeof patientOrText === "string"
    ? patientOrText
    : patientOrText?.westernMedsText ?? null;

  const drugs = await resolvePatientDrugs(patientId, westernMedsText);
  if (drugs.length === 0) return [];

  const interactions = await prisma.herbDrugInteraction.findMany({
    where: { herbId: { in: herbIds } },
    include: { herb: { select: { chineseName: true, pinyinName: true } } },
  });

  const warnings: InteractionWarning[] = [];
  for (const inter of interactions) {
    const drugLow = inter.drugName.toLowerCase();
    const classLow = inter.drugClass?.toLowerCase() ?? "";
    for (const d of drugs) {
      const dispLow = d.display.toLowerCase();
      const genericLow = (d.generic ?? "").toLowerCase();
      const dClassLow = (d.className ?? "").toLowerCase();
      const matchName =
        (dispLow.length >= 4 && (drugLow.includes(dispLow) || dispLow.includes(drugLow))) ||
        (genericLow.length >= 4 && (drugLow.includes(genericLow) || genericLow.includes(drugLow)));
      const matchClass = classLow.length > 0 && dClassLow.length > 0 &&
        (classLow.includes(dClassLow) || dClassLow.includes(classLow));
      if (matchName || matchClass) {
        warnings.push({
          herbId: inter.herbId,
          herbChineseName: inter.herb.chineseName,
          herbPinyinName: inter.herb.pinyinName,
          drugMatched: d.display,
          drugClass: inter.drugClass,
          severity: inter.severity,
          mechanism: inter.mechanism,
          clinicalEffect: inter.clinicalEffect,
          management: inter.management,
        });
        break;
      }
    }
  }

  // Predicted pharmacokinetic interactions (CYP/transporter-based).
  const drugsWithGeneric = drugs.filter((d) => d.generic);
  if (drugsWithGeneric.length > 0) {
    const herbRows = await prisma.herb.findMany({
      where: { id: { in: herbIds } },
      select: { id: true, chineseName: true, pinyinName: true, latinName: true },
    });
    const predicted = await predictPkInteractions({
      herbs: herbRows,
      drugs: drugsWithGeneric.map((d) => ({ generic: d.generic as string, display: d.display })),
    });
    for (const p of predicted) {
      warnings.push({
        herbId: p.herbId,
        herbChineseName: p.herbChineseName,
        herbPinyinName: p.herbPinyinName,
        drugMatched: p.drugDisplay,
        drugClass: null,
        severity: p.severity,
        mechanism: `（預測·${p.enzyme}）${p.mechanism}`,
        clinicalEffect: p.effect === "INCREASE" ? "↑ 藥物濃度（毒性風險）" : "↓ 藥物濃度（療效下降）",
        management: p.management,
        predicted: true,
      });
    }
  }

  const sevRank: Record<string, number> = { MAJOR: 3, MODERATE: 2, MINOR: 1, THEORETICAL: 0 };
  // Curated records rank above predicted ones at equal severity.
  warnings.sort((a, b) => (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0) || (a.predicted ? 1 : 0) - (b.predicted ? 1 : 0));
  return warnings;
}
