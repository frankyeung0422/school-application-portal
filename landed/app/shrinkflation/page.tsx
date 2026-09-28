import Link from "next/link";
import type { Metadata } from "next";
import { shrinkflationList } from "@/lib/supermarket/stories";
import { OPW_ATTRIBUTION } from "@/lib/supermarket/retailers";
import { hkd } from "@/lib/format";
import { publicOrigin } from "@/lib/listings";
import { Empty, PageTitle } from "@/components/ui";
import { ShareButtons } from "@/components/storefront/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "縮水通脹追蹤 — 邊啲貨細咗包但冇平？| 到手價 Landed",
  description: "追蹤香港超市貨品包裝縮水：容量或重量減少，但每單位價錢反而貴咗。每日由消委會網上價格一覽更新。",
};

export default async function ShrinkflationPage() {
  const view = await shrinkflationList();
  return (
    <div className="space-y-6">
      <PageTitle
        title="縮水通脹 Shrinkflation"
        sub={<>包裝細咗、價錢冇跟住平：我哋每日記低 {view.watched.toLocaleString()} 件超市貨品嘅容量同價錢，細咗而且每單位貴咗先會列出。</>}
        right={<ShareButtons title="香港超市縮水通脹追蹤" url={`${publicOrigin()}/shrinkflation`} price={view.rows.length ? `${view.rows.length} 件縮水` : ""} />}
      />
      {view.rows.length ? (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>貨品</th>
                <th>容量</th>
                <th className="text-right">細咗</th>
                <th className="text-right">價錢 之前 → 而家</th>
                <th className="text-right">每單位貴咗</th>
                <th>發現日期</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((r) => (
                <tr key={r.productId}>
                  <td><Link href={`/p/${r.slug}`} className="underline">{r.title.slice(0, 50)}</Link></td>
                  <td className="whitespace-nowrap">{r.fromLabel} → <b>{r.toLabel}</b></td>
                  <td className="text-right tabular-nums text-rose-700">−{(r.shrankBy * 100).toFixed(0)}%</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{hkd(r.priceThenCents)} → {hkd(r.priceNowCents)}</td>
                  <td className="text-right tabular-nums font-semibold text-rose-700">+{(r.perUnitRise * 100).toFixed(1)}%</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{r.changedOn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="暫時未發現 None caught yet">
          我哋記錄咗 {view.historyDays} 日嘅容量同價錢。縮水要一段時間先會出現 — 一發現就會喺度列出，亦會通知訂閱咗嗰件貨嘅用戶。
        </Empty>
      )}
      <p className="text-xs text-slate-500">
        只當容量真係細咗（500g → 0.5kg 呢類改標籤唔計），而且每單位價錢上升先算縮水。{OPW_ATTRIBUTION}
      </p>
    </div>
  );
}
