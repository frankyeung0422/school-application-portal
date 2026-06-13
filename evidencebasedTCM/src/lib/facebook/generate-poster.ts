/**
 * Fill an SVG poster template with text from a generated post, then write
 * the customized SVG so render-svg-to-png.ts can rasterize it.
 *
 * Templates use `<!-- EDIT: PLACEHOLDER_NAME -->default text` markers immediately
 * before the visible text inside each <text> element. We string-replace those
 * default values with the LLM-provided fields.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { chat } from "./openai";
import type { GeneratedPost } from "./generate-post";

const FB_ROOT = path.join(process.cwd(), "marketing", "cmarketplan", "facebook-posts");
const TEMPLATE_DIR = path.join(FB_ROOT, "poster-templates");

/**
 * Map a placeholder name → fill value. Reads the template file, extracts all
 * placeholder names, fills the ones we have direct values for, and asks the
 * LLM to fill the remaining ones based on the post body.
 */
async function buildFillMap(
  templateText: string,
  post: GeneratedPost,
): Promise<Record<string, string>> {
  const placeholders = new Set<string>();
  const re = /<!--\s*EDIT:\s*([A-Z][A-Z0-9 ]*?)\s*-->/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(templateText)) !== null) {
    placeholders.add(m[1].trim());
  }

  const direct: Record<string, string> = {
    "SMALL LABEL": post.poster.smallLabel,
    "LINE 1": post.poster.line1,
    "LINE 2": post.poster.line2,
    "SUB LINE 1": post.poster.subLine1,
    "SUB LINE 2": post.poster.subLine2,
    "CTA LINE 1": post.poster.ctaLine1,
    CTA: post.poster.ctaLine1,
    URL: post.poster.url,
    BRAND: "實證中醫 EBTCM · 707 條 GRADE 評級證據",
    "TOP LABEL": post.poster.smallLabel,
  };

  const fill: Record<string, string> = {};
  const remaining: string[] = [];
  for (const name of placeholders) {
    if (direct[name]) fill[name] = direct[name];
    else remaining.push(name);
  }

  if (remaining.length > 0) {
    const askPrompt = `海報模板還有以下空位需要填寫（請根據貼文內文擬定簡短文字，每欄 ≤16 字）。回傳嚴格 JSON，key 為欄位名稱。

貼文標題：${post.title}
貼文內文：
${post.body}

需要填寫的欄位：
${remaining.map((n) => `- ${n}`).join("\n")}`;

    try {
      const raw = await chat({
        messages: [
          {
            role: "system",
            content:
              "你是海報文案編輯。給定貼文與欄位清單，回傳 JSON {欄位名: 填寫文字}。每欄 ≤16 字繁中。",
          },
          { role: "user", content: askPrompt },
        ],
        responseFormat: "json_object",
        temperature: 0.7,
        maxTokens: 600,
      });
      const extra = JSON.parse(raw) as Record<string, string>;
      for (const k of remaining) {
        if (typeof extra[k] === "string" && extra[k].trim()) {
          fill[k] = extra[k].trim();
        }
      }
    } catch {
      // Best effort — leave unfilled slots showing template defaults.
    }
  }
  return fill;
}

/**
 * Replace `<!-- EDIT: NAME -->oldText` (followed by the visible text on the
 * same logical line, up to `<` or end-of-line) with the fill value.
 */
function applyFills(svg: string, fill: Record<string, string>): string {
  let out = svg;
  for (const [name, value] of Object.entries(fill)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match "<!-- EDIT: NAME -->" (possibly with trailing spaces) followed
    // by any chars up to the next "<". The text content is what we replace.
    const re = new RegExp(`(<!--\\s*EDIT:\\s*${escaped}\\s*-->)[^<]*`, "g");
    out = out.replace(re, `$1${escapeXmlText(value)}`);
  }
  return out;
}

function escapeXmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface RenderedPoster {
  templateUsed: string;
  svgPath: string;
  pngPath: string;
}

/**
 * Build the filled SVG for a generated post and write it into the same
 * folder as the post's .md, under `rendered/STEM.svg`. PNG path is computed
 * but the actual rasterization is left to render-svg-to-png.ts.
 */
export async function renderPosterFor(
  post: GeneratedPost,
  postMdPath: string,
): Promise<RenderedPoster> {
  const templateName = post.topic.suggestedTemplate;
  const templatePath = path.join(TEMPLATE_DIR, templateName);
  const templateText = await fs.readFile(templatePath, "utf-8");

  const fill = await buildFillMap(templateText, post);
  const filled = applyFills(templateText, fill);

  const stem = path.basename(postMdPath, ".md");
  // Write the filled SVG next to the .md, so that running
  // `render-svg-to-png.ts --file=…/STEM.svg` puts the PNG at
  // `<post-dir>/rendered/STEM.png` — the same location the list API checks.
  const postDir = path.dirname(postMdPath);
  const svgPath = path.join(postDir, `${stem}.svg`);
  const pngPath = path.join(postDir, "rendered", `${stem}.png`);
  await fs.writeFile(svgPath, filled, "utf-8");

  return { templateUsed: templateName, svgPath, pngPath };
}

/**
 * Trigger Playwright to rasterize the just-written SVG → PNG. Imported from
 * scripts/render-svg-to-png.ts would be heavy; we shell out to the same
 * script with --file= so the rasterization path stays single-source.
 */
export async function rasterizePoster(svgPath: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = spawn(
      isWin ? "npx.cmd" : "npx",
      ["tsx", "scripts/render-svg-to-png.ts", `--file=${svgPath}`],
      { cwd: process.cwd(), stdio: "pipe", shell: isWin },
    );
    let stderr = "";
    child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    child.on("close", (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`render-svg-to-png exited ${code}: ${stderr.slice(0, 400)}`));
    });
    child.on("error", reject);
  });
}
