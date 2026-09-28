import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dailyBestHistory, priceProduct } from "@/lib/catalog";
import { buySignal } from "@/lib/passport";
import { cheapestClaim } from "@/lib/claims";
import { currentCustomer } from "@/lib/auth";
import { hkd, native, pct, timeAgo } from "@/lib/format";
import { PLATFORM_LABELS, PLATFORM_ORIGIN, type Platform } from "@/lib/types";
import { DELIVERY_LABEL, PAY_LABEL, PREFS_COOKIE, parsePrefs } from "@/lib/buyer-prefs";
import { BuyerPrefsToggle } from "@/components/storefront/buyer-prefs-toggle";
import { cookies } from "next/headers";
import { Badge, Notice } from "@/components/ui";
import { BuyBox, PassportChart, ShareButtons, WatchForm } from "@/components/storefront/client";
import { tierFor } from "@/lib/pools";
import { ladderOf } from "@/lib/pools-service";
import { fulfilmentPlan } from "@/lib/fulfil";
import { SupermarketProduct } from "@/components/storefront/supermarket-product";
import { RISK_LABELS } from "@/lib/luxury/risk";
import { publicOrigin } from "@/lib/listings";
import { jsonLdScript, productJsonLd, productMeta } from "@/lib/seo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SIGNAL: Record<string, { label: string; tone: "green" | "amber" | "slate" | "blue" }> = {
  BUY_NOW: { label: "而家買 Good time to buy", tone: "green" },
  FAIR: { label: "價錢合理 Fair price", tone: "blue" },
  WAIT: { label: "可以等等 Consider waiting", tone: "amber" },
  NOT_ENOUGH_DATA: { label: "紀錄未夠 Not enough history", tone: "slate" },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({
    where: { slug },
    select: { title: true, bestLandedHkdCents: true, sourceCount: true, lastPricedAt: true, imageUrl: true },
  });
  if (!p) return {};
  const meta = productMeta({ title: p.title, bestHkdCents: p.bestLandedHkdCents, sourceCount: p.sourceCount, checkedAt: p.lastPricedAt });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `${publicOrigin()}/p/${slug}` },
    openGraph: { title: meta.title, description: meta.description, type: "website", locale: "zh_HK" },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { pools: { where: { status: "OPEN" }, take: 1 } },
  });
  if (!product) notFound();
  if (product.segment === "SUPERMARKET") {
    const me = await currentCustomer();
    return <SupermarketProduct productId={product.id} customerEmail={me?.email} />;
  }
  const prefs = parsePrefs((await cookies()).get(PREFS_COOKIE)?.value);
  const [priced, history, customer] = await Promise.all([priceProduct(product.id, { buyer: prefs }), dailyBestHistory(product.id), currentCustomer()]);
  if (!priced) notFound();

  const best = priced.offers.find((o) => o.offer.id === priced.bestOfferId);
  const passport = buySignal({ dailyBestCents: history.map((h) => h.cents), currentCents: best?.buyer.perUnitHkdCents ?? 0 });
  const pool = product.pools[0];
  // Single-unit checkout only when it is genuinely better than buying it yourself;
  // wholesale-only products sell through pools instead.
  const plan = product.fulfilMode === "FULFIL" && !product.restricted ? await fulfilmentPlan(product.id) : null;
  const singleViable = Boolean(plan?.price?.viable);
  // Structured data states what the page states: from the shown best price up, genuine-looking listings only.
  const jsonLd = best
    ? productJsonLd({
        title: product.title,
        brand: product.brand,
        imageUrl: product.imageUrl,
        url: `${publicOrigin()}/p/${product.slug}`,
        checkedAt: product.lastPricedAt,
        offers: priced.offers
          .filter((o) => !o.offer.suspectCounterfeit && o.buyer.perUnitHkdCents >= best.buyer.perUnitHkdCents)
          .map((o) => ({ landedHkdCents: o.buyer.perUnitHkdCents, inStock: o.offer.inStock })),
      })
    : null;

  return (
    <div className="space-y-8">
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }} /> : null}
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="flex gap-5">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-32 w-32 flex-none rounded-2xl bg-slate-100 object-cover" />
          ) : null}
          <div className="space-y-2">
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{product.title}</h1>
            {best ? (
              <>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-4xl font-black tabular-nums text-brand-700">{hkd(best.buyer.perUnitHkdCents)}</span>
                  <span className="text-sm text-slate-500">最平到手價（每件）via {PLATFORM_LABELS[best.offer.platform as Platform] ?? best.offer.platform}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {cheapestClaim(priced.offers.length, product.lastPricedAt ?? new Date())} · 假設 {PAY_LABEL[prefs.pay]}付款、{DELIVERY_LABEL[prefs.delivery]}
                </p>
                <BuyerPrefsToggle pay={prefs.pay} delivery={prefs.delivery} />
              </>
            ) : (
              <Notice>未有可信嘅最平來源 — 所有來源都未確認同款、缺貨或需要最低訂購量。No trustworthy cheapest source yet.</Notice>
            )}
            <ShareButtons title={product.title} url={`${publicOrigin()}/p/${product.slug}`} price={hkd(best?.buyer.perUnitHkdCents)} />
            <div className="flex flex-wrap gap-2">
              <Badge tone={SIGNAL[passport.signal].tone}>{SIGNAL[passport.signal].label}</Badge>
              {product.fulfilMode === "FULFIL" ? <Badge tone="green">可代買 Buy through us</Badge> : null}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {product.restricted ? (
            <Notice tone="red">受限類別：{product.restrictedReason}。我哋唔會代買或者上架，只提供比價。We only compare prices for this category.</Notice>
          ) : product.fulfilMode === "FULFIL" && singleViable ? (
            <BuyBox
              productId={product.id}
              signedIn={Boolean(customer)}
              slug={product.slug}
              indicativeCents={plan?.price?.priceCents ?? null}
              buyerRouteCents={plan?.buyerRouteCents ?? null}
            />
          ) : null}
          {pool ? (
            <Link href={`/pools/${pool.slug}`} className="card block border-amber-300 bg-amber-50 p-4">
              <div className="font-semibold">拼單中 Group buy open</div>
              <div className="text-sm">
                成團價 {hkd(tierFor(pool.committedQty, ladderOf(pool)).unitHkdCents)} / 件 · 已有 {pool.committedQty} 件 →
              </div>
            </Link>
          ) : null}
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold">減價通知 Price-drop alert</div>
            <WatchForm productId={product.id} defaultEmail={customer?.email} />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">各來源到手價 Every source, landed in HK</h2>
        <div className="space-y-3">
          {priced.offers.map(({ offer, buyer, rank, risk }) => {
            const isBest = offer.id === priced.bestOfferId;
            return (
              <div key={offer.id} className={`card p-4 ${isBest ? "border-2 border-brand-500" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={isBest ? "green" : "slate"}>{PLATFORM_LABELS[offer.platform as Platform] ?? offer.platform}</Badge>
                      {isBest ? <Badge tone="green">最平 Cheapest verified</Badge> : null}
                      {PLATFORM_ORIGIN[offer.platform as Platform] ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600" title="Parallel import: manufacturer warranty is usually regional">
                          {PLATFORM_ORIGIN[offer.platform as Platform].note}
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-500">
                        標價 {native(buyer.unitListingPriceNative, offer.currency)} · {offer.shopName ?? "—"} · 更新 {timeAgo(offer.lastCheckedAt)}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm">{offer.title}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {risk ? (
                        <Badge tone={risk.level === "LOW" ? "green" : risk.level === "MEDIUM" ? "amber" : "red"}>
                          {RISK_LABELS[risk.level]}
                        </Badge>
                      ) : null}
                      <Badge tone={rank.matchConfidence >= 0.85 ? "green" : rank.matchConfidence >= 0.6 ? "blue" : "amber"}>
                        同款置信度 {pct(rank.matchConfidence, 0)}
                      </Badge>
                      {rank.whyLow.map((w) => (
                        <Badge key={w} tone="amber">{w}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">{hkd(buyer.perUnitHkdCents)}</div>
                    <div className="text-xs text-slate-500">
                      到手價 / 件{buyer.unitsReceived > 1 ? ` · 最少買 ${buyer.unitsReceived} 件共 ${hkd(buyer.totalHkdCents)}` : ""}
                    </div>
                    <a href={`/go/${offer.id}`} rel="nofollow sponsored noopener" target="_blank" className="btn-secondary mt-2">
                      去買 Go to seller ↗
                    </a>
                  </div>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-slate-500">點計 Breakdown</summary>
                  <table className="table mt-2 max-w-md">
                    <tbody>
                      {buyer.breakdown.map((l) => (
                        <tr key={l.key}>
                          <td>{l.label}</td>
                          <td className="text-right tabular-nums">{hkd(l.hkdCents)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td>合計 Total ({buyer.unitsReceived} 件)</td>
                        <td className="text-right tabular-nums">{hkd(buyer.totalHkdCents)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {risk ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                      {risk.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  {buyer.assumptions.length ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                      {buyer.assumptions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  ) : null}
                </details>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">
          「去買」連結可能為我哋帶來佣金，唔影響排名 — 排名只睇到手價、同款置信度同賣家可靠度。Outbound links may earn a commission; ranking never depends on it.
        </p>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">價格護照 Price Passport</h2>
          <span className="text-xs text-slate-500">{passport.explanation}</span>
        </div>
        <PassportChart points={history} />
        {passport.lowCents != null ? (
          <div className="flex flex-wrap gap-6 text-sm">
            <span>最低 Low <b>{hkd(passport.lowCents)}</b></span>
            <span>中位數 Median <b>{hkd(passport.medianCents)}</b></span>
            <span>最高 High <b>{hkd(passport.highCents)}</b></span>
          </div>
        ) : null}
      </section>
    </div>
  );
}
