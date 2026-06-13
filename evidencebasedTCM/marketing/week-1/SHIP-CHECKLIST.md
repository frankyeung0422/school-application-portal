# Week 1 — Ship Checklist

Everything below is already built or written. Your job is to assemble + post.

## Sunday (1 hr) — Prep

- [ ] Start dev server: `npm run dev` (port 4343)
- [ ] Open another terminal and run: `npx tsx scripts/screenshot-marketing.ts`
  - Produces 4 PNGs in `marketing/week-1/images/`
  - If the interaction-checker screenshot fails (autocomplete selector mismatch), open `http://localhost:4343/interactions` manually, type "Dan Shen", click suggestion, type "warfarin", click suggestion, then take a 1200×627 crop manually with the Snipping Tool.
- [ ] Open `http://localhost:4343/cheatsheet/herb-drug-2026/preview` → click "Print" → save as PDF → store as `marketing/week-1/cheatsheet-2026-05.pdf`. This is the lead magnet.
- [ ] Open `http://localhost:4343/marketing/carousel-week1` → click "Print" → set paper size to 210×210 mm or A4 portrait, margins **none**, background graphics **ON** → save as PDF → store as `marketing/week-1/linkedin-carousel.pdf`.
- [ ] Decide your LinkedIn pinned post — week-1 Monday will be pinned for 14 days. Unpin whatever's there now.

## Monday — Posting day (15 min)

### 8:30 HKT — Post the Monday LinkedIn

1. Open `marketing/week-1/mon-linkedin.md` → copy the body block.
2. Paste into LinkedIn → attach image `01-checker-danshen-warfarin.png`.
3. Add the first comment immediately (link to `/interactions` + `/cheatsheet/herb-drug-2026`).
4. Pin the post to your profile (3-dot menu on the post → Featured).

### During the day

- [ ] Reply to every comment within the first 6 hours.
- [ ] DM 5 specific TCM practitioners + 3 family-med MDs in your network. Don't copy-paste — personalize the first line for each.
- [ ] Check email subscriptions every 2 hours. Reply personally to anyone who subscribes ("thanks, I saw you signed up — if there's a specific interaction you want added to the database, hit reply.")

## Thursday — Carousel day (15 min)

### 8:30 HKT — Post the Thursday carousel

1. Open `marketing/week-1/thu-linkedin.md` → copy the body block.
2. **Create a Document Post** on LinkedIn (not a regular post) → upload `linkedin-carousel.pdf` → 10 slides will appear as a swipeable deck.
3. Paste post body → publish.
4. First comment with the same two links.

### During the day

- [ ] Same engagement loop.
- [ ] DM the 8 people from Monday and ask: "I made this carousel today — see if anything's missing from your clinical experience."
- [ ] **Save which slide gets the most carousel views** in LinkedIn analytics by Friday morning — it tells you what to write next.

## End of week — Metrics check (10 min Sunday)

Open the metrics tracker in `marketing/README.md`. Fill in:

| Metric | Target | Actual |
|--------|--------|--------|
| LinkedIn followers gained | +10 | ___ |
| Email subscribers | 5 | ___ |
| `/interactions` unique visits | 30 | ___ |
| DMs received | 3 | ___ |
| Demos booked from this week's posts | 1 | ___ |

If any number is < 50% of target, the diagnosis is usually one of:
- Posting time wrong (try 7:30 HKT for global, or 11:30 HKT for SEA-focused)
- Post body too long (cut by 30%)
- No first comment with the platform link (LinkedIn buries link-in-post but rewards link-in-comment)

---

## What you now have built into EBTCM

### Routes
- **`/cheatsheet/herb-drug-2026`** — landing page with email capture form
- **`/cheatsheet/herb-drug-2026/preview`** — the printable 6-page A4 cheat sheet (THE lead magnet — printable via browser)
- **`/marketing/carousel-week1`** — the 10-slide LinkedIn carousel (printable as 10-page PDF)
- **`/api/cheatsheet/subscribe`** — POST endpoint that captures emails to the new `EmailSubscriber` table

### Database
- **`EmailSubscriber` table** — stores email + profession + locale + source. Query subscribers by source via `prisma.emailSubscriber.findMany({ where: { source: 'cheatsheet-herb-drug-2026' } })`.

### Components
- `SubscribeForm` (`src/components/marketing/SubscribeForm.tsx`)
- `PrintButton` (`src/components/marketing/PrintButton.tsx`)

### Data
- `cheatsheet-data.ts` (`src/lib/marketing/cheatsheet-data.ts`) — 22 herb-drug pairs grouped by drug class + 6 pregnancy contraindications. Edit this file to add/remove entries; both the cheat sheet preview and the carousel render from this same source.

### Scripts
- `npx tsx scripts/screenshot-marketing.ts` — Playwright auto-screenshots for the LinkedIn image

## What's NOT done (intentional, do later)

- **Email delivery via Resend/Mailgun** — the subscribe endpoint stores emails but does not auto-send the PDF. The user gets the PDF immediately on-screen (the `/preview` page) which is functionally equivalent. Wire `deliverCheatSheetEmail()` in `src/app/api/cheatsheet/subscribe/route.ts` when you set up an email service.
- **Static PDF asset** — the cheat sheet is currently HTML rendered to PDF in-browser. If you want a downloadable `cheatsheet-2026-05.pdf` URL, generate it once via the print flow above and save to `public/cheatsheet-2026-05.pdf`, then add a direct-download link on the landing page.
- **Newsletter subscriber list export** — when you have 25+ subscribers, write a quick script: `prisma.emailSubscriber.findMany().then(...)` → CSV → import to Substack.
