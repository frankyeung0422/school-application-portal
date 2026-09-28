import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { jsonError, readBody } from "@/lib/http";
import { executeAction, rejectAction, resetKillSwitch, tripKillSwitch } from "@/lib/actions/bus";
import { ACTION_KINDS, type ActionKind } from "@/lib/actions/kinds";
import { appendAudit } from "@/lib/actions/audit";
import { reviewEligibility, verifyMatchByHuman } from "@/lib/fulfil";
import { requestOpenPool } from "@/lib/pools-service";
import { draftSocialPost, isChannel, proposeListing } from "@/lib/listings";
import { enqueueJob } from "@/lib/jobs/queue";
import { confirmSupplierPurchase, markSupplierOutcome } from "@/lib/orders";
import { setFlag } from "@/lib/settings";
import { postEntry } from "@/lib/ledger";
import { importCommissionReport } from "@/lib/affiliate-import";
import { PROGRAMMES, type Programme } from "@/lib/affiliate-reconcile";
import { FULFILMENT_MODES, JOB_TYPES, type JobType } from "@/lib/types";
import { isRetailer } from "@/lib/supermarket/retailers";

// One admin mutation endpoint. Every op re-checks admin, validates its input
// and goes through a service (and therefore the action bus where the op has an
// outside effect). Nothing here touches a payment provider or channel directly.

class BadInput extends Error {}

const n = (v: unknown, name: string) => {
  const x = Number(v);
  if (!Number.isFinite(x)) throw new BadInput(`${name} must be a number`);
  return x;
};
const pctIn = (v: unknown, name: string, max = 0.5) => {
  const x = n(v, name);
  if (x < 0 || x > max) throw new BadInput(`${name} must be between 0 and ${max}`);
  return x;
};
const str = (v: unknown, name: string) => {
  const s = String(v ?? "").trim();
  if (!s) throw new BadInput(`${name} required`);
  return s;
};

const FLAG_RULES: Record<string, (v: unknown) => string> = {
  "fx.bufferPct": (v) => String(pctIn(v, "fx.bufferPct", 0.05)),
  "fx.wallet.ALIPAYHK": (v) => String(pctIn(v, "fx.wallet.ALIPAYHK", 0.05)),
  "fx.wallet.WECHATPAYHK": (v) => String(pctIn(v, "fx.wallet.WECHATPAYHK", 0.05)),
  "pricing.targetMarginPct": (v) => String(pctIn(v, "pricing.targetMarginPct", 0.6)),
  "fx.settlementRail": (v) => str(v, "fx.settlementRail"),
  "pools.maxAbsorbPct": (v) => String(pctIn(v, "pools.maxAbsorbPct", 0.2)),
  "channels.maxRepricePct": (v) => String(pctIn(v, "channels.maxRepricePct", 0.5)),
  "quotes.ttlMinutes": (v) => String(Math.max(1, Math.min(120, Math.round(n(v, "quotes.ttlMinutes"))))),
  "eligibility.minWatches": (v) => String(Math.max(0, Math.round(n(v, "minWatches")))),
  "eligibility.minClicks": (v) => String(Math.max(0, Math.round(n(v, "minClicks")))),
  "eligibility.minMatch": (v) => String(pctIn(v, "minMatch", 1)),
  "eligibility.minMarginPct": (v) => String(pctIn(v, "minMarginPct", 0.6)),
  "eligibility.maxPriceAgeHours": (v) => String(Math.max(1, Math.round(n(v, "maxPriceAgeHours")))),
  runMode: (v) => {
    if (v !== "DRY" && v !== "LIVE") throw new BadInput("runMode must be DRY or LIVE");
    return v;
  },
  "payments.liveUnlocked": (v) => {
    if (v !== "YES" && v !== "NO") throw new BadInput("payments.liveUnlocked must be YES or NO");
    return v;
  },
};

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const b = await readBody(req);
    const actor = admin.email;

    switch (b.op) {
      case "approve":
        return NextResponse.json(await executeAction(str(b.actionId, "actionId"), actor));
      case "reject":
        return NextResponse.json({ ok: await rejectAction(str(b.actionId, "actionId"), actor, b.reason || "rejected") });
      case "reviewEligibility":
        return NextResponse.json(await reviewEligibility(n(b.productId, "productId"), actor));
      case "verifyMatch":
        return NextResponse.json(await verifyMatchByHuman(n(b.offerId, "offerId"), n(b.anchorOfferId, "anchorOfferId"), actor));
      case "supplierMode": {
        if (!(FULFILMENT_MODES as readonly string[]).includes(b.mode)) throw new BadInput("invalid mode");
        const s = await prisma.supplier.update({ where: { id: n(b.supplierId, "supplierId") }, data: { fulfilmentMode: b.mode } });
        await appendAudit({ actor, kind: "SUPPLIER_MODE", verdict: "SET", detail: { supplierId: s.id, mode: b.mode } });
        return NextResponse.json({ ok: true });
      }
      case "proposePool":
        return NextResponse.json(await requestOpenPool(n(b.productId, "productId"), actor, b.days ? n(b.days, "days") : undefined));
      case "proposeListing": {
        if (!isChannel(b.channel)) throw new BadInput("invalid channel");
        const r = await proposeListing(n(b.productId, "productId"), b.channel, actor);
        return NextResponse.json({ listingId: r.listing.id, outcome: r.outcome });
      }
      case "draftSocial": {
        if (b.platform !== "FACEBOOK" && b.platform !== "INSTAGRAM") throw new BadInput("invalid platform");
        const r = await draftSocialPost(n(b.productId, "productId"), b.platform, actor);
        return NextResponse.json({ postId: r.post.id, status: r.post.status, outcome: r.outcome });
      }
      case "enqueueJob": {
        if (!(JOB_TYPES as readonly string[]).includes(b.type) || ["SEARCH_CRAWL", "CLUSTER", "PASTE_FETCH", "TRAVEL_SEARCH"].includes(b.type)) throw new BadInput("invalid job type");
        const payload = b.productId ? { productIds: [n(b.productId, "productId")] } : b.force === "true" ? { force: true } : {};
        const job = await enqueueJob(b.type as JobType, payload, { dedupeKey: `manual:${b.type}:${b.productId ?? ""}` });
        return NextResponse.json({ jobId: job.id });
      }
      case "confirmPurchase":
        return NextResponse.json({
          supplierOrderId: await confirmSupplierPurchase({
            supplierOrderId: n(b.supplierOrderId, "supplierOrderId"),
            externalRef: str(b.externalRef, "externalRef"),
            nativeAmountPaid: n(b.nativeAmountPaid, "nativeAmountPaid"),
            actualDebitedHkdCents: Math.round(n(b.actualDebitedHkd, "actualDebitedHkd") * 100),
            actor,
          }),
        });
      case "supplierOutcome": {
        if (!["SHIPPED", "RECEIVED", "FAILED"].includes(b.outcome)) throw new BadInput("invalid outcome");
        await markSupplierOutcome(n(b.supplierOrderId, "supplierOrderId"), b.outcome as "SHIPPED" | "RECEIVED" | "FAILED", b.trackingNo || undefined);
        return NextResponse.json({ ok: true });
      }
      case "setFlag": {
        const rule = FLAG_RULES[b.key];
        if (!rule) throw new BadInput("unknown flag");
        const value = rule(b.value);
        await setFlag(b.key, value);
        await appendAudit({ actor, kind: "SETTING", verdict: "SET", detail: { key: b.key, value } });
        return NextResponse.json({ ok: true, value });
      }
      case "killSwitch":
        if (b.state === "ON") await tripKillSwitch(b.reason || "manual", actor);
        else await resetKillSwitch(actor);
        return NextResponse.json({ ok: true });
      case "sourceConfig": {
        await prisma.sourceConfig.update({
          where: { platform: str(b.platform, "platform") },
          data: {
            shipToHkHkd: n(b.shipToHkHkd, "shipToHkHkd"),
            freeShipOverNative: b.freeShipOverNative === "" || b.freeShipOverNative == null ? null : n(b.freeShipOverNative, "freeShipOverNative"),
            domesticShipNative: n(b.domesticShipNative, "domesticShipNative"),
            forwarderPerKgHkd: n(b.forwarderPerKgHkd, "forwarderPerKgHkd"),
            forwarderMinHkd: n(b.forwarderMinHkd, "forwarderMinHkd"),
            assumedWeightKg: n(b.assumedWeightKg, "assumedWeightKg"),
            cardFxMarkupPct: pctIn(b.cardFxMarkupPct, "cardFxMarkupPct", 0.1),
            affiliateCommissionPct: pctIn(b.affiliateCommissionPct, "affiliateCommissionPct", 0.5),
            officialFreeToPickup: b.officialFreeToPickup === "true" || b.officialFreeToPickup === "on",
            officialFreeMaxKg: b.officialFreeMaxKg === "" || b.officialFreeMaxKg == null ? null : Math.max(0, n(b.officialFreeMaxKg, "officialFreeMaxKg")),
            homeDeliverySurchargeHkd: Math.max(0, n(b.homeDeliverySurchargeHkd ?? 0, "homeDeliverySurchargeHkd")),
            enabled: b.enabled === "true" || b.enabled === "on",
          },
        });
        await appendAudit({ actor, kind: "SETTING", verdict: "SOURCE", detail: { platform: b.platform } });
        return NextResponse.json({ ok: true });
      }
      case "fxRail": {
        await prisma.fxRail.update({
          where: { name: str(b.name, "name") },
          data: { bps: Math.round(n(b.bps, "bps")), minFeeHkdCents: Math.round(n(b.minFeeHkd, "minFeeHkd") * 100), active: b.active === "true" || b.active === "on" },
        });
        return NextResponse.json({ ok: true });
      }
      case "channelAccount": {
        await prisma.channelAccount.update({
          where: { platform: str(b.platform, "platform") },
          data: {
            commissionPct: pctIn(b.commissionPct, "commissionPct", 0.5),
            paymentFeePct: pctIn(b.paymentFeePct, "paymentFeePct", 0.2),
            fixedFeeHkdCents: Math.round(n(b.fixedFeeHkd, "fixedFeeHkd") * 100),
            marginFloorPct: pctIn(b.marginFloorPct, "marginFloorPct", 0.6),
          },
        });
        return NextResponse.json({ ok: true });
      }
      case "envelope": {
        // Append-only: a new version, never an edit of the old one.
        const cents = Math.round(n(b.maxHkd, "maxHkd") * 100);
        if (cents < 0) throw new BadInput("maxHkd must be ≥ 0");
        const last = await prisma.capitalEnvelope.findFirst({ orderBy: { version: "desc" } });
        const env = await prisma.capitalEnvelope.create({ data: { version: (last?.version ?? 0) + 1, maxOpenExposureHkdCents: cents, note: b.note || null } });
        await appendAudit({ actor, kind: "ENVELOPE", verdict: "NEW_VERSION", detail: { version: env.version, cents } });
        return NextResponse.json({ version: env.version });
      }
      case "reviewReport": {
        if (b.decision !== "APPROVED" && b.decision !== "REJECTED") throw new BadInput("invalid decision");
        const { reviewReport } = await import("@/lib/instore/service");
        const r = await reviewReport(n(b.reportId, "reportId"), b.decision, actor, b.reason);
        await appendAudit({ actor, kind: "PRICE_REPORT", verdict: b.decision, detail: { reportId: r.id, retailer: r.retailer, priceCents: r.priceCents } });
        return NextResponse.json({ ok: true, status: r.status });
      }
      case "clearCounterfeit": {
        const { clearCounterfeitFlag } = await import("@/lib/luxury/screen");
        const o = await clearCounterfeitFlag(n(b.offerId, "offerId"), actor);
        await appendAudit({ actor, kind: "COUNTERFEIT", verdict: "CLEARED", detail: { offerId: o.id, title: o.title.slice(0, 80) } });
        return NextResponse.json({ ok: true });
      }
      case "screenLuxury": {
        const { screenLuxuryOffers } = await import("@/lib/luxury/screen");
        return NextResponse.json(await screenLuxuryOffers());
      }
      case "seedLuxury": {
        const { seedLuxurySearches } = await import("@/lib/luxury/view");
        return NextResponse.json(await seedLuxurySearches());
      }
      case "retailerConfig": {
        const code = str(b.code, "code");
        if (!isRetailer(code)) throw new BadInput("unknown retailer");
        // Blank = unknown. Unknown terms are left out of basket delivery maths, never guessed.
        const optCents = (v: unknown, name: string) => (v === "" || v == null ? null : Math.round(n(v, name) * 100));
        await prisma.retailerConfig.upsert({
          where: { code },
          create: { code, deliveryFeeCents: optCents(b.deliveryFeeHkd, "deliveryFeeHkd"), freeDeliveryOverCents: optCents(b.freeOverHkd, "freeOverHkd") },
          update: { deliveryFeeCents: optCents(b.deliveryFeeHkd, "deliveryFeeHkd"), freeDeliveryOverCents: optCents(b.freeOverHkd, "freeOverHkd") },
        });
        await appendAudit({ actor, kind: "SETTING", verdict: "RETAILER", detail: { code } });
        return NextResponse.json({ ok: true });
      }
      case "policy": {
        if (!(ACTION_KINDS as readonly string[]).includes(b.kind)) throw new BadInput("invalid kind");
        if (!["AUTO", "APPROVE", "BLOCK"].includes(b.mode)) throw new BadInput("invalid mode");
        await prisma.actionPolicy.upsert({
          where: { kind: b.kind as ActionKind },
          create: { kind: b.kind, mode: b.mode },
          update: { mode: b.mode },
        });
        await appendAudit({ actor, kind: "POLICY", verdict: "SET", detail: { kind: b.kind, mode: b.mode } });
        return NextResponse.json({ ok: true });
      }
      case "affiliate": {
        // Only commissions a programme has actually reported — with its reference.
        const ref = str(b.reference, "reference");
        const cents = Math.round(n(b.amountHkd, "amountHkd") * 100);
        if (cents <= 0) throw new BadInput("amount must be positive");
        const e = await postEntry({
          kind: "AFFILIATE",
          amountHkdCents: cents,
          realness: "REAL",
          sourceRef: `affiliate:${str(b.platform, "platform")}:${ref}`,
          channel: b.platform,
          memo: `Reported commission ${ref}`,
        });
        return NextResponse.json({ entryId: e.id });
      }
      case "importCommissions": {
        // A programme's own report: books only what it says was earned (lib/affiliate-import.ts).
        if (!(PROGRAMMES as string[]).includes(b.programme)) throw new BadInput("programme must be AMAZON or EBAY");
        const csv = str(b.csv, "csv");
        if (csv.length > 5_000_000) throw new BadInput("report too large (5 MB max)");
        const currency = String(b.currency ?? "USD").trim().toUpperCase() || "USD";
        if (!/^[A-Z]{3}$/.test(currency)) throw new BadInput("currency must be a 3-letter code");
        const realness = b.realness === "TEST" ? "TEST" : "REAL";
        const r = await importCommissionReport({ programme: b.programme as Programme, csv, currency, realness });
        await appendAudit({ actor, kind: "AFFILIATE_IMPORT", verdict: realness, detail: { programme: b.programme, ...r, errors: r.errors.slice(0, 5) } });
        return NextResponse.json({
          status: r.errors.length && !r.rows ? "failed" : "ok",
          reason: `${r.rows} rows · booked ${r.booked} (HK$${(r.bookedHkdCents / 100).toFixed(2)}) · pending ${r.pending} · reversed ${r.reversed} · already booked ${r.alreadyBooked}${r.unattributed ? ` · ${r.unattributed} without sub-ID` : ""}${r.errors.length ? ` · ${r.errors[0]}` : ""}`,
        });
      }
      default:
        throw new BadInput(`unknown op ${b.op}`);
    }
  } catch (e) {
    if (e instanceof BadInput) return NextResponse.json({ error: e.message }, { status: 400 });
    return jsonError(e);
  }
}
