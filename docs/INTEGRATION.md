# Integration Guide — WhatsApp Automation Engine

Everything under `src/services/communications/`, `app/api/whatsapp/*`,
`app/api/webhooks/*`, `app/api/events/*`, `app/api/cron/*`,
`database/migrations/*`, and `tests/*` is **new and complete** — drop it
into the repo as-is.

Three files from the original spec are **existing files I don't have
access to**, so instead of guessing their full contents I'm giving you the
exact patch to apply to each. These are the only manual code edits left.

---

## 1. `app/api/payment/cod/route.ts`

Add this block after the order row is successfully inserted, immediately
before the function's `return NextResponse.json(...)`:

```typescript
import { automationEngine } from '@/services/communications';

// ... inside the POST handler, after order creation succeeds ...
try {
  await automationEngine.emit({
    type: 'ORDER_PLACED',
    order_id: order.id,
    user_id: orderData.userId,
    customer_phone: orderData.shippingData.phone,
    customer_name: orderData.shippingData.fullName,
    total_amount: orderData.totalAmount,
    payment_method: 'cod',
    items: orderData.orderItems,
    tracking_link: generateTrackingLink(order.id), // use your existing tracking-link helper, or omit
  }, 'api');
} catch (err) {
  console.warn('[WhatsApp] Order placed event failed:', err);
}
```

`automationEngine.emit()` already never throws and always resolves quickly
(it enqueues + fires a best-effort send), so the `try/catch` here is just
extra insurance — feel free to drop the `await` if you'd rather not block
the response at all (`void automationEngine.emit(...)`).

Adjust the field names on the right (`orderData.userId`, etc.) to whatever
your actual variable names are — the event shape on the left
(`ORDER_PLACED`) is fixed by `src/types/communications.ts`.

---

## 2. `app/api/payment/success/route.ts`

Add after the order is marked paid:

```typescript
import { automationEngine } from '@/services/communications';

try {
  await automationEngine.emit({
    type: 'PAYMENT_CONFIRMED',
    order_id: order.id,
    user_id: order.user_id,
    customer_phone: order.shipping_data.phone,
    amount_paid: order.transaction_price,
    payment_gateway: 'Easebuzz',
  }, 'api');
} catch (err) {
  console.warn('[WhatsApp] Payment confirmed event failed:', err);
}
```

---

## 3. `src/utils/orderShipment.ts`

Add right after the existing successful-shipment DB update (per the spec,
around the point where `shipmentResult.success` is confirmed):

```typescript
import { automationEngine } from '@/services/communications';

if (shipmentResult.success) {
  // ... your existing DB update stays exactly as-is ...

  try {
    await automationEngine.emit({
      type: 'SHIPMENT_CREATED',
      order_id: order.id,
      customer_phone: order.shipping_data.phone,
      tracking_id: trackingId,
      courier_name: shipmentResult.courier_name,
      awb_code: shipmentResult.awb_code,
      label_url: shipmentResult.label_url,
    }, 'api');
  } catch (err) {
    console.warn('[WhatsApp] Shipment created event failed:', err);
  }
}
```

### 3b. Delivery status polling (wherever that cron currently lives)

Wherever the existing delivery-status-sync cron detects a status change
(`sync-delivery-status` per the original spec), add:

```typescript
import { automationEngine } from '@/services/communications';

await automationEngine.emit({
  type: 'DELIVERY_STATUS_UPDATED',
  order_id: order.id,
  customer_phone: order.shipping_data.phone,
  new_status: newStatus, // one of: 'Picked up' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Delivery Failed'
  tracking_id: order.tracking_id,
}, 'cron');
```

I didn't find this file in the doc's existing-file modifications list with
a concrete patch, so I can't pinpoint the exact insertion line — drop it
right where the status transition is currently detected.

### 3c. Refunds

`REFUND_INITIATED` has a handler/template wired up but no spec'd call
site — wire it in wherever refunds are currently triggered:

```typescript
await automationEngine.emit({
  type: 'REFUND_INITIATED',
  order_id: order.id,
  customer_phone: order.shipping_data.phone,
  refund_amount: refundAmount,
  reason: refundReason,
}, 'api');
```

---

## Setup steps (in order)

1. **Install the one new dependency** (everything else is already implied
   by Next.js):
   ```bash
   npm install @supabase/supabase-js
   ```
   If `@supabase/supabase-js` is already a dependency (likely, given the
   rest of the app uses Supabase), skip this.

2. **Supabase client**: open `src/lib/supabaseAdmin.ts`. If you already
   have a Supabase admin/service-role client elsewhere in the repo,
   **delete this file** and repoint the three imports in:
   - `src/services/communications/queue/dbQueue.ts`
   - `src/services/communications/logging/messageLogger.ts`
   - `src/services/communications/logging/eventLogger.ts`
   - the 5 new `app/api/whatsapp/*` and `app/api/cron/*` routes that import it

   at your existing client instead.

3. **Admin auth**: `src/lib/adminAuth.ts` is a minimal Bearer-token stand-in.
   Replace its body with whatever your existing admin/JWT-role check is
   (the original spec's RLS policies assume `auth.jwt() ->> 'role' = '2'`
   already exists elsewhere in the app).

4. **Run the migrations** (Supabase SQL editor or your migration runner):
   ```
   database/migrations/001_create_whatsapp_tables.sql
   database/migrations/002_create_message_queue.sql
   database/migrations/003_create_message_events.sql
   ```

5. **Env vars** — copy `.env.whatsapp.example` into your `.env` / `.env.local`
   and fill in real values (see the table in the final summary for which
   ones need real credentials vs. which have safe defaults).

6. **Vercel cron** — merge the `crons` array from `vercel.cron.json` into
   your existing `vercel.json`. If you're not on Vercel, instead point any
   scheduler (GitHub Actions cron, a server-side `setInterval`, etc.) at:
   - `GET /api/cron/process-message-queue` every 1 minute
   - `GET /api/cron/retry-failed-messages` every 5 minutes
   - `GET /api/cron/clean-old-logs` once daily

7. **Meta Business Manager**:
   - Create and get approval for all 9 templates referenced in
     `.env.whatsapp.example` (`order_placed`, `payment_confirmed`,
     `shipment_created`, `shipment_picked`, `in_transit`,
     `out_for_delivery`, `delivered`, `delivery_failed`,
     `refund_initiated`). Each template's `{{1}}`, `{{2}}`... placeholders
     must match the `parameterOrder` arrays in
     `src/services/communications/config/templates.ts`.
   - Register `https://your-domain.com/api/webhooks/whatsapp` as the
     webhook URL, using `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for the handshake.
   - Copy the App Secret into `WHATSAPP_APP_SECRET` (Settings → Basic) —
     this was missing from the original env list but is required to
     verify inbound webhook signatures.

8. **Apply patches 1–3 above** to the three existing files.

9. **Run the test suite** (install dev deps first if not already present:
   `npm install -D jest ts-jest @types/jest`):
   ```bash
   npx jest --config jest.config.whatsapp.js
   ```
   (merge `jest.config.whatsapp.js` into your existing Jest config if you
   have one — the only hard requirement is the `@/* -> src/*` path alias).

---

## Corrections made vs. the original spec

- **API host**: the spec's data-flow diagram pointed at
  `graph.instagram.com` — that's wrong for WhatsApp Cloud API. The client
  uses `graph.facebook.com` (v19.0).
- **Webhook signing secret**: the spec only listed
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (used for the one-time GET handshake).
  Verifying the authenticity of every inbound POST requires a separate
  `WHATSAPP_APP_SECRET` (HMAC-SHA256 over the raw body) — added to the env
  list and implemented in `webhookHandler.ts`.
- **Idempotency**: added a `dedupe_key UNIQUE` column to `message_queue`
  (not in the original schema) so `enqueue()` can safely no-op a
  duplicate event instead of relying on application logic alone.
- **`message_queue` RLS**: the spec said `DISABLE ROW LEVEL SECURITY`,
  which leaves the table world-readable to anyone holding the anon key.
  Implemented as `ENABLE ROW LEVEL SECURITY` with zero policies instead —
  only the service-role key (used server-side only) can touch it.
- **Duplicate index**: dropped `idx_whatsapp_messages_message_id` since
  the column's `UNIQUE` constraint already creates that index.
