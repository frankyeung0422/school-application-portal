import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getChannel } from "@/lib/channels/registry";
import { socialAvailability } from "@/lib/channels/meta";
import { hkd, safeJson, timeAgo } from "@/lib/format";
import { CHANNELS, CHANNEL_LABELS, type Channel } from "@/lib/types";
import { Badge, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const [accounts, listings, posts] = await Promise.all([
    prisma.channelAccount.findMany(),
    prisma.channelListing.findMany({ include: { product: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.socialPost.findMany({ include: { product: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const acct = new Map(accounts.map((a) => [a.platform, a]));
  const fb = socialAvailability("FACEBOOK");
  const ig = socialAvailability("INSTAGRAM");

  return (
    <div className="space-y-8">
      <PageTitle
        title="渠道 Channel Autopilot"
        sub="上架價 = 成本 ÷ (1 − 平台費 − 利潤底線)。GUARD 每 6 小時用即時成本檢查，自動調價或落架。"
        right={<OpForm op="enqueueJob" hidden={{ type: "GUARD_LISTINGS" }} label="立即檢查 Run guard now" tone="secondary" />}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        {CHANNELS.map((c) => {
          const a = acct.get(c);
          const avail = getChannel(c as Channel).availability();
          return (
            <div key={c} className="card space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{CHANNEL_LABELS[c]}</span>
                <Badge tone={avail.ok ? "green" : "amber"}>{avail.ok ? "可用" : "未連接"}</Badge>
              </div>
              <div className="text-xs text-slate-500">{avail.reason}{avail.missing.length ? ` — missing ${avail.missing.join(", ")}` : ""}</div>
              {a ? (
                <OpForm
                  op="channelAccount"
                  hidden={{ platform: c }}
                  fields={[
                    { name: "commissionPct", label: "佣金 %", type: "number", defaultValue: a.commissionPct, width: "w-24" },
                    { name: "paymentFeePct", label: "付款費 %", type: "number", defaultValue: a.paymentFeePct, width: "w-24" },
                    { name: "fixedFeeHkd", label: "固定費 HK$", type: "number", defaultValue: a.fixedFeeHkdCents / 100, width: "w-24" },
                    { name: "marginFloorPct", label: "利潤底線", type: "number", defaultValue: a.marginFloorPct, width: "w-24" },
                  ]}
                  label="儲存"
                  tone="secondary"
                />
              ) : null}
            </div>
          );
        })}
        <div className="card space-y-1 p-4 text-sm">
          <div className="font-semibold">Facebook / Instagram 發帖</div>
          <div className="text-xs text-slate-500">Facebook: {fb.ok ? "connected" : `missing ${fb.missing.join(", ")}`}</div>
          <div className="text-xs text-slate-500">Instagram: {ig.ok ? "connected" : `missing ${ig.missing.join(", ")}`}</div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">上架 Listings</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>產品</th><th>渠道</th><th>狀態</th><th className="text-right">價</th><th>外部 ID</th><th>最後檢查</th></tr></thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="max-w-xs truncate"><Link className="underline" href={`/admin/products/${l.productId}`}>{l.product.title}</Link></td>
                  <td>{l.platform}</td>
                  <td>
                    <Badge tone={l.status === "LIVE" ? "green" : l.status === "FAILED" || l.status === "DELISTED" ? "red" : "slate"}>{l.status}</Badge>
                    {l.dryRun && l.status === "LIVE" ? <Badge tone="blue">DRY</Badge> : null}
                  </td>
                  <td className="text-right tabular-nums">{hkd(l.priceHkdCents)}</td>
                  <td className="text-xs">{l.externalId ?? "—"}</td>
                  <td className="max-w-xs text-xs text-slate-500">{l.lastGuardCheckAt ? timeAgo(l.lastGuardCheckAt) : "—"} {l.lastGuardVerdict ?? l.delistReason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">帖文 Social posts</h2>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead><tr><th>平台</th><th>內容</th><th>狀態</th><th>聲稱檢查</th><th>時間</th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.platform}</td>
                  <td className="max-w-md whitespace-pre-wrap text-xs">{p.caption}</td>
                  <td><Badge tone={p.status === "PUBLISHED" ? "green" : p.status === "BLOCKED" || p.status === "FAILED" ? "red" : "slate"}>{p.status}</Badge>{p.dryRun && p.status === "PUBLISHED" ? <Badge tone="blue">DRY</Badge> : null}</td>
                  <td className="text-xs">{safeJson<{ rule: string; fix: string }[]>(p.lintIssues, []).map((i) => `${i.rule}: ${i.fix}`).join("; ") || "OK"}</td>
                  <td className="text-xs text-slate-500">{timeAgo(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
