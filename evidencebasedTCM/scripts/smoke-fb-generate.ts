/**
 * Smoke test: pick a topic from the TCM KB, generate one FB post via OpenAI,
 * write the .md file, fill the SVG poster, optionally rasterize.
 *
 *   npx tsx scripts/smoke-fb-generate.ts            # generate + write + fill SVG (no rasterize)
 *   npx tsx scripts/smoke-fb-generate.ts --raster   # full pipeline including PNG
 */
import "dotenv/config";
import { pickTopic, generatePost, writePostFile } from "@/lib/facebook/generate-post";
import { renderPosterFor, rasterizePoster } from "@/lib/facebook/generate-poster";

async function main() {
  const wantRaster = process.argv.includes("--raster");

  console.log("Picking topic from KB…");
  const topic = await pickTopic();
  if (!topic) {
    console.error("No topic available (all used or KB empty)");
    process.exit(1);
  }
  console.log("  kind:", topic.kind);
  console.log("  headline:", topic.headline);
  console.log("  refKey:", topic.refKey);
  console.log("  template:", topic.suggestedTemplate);

  console.log("\nCalling OpenAI to generate post…");
  const post = await generatePost(topic);
  console.log("  title:", post.title);
  console.log("  body len:", post.body.length);
  console.log("  body excerpt:", post.body.slice(0, 80).replace(/\n/g, " "));

  console.log("\nWriting markdown…");
  const filePath = await writePostFile(post);
  console.log("  ->", filePath);

  console.log("\nFilling SVG poster…");
  const poster = await renderPosterFor(post, filePath);
  console.log("  ->", poster.svgPath);

  if (wantRaster) {
    console.log("\nRasterizing to PNG (Playwright)…");
    await rasterizePoster(poster.svgPath);
    console.log("  ->", poster.pngPath);
  } else {
    console.log("\nSkipping rasterize (pass --raster to enable)");
  }

  console.log("\nDONE");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
