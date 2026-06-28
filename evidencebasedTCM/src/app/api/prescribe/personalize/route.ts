import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { predictPkInteractions } from "@/lib/safety/predict-interactions";
import { getCurrentTier, tierAtLeast } from "@/lib/auth/tier";
import { apiOk, apiError } from "@/lib/api/helpers";
import { DRUG_CYP } from "@/lib/safety/cyp-data";

/**
 * POST /api/prescribe/personalize
 *
 * Personalises a formula for an individual patient by:
 *  1. Running CYP/PK interaction prediction against their Western drug list
 *  2. Flagging herbs that conflict with their TCM constitution type
 *
 * Pro-gated — requires "professional" tier or above.
 */

const CONSTITUTION_RULES: Record<
  string,
  { avoidNatures: string[]; avoidCategories: string[]; tip: string }
> = {
  "陽虛質": {
    avoidNatures: ["COLD", "COOL"],
    avoidCategories: ["Heat Clearing"],
    tip: "陽虛體質慎用寒涼藥物，以免損傷陽氣，建議配合溫補藥以護陽。",
  },
  "陰虛質": {
    avoidNatures: ["HOT", "WARM"],
    avoidCategories: ["Interior Warming"],
    tip: "陰虛體質慎用辛熱燥烈藥物，以免助熱傷陰，宜酌加養陰生津之品。",
  },
  "痰濕質": {
    avoidNatures: [],
    avoidCategories: ["Tonifying", "Yin Tonifying"],
    tip: "痰濕體質慎用滋膩補益藥，以免助痰生濕，宜酌加健脾化痰之品。",
  },
  "濕熱質": {
    avoidNatures: ["HOT"],
    avoidCategories: ["Interior Warming"],
    tip: "濕熱體質慎用溫熱藥物，以免助熱化火，宜酌加清熱利濕之品。",
  },
  "血瘀質": {
    avoidNatures: [],
    avoidCategories: [],
    tip: "血瘀體質宜配合活血化瘀類藥物（如丹參、川芎），並評估凝血功能。",
  },
  "氣鬱質": {
    avoidNatures: [],
    avoidCategories: [],
    tip: "氣鬱體質宜配合疏肝理氣類藥物（如柴胡、香附），注意情志調攝。",
  },
  "特稟質": {
    avoidNatures: [],
    avoidCategories: [],
    tip: "特稟質（過敏體質）建議先行皮試或從小劑量開始，密切觀察過敏反應。",
  },
  "氣虛質": {
    avoidNatures: ["COLD", "COOL"],
    avoidCategories: ["Heat Clearing"],
    tip: "氣虛體質慎用苦寒清熱藥，以免耗傷正氣，宜配合補氣藥（如黨參、黃芪）。",
  },
  "平和質": {
    avoidNatures: [],
    avoidCategories: [],
    tip: "平和體質體質均衡，一般無特殊禁忌，依病情辨證用藥即可。",
  },
};

function parseDrugs(raw: string[]): { generic: string; display: string }[] {
  const allKeys = Object.keys(DRUG_CYP);
  return raw
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((s) => {
      const match = allKeys.find((k) => s.includes(k) || k.includes(s));
      return match ? { generic: match, display: raw.find((r) => r.toLowerCase().includes(match)) ?? match } : null;
    })
    .filter(Boolean) as { generic: string; display: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const tier = await getCurrentTier();
    if (!tierAtLeast(tier, "professional")) {
      return apiError("需要執業醫師版或以上的訂閱", 403);
    }

    const body = await req.json();
    const formulaId = typeof body.formulaId === "string" ? body.formulaId : null;
    const medications: string[] = Array.isArray(body.medications) ? body.medications.filter((m: unknown) => typeof m === "string") : [];
    const constitutionType: string | null = typeof body.constitutionType === "string" && body.constitutionType ? body.constitutionType : null;

    if (!formulaId) return apiError("缺少 formulaId", 400);

    const formula = await prisma.formula.findUnique({
      where: { id: formulaId },
      include: {
        herbs: {
          include: {
            herb: {
              select: { id: true, chineseName: true, pinyinName: true, latinName: true, nature: true, category: true },
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

    const parsedDrugs = parseDrugs(medications);
    const interactionWarnings = parsedDrugs.length > 0
      ? await predictPkInteractions({ herbs, drugs: parsedDrugs })
      : [];

    // Constitution caution flags
    const rule = constitutionType ? CONSTITUTION_RULES[constitutionType] : null;
    const constitutionFlags: { herbChinese: string; herbPinyin: string; issue: string; severity: "warn" | "info" }[] = [];

    if (rule) {
      for (const fh of formula.herbs) {
        const h = fh.herb;
        if (rule.avoidNatures.includes(h.nature)) {
          constitutionFlags.push({
            herbChinese: h.chineseName,
            herbPinyin: h.pinyinName,
            issue: `藥性${h.nature === "COLD" ? "寒" : h.nature === "COOL" ? "涼" : h.nature === "HOT" ? "熱" : "溫"}，${constitutionType}慎用`,
            severity: "warn",
          });
        } else if (rule.avoidCategories.some((cat) => h.category.includes(cat))) {
          constitutionFlags.push({
            herbChinese: h.chineseName,
            herbPinyin: h.pinyinName,
            issue: `屬${h.category}類，${constitutionType}宜減量或替換`,
            severity: "info",
          });
        }
      }
    }

    const unrecognised = medications
      .map((m) => m.trim())
      .filter((m) => m && !parseDrugs([m]).length);

    return apiOk({
      formulaName: formula.chineseName,
      herbCount: herbs.length,
      interactionWarnings,
      constitutionFlags,
      constitutionTip: rule?.tip ?? null,
      unrecognisedDrugs: unrecognised,
      medicationCount: parsedDrugs.length,
    });
  } catch (e) {
    console.error("[prescribe/personalize]", e);
    return apiError("伺服器錯誤", 500);
  }
}
