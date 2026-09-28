import Link from "next/link";
import { suspectOffers } from "@/lib/luxury/screen";
import { native, timeAgo } from "@/lib/format";
import { Badge, Empty, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function CounterfeitsPage() {
  const rows = await suspectOffers();
  return (
    <div className="space-y-4">
      <PageTitle
        title="疑似冒牌 Screened-out listings"
        sub="價錢低過真品可能範圍，或者標題有冒牌用語。已經喺比價頁剔除，但冇刪除 — 可以人手放行。"
        right={<OpForm op="screenLuxury" label="重新檢查 Re-screen" tone="secondary" />}
      />
      <Notice>
        放行之後，呢個放盤會重新出現喺比價，而且以後唔會再被自動剔除。Clearing a listing puts it back into the comparison and exempts it from future screening.
      </Notice>
      {rows.length ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr><th>產品</th><th>平台</th><th className="text-right">標價</th><th>剔除原因</th><th>更新</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="max-w-sm">
                    <a href={o.url} target="_blank" rel="noreferrer" className="text-brand-700 underline">{o.title.slice(0, 80)}</a>
                    <div className="text-xs text-slate-500">
                      {o.product ? <Link className="underline" href={`/admin/products/${o.product.id}`}>{o.product.brand} — {o.product.title.slice(0, 40)}</Link> : "—"}
                    </div>
                  </td>
                  <td>{o.platform}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{native(o.latestPrice, o.currency)}</td>
                  <td className="max-w-md text-xs text-rose-700">{o.suspectReason}</td>
                  <td className="text-xs text-slate-500">{timeAgo(o.lastCheckedAt)}</td>
                  <td>
                    {o.clearedBy ? (
                      <Badge tone="green">已放行 {o.clearedBy}</Badge>
                    ) : (
                      <OpForm
                        op="clearCounterfeit"
                        hidden={{ offerId: o.id }}
                        label="確認真品 Genuine"
                        tone="secondary"
                        confirm="Put this listing back into the comparison? Only do this if you have checked the seller and the price."
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="冇疑似冒牌放盤 Nothing screened out" />
      )}
    </div>
  );
}
