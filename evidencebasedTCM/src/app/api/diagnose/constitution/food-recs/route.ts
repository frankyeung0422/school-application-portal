import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

type ConstitutionKey = "ping_he" | "qi_xu" | "yang_xu" | "yin_xu" | "tan_shi" | "shi_re" | "xue_yu" | "qi_yu" | "te_bing";

// Keywords to search in treatmentPrinciple and indication fields
const CONSTITUTION_KEYWORDS: Record<ConstitutionKey, string[]> = {
  ping_he:  ["健脾和胃", "補益", "養生"],
  qi_xu:    ["補氣", "益氣", "健脾補氣", "補脾"],
  yang_xu:  ["溫陽", "補腎陽", "祛寒", "溫中", "溫補"],
  yin_xu:   ["滋陰", "養陰", "潤燥", "清虛熱", "滋腎"],
  tan_shi:  ["化痰", "祛濕", "健脾化濕", "理氣化痰"],
  shi_re:   ["清熱利濕", "清熱解毒", "祛濕清熱", "清熱"],
  xue_yu:   ["活血", "化瘀", "行氣活血", "活血化瘀"],
  qi_yu:    ["疏肝", "理氣解鬱", "行氣", "疏肝理氣"],
  te_bing:  ["固表", "益氣固表", "抗過敏", "補氣固表"],
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") as ConstitutionKey | null;
  if (!type || !(type in CONSTITUTION_KEYWORDS)) {
    return NextResponse.json({ recipes: [] });
  }

  const keywords = CONSTITUTION_KEYWORDS[type];

  // Build OR conditions for treatmentPrinciple and indication
  const orClauses = keywords.flatMap(kw => [
    { treatmentPrinciple: { contains: kw } },
    { indication: { contains: kw } },
  ]);

  try {
    const recipes = await prisma.foodTherapyRecipe.findMany({
      where: {
        status: "PUBLISHED",
        OR: orClauses,
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        chineseName: true,
        pinyinName: true,
        englishName: true,
        category: true,
        season: true,
        treatmentPrinciple: true,
        prepTimeMinutes: true,
        cookTimeMinutes: true,
      },
    });

    // Fallback: if no matches, return latest 4 recipes
    if (recipes.length === 0) {
      const fallback = await prisma.foodTherapyRecipe.findMany({
        where: { status: "PUBLISHED" },
        take: 4,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          chineseName: true,
          pinyinName: true,
          englishName: true,
          category: true,
          season: true,
          treatmentPrinciple: true,
          prepTimeMinutes: true,
          cookTimeMinutes: true,
        },
      });
      return NextResponse.json({ recipes: fallback, fallback: true });
    }

    return NextResponse.json({ recipes });
  } catch {
    return NextResponse.json({ recipes: [] });
  }
}
