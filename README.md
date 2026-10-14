# Vyra Herbals — Web Storefront (v2)

[![Deploys on Vercel](https://img.shields.io/badge/deploys-Vercel-000)](https://vercel.com) [![Framework](https://img.shields.io/badge/framework-Next.js%2015-black)](https://nextjs.org/) [![DB](https://img.shields.io/badge/database-Supabase-3ECF8E)](https://supabase.com/)

> The refreshed codebase behind **[vyraherbals.com](https://vyraherbals.com)** — with the SEO foundations, analytics loop, admin WhatsApp inbox and repo diet described in the SEO audit (`docs/Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf`) and the code audit (`docs/vyra-herbals-audit-report.pdf`).

## What this repo is

A Next.js 15 (App Router) storefront + admin panel + WhatsApp integration + payment / shipping pipeline for **Vyra Herbals**, a certified Ayurvedic hair-care brand. It is the second-generation codebase — a full rebuild of the earlier repository (`vyraherbals-ux/vyra-herbals`), migrated file-by-file with SEO, analytics, AI-search readiness, security, and admin ergonomics upgraded along the way.

**If you are reading this in a Vercel / Supabase context and need to work with the code, jump straight to [`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md) at the repo root.** That document is the single source of truth for how everything fits together.

## What changed vs the old repo (`vyraherbals-ux/vyra-herbals`)

| Concern | Before | After |
|---|---|---|
| Repo size on disk | 173 MB (86 MB `public/`, 83 MB `.git`) | 17 MB working tree, ~5 MB `.git` after first push |
| Root markdown files | 30+ MDs cluttering root | 4 canonical (`README`, `SYSTEM_LITERACY`, `IMPROVEMENTS_AND_COMPARISON`, `ORGANIC_GROWTH_PLAN`) + `docs/` |
| Root SQL files | 30+ `.sql` at root | all in `supabase/migrations/` |
| MP4 videos in `public/` | 4 files (52 MB) | 0 — replaced by YouTube facade |
| Sitemap URLs | 8 hardcoded | Dynamic — every product / category / blog / concern page |
| `generateMetadata` in codebase | 0 | Product, category, blog + root + concern |
| Structured data (JSON-LD) | 0 | Organization, WebSite, Product, Offer, AggregateRating, FAQPage, BlogPosting, ItemList, BreadcrumbList, LocalBusiness, HowTo, Speakable |
| AI crawler policy | Blocked GPTBot, ClaudeBot, Google-Extended, meta-externalagent | Explicitly welcomed (14+ AI agents) + `/llms.txt` + `/ai.txt` |
| GA4 e-commerce events | Wired to Meta Pixel only, GA4 side missing | `view_item`, `add_to_cart`, `begin_checkout`, `purchase` fire GA4 + Meta together, with full `items` arrays and matched `event_id`s |
| Meta Conversions API | Not implemented | `src/utils/metaCapi.ts` server-side, dedupes with browser Pixel via shared `event_id` |
| WhatsApp inbox | Send-only | Full inbox: threads, unread badges, 10 s polling, 24-hour reply window enforcement, admin free-text reply |
| Admin Media Library | ❌ Not present | New `/admin/media` page — bulk paste-URL / upload / reorder / delete of product images without opening the full editor |
| Utility pages indexed by Google | cart / checkout / login / … all indexable | All get `robots: noindex` layouts |
| Test routes | `test-coupon`, `test-delivery`, `test-order` shipped | Deleted |
| Consent | None (DPDP-non-compliant) | Two-button consent banner + Google Consent Mode v2 + Meta `fbq('consent')` gating |
| Product feed | ❌ None | `/feed.xml` — Google Merchant Center compliant, ALSO carries Meta Commerce fields |

## Quick start

```bash
git clone https://github.com/Kbs-sol/vyra-herbals-web.git
cd vyra-herbals-web
npm install
cp .env.example .env    # fill every value
npm run dev             # http://localhost:3000
```

Full environment variable documentation, deploy instructions, WhatsApp Meta setup, analytics setup, and troubleshooting: **[`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md)** (at the repo root).

## Deploy to Vercel

1. Import `Kbs-sol/vyra-herbals-web` in Vercel.
2. Paste every var from `.env.example` into Vercel env with real values.
3. Add domains `vyraherbals.com` and `www.vyraherbals.com`.
4. Deploy.

After the first deploy, run through the **post-deploy checklist** in [`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md) §15.

## Tech stack

- **Next.js 15** App Router · **React 18** · **TypeScript** (strict)
- **Supabase** — Postgres + Storage + Auth
- **Vercel** — hosting + cron
- **Meta WhatsApp Cloud API** — customer messaging + inbox
- **Easebuzz** — payments
- **iCarry** — shipping / multi-courier
- **Message Central** — OTP

## Documentation

- **[`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md)** (root) — **start here**. Repo map, env vars, SEO, analytics, WhatsApp, payments, shipping, admin, deploy, troubleshooting.
- **[`IMPROVEMENTS_AND_COMPARISON.md`](./IMPROVEMENTS_AND_COMPARISON.md)** (root) — founder-friendly comparison: what the old site was doing, what was fixed, and how each change contributes to organic traffic + sales.
- **[`ORGANIC_GROWTH_PLAN.md`](./ORGANIC_GROWTH_PLAN.md)** (root) — the data-backed 90-day organic-traffic + revenue plan (GSC, GA4, order data, competitor benchmarks).

Everything else in `docs/`:
- `Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf` — the SEO audit that drove this refactor.
- `vyra-herbals-audit-report.pdf` — the code audit that drove the repo diet + security review.
- `WHATSAPP_GO_LIVE.md` — Meta Business Manager checklist for WhatsApp.
- `META_WHATSAPP_TEMPLATES_OWNER_GUIDE.md` — how to create / approve templates.
- `API_DOCUMENTATION.md` — REST endpoints.
- `ARCHITECTURE.md` — high-level flow diagrams.

## Admin panel — where things live

The admin panel is at `/admin` (guarded by login at `/admin/login`). Highlights:

| Section | URL | What it does |
|---|---|---|
| Dashboard | `/admin` | Revenue snapshot, order status distribution, latest orders, quick-action buttons |
| Products | `/admin/products` | Full product editor — title, price, description, ingredients, benefits, images |
| **Media Library** | `/admin/media` | **Bulk image manager — paste URL or upload, reorder, delete, no other product fields touched.** |
| Orders | `/admin/orders` | Order list + status transitions + shipment sync |
| Reviews | `/admin/reviews` | Approve / reject customer reviews |
| WhatsApp Inbox | `/admin/whatsapp` | Live customer conversations, 24-h window enforcement, template-send fallback |
| Blogs | `/admin/blogs` | Blog CMS |
| Categories | `/admin/categories` | Category CRUD |
| Coupons | `/admin/coupons` | Discount codes |
| Settings | `/admin/settings` | Site-wide toggles |

## Credit

Recent SEO / GEO / AEO / Meta CAPI / consent / Media Library / admin UX improvements built and shipped by **[VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com%20%2F%20its%20GitHub%20repo%20and%20wanted%20to%20get%20in%20touch.)**. See [`IMPROVEMENTS_AND_COMPARISON.md`](./IMPROVEMENTS_AND_COMPARISON.md) for the detailed change log.

## License

Private. All rights reserved.
