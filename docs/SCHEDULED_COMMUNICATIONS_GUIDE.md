# Scheduled WhatsApp Automations & Flow Documentation

This document explains the automated scheduled WhatsApp messaging triggers implemented in Vyra Herbals.

---

## 1. 2-Hour Registration Welcome Promo (`welcome_promo_2hr`)
- **Trigger**: 1 to 3 hours after a user signs up/registers on the store.
- **Query Target**: `users` table (`created_at` between 1h and 3h ago).
- **Template Default Name**: `welcome_promo_2hr` (configurable via `WHATSAPP_TEMPLATE_WELCOME_PROMO` in Vercel env).
- **Parameters Passed**:
  - `{{1}}` = `customer_name` (User's full name or "Customer")
- **Dedupe Protection**: `PROMO_2HR:<user_id>` (Ensures each user receives this offer exactly once).

---

## 2. 2-Month (60-Day) Feedback Request (`feedback_request`)
- **Trigger**: 59 to 61 days after an order is placed.
- **Query Target**: `orders` table (`created_at` between 59d and 61d ago, excluding failed orders).
- **Template Default Name**: `feedback_request` (configurable via `WHATSAPP_TEMPLATE_FEEDBACK_REQUEST` in Vercel env).
- **Parameters Passed**:
  - `{{1}}` = `customer_name` (Customer's shipping name)
  - `{{2}}` = `order_id` (The order identifier)
- **Dedupe Protection**: `FEEDBACK_60D:<order_id>` (Prevents duplicate feedback requests per order).

---

## 3. 3-Month (90-Day) Re-order Reminder (`reorder_reminder`)
- **Trigger**: 89 to 91 days after an order is placed.
- **Query Target**: `orders` table (`created_at` between 89d and 91d ago, excluding failed orders).
- **Template Default Name**: `reorder_reminder` (configurable via `WHATSAPP_TEMPLATE_REORDER_REMINDER` in Vercel env).
- **Parameters Passed**:
  - `{{1}}` = `customer_name` (Customer's shipping name)
- **Dedupe Protection**: `REORDER_90D:<order_id>` (Prevents duplicate re-order reminders per order).

---

## Technical Execution Pipeline

All 3 flows execute automatically via Vercel Cron:
- **Cron Route**: `/api/cron/scheduled-communications`
- **Schedule**: Every day at 10:00 AM UTC (`0 10 * * *` configured in `vercel.cron.json`).
- **Safety Features**: Uses `tryNormalizePhone` to ensure phone numbers are formatted in valid E.164 format and respects `message_queue` deduplication keys.
