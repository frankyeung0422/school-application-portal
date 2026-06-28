import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId, getCurrentUserRole } from "@/lib/auth/tier";
import { apiOk, apiError } from "@/lib/api/helpers";

const ALLOWED_ROLES = ["PRACTITIONER", "RESEARCHER", "EDITOR", "ADMIN"];

/** GET /api/learn/cpd — list current user's CPD activities + totals */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const role = await getCurrentUserRole();
    if (!userId) return apiError("未登入", 401);
    if (!role || !ALLOWED_ROLES.includes(role)) return apiError("需要執業醫師或研究員帳戶", 403);

    const activities = await prisma.cpdActivity.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: 200,
    });

    const totalCredits = activities.reduce((s, a) => s + a.credits, 0);
    const byType = activities.reduce<Record<string, number>>((acc, a) => {
      acc[a.activityType] = (acc[a.activityType] ?? 0) + a.credits;
      return acc;
    }, {});

    return apiOk({ activities, totalCredits: Math.round(totalCredits * 10) / 10, byType });
  } catch (e) {
    console.error("[cpd GET]", e);
    return apiError("伺服器錯誤", 500);
  }
}

/** POST /api/learn/cpd — log a new CPD activity */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const role = await getCurrentUserRole();
    if (!userId) return apiError("未登入", 401);
    if (!role || !ALLOWED_ROLES.includes(role)) return apiError("需要執業醫師或研究員帳戶", 403);

    const body = await req.json();
    const activityType = typeof body.activityType === "string" ? body.activityType : null;
    const title = typeof body.title === "string" ? body.title.trim() : null;
    const referenceId = typeof body.referenceId === "string" ? body.referenceId : undefined;
    const credits = typeof body.credits === "number" && body.credits > 0 && body.credits <= 8
      ? body.credits
      : null;

    if (!activityType || !title || credits === null) {
      return apiError("缺少必要欄位（activityType, title, credits）", 400);
    }

    const activity = await prisma.cpdActivity.create({
      data: { userId, activityType, title, referenceId, credits },
    });

    return apiOk({ activity });
  } catch (e) {
    console.error("[cpd POST]", e);
    return apiError("伺服器錯誤", 500);
  }
}
