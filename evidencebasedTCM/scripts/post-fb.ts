/**
 * Post a FB markdown file to the Page — immediately or scheduled.
 *
 * Usage:
 *   npx tsx scripts/post-fb.ts <path-to-md>                          # post now (dry-run by default)
 *   npx tsx scripts/post-fb.ts <path-to-md> --apply                  # actually post
 *   npx tsx scripts/post-fb.ts <path-to-md> --apply --schedule="2026-05-19 09:00"  # schedule
 *   npx tsx scripts/post-fb.ts --verify                              # just check token + Page identity
 *   npx tsx scripts/post-fb.ts --batch=week-1 --apply --start="2026-05-19" # schedule entire week
 *
 * Image: looks for a sibling rendered PNG at  {dir}/rendered/{stem}.png
 *        Falls back to text-only post if not found.
 *
 * All sends are logged to the FacebookScheduledPost table.
 */
import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { publish, verifyToken, fbConfigured } from "../src/lib/facebook/client";
import { parsePostFile, loadAllPosts } from "../src/lib/facebook/parse-post";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ROOT = path.join(process.cwd(), "marketing", "cmarketplan", "facebook-posts");

interface ParsedArgs {
  file?: string;
  apply: boolean;
  verify: boolean;
  schedule?: Date;
  batch?: string;
  startDate?: Date;
}

function parseArgs(): ParsedArgs {
  const args: ParsedArgs = { apply: false, verify: false };
  const positional: string[] = [];
  for (const raw of process.argv.slice(2)) {
    if (raw === "--apply") args.apply = true;
    else if (raw === "--verify") args.verify = true;
    else if (raw.startsWith("--schedule=")) args.schedule = new Date(raw.split("=")[1]);
    else if (raw.startsWith("--batch=")) args.batch = raw.split("=")[1];
    else if (raw.startsWith("--start=")) args.startDate = new Date(raw.split("=")[1]);
    else if (!raw.startsWith("--")) positional.push(raw);
  }
  args.file = positional[0];
  return args;
}

async function imagePathFor(mdPath: string): Promise<string | null> {
  const dir = path.dirname(mdPath);
  const stem = path.basename(mdPath, ".md");
  const png = path.join(dir, "rendered", `${stem}.png`);
  try {
    await fs.access(png);
    return png;
  } catch {
    return null;
  }
}

/**
 * Default posting times per the README schedule:
 *   Mon 09:00, Tue 17:00, Wed 20:00, Thu 19:30, Fri 12:30, Sat 10:00
 * Used when batch-scheduling a whole week.
 */
const DEFAULT_TIMES_HK: Record<string, [number, number]> = {
  "01-mon": [9, 0],
  "02-tue": [17, 0],
  "03-wed": [20, 0],
  "04-thu": [19, 30],
  "05-fri": [12, 30],
  "06-sat": [10, 0],
};

function inferScheduleHK(fileName: string, startDate: Date, offsetDays: number): Date {
  const stem = path.basename(fileName, ".md").toLowerCase();
  const dayKey = Object.keys(DEFAULT_TIMES_HK).find((k) => stem.startsWith(k));
  const [hour, minute] = dayKey ? DEFAULT_TIMES_HK[dayKey] : [9, 0];

  const target = new Date(startDate);
  target.setDate(target.getDate() + offsetDays);
  // Build a HKT (UTC+8) timestamp from the local target date.
  // Subtract 8h from UTC to get the moment that equals "HKT hour:minute".
  const utcHour = hour - 8;
  target.setUTCHours(utcHour, minute, 0, 0);
  return target;
}

async function postOne(mdPath: string, scheduledFor: Date | undefined, apply: boolean): Promise<void> {
  const parsed = await parsePostFile(mdPath);
  const imagePath = await imagePathFor(mdPath);
  const relPath = path.relative(process.cwd(), mdPath);

  console.log(`\n── ${parsed.title}`);
  console.log(`   source: ${relPath}`);
  console.log(`   image:  ${imagePath ? path.relative(process.cwd(), imagePath) : "(text-only — no PNG found)"}`);
  console.log(`   when:   ${scheduledFor ? scheduledFor.toISOString() : "NOW"}`);
  console.log(`   body:   ${parsed.body.slice(0, 80).replace(/\n/g, " ")}…`);
  if (parsed.firstComment) {
    console.log(`   1st-comment: ${parsed.firstComment.slice(0, 80).replace(/\n/g, " ")}…`);
  }

  if (!apply) {
    console.log(`   [dry-run] add --apply to actually post`);
    return;
  }

  // Persist before sending
  const row = await prisma.facebookScheduledPost.create({
    data: {
      sourceFile: relPath,
      title: parsed.title.slice(0, 200),
      body: parsed.body,
      imagePath: imagePath,
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
    console.log(`   ✕ FAILED: ${result.error}`);
    return;
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
  console.log(`   ✓ ${scheduledFor ? "SCHEDULED" : "PUBLISHED"} — fb_post_id=${result.fbPostId}`);
  if (result.fbPermalink) console.log(`     ${result.fbPermalink}`);
}

async function main() {
  const args = parseArgs();

  if (args.verify) {
    if (!fbConfigured()) {
      console.error("✕ FB not configured. Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env.");
      process.exit(2);
    }
    console.log("[verify] checking token + Page identity…");
    const r = await verifyToken();
    if (!r.ok) {
      console.error(`✕ ${r.error}`);
      process.exit(1);
    }
    console.log(`✅ Page: ${r.pageName}`);
    return;
  }

  if (!fbConfigured() && args.apply) {
    console.error("✕ FB not configured. Set FB_PAGE_ID + FB_PAGE_ACCESS_TOKEN in .env.");
    console.error("  See marketing/cmarketplan/facebook-posts/SETUP-FB-AUTOMATION.md");
    process.exit(2);
  }

  // Batch mode — schedule an entire week
  if (args.batch) {
    const start = args.startDate ?? new Date();
    const wkDir = path.join(ROOT, args.batch);
    let entries: string[];
    try {
      entries = (await fs.readdir(wkDir)).filter((f) => f.endsWith(".md")).sort();
    } catch {
      console.error(`✕ ${wkDir} not found`);
      process.exit(1);
    }
    console.log(`[batch] ${args.batch} — ${entries.length} posts starting ${start.toISOString().slice(0, 10)}`);
    for (let i = 0; i < entries.length; i++) {
      const when = inferScheduleHK(entries[i], start, i);
      await postOne(path.join(wkDir, entries[i]), when, args.apply);
    }
    await prisma.$disconnect();
    return;
  }

  if (!args.file) {
    console.error("Usage: npx tsx scripts/post-fb.ts <path-to-md> [--apply] [--schedule='YYYY-MM-DD HH:mm']");
    console.error("  or:  npx tsx scripts/post-fb.ts --batch=week-1 --apply --start='YYYY-MM-DD'");
    console.error("  or:  npx tsx scripts/post-fb.ts --verify");
    process.exit(2);
  }

  await postOne(path.resolve(args.file), args.schedule, args.apply);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
