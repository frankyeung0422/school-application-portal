import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/storefront/product-card";
import { hkd } from "@/lib/format";
import { tierFor } from "@/lib/pools";
import { ladderOf } from "@/lib/pools-service";
import { listSupermarketProducts } from "@/lib/supermarket/view";
import { SupermarketRow } from "@/components/storefront/supermarket-row";
import { PasteLink } from "@/components/storefront/client";
import { ChannelCta } from "@/components/storefront/channel-cta";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [trending, pools, groceryGaps] = await Promise.all([
    prisma.product.findMany({
      where: { bestLandedHkdCents: { not: null }, sourceCount: { gte: 2 }, segment: "GLOBAL" },
      orderBy: [{ clicks: { _count: "desc" } }, { sourceCount: "desc" }],
      take: 8,
    }),
    prisma.pool.findMany({ where: { status: "OPEN" }, include: { product: true }, orderBy: { deadline: "asc" }, take: 3 }),
    listSupermarketProducts({ sort: "gap", take: 4 }),
  ]);

  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-emerald-500 px-6 py-12 text-white sm:px-12">
        <h1 className="max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
          唔好睇標價，睇到手價。
          <span className="mt-2 block text-lg font-semibold text-emerald-100">Compare what it really costs to get it to your door in Hong Kong.</span>
        </h1>
        <form action="/search" className="mt-8 flex max-w-2xl gap-2">
          <input
            name="q"
            required
            minLength={2}
            placeholder="搜尋任何產品，例如：小米手環 9、Midea 電熱水壺"
            className="min-w-0 flex-1 rounded-xl border-0 px-4 py-3 text-slate-900 outline-none ring-4 ring-white/20"
          />
          <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800">搜尋</button>
        </form>
        <p className="mt-3 text-sm text-emerald-100">AliExpress · Amazon · eBay · 淘寶 · 1688 · 京東 — 運費、集運、信用卡外幣手續費全部計埋。</p>
        <div className="mt-4 max-w-2xl">
          <p className="mb-1 text-sm font-medium text-emerald-50">見到 IG／FB 廣告？直接貼條 link：</p>
          <PasteLink dark />
        </div>
      </section>

      <ChannelCta />

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/travel" className="card group p-5 transition hover:border-brand-500">
          <div className="font-bold text-brand-700">✈ 機票酒店 Flights &amp; hotels</div>
          <p className="mt-2 text-sm">以全程總價（所有乘客、所有晚數、連稅）比較，最平排頭，再去航空公司或訂房網站自己訂。</p>
          <p className="mt-1 text-xs text-slate-500">Whole-trip totals, cheapest first — then book direct. →</p>
        </Link>
        <Link href="/near" className="card group p-5 transition hover:border-brand-500">
          <div className="font-bold text-brand-700">📍 附近抵食 · 而家抵買 Nearby</div>
          <p className="mt-2 text-sm">用你嘅位置搵附近又平又好食嘅餐廳，同埋有價格紀錄證明而家真係抵買嘅貨品。</p>
          <p className="mt-1 text-xs text-slate-500">Good-value food near you, and deals backed by price history. →</p>
        </Link>
        <Link href="/price-index" className="card group p-5 transition hover:border-brand-500">
          <div className="font-bold text-brand-700">🧺 超市指數 Basket index</div>
          <p className="mt-2 text-sm">同一籃日用品，每星期喺百佳、惠康、Market Place、AEON 嘅總價 — 邊間真係最平。</p>
          <p className="mt-1 text-xs text-slate-500">The same basket at four chains, every week. →</p>
        </Link>
        <Link href="/shrinkflation" className="card group p-5 transition hover:border-brand-500">
          <div className="font-bold text-brand-700">📉 縮水通脹 Shrinkflation</div>
          <p className="mt-2 text-sm">包裝細咗但冇平：我哋每日記低超市貨品嘅容量同價錢，一縮水就列出嚟。</p>
          <p className="mt-1 text-xs text-slate-500">Packs that shrank without getting cheaper. →</p>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. 搜尋", "我哋同時查多個平台，用型號、容量、包裝數量同圖片判斷係咪同一件貨。", "Same product, not just similar titles."],
          ["2. 計到手價", "貨價 + 賣家運費 + 內地段 + 集運每公斤 + 信用卡外幣手續費。", "Every cost to your door, every assumption shown."],
          ["3. 自己買或者代買", "去最平嘅賣家自己買；熱門貨可以喺度直接買或者拼單攞批發價。", "Buy direct, buy through us, or pool for wholesale."],
        ].map(([t, zh, en]) => (
          <div key={t} className="card p-5">
            <div className="font-bold text-brand-700">{t}</div>
            <p className="mt-2 text-sm">{zh}</p>
            <p className="mt-1 text-xs text-slate-500">{en}</p>
          </div>
        ))}
      </section>

      {groceryGaps.items.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">今日超市差價最大 Biggest supermarket gaps today</h2>
            <Link href="/supermarket" className="text-sm text-brand-700">超市格價 →</Link>
          </div>
          <div className="space-y-3">
            {groceryGaps.items.map((i) => (
              <SupermarketRow key={i.product.id} product={i.product} rows={i.rows} gapCents={i.gapCents} savingVsTypicalCents={i.savingVsTypicalCents} outlierRetailers={i.outlierRetailers} />
            ))}
          </div>
        </section>
      ) : null}

      {pools.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">拼單進行中 Open pools</h2>
            <Link href="/pools" className="text-sm text-brand-700">全部 →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {pools.map((pool) => {
              const t = tierFor(pool.committedQty, ladderOf(pool));
              return (
                <Link key={pool.id} href={`/pools/${pool.slug}`} className="card p-4 hover:border-brand-500">
                  <div className="line-clamp-2 text-sm font-medium">{pool.product.title}</div>
                  <div className="mt-2 text-lg font-bold text-brand-700">{hkd(t.unitHkdCents)}<span className="text-xs font-normal text-slate-500"> / 件（成團價）</span></div>
                  <div className="text-xs text-slate-500">
                    已有 {pool.committedQty} 件{t.next ? ` · 尚欠 ${t.next.needed} 件到 ${hkd(t.next.unitHkdCents)}` : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-xl font-bold">多人比較緊 Being compared</h2>
        {trending.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {trending.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">未有產品 — 搜尋一件貨開始。No products yet — search for something.</p>
        )}
      </section>
    </div>
  );
}
