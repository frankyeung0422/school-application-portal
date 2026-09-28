import { prisma } from "@/lib/prisma";
import { hoursSince, timeAgo } from "@/lib/format";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

const MANUAL = ["SUPERMARKET_SYNC", "STORE_SYNC", "OFFICIAL_SYNC", "FETCH_FX", "DISCOVER", "REFRESH_OFFERS", "ALERTS", "GUARD_LISTINGS", "POOL_SWEEP", "CLEAR_LEDGER"];

export default async function JobsPage() {
  const [jobs, lastBeat] = await Promise.all([
    prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.job.findFirst({ where: { status: { in: ["DONE", "FAILED"] } }, orderBy: { finishedAt: "desc" } }),
  ]);
  const workerQuiet = (hoursSince(lastBeat?.finishedAt) ?? Infinity) > 2;
  return (
    <div className="space-y-4">
      <PageTitle title="工作 Jobs" sub="The web app only enqueues; `npm run worker` does the crawling, clustering and sweeps." />
      {workerQuiet && jobs.some((j) => j.status === "PENDING") ? (
        <Notice>有工作排緊隊但 worker 好耐冇完成過工作 — 開咗 `npm run worker` 未？Jobs are queued but nothing has finished recently.</Notice>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {MANUAL.map((t) => (
          <OpForm key={t} op="enqueueJob" hidden={{ type: t }} label={t} tone="secondary" />
        ))}
        <OpForm op="seedLuxury" label="載入奢侈品比價 Load luxury searches" tone="secondary" />
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>#</th><th>類型</th><th>狀態</th><th>次數</th><th>結果 / 錯誤</th><th>建立</th></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td>{j.id}</td>
                <td>{j.type}</td>
                <td><Badge tone={j.status === "DONE" ? "green" : j.status === "FAILED" ? "red" : j.status === "RUNNING" ? "blue" : "slate"}>{j.status}</Badge></td>
                <td>{j.attempts}</td>
                <td className="max-w-lg truncate text-xs text-slate-500" title={j.error ?? j.result ?? ""}>{(j.error ?? j.result ?? j.payload).slice(0, 200)}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(j.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
