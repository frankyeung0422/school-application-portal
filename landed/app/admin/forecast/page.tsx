import { fxBufferIllustration, pipelineProjection } from "@/lib/projections";
import { hkd, hkdSigned } from "@/lib/format";
import { Notice, PageTitle, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const [pipe, fx] = await Promise.all([pipelineProjection(), fxBufferIllustration()]);
  return (
    <div className="space-y-6">
      <PageTitle title="預測 Forecast" sub="Projections — not money. Nothing on this page is in the ledger." />
      <Notice>呢頁所有數字都係估算。Every figure here is an estimate and is never added to P&amp;L.</Notice>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="進行中拼單" value={pipe.openPools} hint={`${pipe.poolCommittedUnits} 件已承諾 committed`} />
        <Stat label="未付款結帳" value={pipe.unpaidCheckouts} hint={hkd(pipe.unpaidCheckoutsCents)} />
      </div>
      <div className="card overflow-x-auto">
        <div className="p-4 text-sm font-semibold">每 HK$1,000 美元貨品嘅匯率緩衝預期收益 Expected FX buffer result per HK$1,000 of USD goods</div>
        <table className="table">
          <thead><tr><th>渠道 Rail</th><th className="text-right">中間價成本</th><th className="text-right">報價</th><th className="text-right">渠道費</th><th className="text-right">預期收益</th></tr></thead>
          <tbody>
            {fx.map((r) => (
              <tr key={r.rail}>
                <td>{r.rail}</td>
                <td className="text-right tabular-nums">{hkd(r.midCostHkdCents)}</td>
                <td className="text-right tabular-nums">{hkd(r.quotedHkdCents)}</td>
                <td className="text-right tabular-nums">{hkd(r.railFeeHkdCents)}</td>
                <td className={`text-right tabular-nums ${r.expectedGainHkdCents < 0 ? "text-rose-700" : "text-emerald-700"}`}>{hkdSigned(r.expectedGainHkdCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
