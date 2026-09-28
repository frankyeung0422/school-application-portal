import { NextResponse } from "next/server";
import { loadScheduleHealth } from "@/lib/jobs/health-service";

export const dynamic = "force-dynamic";

/** 200 when every recurring job is keeping its schedule, 503 otherwise — for an uptime monitor. */
export async function GET() {
  const health = await loadScheduleHealth();
  return NextResponse.json(
    {
      ok: health.ok,
      jobs: health.types.map((t) => ({ type: t.type, status: t.status, detail: t.detail, lastOkAt: t.lastOkAt })),
    },
    { status: health.ok ? 200 : 503 },
  );
}
