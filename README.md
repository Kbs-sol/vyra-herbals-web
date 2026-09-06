# Vyra Herbals — Web Storefront (v2)

[![Deploys on Vercel](https://img.shields.io/badge/deploys-Vercel-000)](https://vercel.com) [![Framework](https://img.shields.io/badge/framework-Next.js%2015-black)](https://nextjs.org/) [![DB](https://img.shields.io/badge/database-Supabase-3ECF8E)](https://supabase.com/)

> The refreshed codebase behind **[vyraherbals.com](https://vyraherbals.com)** — with the SEO foundations, analytics loop, admin WhatsApp inbox and repo diet described in the SEO audit (`docs/Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf`) and the code audit (`docs/vyra-herbals-audit-report.pdf`).

## What this repo is

A Next.js 15 (App Router) storefront + admin panel + WhatsApp integration + payment/shipping pipelines for Vyra Herbals, a certified Ayurvedic hair-care brand founded by Sahera Banu.

**If you are reading this in a Vercel/Supabase context and need to work with the code, jump straight to `docs/SYSTEM_LITERACY.md`.** That document is the single source of truth for how everything fits together.

## What changed vs the old repo (`vyraherbals-ux/vyra-herbals`)

| Concern | Before | After |
|---|---|---|
| Repo size on disk | 173 MB (86 MB `public/`, 83 MB `.git`) | 17 MB working tree, ~5 MB `.git` after first push |
| Root markdown files | 30+ MDs cluttering root | 1 README + `docs/` |
| Root SQL files | 30+ `.sql` at root | all in `supabase/migrations/` |
| MP4 videos in `public/` | 4 files (52 MB) | 0 — replaced by YouTube facade |
| Sitemap URLs | 8 hardcoded | Dynamic — every product/category/blog |
| `generateMetadata` in codebase | 0 | Product, category, blog + root |
| Structured data (JSON-LD) | 0 | Organization, WebSite, Product, Offer, AggregateRating, FAQPage, BlogPosting, ItemList, BreadcrumbList |
| AI crawler policy | Blocked GPTBot, ClaudeBot, Google-Extended, meta-externalagent | Explicitly welcomed (14 AI agents) |
| GA4 e-commerce events | Wired to Meta Pixel only, GA4 side missing | `view_item`, `add_to_cart`, `begin_checkout`, `purchase` fire GA4 + Meta together, with full `items` arrays |
| Meta Conversions API | Not implemented | `src/utils/metaCapi.ts` server-side, de-dupes with browser Pixel |
| WhatsApp inbox | Send-only | Full inbox: threads, unread badges, 10s polling, 24-hour window enforcement, admin free-text reply |
| Utility pages indexed by Google | cart/checkout/login/… all indexable | All get `robots: noindex` layouts |
| Test routes | `test-coupon`, `test-delivery`, `test-order` shipped | Deleted |

## Quick start

```bash
git clone https://github.com/Kbs-sol/vyra-herbals-web.git
cd vyra-herbals-web
npm install
cp .env.example .env    # fill every value
npm run dev             # http://localhost:3000
```

Full environment variable documentation, deploy instructions, WhatsApp Meta setup, analytics setup, and troubleshooting: **`docs/SYSTEM_LITERACY.md`**.

## Deploy to Vercel

1. Import `Kbs-sol/vyra-herbals-web` in Vercel.
2. Paste every var from `.env.example` into Vercel env with real values.
3. Add domains `vyraherbals.com` and `www.vyraherbals.com`.
4. Deploy.

After the first deploy, run through the **post-deploy checklist** in `docs/SYSTEM_LITERACY.md` §15.

## Tech stack

- **Next.js 15** App Router · **React 18** · **TypeScript** (strict)
- **Supabase** — Postgres + Storage + Auth
- **Vercel** — hosting + cron
- **Meta WhatsApp Cloud API** — customer messaging + inbox
- **Easebuzz** — payments
- **iCarry** — shipping / multi-courier
- **Message Central** — OTP

## Documentation

Everything is in `docs/`:
- **`SYSTEM_LITERACY.md`** — start here. Repo map, env vars, SEO, analytics, WhatsApp, payments, shipping, admin, deploy, troubleshooting.
- `Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf` — the SEO audit that drove this refactor.
- `vyra-herbals-audit-report.pdf` — the code audit that drove the repo diet + security review.
- `WHATSAPP_GO_LIVE.md` — Meta Business Manager checklist for WhatsApp.
- `META_WHATSAPP_TEMPLATES_OWNER_GUIDE.md` — how to create/approve templates.
- `API_DOCUMENTATION.md` — REST endpoints.
- `ARCHITECTURE.md` — high-level flow diagrams.

## License

Private. All rights reserved.
