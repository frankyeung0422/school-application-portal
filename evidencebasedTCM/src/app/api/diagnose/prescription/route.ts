import { NextRequest, NextResponse } from "next/server";
import { analyzePrescriptionImage } from "@/lib/diagnose/prescription-analyzer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing 'image' file in form data.", reason: "internal" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: `Image too large (max ${MAX_BYTES / 1024 / 1024} MB).`, reason: "internal" }, { status: 400 });
    }
    if (!ALLOWED_MIMES.includes(file.type as typeof ALLOWED_MIMES[number])) {
      return NextResponse.json({ ok: false, error: `Unsupported image type: ${file.type}.`, reason: "internal" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await analyzePrescriptionImage(base64, file.type as typeof ALLOWED_MIMES[number]);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error", reason: "internal" },
      { status: 500 },
    );
  }
}
