import { prisma } from "@/lib/db/prisma";

/**
 * Retrieval step for RAG-grounded syndrome differentiation. There are only ~77
 * patterns, so we fetch them all and score each against the patient's
 * presentation (symptom-token overlap + tongue/pulse hints), returning the top
 * candidates as grounding for the LLM. This keeps the reasoner constrained to
 * the knowledge base (it may only pick from what we retrieve).
 */

export interface RetrievedFormula {
  id: string;
  chineseName: string;
  pinyinName: string;
  actions: string | null;
}

export interface RetrievedPattern {
  id: string;
  chineseName: string;
  pinyinName: string;
  pathologyType: string;
  keySymptoms: string | null;
  tongue: string | null;
  pulse: string | null;
  treatmentPrinciple: string | null;
  score: number;
  matched: string[]; // which input features matched
  formulas: RetrievedFormula[];
}

export interface DiagnoseInput {
  symptomsText: string;
  tongueBody?: string | null;
  tongueCoat?: string | null;
  pulse?: string | null;
}

const SPLIT = /[、,，;；。\s/]+/;

function tokens(s: string | null | undefined): string[] {
  if (!s) return [];
  return s.split(SPLIT).map((t) => t.trim()).filter((t) => t.length >= 2);
}

export async function retrievePatterns(input: DiagnoseInput, limit = 12): Promise<RetrievedPattern[]> {
  const patterns = await prisma.tcmPattern.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true, pinyinName: true, chineseName: true, pathologyType: true,
      keySymptoms: true, tongue: true, pulse: true, treatmentPrinciple: true,
      patternFormulas: {
        orderBy: { isPrimary: "desc" },
        select: { formula: { select: { id: true, chineseName: true, pinyinName: true, actions: true } } },
      },
    },
  });

  const symptomText = input.symptomsText ?? "";
  const tongue = `${input.tongueBody ?? ""} ${input.tongueCoat ?? ""}`.trim();
  const pulse = input.pulse ?? "";

  const scored = patterns.map((p) => {
    const matched: string[] = [];
    let score = 0;

    // Symptom-token overlap: how many of the pattern's key symptoms appear in
    // the patient's described symptoms (and vice versa).
    for (const t of tokens(p.keySymptoms)) {
      if (symptomText.includes(t)) { score += 3; matched.push(t); }
    }
    // Also reward patient symptom tokens that appear in the pattern's text.
    const patientToks = tokens(symptomText);
    const haystack = `${p.keySymptoms ?? ""} ${p.chineseName}`;
    for (const t of patientToks) {
      if (t.length >= 2 && haystack.includes(t) && !matched.includes(t)) { score += 2; matched.push(t); }
    }
    // Tongue / pulse hints.
    for (const t of tokens(tongue)) {
      if (p.tongue && p.tongue.includes(t)) { score += 2; matched.push(`舌:${t}`); }
    }
    for (const t of tokens(pulse)) {
      if (p.pulse && p.pulse.includes(t)) { score += 2; matched.push(`脈:${t}`); }
    }

    return {
      id: p.id, chineseName: p.chineseName, pinyinName: p.pinyinName, pathologyType: p.pathologyType,
      keySymptoms: p.keySymptoms, tongue: p.tongue, pulse: p.pulse, treatmentPrinciple: p.treatmentPrinciple,
      score, matched: [...new Set(matched)],
      formulas: p.patternFormulas.map((pf) => pf.formula).filter((f): f is RetrievedFormula => !!f).slice(0, 3),
    };
  });

  return scored.filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
