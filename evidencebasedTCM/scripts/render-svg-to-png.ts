/**
 * Batch-render all FB poster SVGs to 1080×1080 PNG via Playwright headless.
 *
 * Workflow:
 *   1. For each markdown post in facebook-posts/week-N/*.md (N=1..4)
 *      look for a matching SVG in poster-templates/ (by template name)
 *      OR look for a custom rendered SVG at facebook-posts/week-N/rendered/STEM.svg
 *   2. Render each SVG to PNG at 1080×1080 + 2x device scale factor
 *   3. Save to facebook-posts/week-N/rendered/STEM.png
 *
 * Usage:
 *   npx tsx scripts/render-svg-to-png.ts                # all weeks
 *   npx tsx scripts/render-svg-to-png.ts --week=1       # one week
 *   npx tsx scripts/render-svg-to-png.ts --file=path    # one file
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "marketing", "cmarketplan", "facebook-posts");

interface RenderJob {
  svgPath: string;
  pngPath: string;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function discoverJobs(opts: { week?: string; file?: string }): Promise<RenderJob[]> {
  const jobs: RenderJob[] = [];

  if (opts.file) {
    const svgPath = path.resolve(opts.file);
    const stem = path.basename(svgPath, ".svg");
    const renderedDir = path.join(path.dirname(svgPath), "rendered");
    jobs.push({ svgPath, pngPath: path.join(renderedDir, `${stem}.png`) });
    return jobs;
  }

  const weeks = opts.week ? [`week-${opts.week}`] : ["week-1", "week-2", "week-3", "week-4"];

  for (const wk of weeks) {
    const wkDir = path.join(ROOT, wk);
    const renderedSvgDir = path.join(wkDir, "rendered");
    // First check if user has prepared custom rendered SVGs
    try {
      const customs = await fs.readdir(renderedSvgDir);
      for (const f of customs.filter((x) => x.endsWith(".svg"))) {
        const stem = path.basename(f, ".svg");
        jobs.push({
          svgPath: path.join(renderedSvgDir, f),
          pngPath: path.join(renderedSvgDir, `${stem}.png`),
        });
      }
    } catch {
      // No custom rendered SVGs — fall back to templates
    }
  }

  // Also scan AI-generated drafts under generated/YYYY-MM-DD/*.svg, where the
  // SVG sits next to the .md and the PNG should land in `rendered/`.
  if (!opts.week) {
    const genRoot = path.join(ROOT, "generated");
    try {
      const dateDirs = await fs.readdir(genRoot);
      for (const d of dateDirs) {
        const full = path.join(genRoot, d);
        const stat = await fs.stat(full).catch(() => null);
        if (!stat?.isDirectory()) continue;
        const entries = await fs.readdir(full).catch(() => []);
        for (const f of entries.filter((x) => x.endsWith(".svg"))) {
          const stem = path.basename(f, ".svg");
          jobs.push({
            svgPath: path.join(full, f),
            pngPath: path.join(full, "rendered", `${stem}.png`),
          });
        }
      }
    } catch {
      // No generated dir yet
    }
  }
  return jobs;
}

async function renderJob(page: import("playwright").Page, job: RenderJob): Promise<void> {
  await ensureDir(path.dirname(job.pngPath));
  const svgContent = await fs.readFile(job.svgPath, "utf-8");

  // Wrap SVG in a centered HTML page for crisp rendering.
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  svg { display: block; }
</style></head>
<body>${svgContent}</body></html>`;

  await page.setContent(html, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1080, height: 1080 });

  const svgElement = await page.locator("svg").first();
  await svgElement.screenshot({ path: job.pngPath, omitBackground: true });

  console.log(`  ✓ ${path.relative(ROOT, job.pngPath)}`);
}

async function main() {
  const args = new Map(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v ?? "true"];
      }),
  );

  const jobs = await discoverJobs({ week: args.get("week"), file: args.get("file") });
  if (jobs.length === 0) {
    console.log("No SVGs to render.");
    console.log("Place customized SVGs in marketing/cmarketplan/facebook-posts/week-N/rendered/STEM.svg");
    console.log("(or run with --file=path/to/file.svg for a one-off)");
    return;
  }

  console.log(`[render-svg] rendering ${jobs.length} SVG${jobs.length === 1 ? "" : "s"} at 1080×1080…\n`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  try {
    for (const job of jobs) {
      try {
        await renderJob(page, job);
      } catch (err) {
        console.log(`  ✕ ${job.svgPath}: ${err instanceof Error ? err.message : err}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log("\n[render-svg] done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
