# Shiprocket Checkout - plan and status

Credit: [VJ](mailto:vijayprasadvvp@gmail.com?subject=Found%20you%20via%20vyraherbals.com&body=Hi%20VJ%2C%20I%20saw%20your%20credit%20on%20https%3A%2F%2Fvyraherbals.com)

**Status: WORK IN PROGRESS (draft PR). Only the server helper library is done. Do not merge yet.**

## Flow ("custom / headless" channel)
1. Browser -> `POST /api/shiprocket/token` (our server signs the cart with HMAC-SHA256 and calls Shiprocket `/api/v1/access-token/checkout`).
2. Browser -> `window.HeadlessCheckout.addToCart(event, token, {fallbackUrl}, cb)` (script `https://checkout-ui.shiprocket.com/assets/js/channels/custom.js`), which opens the hosted checkout iframe.
3. Shiprocket pulls our catalogue -> `GET /api/shiprocket/catalog/products`.
4. Shiprocket posts the finished order -> `POST /api/shiprocket/webhook/order`; we insert into `orders`, then run iCarry sync, WhatsApp notification and Meta CAPI Purchase, as the COD flow does.
5. The existing Easebuzz / COD checkout remains the default. Shiprocket shows only when `NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED=true`.

## Done
- `src/utils/shiprocketCheckout.ts`: config/flag, HMAC sign + verify, access-token request, cart sanitiser, catalogue mapper, order-webhook mapper.

## TODO
- `app/api/shiprocket/token/route.ts` (rate limited, validate cart against DB products)
- `app/api/shiprocket/catalog/products` and `/collections` (HMAC verified, use `getLiveProducts`)
- `app/api/shiprocket/webhook/order/route.ts` (HMAC verified, idempotent on `txn_id = SR-<id>`, recompute prices from DB, model on `app/api/payment/cod/route.ts`)
- Client `ShiprocketCheckoutButton` in Cart/Checkout behind the flag
- CSP additions in `next.config.ts`: script-src `checkout-ui.shiprocket.com`; frame-src `fastrr-boost-ui.pickrr.com`; connect-src `checkout-api.shiprocket.com`
- Tests and `tsc` typecheck

## Assumptions to confirm with Shiprocket (integration@shiprocket.com)
The exact token request body, catalogue schema, webhook payload and how GET catalogue pulls are signed are **not publicly documented**. They were inferred from the client script. Confirm all four before go-live; the verifier and mappers are written to be tolerant but must be tested against real payloads.

## Merchant onboarding
Request Checkout API key + secret; register catalogue and order-webhook URLs; set `SHIPROCKET_CHECKOUT_API_KEY`, `SHIPROCKET_CHECKOUT_API_SECRET`, `NEXT_PUBLIC_SHIPROCKET_CHECKOUT_ENABLED` in Vercel (Preview first).
