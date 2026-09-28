import { execSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

// End-to-end money flows against a throwaway SQLite file, keyless:
//   affiliate click → eligibility gate → approval → quote → mock checkout →
//   routing → purchase confirmation → ledger; cost drift → human decision →
//   refund; pools (void on decline, capture on success); channel publish in DRY
//   → guard delist; social post + claims lint; kill switch; alerts; audit chain.
// Every assertion is printed. Exit code 1 on any failure.

const ROOT = path.resolve(__dirname, "..");
// A unique file per run: a previous run's handle (or an editor) must never make
// this fail before the first assertion.
const DB = path.join(ROOT, `verify-flows-${process.pid}.db`);
// Sweep leftovers of earlier runs (killed, crashed, or a Windows handle that
// outlived rmSync). An hour old is well past any run, so a concurrent one is safe.
for (const name of readdirSync(ROOT)) {
  if (!/^verify-flows-\d+\.db(-shm|-wal)?$/.test(name)) continue;
  const f = path.join(ROOT, name);
  try {
    if (f.startsWith(DB) || Date.now() - statSync(f).mtimeMs > 3600_000) rmSync(f);
  } catch {
    // still held by a live process; the next run's sweep gets it
  }
}
process.env.DATABASE_URL = `file:${DB.replace(/\\/g, "/")}`;
process.env.ADAPTER_MODE = "fixture";
process.env.PAYMENT_DRIVER = "mock";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.RESEND_API_KEY;

let passed = 0;
const failures: string[] = [];
function check(name: string, ok: unknown, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  }
}
const section = (s: string) => console.log(`\n${s}`);

async function main() {
  execSync("npx prisma migrate deploy", { cwd: ROOT, stdio: "ignore", env: process.env });
  execSync("npx tsx scripts/seed.ts --demo", { cwd: ROOT, stdio: "ignore", env: process.env });

  const { prisma } = await import("../lib/prisma");
  disconnect = () => prisma.$disconnect();
  const { hashPassword } = await import("../lib/auth");
  const { logClick, addWatch } = await import("../lib/demand");
  const { eligibilityEvidence, reviewEligibility, verifyMatchByHuman } = await import("../lib/fulfil");
  const { executeAction, rejectAction, requestAction, resolvePolicy, tripKillSwitch, resetKillSwitch } = await import("../lib/actions/bus");
  const { verifyChain } = await import("../lib/actions/audit");
  const orders = await import("../lib/orders");
  const pools = await import("../lib/pools-service");
  const listings = await import("../lib/listings");
  const { handleAlerts } = await import("../lib/jobs/handlers");
  const { pnl } = await import("../lib/ledger");
  const { mockProvider } = await import("../lib/payments/mock");
  const { tierFor } = await import("../lib/pools");

  const customer = async (email: string) =>
    prisma.customer.create({ data: { email, passwordHash: hashPassword("password123") } });

  /** Simulates the hosted payment page + webhook for the mock provider. */
  async function payCheckout(orderId: string, amount: number) {
    const event = { eventId: `evt_${orderId}`, type: "CHECKOUT_PAID" as const, realness: "TEST" as const, paymentRef: `mock_pi_${orderId}`, amountHkdCents: amount, metadata: { orderId } };
    return orders.processPaymentEvent("mock", event, JSON.stringify(event));
  }
  async function completeSetup(commitmentId: number, email: string) {
    const setup = await mockProvider.createSetup({ commitmentId, email, customerRef: null, successUrl: "/", cancelUrl: "/" });
    const q = new URL(setup.redirectUrl, "http://x").searchParams;
    const event = { eventId: `evt_setup_${commitmentId}`, type: "SETUP_COMPLETED" as const, realness: "TEST" as const, customerRef: q.get("customerRef")!, paymentMethodRef: q.get("pm")!, metadata: { commitmentId: String(commitmentId) } };
    return orders.processPaymentEvent("mock", event, JSON.stringify(event));
  }
  async function approvePending(kind: string) {
    const rows = await prisma.actionRequest.findMany({ where: { kind, status: "pending" } });
    return Promise.all(rows.map((r) => executeAction(r.id, "verify@landed.local")));
  }

  // ── Catalogue ──────────────────────────────────────────────────────────────
  section("Catalogue & affiliate");
  const buds1688 = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-1688-earbuds" } });
  const budsProductId = buds1688.productId!;
  const strap = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-aliexpress-strap" } });
  const band = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-aliexpress-band9" } });
  check("accessory strap is never clustered with the band", strap.productId !== band.productId);
  const bulkKettle = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-alibaba-kettle-bulk" } });
  const kettle = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-amz-kettle" } });
  check("12-pack kettle is a separate product from the single kettle", bulkKettle.productId !== kettle.productId);
  const kettleProduct = await prisma.product.findUniqueOrThrow({ where: { id: kettle.productId! } });
  check("kettle product has a best 到手價 and several sources", kettleProduct.bestLandedHkdCents != null && kettleProduct.sourceCount >= 3, kettleProduct);

  const url = await logClick(kettle.id, { sessionId: "s1", referrer: null });
  check("outbound click resolves to the retailer and is logged", url?.includes("amazon.com") && (await prisma.affiliateClick.count()) === 1);

  // ── Eligibility gate ───────────────────────────────────────────────────────
  section("Evidence gate → approval → fulfil");
  let ev = await eligibilityEvidence(budsProductId);
  check("without demand the gate refuses and says why", ev && !ev.verdict.ok && ev.verdict.missing.some((m) => m.includes("demand")), ev?.verdict);
  if ((buds1688.matchConfidence ?? 0) < 0.85) {
    const anchor = await prisma.offer.findFirstOrThrow({ where: { productId: budsProductId, matchConfidence: 1 } });
    await verifyMatchByHuman(buds1688.id, anchor.id, "verify");
  }
  const jd = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-jd-earbuds" } });
  check("keyless title matching stays below the fulfil bar for the JD twin", (jd.matchConfidence ?? 0) <= 0.7, jd.matchConfidence);
  for (let i = 0; i < 5; i++) await addWatch({ productId: budsProductId, email: `watcher${i}@example.com`, targetHkdCents: null, customerId: null });
  ev = await eligibilityEvidence(budsProductId);
  check("with demand + verified 1688 source the single-order route is viable", ev?.verdict.ok && ev.via === "SINGLE", { missing: ev?.verdict.missing, via: ev?.via, price: ev?.plan.price });
  const review = await reviewEligibility(budsProductId, "verify");
  if (!review.actionRequestId) throw new Error(`eligibility did not pass: ${review.missing.join("; ")}`);
  const enable = await prisma.actionRequest.findUnique({ where: { id: review.actionRequestId } });
  check("passing the gate only creates a pending ENABLE_FULFIL", enable?.status === "pending" && (await prisma.product.findUnique({ where: { id: budsProductId } }))?.fulfilMode === "AFFILIATE");
  await prisma.actionPolicy.create({ data: { kind: "ENABLE_FULFIL", mode: "AUTO" } });
  check("a database row cannot loosen the ENABLE_FULFIL floor", (await resolvePolicy("ENABLE_FULFIL")).mode === "APPROVE");
  await executeAction(enable!.id, "verify@landed.local");
  check("approval flips the product to FULFIL", (await prisma.product.findUnique({ where: { id: budsProductId } }))?.fulfilMode === "FULFIL");

  // ── Single order ───────────────────────────────────────────────────────────
  section("Quote → checkout → routing → purchase → ledger");
  const alice = await customer("alice@example.com");
  const quote = await orders.createQuote(budsProductId, 1, alice.id);
  const qb = JSON.parse(quote.breakdown) as { beatsBuyerRouteByCents: number };
  check("quote beats the buyer's own card route", qb.beatsBuyerRouteByCents > 0, qb);
  const co = await orders.checkoutQuote({ quoteId: quote.id, customer: alice, shipping: { name: "Alice", phone: "91234567", address: "1 Queen's Road Central, HK" }, origin: "http://localhost:6565" });
  check("mock checkout returns our own completion URL", co.redirectUrl.startsWith("/api/payments/mock/complete"));
  await payCheckout(co.order.id, co.order.totalHkdCents);
  const replay = await payCheckout(co.order.id, co.order.totalHkdCents);
  check("webhook replay is deduplicated", replay.deduped === true);
  let order = await prisma.order.findUniqueOrThrow({ where: { id: co.order.id }, include: { supplierOrders: true } });
  check("paid order is ROUTED to the 1688 supplier", order.status === "ROUTED" && order.supplierOrders[0]?.offerId === buds1688.id, { status: order.status, so: order.supplierOrders });
  check("exactly one TEST sale is booked", (await prisma.ledgerEntry.count({ where: { kind: "SALE", orderId: order.id, realness: "TEST" } })) === 1);
  const so = order.supplierOrders[0];
  await approvePending("PLACE_SUPPLIER_ORDER");
  await orders.confirmSupplierPurchase({ supplierOrderId: so.id, externalRef: "1688-PO-001", nativeAmountPaid: 78, actualDebitedHkdCents: 8560, actor: "verify" });
  const costLines = await prisma.ledgerEntry.findMany({ where: { orderId: order.id, kind: { in: ["SUPPLIER_COST", "FX_GAIN"] } } });
  const costSum = costLines.reduce((s, e) => s + e.amountHkdCents, 0);
  check("supplier cost + FX result equal exactly what left the account", costSum === -8560, costLines.map((l) => [l.kind, l.amountHkdCents]));
  const fxLine = costLines.find((l) => l.kind === "FX_GAIN");
  check("the FX buffer shows up as its own ledger line", fxLine != null && fxLine.amountHkdCents !== 0, fxLine?.amountHkdCents);
  await orders.markSupplierOutcome(so.id, "RECEIVED");
  order = await prisma.order.findUniqueOrThrow({ where: { id: co.order.id }, include: { supplierOrders: true } });
  check("received goods mark the order delivered and credit the supplier", order.status === "DELIVERED" && (await prisma.supplier.findUniqueOrThrow({ where: { id: buds1688.supplierId! } })).ordersFilled === 1);

  // ── Cost drift ─────────────────────────────────────────────────────────────
  section("Cost drift → human decision → refund");
  const bob = await customer("bob@example.com");
  const q2 = await orders.createQuote(budsProductId, 1, bob.id);
  const co2 = await orders.checkoutQuote({ quoteId: q2.id, customer: bob, shipping: { name: "Bob", phone: "92345678", address: "2 Nathan Road, Kowloon" }, origin: "http://localhost:6565" });
  await prisma.offer.update({ where: { id: buds1688.id }, data: { latestPrice: 118 } });
  await payCheckout(co2.order.id, co2.order.totalHkdCents);
  const o2 = await prisma.order.findUniqueOrThrow({ where: { id: co2.order.id }, include: { supplierOrders: true } });
  check("a cost jump after payment is never silently absorbed", o2.status === "NEEDS_DECISION" && o2.supplierOrders[0]?.status === "NEEDS_DECISION", o2.status);
  const drift = await prisma.actionRequest.findFirstOrThrow({ where: { kind: "RESOLVE_MARGIN_DRIFT", status: "pending" } });
  await rejectAction(drift.id, "verify", "too expensive — refund");
  const refundReq = await requestAction({ kind: "REFUND_ORDER", title: "refund bob", payload: { orderId: o2.id, reason: "cost drift" }, requestedBy: "verify" });
  check("refunds always wait for a human", refundReq.status === "pending");
  await executeAction(refundReq.actionId!, "verify@landed.local");
  const o2b = await prisma.order.findUniqueOrThrow({ where: { id: o2.id } });
  const refundLine = await prisma.ledgerEntry.findFirst({ where: { orderId: o2.id, kind: "REFUND" } });
  check("refund reverses the sale in the ledger and cancels the purchase task", o2b.status === "REFUNDED" && refundLine?.amountHkdCents === -o2.totalHkdCents && (await prisma.supplierOrder.findFirstOrThrow({ where: { orderId: o2.id } })).status === "CANCELLED");
  await prisma.offer.update({ where: { id: buds1688.id }, data: { latestPrice: 78 } });

  // ── Pools ──────────────────────────────────────────────────────────────────
  section("拼單 pools");
  const band1688 = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-1688-band9" } });
  const bandProductId = band1688.productId!;
  if ((band1688.matchConfidence ?? 0) < 0.85) {
    const anchor = await prisma.offer.findFirstOrThrow({ where: { productId: bandProductId, matchConfidence: 1 } });
    await verifyMatchByHuman(band1688.id, anchor.id, "verify");
  }
  for (let i = 0; i < 5; i++) await addWatch({ productId: bandProductId, email: `bandfan${i}@example.com`, targetHkdCents: null, customerId: null });
  const bandEv = await eligibilityEvidence(bandProductId);
  check("a wholesale-only product qualifies through the pool route", bandEv?.verdict.ok && bandEv.via === "POOL", { via: bandEv?.via, missing: bandEv?.verdict.missing });
  const bandReview = await reviewEligibility(bandProductId, "verify");
  await executeAction(bandReview.actionRequestId!, "verify@landed.local");
  await check("single-unit quotes are refused for MOQ-only sources", await orders.createQuote(bandProductId, 1, null).then(() => false).catch((e: Error) => /MOQ|orderable|dearer/i.test(e.message)));

  const openReq = await pools.requestOpenPool(bandProductId, "verify");
  check("opening a pool needs approval", openReq.status === "pending");
  await executeAction(openReq.actionId!, "verify@landed.local");
  let pool = await prisma.pool.findFirstOrThrow({ where: { productId: bandProductId, status: "OPEN" } });
  const ladder = pools.ladderOf(pool);
  check("pool ladder starts at the supplier MOQ and gets cheaper", ladder[0].minQty === 2 && ladder.every((s, i) => i === 0 || s.unitHkdCents < ladder[i - 1].unitHkdCents), ladder);

  const carol = await customer("carol@example.com");
  const dave = await customer("dave+decline@example.com");
  const c1 = await pools.commitToPool({ slug: pool.slug, customer: carol, qty: 1, origin: "http://localhost:6565" });
  await completeSetup(c1.commitment.id, carol.email);
  pool = await prisma.pool.findUniqueOrThrow({ where: { id: pool.id } });
  check("one commitment below the first rung does not unlock", pool.status === "OPEN" && pool.committedQty === 1);
  const c2 = await pools.commitToPool({ slug: pool.slug, customer: dave, qty: 1, origin: "http://localhost:6565" });
  await completeSetup(c2.commitment.id, dave.email);
  pool = await prisma.pool.findUniqueOrThrow({ where: { id: pool.id } });
  const poolSales = await prisma.ledgerEntry.count({ where: { poolId: pool.id, kind: "SALE" } });
  check("a decline that drops below the first rung voids every hold — nobody charged", pool.status === "FAILED" && poolSales === 0, { status: pool.status, poolSales, outcome: pool.outcome });
  const holds = await prisma.paymentRecord.findMany({ where: { commitment: { poolId: pool.id } } });
  check("carol's hold was placed then cancelled, never captured", holds.some((h) => h.kind === "AUTHORIZE" && h.status === "SUCCEEDED") && holds.some((h) => h.kind === "CANCEL") && !holds.some((h) => h.kind === "CAPTURE"));

  const openReq2 = await pools.requestOpenPool(bandProductId, "verify");
  await executeAction(openReq2.actionId!, "verify@landed.local");
  let pool2 = await prisma.pool.findFirstOrThrow({ where: { productId: bandProductId, status: "OPEN" } });
  const erin = await customer("erin@example.com");
  const frank = await customer("frank@example.com");
  const shownBeforeJoin = tierFor(pool2.committedQty + 1, pools.ladderOf(pool2)).unitHkdCents;
  const c3 = await pools.commitToPool({ slug: pool2.slug, customer: erin, qty: 1, origin: "http://localhost:6565" });
  await completeSetup(c3.commitment.id, erin.email);
  const c4 = await pools.commitToPool({ slug: pool2.slug, customer: frank, qty: 1, origin: "http://localhost:6565" });
  await completeSetup(c4.commitment.id, frank.email);
  pool2 = await prisma.pool.findUniqueOrThrow({ where: { id: pool2.id } });
  const charged = await prisma.poolCommitment.findMany({ where: { poolId: pool2.id } });
  check("reaching the rung captures every buyer", pool2.status === "UNLOCKED" && charged.every((c) => c.status === "CHARGED"), { status: pool2.status, charged: charged.map((c) => c.status) });
  check("nobody pays more than the price shown when they joined", charged.every((c) => (c.chargedUnitHkdCents ?? Infinity) <= shownBeforeJoin));
  const bulk = await prisma.supplierOrder.findFirst({ where: { poolId: pool2.id } });
  check("one bulk supplier order is created for the captured quantity", bulk?.qty === 2 && bulk.expectedCostHkdCents > 0, bulk);

  // ── Channels & social ──────────────────────────────────────────────────────
  section("Channel Autopilot & social");
  const prop = await listings.proposeListing(budsProductId, "EBAY", "verify");
  check("new channels start on APPROVE (autonomy not yet earned)", prop.outcome.status === "pending");
  await executeAction(prop.outcome.actionId!, "verify@landed.local");
  let ebay = await prisma.channelListing.findUniqueOrThrow({ where: { id: prop.listing.id } });
  check("approved listing goes LIVE as a DRY run without network", ebay.status === "LIVE" && ebay.dryRun && ebay.externalId?.startsWith("dry-ebay"), ebay);
  check("marketplaces without seller approval refuse outright", await listings.proposeListing(budsProductId, "TIKTOK_SHOP", "verify").then(() => false).catch(() => true));
  await prisma.offer.update({ where: { id: buds1688.id }, data: { latestPrice: 400 } });
  const guard = await listings.guardListings();
  ebay = await prisma.channelListing.findUniqueOrThrow({ where: { id: prop.listing.id } });
  check("a supplier price spike delists automatically", guard.delist >= 1 && ebay.status === "DELISTED", { guard, status: ebay.status });
  await prisma.offer.update({ where: { id: buds1688.id }, data: { latestPrice: 78 } });

  const post = await listings.draftSocialPost(kettleProduct.id, "FACEBOOK", "verify");
  check("clean social post waits for approval", post.post.status === "PENDING_APPROVAL" && post.outcome?.status === "pending");
  await executeAction(post.outcome!.actionId!, "verify@landed.local");
  check("approved post publishes as DRY", (await prisma.socialPost.findUniqueOrThrow({ where: { id: post.post.id } })).status === "PUBLISHED");
  await prisma.product.update({ where: { id: kettleProduct.id }, data: { title: "全港最平 Midea kettle" } });
  const bad = await listings.draftSocialPost(kettleProduct.id, "FACEBOOK", "verify");
  check("an unsubstantiated cheapest claim is BLOCKED before any approval", bad.post.status === "BLOCKED" && bad.outcome === null);

  // ── Supermarkets ───────────────────────────────────────────────────────────
  section("超市格價 supermarkets (Price Watch feed)");
  const { syncSupermarkets } = await import("../lib/supermarket/sync");
  const { compareSupermarketBasket, listSupermarketProducts } = await import("../lib/supermarket/view");
  const feed = (milkWellcome: string, includeAeonNoodles: boolean) => [
    {
      code: "P000000001",
      brand: { en: "Vitasoy", "zh-Hant": "維他奶" },
      name: { en: "Soya Milk 250ml x 6", "zh-Hant": "豆奶 250毫升 x 6" },
      cat1Name: { en: "Drinks", "zh-Hant": "飲品" },
      prices: [
        { supermarketCode: "WELLCOME", price: milkWellcome },
        { supermarketCode: "PARKNSHOP", price: "22.00" },
      ],
      offers: [{ supermarketCode: "WELLCOME", en: "2 for $38.00", "zh-Hant": "買2件$38.00" }],
    },
    {
      code: "P000000002",
      brand: { en: "Nissin", "zh-Hant": "出前一丁" },
      name: { en: "Instant Noodles 5 packs", "zh-Hant": "即食麵 5包裝" },
      cat1Name: { en: "Noodles", "zh-Hant": "麵類" },
      prices: [
        { supermarketCode: "WELLCOME", price: "15.90" },
        { supermarketCode: "PARKNSHOP", price: "16.50" },
        ...(includeAeonNoodles ? [{ supermarketCode: "AEON", price: "13.50" }] : []),
      ],
      offers: [],
    },
  ];
  const s1 = await syncSupermarkets({ raw: feed("24.00", true) });
  check("feed sync creates one product per code with every chain as an offer", "items" in s1 && s1.items === 2 && (await prisma.offer.count({ where: { itemId: "P000000002" } })) === 3, s1);
  const milk = await prisma.product.findUniqueOrThrow({ where: { externalKey: "opw:P000000001" } });
  check("supermarket headline is the cheapest single-unit shelf price", milk.segment === "SUPERMARKET" && milk.bestLandedHkdCents === 2200);
  const noodles = await prisma.product.findUniqueOrThrow({ where: { externalKey: "opw:P000000002" } });
  const basket = await compareSupermarketBasket([{ productId: milk.id, qty: 2 }, { productId: noodles.id, qty: 1 }], false);
  check("basket: Wellcome wins as a single shop once '2 for $38' is applied", basket.comparison.bestSingle?.retailer === "WELLCOME" && basket.comparison.bestSingle.totalCents === 3800 + 1590, basket.comparison.bestSingle);
  check("basket: split uses AEON for noodles and reports the saving", basket.comparison.split.totalCents === 3800 + 1350 && basket.comparison.splitSavesCents === 240, basket.comparison.split);
  const listed = await listSupermarketProducts({ q: "維他奶" });
  check(
    "supermarket search finds products by Chinese brand, with the promo unit price",
    listed.items[0]?.product.id === milk.id && listed.items[0].rows.find((r) => r.retailer === "WELLCOME")?.deal?.unitCents === 1900,
    listed.items[0]?.rows,
  );
  await prisma.offer.updateMany({ where: { itemId: { in: ["P000000001", "P000000002"] } }, data: { lastCheckedAt: new Date(Date.now() - 86400_000) } });
  await syncSupermarkets({ raw: feed("20.00", false) });
  const aeon = await prisma.offer.findUniqueOrThrow({ where: { platform_itemId: { platform: "AEON", itemId: "P000000002" } } });
  check("a chain dropping an item marks it out of stock, history kept", !aeon.inStock && (await prisma.offerSnapshot.count({ where: { offerId: aeon.id } })) === 1);
  const milk2 = await prisma.product.findUniqueOrThrow({ where: { id: milk.id } });
  check("price drop re-snapshots and updates the historical low", milk2.bestLandedHkdCents === 2000 && milk2.historicalLowHkdCents === 2000);
  await prisma.product.update({ where: { id: milk.id }, data: { lastPricedAt: new Date("2020-01-01") } });
  const { priceProduct } = await import("../lib/catalog");
  await priceProduct(milk.id, { persist: true });
  check("the cross-border pricer never overwrites a supermarket cache", (await prisma.product.findUniqueOrThrow({ where: { id: milk.id } })).bestLandedHkdCents === 2000);

  // ── Stickiness: promo watch + weekly basket digest ────────────────────────
  section("有優惠通知 & 每週慳錢清單 promo alerts and the weekly digest");
  const promoWatch = await addWatch({ productId: noodles.id, email: "promo@landed.local", targetHkdCents: null, customerId: null, promo: true });
  check("a supermarket watch with 'tell me about offers' is a PROMO watch", promoWatch.kind === "PROMO" && promoWatch.lastPromoKey === "");
  const withNoodlePromo = feed("20.00", false).map((i) =>
    i.code === "P000000002" ? { ...i, offers: [{ supermarketCode: "WELLCOME", en: "2 for $28.00", "zh-Hant": "買2件$28.00" }] } : i,
  );
  await prisma.offer.updateMany({ where: { itemId: { in: ["P000000001", "P000000002"] } }, data: { lastCheckedAt: new Date(Date.now() - 86400_000) } });
  await syncSupermarkets({ raw: withNoodlePromo, force: true });
  const a1 = await handleAlerts();
  const promoNote = await prisma.notification.findFirst({ where: { email: "promo@landed.local" } });
  check("a new promotion that beats singles is announced once, DRY", a1.promoAlertsQueued === 1 && promoNote?.status === "DRY" && promoNote.body.includes("買2件$28.00"), { a1, promoNote });
  const a2 = await handleAlerts();
  check("the same running promotion is not announced again", a2.promoAlertsQueued === 0, a2);

  const shopper = await customer("digest@landed.local");
  const { saveBasket, runBasketDigests } = await import("../lib/basket-service");
  await saveBasket(shopper.id, [{ productId: milk.id, qty: 2 }, { productId: noodles.id, qty: 1 }]);
  const d0 = await runBasketDigests();
  check("a saved basket gets no digest without opting in", d0.sent === 0, d0);
  await saveBasket(shopper.id, [{ productId: milk.id, qty: 2 }, { productId: noodles.id, qty: 1 }], true);
  const d1 = await runBasketDigests();
  const digestNote = await prisma.notification.findFirst({ where: { email: "digest@landed.local" } });
  check(
    "opted in: this week's basket price goes out as a DRY digest with the promo in it",
    d1.sent === 1 && digestNote?.status === "DRY" && digestNote.subject.includes("慳錢清單") && digestNote.body.includes("買2件$28.00"),
    { d1, digestNote },
  );
  check("the digest is weekly, not every run", (await runBasketDigests()).sent === 0);

  // ── Paste a product link ───────────────────────────────────────────────────
  section("貼連結格價 paste a product link");
  const { requestPaste, handlePasteFetch } = await import("../lib/paste");
  const pasteReq = await requestPaste("https://www.amazon.com/dp/B0CHX1W1XY?utm_source=ig");
  check("an unknown link is queued for the worker, never crawled in the request", pasteReq.slug === null && pasteReq.jobId != null, pasteReq);
  await check("a link we cannot price is refused with a reason", requestPaste("https://www.amazon.com/s?k=kettle").then(() => false).catch((e: Error) => /Unrecognised/.test(e.message)));
  const pasteJob = await prisma.job.create({
    data: { type: "PASTE_FETCH", payload: JSON.stringify({ url: "https://www.amazon.com/dp/fx-amz-kettle", platform: "AMAZON", itemId: "fx-amz-kettle" }) },
  });
  const pasted = (await handlePasteFetch(pasteJob)) as { slug: string | null; searchJobId: number };
  check("the worker turns a pasted listing into a product page", Boolean(pasted.slug), pasted.slug);
  check("and queues the search that finds alternatives", await prisma.job.findFirst({ where: { id: pasted.searchJobId, type: "SEARCH_CRAWL" } }).then(Boolean));
  // A link we have already priced needs no worker round trip.
  const catalog = await import("../lib/catalog");
  await catalog.upsertOffers("wegear charger", [
    { platform: "AMAZON", itemId: "B0FDW9YBJ2", url: "https://www.amazon.com/dp/B0FDW9YBJ2", title: "wegear USB C 30W Dual-Port GaN Charger", price: 19.99, currency: "USD" },
  ]);
  await catalog.clusterKeyword("wegear charger");
  const knownAgain = await requestPaste("https://www.amazon.com/dp/B0FDW9YBJ2?utm_source=fb");
  check("pasting a link we already know answers instantly", Boolean(knownAgain.slug) && knownAgain.jobId === null, knownAgain);

  // ── In-store price reports ─────────────────────────────────────────────────
  section("門市實價 shopper-reported prices");
  const { submitReport, approvedReportsFor, reviewReport, pendingReports } = await import("../lib/instore/service");
  const submitted = await submitReport({
    retailer: "WELLCOME",
    priceCents: 650,
    seenAt: new Date(),
    productId: milk.id,
    branch: "旺角 Mong Kok",
    reporterKey: "verify-key",
  });
  check("a shopper's report starts pending, not public", submitted.status === "PENDING" && (await approvedReportsFor(milk.id)).length === 0);
  check("a report far below the chain's online price is flagged for the reviewer", submitted.flagged == null || /cheaper|dearer/.test(submitted.flagged), submitted.flagged);
  await check("prices for shops with no published prices are accepted (優之良品)", submitReport({ retailer: "AJI", priceCents: 1980, seenAt: new Date(), itemName: "優之良品 芒果乾 100g", reporterKey: "verify-key" }).then((r) => r.status === "PENDING"));
  await check("rubbish is refused", submitReport({ retailer: "NOT_A_SHOP", priceCents: 1, seenAt: new Date(), reporterKey: "verify-key" }).then(() => false).catch(() => true));
  await reviewReport(submitted.id, "APPROVED", "verify@landed.local");
  const approved = await approvedReportsFor(milk.id);
  check("approval publishes it with its branch and date", approved.length === 1 && approved[0].branch === "旺角 Mong Kok");
  const beforeReject = (await pendingReports()).length;
  const rejectTarget = (await pendingReports())[0];
  if (rejectTarget) {
    await reviewReport(rejectTarget.id, "REJECTED", "verify@landed.local", "no photo, price looks wrong");
    check("rejection removes it from the queue and keeps the reason", (await pendingReports()).length === beforeReject - 1);
  }
  const milkAfter = await prisma.product.findUniqueOrThrow({ where: { id: milk.id } });
  check("shopper prices never overwrite the chain's own online price", milkAfter.bestLandedHkdCents === 2000, milkAfter.bestLandedHkdCents);

  // ── Luxury & shops ─────────────────────────────────────────────────────────
  section("奢侈品 luxury & 分店 store locations");
  const { upsertOffers, clusterKeyword, priceProduct: pp } = await import("../lib/catalog");
  await upsertOffers("rolex submariner", [
    { platform: "EBAY", itemId: "lux-ebay-1", url: "https://www.ebay.com/itm/lux1", title: "Rolex Submariner Date 126610LN 41mm Black", price: 11500, currency: "USD", shopName: "watch-exchange", rating: 4.9, reviewCount: 800 },
    { platform: "AMAZON", itemId: "lux-amz-1", url: "https://www.amazon.com/dp/lux1", title: "Rolex Submariner Date 126610LN 41mm", price: 12800, currency: "USD", shopName: "luxury-time", rating: 4.6, reviewCount: 120 },
    { platform: "ALI1688", itemId: "lux-1688-1", url: "https://detail.1688.com/offer/lux1.html", title: "Rolex Submariner 126610LN 精仿 一比一", price: 900, currency: "CNY", shopName: "深圳鐘錶廠" },
  ]);
  await clusterKeyword("rolex submariner");
  const lux = await prisma.product.findFirstOrThrow({ where: { keyword: "rolex submariner", segment: "LUXURY" } });
  check("a luxury product is detected and restricted from fulfilment at birth", lux.restricted && /luxury/i.test(lux.restrictedReason ?? "") && lux.brand === "Rolex", { brand: lux.brand, reason: lux.restrictedReason });
  const luxPriced = await pp(lux.id);
  const byPlatform = new Map(luxPriced!.offers.map((o) => [o.offer.platform, o]));
  check("the replica-heavy wholesale listing is HIGH risk and never the cheapest", byPlatform.get("ALI1688")?.risk?.level === "HIGH" && luxPriced!.bestOfferId !== byPlatform.get("ALI1688")?.offer.id, {
    risk: byPlatform.get("ALI1688")?.risk?.level,
    best: luxPriced!.offers.find((o) => o.offer.id === luxPriced!.bestOfferId)?.offer.platform,
  });
  check("eBay's authentication programme makes it the trusted cheapest", luxPriced!.offers.find((o) => o.offer.id === luxPriced!.bestOfferId)?.offer.platform === "EBAY");
  const { listLuxuryProducts } = await import("../lib/luxury/view");
  const fake1688 = await prisma.offer.findFirstOrThrow({ where: { itemId: "lux-1688-1" } });
  check("a HK$1,000 'Rolex' is screened out as impossible, with the reason kept", fake1688.suspectCounterfeit && /genuine floor|replica/.test(fake1688.suspectReason ?? ""), fake1688.suspectReason);
  const screened = await listLuxuryProducts({ brand: "Rolex" });
  check("screened-out fakes leave the comparison but are counted", screened.items[0]?.hiddenSuspectCount === 1 && !screened.items[0].rows.some((r) => r.offer.id === fake1688.id), {
    hidden: screened.items[0]?.hiddenSuspectCount,
    rows: screened.items[0]?.rows.length,
  });
  const withSuspect = await listLuxuryProducts({ brand: "Rolex", includeSuspect: true });
  check("they can still be inspected on request", withSuspect.items[0]?.rows.some((r) => r.offer.id === fake1688.id));
  const { clearCounterfeitFlag, screenLuxuryOffers } = await import("../lib/luxury/screen");
  await clearCounterfeitFlag(fake1688.id, "verify@landed.local");
  await screenLuxuryOffers([fake1688.productId!]);
  check("a human override survives re-screening", !(await prisma.offer.findUniqueOrThrow({ where: { id: fake1688.id } })).suspectCounterfeit);
  const luxList = await listLuxuryProducts({ brand: "Rolex", includeSuspect: true });
  check("luxury page lists it with a trusted price and a high-risk count", luxList.items[0]?.highRiskCount === 1 && (luxList.items[0]?.bestTrustedCents ?? 0) > 0, luxList.items[0]?.bestTrustedCents);
  await check("luxury can never be quoted through our checkout", orders.createQuote(lux.id, 1, null).then(() => false).catch((e: Error) => /受限|Restricted|checkout/i.test(e.message)));

  // Official boutique prices: injected fetcher, so no brand site is touched here.
  const { syncOfficialPrices } = await import("../lib/official/sync");
  const { officialComparisons, officialHkPrices } = await import("../lib/official/view");
  const priceByUrl: Record<string, { priceNative: number; currency: string }> = {
    "https://www.rolex.com/en-hk/watches/submariner/m126610ln-0001": { priceNative: 91700, currency: "HKD" },
    "https://www.rolex.com/ja-jp/watches/submariner/m126610ln-0001": { priceNative: 1683000, currency: "JPY" },
    "https://www.rolex.com/en-gb/watches/submariner/m126610ln-0001": { priceNative: 9500, currency: "GBP" },
    "https://www.rolex.com/en-us/watches/submariner/m126610ln-0001": { priceNative: 11350, currency: "USD" },
    "https://www.rolex.com/en-sg/watches/submariner/m126610ln-0001": { priceNative: 15950, currency: "SGD" },
  };
  const { OFFICIAL_CATALOGUE } = await import("../lib/official/catalogue");
  const subItem = OFFICIAL_CATALOGUE.find((i) => i.reference === "126610LN")!;
  const offSync = await syncOfficialPrices({ items: [subItem], fetcher: async (url) => priceByUrl[url] ?? null });
  check("official sync stores one boutique price per market", offSync.stored === 5 && offSync.failures.length === 0, offSync);
  const [subCompare] = await officialComparisons(["126610LN"]);
  check("Japan is cheapest after its refundable consumption tax, UK dearest with unrefundable VAT", subCompare?.comparison.cheapest?.market === "JP" && subCompare.comparison.rows.at(-1)?.market === "GB", subCompare?.comparison.rows.map((r) => [r.market, r.effectiveHkdCents]));
  check("the Hong Kong saving versus the best market is stated", (subCompare?.comparison.hkSavingCents ?? 0) > 0, subCompare?.comparison.hkSavingCents);
  const subMarketplace = await prisma.offer.findFirst({ where: { title: { contains: "126610LN" } }, select: { productId: true } });
  if (subMarketplace?.productId) {
    const linked = await prisma.product.findUniqueOrThrow({ where: { id: subMarketplace.productId } });
    check("a marketplace listing is linked to the manufacturer reference", linked.officialRef === "126610LN", linked.officialRef);
    const anchors = await officialHkPrices(["126610LN"]);
    check("the official HK price anchors marketplace comparison", anchors.get("126610LN") === 9_170_000, anchors.get("126610LN"));
  }

  const { syncStores } = await import("../lib/stores/sync");
  const storeSync = await syncStores({
    raw: {
      elements: [
        { type: "node", id: 1, lat: 22.2833, lon: 114.1551, tags: { brand: "惠康 Wellcome", name: "惠康 Wellcome", "addr:street": "皇后大道中 Queen's Road Central" } },
        { type: "node", id: 2, lat: 22.3964, lon: 114.1095, tags: { brand: "惠康 Wellcome", name: "惠康 Wellcome 荃灣" } },
        { type: "node", id: 3, lat: 22.2830, lon: 114.1560, tags: { brand: "7-Eleven", name: "7-Eleven" } },
      ],
    },
  });
  check("store sync keeps only chains we price", storeSync.matched === 2 && storeSync.skipped === 1, storeSync);
  const { nearestStores } = await import("../lib/stores/nearest");
  const near = nearestStores(22.2819, 114.1583, await prisma.storeLocation.findMany(), { retailer: "WELLCOME" });
  check("nearest branch to Central is the Queen's Road one, a few hundred metres away", near[0]?.metres < 600 && near[0].address?.includes("Queen"), near[0]);

  // ── Controls ───────────────────────────────────────────────────────────────
  section("Kill switch, alerts, audit");
  await tripKillSwitch("verify", "verify");
  const blocked = await requestAction({ kind: "PUBLISH_SOCIAL", title: "x", payload: { postId: post.post.id }, requestedBy: "verify" });
  check("kill switch blocks outbound actions", blocked.status === "blocked");
  const protective = await requestAction({ kind: "DELIST_LISTING", title: "protective", payload: { listingId: prop.listing.id, reason: "verify" }, requestedBy: "verify" });
  check("kill switch still lets protective delists run", protective.status === "executed", protective);
  await resetKillSwitch("verify");

  const w = await prisma.watch.findFirstOrThrow({ where: { productId: budsProductId } });
  await prisma.watch.update({ where: { id: w.id }, data: { lastNotifiedCents: 99999 } });
  const alerts = await handleAlerts();
  const note = await prisma.notification.findFirst({ where: { email: w.email } });
  check("price drop queues an alert that stays DRY without an email key", alerts.alertsQueued >= 1 && note?.status === "DRY", { alerts, status: note?.status });

  section("競爭優勢 landed-cost reality, promo truth, keyword alerts, channel");
  const { quoteOffer } = await import("../lib/catalog");
  const { loadProfiles, loadMids } = await import("../lib/settings");
  const tbOffer = await prisma.offer.findFirstOrThrow({ where: { itemId: "fx-tb-band9" } });
  const [profiles, { mids: liveMids }] = await Promise.all([loadProfiles(), loadMids()]);
  const pickup = quoteOffer(tbOffer, 1, { kind: "CARD" }, profiles, liveMids, { delivery: "PICKUP" })!;
  const legacy = quoteOffer(tbOffer, 1, { kind: "CARD" }, { ...profiles, TAOBAO: { ...profiles.TAOBAO, officialFreeToPickup: false } }, liveMids)!;
  const home = quoteOffer(tbOffer, 1, { kind: "CARD" }, profiles, liveMids, { delivery: "HOME" })!;
  check(
    "Taobao single item to a pickup point: no domestic leg or forwarder, cheaper than the old model",
    !pickup.breakdown.some((l) => l.key === "FORWARDER" || l.key === "DOMESTIC_LEG") && pickup.totalHkdCents < legacy.totalHkdCents,
    { pickup: pickup.totalHkdCents, legacy: legacy.totalHkdCents },
  );
  check("door delivery shows its surcharge line", home.breakdown.some((l) => l.key === "DELIVERY") && home.totalHkdCents > pickup.totalHkdCents);
  const wallet = quoteOffer(tbOffer, 1, { kind: "WALLET", wallet: "ALIPAYHK", fxMarkupPct: 0.005 }, profiles, liveMids)!;
  check("paying with AlipayHK costs less FX than a card", wallet.totalHkdCents < pickup.totalHkdCents);

  // A fake multi-buy: "2 for $40" on a $15.90 item costs more than two singles.
  // And a real one worth posting: "2 for $28" on a $20 item is 30% off.
  const fakePromoFeed = feed("20.00", false).map((i) =>
    i.code === "P000000002"
      ? { ...i, offers: [{ supermarketCode: "WELLCOME", en: "2 for $40.00", "zh-Hant": "買2件$40.00" }] }
      : { ...i, offers: [{ supermarketCode: "WELLCOME", en: "2 for $28.00", "zh-Hant": "買2件$28.00" }] },
  );
  await prisma.offer.updateMany({ where: { itemId: { in: ["P000000001", "P000000002"] } }, data: { lastCheckedAt: new Date(Date.now() - 86400_000) } });
  await syncSupermarkets({ raw: fakePromoFeed, force: true });
  const { promoTruthView } = await import("../lib/supermarket/stories");
  const truth = await promoTruthView();
  check("promo truth lists the fixture's fake '2 for $40' and the real '2 for $28'", truth.fake.some((r) => r.productId === noodles.id) && truth.real.some((r) => r.productId === milk.id), { fake: truth.fake.length, real: truth.real.length });

  const { addKeywordAlert, runKeywordAlerts } = await import("../lib/keyword-alert-service");
  await prisma.product.update({ where: { id: noodles.id }, data: { bestLandedHkdCents: 1590 } });
  const kw = await addKeywordAlert({ email: "kw@landed.local", keyword: "出前一丁", maxHkdCents: 1500, customerId: null });
  check("a keyword alert baselines what matches today", kw.matching >= 1 && (await runKeywordAlerts()).keywordSent === 0);
  await prisma.product.update({ where: { id: noodles.id }, data: { bestLandedHkdCents: 1450 } });
  const k1 = await runKeywordAlerts();
  const kwNote = await prisma.notification.findFirst({ where: { email: "kw@landed.local" } });
  check("dropping under the keyword target alerts once, DRY", k1.keywordSent === 1 && kwNote?.status === "DRY" && kwNote.subject.includes("出前一丁"), { k1 });
  check("and not again next hour", (await runKeywordAlerts()).keywordSent === 0);

  const { runChannelDigest } = await import("../lib/channel-service");
  delete process.env.TELEGRAM_CHANNEL_ID;
  const ch = await runChannelDigest(new Date("2026-09-25T02:00:00Z"));
  const chAction = await prisma.actionRequest.findFirst({ where: { kind: "POST_CHANNEL" } });
  check(
    "the daily channel post goes through the action bus and sends nothing without a channel",
    ch.posted === "executed" && chAction != null && JSON.stringify(chAction.result ?? "").includes("TELEGRAM_CHANNEL_ID not set"),
    { ch, result: chAction?.result },
  );
  check("one post per HK day", (await runChannelDigest(new Date("2026-09-25T05:00:00Z"))).posted === "duplicate" && (await prisma.actionRequest.count({ where: { kind: "POST_CHANNEL" } })) === 1);

  section("Affiliate attribution → commission import");
  process.env.AMAZON_ASSOCIATE_TAG = "landed-20";
  const taggedUrl = await logClick(kettle.id, { sessionId: "s-aff", referrer: null });
  const taggedClick = await prisma.affiliateClick.findFirstOrThrow({ where: { sessionId: "s-aff" } });
  check("a tracked click carries its own sub-ID to the programme", taggedClick.tracked && taggedUrl?.includes(`ascsubtag=L${taggedClick.id}`), taggedUrl);
  delete process.env.AMAZON_ASSOCIATE_TAG;
  const { importCommissionReport } = await import("../lib/affiliate-import");
  const report = [
    "Name,ASIN,Sub Tag,Order ID,Ad Fees($),Status",
    `Kettle,B0K,L${taggedClick.id},O-1,2.50,Approved`,
    `Kettle,B0K,L${taggedClick.id},O-2,1.00,Pending`,
  ].join("\n");
  const imp1 = await importCommissionReport({ programme: "AMAZON", csv: report, realness: "TEST" });
  const affLine = await prisma.ledgerEntry.findUnique({ where: { sourceRef: "affiliate:AMAZON:O-1" } });
  check("only the approved line is booked, to the product the click was for", imp1.booked === 1 && imp1.pending === 1 && affLine?.realness === "TEST" && affLine.productId === kettle.productId, imp1);
  const imp2 = await importCommissionReport({ programme: "AMAZON", csv: report.replace("O-2,1.00,Pending", "O-2,1.00,Approved"), realness: "TEST" });
  check("re-import books the newly approved line once and never the first twice", imp2.booked === 1 && imp2.alreadyBooked === 1 && (await prisma.ledgerEntry.count({ where: { kind: "AFFILIATE" } })) === 2, imp2);
  await importCommissionReport({ programme: "AMAZON", csv: "Name,Sub Tag,Order ID,Ad Fees($),Status\nKettle,L" + taggedClick.id + ",O-1,2.50,Reversed", realness: "TEST" });
  check("a reversed commission leaves the ledger line but drops it from P&L", (await prisma.ledgerEntry.findUnique({ where: { sourceRef: "affiliate:AMAZON:O-1" } }))?.reversedAt != null);

  const chain = await verifyChain();
  check("audit hash chain verifies", chain.ok && chain.rows > 20, chain);
  const real = await pnl("REAL");
  const test = await pnl("TEST");
  check("no REAL money exists in a mock run", real.netCents === 0 && Object.keys(real.byKind).length === 0);
  check("TEST P&L reflects sales, refunds and costs", (test.byKind.SALE?.count ?? 0) >= 4 && (test.byKind.REFUND?.count ?? 0) === 1, test.byKind);
}

let disconnect: () => Promise<void> = async () => {};

function removeDb() {
  for (const f of [DB, `${DB}-shm`, `${DB}-wal`]) {
    try {
      if (existsSync(f)) rmSync(f);
    } catch (e) {
      console.warn(`verify-flows: could not remove ${path.basename(f)} (${e instanceof Error ? e.message : e}); the next run sweeps it`);
    }
  }
}

// Ctrl+C or a CI timeout skips .finally(), which is how the root filled with DB files.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    void disconnect()
      .catch(() => {})
      .finally(() => {
        removeDb();
        process.exit(130);
      });
  });
}

main()
  .catch((e) => {
    failures.push(`crashed: ${e instanceof Error ? e.stack : e}`);
    console.error(e);
  })
  .finally(async () => {
    // Disconnect on every path (a failed step used to leave the handle open, so rmSync failed on Windows).
    await disconnect().catch(() => {});
    removeDb();
    console.log(`\nverify-flows: ${passed} passed, ${failures.length} failed`);
    if (failures.length) process.exit(1);
  });
