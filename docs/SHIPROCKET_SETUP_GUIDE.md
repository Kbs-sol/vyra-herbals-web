# Shiprocket Checkout: Setup, Admin Control and Troubleshooting

Built by [VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com)

> **Short version.** Get an API key + secret from Shiprocket's checkout dashboard, paste them into **/admin/shiprocket**, paste 4 URLs into the Shiprocket dashboard, run 1 SQL file. No Vercel access and no redeploy needed for any of it. If anything goes wrong, shoppers silently get the old Easebuzz / COD checkout, so you never lose a sale to a setup problem.

**How sure are the facts below?** Each section is tagged:
- **[Official]** read on a Shiprocket support page (links in section 14).
- **[Code]** verified by reading this repository.
- **[Third party]** reported by another vendor's help page; re-check it on your screen.
- **[Unverified]** reasonable inference. Treat it as a hypothesis, not a fact.

---

## 1. What you are setting up

```
Shopper clicks "Proceed to Checkout" / "Buy Now"
   |
   +-- Shiprocket ON  -> our server asks Shiprocket for a session (prices from OUR database)
   |                     Shiprocket window: OTP login, saved address, UPI / cards / wallets / COD
   |                     Shopper pays -> redirected to /shiprocket/return
   |                     Our server re-checks the order with Shiprocket, saves it, then:
   |                     coupon usage, WhatsApp confirmation, iCarry shipment, Meta CAPI
   |
   +-- Shiprocket OFF or broken -> the existing native checkout (Easebuzz online payment + COD)
```
[Code]

What Shiprocket's checkout gives you (all configured in **their** dashboard, not in this repo) **[Official]**:

| Goal | Shiprocket feature |
|---|---|
| Fewer abandoned carts | Faster checkout, saved addresses, address autofill, coupon / discount engine, abandoned-cart recovery |
| Fewer failed COD parcels (RTO) | COD charge, "Disable COD" rules, Partial COD, COD-to-prepaid discount, prepaid discount |
| More prepaid orders | Prepaid discount, COD-to-prepaid conversion window, "COD on top" ordering toggle |
| Fewer payment failures | Multiple payment gateways, primary / secondary gateway per method, manual traffic split, UPI app priority |
| Better delivery promise | Shipping methods (rush / express / standard), pincode serviceability, estimated delivery date |

Marketing claims on Shiprocket's own pages (for example "70% faster checkout", "30% lower RTO") are their numbers, not measured on this store. Measure your own before and after (section 11).

---

## 2. What is already in the code

| Piece | File | Notes |
|---|---|---|
| Session / token | `app/api/shiprocket/token/route.ts` | Prices and coupons always re-read from our database |
| Order webhook | `app/api/shiprocket/webhook/order/route.ts` | Body is only a hint; order is re-fetched from Shiprocket with your secret |
| Return page + finalize | `app/shiprocket/return`, `app/api/shiprocket/finalize/route.ts` | Idempotent on `txn_id = SR-<id>` |
| Failsafe cron | `app/api/cron/shiprocket-pending/route.ts` + `.github/workflows/shiprocket-pending.yml` | Every 10 min; picks up paid orders we missed |
| Catalogue (Shiprocket pulls) | `app/api/shiprocket/catalog/*` | Products, collections, collection-products |
| Catalogue push on edit | `src/utils/shiprocketCatalogSync.ts` | Product / category edits notify Shiprocket |
| Storefront button | `src/Components/Shared/CheckoutEntry.tsx` | Falls back to native on any error |
| **Admin control (new)** | `app/admin/shiprocket/page.tsx`, `app/api/admin/shiprocket/route.ts` | Keys, test, switches, webhook token |
| **Credential store (new)** | `src/utils/shiprocketSettings.ts`, `shiprocketCrypto.ts` | AES-256-GCM, service-role only |

### What the new admin control changes

Before: the key and secret lived only in Vercel env variables. Changing or rotating them needed Vercel access and a redeploy, and a typo gave no useful message.

Now, from **/admin/shiprocket**:
- Paste **API key + secret**, choose **Live or Staging**, optionally set a **webhook token**. The app **tests the pair with Shiprocket first** and only saves it if Shiprocket accepts it, so a typo can never replace working keys.
- Keys are stored **encrypted** (AES-256-GCM) in a table the public cannot read. They are never shown again, only masked.
- **Master switch** (Shiprocket on/off for everyone), plus separate switches for **Cart** and **Buy Now**.
- Plain-English diagnosis when Shiprocket rejects a call.
- **Remove saved credentials** falls back to the Vercel env values, if any.
- Vercel env variables still work exactly as before.

**Why a separate table:** `site_settings` has a public-read policy (the storefront reads it). A secret stored there would be readable by any visitor. `shiprocket_credentials` has RLS on and no policies. **[Code]**

**What the admin page cannot do:** it cannot change Shiprocket-side rules (COD fee, prepaid discount, shipping charges, serviceable pincodes, payment gateways). Those only exist in Shiprocket's dashboard, and nothing in what I could find documents an API to edit them from outside. Section 9 says where to click.

---

## 3. Step 1: Create the account and finish onboarding

1. Open **https://checkout.shiprocket.in** (Shiprocket Checkout is now branded **fastrr Checkout**; the dashboard you used, `checkout-dashboard.shiprocket.in`, is the same product). **[Official]**
2. Sign up / log in with the business email you will keep long term.
3. Complete **KYC and billing** onboarding. A third-party integrator reports checkout stays inactive until it is done. **[Third party]**
4. Choose the platform **Custom / Custom-Built** (not Shopify or WooCommerce). This repo is a custom Next.js site. Picking another platform produces Shopify-style fields (App Name, Shared Secret, Storefront Access Token) that do not apply here. **[Official: those fields are on the Platform page]**
5. Enter the store name and domain `https://www.vyraherbals.com` (host only if the form wants it).

Keep two logins apart:
- **Checkout dashboard** (checkout.shiprocket.in): API key + secret for **this** integration.
- **Shipping panel** (app.shiprocket.in): email/password / API user for couriers. **Different system. Not used here** (shipping runs through iCarry). **[Official + Code]**

---

## 4. Step 2: Generate the API key

Path reported for custom sites: **Settings -> Platform -> Custom-Built -> API Key**, then copy **API Key** and **API Secret**. **[Third party; confirm on your screen]**

Copy each into a notes app first. The secret is long and easy to cut short. Do not paste them into chat, email, or any `NEXT_PUBLIC_` variable.

### If key generation fails ("client token is not authorized" / "Failed to generate API keys")

**Honest status:** I searched Shiprocket's public help center, API docs and the web and found **no page documenting this exact message**. What follows is a reasoned checklist, **not a confirmed diagnosis**. The wording ("client token not authorized") suggests the dashboard's own call to Shiprocket's backend is being refused for your account or session, rather than anything on your website, because your site is not involved in that step at all. **[Unverified]**

Work through these in order and stop when it works:

1. **Hard refresh with a clean session.** Log out, close the tab, open a private window, log in at `https://checkout.shiprocket.in` and go to the dashboard from there (not from a bookmarked deep link). A stale or mismatched session token is the cheapest explanation.
2. **Try another browser, no extensions** (ad blockers and privacy extensions can strip auth headers). Note the exact time and take a screenshot of the error and the browser's Network tab response if you can.
3. **Check the account is fully set up.** Finish KYC / billing / store details, and make sure the platform is **Custom-Built** with a store name and domain saved. Keys for a platform that was never completed may be refused.
4. **Do not toggle "Smart One-Click Checkout" or "Shiprocket Login & Address Vault" to get keys.** Reading this repo, neither is used: the integration authenticates with the single **Custom-Built API key + secret** only. The error appearing on those toggles too points to the same underlying account/authorization problem, not to a missing feature on your site. The repo's "not implemented yet" list includes server-to-server login / address fetch. **[Code]**
5. **Contact Shiprocket.** This is the step most likely to actually fix it. Send them the text in the box below, plus your screenshot.
   - Email **integration@shiprocket.com** (their API docs name this for integration help) and **support@shiprocket.com**. **[Official: apidocs.shiprocket.in]**
   - Raise a ticket from inside the checkout dashboard if it has a help widget.

> Subject: Custom-Built platform API key generation fails: "client token is not authorized"
>
> Hello, my Shiprocket Checkout (fastrr) account is `<registered email>`, store `Vyra Herbals`, domain `vyraherbals.com`, platform Custom-Built. On `checkout-dashboard.shiprocket.in`, clicking Generate API key shows "client token is not authorized", and enabling Smart One-Click Checkout and Login & Address Vault shows "Failed to generate API keys". Please check that my account / client is activated for the Custom platform and generate or enable the API key and secret. Also please confirm the staging (sandbox) base URL and credentials for testing, and the per-order fee for my plan. Time of last failure: `<date, time, timezone>`. Screenshot attached.

6. While you wait, **nothing on the site breaks**: with no keys, the native Easebuzz / COD checkout stays the only checkout.

I cannot generate keys for you or test your Shiprocket account from here. Only Shiprocket can unblock step 5 if steps 1 to 3 do not.

---

## 5. Step 3: Run the SQL (once)

Supabase -> **SQL Editor** -> paste and run **`supabase/migrations/SHIPROCKET_ADMIN_CONTROL.sql`**. It is safe to run twice. It creates:
- `shiprocket_credentials` (encrypted keys, no public access),
- `site_settings` if missing (on/off + placement switches),
- the unique index that stops duplicate Shiprocket orders.

---

## 6. Step 4: Vercel settings

Only these are needed now (Vercel -> Settings -> Environment Variables -> Production):

| Name | Value | Needed |
|---|---|---|
| `SHIPROCKET_ENCRYPTION_KEY` | A long random string, 32+ chars (`openssl rand -hex 32`) | **Recommended.** If missing, `JWT_SECRET` is used, but rotating `JWT_SECRET` then makes saved keys unreadable and you must re-enter them. |
| `CRON_SECRET` | Long random string | Yes, for the failsafe job (probably already set) |
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://www.vyraherbals.com` | Yes (probably already set) |

`SHIPROCKET_CHECKOUT_API_KEY` / `_API_SECRET` / `_API_BASE` / `SHIPROCKET_WEBHOOK_TOKEN` are **optional now**: they are the fallback when nothing is saved in the admin page. Keep `EASEBUZZ_*`, Supabase, iCarry and WhatsApp variables exactly as they are (they power the fallback checkout).

Redeploy once after adding `SHIPROCKET_ENCRYPTION_KEY`.

---

## 7. Step 5: Connect in the admin panel

1. Log in at **/admin/login** and open **Shiprocket** in the sidebar.
2. Under **API credentials**: paste the key and secret, choose **Staging** (test keys) or **Live**, optionally add a webhook token (any random 16+ characters), click **Test and save credentials**.
3. Success shows "Shiprocket accepted the API key and secret". On failure the page tells you what to check and **saves nothing**.
4. Confirm **Connection test** reads **OK** and the environment pill matches what you chose.

---

## 8. Step 6: Tell Shiprocket where your site is

In Shiprocket's dashboard (Platform setup / Settings -> Custom Endpoint / Webhooks), enter the URLs that **/admin/shiprocket -> "URLs to give Shiprocket"** shows with Copy buttons:

| Purpose | URL |
|---|---|
| Products | `https://www.vyraherbals.com/api/shiprocket/catalog/products` |
| Collections | `https://www.vyraherbals.com/api/shiprocket/catalog/collections` |
| Collection products | `https://www.vyraherbals.com/api/shiprocket/catalog/collection-products` |
| **Order webhook** | `https://www.vyraherbals.com/api/shiprocket/webhook/order` |
| Redirect after payment | `https://www.vyraherbals.com/shiprocket/return` |

**Protect the webhook (recommended):** the Shiprocket webhook form has a **Headers** field with "Add more" **[Official]**. Add header name `x-webhook-token`, value = the same token you saved in the admin page. Requests without it are then rejected with 401. Even without a token a forged webhook can never create an order (the order is re-fetched from Shiprocket with your secret), but the token stops strangers from making your server spend API calls. If you add a token in the admin page but forget the header in Shiprocket, **real orders will be rejected by the webhook**; the 10-minute failsafe job would still record them, but test one order right after changing this.

Then press **Push all products to Shiprocket now** once.

---

## 9. Step 7: Configure checkout rules in Shiprocket (this is where sales are won)

All in Shiprocket's dashboard **[Official: "Manage Shipping Settings" and "Payment" pages]**:

**Settings -> Shipping settings -> Default values**
- **Prepaid discount** (fixed or percent). Start modest (for example 3 to 5%) and compare prepaid share.
- **COD-to-prepaid discount** with a time window, to convert COD buyers after they order.
- **COD charges** (fixed or percent).
- **Shipping charges** per method (rush / express / standard) and the **non-serviceable pincodes** list.

**Custom rules** (criteria: SKU, tag, collection, UTM, pincodes, weight, invoice value, risk profile, phone number, and more):
- **Disable COD** for high-risk pincodes or very high order values.
- **Partial COD** (customer pays a percentage upfront) for expensive orders.
- **Shipping visibility** per criteria.

**Payment settings**
- Configure at least one payment gateway (only gateways partnered with Shiprocket are listed).
- Set **primary and secondary gateway** per payment method so one gateway outage does not lose sales.
- Order **UPI apps** by priority; enable **Last paid payment method** and **COD on top** if you want COD pushed to the top (think about whether you actually want that; it can raise COD share).

**Why not do this with code?** I found nothing documenting an API for these settings, so building a fake "control" for them in our admin would be misleading. The admin page controls what we own: credentials, on/off, placement and fallback.

---

## 10. Step 8: Test, then go live

**Staging first (if Shiprocket gives you sandbox keys).** Ask support for staging access and keys (include in your ticket). Save them in the admin page with **Environment = Staging**.
1. Add an item, open the cart, click **Proceed to Checkout**: Shiprocket's window opens.
2. Place one **prepaid** and one **COD** test order. Check for each: you land on `/order-placed/<id>`; the `orders` table has a row with `txn_id` starting `SR-`; WhatsApp confirmation arrives; the iCarry shipment is created; a coupon (if used) counts once; the cart empties (Buy Now must **not** empty a saved cart).
3. Turn **Cart** off in "Where to offer Shiprocket", reload: the normal button shows. Turn it back on.

**Go live.** Save the **live** key + secret with **Environment = Live**. The environment pill must say production and the connection test must be OK. Place one real low-value order and verify as above.

**Instant rollback (no redeploy):** admin page -> **Switch OFF Shiprocket**. Orders already paid on Shiprocket are still recorded while it is off.

---

## 11. Measure whether it is working

Before switching on, note for two weeks: checkout conversion (GA4 `begin_checkout` to `purchase`), COD share, and RTO / return rate from iCarry. Switch on, then compare the same metrics for two weeks. Shiprocket's dashboard also has analytics for sales, payment trends and discount effectiveness **[Official]**. Do not judge on fewer than about 50 orders per period.

Cost: figures conflict. One integrator's help page says Shiprocket charges **2% per order** **[Third party]**; a comparison blog says around **0.65% per transaction** **[Third party, unverified]**. **Ask Shiprocket for the written rate on your plan** and compare it to Easebuzz fees; factor in COD fee income and fewer RTOs.

---

## 12. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Shiprocket button never appears | Keys missing, master switch off, Cart/Buy Now switch off, or placement mismatch. Open `/api/shiprocket/status` and read `reason`, `cart`, `buyNow`. |
| Connection test: "rejected the API key / secret" | Wrong or truncated value, staging keys with Live (or reverse). Re-copy both. |
| Dashboard will not generate keys | Section 4 checklist, then contact Shiprocket. |
| Saved keys "cannot be decrypted" | `SHIPROCKET_ENCRYPTION_KEY` / `JWT_SECRET` changed. Re-enter keys in the admin page. |
| "Run SHIPROCKET_ADMIN_CONTROL.sql" message | Table not created yet (section 5). |
| Real orders rejected by webhook (401) | Token saved in admin but header missing/different in Shiprocket. Fix header or remove token. |
| Customer paid, no order in admin | Wait up to 10 min (failsafe job). Else check GitHub Actions run "Shiprocket Pending Orders", that `CRON_SECRET` matches in GitHub and Vercel, and the webhook URL. |
| Stale price / stock in Shiprocket | **Push all products** in the admin page. |
| Shiprocket window does not open, native opens | Expected fallback. Check browser console for CSP errors and that KYC / domain setup is complete. |

---

## 13. Security notes

- Key and secret are stored **AES-256-GCM encrypted**, readable only with the Supabase service-role key. They are never returned by any API, only masked.
- Anyone who can open `/admin` as admin can replace the keys. Protect the admin login (strong `ADMIN_PASSWORD_HASH`, long `JWT_SECRET`).
- Prices, coupons and totals are computed on our server; Shiprocket order data is verified through their authenticated API before saving.
- **A GitHub personal access token was pasted into chat while preparing this change. Revoke it now at GitHub -> Settings -> Developer settings -> Personal access tokens, and create a fresh one only if needed.** The token was used only to read and push this branch and was not written into any file.

---

## 14. Official sources and videos

Shiprocket's own help center (fastrr Checkout):
- Overview: https://support.shiprocket.in/support/solutions/articles/152000000877-fastrr-checkout-guide-an-overview-of-dashboard
- Shipping settings and custom rules: https://support.shiprocket.in/support/solutions/articles/152000000892-fastrr-checkout-manage-shipping-settings
- Payment settings: https://support.shiprocket.in/support/solutions/articles/152000000915-fastrr-checkout-payment
- Platform page: https://support.shiprocket.in/support/solutions/articles/152000000916-fastrr-checkout-platform
- Adding a webhook: https://support.shiprocket.in/support/solutions/articles/152000000919-fastrr-checkout-adding-a-webhook
- All fastrr articles: https://support.shiprocket.in/support/solutions/folders/152000000151

**Videos:** I looked for tutorials and found only **Shopify** ones (for example "How to Integrate Shiprocket Checkout With Shopify" on YouTube). I found **no video for a custom-website integration**, and I could not verify any review claims, so I am not recommending one. A Shopify video will show the dashboard layout but its steps (installing an app) do not apply to this site.

**Not done / not verified:** I did not have access to Shiprocket's Postman "SRC Custom Integration" document, so request formats rely on what the existing code already implements. I did not compare alternatives (for example Razorpay Magic Checkout or GoKwik) beyond reading about them, so I make no claim that Shiprocket is better or worse than them for this store.

---

## 15. Not implemented yet

Shiprocket refund APIs, loyalty points, server-to-server login / address-vault fetch, and pushing order-status changes back to Shiprocket. Tracking continues through iCarry; refunds through the existing process.
