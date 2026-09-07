# Vyra Herbals - Developer & Security Guide

This document contains key architectural details, security guidelines, and third-party integration specifics for the Vyra Herbals backend. Future developers should read this before modifying core flows (Payments, Admin APIs, or WhatsApp Communications).

## 1. Security Architecture & Audit Fixes

A comprehensive security audit was recently performed. When building new features, adhere to the following patterns to prevent re-introducing vulnerabilities:

### Admin Route Protection
*   **Do not use inline JWT verification.** Always use `verifyAdminAuth(request)` or `requireAdmin(request)` from `@/utils/adminAuth.ts`.
*   These helpers verify the JWT *and* ensure the payload `role` is `'admin'`.
*   Example:
    ```typescript
    import { requireAdmin } from '@/utils/adminAuth';

    export async function GET(request: Request) {
        const denied = await requireAdmin(request);
        if (denied) return denied; // Returns 401/403 NextResponse
        // ... proceed with admin logic
    }
    ```

### Supabase Client Usage
*   **Never use the public anonymous `supabase` client for Admin APIs.**
*   **Never instantiate `createClient` with service-role keys inline at the module level.** (This leaks state across requests in warm lambdas).
*   **Always use `createServerSupabase()`** from `@/utils/supabaseClient.ts` inside the route handler. This safely provisions a non-persisted session service-role client.

### Input Validation & SQL Injection Prevention
*   **Column Injection:** When accepting `sortBy` or `sortOrder` from query parameters, **never** pass them directly to Supabase `.order()`. Always use a whitelist (e.g., `ALLOWED_SORT_COLS = new Set(['id', 'created_at', ...])`).
*   **Mass Assignment:** Do not pass `req.json()` directly into Supabase `.insert()` or `.update()`. Explicitly destructure or validate the properties you intend to write.
*   **File Uploads:** (e.g., `app/api/admin/uploads/route.ts`) Always whitelist both the Storage Bucket (to prevent cross-bucket pollution) and MIME Types (to prevent malicious executables).

### Environment Variables & Secrets
*   Never prefix server-only secrets with `NEXT_PUBLIC_` (e.g., `MESSAGE_CENTRAL_CUSTOMER_ID` and `MESSAGE_CENTRAL_KEY`).
*   Production credentials (EaseBuzz, Supabase Service Role, MessageCentral) must be injected via Vercel Environment Variables. Do not commit `.env.local`.

---

## 2. Order Finalization & Payment Flow

The application handles both Prepaid (Online) and Cash On Delivery (COD) orders.

1.  **Online Orders (`/api/payment/success` & `/api/payment/reconcile`)**
    *   Payment succeeds via EaseBuzz. The user is redirected back to the success route.
    *   `finalizeOrderFromSession` is called. It moves the cart from `order_sessions` to the `orders` table.
    *   **Reconciliation:** Sometimes the browser drops the redirect. A cron job hits `/api/payment/reconcile`, which verifies the transaction status with EaseBuzz via API and creates the order if it succeeded.

2.  **iCarry Shipment Synchronization (`src/utils/orderShipment.ts`)**
    *   Immediately after an order is inserted, `syncOrderShipment` is called to push the order to iCarry for fulfillment.
    *   This is a race condition against Vercel's 60s timeout, so it runs concurrently but fails gracefully.
    *   It returns the `awb_code` (The public tracking number) and `trackingId` (iCarry's internal ID).

---

## 3. WhatsApp Communications (Message Central)

The WhatsApp bot and outbound notification system live in `src/services/communications/`.

### The "Combined" Order Placed + Shipment Template
Previously, the app sent two templates: "Order Placed" and "Shipment Created". Since shipments are created synchronously (in `save_only` mode) during checkout, the customer was receiving two messages instantly.

This was refactored into a single template:
*   **Template:** `ORDER_PLACED`
*   **Variables:** `{{1}}` = Customer Name, `{{2}}` = Amount, `{{3}}` = AWB Tracking Number.
*   **Dynamic URL Button:** Injected at index 0, dynamically pointing to `https://www.icarry.in/track-shipment?awb={{1}}` where `{{1}}` is the AWB.
*   **Note:** The standalone `SHIPMENT_CREATED` event emitter is **commented out** in `orderNotifications.ts` to prevent duplicate pinging. Do not re-enable it unless the business explicitly wants a delayed secondary message.

### Adding New Templates
If you add a new template in the Message Central dashboard:
1. Update `src/services/communications/config/templates.ts`.
2. Add the template ID and map the parameter variables correctly in `parameterOrder`.
3. If using dynamic buttons, ensure you supply `button_parameters` in the OutboundMessage payload.
