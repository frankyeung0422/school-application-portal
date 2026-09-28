import { findProducts, recordSearch, searchPlatforms } from "@/lib/demand";
import { ProductCard } from "@/components/storefront/product-card";
import { PasteLink, SearchPoller } from "@/components/storefront/client";
import { PLATFORM_LABELS } from "@/lib/types";
import { Empty } from "@/components/ui";
import Link from "next/link";
import { listSupermarketProducts } from "@/lib/supermarket/view";
import { SupermarketRow } from "@/components/storefront/supermarket-row";
import { detectTravelIntent } from "@/lib/travel/intent";
import { parseIntent, withinRange } from "@/lib/search/intent";
import { KeywordAlertForm } from "@/components/storefront/keyword-alert-form";
import { currentCustomer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const raw = q.trim();
  const travel = raw ? detectTravelIntent(raw) : null;
  // "耳機 800以下": the filter words are not part of what we crawl for.
  const intent = parseIntent(raw);
  const query = intent.text;
  // "東京機票" is a trip, not a product: offer the travel search instead of crawling marketplaces.
  const crawl = query.length >= 2 && !travel && !intent.chain ? await recordSearch(query) : null;
  const [found, platforms, groceries, me] = await Promise.all([
    query ? findProducts(query) : Promise.resolve({ products: [], fuzzy: false, suggestion: null }),
    searchPlatforms(),
    query ? listSupermarketProducts({ q: query, sort: "price", take: intent.supermarket ? 12 : 5 }) : Promise.resolve({ total: 0, items: [] }),
    currentCustomer(),
  ]);
  // findProducts orders by match quality; a price range filters, "最平" re-sorts by price.
  const inRange = withinRange(found.products, intent);
  const sorted = intent.cheapestFirst
    ? [...inRange].sort((a, b) => (a.bestLandedHkdCents ?? Infinity) - (b.bestLandedHkdCents ?? Infinity))
    : inRange;
  const groceryItems = groceries.items.filter(
    (i) =>
      (!intent.chain || i.rows.some((r) => r.retailer === intent.chain && r.inStock)) &&
      (intent.maxHkdCents == null || i.rows.some((r) => r.inStock && r.shelfCents <= intent.maxHkdCents!)),
  );

  return (
    <div className="space-y-6">
      <form action="/search" className="flex gap-2">
        <input name="q" defaultValue={raw} required minLength={2} placeholder="例如：耳機 800以下 · 最平 惠康 維他奶 · airpods under $1200" className="input text-base" />
        <button className="btn-primary">搜尋</button>
      </form>
      {intent.chips.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">明白：</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5">「{query}」</span>
          {intent.chips.map((c) => (
            <span key={c} className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{c}</span>
          ))}
        </div>
      ) : null}
      {query.length >= 2 && !travel ? <KeywordAlertForm keyword={query} defaultEmail={me?.email} defaultMax={intent.maxHkdCents} /> : null}
      <details className="card p-3 text-sm">
        <summary className="cursor-pointer text-slate-600">有產品連結？貼上嚟直接格價 Paste a product link instead</summary>
        <div className="mt-2">
          <PasteLink />
        </div>
      </details>

      {travel ? (
        <Link
          href={travel.kind === "FLIGHT" ? `/travel?tab=flights&to=${encodeURIComponent(travel.place.nameZh)}` : `/travel?tab=hotels&city=${encodeURIComponent(travel.place.nameZh)}`}
          className="card flex items-center justify-between gap-4 border-brand-500 p-4 hover:bg-emerald-50"
        >
          <span>
            <span className="font-semibold">
              {travel.kind === "FLIGHT" ? "✈ 搵香港去" : "🏨 搵"}
              {travel.place.nameZh}
              {travel.kind === "FLIGHT" ? "嘅最平機票" : "嘅最平酒店"}
            </span>
            <span className="block text-sm text-slate-500">
              {travel.kind === "FLIGHT" ? `Cheapest flights HKG → ${travel.place.name}` : `Cheapest hotels in ${travel.place.name}`} — 全程總價比較
            </span>
          </span>
          <span className="text-brand-700">→</span>
        </Link>
      ) : null}

      {groceryItems.length ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">香港超市 / 藥房 HK supermarkets &amp; pharmacies</h2>
            <Link href={`/supermarket?q=${encodeURIComponent(query)}`} className="text-sm text-brand-700">全部 {groceries.total} 件 →</Link>
          </div>
          {groceryItems.map((i) => (
            <SupermarketRow key={i.product.id} product={i.product} rows={i.rows} gapCents={i.gapCents} savingVsTypicalCents={i.savingVsTypicalCents} outlierRetailers={i.outlierRetailers} />
          ))}
        </section>
      ) : null}

      {query ? <h2 className="font-bold">網購平台 Online marketplaces（到手價）</h2> : null}

      {found.suggestion ? (
        <p className="text-sm">
          你係咪搵 Did you mean{" "}
          <Link href={`/search?q=${encodeURIComponent(found.suggestion)}`} className="font-semibold text-brand-700 underline">
            {found.suggestion}
          </Link>
          ？
        </p>
      ) : null}

      {crawl?.crawlJobId ? (
        <SearchPoller jobId={crawl.crawlJobId} platforms={platforms.map((p) => PLATFORM_LABELS[p])} />
      ) : null}

      {query ? (
        sorted.length ? (
          <>
            {found.fuzzy ? (
              <p className="text-sm text-amber-700">
                冇完全符合「{query}」嘅產品 — 以下係近似結果 Close matches (spelling, word order or 繁簡 differ).
              </p>
            ) : null}
            <p className="text-sm text-slate-500">
              「{query}」找到 {sorted.length} 件產品 — 價錢係送到香港嘅到手價（每件），未確認同款或者缺貨嘅來源唔會當成最平。
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          </>
        ) : (
          <Empty title={crawl?.crawlJobId ? "正在搜尋… Searching sources" : "搵唔到 No products found"}>
            {crawl?.crawlJobId
              ? "結果會喺各平台回覆後自動出現。Results appear as each source responds."
              : "試下用品牌 + 型號，例如「Xiaomi Band 9」。Try brand + model."}
          </Empty>
        )
      ) : (
        <Empty title="輸入產品名稱開始比較 Type a product to compare" />
      )}
    </div>
  );
}
