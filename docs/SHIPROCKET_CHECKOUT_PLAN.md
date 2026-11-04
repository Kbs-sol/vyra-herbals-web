# Shiprocket Checkout – technical notes

> The operational, step-by-step guide is **[SHIPROCKET_SETUP_GUIDE.md](./SHIPROCKET_SETUP_GUIDE.md)**. This file is only a technical summary.

Credit: [VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com)

## Behaviour
- **Default checkout** when `SHIPROCKET_CHECKOUT_API_KEY` and `SHIPROCKET_CHECKOUT_API_SECRET` are both set.
- Kill switches: env `SHIPROCKET_CHECKOUT_ENABLED=false`, or `site_settings.shiprocket_checkout = {enabled:false}` (toggle in `/admin/shiprocket`).
- Native Easebuzz/COD checkout is the fallback (switch off, script/token failure, `?native=1`, manual link). The WhatsApp/Easebuzz flow is untouched.

## Flow
1. `CheckoutEntry` (cart and product page) reads public `GET /api/shiprocket/status`.
2. Click -> `POST /api/shiprocket/token` (prices from our DB, coupon revalidated, HMAC-signed session at Shiprocket) -> `HeadlessCheckout.addToCart`.
3. Return -> `/shiprocket/return?oid&ost` -> `POST /api/shiprocket/finalize`.
4. `POST /api/shiprocket/webhook/order` is a hint only; the order is re-fetched from Shiprocket's Order Details API.
5. Failsafe: `/api/cron/shiprocket-pending` (GitHub Actions every 10 min).
6. Idempotent on `orders.txn_id = SR-<id>` (+ partial unique index). Then coupon usage, cart clear (cart scope only), WhatsApp, iCarry, Meta CAPI.
7. Catalogue: Shiprocket pulls `/api/shiprocket/catalog/*`; admin product/category edits push to Shiprocket's product/collection webhooks.

## Tests
`tests/unit/utils/shiprocketCheckout.test.ts`, `shiprocketOrder.test.ts`, `shiprocketRuntime.test.ts`.
