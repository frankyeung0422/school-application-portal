import { prisma } from "../prisma";
import { getFlag, setFlag } from "../settings";
import { appendAudit } from "./audit";
import { decidePolicy } from "./policy";
import {
  DAILY_CAPS,
  PROTECTIVE_KINDS,
  isActionKind,
  type ActionKind,
  type PolicyMode,
  type RunMode,
} from "./kinds";

/**
 * THE GATE. Everything that touches money or the outside world — charging a
 * card, placing a supplier order, publishing a listing, posting, emailing —
 * goes through requestAction() → (policy) → executeAction(). There is no
 * second path; handlers are only reachable from here.
 *
 *   known kind → kill switch → idempotency → policy (floor + earned autonomy)
 *   → daily cap → row + preview → AUTO executes / APPROVE waits → audit
 */

export interface ActionContext {
  actionId: string;
  runMode: RunMode;
  actor: string;
}

export interface ActionHandler {
  preview(payload: Record<string, unknown>): Promise<string>;
  execute(payload: Record<string, unknown>, ctx: ActionContext): Promise<Record<string, unknown>>;
}

const handlers = new Map<ActionKind, ActionHandler>();

export function registerHandler(kind: ActionKind, h: ActionHandler) {
  handlers.set(kind, h);
}

async function loadHandlers() {
  // Handlers import services that import this bus; load lazily to keep the
  // module graph acyclic at evaluation time.
  await import("./handlers");
}

export type RequestOutcome =
  | { status: "executed"; actionId: string; result: Record<string, unknown> }
  | { status: "pending"; actionId: string; reason: string }
  | { status: "blocked"; actionId: string | null; reason: string }
  | { status: "deferred"; actionId: string; reason: string }
  | { status: "duplicate"; actionId: string; reason: string }
  | { status: "failed"; actionId: string; reason: string };

export async function runMode(): Promise<RunMode> {
  return (await getFlag("runMode", "DRY")) === "LIVE" ? "LIVE" : "DRY";
}

export async function isKillSwitchOn(): Promise<boolean> {
  return (await getFlag("killSwitch", "OFF")) === "ON";
}

export async function tripKillSwitch(reason: string, actor = "system") {
  await setFlag("killSwitch", "ON");
  await appendAudit({ actor, kind: "KILL_SWITCH", verdict: "TRIPPED", detail: { reason } });
}

export async function resetKillSwitch(actor: string) {
  await setFlag("killSwitch", "OFF");
  await appendAudit({ actor, kind: "KILL_SWITCH", verdict: "RESET", detail: {} });
}

async function trackRecord(kind: ActionKind) {
  const approvedExecutions = await prisma.actionRequest.count({
    where: { kind, status: "executed", decidedBy: { not: null }, NOT: { decidedBy: { startsWith: "policy:" } } },
  });
  const recent = await prisma.actionRequest.findMany({
    where: { kind, status: { in: ["executed", "failed"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { status: true },
  });
  return { approvedExecutions, recentFailures: recent.filter((r) => r.status === "failed").length };
}

export async function resolvePolicy(kind: ActionKind) {
  const row = await prisma.actionPolicy.findUnique({ where: { kind } });
  return decidePolicy(kind, (row?.mode as PolicyMode | undefined) ?? null, await trackRecord(kind));
}

export async function requestAction(opts: {
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  requestedBy?: string;
}): Promise<RequestOutcome> {
  const actor = opts.requestedBy ?? "system";
  if (!isActionKind(opts.kind)) {
    await appendAudit({ actor, kind: opts.kind, verdict: "BLOCKED", detail: { reason: "unknown kind" } });
    return { status: "blocked", actionId: null, reason: `Unknown action kind ${opts.kind}` };
  }
  const kind = opts.kind;

  if ((await isKillSwitchOn()) && !PROTECTIVE_KINDS.includes(kind)) {
    await appendAudit({ actor, kind, verdict: "BLOCKED", detail: { reason: "kill switch", title: opts.title } });
    return { status: "blocked", actionId: null, reason: "Kill switch is ON — outbound actions halted" };
  }

  if (opts.idempotencyKey) {
    const existing = await prisma.actionRequest.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (existing) {
      return { status: "duplicate", actionId: existing.id, reason: `Already requested (${existing.status})` };
    }
  }

  await loadHandlers();
  const handler = handlers.get(kind);
  const policy = await resolvePolicy(kind);
  const mode = await runMode();

  let preview = opts.title;
  try {
    if (handler) preview = await handler.preview(opts.payload);
  } catch (e) {
    preview = `Preview failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  let status = "pending";
  let reason: string | null = policy.reason;
  if (policy.mode === "BLOCK") {
    status = "blocked";
  } else if (!handler) {
    status = "blocked";
    reason = "No handler implemented for this kind";
  } else {
    const cap = DAILY_CAPS[kind];
    if (cap != null) {
      const used = await prisma.actionRequest.count({
        where: { kind, status: "executed", executedAt: { gte: new Date(Date.now() - 86400_000) } },
      });
      if (used >= cap) {
        status = "deferred";
        reason = `Daily cap ${cap} reached for ${kind}`;
      }
    }
  }

  const row = await prisma.actionRequest.create({
    data: {
      kind,
      title: opts.title,
      payload: JSON.stringify(opts.payload),
      preview,
      status,
      policyMode: policy.mode,
      runMode: mode,
      reason,
      idempotencyKey: opts.idempotencyKey,
      requestedBy: actor,
    },
  });
  await appendAudit({ actor, kind, verdict: status.toUpperCase(), actionId: row.id, detail: { title: opts.title, reason } });

  if (status === "blocked") return { status: "blocked", actionId: row.id, reason: reason ?? "blocked" };
  if (status === "deferred") return { status: "deferred", actionId: row.id, reason: reason ?? "deferred" };
  if (policy.mode === "AUTO") return executeAction(row.id, "policy:auto");
  return { status: "pending", actionId: row.id, reason: reason ?? "awaiting approval" };
}

/** Execute a pending action. Only a pending row can move; a second call is a no-op. */
export async function executeAction(actionId: string, decidedBy: string): Promise<RequestOutcome> {
  const claimed = await prisma.actionRequest.updateMany({
    where: { id: actionId, status: "pending" },
    data: { status: "executing", decidedBy, decidedAt: new Date() },
  });
  const row = await prisma.actionRequest.findUnique({ where: { id: actionId } });
  if (!row) return { status: "blocked", actionId: null, reason: "No such action" };
  if (claimed.count !== 1) return { status: "duplicate", actionId, reason: `Action is ${row.status}` };

  const kind = row.kind as ActionKind;
  if ((await isKillSwitchOn()) && !PROTECTIVE_KINDS.includes(kind)) {
    await prisma.actionRequest.update({ where: { id: actionId }, data: { status: "blocked", reason: "Kill switch is ON" } });
    await appendAudit({ actor: decidedBy, kind, verdict: "BLOCKED", actionId, detail: { reason: "kill switch at execution" } });
    return { status: "blocked", actionId, reason: "Kill switch is ON" };
  }

  await loadHandlers();
  const handler = handlers.get(kind);
  if (!handler) {
    await prisma.actionRequest.update({ where: { id: actionId }, data: { status: "failed", reason: "no handler" } });
    return { status: "failed", actionId, reason: "no handler" };
  }
  try {
    const result = await handler.execute(JSON.parse(row.payload) as Record<string, unknown>, {
      actionId,
      runMode: row.runMode as RunMode,
      actor: decidedBy,
    });
    await prisma.actionRequest.update({
      where: { id: actionId },
      data: { status: "executed", executedAt: new Date(), result: JSON.stringify(result) },
    });
    await appendAudit({ actor: decidedBy, kind, verdict: "EXECUTED", actionId, detail: result });
    return { status: "executed", actionId, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.actionRequest.update({ where: { id: actionId }, data: { status: "failed", reason: message } });
    await appendAudit({ actor: decidedBy, kind, verdict: "FAILED", actionId, detail: { message } });
    return { status: "failed", actionId, reason: message };
  }
}

export async function rejectAction(actionId: string, decidedBy: string, reason: string) {
  const res = await prisma.actionRequest.updateMany({
    where: { id: actionId, status: { in: ["pending", "deferred"] } },
    data: { status: "rejected", decidedBy, decidedAt: new Date(), reason },
  });
  if (res.count === 1) {
    const row = await prisma.actionRequest.findUnique({ where: { id: actionId } });
    await appendAudit({ actor: decidedBy, kind: row!.kind, verdict: "REJECTED", actionId, detail: { reason } });
    await import("./handlers").then((m) => m.onRejected?.(row!.kind as ActionKind, JSON.parse(row!.payload)));
  }
  return res.count === 1;
}
