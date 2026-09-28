# 到手價 Landed

**The price it really costs to get a product to a door in Hong Kong: item + seller shipping + domestic leg + forwarding + card FX fee.** It is compared across AliExpress, Amazon, eBay, Taobao, JD, 1688 and Alibaba.com, and turned into four revenue streams.

| # | Stream | How it earns (honestly) | Risk we carry |
|---|---|---|---|
| 1 | **Affiliate comparison** | The "Go to seller" link carries Amazon Associates or eBay Partner Network tags | None |
| 2 | **Buy through us** | We buy from B2B sources shoppers can't reach themselves (1688 factory price). We only sell when our all-in price beats the buyer's own card route | Refunds, supplier failure, all gated |
| 3 | **拼單 pools** | Buyers commit a saved card. At the supplier's wholesale tier we authorize, then capture, and place one bulk order | Cash exposure, capped by the capital envelope |
| 4 | **FX spread** | Quotes use mid + a disclosed buffer (1.5%). Suppliers are paid through Airwallex/Wise (~0.6%) instead of a card (~2%). The realised result is its own ledger line, and can be negative | FX moves between quote and payment |

**超市格價 Supermarkets & pharmacies:**
- About 2.7k items, updated daily from the Consumer Council's Online Price Watch open data (DATA.GOV.HK).
- Covered chains: PARKnSHOP, Wellcome, Market Place, AEON, DCH Food Mart, Lung Fung, Watsons, Mannings and Sa Sa.
- Product codes are shared across chains, so matching is exact.
- Promotions ("2 for $14", "Buy 2 get 1 free", "2nd half price" and more; 99.8% of live promo texts parse) become a real per-unit price. Deals are never stacked.
- `/basket` shows two answers for a whole shopping list: the cheapest single shop and the cheapest split across shops. Delivery fees are included only where an admin has entered them.

**奢侈品 Luxury (`/luxury`):**
- **The reference price is the brand's own boutique price, not a marketplace listing.** `OFFICIAL_SYNC` reads schema.org data straight from rolex.com and omegawatches.com for HK/JP/GB/US/SG, and the page shows which market is genuinely cheapest once tax is handled — Japan's 10% consumption tax is refundable, the UK's 20% VAT is not (abolished for tourists in 2021), US sales tax is added at the till.
- Every marketplace listing is then shown as a premium or discount against the official HK price.
- Brands that do not publish (Chanel, Hermès) or block automated access (Louis Vuitton, Tiffany, Cartier, Tudor) are listed with the reason instead of being silently absent.
- Watches, bags, jewellery and fragrance compared across platforms, with an explicit authenticity risk on every listing.
- The cheapest listing is very often the fake, so sources with endemic counterfeits (1688, Taobao, AliExpress) and prices far below the market median are shown but never presented as cheapest.
- Luxury is compare-only: it is restricted from our checkout, pools and channel listings the moment it is detected.
- Aftermarket goods (straps, bag organisers, bezel inserts) are classed as accessories, not luxury.

**門市實價 In-store prices (`/instore`):** every price above is a chain's *online* price, and three chains (優之良品, 優品360, 759阿信屋) publish no prices at all. Shoppers report what they saw on the shelf — amount, chain, branch, optional photo of the tag — and an admin approves each one before it appears, always labelled and dated. Photos live outside `/public` and are served by an API route that hides them until approval. Reported prices never enter the online-price ranking.

**最近分店 Nearest branch:** hovering the cheapest supermarket price offers the nearest branch of that chain — distance, walking time and a maps link — using ~545 Hong Kong shop locations from OpenStreetMap. Location is requested only on an explicit tap, used for that lookup, and never stored server-side.

Channel Autopilot lists approved products on the storefront, eBay, Shopify and Meta catalog, and drafts FB/IG posts. Each listing is re-checked against live supplier cost and repriced or delisted before it can sell at a loss. TikTok Shop, Shopee and HKTVmall are visible stubs until the seller accounts are approved.

## Run

**Windows: double-click `startup.bat`.** It frees the port, kills any stale worker, installs, migrates, seeds, starts the worker and the web UI in their own windows, waits for the site and opens it. `stop.bat` stops both. On any platform, `npm run start:all` does the same in one console.

Manually:

```bash
npm install
npx prisma migrate deploy
npm run seed -- --demo      # defaults + keyless demo catalogue + admin@landed.local / landed-admin-2026
npm run dev                 # http://localhost:6565
npm run worker              # REQUIRED: crawls, supermarket sync, store locations, FX, alerts, guard, pools
npm run verify              # typecheck + lint + 129 unit tests + honesty lint + 44 end-to-end money flows
npm run e2e                 # Playwright (dev server + demo DB)
```

A search for anything on `/search` fans out to live AliExpress, Amazon and eBay. On this server that takes about 60s for roughly 80 offers. Log in to 1688, Taobao or JD once with `npm run login -- 1688` to add them.

## The rules that keep it honest
- **"Cheapest" means cheapest you can actually buy.** A source only counts if all of these hold:
  - same product (≥0.6 confidence)
  - in stock
  - not an accessory
  - not forced up to an MOQ
  - consumer-reachable
  - not a suspicious outlier
  
  Claims are always "cheapest of N sources checked at HH:MM". `lintClaims` blocks everything else.
- **Nothing touches money or the outside world without the action bus** (`lib/actions/bus.ts`):
  - Order of checks: kill switch → idempotency → policy floor → earned autonomy → daily cap → hash-chained audit.
  - Enabling fulfilment, opening pools, refunds and cost-drift decisions are floor-locked to a human.
- **The ledger books money that moved, never estimates:**
  - Supplier cost and FX result sum to exactly what the rail debited.
  - TEST money is never added to REAL money.
  - Forecasts live on `/admin/forecast`.
- **Wholesale MOQ sources are pool-only.** A single order never buys 2 to ship 1.
- **DRY run mode is the default:** approved listings, posts and emails are simulated until you switch to LIVE.

## Keys, and what each unlocks (see `/admin/readiness`)
| Key | Unlocks |
|---|---|
| `GEMINI_API_KEY` | Image-based same-product matching. Without it matches cap at 0.70, so a human verifies on the admin product page |
| `AMAZON_ASSOCIATE_TAG`, `EBAY_EPN_CAMPAIGN_ID` | Affiliate revenue |
| `PAYMENT_DRIVER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Real checkout and pools. Live keys also need `payments.liveUnlocked=YES` |
| `EBAY_*`, `SHOPIFY_*`, `META_*` | Channel publishing (see `lib/channels/*.ts` for exact vars) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Price-drop emails |
| `SERPAPI_KEY`, `SERPAPI_MONTHLY_LIMIT` (default 100) | Live Google Flights / Hotels prices on `/travel` and rated, priced restaurants on `/near`. Without it travel shows labelled demo data and food falls back to OpenStreetMap. Every call counts against the monthly limit; results are cached (flights 6h, hotels 12h, food 24h per ~500 m cell) |
| `AUTH_SECRET`, `ADMIN_PASSWORD`, `APP_ORIGIN` | Required for any deployment |
