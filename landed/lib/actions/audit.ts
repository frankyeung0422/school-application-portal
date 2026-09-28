import { createHash } from "node:crypto";
import { prisma } from "../prisma";

// Hash-chained audit log. Each row commits to the one before it, so a row that
// is edited, deleted or inserted after the fact breaks verifyChain().

export const GENESIS = "0".repeat(64);

export function auditHash(parts: {
  prevHash: string;
  actor: string;
  kind: string;
  verdict: string;
  actionId: string | null;
  detail: string;
}): string {
  return createHash("sha256")
    .update([parts.prevHash, parts.actor, parts.kind, parts.verdict, parts.actionId ?? "", parts.detail].join("␟"))
    .digest("hex");
}

export async function appendAudit(input: {
  actor: string;
  kind: string;
  verdict: string;
  actionId?: string | null;
  detail?: unknown;
}): Promise<void> {
  const detail = JSON.stringify(input.detail ?? {});
  for (let attempt = 0; attempt < 6; attempt++) {
    const prev = await prisma.actionAudit.findFirst({ orderBy: { seq: "desc" } });
    const prevHash = prev?.hash ?? GENESIS;
    const hash = auditHash({
      prevHash,
      actor: input.actor,
      kind: input.kind,
      verdict: input.verdict,
      actionId: input.actionId ?? null,
      detail,
    });
    try {
      await prisma.actionAudit.create({
        data: { prevHash, hash, actor: input.actor, kind: input.kind, verdict: input.verdict, actionId: input.actionId ?? null, detail },
      });
      return;
    } catch (e) {
      // Unique prevHash: someone extended the same tail first — chain onto theirs.
      if (attempt === 5) throw e;
    }
  }
}

export async function verifyChain(): Promise<{ ok: boolean; rows: number; firstBreak: number | null }> {
  const rows = await prisma.actionAudit.findMany({ orderBy: { seq: "asc" } });
  let prevHash = GENESIS;
  for (const r of rows) {
    const expect = auditHash({ prevHash, actor: r.actor, kind: r.kind, verdict: r.verdict, actionId: r.actionId, detail: r.detail });
    if (r.prevHash !== prevHash || r.hash !== expect) return { ok: false, rows: rows.length, firstBreak: r.seq };
    prevHash = r.hash;
  }
  return { ok: true, rows: rows.length, firstBreak: null };
}
