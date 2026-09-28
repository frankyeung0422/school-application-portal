import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/auth";
import { hkd, timeAgo } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";
import { Badge, Empty, PageTitle } from "@/components/ui";
import { LogoutButton, TelegramLink } from "@/components/storefront/client";
import { PushOptIn } from "@/components/storefront/push-opt-in";
import { RemoveKeywordAlert } from "@/components/storefront/remove-keyword-alert";
import { comparisonTally } from "@/lib/tally";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/login?next=/account");
  const [orders, watches, commitments] = await Promise.all([
    prisma.order.findMany({ where: { customerId: customer.id, status: { not: "QUOTED" } }, include: { lines: { include: { product: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.watch.findMany({ where: { OR: [{ customerId: customer.id }, { email: customer.email }], active: true }, include: { product: true } }),
    prisma.poolCommitment.findMany({ where: { customerId: customer.id }, include: { pool: { include: { product: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  // Clicks are tied to this browser's anonymous session, not the account: shown as "on this device".
  const sid = (await cookies()).get("landed_sid")?.value;
  const clicks = sid
    ? await prisma.affiliateClick.findMany({
        where: { sessionId: sid },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { product: { select: { title: true, slug: true } }, offer: { select: { platform: true } } },
      })
    : [];
  const tally = comparisonTally(clicks);
  const keywordAlerts = await prisma.keywordAlert.findMany({ where: { email: customer.email, active: true }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <PageTitle title="我的帳戶 My account" sub={customer.email} right={<LogoutButton />} />

      <section>
        <h2 className="mb-3 font-bold">你嘅格價紀錄 Your comparisons（呢部機）</h2>
        {clicks.length ? (
          <div className="card space-y-3 p-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <div className="text-2xl font-black text-brand-700">{tally.comparisons}</div>
                <div className="text-xs text-slate-500">次格價後出發 comparisons</div>
              </div>
              <div>
                <div className="text-2xl font-black text-brand-700">{hkd(tally.belowTypicalCents)}</div>
                <div className="text-xs text-slate-500">
                  你揀嘅來源比當時中位價低（{tally.belowTypical} 次）· below the median of the sources we had checked at the time
                </div>
              </div>
            </div>
            <ul className="divide-y divide-slate-100 text-sm">
              {clicks.slice(0, 8).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  {c.product ? <Link href={`/p/${c.product.slug}`} className="max-w-md truncate text-brand-700 underline">{c.product.title}</Link> : <span>—</span>}
                  <span className="text-xs text-slate-500">
                    {c.offer.platform} {hkd(c.landedHkdCents)}
                    {c.medianHkdCents ? ` · 中位 ${hkd(c.medianHkdCents)}` : ""} · {timeAgo(c.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">呢個係比較，唔係「慳咗」：我哋唔知你最後付咗幾多。A comparison, not a saving — we do not see what you paid.</p>
          </div>
        ) : (
          <Empty title="未有紀錄 No comparisons yet">喺產品頁撳「去買」之後，會喺度見到你揀嘅價錢同當時中位價嘅比較。</Empty>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">訂單 Orders</h2>
        {orders.length ? (
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>訂單</th><th>產品</th><th>金額</th><th>狀態</th><th>時間</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td><Link className="text-brand-700 underline" href={`/account/orders/${o.id}`}>{o.number}</Link></td>
                    <td className="max-w-xs truncate">{o.lines.map((l) => l.product.title).join(", ")}</td>
                    <td className="tabular-nums">{hkd(o.totalHkdCents)}</td>
                    <td><Badge>{ORDER_STATUS_LABELS[o.status as OrderStatus] ?? o.status}</Badge></td>
                    <td className="text-slate-500">{timeAgo(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="未有訂單 No orders yet" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">拼單 Pools</h2>
        {commitments.length ? (
          <ul className="space-y-2">
            {commitments.map((c) => (
              <li key={c.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link href={`/pools/${c.pool.slug}`} className="text-brand-700 underline">{c.pool.product.title}</Link>
                <span>{c.qty} 件 · 最多 {hkd(c.maxUnitHkdCents)} / 件{c.chargedUnitHkdCents ? ` · 已扣 ${hkd(c.chargedUnitHkdCents)} / 件` : ""}</span>
                <Badge tone={c.status === "CHARGED" ? "green" : c.status === "DECLINED" ? "red" : "slate"}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="未加入拼單 No pool commitments" />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">通知方式 How we reach you</h2>
        <div className="card p-4">
          <TelegramLink linked={Boolean(customer.telegramChatId)} />
          <div className="mt-3 border-t border-slate-100 pt-3">
            <PushOptIn />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">關鍵字通知 Keyword alerts</h2>
        {keywordAlerts.length ? (
          <ul className="mb-6 space-y-2">
            {keywordAlerts.map((k) => (
              <li key={k.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link href={`/search?q=${encodeURIComponent(k.keyword)}`} className="text-brand-700 underline">「{k.keyword}」</Link>
                <span className="flex items-center gap-3">
                  {k.maxHkdCents ? `目標 ${hkd(k.maxHkdCents)}` : "新貨／優惠"}
                  <RemoveKeywordAlert id={k.id} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-6 text-sm text-slate-500">喺搜尋結果撳「🔔 有抵價通知我」就可以追蹤一個關鍵字。</p>
        )}
        <h2 className="mb-3 font-bold">減價通知 Price alerts</h2>
        {watches.length ? (
          <ul className="space-y-2">
            {watches.map((w) => (
              <li key={w.id} className="card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <Link href={`/p/${w.product.slug}`} className="text-brand-700 underline">{w.product.title}</Link>
                <span>
                  {w.kind === "PROMO" ? <Badge tone="green">優惠</Badge> : null} 而家 {hkd(w.product.bestLandedHkdCents)}
                  {w.targetHkdCents ? ` · 目標 ${hkd(w.targetHkdCents)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="未設減價通知 No alerts" />
        )}
      </section>
    </div>
  );
}
