import { prisma } from "@/lib/prisma";
import { affiliateFunnel } from "@/lib/affiliate-import";
import { hkd, timeAgo } from "@/lib/format";
import { Badge, Notice, PageTitle, Stat } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

// Clicks → reported commission → booked ledger lines. Booked = the programme
// said it was earned (and it is in the ledger); pending is shown, never summed as money.

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "slate"> = { BOOKED: "green", PENDING: "amber", REVERSED: "red", SKIPPED: "slate" };

export default async function AffiliatePage() {
  const [f, recent] = await Promise.all([
    affiliateFunnel(30),
    prisma.affiliateCommission.findMany({ orderBy: { updatedAt: "desc" }, take: 40 }),
  ]);
  const sum = (status: string) => f.commissions.filter((c) => c.status === status).reduce((s, c) => s + c.hkdCents, 0);
  const count = (status: string) => f.commissions.filter((c) => c.status === status).reduce((s, c) => s + c.count, 0);
  const untrackedShare = f.clicks ? 1 - f.tracked / f.clicks : 0;
  const tagsMissing = !process.env.AMAZON_ASSOCIATE_TAG || !process.env.EBAY_EPN_CAMPAIGN_ID;
  return (
    <div className="space-y-4">
      <PageTitle
        title="聯盟收入 Affiliate revenue"
        sub="Every outbound click carries a sub-ID (L<clickId>); a programme report is matched back to the click that earned it."
      />
      {tagsMissing ? (
        <Notice>
          未設定 {!process.env.AMAZON_ASSOCIATE_TAG ? "AMAZON_ASSOCIATE_TAG" : ""} {!process.env.EBAY_EPN_CAMPAIGN_ID ? "EBAY_EPN_CAMPAIGN_ID" : ""} — clicks to those shops earn nothing until the tag is set in .env.
        </Notice>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={`點擊 Clicks (${f.days}日)`} value={f.clicks} hint={`${f.tracked} tracked · ${Math.round(untrackedShare * 100)}% earn nothing`} />
        <Stat label="已入帳 Booked" value={hkd(sum("BOOKED"))} hint={`${count("BOOKED")} commissions, all time`} />
        <Stat label="待確認 Pending (not money)" value={hkd(sum("PENDING"))} hint={`${count("PENDING")} lines the programme has not confirmed`} />
        <Stat label="已撤回 Reversed" value={count("REVERSED")} hint="returns / cancellations" />
        <Stat label={`旅遊點擊 Travel (${f.days}日)`} value={f.travelClicks} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="mb-2 font-semibold">按平台 By platform ({f.days}日)</h2>
          <table className="table">
            <thead><tr><th>平台</th><th className="text-right">點擊</th><th className="text-right">可賺佣 Tracked</th></tr></thead>
            <tbody>
              {f.byPlatform.length ? (
                f.byPlatform.map((p) => (
                  <tr key={p.platform}>
                    <td>{p.platform}</td>
                    <td className="text-right tabular-nums">{p.clicks}</td>
                    <td className="text-right tabular-nums">{p.tracked}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="text-slate-400">未有點擊 No clicks yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card space-y-2">
          <h2 className="font-semibold">匯入佣金報表 Import a commission report</h2>
          <p className="text-xs text-slate-500">
            Amazon Associates → Reports → <b>Earnings</b> (with Sub Tag) · eBay Partner Network → <b>Transaction Detail</b>. Paste the CSV. Re-importing is safe: each line is keyed by its own order/transaction id, so a later report that turns Pending into Paid books it once.
          </p>
          <OpForm
            op="importCommissions"
            inline={false}
            label="匯入 Import"
            fields={[
              { name: "programme", label: "Programme", type: "select", options: ["AMAZON", "EBAY"], defaultValue: "AMAZON" },
              { name: "currency", label: "Report currency", defaultValue: "USD", width: "w-24" },
              { name: "realness", label: "Money", type: "select", options: ["REAL", "TEST"], defaultValue: "REAL" },
              { name: "csv", label: "CSV", type: "textarea", width: "w-full", placeholder: "Paste the report here" },
            ]}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-2 font-semibold">最近佣金 Recent commission lines</h2>
        <table className="table">
          <thead><tr><th>Programme</th><th>Ref</th><th>Sub-ID</th><th>Product</th><th className="text-right">HKD</th><th>Status</th><th>Why</th><th>Updated</th></tr></thead>
          <tbody>
            {recent.length ? (
              recent.map((c) => (
                <tr key={c.id}>
                  <td>{c.programme}</td>
                  <td className="text-xs">{c.externalRef}</td>
                  <td className="text-xs">{c.subId ?? "—"}</td>
                  <td>{c.productId ? <a className="underline" href={`/admin/products/${c.productId}`}>#{c.productId}</a> : "—"}</td>
                  <td className="text-right tabular-nums">{hkd(c.amountHkdCents)}</td>
                  <td><Badge tone={STATUS_TONE[c.status] ?? "slate"}>{c.status}</Badge></td>
                  <td className="max-w-xs truncate text-xs text-slate-500" title={c.reason ?? ""}>{c.reason}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(c.updatedAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="text-slate-400">未有匯入 Nothing imported yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
