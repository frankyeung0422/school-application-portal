# Ziwei App (Next.js) — Premium 紫微斗數 Platform

Successor to the live `ziwei-app` at https://aifortunetelling.org. This repo is the 12-week big-bang rebuild per `~/.claude/plans/tingly-tickling-papert.md`.

## What this is

Premium recurring-revenue 命理 platform for HK / TW / overseas Chinese users. Claude Opus 4.7 + Gemini 2.5 Pro behind a deep-midnight + brushed-gold visual system, Stripe subscriptions, multi-channel marketing engine, SEO-first SSR architecture.

## Stack

- **Frontend / Backend**: Next.js 16 (App Router, Server Components, Server Actions, Route Handlers, Suspense streaming)
- **Styling**: Tailwind v4 (CSS-first via `@theme`) + Radix Primitives + CVA + CSS variables
- **Language**: TypeScript everywhere
- **DB**: Postgres (Neon) via Prisma
- **Auth**: httpOnly JWT cookie sessions
- **Payments**: Stripe (Subscriptions API, Embedded Checkout, Customer Portal)
- **AI**: Anthropic Claude Opus 4.7 (primary) + Google Vertex Gemini 2.5 Pro (fallback). Prompt caching mandatory.
- **Voice**: ElevenLabs TTS (cached MP3 in Cloudflare R2)
- **Email**: SendGrid + React Email
- **Analytics**: PostHog (cloud)
- **Errors**: Sentry
- **Build**: Turborepo + pnpm workspaces

## Layout

```
ziwei-app-next/
  apps/
    web/                  Next.js 16 application
  packages/
    engine/               Pure-TS chart calculation (@ziwei/engine)
    marketing/            Multi-channel post pipeline (FB, IG, Threads, TikTok, YT Shorts, XHS)
  scripts/                One-off scripts (DB migration, seed, cutover)
```

## Quick start

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local   # fill in keys
pnpm dev                                              # turbo runs all apps
```

Open http://localhost:3000.

## Phase status (from approved plan)

| Phase | Weeks | Status |
|-------|-------|--------|
| P1 — Foundation & Brand | 1-2 | ⏳ in progress |
| P2 — Auth, Subscriptions, Core Data | 3-5 | not started |
| P3 — Chart Engine & Accuracy | 6-7 | not started |
| P4 — AI Reports & UX Polish | 8-10 | not started |
| P5 — Growth Engine, SEO, Cutover | 11-12 | not started |

## Conventions

- Default to **Server Components**. Mark `'use client'` only when you need a browser API or interactivity. Code review enforces this.
- All forms use **Server Actions**, not API routes from the client.
- All third-party calls (Stripe, Anthropic, Gemini, ElevenLabs, SendGrid) go through `src/lib/<provider>/` with the `'server-only'` import.
- All env vars via `src/lib/env.ts` (Zod-validated at boot).
- Prompts live in `src/lib/ai/prompts/*.yaml`, versioned, cache-breakpoint-annotated.
- No `localStorage.token`. Sessions are httpOnly cookies.

## Cutover

Replaces `C:\Projects\ziwei-app\` at week 12. DNS flip to Vercel; legacy stays as `legacy.aifortunetelling.org` for 14 days then archived.
