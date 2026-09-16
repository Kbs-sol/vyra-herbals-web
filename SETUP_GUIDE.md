# Vyra Herbals — Complete System Setup & Operations Guide 🌿

This guide covers everything you need to configure, operate, and verify the Vyra Herbals e-commerce platform, including the **WhatsApp Conversational Bot**, **Anonymous/Guest Cart System**, **Automated Notification Engine**, and **Supabase Cron Triggers**.

---

## 1. Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 VYRA HERBALS                                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Web Storefront ]                 [ WhatsApp Conversational Bot ]               |
|   • Next.js 14 App Router            • Meta Cloud API Webhook                     |
|   • Anonymous Cart (anon_carts)      • Multi-State Machine (botEngine.ts)         |
|   • Seamless Merge on Login          • Browse -> Categories -> Summary -> Pay     |
|   • Easebuzz / COD Checkout          • Saved Address Re-use                       |
|                                                                                   |
|                                         ^                                         |
|                                         |                                         |
|  [ Automation & Cron Engine ]           |                                         |
|   • Supabase pg_cron (10-min tick) -----+                                         |
|   • /api/cron/scheduled-communications                                            |
|   • 3-Hour Registration Follow-Up                                                 |
|   • WhatsApp Event Dispatcher & Message Queue                                     |
|                                                                                   |
|  [ Admin Intelligence ]                                                           |
|   • /admin/customer-intelligence                                                  |
|   • Abandoned Carts, Wishlists, Delivered, Past Buyers                            |
|   • CSV Lead Importer & Audience Segmentation                                     |
+-----------------------------------------------------------------------------------+
```

---

## 2. WhatsApp Conversational Bot Flow

The WhatsApp bot is designed for frictionless mobile shopping without requiring customers to download an app or register an account.

### Customer Interaction Flow:
1. **Initiation (`"Hi"`, `"Hello"`, or `"Menu"`):**
   - The bot fetches the customer's name from `users` (if registered) or addresses them naturally.
   - Responds with:
     > *"Hey {Name}! Welcome to Vyra Herbals 🌿\nShop 100% pure ayurvedic & herbal products — all right here in chat.\nHave a look around, no sign-up needed."*
   - Sends interactive list button: **Menu**.

2. **Menu List:**
   - **Shop**:
     - `Shop Products` (*Buy products outright*)
     - `My Orders` (*Track your orders*)
   - **Help**:
     - `Track My Order` (*Live shipment tracking via iCarry*)
     - `Support` (*Direct human handoff / customer support*)

3. **Category Selection (`Shop Products`):**
   - Displays interactive list: **Shop by category**
   - Categories: *All Products, Hair Oil, Shampoo, Kits, Combos, Scalp Massager, Neem Combs, Hair Mask Powder, Rosemary Leaves*.

4. **Product Selection:**
   - Shows active products in the selected category:
     > `Title (max 24 chars)`
     > `₹{price} (was ₹{regular_price}) · {category}`
   - Automatically handles null or unlimited stock in the database.

5. **Order Summary (Immediate Checkout Screen):**
   - The moment a customer taps any product, it updates `whatsapp_cart_items` and renders the exact order summary:
     ```
     📦 Order summary
     • Vyra Herbal Hair Oil × 1 — ₹499
     Total due: ₹499
     ```
   - Action Buttons:
     - `[Confirm & Pay]`
     - `[Browse More]`
     - `[Main Menu]`

6. **Address Collection & Confirmation:**
   - Tapping `[Confirm & Pay]` checks if the customer has an existing address from past orders:
     - **Saved Address**: Prompts `[Deliver Here]` or `[Add New Address]`.
     - **New Customer**: Sends `[Add Address]` button.
   - Customer replies with their address. The bot validates the format and sends confirmation buttons:
     - `[Confirm Address]`
     - `[Edit Address]`

7. **Payment Options:**
   - Tapping `[Confirm Address]` creates a draft order in the `orders` table (`source: 'whatsapp'`) and offers:
     - `[Pay Online]` -> Generates instant Easebuzz checkout link (`/checkout/pay?order_id=...&source=whatsapp`).
     - `[Pay on Delivery]` -> Converts order to COD and notifies the fulfillment team.
     - `[Main Menu]`

---

## 3. Web Anonymous / Guest Cart System

Guests can browse and add items to cart before logging in without losing their cart on reload or clearing cache.

### How It Works:
- **Device Fingerprint**: `src/utils/deviceFingerprint.ts` computes an anonymous hash of non-identifying browser attributes (resolution, timezone, language, canvas hash).
- **HTTP-Only Cookie**: `app/api/cart/anon/init/route.ts` creates or retrieves a row in `anon_carts` and sets a secure, HTTP-only `anon_device_id` cookie (90-day expiry).
- **CRUD Operations**: Handled securely on the backend via `/api/cart/anon` (GET, POST, PATCH, DELETE).
- **Login Merge**: When the guest logs in or completes OTP verification, `app/api/cart/merge/route.ts` moves items from `anon_carts` into the user's permanent `cart` table in Supabase and clears the cookie.
- **Stock Guard**: Evaluates inventory gracefully. If `stock_quantity` is null in the database, it treats the product as active with unlimited availability. Stock alerts only show if an item is physically low or out of stock.

---

## 4. WhatsApp Automation & Supabase Cron Setup

The automated notification pipeline handles welcome follow-ups, order status updates, and delivery confirmations.

### Step-by-Step Supabase `pg_cron` Activation:
To run the automated message processor every 10 minutes, execute this SQL in your **Supabase Dashboard > SQL Editor**:

```sql
-- 1. Ensure extensions are active
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Unschedule any legacy or hourly jobs
SELECT cron.unschedule('process-message-queue-hourly');
SELECT cron.unschedule('process-message-queue-10min');

-- 3. Schedule the 10-minute processor
SELECT cron.schedule(
  'process-message-queue-10min',
  '*/10 * * * *',
  $cron$
    SELECT net.http_post(
      url     := 'https://vyraherbals.com/api/cron/scheduled-communications',
      body    := '{}',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer 05d2360f74057ec232d2ab41b01031d9b0093a96b8143f73f6152a32a845fc3d"}'::jsonb
    );
  $cron$
);

-- 4. Verify the active cron job
SELECT jobid, jobname, schedule, active FROM cron.job;
```

### Automatic 3-Hour Registration Trigger:
- When a customer registers on the website, a scheduled task is inserted into `message_queue` with `scheduled_for = NOW() + INTERVAL '3 hours'`.
- Every 10 minutes, the cron job hits `/api/cron/scheduled-communications`, picks up any pending jobs whose `scheduled_for <= NOW()`, and sends the approved Meta template.

---

## 5. Required Environment Variables

Ensure the following keys are set in your **Vercel Project Settings > Environment Variables** and `.env.local`:

```env
# App URL
NEXT_PUBLIC_APP_URL=https://vyraherbals.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Cron Security Token
CRON_SECRET=05d2360f74057ec232d2ab41b01031d9b0093a96b8143f73f6152a32a845fc3d

# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=<your-meta-system-user-token>
WHATSAPP_PHONE_NUMBER_ID=<your-phone-number-id>
WHATSAPP_BUSINESS_ACCOUNT_ID=<your-waba-id>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<your-webhook-verify-token>

# Easebuzz Payment Gateway
EASEBUZZ_KEY=<your-merchant-key>
EASEBUZZ_SALT=<your-merchant-salt>
EASEBUZZ_ENV=prod

# iCarry Shipping
ICARRY_API_KEY=<your-icarry-key>
```

---

## 6. Meta WhatsApp Webhook Configuration

1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Navigate to your WhatsApp App > **Configuration**.
3. Set **Callback URL**:
   ```
   https://vyraherbals.com/api/webhooks/whatsapp
   ```
4. Set **Verify Token**: Must match your `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
5. Under **Webhook Fields**, subscribe to:
   - `messages`

---

## 7. Operational Testing & Verification Checklist

| Test Case | Expected Behavior |
| :--- | :--- |
| **Guest Add-to-Cart** | Open browser in incognito mode. Add any product to cart. The cart counter updates, and navigating to `/cart` shows items without errors or missing stock warnings. |
| **Cart Merge on Login** | Add item as guest, click Login / Enter OTP. After verification, guest items appear in user's permanent cart. |
| **WhatsApp Bot "Hi"** | Send "Hi" from a test phone to your WhatsApp Business number. Bot responds with welcome text and the `Menu` list button. |
| **Browse & Order via Chat** | Tap `Menu` -> `Shop Products` -> select category -> tap product -> order summary renders with `[Confirm & Pay]`. |
| **Address & Payment Link** | Tap `Confirm & Pay`, send address text, tap `Confirm Address`, choose `Pay Online` -> instant Easebuzz payment link arrives. |
| **Supabase Cron Tick** | In Supabase SQL editor: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;` -> Verify exit code is 0 / `status = 'succeeded'`. |

---
*Maintained by Vyra Herbals Engineering Team.*
