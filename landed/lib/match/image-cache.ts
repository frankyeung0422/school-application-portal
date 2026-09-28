import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { InlineImage } from "../gemini";

const CACHE_DIR = path.join(process.cwd(), ".cache", "images");
const MAX_DIM = 512;

/**
 * Fetch a product image, downscale to <=512px JPEG (token control), cache on
 * disk by sha1(url). Returns null on any failure — the judge degrades to
 * text-only.
 */
export async function getImageForGemini(
  url: string | null | undefined,
): Promise<InlineImage | null> {
  if (!url) return null;
  try {
    const key = createHash("sha1").update(url).digest("hex");
    const file = path.join(CACHE_DIR, `${key}.jpg`);
    try {
      const cached = await readFile(file);
      return { mimeType: "image/jpeg", data: cached.toString("base64") };
    } catch {
      // cache miss
    }
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const jpeg = await sharp(buf)
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(file, jpeg);
    return { mimeType: "image/jpeg", data: jpeg.toString("base64") };
  } catch {
    return null;
  }
}
