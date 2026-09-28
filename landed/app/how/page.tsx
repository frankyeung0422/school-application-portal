import { commercialSettings, loadMids } from "@/lib/settings";
import { LINE_LABELS } from "@/lib/money/landed";
import { pct, timeAgo } from "@/lib/format";
import { PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HowPage() {
  const [s, fx] = await Promise.all([commercialSettings(), loadMids()]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="到手價點計 How 到手價 works" />
      <section className="card space-y-3 p-6 text-sm leading-relaxed">
        <h2 className="text-base font-bold">1. 我哋計咩 What we add up</h2>
        <ul className="list-disc space-y-1 pl-5">
          {Object.values(LINE_LABELS).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p>
          香港冇進口關稅同增值稅，所以最大分別通常係運費、集運同信用卡外幣手續費（一般約 1.95%）。當賣家冇寫重量，我哋會用假設重量並喺頁面講明。
        </p>
        <p className="text-slate-500">
          Hong Kong charges no import duty or VAT, so the real differences are shipping, forwarding and your card&apos;s foreign-currency fee. When a seller does not state weight we assume one and say so.
        </p>
      </section>
      <section className="card space-y-3 p-6 text-sm leading-relaxed">
        <h2 className="text-base font-bold">2. 點樣先算「最平」 What counts as cheapest</h2>
        <p>
          標價最低唔一定最平。配件、唔同容量、多件裝、未確認同款、缺貨或者要買足最低訂購量嘅來源，都唔會被當成最平。我哋只會話「喺某個時間查咗 N 個來源，呢個最平」。
        </p>
        <p className="text-slate-500">
          Accessories, different sizes, multi-packs, unconfirmed matches, out-of-stock and minimum-order listings are never labelled cheapest. We only ever claim &quot;cheapest of N sources checked at a stated time&quot;.
        </p>
      </section>
      <section className="card space-y-3 p-6 text-sm leading-relaxed">
        <h2 className="text-base font-bold">3. 我哋點賺錢 How we make money</h2>
        <p>
          <b>聯盟佣金：</b>你經「去買」連結購物，部分平台會俾我哋佣金，唔會令你俾多錢，亦唔影響排名。
        </p>
        <p>
          <b>代買服務費：</b>經我哋買，價錢已包服務費；我哋會同時顯示你自己買嘅到手價，俾你比較。
        </p>
        <p>
          <b>匯率緩衝：</b>代買報價用中間匯率加 {pct(s.fxBufferPct)} 緩衝，保障報價鎖定期間匯率波動。我哋用低成本渠道向供應商付款，差額係我哋收入之一。
          {fx.fetchedAt ? `（匯率更新：${timeAgo(fx.fetchedAt)}）` : ""}
        </p>
        <p>
          <b>拼單：</b>集合訂單攞批發價同一次過集運，節省嘅部分同買家分。
        </p>
      </section>

      <section className="card space-y-3 p-6 text-sm leading-relaxed">
        <h2 className="text-base font-bold">同其他格價工具有咩唔同？How we compare</h2>
        <p className="text-slate-600">
          我哋嘅超市價錢來自消委會「網上價格一覽」開放數據 — 佢哋嘅 app 已經有基本比價、目標價通知同掃條碼，我哋唔係要取代佢，而係做佢未做嘅計數。以下係我哋盡量準確嘅比較（2026 年 9 月），如有錯漏歡迎話我哋知。
        </p>
        <div className="overflow-x-auto">
          <table className="table text-xs">
            <thead>
              <tr>
                <th />
                {COMPETITORS.map((c) => (
                  <th key={c} className="whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([feature, cells]) => (
                <tr key={feature}>
                  <td className="font-medium">{feature}</td>
                  {cells.map((c, i) => (
                    <td key={i} className={c === "✓" ? "text-emerald-700" : c === "—" ? "text-slate-400" : ""}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          我哋嘅弱項：冇掃條碼（開放數據冇條碼）；超市價錢係網上價，門市價靠用戶提供；電子產品覆蓋唔及專門格價網。
        </p>
      </section>
    </div>
  );
}

const COMPETITORS = ["到手價", "消委會 Price Watch", "Price.com.hk", "ShopBack", "BigGo", "淘寶直送"];

// ✓ = yes · — = no · text = partly. Our reading of each product's public features, Sept 2026.
const COMPARISON: [string, string[]][] = [
  ["送到香港嘅到手價（運費＋集運＋匯率）", ["✓", "—", "—", "—", "—", "只計自己運費"]],
  ["「買2件$X」計實際每件價", ["✓", "—", "—", "—", "—", "—"]],
  ["假優惠／大包裝反而貴", ["✓", "—", "—", "—", "—", "—"]],
  ["成張清單分開幾間超市買最平", ["✓", "每間總價", "—", "—", "—", "—"]],
  ["價格紀錄", ["✓", "7 日", "部分", "—", "✓", "—"]],
  ["縮水通脹追蹤", ["✓", "專題調查", "—", "—", "—", "—"]],
  ["門市實價（用戶提供、人手核實）", ["✓", "—", "部分", "—", "—", "—"]],
  ["減價／優惠／關鍵字通知", ["✓", "目標價", "✓", "—", "✓", "—"]],
  ["水貨／保養標示、疑似冒牌篩查", ["✓", "—", "標示", "—", "—", "—"]],
  ["拼單", ["✓", "—", "—", "—", "—", "—"]],
  ["掃條碼", ["—", "✓", "—", "—", "—", "—"]],
  ["現金回贈", ["—", "—", "—", "✓", "✓", "—"]],
];
