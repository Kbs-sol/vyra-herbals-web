# Shiprocket Checkout – Setup & Operations Guide

Built by [VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com)

> **Short version:** add 2 secrets in Vercel, run 1 SQL file, paste 4 URLs into the Shiprocket dashboard, add 1 GitHub secret. Shiprocket then becomes the default checkout. The old Easebuzz/COD checkout stays as an automatic fallback. The WhatsApp ordering flow is not touched and keeps using Easebuzz.

---

## 1. How it works

```
Customer clicks "Proceed to Checkout" / "Buy Now"
        │
        ├─ Shiprocket ON  ──►  our server creates a signed session (prices come from OUR database)
        │                      Shiprocket window opens: login (OTP), address, shipping, COD/UPI/cards
        │                      Customer pays ──► redirected to /shiprocket/return
        │                      Our server re-checks the order with Shiprocket, saves it, then:
        │                      coupon usage, WhatsApp confirmation, iCarry shipment, Meta CAPI
        │                      ──► /order-placed/<id>
        │
        └─ Shiprocket OFF / broken ──► the existing native checkout (Easebuzz online payment + COD)
```

Safety nets, so a checkout problem never costs you a sale:

| Layer | What happens |
|---|---|
| Not configured / switched off | The normal native "Proceed to Checkout" button is shown. Shiprocket is never loaded. |
| Shiprocket script fails to load (8 s) or session fails (12 s) or any error | A toast appears and the **native checkout opens automatically**. |
| Shiprocket's own `fallbackUrl` | Sends the shopper back to `…?native=1`, which opens native checkout. |
| Manual link | "Problem checking out? Use standard checkout" is always visible under the Shiprocket button. |
| Missed order notification | The order webhook may fail. A GitHub Actions job every 10 minutes finds paid Shiprocket orders we have not recorded and records them. |

**Not changed:** WhatsApp bot orders, Easebuzz payment links, Easebuzz webhooks/reconciliation, admin panel orders, iCarry. Shiprocket orders appear in the same `orders` table (`txn_id` = `SR-<shiprocket order id>`), so the admin panel, invoices, WhatsApp updates and tracking work as before.

---

## 2. Before you start (Shiprocket side)

1. Have a **Shiprocket Checkout** account (the "Custom-Built / Custom Website" platform, not the Shopify/WooCommerce plugin). Dashboard: https://checkout.shiprocket.in
2. Complete **KYC and billing** onboarding in that dashboard. Until it is done, checkout stays inactive even with correct keys.
3. Ask Shiprocket support for **staging (sandbox) access** if you want to test without real money. Staging keys work only with the staging API base (step 3).
4. Check pricing with Shiprocket (a per-order fee, reportedly around 2%, applies; please confirm the current figure with them).

> These checkout API keys are **different** from your Shiprocket shipping login (email/password). Don't use those.

---

## 3. Get the keys from the Shiprocket dashboard

Menu names can change slightly; the path below is what Shiprocket's checkout dashboard currently shows. If a name differs, search the dashboard for "API Key" or ask Shiprocket support for the "Custom Platform checkout API key and secret".

1. Log in at https://checkout.shiprocket.in
2. Go to **Settings → Platform → Custom-Built → API Key**.
3. Copy the **API Key** and the **API Secret**.
4. Treat both like passwords. Never paste them in chat, in code, or in any variable starting with `NEXT_PUBLIC_`.

Also, in the same dashboard:
- Under **Checkout → Custom-Built → Platform Setup**, enter your website domain: `https://www.vyraherbals.com`.
- Under **Settings → Custom Endpoint**, you will paste the order webhook URL (step 6).

---

## 4. Add the secrets to Vercel

Vercel → your project → **Settings → Environment Variables**. Add to **Production** (and Preview if you test there):

| Name | Value | Required |
|---|---|---|
| `SHIPROCKET_CHECKOUT_API_KEY` | API Key from step 3 | Yes |
| `SHIPROCKET_CHECKOUT_API_SECRET` | API Secret from step 3 | Yes |
| `SHIPROCKET_CHECKOUT_API_BASE` | Leave **empty** for live. For staging only: `https://fastrr-api-dev.pickrr.com` | Staging only |
| `SHIPROCKET_CHECKOUT_ENABLED` | Set to `false` to switch Shiprocket off from env. Leave unset normally. | Optional kill switch |
| `CRON_SECRET` | Any long random string (e.g. output of `openssl rand -hex 32`) | Yes (failsafe job) |
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://www.vyraherbals.com` (use whichever host you want shoppers returned to) | Yes (probably already set) |

**Keep these existing variables exactly as they are** (they power the fallback and WhatsApp): `EASEBUZZ_KEY`, `EASEBUZZ_SALT`, `EASEBUZZ_ENV`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, iCarry and WhatsApp variables.

Then **redeploy** (Deployments → ⋯ → Redeploy). Env changes only apply to new deployments.

Important: **Shiprocket turns on automatically as soon as both key and secret exist.** If you want to add the keys but go live later, also add `SHIPROCKET_CHECKOUT_ENABLED=false` first, and remove it when ready (or use the admin switch, step 9).

Local development: copy the same names into `.env.local` (see `.env.example`).

---

## 5. Run the database SQL (once)

Supabase → **SQL Editor** → paste and run:

1. `supabase/migrations/SHIPROCKET_CHECKOUT_SETUP.sql`: adds the unique index that stops duplicate Shiprocket orders.
2. `supabase/migrations/SITE_SETTINGS_AND_STATUS_FIX.sql`: **only if** the `site_settings` table does not exist yet. It is needed for the admin on/off switch. Safe to run twice.

---

## 6. Tell Shiprocket where your site is

Shiprocket needs to read your catalogue and send you order events. In the Shiprocket checkout dashboard (Platform Setup / Custom Endpoint / catalogue settings), enter:

| Purpose | URL |
|---|---|
| Products catalogue | `https://www.vyraherbals.com/api/shiprocket/catalog/products` |
| Collections (categories) | `https://www.vyraherbals.com/api/shiprocket/catalog/collections` |
| Products in a collection | `https://www.vyraherbals.com/api/shiprocket/catalog/collection-products` |
| Order webhook | `https://www.vyraherbals.com/api/shiprocket/webhook/order` |

(`/admin/shiprocket` lists these URLs with copy buttons.)

How we stay safe:
- Prices are always taken from **our** database, never from the browser.
- The order webhook is only a **hint**. We re-fetch the order from Shiprocket using your secret before saving anything, so a fake webhook cannot create an order.
- Saving is idempotent, so repeated webhooks never duplicate an order.

When you add or edit products/categories in the admin panel, the change is pushed to Shiprocket automatically. Use **Push all products** in `/admin/shiprocket` for a full resync after first setup.

---

## 7. GitHub secret for the failsafe job

GitHub repo → **Settings → Secrets and variables → Actions**:
- **Secret** `CRON_SECRET` = the same value you put in Vercel.
- (Optional) **Variable** `SHIPROCKET_PENDING_URL` if your live host isn't `https://www.vyraherbals.com`.

The workflow `.github/workflows/shiprocket-pending.yml` runs every 10 minutes and calls `/api/cron/shiprocket-pending`. (`vercel.cron.json` is only a template; it is not what schedules this.)

---

## 8. Configure shipping, COD and discounts (in Shiprocket, not on our site)

Shiprocket's window calculates shipping charges, serviceability, COD fee, prepaid discounts and RTO protection. Set these in the Shiprocket checkout dashboard (Settings: shipping rules, COD charges, prepaid discount). Our site only sends items, prices and the coupon discount.

Coupons: a coupon applied in the cart is validated on our server and passed to Shiprocket as a fixed cart discount.

---

## 9. Test on staging, then go live

**Staging test (recommended):**
1. Set `SHIPROCKET_CHECKOUT_API_BASE=https://fastrr-api-dev.pickrr.com` with the **staging** key/secret, redeploy.
2. Open `/admin/shiprocket` (admin login). It should show environment **staging**, a green credential test, and the catalogue count.
3. Add an item, open the cart, click **Proceed to Checkout**. Shiprocket's window should open.
4. Place one **prepaid** and one **COD** test order. For each, check:
   - You land on `/order-placed/<id>`.
   - The `orders` table has a row with `txn_id` starting `SR-`.
   - WhatsApp confirmation arrives, the iCarry shipment is created, a coupon (if used) is counted once.
   - The cart emptied (Buy Now must **not** empty your saved cart).
5. Test the fallback: set `SHIPROCKET_CHECKOUT_ENABLED=false` (or press **Switch off** in `/admin/shiprocket`), reload the cart. The normal native button must show and work.

**Go live:**
1. Replace the staging values with **live** key/secret; delete `SHIPROCKET_CHECKOUT_API_BASE`; redeploy.
2. `/admin/shiprocket` should show environment **production** and a green test.
3. Place one real low-value order and verify as above.

---

## 10. Instant rollback (no redeploy needed)

| How | Effect |
|---|---|
| `/admin/shiprocket` → **Switch off** | Immediate (about 20 s cache). Native checkout becomes the only button. Switch back on any time. |
| Vercel env `SHIPROCKET_CHECKOUT_ENABLED=false` + redeploy | Same, at env level. |
| Remove the key/secret + redeploy | Shiprocket fully off. |

While switched off, any Shiprocket order that was already paid is **still recorded** (webhook and failsafe still run). Nothing is lost.

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Shiprocket button never appears | Keys missing, `SHIPROCKET_CHECKOUT_ENABLED=false`, admin switch off, or you didn't redeploy. Open `/api/shiprocket/status` and read `reason`. |
| `/admin/shiprocket` credential test fails / "511" / "Invalid key" | Wrong key/secret, or staging keys used with the production base (or the reverse). |
| Shiprocket window doesn't open, native opens instead | Expected fallback. Check the browser console for Content-Security-Policy errors, and that Shiprocket KYC/domain setup is complete. |
| Customer paid but no order in admin | Wait up to 10 minutes (failsafe job). If still missing, check the GitHub Actions run of "shiprocket-pending", `CRON_SECRET` match, and the order webhook URL. |
| Old price/stock shown in Shiprocket | Press **Push all products** in `/admin/shiprocket`. |
| Native checkout asks guests to log in | That is the existing native behaviour. The Shiprocket path allows guests (OTP login on Shiprocket). |
| Failsafe job returns 401 | `CRON_SECRET` differs between GitHub and Vercel. |

---

## 12. Security notes

- Key and secret live **only** in Vercel server env. Never put them in a `NEXT_PUBLIC_` variable, the repo or chat.
- Requests to Shiprocket are HMAC-SHA256 signed with the secret.
- Prices, coupons and totals are computed on our server. Order data from Shiprocket is verified through their authenticated API before saving.
- The admin panel and `/api/admin/shiprocket` require the admin login.
- **A GitHub personal access token was pasted in chat earlier. Revoke it at GitHub → Settings → Developer settings → Tokens and create a new one.**

---

## 13. Not implemented yet

Shiprocket refund APIs, loyalty points, server-to-server login/address fetch, and pushing order-status changes back to Shiprocket. Shipping tracking continues through iCarry. Refunds continue through the existing process.
