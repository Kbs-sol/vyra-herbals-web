# Analytics Setup

This document describes how analytics are wired up on the Vyra Herbals
storefront, and how to add / debug a vendor tag.

---

## TL;DR

**Google Tag Manager is the ONLY analytics snippet loaded from the app.**
Every other vendor — GA4, Meta Pixel, Microsoft Clarity, Google Ads
conversion tags, TikTok Pixel, LinkedIn Insight, etc. — is configured
**inside** GTM.

- GTM container: **`GTM-MHSG926J`** (override with `NEXT_PUBLIC_GTM_ID`)
- Loader: `app/layout.tsx` (`<Script id="google-tag-manager" strategy="afterInteractive">`)
- Event dispatch helper: `src/utils/analytics.ts` (pushes to `window.dataLayer`)
- Route-change tracker for SPA navigations: `src/Components/Common/RouteChangeTracker.tsx`

---

## Why GTM only?

The previous setup **also** loaded GA4 (`gtag.js`) and a Meta Pixel
(`fbevents.js`) directly from the app. GTM was ALSO configured with a GA4
tag and a Meta Pixel tag. Result: every pageview, every `add_to_cart`, and
every `purchase` was recorded **twice** in GA4 and Meta Ads Manager. That
inflated conversion counts, corrupted ROAS numbers, and broke Meta's
attribution model for retargeting audiences.

The current setup fixes that by making GTM the single entry point:

```
                 ┌───────────────────────────────┐
                 │  window.dataLayer.push(...)   │
                 │  (from src/utils/analytics.ts)│
                 └──────────────┬────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Google Tag Manager    │
                    │  (GTM-MHSG926J)        │
                    └─┬────┬────┬────┬────┬──┘
                      │    │    │    │    │
                    ┌─▼┐ ┌─▼┐ ┌─▼┐ ┌─▼┐ ┌─▼─────────┐
                    │GA│ │FB│ │MS│ │Ads│ │ TikTok/… │
                    │4 │ │Px│ │Cl│ │Cv │ │          │
                    └──┘ └──┘ └──┘ └──┘ └──────────┘
```

---

## Configuring vendors inside GTM

Open [tagmanager.google.com](https://tagmanager.google.com), pick the
`GTM-MHSG926J` container, and add / verify these tags:

### 1. Google Analytics 4

- **Tag type**: Google Analytics: GA4 Configuration
- **Measurement ID**: `G-K0F7N513MS` *(this was previously hardcoded in `layout.tsx` — move it here if it isn't already)*
- **Trigger**: All Pages (`gtm.js`) — GA4 auto-collects `page_view`
  natively, so keep "Send a page view event" enabled.

For ecommerce events, create separate GA4 Event tags:

| Trigger event name | GA4 event name | Fires when                             |
| ------------------ | -------------- | -------------------------------------- |
| `view_item`        | `view_item`    | Product detail page loads              |
| `add_to_cart`      | `add_to_cart`  | Shopper clicks *Add to Cart*           |
| `begin_checkout`   | `begin_checkout` | Checkout page loads                  |
| `purchase`         | `purchase`     | Order-placed page confirms paid order  |

Each of those events pushes an `ecommerce` object with
`currency`, `value`, `items[]`. Enable **"Send ecommerce data"** on the GA4
event tag and set **Data source** = *Data Layer*.

### 2. Meta Pixel (Facebook Pixel)

- **Tag type**: Custom HTML (paste the Meta Pixel base code, or use the
  official "Facebook Pixel" community template).
- **Pixel ID**: the one connected to the Vyra Herbals Meta Ads account.
- **Trigger**: All Pages, plus the ecommerce triggers below.

The helper in `src/utils/analytics.ts` also emits Meta-style event
names (`AddToCart`, `Purchase`, `InitiateCheckout`, `ViewContent`) as
aliases of the GA4 event names, so triggers configured with either
naming convention keep working.

| Meta standard event | Trigger event name that fires it   |
| ------------------- | ---------------------------------- |
| `PageView`          | `page_view`                        |
| `ViewContent`       | `ViewContent` (or `view_item`)     |
| `AddToCart`         | `AddToCart` (or `add_to_cart`)     |
| `InitiateCheckout`  | `InitiateCheckout` (or `begin_checkout`) |
| `Purchase`          | `Purchase` (or `purchase`)         |

For each of those, feed the flat pixel-style fields the helper also
pushes: `content_ids`, `content_type`, `content_name`, `value`,
`currency`, `num_items`.

Once Pixel data is flowing, connect it to Meta Ads Manager under
**Events Manager → Data Sources → your Pixel → Overview**. A healthy
pixel shows recent `PageView` and `Purchase` events with a green "Active"
status.

### 3. Microsoft Clarity

- **Tag type**: Custom HTML.
- Paste the Clarity install snippet from
  `https://clarity.microsoft.com/projects/view/<project-id>/settings`.
- **Trigger**: All Pages.

Clarity's snippet loads `https://www.clarity.ms/tag/<id>` and sends
session data to `*.clarity.ms`. Both are whitelisted in this project's
CSP (`next.config.ts`).

### 4. Google Ads conversion tags

- **Tag type**: Google Ads Conversion Tracking.
- Trigger on the `purchase` event.
- Bind `Conversion Value` = `{{DLV - ecommerce.value}}`, `Currency` =
  `{{DLV - ecommerce.currency}}`, `Transaction ID` = `{{DLV - ecommerce.transaction_id}}`.

---

## What the app pushes to `window.dataLayer`

All pushes go through `src/utils/analytics.ts`. Every ecommerce push is
preceded by a `{ ecommerce: null }` reset, per Google's guidance, so
successive events don't inherit each other's items.

| Where fired                                 | Event                | Payload highlights                                 |
| ------------------------------------------- | -------------------- | -------------------------------------------------- |
| Every route change (RouteChangeTracker)     | `page_view`          | `page_path`, `page_location`, `page_title`         |
| Product detail page (`Singleproducts.tsx`)  | `view_item` / `ViewContent` | `ecommerce.items[]`, `ecommerce.value`, `content_ids` |
| Add-to-cart button (`AddToCartButton.tsx`, `StickyHairConcern.tsx`) | `add_to_cart` / `AddToCart` | `ecommerce.items[]`, `value`, `quantity`   |
| Checkout page (`Checkout.tsx`)              | `begin_checkout` / `InitiateCheckout` | `ecommerce.value`, `num_items`         |
| Order-placed page (`OrderPlaced.tsx`, `Transaction.tsx`) | `purchase` / `Purchase` | `transaction_id`, `value`, `currency`, `num_items` |

The `purchase` event only fires when
`isSuccessfulOrderStatus(order.status)` returns true, so cancelled or
failed payments never inflate conversion counts.

---

## Debugging

### Is GTM actually loading?

Open the site, open DevTools → Network, filter `gtm.js`. You should see a
`200` response from `www.googletagmanager.com/gtm.js?id=GTM-MHSG926J`. If
not, check:

- The `<Script id="google-tag-manager">` block in `app/layout.tsx`.
- Content-Security-Policy (`next.config.ts` → `script-src` must include
  `https://www.googletagmanager.com`).
- Any ad-blocker running in the browser you're testing with — always
  test in a clean profile.

### Are events reaching the dataLayer?

In DevTools console:

```js
window.dataLayer
```

You should see the ordered list of every push. In development the helper
also `console.log`s each push under the `[dataLayer]` prefix.

### Is GTM firing tags?

Use **Google Tag Assistant** ([tagassistant.google.com](https://tagassistant.google.com))
in "Preview" mode. Connect it to the live URL and walk through the
purchase flow — you should see GA4 Configuration, GA4 Event (purchase),
Meta Pixel Base, Meta Pixel Purchase, and Microsoft Clarity all fire in
order.

### Is GA4 receiving data?

- **GA4 → Reports → Realtime**: fresh visits show up within ~30 seconds.
- **GA4 → Admin → DebugView**: with Tag Assistant Preview mode ON, the
  entire event stream with parameters is visible in real time.

### Is Meta Pixel receiving data?

- Install [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) Chrome extension.
- Load the site; the extension should show `PageView` firing exactly
  ONCE per page (not twice — the double-fire was the bug this refactor
  fixes).

### Is Clarity receiving data?

- **Clarity → Settings → Setup**: shows "Status: Receiving data" once
  the tag fires.
- Sessions typically appear within 2–5 minutes after being recorded.

---

## Content-Security-Policy

`next.config.ts` allows the following analytics origins:

| Purpose                | Domain(s) in `script-src` / `connect-src`                          |
| ---------------------- | ------------------------------------------------------------------ |
| GTM + GA4              | `googletagmanager.com`, `google-analytics.com`, `*.analytics.google.com`, `stats.g.doubleclick.net` |
| Meta Pixel             | `connect.facebook.net`, `facebook.com`                             |
| Microsoft Clarity      | `*.clarity.ms`, `c.bing.com`                                       |
| Google Ads             | `googleadservices.com`, `googleads.g.doubleclick.net`              |
| TikTok Pixel (ready)   | `analytics.tiktok.com`                                             |
| LinkedIn Insight (ready) | `snap.licdn.com`, `px.ads.linkedin.com`                          |

If a vendor you add to GTM starts throwing CSP violations in the console,
add its origin to the appropriate directive in `next.config.ts` and
redeploy.

---

## Adding a new vendor

1. Add the vendor's tag in GTM (Custom HTML or a community template).
2. Point it at an existing dataLayer event, or push a new one from
   `src/utils/analytics.ts`.
3. If the tag loads scripts or pings endpoints on a new origin, add
   that origin to `script-src` / `connect-src` in `next.config.ts`.
4. Publish the GTM container. **Do not add the vendor's snippet in the
   app** — the whole point of this setup is that GTM is the only place
   marketing needs to touch.
