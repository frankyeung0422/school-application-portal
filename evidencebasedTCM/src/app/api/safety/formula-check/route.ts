import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { predictPkInteractions } from "@/lib/safety/predict-interactions";
import { checkClassicalIncompatibilities } from "@/lib/safety/classical-incompatibilities";
import { apiOk, apiError } from "@/lib/api/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/safety/formula-check
 * Body: { formulaId: string; medications?: string[] }
 *
 * Convenience wrapper for the clinical workflow: resolves formulaId → herbIds,
 * then runs the same herb-drug + classical-incompatibility checks as /api/safety/check.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { formulaId?: unknown; medications?: unknown };
    const formulaId = typeof body.formulaId === "string" ? body.formulaId : null;
    const medications: string[] = Array.isArray(body.medications)
      ? body.medications.filter((m): m is string => typeof m === "string").slice(0, 20)
      : [];

    if (!formulaId) return apiError("缺少 formulaId", 400);

    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        herbs: {
          include: {
            herb: {
              select: {
                id: true,
                chineseName: true,
                pinyinName: true,
                latinName: true,
              },
            },
          },
        },
      },
    });

    if (!formula) return apiError("找不到該方劑", 404);

    const herbs = formula.herbs.map((fh) => ({
      id: fh.herb.id,
      chineseName: fh.herb.chineseName,
      pinyinName: fh.herb.pinyinName,
      latinName: fh.herb.latinName,
    }));

    const herbIds = herbs.map((h) => h.id);

    // Herb-drug interactions
    const hdis = medications.length > 0
      ? await prisma.herbDrugInteraction.findMany({
          where: { herbId: { in: herbIds } },
          include: { herb: { select: { chineseName: true } } },
        })
      : [];

    const matchedDrugs = new Set(medications.map((m) => m.toLowerCase()));
    const interactions = hdis
      .filter((hdi) => matchedDrugs.has(hdi.drugName.toLowerCase()))
      .map((hdi) => ({
        herbChinese: hdi.herb.chineseName,
        drug: hdi.drugName,
        severity: hdi.severity,
        description: hdi.mechanism ?? hdi.clinicalEffect ?? "",
      }));

    // CYP predicted interactions
    const parsedDrugs = medications.map((m) => ({ generic: m.trim().toLowerCase(), display: m }));
    const predictedInteractions = await predictPkInteractions({ herbs, drugs: parsedDrugs });

    // Classical incompatibilities (十八反/十九畏 within the formula)
    const allHHIs = await prisma.herbHerbInteraction.findMany({
      where: {
        OR: [
          { herbAId: { in: herbIds }, herbBId: { in: herbIds } },
        ],
      },
      include: {
        herbA: { select: { chineseName: true } },
        herbB: { select: { chineseName: true } },
      },
    });

    const classicalConflicts = checkClassicalIncompatibilities(
      herbs.map((h) => ({ chineseName: h.chineseName, pinyinName: h.pinyinName }))
    );

    const herbHerbConflicts = [
      ...allHHIs.map((hhi) => ({
        herbA: hhi.herbA.chineseName,
        herbB: hhi.herbB.chineseName,
        description: hhi.description ?? "",
      })),
      ...classicalConflicts.map((c) => ({
        herbA: c.herb1,
        herbB: c.herb2,
        description: c.description,
      })),
    ];

    return apiOk({
      formulaName: formula.chineseName,
      herbCount: herbs.length,
      interactions,
      predictedInteractions,
      herbHerbConflicts,
    });
  } catch (e) {
    console.error("[safety/formula-check]", e);
    return apiError("伺服器錯誤", 500);
  }
}
