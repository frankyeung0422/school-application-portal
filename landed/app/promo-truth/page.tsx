import Link from "next/link";
import type { Metadata } from "next";
import { promoTruthView, type TruthRow } from "@/lib/supermarket/stories";
import { TRUTH_TEXT } from "@/lib/supermarket/promo-truth";
import { OPW_ATTRIBUTION, retailerName } from "@/lib/supermarket/retailers";
import { hkd } from "@/lib/format";
import { publicOrigin } from "@/lib/listings";
import { Badge, Empty, PageTitle } from "@/components/ui";
import { ShareButtons } from "@/components/storefront/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "優惠真相 — 「買2件」真係平咗幾多？大包裝反而貴？| 到手價 Landed",
  description: "逐件計清楚香港超市優惠嘅實際折扣：邊啲「買X件$Y」根本唔平，邊啲大包裝每單位反而貴過細包裝。數據來自消委會網上價格一覽。",
};

function TruthTable({ rows, empty }: { rows: TruthRow[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr><th>貨品</th><th>超市</th><th>優惠</th><th className="text-right">散買單價</th><th className="text-right">真相</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.productId}-${r.chain}`}>
              <td><Link href={`/p/${r.slug}`} className="underline">{r.title.slice(0, 44)}</Link></td>
              <td className="whitespace-nowrap">{retailerName(r.chain)}</td>
              <td className="whitespace-nowrap">「{r.promo.slice(0, 24)}」</td>
              <td className="text-right tabular-nums">{hkd(r.shelfCents)}</td>
              <td className={`whitespace-nowrap text-right font-semibold ${r.truth.label === "REAL" ? "text-emerald-700" : "text-rose-700"}`}>{TRUTH_TEXT[r.truth.label](r.truth)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PromoTruthPage() {
  const v = await promoTruthView();
  return (
    <div className="space-y-6">
      <PageTitle
        title="優惠真相 Promo truth"
        sub={<>「買2件$X」、「第二件半價」真係平咗幾多？我哋將 {v.promosChecked.toLocaleString()} 個超市優惠逐個同「散買同樣數量」比較，再搵出大包裝每單位反而貴過細包裝嘅貨品。</>}
        right={<ShareButtons title="香港超市優惠真相：邊啲優惠根本唔平？" url={`${publicOrigin()}/promo-truth`} price={`${v.fake.length} 個假優惠`} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-3xl font-black text-rose-700">{v.fake.length}</div><div className="text-sm text-slate-600">假優惠：唔平過散買</div></div>
        <div className="card"><div className="text-3xl font-black text-amber-600">{v.weak.length}</div><div className="text-sm text-slate-600">平唔夠 5%</div></div>
        <div className="card"><div className="text-3xl font-black text-rose-700">{v.traps.length}</div><div className="text-sm text-slate-600">大包裝反而貴</div></div>
      </div>

      <section className="card space-y-2">
        <h2 className="font-bold">🚫 假優惠 Promotions that do not save</h2>
        <p className="text-xs text-slate-500">買優惠指定數量，總價等於或者貴過用散賣價買同樣數量。</p>
        <TruthTable rows={v.fake.slice(0, 60)} empty="暫時冇 — 所有優惠都真係平過散買。" />
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">📦 大包裝反而貴 Bigger pack, dearer per unit</h2>
        <p className="text-xs text-slate-500">同一品牌同一款、同一間超市，容量大過 20% 以上嘅包裝，每單位價錢反而貴過細包裝。</p>
        {v.traps.length ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>超市</th><th>細包裝</th><th>大包裝</th><th className="text-right">大包裝每單位貴</th></tr></thead>
              <tbody>
                {v.traps.slice(0, 60).map((t) => (
                  <tr key={`${t.big.productId}-${t.chain}`}>
                    <td className="whitespace-nowrap">{retailerName(t.chain)}</td>
                    <td><Link href={`/p/${t.small.slug}`} className="underline">{t.small.title.slice(0, 36)}</Link> <span className="text-xs text-slate-500">{hkd(t.small.shelfCents)}</span></td>
                    <td><Link href={`/p/${t.big.slug}`} className="underline">{t.big.title.slice(0, 36)}</Link> <span className="text-xs text-slate-500">{hkd(t.big.shelfCents)}</span></td>
                    <td className="text-right font-semibold text-rose-700">+{(t.dearerBy * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="暫時未發現 None found">呢刻所有同款唔同容量嘅貨品，大包裝都係每單位最平。</Empty>
        )}
      </section>

      <section className="card space-y-2">
        <h2 className="font-bold">✅ 真抵 Real deals, by effective discount</h2>
        <TruthTable rows={v.real.slice(0, 40)} empty="暫時冇。" />
      </section>

      <p className="text-xs text-slate-500">
        計法：優惠總價 ÷ 用散賣價買同樣數量；大包裝比較只限同品牌、同款、同一間超市、同一計量單位。
        <Badge>唔包括會員價同信用卡優惠</Badge> {OPW_ATTRIBUTION}
      </p>
    </div>
  );
}
