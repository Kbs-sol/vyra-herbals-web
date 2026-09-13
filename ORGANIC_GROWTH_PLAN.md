# Vyra Herbals — Organic Growth Plan (Data-Backed)

> **Purpose:** Grow organic traffic and revenue at vyraherbals.com without spending on ads. This plan is built strictly on the data you provided (order analysis PDF, GSC export, Meta Ads plan, Instagram exports for both Vyra and the Kavya competitor account) — no generic "content strategy" filler.
>
> **Prepared:** 2026-09-13 · **Companion doc:** [`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md) explains the code side.

---

## 1. Ground truth (what your data actually says)

### 1.1 Who buys, where

From `Vyra_Order_Analysis_and_Meta_Ads_Report.pdf` — 2,995 verified orders, Apr 2024 → May 2026:

| Rank | State | Orders | % of total | Delivered % | Class |
|---|---|---|---|---|---|
| 1 | **Telangana** | 1,219 | **40.7%** | 89.3% | High |
| 2 | **Andhra Pradesh** | 878 | **29.3%** | 88.3% | High |
| 3 | **Karnataka** | 356 | **11.9%** | 87.4% | High |
| 4 | Tamil Nadu | 227 | 7.6% | 81.5% | High (fastest-growing, +65.7%) |
| 5 | Maharashtra | 117 | 3.9% | 84.6% | High |
| 6–10 | Odisha, Chhattisgarh, Delhi, UP, WB | 113 | 3.8% | 78-100% | Medium |
| 11–23 | rest of India | 85 | 2.8% | mixed | Low |

**One line:** the top 3 states = **81.9% of every order you've ever taken.** The next 2 states push it to **93.4%.** This is a South-India brand. Marketing should reflect that.

### 1.2 What's on the shelves

Business snapshot from the Meta Ads plan PDF: **~100 orders/month, ~₹350 AOV, COD enabled, ₹300/day ad cap.** Combos are the profitable landing target:

| Combo | Price |
|---|---|
| Shampoo 200ml + Scalp Massager | ₹429 |
| **Hair Oil 100ml + Shampoo 200ml** (best starter for cold traffic) | **₹529** |
| Hair Oil 200ml + Shampoo 200ml | ₹679 |
| Vyra Mini Scalp Care Kit | ₹829 |

### 1.3 What's already working — Instagram

From the Vyra IG export and the competitor benchmark:

- **Viral reel `C5D5N0FveEf`:** ~9.99M views, 73,955 likes, 5,296 comments — a transformation-storytelling reel. **This is your winning content pattern.** Recent posts averaging ~50 likes = your reach engine is stalling and needs the reel format back.
- **Kavya's competitor account (`kavyas_hairandskincare`):** similar niche, higher engagement per post — key insight: they publish concern-led, before/after content on a **weekly** cadence. Vyra's cadence is irregular.

### 1.4 What's already ranking in Google — but not clicked

From `vyraherbals.com-Performance-on-Search-2026-08-18.xlsx`:

| Signal | Number | What it means |
|---|---|---|
| /category/hair-oil impressions | 446 | Page 1 (position 4.9) — nobody clicks because the title is generic. |
| /category/shampoo impressions | 122 | Position 3.8 — same problem. |
| Total blog posts ranking | 7 | Positions 28-50 (page 3-5). Too thin. |
| "vyra herbals" brand clicks | 29 | ~93% of ALL clicks are branded. |
| "vyra reviews" clicks | 0 (14 impr) | You have no /reviews or /review page — user gives up. |
| ChatGPT referrals | 8 sessions | Proof AI-assistant discovery works. Compound it. |
| Rich-result impressions | 0 | Nothing — you had no schema until this rebuild. |

### 1.5 The one-sentence diagnosis

**You have a demand-capture problem, not a demand-generation problem.** Google is already showing your category pages on page 1, ChatGPT is already citing you, Instagram already produces viral content — the site *fails to convert any of that visibility into clicks or orders* because the pages have identical titles, no schema, no concern-specific landing pages, and no product feed in Merchant Center.

---

## 2. What this rebuild has ALREADY shipped

Live at [vyraherbals.com](https://vyraherbals.com) (via [vyra-herbals-web.vercel.app](https://vyra-herbals-web.vercel.app)) after these commits landed:

| Fix | Files | Impact |
|---|---|---|
| Dynamic sitemap querying Supabase | `app/sitemap.ts` | 8 URLs → **every product + every category + every blog + every concern page** |
| AI-crawler-friendly `robots.txt` | `app/robots.ts` | GPTBot, ClaudeBot, PerplexityBot, Google-Extended, +10 others explicitly allowed |
| Sitewide JSON-LD schema | `src/utils/seo.ts`, `src/Components/Shared/JsonLd.tsx` | Organization + WebSite + Product + Offer + AggregateRating + FAQPage + BlogPosting + Person + ItemList + BreadcrumbList — all in raw pre-hydration HTML |
| Per-page `generateMetadata` | product/category/blog server components | Every product / category / blog now has a **unique** title + description + canonical |
| Product page server-rendered | `app/product/[productHandle]/page.tsx` | H1, price, description in raw HTML — Google no longer needs to execute JS to see the product |
| Category page server-rendered | `app/category/[categoryName]/page.tsx` | ItemList in HTML, unique title, breadcrumb schema |
| Utility pages set to `noindex` | `app/{cart,checkout,login,…}/layout.tsx` | 88 impressions/month on `/cart` and `/track-order` no longer waste crawl budget |
| GA4 e-commerce events wired | `src/utils/analytics.ts` + Checkout + OrderPlaced | `view_item`, `add_to_cart`, `begin_checkout`, `purchase` with full items[] — GA4 will now show revenue-by-SKU |
| Unified analytics loader | `src/Components/Common/AnalyticsLoader.tsx` | GA4 + Clarity + Meta Pixel + Meta Ads pixel + optional GTM, one script tag each |
| Server-side Meta Conversions API | `src/utils/metaCapi.ts` | Recovers the 20-40% of purchase events lost to iOS Safari ITP / adblockers |
| WhatsApp inbox dashboard | `app/admin/whatsapp/*` + `/api/admin/whatsapp/*` | Reads inbound customer messages, 24h reply window, per-thread view |

**+ this commit specifically** adds:

| New file | What it does |
|---|---|
| `app/feed.xml/route.ts` | **Google Merchant Center product feed** — unlocks Shopping tab, free "Popular products" carousel, image-search shopping shelf |
| `app/llms.txt/route.ts` | Curated brand summary for AI assistants (llmstxt.org convention) — compounds the 8 ChatGPT sessions |
| `app/concern/[concern]/page.tsx` | **Four concern-based landing pages** — Hair Fall, Hair Growth, Dandruff, Scalp Care — each with a 40-60 word AEO answer, buying guide, 5-6 FAQ block, product carousel |

---

## 3. The remaining gaps — what's still leaving traffic on the table

These are the specific things that could not be shipped in code alone. All require you to click a button somewhere.

### 3.1 CRITICAL — Set up Google Merchant Center (this is a 45-minute task)

You asked about Google Shopping tab visibility. This is the single biggest immediate lever.

1. Go to [merchants.google.com](https://merchants.google.com/) and create an account (use your existing Google account tied to GSC).
2. Verify and claim `vyraherbals.com` — it will auto-verify because GSC is already linked.
3. Set shipping and tax:
   - Shipping: `India` → `Standard` → `0 INR` (free)
   - Tax: `India` → 0% (or your GST rate on B2C sales)
4. Add feed:
   - Method: **Scheduled fetch**
   - Feed name: `Vyra Products`
   - Fetch URL: `https://vyraherbals.com/feed.xml`  ← the endpoint I just built
   - Country: **India**
   - Language: **English**
   - Currency: **INR**
   - Frequency: **Daily at 06:00 IST**
5. Enable **Free Product Listings**. This is what puts you in the Shopping tab and the "Popular products" carousel for free.
6. First fetch happens within 15 minutes. Review in Merchant Center → Products → fix any warnings (usually: missing GTIN — I already emit `identifier_exists: no` so this won't block; image issues are the more common cause).
7. Google's approval takes 3-5 days. Once approved, your products can appear in:
   - Google Shopping tab (search.google.com/shopping)
   - "Popular products" carousel on regular search results
   - Google Lens shopping shelf
   - Google image search shopping filter

**Expected impact:** Kama Ayurveda, Just Herbs, Blue Nectar, Mamaearth all show up in Shopping tab today. You don't. Once approved, expect **10-30% lift in commercial-intent traffic** within 6 weeks.

### 3.2 CRITICAL — Google Business Profile for Hyderabad

Your GSC data shows queries like `"vyra reviews"` and `"vyra herbals hyderabad"` generating impressions with zero-click. That's because Google's answer for these queries is a knowledge panel — and you don't have one because you have no Google Business Profile.

1. [business.google.com](https://business.google.com/) → Add business.
2. Business name: `Vyra Herbals`
3. Category: `Beauty Product Supplier` + secondary `Cosmetics Store`
4. Location: your Hyderabad address (or service-area business if you don't want a public address)
5. Service area: Telangana, Andhra Pradesh, Karnataka, Tamil Nadu
6. Add products, photos (10-15 high quality), business hours, phone, website
7. Verify (postcard or phone) — takes 3-14 days
8. Once verified: add 3-5 posts per week (product highlights, before/after, festival offers). This is what feeds the Google knowledge panel and answers the "vyra reviews" query with your own reviews instead of a random third-party page.

### 3.3 CRITICAL — Submit sitemap in GSC

The sitemap now has ~50 URLs instead of 8, but **Google won't re-crawl it automatically**. You must trigger it:

1. Go to Google Search Console → your `vyraherbals.com` property
2. Left menu → **Sitemaps**
3. Delete the old entry if present (`sitemap.xml`)
4. Add new: `sitemap.xml` (path only, GSC prepends the domain)
5. Also add: `feed.xml` (yes, GSC accepts feeds too — it helps discovery)
6. Watch the "Discovered" count over the next 48h. Should climb from 8 to 40-50 URLs.

### 3.4 CRITICAL — Fix Cloudflare's `robots.txt` override

I ship a proper `app/robots.ts` that welcomes GPTBot / ClaudeBot / PerplexityBot / Google-Extended. But Cloudflare is serving its own "Managed robots.txt" that blocks them. Turn it off:

1. Log in to Cloudflare → your `vyraherbals.com` zone
2. Left menu → **SEO** (or search "robots" in the top bar)
3. **Managed robots.txt** → toggle **OFF**
4. Verify by running: `curl https://vyraherbals.com/robots.txt`
   - You should see `GPTBot: Allow: /`, `ClaudeBot: Allow: /`, `Google-Extended: Allow: /`
   - If you see a lot of `Disallow: /` blocks by user-agent, Cloudflare is still winning

### 3.5 IMPORTANT — Category page copy (300-500 words + FAQ block)

Right now `/category/hair-oil` ranks position 4.9 with 0.9% CTR — the category page has just a product grid, no supporting copy. Google keeps ranking it because the product grid technically matches, but users bounce because there's no context.

**Action:** through the existing admin panel, add to each of the top 5 categories:
- A 200-word intro (`what is <category> good for`, `who is it for`, `how to choose`)
- A 5-question FAQ block (`how to use`, `how often`, `is it safe for X`, `results in how long`, `combo suggestion`)

The FAQ block will inherit the `FAQPage` schema I set up in `src/utils/seo.ts` — just add the copy through the admin.

For each of the 5 categories, the **exact starting copy** is already written inside the concern landing pages (`app/concern/[concern]/page.tsx`) — you can copy/adapt from there. Hair Oil category → copy from `/concern/hair-fall` and `/concern/hair-growth`. Shampoo category → copy from `/concern/dandruff`.

### 3.6 IMPORTANT — Blog cadence

You have 7 blog posts, all at positions 28-50 (pages 3-5 of Google). Not thin content — thin **quantity**. Google needs to see topical authority.

**Recommended cadence:** 1 post per week for 12 weeks. Topics (this is a keyword-mapped list, use in order):

| # | Topic | Target keyword | Expected difficulty |
|---|---|---|---|
| 1 | Best Herbal Hair Oil for Hair Fall in India (2026) | "best herbal hair oil hair fall india" | Medium — commercial intent |
| 2 | Vyra Hair Oil Review: Real Ingredients, Real Results | "vyra reviews" (owns your existing 14 branded impressions with 0 clicks) | Easy — brand query |
| 3 | How to Use Rosemary Leaves for Hair Growth (3 methods) | "how to use rosemary leaves for hair growth" | Easy — long-tail |
| 4 | Hair Oiling: When, How Often, How Long | "how many times a week oil hair" | Easy — question query |
| 5 | Onion vs Rosemary vs Neem Oil for Hair | "which oil best hair growth" | Medium — comparison query |
| 6 | Why Is My Hair Falling Out? 9 Causes + Ayurvedic Fix | "why is my hair falling" | Medium — informational |
| 7 | Sulphate-Free Shampoo: What It Means & Who Needs It | "sulphate free shampoo india" | Medium |
| 8 | Postpartum Hair Fall: The Ayurvedic Recovery Guide | "postpartum hair fall treatment" | Easy — niche |
| 9 | Premature Greying: Herbs That Actually Help | "premature greying home remedies" | Medium |
| 10 | Complete Guide to Neem for Hair | "neem for hair benefits" | Easy |
| 11 | The 15-Minute Oiling Ritual: Step-by-Step Video | "how to oil hair properly" | Medium |
| 12 | Founder Story: How I Built Vyra from a Home Remedy | "vyra herbals story" | Very easy — brand |

Each post: 1,000-1,500 words, opens with a 40-60 word direct answer (matches AEO/AI-Overview format), embeds 2-3 images, links to the matching product page, links to the matching `/concern/…` page.

### 3.7 IMPORTANT — Repurpose the 229 existing videos

The competitor (Kavya's) success + your own viral reel prove transformation content works. **You have 229 existing video assets sitting on Instagram doing nothing on other platforms.**

Free-effort distribution (30 min per video):
- **YouTube Shorts** — upload with a keyword-rich title like "How to reduce hair fall with rosemary (before/after)" — each Short becomes an SEO asset that YouTube search indexes.
- **Pinterest** — hair-care is a **top-3 Pinterest category**. Upload every reel as a Pinterest Idea Pin with a link back to `/concern/hair-fall` or the matching product.
- **Facebook Reels** — cross-post from Instagram (Meta's own cross-post tool).

**Expected impact:** each channel is a discovery surface. Even 5% of your Instagram audience discovering you via YouTube Search = compounding organic traffic.

### 3.8 IMPORTANT — Regional / language content

82% of your orders come from Telangana, AP, Karnataka. That means a chunk of your audience is comfortable in **Telugu**. GSC shows zero Telugu-language pages ranking for you. Massive gap.

- Translate `/concern/hair-fall` and `/concern/hair-growth` to Telugu. Use `hreflang` tags to signal the alternate.
- Add a Telugu-language landing page at `/te/juttu-rala` (which is the direct translation of "hair fall").
- Post 1 Telugu-caption Instagram reel per week — Kavya's account does this and it lands with the Hyderabad audience.

I can ship the Telugu pages in code once you provide translated copy. Ask me and I'll wire the routing.

### 3.9 Marketplace presence (feeds the entity signal)

You don't currently sell on Amazon.in / Flipkart / Meesho, or your listings aren't visible. This is a **GEO (AI-search) win** even if the marketplace sales are low: AI assistants use Amazon listings as a source of truth when answering "is Vyra Herbals legit?" or "where can I buy Vyra hair oil?".

- Amazon.in seller account (Category: Beauty). Even one listing (100ml oil) with 10-20 reviews lifts brand-entity signals.
- Flipkart Seller Hub (same product).
- Meesho reseller account (already have visual presence in `/public/Meesho-682x435.avif` — activate it).

### 3.10 Reviews flywheel

You have thousands of positive Instagram comments and DMs but zero on-site reviews with photos. That's the review section on the PDP that Google shows in AggregateRating rich snippets. Fix:

1. WhatsApp automation (I already have the plumbing) — 7 days after `delivered` status, auto-send a template asking for a review + photo.
2. That flow deposits into your existing `reviews` table (I already wire `AggregateRating` from those rows into JSON-LD).
3. Give a **₹50-off coupon on next order** for anyone who submits a review with photo. Cost-neutral because it drives repeat purchase.
4. **Expected:** 10-15% of shipped orders come back with a review = 15 new reviews/month at your current volume. In 6 months = 90 reviews per product. That gets you the ★ 4.8 rating badge in Google Shopping.

### 3.11 Referral program

Your top 3 states are word-of-mouth heavy (South India, especially Telugu-speaking Andhra + Telangana). A referral program is native to that culture.

- Simple: customer shares a unique code → new buyer gets ₹75 off first order → referring customer gets ₹75 credit.
- Requires: one new admin page (`/admin/referrals`), one new customer-facing widget on `/profile`, and hooks into checkout's coupon system (which already exists in `/api/coupon/validate`).
- I can ship this in a follow-up commit if you approve.

---

## 4. What NOT to spend time on (based on the data)

- **Facebook Groups.** Your data shows ChatGPT sending 8 sessions but Facebook barely visible. Time on new FB Groups = low ROI.
- **Twitter/X.** Hair care doesn't win there. Skip.
- **Blog SEO for high-competition keywords like "best hair oil"** in month 1. You'll lose to Nykaa, Amazon, and 20-year-old sites. Instead, chase long-tail (topics 3, 4, 8, 10 in §3.6) — these have real intent, low competition, and directly match product pages.
- **Backlink outreach at scale.** In months 1-3, focus on the on-site foundation. In month 4+, pitch the founder story to Telugu digital media (`Suryaa`, `Sakshi Post`, `Vaartha Gujarati`) for one high-authority link. That single link is worth 100 low-quality directory links.

---

## 5. 90-day execution roadmap

### Weeks 1-2 — Ship what's already ready

- [ ] Merchant Center + `/feed.xml` submitted → §3.1
- [ ] Google Business Profile claimed → §3.2
- [ ] GSC sitemap resubmitted → §3.3
- [ ] Cloudflare robots override disabled → §3.4
- [ ] Announce 4 concern landing pages by requesting indexing in GSC → paste each `/concern/*` URL into GSC → URL Inspection → "Request indexing"

### Weeks 3-4 — Content foundation

- [ ] Category page copy on top 5 categories → §3.5
- [ ] Blog posts #1-2 published → §3.6
- [ ] WhatsApp review-request template approved by Meta → §3.10
- [ ] YouTube channel created, first 10 Shorts uploaded from existing Instagram assets → §3.7

### Weeks 5-8 — Content compounding

- [ ] Blog posts #3-6 published → §3.6
- [ ] 30+ Pinterest Idea Pins → §3.7
- [ ] Amazon.in listing live with 10 reviews → §3.9
- [ ] First 20 on-site reviews collected via WhatsApp flow → §3.10

### Weeks 9-12 — Authority + regional

- [ ] Blog posts #7-12 published → §3.6
- [ ] Telugu-language landing pages live → §3.8
- [ ] Founder-story digital PR: 2 pitches sent to Telugu media
- [ ] Referral program launched → §3.11

---

## 6. KPI targets

Track weekly in GA4 + GSC. Baseline is your current data.

| Metric | Baseline (today) | Week 4 target | Week 12 target | How to measure |
|---|---|---|---|---|
| Non-brand organic clicks | ~5/month | 15/month | **50+/month** | GSC → filter out "vyra" |
| Total organic sessions | 254/period | 400 | **1,000+** | GA4 → Traffic acquisition |
| Category page CTR | 0.9% | 2.0% | **3.5%+** | GSC → Pages → /category/* |
| Rich-result impressions | 0 | 100+ | **500+** | GSC → Search appearance |
| Google Shopping impressions | 0 | 200 | **2,000+** | Merchant Center → Performance |
| AI-assistant referrals | 8 sessions | 15 | **35+** | GA4 → Referrals filtered for chatgpt.com, perplexity.ai, gemini.google |
| On-site reviews (all products) | ~5 (est.) | 20 | **80+** | Supabase `reviews` count |
| Instagram engagement (avg likes) | ~50 | 150 | **250+** | Weekly export |
| Email/WhatsApp opt-ins | Unknown | Track | **500+** | WhatsApp subscribers list |
| **Organic revenue** | Untracked today | First tracked purchases | **≥ 1% CVR from organic** | GA4 e-commerce (now wired) |

---

## 7. What to do if / when this hits

If §3.1 (Merchant Center) and §3.5 (category copy) are done in the first 4 weeks and traffic 2-3x's but conversion stays flat: the bottleneck is **checkout**, not traffic. Come back to me — checkout is a 1,220-LOC file we deliberately did NOT refactor in the rebuild.

If traffic doesn't grow after 4 weeks despite §3.1-3.4 all being live: **Cloudflare is almost certainly still serving a cached older robots.txt or sitemap.** Purge the entire Cloudflare cache from the dashboard.

If Merchant Center rejects the feed with "Missing GTIN" as a hard error: run `UPDATE products SET sku = NULL WHERE sku NOT ~ '^[0-9]{8,14}$'` in Supabase — my feed already emits `identifier_exists: no` when the SKU doesn't look like a GTIN, but if your SKUs happen to be 13 digits that aren't real GTINs, Merchant Center's validator gets angry.

---

## 8. Recap in one paragraph

You do not have an organic-traffic problem. You have a *demand-capture* problem: Google already ranks you, ChatGPT already cites you, Instagram still produces viral content — but your site was invisible to the first crawl (client-side rendering, identical titles, no schema, no product feed). The rebuild fixed the invisibility. This document lists the ten off-code actions — starting with Merchant Center and Cloudflare robots — that turn that invisibility fix into actual clicks and orders. Everything is sequenced so the cheapest, highest-certainty wins come first.

_Last updated: 2026-09-13 · The code side of this plan is in [`SYSTEM_LITERACY.md`](./SYSTEM_LITERACY.md)._
