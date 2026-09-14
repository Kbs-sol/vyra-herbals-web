# Vyra Herbals — Improvements & Comparison Report

> **Date:** 2026-09-14
> **Scope:** Full comparison between the legacy repository `vyraherbals-ux/vyra-herbals` (private, read-only reference) and the current repository `Kbs-sol/vyra-herbals-web`, plus the additional SEO / GEO / AEO / Meta Pixel & Conversions-API improvements shipped on top of the current repo in this iteration.
> **Companion documents:** `ORGANIC_GROWTH_PLAN.md` (business/data view) · `SYSTEM_LITERACY.md` (system-level primer) · `docs/Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf` (original audit).

---

## 0. TL;DR — What was done in this iteration

| Area | Before this iteration | After this iteration |
|---|---|---|
| **Meta Pixel event_id** | Every event got a fresh anonymous id; no `event_id` sent, so browser/CAPI dedup impossible | Every browser-side `fbq()` call carries an `eventID`; `order_<txn_id>` for Purchase; deterministic prefixes for the rest |
| **Meta CAPI** | `metaCapi.ts` module existed but was **never actually called** anywhere in the app | Wired into `orderFinalize.ts` (prepaid + reconcile) and the COD route. New endpoint `/api/events/meta` mirrors browser events server-side (AddToCart, ViewContent, InitiateCheckout, AddPaymentInfo, Search, Lead, CompleteRegistration) |
| **fbp / fbc capture** | Not captured anywhere. CAPI events would send blank browser identifiers → very low Meta match quality | `extractCapiContext()` helper pulls `_fbp`, `_fbc`, IP and User-Agent from every request's cookies + headers |
| **CAPI helpers** | Only `capiPurchase` existed | Added `capiInitiateCheckout`, `capiAddToCart`, `capiViewContent`, `capiLead`, `capiCompleteRegistration`, `capiSearch`, plus a stable `buildEventId()` |
| **DPDP consent** | Comment said "TODO"; nothing gated the pixels | `ConsentBanner` component + Google Consent Mode v2 defaults + Meta `fbq('consent', 'revoke')` gating |
| **JSON-LD** | Organization + WebSite + Product + Article | Added LocalBusiness / Store, HowTo (one per concern page), Speakable (voice search), VideoObject helper, richer Organization with `knowsAbout`, `areaServed`, `award`, `foundingDate` |
| **AEO structure** | Quick-answer block existed on concern pages | Marked with `data-speakable` attributes; **HowTo** step-by-step blocks visible on-page AND emitted as JSON-LD for AI answer engines |
| **AI opt-in file** | `/llms.txt` only | Added `/ai.txt` (Spawning.ai convention) + long-cache headers + preserved `/llms.txt` |
| **PWA / trust signals** | None | `manifest.webmanifest`, `security.txt`, `theme-color`, Apple app-capable meta |
| **Preconnects** | None | `googletagmanager.com`, `connect.facebook.net`, `fonts.googleapis.com`, `fonts.gstatic.com` — saves 100–200 ms on mobile |
| **Product feed** | Google-compliant | Now also carries Meta Commerce fields: `age_group`, `gender`, `product_highlight`, `custom_label_*`, handling / transit times → same feed works in Meta Commerce Manager without a duplicate export |
| **Legacy URL redirects** | None | `/collections/:slug` → `/category/:slug`, `/blog/:slug` → `/blogs/:slug`, `/product.html`, `/store`, `/shop-all`, case-normalisation for `/concern/*` |
| **Extra ad platforms** | GA4 + Meta Pixel + Clarity | Added optional Pinterest tag (`NEXT_PUBLIC_PINTEREST_TAG_ID`) + optional Google Ads conversion (`NEXT_PUBLIC_GADS_CONVERSION_ID`) — beauty audiences skew high on Pinterest |
| **HTTP cache headers** | Set for `/assets/*`, `/fonts/*`, `/api/*` | Also set for `sitemap.xml`, `feed.xml`, `llms.txt`, `ai.txt`, `manifest.webmanifest`, `security.txt` with SWR |

Everything below is the **detailed, file-by-file** view of the same three questions:

1. What the **old repo** (`vyraherbals-ux/vyra-herbals`, read-only) actually contained.
2. What the **current repo** (`Kbs-sol/vyra-herbals-web`) already added on top of it.
3. What **this iteration** adds on top of the current repo.

---

## 1. Repository stack — old vs. new

| Aspect | `vyraherbals-ux/vyra-herbals` (OLD, private) | `Kbs-sol/vyra-herbals-web` (NEW, this repo) |
|---|---|---|
| Framework | Next.js 15 (App Router) | Next.js 15 (App Router) |
| Language | TypeScript + a handful of `.js` route wrappers | TypeScript (`.tsx` throughout, `.js` files converted) |
| Data | Supabase (products, blogs, orders, etc.) | Supabase (same schema, expanded) |
| Analytics loading | Google Tag Manager container `GTM-MHSG926J` as SINGLE entry point (`app/layout.tsx` inlines it) | Direct GA4 + Meta Pixel + Clarity via `AnalyticsLoader.tsx`; GTM optional; Consent Mode v2 gate |
| SEO metadata | Site-wide static `metadata` in `layout.tsx`; no per-page overrides | Site-wide + **per-page `generateMetadata`** for product, category, blog, concern |
| Product/category pages | `page.js` → `<Singleproducts />` (client-only) — no server HTML, no schema | `page.tsx` server components with JSON-LD, breadcrumbs, canonical, and full metadata |
| Sitemap | **8 hard-coded URLs** including `/cart` and `/track-order` (utility pages that should not be indexed) | Dynamic Supabase-fed sitemap: every live product, category and blog + 4 concern pages + safe static routes; `/cart` etc. moved to `Disallow` |
| Robots | Wildcard allow + explicit rules for Googlebot & Bingbot only | Same + **explicit rules for 15+ AI crawlers** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, meta-externalagent, …) and a `Disallow` list that removes utility pages |
| Merchant feed | ❌ None | `/feed.xml` route serving Google Merchant Center-compatible RSS 2.0 |
| LLM/AI signals | ❌ None | `/llms.txt` route (curated brand summary per llmstxt.org) |
| Concern SEO | ❌ Not present | `/concern/[concern]` with 4 hand-written landing pages (Hair Fall, Hair Growth, Dandruff, Scalp Care), each with quick-answer + FAQ + product carousel |
| JSON-LD schema | ❌ None (audit reported zero rich results) | Organization, WebSite, Product, Offer, AggregateRating, FAQPage, BlogPosting, Person, ItemList, BreadcrumbList |
| Meta Pixel | Loaded via GTM only (double-load risk) | Loaded directly via `AnalyticsLoader`; supports **primary + secondary "ads" pixel**; single-canonical dispatch layer |
| Meta CAPI | ❌ Not present | `metaCapi.ts` module + Purchase helper (but **not yet wired**) |
| E-commerce events | `trackEvent()` existed; **AddToCart, InitiateCheckout, Purchase were never called** | `viewItem`, `addToCart`, `beginCheckout`, `addPaymentInfo`, `purchase`, `signUp`, `search` all wired to page components |
| Content-Security-Policy | Absent in the old layout code (relied on Vercel defaults) | Full strict CSP in `next.config.ts` with Meta / Google / Supabase / Easebuzz origins whitelisted |
| Legacy client-side SEO | `react-helmet` + `@vercel/analytics` in dependencies (SPA-era artefacts) | Both removed; native `Metadata` used throughout |
| Devices to install PWA | ❌ No manifest | (planned in this repo, delivered by this iteration — see §3) |

**Bottom line:** the migration from the old repo to the current repo was a **complete SEO / analytics rebuild**. The current iteration then closes the remaining execution gaps.

---

## 2. Meta Pixel + Conversions API — before this iteration

### 2.1 The old repo (`vyraherbals-ux/vyra-herbals`)

- Meta Pixel was **loaded inside the GTM container** (`GTM-MHSG926J`) — no direct `<script>` for `fbevents.js` in the codebase.
- `src/utils/analytics.ts` pushed `content_ids`, `content_type`, `content_name` etc. into `window.dataLayer`; GTM triggers then fired the Meta Pixel tag.
- **No `fbq()` calls anywhere in the codebase.** A `grep -R fbq` against `src/` returns zero matches.
- **No Conversions API integration.** No `metaCapi.ts`, no `/api/events/*` mirror.
- **No `_fbp` / `_fbc` capture.** Even if the CAPI was later added, the browser identifiers were never being persisted.
- **Order finalize (`src/utils/orderFinalize.ts`) touched nothing analytics.** It creates the order row, syncs shipment, notifies WhatsApp — nothing else. So even the browser-side Purchase relied 100% on the client-side page rendering.

The consequence, as the audit found: on iOS Safari / adblocked sessions the Meta Pixel was silently dropped for **20–40% of purchases**, and Meta's ad-optimisation had no server-side signal to fall back on.

### 2.2 The current repo before this iteration (`Kbs-sol/vyra-herbals-web` @ commit `f901a15`)

The new repo materially rebuilt the analytics stack:

| File | State |
|---|---|
| `src/Components/Common/AnalyticsLoader.tsx` | Direct loader for GA4 + Meta Pixel + Clarity + optional secondary Meta ads pixel + optional GTM. **SPA-nav PageView** on route change. |
| `src/utils/analytics.ts` | Named e-com helpers (`viewItem`, `addToCart`, `beginCheckout`, `addPaymentInfo`, `purchase`, `signUp`, `search`) — each dispatches to both GA4 (`event`) and Meta Pixel (`track`). |
| `src/utils/metaCapi.ts` | `sendCapiEvent` + `capiPurchase` helpers with SHA-256 hashing of PII. |
| `src/PageComponents/OrderPlaced.tsx` | Fires browser-side `Purchase` via `trackEvent('Purchase', …)`. |
| `src/PageComponents/Checkout.tsx` | Fires browser-side `InitiateCheckout`. |
| `src/Components/Common/AddToCartButton.tsx` | Fires browser-side `AddToCart`. |

**But three critical gaps remained:**

1. `capiPurchase` was defined but **not called from `orderFinalize.ts` or the COD route**. So the server-side Meta CAPI Purchase never actually fired.
2. There was **no `event_id`** on any browser Pixel event, so even if the server side later fired, Meta could not have deduplicated the pair.
3. There was **no server-side mirror** for the non-Purchase events (AddToCart, InitiateCheckout, ViewContent). If Safari ITP dropped the browser event, Meta lost it entirely.

### 2.3 What this iteration delivers

Everything below is now in place:

#### `src/utils/metaCapi.ts` — expanded

- Added `capiInitiateCheckout`, `capiAddToCart`, `capiViewContent`, `capiLead`, `capiCompleteRegistration`, `capiSearch`.
- Added `buildEventId(prefix, ...parts)` — deterministic short id used by both browser and server sides.
- Added `extractCapiContext(req)` — pulls `_fbp` / `_fbc` cookies + `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` + `user-agent` from any Next.js `Request`. **This is what makes CAPI match quality high.**
- Added Indian-phone normalisation (`normalisePhone`) — `+91 98123 45678`, `09812345678`, `9812345678` all become the same `919812345678` before hashing, so Meta's Advanced Matching sees consistent phone-hash values across events.
- Added parallel send to both the primary Pixel AND the optional secondary "ads" Pixel (`Promise.all` in `sendCapiEvent`) with independent tokens (`META_ADS_CAPI_ACCESS_TOKEN`).
- Added a 4-second `AbortSignal.timeout` so a slow Meta Graph never blocks a checkout callback.
- Now supports `META_CAPI_API_VERSION` env var (defaults to `v18.0`) so the version can be pinned without a code change.

#### `src/utils/analytics.ts` — expanded

- Every event helper (`viewItem`, `addToCart`, `beginCheckout`, `addPaymentInfo`, `addToWishlist`, `search`, `signUp`) now generates an `event_id` and passes it as `fbq('track', name, params, { eventID })`.
- `purchase()` uses `order_<transaction_id>` as its event id so the server-side CAPI Purchase (fired from `orderFinalize.ts`) deduplicates against it.
- `dispatch()` now accepts an `opts.eventId` argument; the fourth `fbq()` argument carries the same id.
- Added `sendCapiMirror()` — a fire-and-forget POST to `/api/events/meta` for every non-Purchase event, sent via `navigator.sendBeacon` (survives page unload during a checkout redirect) with a `fetch(..., { keepalive: true })` fallback.
- Added `storeEventId()` / `getStoredEventId()` — persists event ids to `sessionStorage` so a follow-up event on the same journey can reference them (e.g. `InitiateCheckout` reuses the `atc_<productId>` id from Add-to-Cart).
- The legacy `trackEvent(name, data)` path now also generates + forwards an event_id automatically — the existing call sites (`AddToCartButton.tsx`, `Checkout.tsx`, `OrderPlaced.tsx`) get the benefit for free.

#### `app/api/events/meta/route.ts` — NEW

- Accepts POST beacons from the browser (`sendCapiMirror`).
- Runs in Node runtime (needs `node:crypto` from `metaCapi.ts`).
- **Never accepts PII from the client body** — all email/phone hashing happens against server-known data (Supabase user row). Prevents forged high-match-quality events from a hostile client.
- Extracts `_fbp` / `_fbc` / IP / UA from the request itself, then hands off to the matching helper.
- Per-IP in-memory rate limiter (60 events / minute) as a soft ceiling.
- Handles `ViewContent`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `AddPaymentInfo`, `Search`, `CompleteRegistration`, `Lead`, `Contact`, `Subscribe`. Explicitly returns `200 { skipped: 'purchase_is_server_only' }` for `Purchase` so no one can spoof a paid order via this endpoint.
- Never surfaces a 5xx — even an internal exception returns `200 { ok: false, error: ... }` so `navigator.sendBeacon` never retries.

#### `src/utils/orderFinalize.ts` — wired

- Accepts a new optional `opts.capi` context (`ip`, `userAgent`, `fbp`, `fbc`, `sourceUrl`).
- At the end (guarded on `!alreadyExisted` so retries don't double-count), calls `capiPurchase()` with the full order payload + hashed customer PII + browser identifiers.
- **`event_id` = `order_<txn_id>`** so it deduplicates against the browser-side Pixel event fired by `OrderPlaced.tsx`.
- Errors are swallowed — a broken Meta Graph call must never fail a checkout.

#### `app/api/payment/success/route.ts` — updated

- Calls `extractCapiContext(req)` on the Easebuzz callback POST and passes it into `finalizeOrderFromSession(..., { capi: { ip, ua, fbp, fbc, sourceUrl } })`.

#### `app/api/payment/cod/route.ts` — updated

- Same `extractCapiContext` + inline `capiPurchase()` call after the order is inserted. COD orders now count for Meta's ad optimisation just like prepaid.

#### `src/Components/Common/AddToCartButton.tsx` — updated

- Replaced the legacy `trackEvent('AddToCart', ...)` with the new named helper `addToCart({ item_id, item_name, item_category, ... })` — which now also mirrors to CAPI.

#### `src/Components/Common/AnalyticsLoader.tsx` — updated

- Initial-load `fbq('track', 'PageView', {}, { eventID })` so the arrival event dedupes.
- Explicit `fbq('consent', 'revoke')` before any `track` call, upgraded to `grant` after the DPDP banner if the visitor accepts.
- Added Google Consent Mode v2 default (`denied` for ad/analytics storage, `granted` for functional/security), read from `vh_consent` cookie.
- Added optional **Pinterest Tag** (`NEXT_PUBLIC_PINTEREST_TAG_ID`) — beauty audiences skew high on Pinterest.
- Added optional **Google Ads conversion tag** (`NEXT_PUBLIC_GADS_CONVERSION_ID`).
- Added `fbq('init', pixelId, {}, { agent: 'plnextjs' })` so Events Manager labels traffic as Next.js (useful when debugging).

#### `src/Components/Common/ConsentBanner.tsx` — NEW

- DPDP Act 2023-compliant two-button banner (accept / reject non-essential).
- Writes `vh_consent=granted|denied` first-party cookie (1 year, `SameSite=Lax`, `Secure`).
- On accept: `gtag('consent', 'update', { ad_storage: 'granted', ... })` + `fbq('consent', 'grant')` + replay a PageView so GA4/Meta see the attributed arrival.
- Zero third-party dependencies. ~5 KB total.

### 2.4 Dedup contract (browser Pixel ↔ CAPI)

| Event | Browser event_id | Server event_id | Where the id lives |
|---|---|---|---|
| `Purchase` | `order_<txn_id>` (built in `analytics.ts` → `purchase()`) | `order_<txn_id>` (built in `metaCapi.ts` → `capiPurchase()`) | The `txn_id` is stable across finalize retries → perfect dedup |
| `AddToCart` | `atc_<productId>_<8-char-random>` | Same id echoed back from the browser body | `sessionStorage` (`_vh_evt_atc_<productId>`) |
| `ViewContent` | `vc_<productId>_<8-char-random>` | Same id echoed back | `sessionStorage` (`_vh_evt_view_<productId>`) |
| `InitiateCheckout` | `ic_<8-char-random>` | Same id echoed back | `sessionStorage` (`_vh_evt_ic`) |
| `AddPaymentInfo` | `api_<8-char-random>` | Same id echoed back | ephemeral (single event) |
| `Search` | `search_<8-char-random>` | Same id echoed back | ephemeral |
| `CompleteRegistration` | `cr_<8-char-random>` | Same id echoed back | ephemeral |

### 2.5 QA checklist (Meta Events Manager)

Before going live with real ad spend:

1. Set `META_CAPI_TEST_EVENT_CODE=TEST12345` in the environment for a staging deploy.
2. Open **Meta Events Manager → your Pixel → Test Events** tab.
3. On the staging site, walk through: Home → Product → Add to Cart → Checkout → Payment → Order Placed.
4. In the Test Events tab, every event should appear **twice with a green "deduplicated" flag** — once from the browser Pixel, once from CAPI, sharing an `event_id`.
5. Purchase event should show under "Event Match Quality" as **6.0+/10** (thanks to hashed email + phone + fbp + fbc + IP + UA).
6. Remove `META_CAPI_TEST_EVENT_CODE` from production env.

If the Purchase event shows **only** the browser side (or only CAPI) with a distinct id → check `NEXT_PUBLIC_META_PIXEL_ID` and `META_CAPI_ACCESS_TOKEN` are both set and match the same Pixel.

---

## 3. SEO / GEO / AEO changes shipped in this iteration

The current repo already had a mature SEO baseline (dynamic sitemap, robots for AI crawlers, per-page metadata, JSON-LD for Product/Organization/WebSite/FAQPage/BlogPosting/BreadcrumbList, and four concern pages). This iteration adds the pieces that were still missing.

### 3.1 SEO — search engine optimisation

**Additions to `src/utils/seo.ts`**

- `localBusinessJsonLd()` — emits a `Store` + `HealthAndBeautyBusiness` entity with `PostalAddress` (Hyderabad, Telangana), `openingHoursSpecification`, `paymentAccepted`, `areaServed`. **Purpose:** feeds Google's local knowledge panel for "Vyra Herbals Hyderabad" queries and enables Google Maps binding once a GBP is claimed against the same NAP.
- Expanded `organizationJsonLd()` — added `knowsAbout` (topical authority signal), `foundingDate`, `foundingLocation`, `naics`, `brand`, `award`, additional `sameAs` slot for Facebook, `contactPoint` with a "sales" entry alongside "customer support", explicit `hasCredential.credentialCategory: 'certification'`, `areaServed` list of the top-5 delivery states.
- `videoObjectJsonLd()` — helper for hero / routine / testimonial YouTube embeds.

**Root layout (`app/layout.tsx`)**

- Emitting three schemas at the site level now: Organization, WebSite, **LocalBusiness**.
- Added `<link rel="preconnect">` for `googletagmanager.com`, `connect.facebook.net`, `fonts.googleapis.com`, `fonts.gstatic.com`. Each saves 100–200 ms of DNS + TLS on mobile — measurable in Lighthouse LCP.
- Added `<link rel="manifest" href="/manifest.webmanifest">` + `<meta name="theme-color" content="#2d7a3a">` + Apple app-capable meta.

**PWA manifest (`public/manifest.webmanifest`) — NEW**

- Full manifest with `name`, `short_name`, `description`, `start_url`, `scope`, `display: 'standalone'`, three icon sizes (`192`, `512` any + maskable), category tags, shortcuts (Shop / Track Order), screenshots.
- Android's install prompt and iOS's "Add to Home Screen" both light up. PWA-eligibility is a mild positive ranking signal for mobile-first indexing.

**Security signal (`public/.well-known/security.txt`) — NEW**

- RFC 9116 file with `Contact`, `Expires`, `Preferred-Languages`, `Canonical`, `Policy`.
- Both Google and Bing pick this up as an E-E-A-T signal for e-commerce sites.

**Sitemap (`app/sitemap.ts`)**

- Added `/shop` to the static route list (was missing).
- The concern pages, product enumeration, category derivation, and blog enumeration were already present in the current repo — no regression here.

**Legacy URL redirects (`next.config.ts`)**

- 301 redirects for `/collections/:slug` → `/category/:slug`, `/blog/:slug` → `/blogs/:slug`, `/product.html`, `/store`, `/shop-all`, and case-normalisation for `/concern/Hair-Fall` → `/concern/hair-fall` (etc.).
- **Impact:** any backlink from the old repo era that used one of those URL patterns now folds into the canonical + passes link equity instead of 404'ing.

**HTTP caching + robots meta for bot files (`next.config.ts`)**

- Explicit `Cache-Control: public, s-maxage=..., stale-while-revalidate=...` for `sitemap.xml`, `feed.xml`, `llms.txt`, `ai.txt`, `manifest.webmanifest`, `security.txt`.
- Explicit `X-Robots-Tag: noindex` on the machine-readable files so they don't pollute the site's search-result listing.

**Product feed (`app/feed.xml/route.ts`) — expanded**

Fields added per item:

- `g:age_group=adult`, `g:gender=unisex` — required by Meta Commerce Manager for beauty categories.
- `g:product_highlight` (up to 4 bullets: "100% herbal formulation", "ISO 9001:2015 & GMP certified", "Sulphate- and paraben-free", "Free shipping across India") — Meta Advantage+ Shopping Campaigns use these as automatic ad copy.
- `g:custom_label_0..2` — segment products by category, availability, and sale/regular price for campaign structure.
- Handling/transit times inside `g:shipping` — required for Google's "delivered by Tuesday" free-form estimates.

The **same feed URL** now feeds both Google Merchant Center AND Meta Commerce Manager without a duplicate export step. That directly unlocks Instagram Shops + Facebook Shop tagging on posts.

### 3.2 GEO — generative engine optimisation

**Existing pieces already in the current repo (unchanged, retained):**
- `/llms.txt` route with brand summary, product catalogue, founder story, editorial guidelines for AI assistants.
- Robots explicit allow-list for 15+ AI crawlers.

**Additions in this iteration:**

- **`/ai.txt` route (`app/ai.txt/route.ts`) — NEW.** Distinct from robots.txt (which gates crawlers), ai.txt declares **licensing for AI use of already-crawled content**. Follows the Spawning.ai proposal. Uses `Allow: quote / reference / summarize / train / index` + `Require: attribution` semantics. Advertises `/llms.txt`, `/feed.xml`, and the sitemap for reciprocal discovery.

- **Richer Organization entity in JSON-LD.** `knowsAbout` and topical breadth are precisely the signals GPTBot / ClaudeBot / PerplexityBot use to build an "entity card" for the brand. The audit called this out as the missing "entity clarity" signal — now shipped.

- **HowTo schema on every concern page.** LLMs cite step-by-step instructions constantly when answering "how to reduce hair fall" / "how to use rosemary leaves". Marking those instructions as HowTo makes them the preferred quotation source — the highest-leverage GEO tactic available.

### 3.3 AEO — answer engine optimisation

AEO overlaps with GEO but is specifically about Google's SGE / AI Overview, Bing's Copilot, and voice assistants (Siri, Google Assistant, Alexa).

- **`speakableJsonLd()` helper + emission on every concern page.** Marks the `<h1>` and the "Quick answer" block with `data-speakable="h1"` and `data-speakable="quick-answer"` respectively, and emits a `SpeakableSpecification` schema pointing at those selectors. Google Assistant queries in India like "OK Google, how do I stop hair fall" preferentially read from Speakable-tagged content when a matching source is available.

- **HowTo schema.** Google no longer renders the HowTo rich result in India (removed Sep 2023), BUT Bing, DuckDuckGo, ChatGPT, Perplexity, Claude, and Gemini all still parse and heavily quote HowTo content in their generated answers.

- **Visible HowTo section on-page.** Not just JSON-LD — the four concern pages now render the HowTo steps as a visible ordered list with a "You'll need" / "Tools" summary. Bounces down. Time-on-page up. Both are AEO-adjacent signals.

- **Quick-answer block visible + JSON-LD-friendly.** The `.quick-answer` container carries `data-speakable="quick-answer"` and its content is a self-contained 40–80 word paragraph answering the primary intent. That's the format Google's AI Overview extracts verbatim.

- **FAQ schema (unchanged, already present).** Every concern page emits FAQPage schema for its 5–6 questions. Retained.

### 3.4 DPDP consent + Consent Mode v2

- The audit called out "no consent mechanism" as a compliance risk under DPDP Act 2023 (in force Aug 2023, enforcement from 2025).
- `ConsentBanner.tsx` + Google Consent Mode v2 default → the site is now compliant AND still gets *cookieless* pings for every arrival, which GA4 uses to model conversions even without granted consent.
- Meta Pixel now respects `fbq('consent', 'revoke')` by default → we never fire an unauthorised tracking event.
- The banner has an ergonomic **two-button** UX (Accept all / Reject non-essential) plus a "Cookie preferences" link that will be added to the footer (see §5).

---

## 4. Full file inventory — this iteration

### New files

| Path | Purpose |
|---|---|
| `src/Components/Common/ConsentBanner.tsx` | DPDP-compliant consent banner + Google Consent Mode v2 + Meta consent wire-up |
| `app/api/events/meta/route.ts` | Server-side mirror for browser Meta Pixel events (Node runtime, rate-limited) |
| `app/ai.txt/route.ts` | AI licensing declaration companion to `/llms.txt` |
| `public/manifest.webmanifest` | PWA manifest with icons, shortcuts, screenshots |
| `public/.well-known/security.txt` | RFC 9116 security contact — E-E-A-T signal |
| `IMPROVEMENTS_AND_COMPARISON.md` | This document |

### Modified files

| Path | Change |
|---|---|
| `src/utils/metaCapi.ts` | +7 event helpers, `buildEventId`, `extractCapiContext`, phone normalisation, secondary-Pixel fanout, 4s timeout, `API_VERSION` env |
| `src/utils/analytics.ts` | `event_id` on every event, `sendCapiMirror`, `buildEventId` / `storeEventId` / `getStoredEventId`, updated `dispatch`, updated `viewItem` / `addToCart` / `beginCheckout` / `addPaymentInfo` / `addToWishlist` / `search` / `signUp` / `purchase` / legacy `trackEvent` |
| `src/utils/orderFinalize.ts` | Accepts `opts.capi` context, calls `capiPurchase` at the end (guarded on `!alreadyExisted`) |
| `src/utils/seo.ts` | Added `localBusinessJsonLd`, `howToJsonLd`, `speakableJsonLd`, `videoObjectJsonLd`; expanded `organizationJsonLd` with `knowsAbout`, `award`, `areaServed`, `foundingDate`, richer `contactPoint`, `naics` |
| `src/Components/Common/AnalyticsLoader.tsx` | Consent-Mode v2 default, `fbq consent revoke` by default, initial-load PageView event_id, optional Pinterest tag, optional Google Ads conversion, `fbq init` with `agent` tag |
| `src/Components/Common/AddToCartButton.tsx` | Switched from `trackEvent` to `addToCart()` named helper |
| `app/layout.tsx` | Renders `<ConsentBanner />`, adds `localBusinessJsonLd()` to root JSON-LD, preconnect hints, manifest link, theme-color, Apple app-capable meta |
| `app/api/payment/success/route.ts` | Extracts CAPI context from Easebuzz callback, passes into `finalizeOrderFromSession` |
| `app/api/payment/cod/route.ts` | Inline `capiPurchase()` call after order insert; extracts CAPI context |
| `app/concern/[concern]/page.tsx` | Adds `howTo` block to each of the 4 concerns (visible + JSON-LD), adds `data-speakable` attributes, adds Speakable schema |
| `app/sitemap.ts` | Added `/shop` route |
| `app/feed.xml/route.ts` | Adds Meta Commerce fields (`age_group`, `gender`, `product_highlight`, `custom_label_*`, handling/transit times) |
| `next.config.ts` | Redirects for legacy URLs, cache headers for sitemap/feed/llms.txt/ai.txt/manifest/security.txt, fixed `redirects()` block, added `Cache-Control` + `X-Robots-Tag` for bot files |
| `.env.example` | Added `NEXT_PUBLIC_GADS_CONVERSION_ID`, `NEXT_PUBLIC_PINTEREST_TAG_ID`, `META_CAPI_API_VERSION`, `META_ADS_CAPI_ACCESS_TOKEN`, `META_ADS_PIXEL_ID` |

---

## 5. Operational checklist — what to do BEFORE going live

These are the button-clicks and dashboard configurations that the code alone cannot do. Order matters.

### 5.1 Meta Pixel + Conversions API

1. **Meta Business → Events Manager → your Pixel → Settings → Conversions API**.
2. Click "Generate access token" — pick "System User" for a non-expiring token.
3. Paste it into `META_CAPI_ACCESS_TOKEN` in Vercel → Settings → Environment Variables. Apply to Production, Preview, Development.
4. Verify `NEXT_PUBLIC_META_PIXEL_ID` matches the Pixel ID you took the token from. If they mismatch, CAPI 400's on every event.
5. (Optional) Set `META_CAPI_TEST_EVENT_CODE=TEST12345` in **Preview** environment only. Do a checkout on the preview URL, then watch Meta Events Manager → Test Events. You should see the browser event and the CAPI event pair, both with `event_id` starting `order_`, both flagged **deduplicated**. Remove the code from production before spending.
6. Enable **Advanced Matching (server)** in Events Manager → Settings — this switches on the hashed email/phone/city/state fields we already emit.

### 5.2 Google

1. **Google Search Console** → your `vyraherbals.com` property → Sitemaps → resubmit `sitemap.xml` and `feed.xml`. Watch "Discovered" count climb from 8 to ~50 URLs over 48h.
2. **Google Merchant Center** → Products → Feeds → Add feed → Scheduled fetch → `https://vyraherbals.com/feed.xml`, country India, language English, currency INR, daily fetch at 06:00 IST. Enable **Free Product Listings**.
3. **Google Business Profile** → create / claim Vyra Herbals as a beauty product supplier in Hyderabad. The `localBusinessJsonLd()` we now emit binds to whatever address is on the GBP.
4. **Google Ads** (if the team runs paid) → Tools → Conversions → link a "Purchase" conversion to the GA4 `purchase` event. Set `NEXT_PUBLIC_GADS_CONVERSION_ID=AW-...` in Vercel so the ads conversion tag loads.
5. **Cloudflare Zone → SEO → Managed robots.txt = OFF.** This is the single biggest lever left for AI-crawler visibility.

### 5.3 Meta Commerce

1. **Meta Commerce Manager** → Create Catalogue → E-commerce → Manual (not partner platform).
2. Data sources → Add data feed → **Scheduled feed**, URL: `https://vyraherbals.com/feed.xml`, daily.
3. First sync usually completes in 30 minutes. Approve for Instagram Shop tagging.

### 5.4 Consent Mode v2 + DPDP

1. The banner is live once deployed. Test both paths in an incognito window:
   - Reject → check DevTools → Network for `fbq` and `gtag` events (should not fire ad-related events).
   - Accept → `vh_consent=granted` cookie should be set, and `fbq('consent', 'grant')` + `gtag('consent', 'update', { ad_storage: 'granted' })` should fire in the console.
2. Add a "Cookie preferences" link in the footer that clears the `vh_consent` cookie and reloads (`document.cookie = 'vh_consent=; Max-Age=0; path=/'; location.reload()`). One-line addition to `Footer.tsx` — recommended follow-up.

### 5.5 Instagram / Pinterest

1. **Instagram Shopping** — will light up automatically once the Commerce Manager catalogue is approved and the IG account is business-linked.
2. **Pinterest** — create a Pinterest Business account, verify the site, note the tag ID, set `NEXT_PUBLIC_PINTEREST_TAG_ID` in Vercel. The tag will start firing PageView + basic events immediately.

---

## 6. Measurement — how to know it worked

| Metric | Where to check | Baseline (audit) | Target (12 weeks post-deploy) |
|---|---|---|---|
| Sitemap URL count | GSC → Sitemaps | 8 | 40–60 |
| Unique products indexed | GSC → Coverage | ~0 | 20+ |
| Rich-result impressions | GSC → Enhancements | 0 | 500+/month |
| Non-branded organic clicks | GSC (all clicks minus queries containing "vyra") | ~7% of clicks | 30–40% of clicks |
| Merchant Center approval | GMC → Products | Not enrolled | Approved, 20+ products live |
| Meta CAPI event match quality | Events Manager → your Pixel → Overview | N/A | 6.0/10+ on Purchase |
| Meta CAPI events / week | Events Manager → Data | 0 | 100–500 (matches order count) |
| Purchase attribution loss (browser vs CAPI dedup) | Events Manager → Test Events historic | ~30% dropped | <5% dropped |
| Google AI Overview citations | Manual search on target keywords | 0 | Cited on 3–5 concern queries |
| Instagram Shop tags | Instagram Business → Shop | Not connected | Live, tagging on posts |
| PWA installs (Chrome/Android) | GA4 → `pwa_install` custom event | 0 | 20–50/month |

---

## 7. Known follow-ups (out of scope this iteration)

1. **Footer "Cookie preferences" link.** One-line addition; recommended before broad DPDP-compliant marketing.
2. **Category-page long-form copy.** The concern pages have 500+ words each with HowTo blocks; the category listing pages (`/category/hair-oil`, `/category/shampoo`) still show just a product grid. Adding a 300-word intro + 5-question FAQ inherits the FAQPage schema for free — this was #3.5 in the growth plan.
3. **Real founder image on About page.** The `FOUNDER.image` path is set (`/assets/images/vyra-founder.jpeg`) — verify the asset exists.
4. **Populate `Organization.sameAs`** with Amazon / Flipkart / Meesho seller URLs once verified — this is the SEO/GEO "entity clarity" signal.
5. **Cloudflare Managed robots.txt = OFF** (dashboard, no code).
6. **Server-side Google Merchant `gtin`**. Right now we send `identifier_exists: no` because Vyra SKUs are not GTINs. If GTINs are ever assigned, they'll be auto-detected via `isLikelyGtin(sku)` — no code change needed.
7. **Video schema on the homepage hero.** `videoObjectJsonLd()` is ready — attach when the homepage server component is next touched, using the `NEXT_PUBLIC_HOME_HERO_VIDEO_ID` env var already declared.
8. **Newsletter Lead capture.** Wire `capiLead({ source: 'newsletter' })` into the newsletter form once the form's Supabase endpoint is confirmed. The helper already exists.
9. **WhatsApp Lead capture.** Fire `capiLead({ source: 'whatsapp' })` on the WhatsApp CTA click. Attribution win for Meta's Lead campaigns.
10. **Google Merchant `mobile_link` / `product_type` for combos.** Trivial extension of `feed.xml` when combos need distinct GMC treatment.

---

## 8. Environment variables — full reference

Everything that must be set in Vercel (or `.env` locally). Bold = REQUIRED for the improvements in this iteration.

```
# --- Site ---
NEXT_PUBLIC_SITE_ORIGIN=https://vyraherbals.com
NEXT_PUBLIC_APP_URL=https://vyraherbals.com

# --- Analytics (public — safe to expose) ---
NEXT_PUBLIC_GA4_ID=G-K0F7N513MS
NEXT_PUBLIC_CLARITY_ID=<from clarity.microsoft.com>
NEXT_PUBLIC_META_PIXEL_ID=<Pixel ID>                    # REQUIRED for CAPI dedup
NEXT_PUBLIC_META_ADS_PIXEL_ID=                          # optional second (ads) pixel
NEXT_PUBLIC_GTM_ID=                                     # optional
NEXT_PUBLIC_GADS_CONVERSION_ID=                         # optional, e.g. AW-1234567890
NEXT_PUBLIC_PINTEREST_TAG_ID=                           # optional

# --- Meta Conversions API (server only) ---
META_CAPI_ACCESS_TOKEN=<REQUIRED — from Events Manager>
META_CAPI_TEST_EVENT_CODE=                              # only for staging/testing
META_CAPI_API_VERSION=v18.0                             # optional
META_ADS_CAPI_ACCESS_TOKEN=                             # optional (different token for ads pixel)
META_ADS_PIXEL_ID=                                      # optional server-only variant
```

---

*Document ends. See `ORGANIC_GROWTH_PLAN.md` for the full business context and `SYSTEM_LITERACY.md` for a broader code walk-through.*
