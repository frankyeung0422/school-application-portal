import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Public status of a crawl the visitor triggered, plus its chained CLUSTER job. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id: Number(id) } });
  if (!job || !["SEARCH_CRAWL", "CLUSTER", "PASTE_FETCH", "TRAVEL_SEARCH"].includes(job.type)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const payload = safeJson<{ keyword?: string }>(job.payload, {});
  const cluster =
    job.type === "SEARCH_CRAWL" && payload.keyword
      ? await prisma.job.findFirst({
          where: { type: "CLUSTER", dedupeKey: `cluster:${payload.keyword}`, createdAt: { gte: job.createdAt } },
          orderBy: { createdAt: "desc" },
        })
      : null;
  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    result: safeJson<unknown>(job.result, null),
    // First line only: the stack trace is for us, not for a visitor.
    error: job.error ? job.error.split(/\r?\n/)[0].slice(0, 200) : null,
    cluster: cluster ? { id: cluster.id, status: cluster.status } : null,
  });
}
