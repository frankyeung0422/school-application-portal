<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 到手價 Landed

HK-first engine for the cheapest **delivered** price (到手價) of any product. It has four parts:
1. Affiliate comparison.
2. Evidence-gated own checkout, with orders routed to the cheapest orderable supplier.
3. 拼單 threshold group-buys, which authorize then capture.
4. Channel Autopilot, which lists on eBay/Shopify/Meta with a margin guard.

Port **6565**. Stack: Next.js 16 + Prisma 7 (libsql, SQLite `dev.db`) + Tailwind v4 + a separate worker.

## Commands
- `npm run dev`: web on :6565. `npm run worker`: the job worker (`-- --drain` runs queued jobs once and exits).
- `npm run seed`: defaults. `npm run seed -- --demo` also adds a keyless fixture catalogue.
- `npm test`: vitest. `npm run verify`: typecheck + lint + test + honesty lint. `npm run e2e`: Playwright.
- `npm run login -- 1688`: one-time QR login for CN platforms.

## Architecture rules (do not break)
- **Pure engines have no DB access and are unit-tested:**
  - `lib/money/{landed,fx,pricing,margin}.ts`
  - `lib/{rank,passport,eligibility,routing,pools,claims,restricted,freshness,affiliate}.ts`
  - `lib/channels/guard.ts`
  - `lib/match/cluster.ts`
- **Services load and store, and call the engines:**
  - `lib/catalog.ts`, `lib/demand.ts`, `lib/fulfil.ts`, `lib/orders.ts`, `lib/pools-service.ts`, `lib/listings.ts`
- **Every side effect goes through the action bus** (`lib/actions/bus.ts` `requestAction` → policy → `executeAction`). Handlers live only in `lib/actions/handlers.ts`.
  - Routes never call payment `authorize`/`capture` or channel `publish`/`delist` directly. `scripts/verify-honesty.ts` checks this.
- **`lib/ledger.ts` is the only writer of LedgerEntry.**
  - It books money that moved, never estimates.
  - TEST money is never summed with REAL money.
  - Projections live in `lib/projections.ts` and must not be imported by ledger or P&L code.
- **Money is Int HKD cents.** Scraped source prices stay Float in their native currency.
- **SQLite has no enums:** use String columns with unions in `lib/types.ts`.
- **Run modes:**
  - `runMode` DRY (default): channel adapters and email never touch the network.
  - The kill switch blocks every non-protective action.
- **Claims:** only "cheapest of N sources checked at HH:MM" (`cheapestClaim`). `lintClaims` blocks everything else.

## Gotchas
- Tailwind v4: put custom CSS in `@layer components` (see `app/globals.css`). Don't `@apply` a custom class.
- Prisma 7 migrations: `prisma migrate dev` is interactive-blocked. Use `migrate diff --from-empty`/`--from-migrations` → `migrate deploy`.
- Heuristic (keyless) matching caps confidence at 0.70, so it cannot pass the 0.85 fulfil gate. A human verifies matches on the admin product page, or you set GEMINI_API_KEY.
- Never run two workers on one SQLite file.
- **"Buyer's own route"** only counts `CONSUMER_ACCESSIBLE_PLATFORMS`: 1688, Alibaba.com and PDD are shown, never counted as "cheapest you can get". Otherwise fulfilling from 1688 can never beat the buyer and the whole fulfil model reads as unviable.
- **MOQ-forced offers never route single orders** (`routeOrder` excludes them). They only feed pools via `bestPoolCandidate`. Eligibility takes evidence from whichever route (SINGLE/POOL) is viable.
- **`lowOutliers`:** live eBay returns teaser/partial listings far below the cluster median. They are flagged and can't be best until a human verifies them.
- **`priceProduct(id)` does not persist by default.** Only crawl/refresh/verify paths pass `{persist: true}`, so a page view never bumps freshness.
- **Slugs are ASCII-only** (CJK path segments broke curl/proxies). Chinese-only titles become `item-<id>`.
- Playwright 1.63 needs `npx playwright install chromium` (headless shell v1243) on this box.
- **Supermarkets (`lib/supermarket/*`, Product.segment = "SUPERMARKET"):**
  - Fed only by `SUPERMARKET_SYNC` (Consumer Council Price Watch JSON, ETag-skipped, every 3h). Offer.platform is the chain code; the promotion text lives in `Offer.attributes`.
  - Never run the cross-border pricer or crawler on these products. `priceProduct` refuses to persist them, and REFRESH_OFFERS and eligibility filter to segment GLOBAL.
  - Live feed quirks: some `code`s are numbers (normalizer coerces them), and a truncated feed (<100 items) is refused.
  - Show `OPW_ATTRIBUTION` (data terms).
  - "Biggest gap" ranks by saving vs median over non-outlier prices, not by % gap.
- **Luxury (`lib/luxury/*`, Product.segment = "LUXURY"):**
  - `detectLuxury` runs at product creation, but only when the title is NOT an accessory — bag organisers and bezel inserts are not Rolexes.
  - Luxury products are born `restricted`, so checkout/pools/listings are blocked by the existing gates.
  - `authenticityRisk` HIGH (replica-heavy platform, or price below `TOO_GOOD_RATIO` of the trusted median) can never be "cheapest" — `rankOffers({highCounterfeitRisk})`.
  - Clustering widens the price band to 0.003 for luxury keywords, so counterfeits cluster WITH the genuine listing and get flagged instead of becoming their own product.
- **Official prices (`lib/official/*`)**: brand boutique pages are the luxury reference price. Read via schema.org JSON-LD only (never CSS selectors) with the stealth browser, one browser per run, 1.5–4s between pages, daily `OFFICIAL_SYNC`. Prices are sanity-banded per currency and the market's expected currency must match, otherwise the row is a failure, not a price. `MARKET_RULES` holds the tax truth (JP refundable, GB not since 2021, US adds sales tax). Adding a brand = add a URL builder in `catalogue.ts`; if it blocks us, add it to `OFFICIAL_UNAVAILABLE` with the reason rather than leaving a gap.
- **Counterfeit screening (`lib/luxury/{risk,screen}.ts`)**: `counterfeitCheck` hides listings that cannot be genuine — below a brand+category floor (calibrated at ~¼ of entry retail so genuine pre-owned at 35–60% survives), below `OFFICIAL_FAKE_RATIO` of the brand's own HK price, or replica wording. Hidden, never deleted: `Offer.suspectCounterfeit` + reason, counted on the page, reviewable at /admin/counterfeits, and `clearedBy` makes a human decision permanent. Sub-items (pochette/wallet/charm) are ACCESSORY, not BAG — judging a pouch against handbag floors called genuine ones fake.
- **In-store reports (`lib/instore/*`)**: shopper-submitted prices for chains that publish nothing (`REPORT_ONLY_RETAILERS`) and for real shelf tags. Always PENDING → admin approves → shown labelled and dated; never merged into `bestLandedHkdCents` or any ranking. Photos are written to `data/uploads` (gitignored) and served only by `/api/instore/photo/[name]`, which 404s for non-admins until approval. Feed sync must use `OPW_RETAILERS`, not `RETAILERS`, or it will mark report-only chains' offers gone.
- **Store locations (`lib/stores/*`)**: OpenStreetMap via Overpass (bbox query, weekly `STORE_SYNC`, ODbL attribution required). `/api/stores/near` takes coordinates from the browser, uses them for that request only and never stores them. Geolocation needs HTTPS (or localhost) in the browser.
- **Startup:** `startup.bat` (Windows, two windows) and `npm run start:all` (any platform) both start web + worker. The worker is not optional: without it searches stay PENDING and no sync runs.
- **`npm run verify:flows`** builds `verify-flows.db` from scratch. It is the fastest way to check any change to orders/pools/listings/ledger.
