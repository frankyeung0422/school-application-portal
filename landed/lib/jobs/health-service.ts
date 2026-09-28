import { prisma } from "../prisma";
import { isUnhealthy, typeHealth, type TypeHealth } from "../health";
import { SCHEDULE, scheduleHours } from "./schedule";
import { jobTimeoutMs } from "./timeout";

/** Health of every enabled recurring job, from its last few runs. */
export async function loadScheduleHealth(now = new Date()): Promise<{ ok: boolean; types: TypeHealth[] }> {
  const types: TypeHealth[] = [];
  for (const s of SCHEDULE) {
    const hours = scheduleHours(s);
    if (hours == null) continue;
    const rows = await prisma.job.findMany({
      where: { type: s.type },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, status: true, createdAt: true, startedAt: true, finishedAt: true },
    });
    // The newest DONE may be older than the last 10 rows when a job keeps failing.
    if (!rows.some((r) => r.status === "DONE")) {
      const lastDone = await prisma.job.findFirst({
        where: { type: s.type, status: "DONE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, status: true, createdAt: true, startedAt: true, finishedAt: true },
      });
      if (lastDone) rows.push(lastDone);
    }
    types.push(typeHealth({ type: s.type, hours, timeoutMs: jobTimeoutMs(s.type) }, rows, now));
  }
  return { ok: !types.some(isUnhealthy), types };
}
