import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

// PWA icons from app/icon.svg (no text in the SVG: server fonts cannot be assumed).
// Re-run after changing the SVG: npx tsx scripts/make-icons.ts
async function main() {
  const svg = await readFile(path.join(process.cwd(), "app", "icon.svg"));
  for (const size of [192, 512]) {
    await sharp(svg, { density: 300 }).resize(size, size).png().toFile(path.join(process.cwd(), "public", "icons", `icon-${size}.png`));
  }
  // Maskable: the platform crops to a circle/squircle, so keep the mark inside the 80% safe zone.
  const inner = await sharp(svg, { density: 300 }).resize(410, 410).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#047857" } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toFile(path.join(process.cwd(), "public", "icons", "maskable-512.png"));
  console.log("icons written to public/icons");
}
main();
