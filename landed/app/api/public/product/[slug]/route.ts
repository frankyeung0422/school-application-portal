import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { priceProduct } from "@/lib/catalog";
import { cheapestClaim } from "@/lib/claims";
import { publicOrigin } from "@/lib/listings";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";
import { OPW_ATTRIBUTION, retailerName } from "@/lib/supermarket/retailers";
import { rowsFromOffers } from "@/lib/supermarket/view";

// Public, read-only JSON for assistants and integrations: the same facts as the
// page, with the check time and the only claim wording we stand behind. No
// internal ids, no outbound tracking links (those are for people who click).

export const dynamic = "force-dynamic";

const round = (c: number | null | undefined) => (c == null ? null : Math.round(c) / 100);

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { offers: true } });
  if (!product) return NextResponse.json({ error: "not found" }, { status: 404 });
  const url = `${publicOrigin()}/p/${slug}`;
  const headers = { "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*" };

  if (product.segment === "SUPERMARKET") {
    const rows = rowsFromOffers(product.offers, product.titleEn).filter((r) => r.inStock);
    return NextResponse.json(
      {
        title: product.title,
        url,
        kind: "hk-supermarket",
        currency: "HKD",
        prices: rows.map((r) => ({ chain: retailerName(r.retailer), shelfPrice: round(r.shelfCents), promotion: r.promoZh ?? r.promoEn, bestUnitPriceWithPromotion: round(r.deal?.unitCents), checkedAt: r.checkedAt })),
        attribution: OPW_ATTRIBUTION,
      },
      { headers },
    );
  }

  const priced = await priceProduct(product.id);
  if (!priced) return NextResponse.json({ error: "not priced" }, { status: 404 });
  const checkedAt = product.lastPricedAt ?? new Date();
  const genuine = priced.offers.filter((o) => !o.offer.suspectCounterfeit);
  return NextResponse.json(
    {
      title: product.title,
      url,
      kind: "cross-border",
      currency: "HKD",
      assumptions: "Delivered to Hong Kong per unit; card payment; collection at an HK pickup point where the platform offers it.",
      claim: priced.bestOfferId ? cheapestClaim(genuine.length, checkedAt) : null,
      checkedAt,
      sources: genuine.map((o) => ({
        platform: PLATFORM_LABELS[o.offer.platform as Platform] ?? o.offer.platform,
        landedPerUnit: round(o.buyer.perUnitHkdCents),
        best: o.offer.id === priced.bestOfferId,
        inStock: o.offer.inStock,
        breakdown: o.buyer.breakdown.map((l) => ({ line: l.label, hkd: round(l.hkdCents) })),
        assumptions: o.buyer.assumptions,
      })),
    },
    { headers },
  );
}
