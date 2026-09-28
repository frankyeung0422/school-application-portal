import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../prisma";
import { UserFacingError } from "../errors";
import { looksImplausible, overDailyLimit, validateReport, type ReportInput } from "./validate";

// Shopper-reported in-store prices: submit → pending → a human approves → shown.
// Photos are stored outside /public and served through an API route, so an
// upload can never be executed or served as anything but an image.

export class ReportError extends UserFacingError {}

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function reporterKeyOf(sessionId: string | null, ip: string | null): string {
  return createHash("sha256").update(`${sessionId ?? ""}|${ip ?? ""}`).digest("hex").slice(0, 32);
}

export async function submitReport(
  input: ReportInput & { photoBytes?: ArrayBuffer | null; reporterKey: string },
): Promise<{ id: number; status: string; flagged: string | null }> {
  const check = validateReport(input);
  if (!check.ok) throw new ReportError(check.errors.join(" · "));

  const since = new Date(Date.now() - 86400_000);
  const countToday = await prisma.storePriceReport.count({ where: { reporterKey: input.reporterKey, createdAt: { gte: since } } });
  if (overDailyLimit(countToday)) throw new ReportError("今日報價次數已達上限 Daily report limit reached");

  let photoPath: string | null = null;
  if (input.photo && input.photoBytes) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const name = `${randomUUID()}.${EXT[input.photo.type] ?? "jpg"}`;
    await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(input.photoBytes));
    photoPath = name;
  }

  // Compare against the chain's own online price when we have one, so the
  // reviewer sees "40% below Wellcome's online price" instead of a bare number.
  let onlineCents: number | null = null;
  if (input.productId) {
    const offer = await prisma.offer.findFirst({ where: { productId: input.productId, platform: input.retailer } });
    onlineCents = offer ? Math.round(offer.latestPrice * 100) : null;
  }
  const flagged = looksImplausible(input.priceCents, onlineCents);

  const row = await prisma.storePriceReport.create({
    data: {
      productId: input.productId ?? null,
      itemName: input.itemName?.trim() || null,
      retailer: input.retailer,
      branch: input.branch?.trim() || null,
      priceCents: input.priceCents,
      photoPath,
      note: [input.note?.trim(), flagged].filter(Boolean).join(" · ") || null,
      seenAt: input.seenAt,
      reporterEmail: input.reporterEmail?.trim() || null,
      reporterKey: input.reporterKey,
    },
  });
  return { id: row.id, status: row.status, flagged };
}

export async function approvedReportsFor(productId: number, days = 30) {
  return prisma.storePriceReport.findMany({
    where: { productId, status: "APPROVED", seenAt: { gte: new Date(Date.now() - days * 86400_000) } },
    orderBy: { seenAt: "desc" },
    take: 12,
  });
}

export async function approvedReportsByRetailer(retailer?: string, days = 30) {
  return prisma.storePriceReport.findMany({
    where: {
      status: "APPROVED",
      ...(retailer ? { retailer } : {}),
      seenAt: { gte: new Date(Date.now() - days * 86400_000) },
    },
    include: { product: { select: { title: true, slug: true } } },
    orderBy: { seenAt: "desc" },
    take: 100,
  });
}

export async function pendingReports() {
  return prisma.storePriceReport.findMany({
    where: { status: "PENDING" },
    include: { product: { select: { id: true, title: true, slug: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export async function reviewReport(id: number, decision: "APPROVED" | "REJECTED", actor: string, reason?: string) {
  return prisma.storePriceReport.update({
    where: { id },
    data: { status: decision, reviewedBy: actor, reviewedAt: new Date(), rejectedReason: decision === "REJECTED" ? (reason ?? "not verifiable") : null },
  });
}

export async function readPhoto(name: string): Promise<{ bytes: Buffer; type: string } | null> {
  // Name comes from the database, but never trust it as a path.
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(name)) return null;
  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split(".").pop();
    return { bytes, type: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
  } catch {
    return null;
  }
}

/** This calendar month's top reporters (HK time), approved reports only. */
export async function monthlyLeaderboard(now = new Date()) {
  const { leaderboard } = await import("./leaderboard");
  const hk = new Date(now.getTime() + 8 * 3600_000);
  const monthStart = new Date(Date.UTC(hk.getUTCFullYear(), hk.getUTCMonth(), 1) - 8 * 3600_000);
  const rows = await prisma.storePriceReport.findMany({
    where: { status: "APPROVED", createdAt: { gte: monthStart } },
    select: { reporterKey: true, reporterEmail: true },
  });
  return { entries: leaderboard(rows), total: rows.length };
}
