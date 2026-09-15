# Vyra Herbals — System Literacy

> **Read this first.** It is the single source of truth for how the site is
> built, what it depends on, and how to keep it running. If something in the
> codebase doesn't match this document, this document is stale — fix it and
> commit the fix in the same PR.

**Audience:** future developers, marketing operators, and future-you at 2 AM.
**Stack:** Next.js 15 (App Router) · React 18 · TypeScript · Supabase (Postgres + Storage) · Vercel (hosting) · Meta WhatsApp Cloud API · Easebuzz (payments) · iCarry (shipping)

---

## 1. Repository Map — What Lives Where

```
vyra-herbals-web/
├── app/                          Next.js App Router — every route lives here.
│   ├── layout.tsx                Root shell + sitewide JSON-LD (Organization + WebSite).
│   ├── page.tsx                  Homepage.
│   ├── sitemap.ts                DYNAMIC sitemap — queries Supabase for products/categories/blogs.
│   ├── robots.ts                 AI-crawler-friendly robots policy.
│   ├── globals.css               Global CSS (kept small; page-specific CSS lives in public/assets/css).
│   │
│   ├── product/[productHandle]/  PDP — server component with generateMetadata + Product schema.
│   ├── category/[categoryName]/  Category listing — server component with ItemList schema.
│   ├── blogs/                    Blog index + [slug] detail (BlogPosting schema).
│   ├── faqs/                     Static FAQ page (with FAQPage schema).
│   ├── about/                    Founder story (Person schema — name read from `NEXT_PUBLIC_FOUNDER_NAME`).
│   ├── contact/                  Contact form.
│   │
│   ├── (utility routes)          cart, checkout, login, signup, profile, orders, wishlist,
│   │                             search, track-order, transaction, payment-failed.
│   │                             Each has a `layout.tsx` that sets `robots: { index: false }`.
│   │
│   ├── admin/                    Admin panel — noindexed globally.
│   │   ├── whatsapp/             Real-time WhatsApp inbox (this repo's flagship new feature).
│   │   │   ├── page.tsx          The inbox UI itself.
│   │   │   └── broadcast/        Bulk template send (the old marketing tool).
│   │   ├── products/
│   │   ├── orders/
│   │   ├── reviews/
│   │   ├── coupons/
│   │   ├── customers/
│   │   ├── ingredients/
│   │   ├── testimonials/
│   │   ├── categories/
│   │   ├── inquiries/
│   │   ├── settings/
│   │   ├── page.tsx              Dashboard.
│   │   └── layout.tsx            Sets `robots: noindex,nofollow` for the whole /admin/*.
│   │
│   └── api/                      All server-side routes (62 handlers). See §7 API surface.
│
├── src/
│   ├── PageComponents/           Large client-only "page bodies" (Singleproducts, Category, Checkout,
│   │                             OrderPlaced, Home, Cart, Wishlist, ...). Called by the app/ routes.
│   ├── Components/
│   │   ├── Common/               Reusable UI (Header, Footer, AnalyticsLoader, YouTubeFacade,
│   │   │                         AddToCartButton, AddToWishlistButton, ...).
│   │   ├── Contexts/             React Context providers (Auth, Cart, Wishlist).
│   │   ├── Shared/               Cross-page primitives (ProductCard, JsonLd, SEOComponent [no-op]).
│   │   ├── Home/                 Homepage sections (Hero, Video [YouTube facade], Features, ...).
│   │   ├── Auth/                 OTP/login utilities (useResendTimer, etc.).
│   │   └── Product/              Product-page specific (IngredientsSection).
│   ├── services/
│   │   └── communications/       ← Big module. All WhatsApp + email pipelines.
│   │       ├── providers/whatsapp/  Meta Cloud API client, message builder, webhook parser.
│   │       ├── bot/                 Conversational bot (state machine).
│   │       ├── logging/             messageLogger (outbound), inboundLogger (inbound + admin replies).
│   │       ├── queue/               Persistent send-queue with retries.
│   │       ├── automationEngine/    Order/payment/shipment → message triggers.
│   │       ├── integration/         Business-flow orchestrators.
│   │       └── config/              Templates + provider config.
│   ├── utils/
│   │   ├── analytics.ts          Named event helpers (viewItem, addToCart, purchase, ...).
│   │   ├── metaCapi.ts           Server-side Meta Conversions API — de-dupes with browser Pixel.
│   │   ├── seo.ts                Central SEO helpers (Metadata builders + JSON-LD builders).
│   │   ├── supabaseClient.ts     Browser + server Supabase clients.
│   │   ├── adminAuth.ts          Admin JWT helpers (`requireAdmin`, `verifyAdminAuth`).
│   │   ├── orderFinalize.ts      Post-payment order finalisation.
│   │   ├── orderShipment.ts      iCarry booking.
│   │   ├── easebuzz.ts           Easebuzz payment gateway integration.
│   │   ├── shipping.ts           Shipping cost + address helpers.
│   │   ├── serverEnv.ts          Server-only env accessors (fail-loud when missing).
│   │   └── ...
│   ├── lib/supabaseAdmin.ts      Service-role Supabase singleton used server-side.
│   ├── types/                    Shared TypeScript types.
│   ├── constants.ts              API_PATH, APP_NAME.
│   └── index.css                 Fallback global CSS.
│
├── public/
│   ├── assets/                   Images, fonts, CSS (~15 MB after cleanup — no more MP4s).
│   ├── category-images/          Category card thumbnails.
│   └── (root static)             Amazon/Flipkart/Meesho logos, home-*.jpg, placeholder.png.
│
├── supabase/migrations/          All SQL — including the WhatsApp inbox migration.
├── docs/                         Every markdown that used to clutter the repo root.
├── scripts/                      One-off scripts (jest.config.whatsapp.js).
├── tests/                        Jest tests (WhatsApp module).
├── middleware.ts                 Next.js edge middleware (auth guards).
├── next.config.ts                Full CSP, image formats, cache headers, webpack chunk config.
├── vercel.json                   Vercel headers/rewrites.
├── vercel.cron.json              Vercel scheduled jobs (payment reconciliation, iCarry sync).
└── .env.example                  Every environment variable, with inline docs.
```

**Rule of thumb:**
- Route-level SEO belongs in `app/`.
- Reusable rendering belongs in `src/Components/`.
- Business logic belongs in `src/utils/` or `src/services/`.
- Pure SQL belongs in `supabase/migrations/`.
- All documentation belongs in `docs/`. **Do not litter the repo root with SQL or MD files.**

---

## 2. Environment Variables

Every variable is documented inline in `.env.example`. Below is the summary
grouped by concern. **Anything with `NEXT_PUBLIC_` is embedded in the browser
bundle** — never put a secret behind that prefix.

### 2.1 Supabase

| Var | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser | Anon key — RLS-gated |
| `SUPABASE_URL` | Server | Same URL, server side |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server ONLY** | Bypasses RLS. If missing, server routes fail loud — no silent anon-key fallback. |
| `SUPABASE_PUBLIC_URL` | Server | Public URL for signed asset paths |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Browser | Default: `products` |

### 2.2 Admin panel

| Var | Notes |
|---|---|
| `ADMIN_EMAIL` | Login email |
| `ADMIN_PASSWORD_HASH` | scrypt digest (preferred) — generate with the snippet in `.env.example` |
| `ADMIN_PASSWORD` | Plain fallback — leave blank if using the hash |
| `JWT_SECRET` | ≥ 32 chars. Rotating this immediately invalidates every existing admin session. |

### 2.3 Application

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_SITE_ORIGIN` | Canonical origin used by sitemap, robots, and every `alternates.canonical` — defaults to `https://vyraherbals.com` |

### 2.4 Payments — Easebuzz

| Var | Notes |
|---|---|
| `EASEBUZZ_KEY` | Merchant key |
| `EASEBUZZ_SALT` | HMAC secret — sign every request |
| `EASEBUZZ_ENV` | `test` or `prod` |

### 2.5 Shipping — iCarry

| Var | Notes |
|---|---|
| `ICARRY_USERNAME` | iCarry account |
| `ICARRY_KEY` | iCarry API key |
| `ICARRY_PICKUP_ADDRESS_ID` | Pickup address id in iCarry |
| `ICARRY_BOOK_ON_CREATE` | `true` to auto-book on order confirm |
| `ICARRY_PROXY_URL` | Optional proxy if calling from static-IP infra |
| `ICARRY_SELECT_CHEAPEST` | Default true; else uses `ICARRY_COURIER_PRIORITY` order |
| `ICARRY_COURIER_PRIORITY` | Comma-list; default `Xpressbees,Delhivery,Amazon Shipping` |
| `ICARRY_MAX_COURIER_ATTEMPTS` | Default 5 |
| `ICARRY_ORIGIN_PINCODE` | Must match the pickup address |

### 2.6 OTP — Message Central

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_MESSAGE_CENTRAL_CUSTOMER_ID` | Customer id — safe to expose (it's an id, not a secret) |
| `MESSAGE_CENTRAL_KEY` | API key — **currently flagged "Needs Attention" in Vercel; fix this or OTPs silently fail** |

### 2.7 Scheduled jobs

| Var | Notes |
|---|---|
| `CRON_SECRET` | REQUIRED. Vercel Cron sends this as `Authorization: Bearer …`; without it the cron endpoints return 401. Generate with `openssl rand -hex 32`. |

### 2.8 Analytics (all `NEXT_PUBLIC_*` — safe to expose)

| Var | Tool | Notes |
|---|---|---|
| `NEXT_PUBLIC_GA4_ID` | GA4 | e.g. `G-K0F7N513MS`. Default kept in code for continuity. |
| `NEXT_PUBLIC_CLARITY_ID` | Microsoft Clarity | Set from your Clarity dashboard → Setup → ID. If blank, Clarity is silently skipped. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel (primary) | Organic + retargeting audience events |
| `NEXT_PUBLIC_META_ADS_PIXEL_ID` | Meta Pixel (ads-only) | Optional second pixel dedicated to campaign reporting |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager | Optional — only load if GTM is actually used |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Legacy alias | Keep pointing to the same value as `NEXT_PUBLIC_META_PIXEL_ID` for older imports |

### 2.9 Meta Conversions API (server-side)

| Var | Notes |
|---|---|
| `META_CAPI_ACCESS_TOKEN` | Events Manager → your Pixel → Settings → Generate access token (system-user token recommended for stability) |
| `META_CAPI_TEST_EVENT_CODE` | Optional. Starts with `TEST`. Only for validating with the "Test Events" tab. Remove for production. |

### 2.10 Homepage hero video

| Var | Notes |
|---|---|
| `NEXT_PUBLIC_HOME_HERO_VIDEO_ID` | Bare YouTube video ID (11 chars after `v=`). If blank, the hero video block silently renders nothing. See §11 media offload. |

### 2.11 WhatsApp Cloud API (Meta)

| Var | Scope | Notes |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | Server | System-user permanent token (not the 24-hour temp one). Meta App → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | Server | Numeric ID of your WhatsApp Business Number |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Server | WABA ID |
| `WHATSAPP_VERIFY_TOKEN` | Server | **You invent this.** A random string. Meta uses it to verify the webhook once. |
| `WHATSAPP_APP_SECRET` | Server | App Dashboard → App Settings → Basic → App Secret. Used to verify HMAC on inbound webhooks. |
| `WHATSAPP_ENABLED` | Server | `true`/`false`. Set to `false` in preview envs to prevent accidental sends. |

---

## 3. SEO — What Changed and Why

The **SEO audit** in `docs/` (`Vyra-Herbals-SEO-AEO-GEO-Audit-and-Growth-Plan.pdf`)
identified 13 issues. This section explains what has been fixed in code and
what still needs off-code action.

### 3.1 Fixed in code

| Audit finding | Fix |
|---|---|
| Every page ships the same title/meta | `generateMetadata` in `app/product/[productHandle]/page.tsx`, `app/category/[categoryName]/page.tsx`, `app/blogs/[slug]/page.tsx`; central builders in `src/utils/seo.ts`. Root layout uses `metadataBase` + `title.template`. |
| Money pages are client-side rendered | Product + Category pages are now Server Components. They fetch from Supabase directly, render H1/price/description into raw HTML, and pass `initialProduct` down to the client shell so no fetch flash. |
| Zero structured data sitewide | Sitewide `Organization` + `WebSite` in root layout (via `<JsonLd />`). Per-route: `Product` + `Offer` + `AggregateRating` on PDPs, `BlogPosting` + `Person` (founder) on blogs, `BreadcrumbList` on both, `ItemList` on categories. `FAQPage` fires on PDPs when the product row has FAQs. Optional `FAQPage` on `/faqs`. |
| Sitemap lists only 8 URLs | `app/sitemap.ts` is now async: queries Supabase for every product handle, every distinct `category` value, and every blog handle. Uses `updated_at` for `lastModified`. Revalidates every 15 minutes. |
| `robots.txt` misconfigured | `app/robots.ts` now: allows `*`, explicitly welcomes GPTBot, ClaudeBot, PerplexityBot, Google-Extended, meta-externalagent, Applebot-Extended (14 AI agents), and disallows cart/checkout/login/etc. |
| Duplicate product URLs | Canonical URL is set per PDP in `buildProductMetadata`. Typo/legacy slugs → configure 301 in `next.config.ts` `redirects()` (list them out as they're identified in GSC). |
| Test routes shipped | `app/test-coupon`, `app/test-delivery`, `app/test-order` deleted. |
| Utility pages indexable | Every one of them (cart, checkout, login, signup, profile, orders, order-placed, wishlist, search, track-order, payment-failed, transaction) now has its own `layout.tsx` with `robots: { index: false, follow: true, nocache: true }`. |
| Weak image alt text on cards | Central pattern is now `alt={\`${product.title} — herbal hair oil, ${size}\`}` — see the update history in `src/Components/Shared/ProductCard*.tsx`. |

### 3.2 Not fixed in code — off-code actions for you

1. **Google Search Console**: submit the new `/sitemap.xml` (Settings →
   Sitemaps → Add sitemap → paste `sitemap.xml`). Should list ~30-100+ URLs
   instead of 8.
2. **GSC referral exclusion**: in GA4 Admin → Data Streams → Web → Configure
   tag settings → List unwanted referrals: add `pay.easebuzz.in` so the
   payment gateway stops polluting attribution.
3. **`www` vs apex**: pick one canonical host in Vercel (settings →
   Domains). Currently both variants appear in GSC. My `robots.ts` sets
   `host: SITE_URL` to point Google at the apex.
4. **Google Business Profile**: create/claim for Hyderabad. Products, photos,
   review collection, weekly posts. This is critical for the "vyra reviews"
   / "vyra official website" branded queries.
5. **Cloudflare AI-crawler override**: the *live* `robots.txt` today is
   served by Cloudflare's managed robots feature and blocks AI crawlers.
   Turn off "Managed robots.txt" in Cloudflare zone → SEO panel so our
   `app/robots.ts` takes effect. Verify by hitting `/robots.txt` and
   checking `GPTBot: Allow: /` is present.
6. **Content**: server infra is ready, but you still need to write the 8
   prioritised blog posts from the audit's §5.3 table. The `BlogPosting`
   schema + founder byline auto-populate when you publish them via the
   existing admin blog editor.

### 3.3 SEO acceptance checklist

Run these when you deploy the new code:

- [ ] `curl https://vyraherbals.com/robots.txt` shows `GPTBot: Allow: /` and disallows `/cart`, `/checkout`, `/login`, `/api/`.
- [ ] `curl https://vyraherbals.com/sitemap.xml` returns 30+ URLs including product and blog URLs.
- [ ] `curl -sS https://vyraherbals.com/product/<any-handle> | grep '<title>'` returns a unique product title, NOT the root layout title.
- [ ] `curl -sS https://vyraherbals.com/product/<any-handle> | grep 'application/ld+json'` returns at least 3 matches (Organization, WebSite from layout, Product from route).
- [ ] Google Rich Results Test on any PDP: [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results) — must show "Products" section with price, availability and star rating (if reviews exist).
- [ ] GSC → URL Inspection → View Crawled Page: raw HTML contains H1 with product name (not empty). If it's empty, revalidation hasn't happened yet — trigger `revalidatePath('/product/[handle]')` from admin.

---

## 4. Analytics — The Full Loop

### 4.1 Tools loaded

`src/Components/Common/AnalyticsLoader.tsx` is the ONE place that loads
analytics. It reads env vars and silently skips a tool if the ID is missing.

| Tool | ID env var | What it does |
|---|---|---|
| GA4 | `NEXT_PUBLIC_GA4_ID` | E-commerce funnel, traffic sources, non-brand organic clicks |
| Microsoft Clarity | `NEXT_PUBLIC_CLARITY_ID` | Heatmaps, session replay, rage clicks, dead clicks |
| Meta Pixel (primary) | `NEXT_PUBLIC_META_PIXEL_ID` | Retargeting audience, lookalike seeding, standard events |
| Meta Pixel (ads) | `NEXT_PUBLIC_META_ADS_PIXEL_ID` | Optional second pixel — cleaner campaign attribution |
| GTM (optional) | `NEXT_PUBLIC_GTM_ID` | Only if the marketing team uses GTM containers |

### 4.2 Events emitted

The named helpers in `src/utils/analytics.ts` are the ONLY sanctioned way to
fire events. They pair GA4 + Meta names correctly.

| Helper | GA4 event | Meta event | Fired from |
|---|---|---|---|
| `viewItem(product)` | `view_item` | `ViewContent` | `Singleproducts.tsx` PDP load (already wired) |
| `addToCart(item)` | `add_to_cart` | `AddToCart` | `AddToCartButton.tsx` (already wired) |
| `removeFromCart(item)` | `remove_from_cart` | — | Cart page remove handler (TODO) |
| `viewCart({items,value})` | `view_cart` | — | Cart page mount (TODO) |
| `addToWishlist(item)` | `add_to_wishlist` | `AddToWishlist` | `AddToWishlistButton.tsx` (already wired) |
| `beginCheckout({items,value})` | `begin_checkout` | `InitiateCheckout` | `Checkout.tsx` `handleCheckout` (already wired, now with items) |
| `addPaymentInfo({items,value,payment_type})` | `add_payment_info` | `AddPaymentInfo` | Checkout payment step (TODO) |
| `purchase({transaction_id,items,value})` | `purchase` | `Purchase` | `OrderPlaced.tsx` (already wired, now with items) |
| `search(q)` | `search` | `Search` | Search bar submit (TODO) |
| `signUp(method)` | `sign_up` | `CompleteRegistration` | Login/signup on success (TODO) |

**Which are wired vs TODO:** the audit's #1 critical finding was zero
conversions tracked. The three most valuable events (view_item, add_to_cart,
begin_checkout, purchase) are all wired with correct `items` arrays now.
The rest are helpers ready to drop in.

### 4.3 Meta Conversions API — the server-side backup

Browser Meta Pixel is blocked by iOS Safari ITP, ad-blockers, and CSPs on
about 20-40% of traffic. `src/utils/metaCapi.ts` re-posts the same events
server-side so Meta's attribution and audience building recover the lost
signal. Meta de-duplicates using `event_id`.

**Where to call it:** wherever you have a server-side confirmation of the
event. The obvious one is **Purchase** — call `capiPurchase({...})` from
`src/utils/orderFinalize.ts` right after Easebuzz confirms payment. Use
`event_id: \`order_${orderId}\`` so it matches the browser event.

### 4.4 Referral exclusion (CRITICAL — do this before validating conversions)

Right now `pay.easebuzz.in` shows up in GA4 as a "referral" traffic source
because after payment the shopper is bounced back to the site through the
gateway. GA4 credits the sale to Easebuzz instead of the true source
(Instagram, Google, etc.).

**Fix (one-time, GA4 UI):**
GA4 → Admin → Property → Data Streams → Web → Configure tag settings →
List unwanted referrals → Add:
- `pay.easebuzz.in`
- `testpay.easebuzz.in`
- `secure.easebuzz.in` (any Easebuzz subdomain used in your account)

After this every purchase attributes to its true origin.

### 4.5 Consent (DPDP Act — India)

This site does not have a cookie banner yet. When you add one, plug consent
signals into `AnalyticsLoader.tsx`:
- GA4: `window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied' })` on first load, then update to `'granted'` on accept.
- Meta Pixel: `fbq('consent', 'revoke')` until accept, then `fbq('consent', 'grant')`.

---

## 5. WhatsApp — Cloud API Flow, End to End

### 5.1 The end-to-end flow

```
CUSTOMER (WhatsApp)
     │
     ▼  message
META CLOUD API  ────────── outbound sends ───────────►  /api/whatsapp/send
     │                                                        │
     │ POST /api/webhooks/whatsapp                             ▼
     ▼                                                    whatsappClient.send()
Signature verified (HMAC-SHA256 vs WHATSAPP_APP_SECRET)   → whatsapp_messages
     │                                                     (direction=outbound)
     ├─► parseIncomingMessages (with profile.name join)
     │       │
     │       ▼
     │   logInboundMessage()  ─── writes ────────────►  whatsapp_messages
     │                                                   (direction=inbound)
     │
     ├─► parseStatusUpdates
     │       │
     │       ▼
     │   updateDeliveryStatusByMessageId() → whatsapp_messages.status
     │
     └─► processIncomingMessages (bot engine)
             │
             ▼
         handleMainMenu / handleOrderReceived / handleAddressInput / handleTracking
             │
             ▼
         whatsappClient.sendRaw() → back to customer

ADMIN INBOX (/admin/whatsapp)
     │  poll every 10s
     ├─► GET /api/admin/whatsapp/conversations   →  whatsapp_conversations VIEW
     ├─► GET /api/admin/whatsapp/thread          →  whatsapp_messages
     └─► POST /api/admin/whatsapp/reply          →  Meta Cloud API + append to table
```

### 5.2 Where inbound messages live

**One table, both directions.** `whatsapp_messages` was originally
outbound-only. The migration `supabase/migrations/20260906_whatsapp_inbox.sql`
adds:

- `direction TEXT` — `inbound` or `outbound`
- `body_text TEXT` — the text content of the message
- `interactive_reply TEXT` — button/list taps
- `is_read BOOLEAN` + `read_at` — for admin unread badges
- `profile_name TEXT` — the customer's WhatsApp display name
- Extended the status check constraint to allow `'received'`

Plus a view `whatsapp_conversations` that aggregates one row per phone with:
`last_message_at`, `last_message_preview`, `last_direction`, `unread_count`,
`total_messages`, and the customer's `profile_name`.

**Run the migration before deploy:**
```bash
# In Supabase Studio → SQL Editor, paste and run:
#   supabase/migrations/20260906_whatsapp_inbox.sql
# It is safe to re-run (every ALTER is IF NOT EXISTS).
```

### 5.3 Meta App Dashboard — one-time webhook setup

1. Meta Business Manager → App Dashboard → your app → WhatsApp → Configuration → Webhooks.
2. **Callback URL:** `https://vyraherbals.com/api/webhooks/whatsapp`
3. **Verify Token:** the value of `WHATSAPP_VERIFY_TOKEN` in Vercel env vars.
4. Click **Verify and save**. Meta will hit the GET endpoint with `hub.challenge`.
5. **Webhook fields → Subscribe to:** `messages` (this alone is what the inbox needs).
6. Save.

From the moment step 6 happens, every inbound customer message lands in
`whatsapp_messages` and the admin inbox shows it within 10 seconds.

### 5.4 The 24-hour customer service window

Meta rule: once a customer messages your business, you have **24 hours** to
reply with free text. After that, you can only send **pre-approved templates**.

The inbox enforces this:
- Client-side: the compose bar disables and shows "Outside 24h — use a template".
- Server-side (`/api/admin/whatsapp/reply`): rejects with HTTP 409 and a clear
  message pointing the admin at Broadcast.

For outside-window follow-ups use `/admin/whatsapp/broadcast` (the existing
template-send UI, now at that subpath).

### 5.5 What the audit called out — and what we cannot do

Meta does **not** store inbound history for you. If a customer messaged you
before the webhook was live, that message is gone forever. No API surfaces
it. This is an inherent limit of Meta Cloud API — not a code gap.

The empty-state message in the inbox says exactly this.

### 5.6 Rotating the WhatsApp access token

Meta's default access tokens expire in 24 hours. Use a **System User
permanent token** in production:

1. Meta Business Manager → Users → System Users → Add (call it "vyra-web-server").
2. Assign asset: your WhatsApp Business Account (Full control).
3. Generate token, scopes: `whatsapp_business_management`, `whatsapp_business_messaging`.
4. Copy the token → paste into `WHATSAPP_ACCESS_TOKEN` in Vercel.
5. Redeploy (env var change requires redeploy).

---

## 6. Payments — Easebuzz

- **SDK integration:** `src/utils/easebuzz.ts`
- **Server routes:**
  - `POST /api/payment/initiate` — hashes the request with `EASEBUZZ_SALT` and returns the redirect URL.
  - `POST /api/payment/success` — Easebuzz webhook. Verifies the hash BEFORE marking the order paid.
  - `POST /api/payment/cod` — cash on delivery path (skips gateway; still marks the order confirmed).
  - `POST /api/payment/failed` — records failure for the /payment-failed screen.
- **iCarry hand-off:** on payment success, `orderFinalize.ts` calls `orderShipment.ts` which books an iCarry AWB and writes it back on the order row. WhatsApp `shipment_created` fires from the same flow. Any failure at either step never fails the order — see the "wrapped so WhatsApp failure can never fail the order" note in `WHATSAPP_GO_LIVE.md`.
- **Attribution:** don't forget the referral exclusion in §4.4 or every purchase attributes to Easebuzz.

## 7. Shipping — iCarry

- **Client:** wrappers in `src/utils/shipping.ts` + `src/utils/orderShipment.ts`.
- **Auto-assign:** by default we pick the cheapest available courier. Override with `ICARRY_SELECT_CHEAPEST=false` + `ICARRY_COURIER_PRIORITY` for a fixed order.
- **Status sync:** iCarry does not push status updates. The admin panel has a manual "Sync from iCarry" button. Every sync run picks up at most 20 orders that changed status; the rest are picked up on the next run.
- **WhatsApp delivery updates:** the sync action fires the appropriate template (`order_shipped`, `out_for_delivery`, `delivered`, …). See `app/api/admin/orders/sync-status/route.ts`.
- **Automating status sync:** add a Vercel cron entry in `vercel.cron.json` hitting `/api/cron/icarry-sync` on your desired schedule; guard with `CRON_SECRET`.

## 8. Admin Panel

- **Auth:** JWT cookie `admin_token` signed with `JWT_SECRET`. `requireAdmin(request)` in `src/utils/adminAuth.ts` gates every admin API route. Fail loud when `JWT_SECRET` is missing.
- **Login:** `/admin/login` — supports both `ADMIN_PASSWORD_HASH` (scrypt) and `ADMIN_PASSWORD` (plaintext fallback for staging).
- **Sections:** Dashboard, Orders (with iCarry sync, WhatsApp resend, PDF invoice via `jspdf`), Products, Categories, Ingredients, Blogs, Reviews, Testimonials, Coupons, Customers, Inquiries, Settings, Before-After (image gallery), WhatsApp Inbox, WhatsApp Broadcast.
- **Data:** every admin API route pulls through `getSupabaseAdmin()` (service-role key, bypasses RLS). Never call service-role from the browser.
- **Noindex:** `app/admin/layout.tsx` sets `robots: 'noindex, nofollow'` sitewide for /admin/*.

### 8.1 Common admin tasks

| Task | Where |
|---|---|
| Approve a review | Admin → Reviews → status dropdown |
| Publish a blog post | Admin → Blogs → New post. Founder byline auto-populates. |
| Send a template broadcast | Admin → WhatsApp → Broadcast → paste CSV of phone numbers → pick template |
| Reply to an inbound message | Admin → WhatsApp → click the conversation → type + Send |
| Adjust free-shipping threshold | Admin → Settings → Shipping |
| Add a category card | Admin → Categories → New (category card image goes to Supabase Storage) |
| Look at recent orders | Admin → Orders (filter by status, sync from iCarry) |
| Refund | Not yet automated; the WhatsApp `refund` template slot is ready. |

## 9. Cron / Scheduled Jobs

`vercel.cron.json` defines the jobs. All cron endpoints check
`Authorization: Bearer $CRON_SECRET`.

| Endpoint | Frequency | What it does |
|---|---|---|
| `/api/cron/reconcile-payments` | Every 15 min | Catches Easebuzz webhooks we missed. Marks paid orders that are stuck in "processing". |
| `/api/cron/icarry-sync` (if wired) | Hourly | Bulk sync iCarry order statuses + fire WhatsApp updates. |
| `/api/cron/whatsapp-retention` | Daily | Purges `whatsapp_messages` older than N days (see `deleteOlderThan`). |

## 10. Security posture

- **CSP:** `next.config.ts` ships a full Content-Security-Policy. `script-src` still allows `unsafe-inline` and `unsafe-eval` because GTM, Meta Pixel, styled-components and Next.js's bootstrap all require them. Tightening to a nonce is the next step and needs the GTM/Pixel snippets moved to `next/script` with a nonce first (partially done via `AnalyticsLoader.tsx`).
- **HSTS:** enabled with `max-age=1y; includeSubDomains; preload`.
- **Permissions-Policy:** all hardware APIs (camera, mic, geolocation, USB, sensors, payment, FLoC/topics) are denied — storefront never uses them.
- **X-Frame-Options: SAMEORIGIN** — blocks clickjacking of `/checkout`.
- **X-Robots-Tag: noindex, nofollow** on every `/api/*` response.
- **Cache-Control: no-store** on every `/api/*` response.
- **`poweredByHeader: false`** — do not advertise Next.js to scanners.
- **Sensitive env vars:** rotate any that were pasted in chat during development. See §12.

## 11. Media offload plan

The old repo shipped 4 MP4s (52 MB) and a raw 15 MB JPG in `public/`. All
were deleted from the tree. The new plan:

1. **YouTube** for videos. Upload → get 11-char video ID → set
   `NEXT_PUBLIC_HOME_HERO_VIDEO_ID`. `YouTubeFacade.tsx` renders a
   click-to-play poster; the real iframe only loads on interaction. Uses
   `youtube-nocookie.com` for privacy-friendly embedding.
2. **Supabase Storage** for product/lifestyle photos. Already the pattern
   for product images (`obbohecegyagnqufelpx.supabase.co/storage/v1/...`).
   `next.config.ts` already allows this host in `images.remotePatterns`.
3. **`next/image`** for anything in `public/`. `AVIF` + `WebP` formats are
   already enabled. Set explicit `width`/`height` or use `fill` inside an
   aspect-ratio wrapper — avoid raw `<img>` for content images.

## 12. Deployment

### 12.1 First deploy of this new repo

1. In Vercel → **Import Project** → `Kbs-sol/vyra-herbals-web` (main branch).
2. Framework: **Next.js** (auto-detected).
3. Environment Variables → paste every variable from `.env.example` into
   Vercel with real values. **Do not commit `.env`.**
4. Deploy.

### 12.2 Domain

- Add `vyraherbals.com` and `www.vyraherbals.com` in Vercel → Domains.
- Set apex (`vyraherbals.com`) as the primary. Redirect www → apex.
- Update DNS at your registrar to Vercel's nameservers or A/CNAME records.
- After DNS propagates, verify:
  - `curl -I https://vyraherbals.com` → 200
  - `curl -I https://www.vyraherbals.com` → 308 to apex

### 12.3 Cloudflare (if in front)

If Cloudflare is in front of Vercel, disable:
- **Managed robots.txt** (SEO panel) — otherwise it overrides our `app/robots.ts`.
- **Rocket Loader** — breaks Next.js hydration.
- **Auto Minify (HTML/JS/CSS)** — Vercel does it better and Cloudflare's
  minify occasionally breaks styled-components inline styles.

### 12.4 Rollback

Vercel keeps every deployment. If a release goes bad:
1. Vercel → Deployments → find the last-good one → **Promote to Production**.
2. Debug the broken commit on a preview branch.

## 13. Troubleshooting cheatsheet

| Symptom | Likely cause | Where to look |
|---|---|---|
| GA4 shows 0 conversions | Referral exclusion not set OR events never fire client-side | §4.4; then `window.dataLayer` in browser devtools should list `add_to_cart` etc. |
| Meta Pixel Test Events shows fewer than expected | Ad-blocker / iOS ITP — that's exactly why CAPI exists (§4.3). Set up CAPI. |
| Admin inbox empty despite customer messages | Webhook not verified in Meta → App Dashboard → WhatsApp → Webhooks. Or `WHATSAPP_APP_SECRET` mismatched → HMAC check rejects. |
| "Outside 24h window" error when replying | Real. Send a template via `/admin/whatsapp/broadcast`. |
| Product page 404s in Google | Handle changed in DB but sitemap has old value. Wait 15 min (revalidate) or hit `POST /api/revalidate?path=/sitemap.xml` (if wired). |
| Category page missing products | `status` column shape doesn't match sitemap query. Check `products.status` — sitemap accepts `1`, `'active'`, or `NULL`. |
| Sitemap only shows 8 URLs after deploy | `SUPABASE_SERVICE_ROLE_KEY` not set in Vercel env vars → server helper falls back to zero rows. Check logs. |
| `robots.txt` still blocks GPTBot | Cloudflare's managed robots.txt is on. See §12.3. |
| Payment succeeds but order not created | Easebuzz webhook signature mismatch (`EASEBUZZ_SALT` wrong) OR `/api/payment/success` returned 500. Check Vercel logs. Cron `/api/cron/reconcile-payments` catches these up to 15 min later. |
| iCarry order stuck in "Unassigned" | `ICARRY_ORIGIN_PINCODE` doesn't match the pickup address, or all couriers exhausted (`ICARRY_MAX_COURIER_ATTEMPTS`). Admin → Orders → Order → "Retry iCarry". |
| WhatsApp OTP not arriving | `MESSAGE_CENTRAL_KEY` is flagged "Needs Attention" in Vercel. Rotate it. |
| Type errors on build | `next.config.ts` sets `ignoreBuildErrors: false` — this is deliberate. Run `npm run typecheck` locally, fix, and don't re-enable the flag. |

## 14. Things this session deliberately did NOT change

Being explicit about scope so future you doesn't wonder:

1. **`Checkout.tsx` (1220 LOC)** — huge, but changing it risks payment. Wired the tracking events; left the file structure alone. Follow-up: split into `useCheckout`, `useShippingAddress`, `usePayment` hooks.
2. **`Singleproducts.tsx` (1057 LOC)** — added `initialProduct` prop so it takes SSR data; left the interactive UI alone.
3. **Admin `products/page.tsx` (1832 LOC)** — untouched. It works.
4. **`Header.tsx` (886 LOC)** — untouched. It works.
5. **Order ID generation (`Date.now()` in `orderFinalize.ts`)** — the audit flags collision risk. Real risk is small at current volume but should be migrated to UUID v4 with an idempotency key on the payment side. Not this pass.
6. **Cart context re-renders** — the whole cart re-renders on every quantity change. Not urgent given cart sizes are small; refactor to a `Map<id, item>` + selector hooks later.
7. **`bootstrap` + `slick-carousel` + `sass`** — big dependencies, but ripping them out mid-flight breaks styling in many places. Consolidate onto Tailwind or CSS Modules in a dedicated pass.
8. **Blog default author** — was hardcoded to "Nat Habit". Now falls back to the configured founder name in the blog page. Any old blog rows still carrying `author = 'Nat Habit'` in the DB need a one-time `UPDATE blogs SET author = '<founder name>' WHERE author = 'Nat Habit'`.

## 15. Post-deploy checklist (30 minutes)

Run this after the first Vercel deploy of this repo:

- [ ] Apply the WhatsApp inbox migration in Supabase Studio.
- [ ] Verify the Meta webhook: hit "Verify and save" in Meta App Dashboard.
- [ ] Send a test WhatsApp message from your own phone to the business number. It should appear in `/admin/whatsapp` within 10 s.
- [ ] Rotate `MESSAGE_CENTRAL_KEY` (currently "Needs Attention").
- [ ] Rotate `JWT_SECRET` (invalidates existing admin sessions — expected).
- [ ] In GA4 → Data Streams → Web → configure `pay.easebuzz.in` as unwanted referral.
- [ ] Submit `https://vyraherbals.com/sitemap.xml` in Google Search Console.
- [ ] Turn off Cloudflare Managed robots.txt.
- [ ] Set `NEXT_PUBLIC_CLARITY_ID` (Microsoft Clarity → Setup → paste your project ID).
- [ ] Set `NEXT_PUBLIC_META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN`.
- [ ] Upload the homepage hero video to YouTube, paste ID into `NEXT_PUBLIC_HOME_HERO_VIDEO_ID`.
- [ ] Rich Results Test on 3 different product pages: green.
- [ ] GSC → URL Inspection on the top 3 category pages, "Request indexing".

## 16. Where to send help

- **Site broken**: Vercel deployment logs → the failing route's log stream.
- **Database issue**: Supabase Studio → Logs → filter by table.
- **WhatsApp delivery issue**: Meta Business Manager → WhatsApp Manager → Insights → Delivery.
- **Payment stuck**: Easebuzz merchant dashboard → Transactions.
- **iCarry issue**: iCarry dashboard → Orders → search by AWB.
- **SEO question**: this document (§3), then the SEO audit PDF in `docs/`.
- **Code audit findings**: `docs/vyra-herbals-audit-report.pdf` (largely fixed — see §14 for what's deferred).

_Last updated: with the vyra-herbals-web migration + SEO/GEO/AEO + Meta CAPI + DPDP consent + admin Media Library + admin dashboard UX pass — 2026-09-15._

---

## Credit

The SEO / GEO / AEO rebuild, Meta Pixel + Conversions API wire-up, DPDP consent stack, `/admin/media` Library page, admin dashboard welcome header + quick-actions, and this System Literacy document itself were built by **[VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com%20%2F%20its%20GitHub%20repo%20and%20wanted%20to%20get%20in%20touch.)**.

Reach VJ at [vijayprasadvvp@gmail.com](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com) — the mailto pre-fills a subject line with the site name so VJ knows where you found this credit.

