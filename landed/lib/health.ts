// Pure: is the worker keeping its schedule? No DB access — the service hands in rows.
// A green test suite said nothing about the three days the queue sat behind one
// hung crawl; this is what should have said so.

export type HealthStatus = "OK" | "LATE" | "STUCK" | "FAILING" | "NEVER_RAN";

export interface JobRow {
  id: number;
  type: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface ScheduleCheck {
  type: string;
  /** Interval in hours. */
  hours: number;
  /** The job's own max runtime, ms. */
  timeoutMs: number;
}

export interface TypeHealth {
  type: string;
  status: HealthStatus;
  lastOkAt: Date | null;
  detail: string;
}

/** How long past its interval a schedule may run before it counts as late. */
export function lateAfterMs(hours: number): number {
  return (2 * hours + 1) * 3600_000;
}

/** Consecutive latest runs that failed before we call it FAILING. */
export const FAILING_STREAK = 3;

/** `rows` are the recent jobs of this type, any order. */
export function typeHealth(check: ScheduleCheck, rows: JobRow[], now: Date): TypeHealth {
  const recent = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const lastOk = recent.find((r) => r.status === "DONE") ?? null;
  const lastOkAt = lastOk?.finishedAt ?? null;
  const base = { type: check.type, lastOkAt };

  const running = recent.find((r) => r.status === "RUNNING");
  if (running?.startedAt) {
    const ranMs = now.getTime() - running.startedAt.getTime();
    // Grace over the timeout: the worker's watchdog should have fired by then.
    if (ranMs > check.timeoutMs + 5 * 60_000) {
      return { ...base, status: "STUCK", detail: `job #${running.id} running for ${fmtDuration(ranMs)}` };
    }
  }

  const finished = recent.filter((r) => r.status === "DONE" || r.status === "FAILED");
  const streak = finished.slice(0, FAILING_STREAK);
  if (streak.length === FAILING_STREAK && streak.every((r) => r.status === "FAILED")) {
    return { ...base, status: "FAILING", detail: `last ${FAILING_STREAK} runs failed` };
  }

  if (!lastOkAt) {
    return { ...base, status: "NEVER_RAN", detail: "no successful run on record" };
  }
  const sinceMs = now.getTime() - lastOkAt.getTime();
  if (sinceMs > lateAfterMs(check.hours)) {
    return { ...base, status: "LATE", detail: `last success ${fmtDuration(sinceMs)} ago (every ${check.hours}h)` };
  }
  return { ...base, status: "OK", detail: `last success ${fmtDuration(sinceMs)} ago` };
}

/** Anything other than OK/NEVER_RAN means users are seeing stale data. */
export function isUnhealthy(h: TypeHealth): boolean {
  return h.status === "LATE" || h.status === "STUCK" || h.status === "FAILING";
}

export function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
