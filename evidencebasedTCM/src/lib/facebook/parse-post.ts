/**
 * Parse one of our zh-Hant FB post markdown files into structured fields.
 *
 * Expected structure (loose):
 *   # Title (h1)
 *   ## 貼文內文      → main message
 *   ## 第一則留言    → first-comment link
 *   ## 海報文字...   → ignored (for poster designers)
 *   ## 發文後動作    → ignored (post-publish todo)
 *
 * The parser is intentionally lenient — missing sections are OK.
 */

import fs from "node:fs/promises";
import path from "node:path";

export interface ParsedPost {
  sourcePath: string;
  title: string;
  body: string;
  firstComment: string | null;
  /** Suggested image path: same dir, same stem, .png extension */
  suggestedImagePath: string;
}

function extractSection(content: string, headingPattern: RegExp): string | null {
  // Match "## Heading\n...\n(## Next heading | EOF)".
  // The (?:...) around the alternation matters — without it `|` would split
  // the entire outer regex and only match the heading line.
  // JS regex has no \Z; use a negative lookahead for end-of-string instead.
  const re = new RegExp(
    `^##\\s*(?:${headingPattern.source})\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`,
    "m",
  );
  const match = content.match(re);
  if (!match) return null;
  return match[1].trim();
}

export async function parsePostFile(filePath: string): Promise<ParsedPost> {
  const content = await fs.readFile(filePath, "utf-8");

  // Title: first h1
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md");

  // Body: section under "## 貼文內文" or "## Post body"
  const bodyRaw = extractSection(content, /貼文內文|Post body/);
  if (!bodyRaw) {
    throw new Error(`Cannot find "## 貼文內文" section in ${filePath}`);
  }

  // First comment: section under "## 第一則留言" — strip header bullets like "**Goal**: ..."
  const firstCommentRaw = extractSection(content, /第一則留言|First comment/);
  const firstComment = firstCommentRaw
    ? firstCommentRaw
        .split("\n")
        .filter((l) => !l.startsWith("**") && l.trim().length > 0)
        .join("\n")
        .trim()
    : null;

  // Suggested image: same dir + same stem + .png
  const dir = path.dirname(filePath);
  const stem = path.basename(filePath, ".md");
  const suggestedImagePath = path.join(dir, "rendered", `${stem}.png`);

  return {
    sourcePath: filePath,
    title,
    body: bodyRaw,
    firstComment,
    suggestedImagePath,
  };
}

/**
 * Scan the marketing/cmarketplan/facebook-posts/ folder and return all 24 posts.
 */
export async function loadAllPosts(rootDir: string): Promise<ParsedPost[]> {
  const posts: ParsedPost[] = [];
  const weekDirs = ["week-1", "week-2", "week-3", "week-4"];
  for (const wk of weekDirs) {
    const wkPath = path.join(rootDir, wk);
    try {
      const entries = await fs.readdir(wkPath);
      for (const entry of entries.sort()) {
        if (!entry.endsWith(".md")) continue;
        try {
          const parsed = await parsePostFile(path.join(wkPath, entry));
          posts.push(parsed);
        } catch (err) {
          // skip bad files but log
          console.warn(`Skipping ${entry}: ${err instanceof Error ? err.message : err}`);
        }
      }
    } catch {
      // week dir doesn't exist; skip
    }
  }
  return posts;
}
