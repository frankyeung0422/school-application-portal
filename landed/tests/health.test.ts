import { describe, expect, it } from "vitest";
import { isUnhealthy, lateAfterMs, typeHealth, type JobRow } from "../lib/health";
import { jobTimeoutMs, TimeoutError, withTimeout } from "../lib/jobs/timeout";
import { SCHEDULE, scheduleHours } from "../lib/jobs/schedule";

const now = new Date("2026-09-24T12:00:00Z");
const h = (n: number) => new Date(now.getTime() - n * 3600_000);
let id = 0;
const row = (status: string, createdHoursAgo: number, extra: Partial<JobRow> = {}): JobRow => ({
  id: ++id,
  type: "SUPERMARKET_SYNC",
  status,
  createdAt: h(createdHoursAgo),
  startedAt: h(createdHoursAgo),
  finishedAt: status === "DONE" || status === "FAILED" ? h(createdHoursAgo - 0.1) : null,
  ...extra,
});
const check = { type: "SUPERMARKET_SYNC", hours: 3, timeoutMs: 10 * 60_000 };

describe("schedule health", () => {
  it("is OK when the last success is inside the window", () => {
    expect(typeHealth(check, [row("DONE", 2)], now).status).toBe("OK");
  });

  it("is LATE once past 2x interval + 1h", () => {
    expect(lateAfterMs(3)).toBe(7 * 3600_000);
    expect(typeHealth(check, [row("DONE", 8)], now).status).toBe("LATE");
  });

  it("flags the three-day hung job as STUCK even though its heartbeat is fresh", () => {
    const hung = row("RUNNING", 72, { startedAt: h(72) });
    const r = typeHealth(check, [hung, row("DONE", 73)], now);
    expect(r.status).toBe("STUCK");
    expect(r.detail).toContain("3d");
    expect(isUnhealthy(r)).toBe(true);
  });

  it("a running job inside its timeout is not stuck", () => {
    expect(typeHealth(check, [row("RUNNING", 0.1), row("DONE", 2)], now).status).toBe("OK");
  });

  it("is FAILING after three failed runs in a row, even if a success is recent enough", () => {
    const rows = [row("FAILED", 0.5), row("FAILED", 1), row("FAILED", 1.5), row("DONE", 2)];
    expect(typeHealth(check, rows, now).status).toBe("FAILING");
  });

  it("NEVER_RAN is not counted as unhealthy (fresh install)", () => {
    const r = typeHealth(check, [], now);
    expect(r.status).toBe("NEVER_RAN");
    expect(isUnhealthy(r)).toBe(false);
  });
});

describe("job timeouts", () => {
  it("gives crawls longer than quick jobs, and env overrides", () => {
    expect(jobTimeoutMs("REFRESH_OFFERS", {})).toBe(20 * 60_000);
    expect(jobTimeoutMs("ALERTS", {})).toBe(5 * 60_000);
    expect(jobTimeoutMs("ALERTS", { JOB_TIMEOUT_ALERTS_MIN: "2" })).toBe(2 * 60_000);
    expect(jobTimeoutMs("ALERTS", { JOB_TIMEOUT_ALERTS_MIN: "junk" })).toBe(5 * 60_000);
  });

  it("rejects a handler that never settles", async () => {
    const never = new Promise<never>(() => {});
    await expect(withTimeout(never, 20, "hung")).rejects.toBeInstanceOf(TimeoutError);
  });

  it("passes through a result that arrives in time", async () => {
    await expect(withTimeout(Promise.resolve(7), 1000, "fast")).resolves.toBe(7);
  });
});

describe("schedule", () => {
  it("honours 0 as disabled", () => {
    const fx = SCHEDULE.find((s) => s.type === "FETCH_FX")!;
    expect(scheduleHours(fx, {})).toBe(6);
    expect(scheduleHours(fx, { FX_INTERVAL_HOURS: "0" })).toBeNull();
  });
});
