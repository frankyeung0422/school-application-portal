import { NextRequest, NextResponse } from "next/server";
import { analyzeHerbList } from "@/lib/diagnose/prescription-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HERBS = 60;

interface SelectionInput {
  herbId?: unknown;
  dosage?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { selections?: SelectionInput[] } | null;
    const raw = Array.isArray(body?.selections) ? body!.selections : [];

    const selections: Array<{ herbId: string; dosage?: string }> = [];
    for (const item of raw) {
      if (typeof item?.herbId !== "string" || item.herbId.length === 0) continue;
      const dosage = typeof item.dosage === "string" && item.dosage.trim().length > 0 ? item.dosage : undefined;
      selections.push({ herbId: item.herbId, dosage });
    }

    if (selections.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No herbs supplied.", reason: "no_herbs_found" },
        { status: 400 },
      );
    }
    if (selections.length > MAX_HERBS) {
      return NextResponse.json(
        { ok: false, error: `Too many herbs (max ${MAX_HERBS}).`, reason: "internal" },
        { status: 400 },
      );
    }

    const result = await analyzeHerbList(selections);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error", reason: "internal" },
      { status: 500 },
    );
  }
}
