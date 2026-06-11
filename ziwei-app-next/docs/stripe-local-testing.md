# Stripe — local testing & webhook setup

The subscription state (who has access) is written **only** by the webhook handler
at `apps/web/src/app/api/stripe/webhook/route.ts`, on `checkout.session.completed`
and `customer.subscription.*` events. The `/checkout/success` page grants nothing.

So **if the webhook isn't receiving verified events, paying users get no access.**
The most common cause is a placeholder/missing `STRIPE_WEBHOOK_SECRET` — the app now
warns about this loudly at boot (see `lib/env.ts` `stripePreflight`).

This doc gets a full checkout → trial → access loop working against your local dev server.

## 0. Use TEST keys locally

Per `.env.local.example` the project convention is **TEST keys during dev, LIVE only at
cutover**. In `apps/web/.env.local` set a matching test pair:

```ini
STRIPE_SECRET_KEY="sk_test_..."                 # NOT sk_live_ locally
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # must match (both test)
STRIPE_PRICE_MONTHLY="price_..."                 # price IDs from your TEST mode products
STRIPE_PRICE_ANNUAL="price_..."
STRIPE_PRICE_MASTER="price_..."
STRIPE_TRIAL_DAYS=7
NEXT_PUBLIC_APP_URL="http://localhost:9001"      # success/cancel/return URLs
```

Test keys live in the Stripe Dashboard with the **“Test mode”** toggle ON →
Developers → API keys. Create the three products/prices in test mode and copy their
`price_…` IDs.

## 1. Install the Stripe CLI

```powershell
# Windows (scoop) — or grab the release from https://github.com/stripe/stripe-cli/releases
scoop install stripe
stripe login        # opens a browser, authorises the CLI to your account
```

## 2. Forward webhooks to the dev server

In its own terminal (leave it running):

```powershell
pnpm --filter @ziwei/web stripe:listen
# = stripe listen --forward-to localhost:9001/api/stripe/webhook
```

On start it prints:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Copy that `whsec_…` into `apps/web/.env.local`:

```ini
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then **restart the dev server** so the new secret is picked up. The boot warning about
a placeholder webhook secret should disappear.

> The `stripe listen` secret is stable per CLI install, so you only paste it once.

## 3. Run the app

```powershell
pnpm --filter @ziwei/web dev      # http://localhost:9001
```

## 4. Drive a real checkout

1. Register at `/register` (or use `/pricing` → pick a plan, which routes a logged-out
   user through `/register?plan=monthly` and straight into checkout).
2. On Stripe's hosted page use a test card:
   - `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.
3. You land on `/checkout/success`. Within a second or two the webhook fires
   `checkout.session.completed` → `syncSubscriptionToDb`, and premium unlocks
   (e.g. unlimited 師傅 chat; check `/account/billing`).

Watch the `stripe listen` terminal — each forwarded event prints with its HTTP status.
`200` = handled, `400` = signature/secret wrong, `500` = handler threw (Stripe retries).

## 5. Trigger lifecycle events without waiting

```powershell
pnpm --filter @ziwei/web stripe:trigger checkout.session.completed
stripe trigger customer.subscription.trial_will_end   # → trial-ending email
stripe trigger invoice.payment_failed                 # → dunning email (attempt 1)
stripe trigger customer.subscription.deleted          # → access revoked
```

The two email handlers (`handleTrialEnding`, `handleInvoiceFailed`) are best-effort:
they look up the user from `subscription.metadata.userId` (or the customer id) and send
via Resend. Email send failures are logged, not thrown, so they never cause a Stripe
retry. For the emails to actually deliver locally you also need a working
`SENDGRID_API_KEY` + `EMAIL_FROM`; otherwise you'll see a logged warning and the rest of
the webhook still succeeds.

## 6. Inspect state

```powershell
pnpm --filter @ziwei/web db:studio   # Prisma Studio → Subscription / WebhookEvent tables
```

`WebhookEvent` rows are the idempotency/audit log: `processedAt` set = handled once;
`error` populated = handler threw (and Stripe will retry).

## Production

Don't use `stripe listen` in prod. Instead, in the Stripe Dashboard →
Developers → Webhooks → add endpoint `https://aifortunetelling.org/api/stripe/webhook`,
subscribe to `checkout.session.completed`, `customer.subscription.created|updated|deleted`,
`customer.subscription.trial_will_end`, `invoice.payment_succeeded|payment_failed`, then
copy that endpoint's signing secret into the host (Vercel) env as `STRIPE_WEBHOOK_SECRET`.
Set `NEXT_PUBLIC_APP_URL="https://aifortunetelling.org"` and the matching **live** key pair.
