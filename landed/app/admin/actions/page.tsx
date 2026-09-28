import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/actions/audit";
import { ACTION_LABELS, type ActionKind } from "@/lib/actions/kinds";
import { timeAgo } from "@/lib/format";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

const TONE: Record<string, "slate" | "green" | "amber" | "red" | "blue"> = {
  pending: "amber",
  deferred: "amber",
  executed: "green",
  rejected: "slate",
  blocked: "red",
  failed: "red",
  executing: "blue",
};

export default async function ActionsPage() {
  const [open, recent, chain] = await Promise.all([
    prisma.actionRequest.findMany({ where: { status: { in: ["pending", "deferred"] } }, orderBy: { createdAt: "asc" } }),
    prisma.actionRequest.findMany({ where: { status: { notIn: ["pending", "deferred"] } }, orderBy: { createdAt: "desc" }, take: 40 }),
    verifyChain(),
  ]);
  return (
    <div className="space-y-8">
      <PageTitle
        title="待批 Approvals"
        sub="每個對外動作都要經呢度（或者已賺得自動權限嘅政策）。Every outside effect passes through this gate."
        right={<Badge tone={chain.ok ? "green" : "red"}>審計鏈 {chain.ok ? `完整 ${chain.rows} rows` : `斷裂於 #${chain.firstBreak}`}</Badge>}
      />
      {!chain.ok ? <Notice tone="red">審計紀錄被改動過 — audit chain broken at row {chain.firstBreak}.</Notice> : null}

      <section className="space-y-3">
        {open.length ? (
          open.map((a) => (
            <div key={a.id} className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[a.status]}>{a.status}</Badge>
                <span className="font-semibold">{ACTION_LABELS[a.kind as ActionKind] ?? a.kind}</span>
                <span className="text-xs text-slate-500">{a.policyMode} · {a.runMode} · by {a.requestedBy} · {timeAgo(a.createdAt)}</span>
              </div>
              <div className="text-sm">{a.title}</div>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-700">{a.preview}</pre>
              {a.reason ? <div className="text-xs text-slate-500">原因 Reason: {a.reason}</div> : null}
              <div className="flex flex-wrap gap-4">
                <OpForm op="approve" hidden={{ actionId: a.id }} label="批准執行 Approve & run" />
                <OpForm op="reject" hidden={{ actionId: a.id }} fields={[{ name: "reason", label: "拒絕原因", width: "w-56" }]} label="拒絕 Reject" tone="secondary" />
              </div>
            </div>
          ))
        ) : (
          <Empty title="冇待批動作 Nothing waiting for approval" />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">最近 Recent</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>狀態</th><th>動作</th><th>標題</th><th>決定</th><th>結果 / 原因</th><th>時間</th></tr></thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id}>
                  <td><Badge tone={TONE[a.status] ?? "slate"}>{a.status}</Badge></td>
                  <td className="whitespace-nowrap">{a.kind}</td>
                  <td className="max-w-sm">{a.title}</td>
                  <td className="text-xs">{a.decidedBy ?? "—"}<br />{a.runMode}</td>
                  <td className="max-w-xs truncate text-xs text-slate-500" title={a.result ?? a.reason ?? ""}>{a.result ?? a.reason ?? "—"}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
