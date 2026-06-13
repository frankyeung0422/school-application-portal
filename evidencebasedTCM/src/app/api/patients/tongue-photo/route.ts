import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { requirePractitioner } from "@/lib/patients/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Tongue-photo upload. Files are stored on local disk under
 * `public/uploads/tongue/<practitionerId>/<random>.jpg` and served as
 * `/uploads/tongue/...`. The returned URL is stored on the Consultation
 * record. For multi-instance / cloud deploys, swap this for S3-compatible
 * storage and keep the URL contract the same.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePractitioner();
    const fd = await req.formData();
    const f = fd.get("photo");
    if (!(f instanceof File)) {
      return NextResponse.json({ ok: false, error: "missing_photo" }, { status: 400 });
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
    }
    if (!ALLOWED.includes(f.type as typeof ALLOWED[number])) {
      return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 400 });
    }

    const ext = EXT_BY_MIME[f.type] ?? "bin";
    const baseDir = path.join(process.cwd(), "public", "uploads", "tongue", ctx.userId);
    await mkdir(baseDir, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const fullPath = path.join(baseDir, filename);
    const bytes = Buffer.from(await f.arrayBuffer());
    await writeFile(fullPath, bytes);

    const url = `/uploads/tongue/${ctx.userId}/${filename}`;
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal" },
      { status: 400 },
    );
  }
}
