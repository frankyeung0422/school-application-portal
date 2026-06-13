/**
 * POST /api/diagnose/reason — RAG-grounded syndrome differentiation.
 * Body: { symptomsText, tongueBody?, tongueCoat?, pulse? }
 * Returns the LLM differential reasoning grounded in retrieved patterns.
 */
import { NextRequest, NextResponse } from "next/server";
import { reasonSyndrome } from "@/lib/diagnose/reason";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const symptomsText = typeof body.symptomsText === "string" ? body.symptomsText.slice(0, 2000) : "";
  if (symptomsText.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "symptoms_required" }, { status: 400 });
  }

  const result = await reasonSyndrome({
    symptomsText,
    tongueBody: typeof body.tongueBody === "string" ? body.tongueBody.slice(0, 200) : null,
    tongueCoat: typeof body.tongueCoat === "string" ? body.tongueCoat.slice(0, 200) : null,
    pulse: typeof body.pulse === "string" ? body.pulse.slice(0, 200) : null,
  });

  if (!result) {
    return NextResponse.json({ ok: false, error: "no_result", reason: "no LLM key, or no matching patterns" }, { status: 200 });
  }
  return NextResponse.json({ ok: true, ...result });
}
