# Shiprocket Checkout (SRC) integration

Built from the official Shiprocket Checkout "Custom Integration" Postman docs. Off by default.
Existing Easebuzz / COD checkout is untouched and remains the fallback.
Credit: [VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com)

## Flow
1. Cart page shows **Express Checkout (UPI / Cards / COD)** (only when `NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED=true`).
2. Click -> `POST /api/shiprocket/token`. Server re-reads prices from our DB, revalidates coupon,
   calls Shiprocket `POST /api/v1/access-token/checkout` (HMAC-SHA256 signed) and returns a session token.
3. Browser calls `HeadlessCheckout.addToCart(event, token, {fallbackUrl})` -> Shiprocket iframe handles
   address, serviceability, shipping rates, COD/prepaid and payment.
4. On success Shiprocket redirects to `/shiprocket/return?oid=..&ost=SUCCESS`; the page calls
   `POST /api/shiprocket/finalize` and then shows `/order-placed/<id>`.
5. Shiprocket also POSTs to `/api/shiprocket/webhook/order`. The body is treated as a **hint only**:
   the order is re-fetched from the authenticated Order Details API, so a forged webhook cannot create orders.
6. Failsafe: cron `/api/cron/shiprocket-pending` (every 10 min) lists SUCCESS orders (last 48h) and finalizes any missed.
7. Finalize is idempotent (`orders.txn_id = SR-<id>`, plus partial unique index). It then runs the existing
   side effects: coupon usage, cart clear, WhatsApp notifications, iCarry shipment sync (tracking), Meta CAPI Purchase.

## URLs to give Shiprocket
- Products: `https://vyraherbals.com/api/shiprocket/catalog/products`
- Collections: `https://vyraherbals.com/api/shiprocket/catalog/collections`
- Collection products: `https://vyraherbals.com/api/shiprocket/catalog/collection-products`
- Order webhook: `https://vyraherbals.com/api/shiprocket/webhook/order`

## Env vars (Vercel)
| Var | Notes |
|---|---|
| `NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED` | `true` to show the button |
| `SHIPROCKET_CHECKOUT_API_KEY` / `SHIPROCKET_CHECKOUT_API_SECRET` | from Shiprocket |
| `SHIPROCKET_CHECKOUT_API_BASE` | optional; staging `https://fastrr-api-dev.pickrr.com` |
| `CRON_SECRET` | already used by other crons |
| `NEXT_PUBLIC_SITE_ORIGIN` | used to build the return URL |

Run `supabase/migrations/SHIPROCKET_CHECKOUT_SETUP.sql` once in Supabase.

## Testing order
Staging base URL + staging keys on the test deployment -> place a prepaid and a COD order -> verify the
order row, `/order-placed`, WhatsApp, iCarry sync -> then production keys.

## Not implemented
Refund APIs, pushing product/collection change webhooks to Shiprocket (they pull our catalogue),
loyalty points, S2S login/address-fetch, pushing order status back to Shiprocket.
Shipping rates/serviceability are handled inside Shiprocket's hosted checkout; tracking uses the existing iCarry flow.
