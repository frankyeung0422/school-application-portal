/**
 * Public herb-drug interaction check. NO LOGIN required — this is the
 * front-door safety tool for clinicians evaluating supplement use.
 *
 * POST body: { herbIds: string[], drugGenerics: string[] }
 * Returns: { interactions: [...], pregnancySafety: {...}, lactationSafety: {...}, pediatricSafety: {...} }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DRUGS, getDrugByGeneric } from "@/lib/safety/rxnorm-subset";
import { predictPkInteractions } from "@/lib/safety/predict-interactions";
import { checkClassicalIncompatibilities } from "@/lib/safety/classical-incompatibilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HERBS = 30;
const MAX_DRUGS = 20;

interface ReqBody {
  herbIds?: unknown;
  drugGenerics?: unknown;
}

export async function POST(req: NextRequest) {
  let body: ReqBody;
  try {
    body = (await req.json()) as ReqBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const herbIds = Array.isArray(body.herbIds)
    ? body.herbIds.filter((x): x is string => typeof x === "string").slice(0, MAX_HERBS)
    : [];
  const drugGenerics = Array.isArray(body.drugGenerics)
    ? body.drugGenerics.filter((x): x is string => typeof x === "string").slice(0, MAX_DRUGS)
    : [];

  if (herbIds.length === 0) {
    return NextResponse.json({ ok: true, herbs: [], interactions: [], herbHerbConflicts: [], safetyByHerb: [] });
  }

  // Pull herb info + contraindications + interactions in parallel.
  const [herbs, contras, hdis, hhis] = await Promise.all([
    prisma.herb.findMany({
      where: { id: { in: herbIds } },
      select: { id: true, chineseName: true, pinyinName: true, englishName: true, latinName: true, category: true },
    }),
    prisma.herbContraindication.findMany({
      where: { herbId: { in: herbIds } },
      select: {
        herbId: true,
        condition: true,
        severity: true,
        description: true,
        pregnancyCategory: true,
        lactationSafety: true,
        pediatricSafety: true,
      },
    }),
    prisma.herbDrugInteraction.findMany({
      where: { herbId: { in: herbIds } },
      include: { herb: { select: { id: true, chineseName: true, pinyinName: true } } },
    }),
    prisma.herbHerbInteraction.findMany({
      where: {
        OR: [
          { herbAId: { in: herbIds }, herbBId: { in: herbIds } },
        ],
      },
      include: {
        herbA: { select: { id: true, chineseName: true, pinyinName: true } },
        herbB: { select: { id: true, chineseName: true, pinyinName: true } },
      },
    }),
  ]);

  // Cross-reference HDIs against the user's drug list using both drugName and drugClass.
  const drugRecords = drugGenerics
    .map((g) => getDrugByGeneric(g))
    .filter((d): d is NonNullable<ReturnType<typeof getDrugByGeneric>> => Boolean(d));

  const interactions: Array<{
    herbId: string;
    herbChineseName: string;
    herbPinyinName: string;
    drugGeneric: string;
    drugDisplay: string;
    drugClass: string;
    severity: string;
    mechanism: string | null;
    clinicalEffect: string | null;
    management: string | null;
  }> = [];

  for (const inter of hdis) {
    const dn = inter.drugName.toLowerCase();
    const dc = (inter.drugClass ?? "").toLowerCase();
    for (const drug of drugRecords) {
      const g = drug.generic.toLowerCase();
      const disp = drug.display.toLowerCase();
      const cls = drug.className.toLowerCase();
      const matchByName = dn.includes(g) || g.includes(dn) || dn.includes(disp) || disp.includes(dn)
        || (drug.brands?.some((b) => dn.includes(b.toLowerCase())) ?? false);
      const matchByClass = dc.length > 0 && (dc.includes(cls) || cls.includes(dc));
      if (matchByName || matchByClass) {
        interactions.push({
          herbId: inter.herbId,
          herbChineseName: inter.herb.chineseName,
          herbPinyinName: inter.herb.pinyinName,
          drugGeneric: drug.generic,
          drugDisplay: drug.display,
          drugClass: drug.className,
          severity: inter.severity,
          mechanism: inter.mechanism,
          clinicalEffect: inter.clinicalEffect,
          management: inter.management,
        });
      }
    }
  }

  const sevRank: Record<string, number> = { MAJOR: 3, MODERATE: 2, MINOR: 1, THEORETICAL: 0 };
  interactions.sort((a, b) => (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0));

  // Predicted pharmacokinetic interactions (CYP/transporter-based), distinct
  // from the curated HDI table above.
  const predictedInteractions = await predictPkInteractions({
    herbs: herbs.map((h) => ({ id: h.id, chineseName: h.chineseName, pinyinName: h.pinyinName, latinName: h.latinName })),
    drugs: drugRecords.map((d) => ({ generic: d.generic, display: d.display })),
  });

  // Herb-herb classical incompatibilities — DB curated pairs first,
  // then code-based 十八反/十九畏 checker to catch any DB gaps.
  const herbHerbConflicts: Array<{
    herbAId: string;
    herbAChineseName: string;
    herbBId: string;
    herbBChineseName: string;
    interactionType: string;
    severity: string;
    description: string | null;
    classicalSource: string | null;
  }> = hhis.map((h) => ({
    herbAId: h.herbAId,
    herbAChineseName: h.herbA.chineseName,
    herbBId: h.herbBId,
    herbBChineseName: h.herbB.chineseName,
    interactionType: h.interactionType as string,
    severity: h.severity as string,
    description: h.description,
    classicalSource: h.classicalSource,
  }));

  // Augment with code-based 十八反/十九畏 (catches pairs not yet in the DB).
  const classicalWarnings = checkClassicalIncompatibilities(
    herbs.map((h) => ({ chineseName: h.chineseName, pinyinName: h.pinyinName }))
  );
  const dbPairKeys = new Set(
    herbHerbConflicts.map((c) => [c.herbAChineseName, c.herbBChineseName].sort().join("|"))
  );
  for (const w of classicalWarnings) {
    const key = [w.herb1, w.herb2].sort().join("|");
    if (dbPairKeys.has(key)) continue;
    dbPairKeys.add(key);
    herbHerbConflicts.push({
      herbAId: herbs.find((h) => h.chineseName.includes(w.herb1) || w.herb1.includes(h.chineseName))?.id ?? "",
      herbAChineseName: w.herb1,
      herbBId: herbs.find((h) => h.chineseName.includes(w.herb2) || w.herb2.includes(h.chineseName))?.id ?? "",
      herbBChineseName: w.herb2,
      interactionType: w.type,
      severity: w.severity,
      description: w.description,
      classicalSource: w.classicalSource,
    });
  }

  // Worst-of safety summary per herb.
  const safetyByHerb = herbs.map((h) => {
    const cs = contras.filter((c) => c.herbId === h.id);
    const preg = worstPregnancy(cs.map((c) => c.pregnancyCategory).filter(Boolean) as string[]);
    const lact = worstLactation(cs.map((c) => c.lactationSafety).filter(Boolean) as string[]);
    const ped = worstPediatric(cs.map((c) => c.pediatricSafety).filter(Boolean) as string[]);
    return {
      herbId: h.id,
      chineseName: h.chineseName,
      pinyinName: h.pinyinName,
      englishName: h.englishName,
      category: h.category,
      pregnancy: preg,
      lactation: lact,
      pediatric: ped,
      contraindicationCount: cs.length,
    };
  });

  return NextResponse.json({
    ok: true,
    herbs: safetyByHerb,
    interactions,
    predictedInteractions,
    herbHerbConflicts,
    drugs: drugRecords.map((d) => ({ generic: d.generic, display: d.display, className: d.className })),
  });
}

function worstPregnancy(vals: string[]): string | null {
  const order = ["CONTRAINDICATED", "CAUTION", "UNKNOWN", "SAFE"];
  for (const o of order) if (vals.includes(o)) return o;
  return null;
}
function worstLactation(vals: string[]): string | null {
  const order = ["CONTRAINDICATED", "CAUTION", "UNKNOWN", "SAFE"];
  for (const o of order) if (vals.includes(o)) return o;
  return null;
}
function worstPediatric(vals: string[]): string | null {
  const order = ["CONTRAINDICATED", "CAUTION_OVER_6", "CAUTION_OVER_2", "UNKNOWN", "SAFE"];
  for (const o of order) if (vals.includes(o)) return o;
  return null;
}

// Re-export drug list endpoint for search-as-you-type.
export async function GET() {
  return NextResponse.json({ ok: true, drugs: DRUGS });
}
