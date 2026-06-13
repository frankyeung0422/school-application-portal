/**
 * Admin endpoints for FB scheduler.
 *
 *   GET   /api/admin/fb-scheduler            — list all markdown posts + their schedule status
 *   POST  /api/admin/fb-scheduler            — body: { action: "verify" | "schedule" | "schedule_batch", ... }
 *
 * Auth: ADMIN role required.
 */
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/authOptions";
import { fbConfigured, verifyToken, publish } from "@/lib/facebook/client";
import { parsePostFile } from "@/lib/facebook/parse-post";
import { pickTopic, generatePost, writePostFile } from "@/lib/facebook/generate-post";
import { renderPosterFor, rasterizePoster } from "@/lib/facebook/generate-poster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return { ok: false, status: 403, error: "admin_required" };
  }
  return { ok: true };
}

const FB_ROOT = path.join(process.cwd(), "marketing", "cmarketplan", "facebook-posts");

interface PostListing {
  sourceFile: string;
  title: string;
  week: number;
  day: string;
  source: "handwritten" | "generated";
  body: string;
  bodyExcerpt: string;
  firstComment: string | null;
  imageExists: boolean;
  imagePath: string | null;
  status: string;
  scheduledFor: string | null;
  fbPostId: string | null;
  fbPermalink: string | null;
  errorMessage: string | null;
}

interface ListErrors {
  file: string;
  error: string;
}

async function scanFolder(
  folder: string,
  week: number,
  source: "handwritten" | "generated",
  errors: ListErrors[],
): Promise<PostListing[]> {
  const out: PostListing[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(folder);
  } catch {
    return out;
  }
  for (const entry of entries.sort()) {
    if (!entry.endsWith(".md")) continue;
    const absPath = path.join(folder, entry);
    const relPath = path.relative(process.cwd(), absPath).replace(/\\/g, "/");
    try {
      const parsed = await parsePostFile(absPath);
      const stem = path.basename(entry, ".md");
      const pngPath = path.join(folder, "rendered", `${stem}.png`);
      let imageExists = false;
      try { await fs.access(pngPath); imageExists = true; } catch { /* */ }

      const row = await prisma.facebookScheduledPost.findFirst({
        where: { sourceFile: relPath },
        orderBy: { createdAt: "desc" },
      });
      out.push({
        sourceFile: relPath,
        title: parsed.title,
        week,
        day: stem.split("-").slice(1, 2).join(""),
        source,
        body: parsed.body,
        bodyExcerpt: parsed.body.slice(0, 120).replace(/\n/g, " "),
        firstComment: parsed.firstComment,
        imageExists,
        imagePath: imageExists ? path.relative(process.cwd(), pngPath).replace(/\\/g, "/") : null,
        status: row?.status ?? "DRAFT",
        scheduledFor: row?.scheduledFor?.toISOString() ?? null,
        fbPostId: row?.fbPostId ?? null,
        fbPermalink: row?.fbPermalink ?? null,
        errorMessage: row?.errorMessage ?? null,
      });
    } catch (e) {
      errors.push({ file: relPath, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return out;
}

async function listAllMarkdown(): Promise<{ posts: PostListing[]; errors: ListErrors[] }> {
  const posts: PostListing[] = [];
  const errors: ListErrors[] = [];
  for (let w = 1; w <= 4; w++) {
    posts.push(...(await scanFolder(path.join(FB_ROOT, `week-${w}`), w, "handwritten", errors)));
  }
  // Scan AI-generated drafts in generated/YYYY-MM-DD/* — bucket each under
  // week 5 ("generated") so the existing week filter still works without
  // changes. Day stem is the same convention (NN-day-slug.md).
  const genRoot = path.join(FB_ROOT, "generated");
  try {
    const dateDirs = await fs.readdir(genRoot);
    for (const d of dateDirs.sort()) {
      const full = path.join(genRoot, d);
      const stat = await fs.stat(full).catch(() => null);
      if (!stat?.isDirectory()) continue;
      posts.push(...(await scanFolder(full, 5, "generated", errors)));
    }
  } catch { /* no generated dir yet */ }
  return { posts, errors };
}

export async function GET() {
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  const { posts, errors } = await listAllMarkdown();
  return NextResponse.json({
    ok: true,
    fbConfigured: fbConfigured(),
    posts,
    parseErrors: errors,
  });
}

interface ActionBody {
  action?:
    | "verify"
    | "schedule_one"
    | "publish_now"
    | "generate"
    | "import_pubmed"
    | "pubmed_status";
  sourceFile?: string;
  scheduledFor?: string;
  /** For generate: how many drafts to create in one call (1–5). */
  count?: number;
  /** For generate: skip poster rasterization (useful if Playwright is slow). */
  skipPoster?: boolean;
  /** For import_pubmed: cap on inserts in this run (default 20, max 200). */
  max?: number;
}

const PUBMED_LOG = path.join(process.cwd(), "logs", "pubmed-import.log");
const PUBMED_LOCK = path.join(process.cwd(), "logs", ".pubmed-import.pid");

export async function POST(req: NextRequest) {
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.action === "generate") {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "openai_not_configured", message: "Set OPENAI_API_KEY in .env" }, { status: 400 });
    }
    const count = Math.max(1, Math.min(body.count ?? 1, 5));
    const generated: Array<{ sourceFile: string; title: string; topicKind: string; refKey: string; templateUsed: string; rasterized: boolean; rasterError?: string }> = [];
    const failures: Array<{ stage: string; error: string }> = [];
    for (let i = 0; i < count; i++) {
      let topic: Awaited<ReturnType<typeof pickTopic>>;
      try {
        topic = await pickTopic();
      } catch (e) {
        failures.push({ stage: "pickTopic", error: e instanceof Error ? e.message : String(e) });
        break;
      }
      if (!topic) {
        failures.push({ stage: "pickTopic", error: "no_unused_topic_left" });
        break;
      }
      try {
        const post = await generatePost(topic);
        const filePath = await writePostFile(post);
        const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
        let rasterized = false;
        let rasterError: string | undefined;
        let templateUsed = topic.suggestedTemplate;
        try {
          const poster = await renderPosterFor(post, filePath);
          templateUsed = poster.templateUsed;
          if (!body.skipPoster) {
            await rasterizePoster(poster.svgPath);
            rasterized = true;
          }
        } catch (e) {
          rasterError = e instanceof Error ? e.message : String(e);
        }
        generated.push({
          sourceFile: relPath,
          title: post.title,
          topicKind: topic.kind,
          refKey: topic.refKey,
          templateUsed,
          rasterized,
          rasterError,
        });
      } catch (e) {
        failures.push({ stage: "generate", error: e instanceof Error ? e.message : String(e) });
      }
    }
    return NextResponse.json({ ok: generated.length > 0, generated, failures });
  }

  if (body.action === "import_pubmed") {
    // Idempotency: only allow one run at a time. The lock file holds the PID
    // and the start timestamp; we treat the lock as stale if older than 30 min.
    try {
      const lockStat = await fs.stat(PUBMED_LOCK);
      const ageMs = Date.now() - lockStat.mtimeMs;
      if (ageMs < 30 * 60 * 1000) {
        return NextResponse.json({
          ok: false,
          error: "already_running",
          message: "PubMed import already in progress — wait for it to finish or check logs/pubmed-import.log",
        }, { status: 409 });
      }
    } catch { /* no lock — proceed */ }

    if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        ok: false,
        error: "no_grading_key",
        message: "Set OPENAI_API_KEY or ANTHROPIC_API_KEY for paper grading",
      }, { status: 400 });
    }

    const max = Math.max(1, Math.min(body.max ?? 20, 200));
    await fs.mkdir(path.dirname(PUBMED_LOG), { recursive: true });

    const { spawn } = await import("node:child_process");
    const isWin = process.platform === "win32";
    const logStream = await fs.open(PUBMED_LOG, "w");
    const child = spawn(
      isWin ? "npx.cmd" : "npx",
      ["tsx", "scripts/import-pubmed-evidence.ts", "--apply", `--max=${max}`],
      {
        cwd: process.cwd(),
        stdio: ["ignore", logStream.fd, logStream.fd],
        shell: isWin,
        detached: true,
      },
    );
    child.unref();
    await logStream.close();
    await fs.writeFile(PUBMED_LOCK, `${child.pid ?? ""}\n${Date.now()}\n`, "utf-8");

    return NextResponse.json({
      ok: true,
      message: `PubMed import started (cap ${max}). Check back in ~5-10 min. Tail logs/pubmed-import.log for progress.`,
      pid: child.pid,
    });
  }

  if (body.action === "pubmed_status") {
    let running = false;
    try {
      const lockStat = await fs.stat(PUBMED_LOCK);
      running = Date.now() - lockStat.mtimeMs < 30 * 60 * 1000;
    } catch { /* no lock */ }

    let logTail = "";
    try {
      const raw = await fs.readFile(PUBMED_LOG, "utf-8");
      const lines = raw.split(/\r?\n/);
      logTail = lines.slice(-30).join("\n");
      // Lock file is auto-cleared when the script's DONE line appears.
      if (running && /\[pubmed-import\] DONE/.test(raw)) {
        running = false;
        await fs.unlink(PUBMED_LOCK).catch(() => {});
      }
    } catch { /* no log yet */ }

    const evidenceCount = await prisma.evidenceEntry.count();
    return NextResponse.json({ ok: true, running, evidenceCount, logTail });
  }

  if (body.action === "verify") {
    if (!fbConfigured()) {
      return NextResponse.json({ ok: false, error: "not_configured", message: "Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env" }, { status: 400 });
    }
    const r = await verifyToken();
    return NextResponse.json(r);
  }

  if (body.action === "schedule_one" || body.action === "publish_now") {
    if (!fbConfigured()) {
      return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
    }
    const src = body.sourceFile;
    if (!src) return NextResponse.json({ ok: false, error: "source_file_required" }, { status: 400 });

    // Safety: only allow files under marketing/cmarketplan/facebook-posts/
    const abs = path.resolve(process.cwd(), src);
    if (!abs.startsWith(FB_ROOT)) {
      return NextResponse.json({ ok: false, error: "path_outside_facebook_posts" }, { status: 400 });
    }
    try {
      await fs.access(abs);
    } catch {
      return NextResponse.json({ ok: false, error: "file_not_found" }, { status: 404 });
    }

    const parsed = await parsePostFile(abs);
    const stem = path.basename(abs, ".md");
    const pngPath = path.join(path.dirname(abs), "rendered", `${stem}.png`);
    let imagePath: string | null = null;
    try {
      await fs.access(pngPath);
      imagePath = pngPath;
    } catch {
      /* no image */
    }

    const scheduledFor = body.action === "schedule_one" && body.scheduledFor
      ? new Date(body.scheduledFor)
      : undefined;
    if (scheduledFor && (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now() + 10 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "schedule_too_soon", message: "FB requires schedules at least 10 minutes in the future" }, { status: 400 });
    }

    const relPath = path.relative(process.cwd(), abs).replace(/\\/g, "/");
    const row = await prisma.facebookScheduledPost.create({
      data: {
        sourceFile: relPath,
        title: parsed.title.slice(0, 200),
        body: parsed.body,
        imagePath,
        scheduledFor,
        status: "DRAFT",
      },
    });

    const result = await publish({
      message: parsed.body,
      imagePath: imagePath ?? undefined,
      scheduledFor,
      firstCommentLink: parsed.firstComment ?? undefined,
    });

    if (!result.ok) {
      await prisma.facebookScheduledPost.update({
        where: { id: row.id },
        data: { status: "FAILED", errorMessage: result.error ?? "unknown" },
      });
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    await prisma.facebookScheduledPost.update({
      where: { id: row.id },
      data: {
        status: scheduledFor ? "SCHEDULED" : "PUBLISHED",
        fbPostId: result.fbPostId,
        fbPermalink: result.fbPermalink,
        publishedAt: scheduledFor ? null : new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      fbPostId: result.fbPostId,
      fbPermalink: result.fbPermalink,
      scheduledFor: scheduledFor?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
}
