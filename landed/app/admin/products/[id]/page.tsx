import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fulfilmentPlan } from "@/lib/fulfil";
import { hkd, native, pct, safeJson, timeAgo } from "@/lib/format";
import { CHANNELS, CHANNEL_LABELS } from "@/lib/types";
import { Badge, Notice, PageTitle } from "@/components/ui";
import { OpForm } from "@/components/admin/op-form";

export const dynamic = "force-dynamic";

export default async function AdminProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      channelListings: true,
      socialPosts: { orderBy: { createdAt: "desc" }, take: 10 },
      pools: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!product) notFound();
  const plan = await fulfilmentPlan(productId);
  const offerIds = plan?.priced.offers.map((o) => o.offer.id) ?? [];
  const pairs = await prisma.matchPair.findMany({ where: { offerAId: { in: offerIds }, offerBId: { in: offerIds } } });
  const anchor = plan?.priced.offers.find((o) => o.offer.matchConfidence === 1)?.offer ?? plan?.priced.offers[0]?.offer;

  return (
    <div className="space-y-6">
      <PageTitle
        title={product.title}
        sub={<>
          <Link href={`/p/${product.slug}`} className="underline">storefront page</Link> · keyword “{product.keyword}” · priced {timeAgo(product.lastPricedAt)}
        </>}
        right={<div className="flex gap-2"><Badge tone={product.fulfilMode === "FULFIL" ? "green" : "slate"}>{product.fulfilMode}</Badge>{product.restricted ? <Badge tone="red">{product.restrictedReason}</Badge> : null}</div>}
      />

      <section className="card space-y-2 p-4 text-sm">
        <h2 className="font-bold">履約計劃 Fulfilment plan</h2>
        {plan?.chosen ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>供應 offer <b>#{plan.chosen.offerId}</b> ({plan.chosen.supplierMode})</div>
            <div>成本 cost (rail, buffered FX) <b>{hkd(plan.chosen.costCents)}</b></div>
            <div>自家售價 price <b>{hkd(plan.price?.priceCents)}</b> · 利潤 {pct(plan.price?.marginPct)}</div>
            <div>買家自己買 buyer route <b>{hkd(plan.buyerRouteCents)}</b> · {plan.price?.viable ? "viable" : plan.price?.reason}</div>
          </div>
        ) : (
          <Notice>{plan?.route.reason ?? "No plan"}</Notice>
        )}
        <div className="text-xs text-slate-500">{plan?.route.reason}</div>
      </section>

      <section className="flex flex-wrap gap-3">
        <OpForm op="proposePool" hidden={{ productId }} fields={[{ name: "days", label: "日數 days", type: "number", defaultValue: 7, width: "w-20" }]} label="提議拼單 Propose pool" tone="secondary" />
        <OpForm op="proposeListing" hidden={{ productId }} fields={[{ name: "channel", label: "渠道", type: "select", options: [...CHANNELS], defaultValue: "STOREFRONT", width: "w-40" }]} label="提議上架 Propose listing" tone="secondary" />
        <OpForm op="draftSocial" hidden={{ productId }} fields={[{ name: "platform", label: "平台", type: "select", options: ["FACEBOOK", "INSTAGRAM"], width: "w-36" }]} label="草擬帖文 Draft post" tone="secondary" />
        <OpForm op="enqueueJob" hidden={{ productId, type: "REFRESH_OFFERS" }} label="重新抓價 Recrawl" tone="secondary" />
      </section>

      <section className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr><th>來源 Offer</th><th>標價</th><th className="text-right">到手價/件</th><th>同款</th><th>供應商</th><th>核實</th></tr>
          </thead>
          <tbody>
            {plan?.priced.offers.map(({ offer, buyer, rank }) => {
              const pair = anchor && offer.id !== anchor.id
                ? pairs.find((m) => (m.offerAId === Math.min(offer.id, anchor.id) && m.offerBId === Math.max(offer.id, anchor.id)))
                : null;
              return (
                <tr key={offer.id}>
                  <td className="max-w-sm">
                    <div className="text-xs text-slate-500">#{offer.id} {offer.platform} · {offer.inStock ? "in stock" : "OUT"}</div>
                    <a href={offer.url} target="_blank" rel="noreferrer" className="text-brand-700 underline">{offer.title}</a>
                    {rank.whyLow.length ? <div className="mt-1 text-xs text-amber-700">{rank.whyLow.join(" · ")}</div> : null}
                  </td>
                  <td className="whitespace-nowrap">{native(offer.latestPrice, offer.currency)}{offer.moq ? ` · MOQ ${offer.moq}` : ""}</td>
                  <td className="text-right tabular-nums">{hkd(buyer.perUnitHkdCents)}</td>
                  <td>
                    {(offer.matchConfidence ?? 0).toFixed(2)}
                    {pair ? <div className="text-xs text-slate-400">{pair.model}: {pair.reason}</div> : null}
                  </td>
                  <td className="text-xs">
                    {offer.supplier ? (
                      <Link className="underline" href="/admin/suppliers">{offer.supplier.shopName}</Link>
                    ) : "—"}
                    <div>{offer.supplier?.fulfilmentMode ?? "—"}</div>
                  </td>
                  <td>
                    {anchor && offer.id !== anchor.id && (offer.matchConfidence ?? 0) < 1 ? (
                      <OpForm op="verifyMatch" hidden={{ offerId: offer.id, anchorOfferId: anchor.id }} label="人手核實同款" tone="secondary" confirm={`Confirm offer #${offer.id} is the same product as #${anchor.id}? Compare photos, model, size and pack count first.`} />
                    ) : offer.id === anchor?.id ? <Badge>anchor</Badge> : <Badge tone="green">verified</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 text-sm">
          <h3 className="mb-2 font-bold">上架 Listings</h3>
          {product.channelListings.length ? product.channelListings.map((l) => (
            <div key={l.id} className="border-b border-slate-100 py-1">
              {CHANNEL_LABELS[l.platform as keyof typeof CHANNEL_LABELS] ?? l.platform}: <Badge tone={l.status === "LIVE" ? "green" : "slate"}>{l.status}</Badge> {hkd(l.priceHkdCents)} {l.dryRun && l.status === "LIVE" ? <Badge tone="blue">DRY</Badge> : null}
              <div className="text-xs text-slate-500">{l.lastGuardVerdict ?? l.delistReason ?? ""}</div>
            </div>
          )) : <p className="text-slate-400">—</p>}
        </section>
        <section className="card p-4 text-sm">
          <h3 className="mb-2 font-bold">帖文 Posts</h3>
          {product.socialPosts.length ? product.socialPosts.map((s) => (
            <div key={s.id} className="border-b border-slate-100 py-1">
              {s.platform} <Badge tone={s.status === "PUBLISHED" ? "green" : s.status === "BLOCKED" ? "red" : "slate"}>{s.status}</Badge>
              {safeJson<{ rule: string }[]>(s.lintIssues, []).map((i) => <Badge key={i.rule} tone="red">{i.rule}</Badge>)}
            </div>
          )) : <p className="text-slate-400">—</p>}
        </section>
        <section className="card p-4 text-sm">
          <h3 className="mb-2 font-bold">拼單 Pools</h3>
          {product.pools.length ? product.pools.map((p) => (
            <div key={p.id} className="border-b border-slate-100 py-1">
              <Link href={`/pools/${p.slug}`} className="underline">{p.slug}</Link> <Badge>{p.status}</Badge> {p.committedQty} committed
            </div>
          )) : <p className="text-slate-400">—</p>}
        </section>
      </div>
    </div>
  );
}
