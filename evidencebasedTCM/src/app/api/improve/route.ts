import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { runAutoImprovement } from "@/lib/engine/auto-improve";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/improve — Run the auto-improvement engine
 * Query: ?type=daily|manual|scheduled
 */
export async function POST(request: NextRequest) {
  const runType = request.nextUrl.searchParams.get("type") ?? "manual";
  const result = await runAutoImprovement(runType);
  return NextResponse.json(result);
}

/**
 * GET /api/improve — Get improvement history
 * Query: ?days=7&limit=100
 */
export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") ?? "30");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "200");
  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await prisma.improvementLog.findMany({
    where: { runDate: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const summary = await prisma.improvementLog.groupBy({
    by: ["category"],
    where: { runDate: { gte: since } },
    _count: true,
  });

  return NextResponse.json({
    days,
    totalLogs: logs.length,
    categorySummary: summary,
    logs: logs.map((l) => ({
      id: l.id,
      runDate: l.runDate,
      runType: l.runType,
      category: l.category,
      action: l.action,
      details: l.details,
      itemsAffected: l.itemsAffected,
      status: l.status,
      duration: l.duration,
    })),
  });
}
