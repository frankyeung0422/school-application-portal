import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentCustomer } from "@/lib/auth";
import { tierFor } from "@/lib/pools";
import { ladderOf } from "@/lib/pools-service";
import { hkd, remaining } from "@/lib/format";
import { Badge, Notice } from "@/components/ui";
import { PoolJoin } from "@/components/storefront/client";

export const dynamic = "force-dynamic";

export default async function PoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ joined?: string }>;
}) {
  const [{ slug }, { joined }] = await Promise.all([params, searchParams]);
  const pool = await prisma.pool.findUnique({ where: { slug }, include: { product: true } });
  if (!pool) notFound();
  const customer = await currentCustomer();
  const mine = customer
    ? await prisma.poolCommitment.findUnique({ where: { poolId_customerId: { poolId: pool.id, customerId: customer.id } } })
    : null;
  const ladder = ladderOf(pool);
  const t = tierFor(pool.committedQty, ladder);
  const { days: daysLeft, hours: hoursLeft } = remaining(pool.deadline);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {joined ? <Notice tone="green">✓ 已加入拼單。成團先會扣款，唔成團唔收錢。You&apos;re in — no charge unless the pool unlocks.</Notice> : null}
      <div>
        <Link href={`/p/${pool.product.slug}`} className="text-sm text-brand-700">← {pool.product.title}</Link>
        <h1 className="mt-2 text-2xl font-bold">拼單 Group buy</h1>
      </div>

      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-black text-brand-700">{hkd(t.unitHkdCents)}</span>
          <span className="text-slate-400 line-through">{hkd(pool.singleUnitHkdCents)}</span>
          <Badge tone={pool.status === "OPEN" ? "blue" : pool.status === "UNLOCKED" ? "green" : "slate"}>{pool.status}</Badge>
        </div>
        <p className="text-sm text-slate-600">
          {t.unlocked ? "已達成團價" : `未成團 — 顯示嘅係第一級成團價`} · 已承諾 {pool.committedQty} 件 ·{" "}
          {pool.status === "OPEN" ? `尚餘 ${daysLeft} 日 ${hoursLeft} 小時` : `截止 ${pool.deadline.toLocaleString("zh-HK")}`}
        </p>

        <ol className="space-y-2">
          <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span>1 件（自己買）</span>
            <span className="tabular-nums">{hkd(pool.singleUnitHkdCents)}</span>
          </li>
          {ladder.map((step, i) => {
            const reached = pool.committedQty >= step.minQty;
            return (
              <li key={step.minQty} className={`flex justify-between rounded-lg px-3 py-2 text-sm ${reached ? "bg-emerald-50 font-semibold text-emerald-800" : i === t.stepIndex + 1 ? "border border-dashed border-brand-500" : "bg-slate-50"}`}>
                <span>
                  {step.minQty}+ 件 {reached ? "✓" : i === t.stepIndex + 1 && t.next ? `（尚欠 ${t.next.needed} 件）` : ""}
                </span>
                <span className="tabular-nums">{hkd(step.unitHkdCents)} / 件</span>
              </li>
            );
          })}
        </ol>

        {pool.status === "OPEN" && !(mine && ["COMMITTED", "AUTHORIZED"].includes(mine.status)) ? (
          <PoolJoin slug={pool.slug} signedIn={Boolean(customer)} />
        ) : mine ? (
          <Notice tone="blue">你嘅承諾：{mine.qty} 件，最多每件 {hkd(mine.maxUnitHkdCents)} · 狀態 {mine.status}</Notice>
        ) : null}
      </div>

      <div className="card space-y-2 p-6 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">規則 How pools work</h2>
        <p>1. 加入時只儲存你張卡，唔會扣款。Joining saves your card; nothing is charged.</p>
        <p>2. 夠人數達到批發級數，我哋先會預授權，再按成團價扣款；你最多只會俾加入時顯示嘅價錢。At unlock we place a hold and capture at the pool price — never more than the price shown when you joined.</p>
        <p>3. 如果有人張卡唔成功令數量跌穿第一級，全部預授權即時取消，冇人俾錢。If declines push the pool below the first tier, every hold is voided.</p>
        <p>4. 截止前唔夠人數：自動取消，唔收任何費用。Not enough buyers by the deadline: the pool closes, no charge.</p>
        <p>5. 成團後我哋向供應商一次過落單，集運到港再逐件派送。We place one bulk order, consolidate to HK, then deliver.</p>
      </div>
    </div>
  );
}
