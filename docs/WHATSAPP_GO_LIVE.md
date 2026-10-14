# WhatsApp Order Updates — Go-Live Guide

Everything in the code is done and it compiles clean. This file is the
human checklist: what to click in Supabase, what to create in Meta, what to
paste into Vercel, and how to push.

**Nothing in here can break your live site.** WhatsApp is shipped switched
**OFF** (`WHATSAPP_ENABLED` defaults to off). With it off, orders, payments
and shipping behave exactly as they do today — the notification code logs
"provider disabled" and returns. You turn it on in Step 6, last, once
everything else is ready.

Do the steps in order. Steps 1–3 can be done any time; Step 4 (push) is what
makes the site build on Vercel.

---

## Step 1 — Create the 3 new database tables (Supabase)

You are only **adding** three brand-new tables. Nothing existing is touched:
every statement is `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT
EXISTS`. There is no `DROP`, and no `ALTER` of any table you already have.
Your orders, products and users are not modified.

The three tables:

| Table | What it's for |
|---|---|
| `whatsapp_messages` | Permanent record of every message sent, and whether it was delivered/read |
| `message_queue` | Outbox. A message lands here first, then gets sent. Survives failures |
| `message_events` | Log of every order/payment/shipment event that came in |

**What to click:**

1. Go to https://supabase.com/dashboard and open the project
   **obbohecegyagnqufelpx**.
2. In the left sidebar click **SQL Editor**.
3. Click **+ New query** (top of the page).
4. On your computer open this file in Notepad:
   `database/migrations/001_create_whatsapp_tables.sql`
5. Select all of it (Ctrl+A), copy (Ctrl+C), paste into the Supabase query box.
6. Click the green **Run** button (bottom right, or press Ctrl+Enter).
7. You should see **"Success. No rows returned"**. That's what success looks
   like for this — it's creating things, not fetching things.
8. Repeat steps 3–7 for the other two files, **one at a time, in this order**:
   - `database/migrations/002_create_message_queue.sql`
   - `database/migrations/003_create_message_events.sql`

**Only run each file once.** If you accidentally run 001 or 003 a second
time, you'll get a red error saying a *policy already exists*. That error is
harmless — it means the table was already created correctly the first time.
Nothing is damaged; just move on.

**If you get any other red error, stop and send me the exact text.** Most
likely cause would be the `orders.id` column type not matching, and I'd need
to see the message to adjust.

**How to confirm it worked:** left sidebar → **Table Editor**. You should now
see `message_events`, `message_queue` and `whatsapp_messages` in the table
list, all empty.

---

## Step 2 — Create the message templates in Meta

WhatsApp does not let a business send free-form text to a customer who hasn't
messaged first. Every notification has to be a **template** that Meta
approves in advance. Approval usually takes minutes to a few hours.

**Where:** https://business.facebook.com → **WhatsApp Manager** →
**Account tools** → **Message templates** → **Create template**.

For every single one of these, set:

- **Category: Utility** ← important. Not Marketing. Order updates are
  Utility, which is cheaper and gets approved without fuss. Picking
  Marketing can get the template rejected and costs more per message.
- **Language: English** ← important. Pick plain "English", **not** "English
  (US)". Plain English is the code `en`, which is what the app sends. If you
  create it as English (US) the code is `en_US` and every send fails with
  Meta error 132001 ("template name does not exist in the translation").
  (If you already made them as English (US), don't redo them — instead set
  `WHATSAPP_TEMPLATE_LANGUAGE=en_US` in Step 3 and it'll match.)
- **Name:** exactly as in the table below, lowercase with underscores.

### The 8 templates you need

The `{{1}}`, `{{2}}` placeholders get filled in by the app. **The number of
placeholders must match exactly** — if the app sends 3 values and your
template only has 2 slots, Meta rejects the message. Body text is a
suggestion; reword it freely, just keep the same number of placeholders in
the same order.

**1. `order_placed`** — 3 placeholders: name, order number, amount
```
Hi {{1}}, thanks for your order with Vyra Herbals!
Your order #{{2}} for Rs.{{3}} has been placed successfully.
We'll message you as soon as it ships.
```

**2. `payment_confirmed`** — 2 placeholders: order number, amount
```
Payment received. Your payment of Rs.{{2}} for order #{{1}} is confirmed.
Thank you for shopping with Vyra Herbals!
```
*(Note the order: {{1}} is the order number, {{2}} is the amount.)*

**3. `shipment_created`** — 4 placeholders: order number, courier, AWB,
tracking id
```
Good news! Your Vyra Herbals order #{{1}} has been shipped via {{2}}.
Tracking number: {{3}}
Reference: {{4}}
```

**4. `shipment_picked`** — 2 placeholders: order number, tracking id
```
Your order #{{1}} has been picked up by the courier and is on its way.
Tracking: {{2}}
```

**5. `in_transit`** — 2 placeholders: order number, tracking id
```
Your Vyra Herbals order #{{1}} is in transit and moving towards you.
Tracking: {{2}}
```

**6. `out_for_delivery`** — 2 placeholders: order number, tracking id
```
Your order #{{1}} is out for delivery and should reach you today.
Please keep your phone handy. Tracking: {{2}}
```

**7. `delivered`** — 2 placeholders: order number, tracking id
```
Your Vyra Herbals order #{{1}} has been delivered. We hope you love it!
Reference: {{2}}
```

**8. `delivery_failed`** — 2 placeholders: order number, tracking id
```
We couldn't deliver your order #{{1}} today. The courier will try again.
Tracking: {{2}} — reply here if you need to change the address.
```

### Optional 9th template

**`refund_initiated`** — 2 placeholders: order number, refund amount.
Nothing in the site currently triggers this, because there's no refund flow
in the code yet. Skip it for now; create it the day refunds are built.

---

## Step 3 — Put the settings into Vercel

**Where:** https://vercel.com → your project → **Settings** →
**Environment Variables**. Add each one, and tick **Production** (and
Preview, if you use preview deploys).

### Must be set, or WhatsApp silently does nothing

These have no safe default — if they're missing, no messages send.

| Name | Value | Where to find it |
|---|---|---|
| `WHATSAPP_ENABLED` | `false` for now → `true` in Step 6 | — |
| `WHATSAPP_ACCESS_TOKEN` | your permanent token | Meta App Dashboard → WhatsApp → API Setup |
| `WHATSAPP_PHONE_NUMBER_ID` | the numeric ID | same page (**not** the phone number itself) |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | the numeric WABA ID | same page |
| `WHATSAPP_APP_SECRET` | App Secret | Meta App Dashboard → Settings → Basic → "App secret" → Show |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | any long random string you invent | you make this up; you'll paste the same one into Meta in Step 5 |
| `WHATSAPP_SEND_ORDER_PLACED` | `true` | — |
| `WHATSAPP_SEND_PAYMENT_CONFIRMED` | `true` | — |
| `WHATSAPP_SEND_SHIPMENT_CREATED` | `true` | — |
| `WHATSAPP_SEND_DELIVERY_UPDATES` | `true` | — |

> The five `WHATSAPP_SEND_*` switches default to **off** when missing — that's
> deliberate (nothing sends by accident), but it means you must actually set
> them to `true`. This is the most common reason "everything is configured but
> no messages arrive".

Also set `WHATSAPP_SEND_REFUND_INITIATED=true` if you created that 9th
template; otherwise leave it out.

### Fix an existing wrong value

| Name | Set to | Why |
|---|---|---|
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://vyraherbals.com` | it's currently `http://localhost:3000`, which breaks links on the live site |

### Should be set (they have working defaults, but be explicit)

`WHATSAPP_TEMPLATE_LANGUAGE=en`

`WHATSAPP_TEMPLATE_ORDER_PLACED=order_placed`
`WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED=payment_confirmed`
`WHATSAPP_TEMPLATE_SHIPMENT_CREATED=shipment_created`
`WHATSAPP_TEMPLATE_SHIPMENT_PICKED=shipment_picked`
`WHATSAPP_TEMPLATE_IN_TRANSIT=in_transit`
`WHATSAPP_TEMPLATE_OUT_FOR_DELIVERY=out_for_delivery`
`WHATSAPP_TEMPLATE_DELIVERED=delivered`
`WHATSAPP_TEMPLATE_DELIVERY_FAILED=delivery_failed`
`WHATSAPP_TEMPLATE_REFUND_INITIATED=refund_initiated`

*(Only change these if Meta made you approve a template under a different
name — that's the whole point of them being settings.)*

`WHATSAPP_LOG_LEVEL=info`
`WHATSAPP_LOG_TO_CONSOLE=true`
`WHATSAPP_LOG_TO_DATABASE=true`
`MESSAGE_QUEUE_BATCH_SIZE=20`
`MESSAGE_QUEUE_MAX_RETRIES=5`
`RETRY_DELAYS_MS=60000,300000,1800000`

### Already needed by the site — check they're there

`CRON_SECRET`, `INTERNAL_EVENT_SECRET`, `JWT_SECRET`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD`, the Supabase keys, Easebuzz, iCarry, Message Central.
These are unchanged; just confirm they exist in Vercel.

**Do not** set `WHATSAPP_GRAPH_API_BASE`. It does nothing — the code always
calls the real `graph.facebook.com`.

---

## Step 4 — Push to GitHub

Repo: `https://github.com/vyraherbals-ux/vyra-herbals.git`, branch `main`.

Open a terminal in the project folder and run these one at a time.

First, look at what's about to be committed:

```bash
git status
```

Then stage and commit:

```bash
git add -A
```

```bash
git commit -m "Add WhatsApp order-update automation (Meta Cloud API)"
```

```bash
git push origin main
```

Two things to check in `git status` output before you commit:

- **`.env.local` must NOT be listed.** It holds all your live secrets. It's
  in `.gitignore`, so it shouldn't appear — if it does, stop and tell me.
- **`env_backup/` must NOT be listed.** I added it to `.gitignore` in this
  session for exactly this reason (it contains a copy of your old secrets).

`git status` will also show some earlier unrelated work that was never
committed (guest cart, admin sorting). That's fine to go up in the same
commit.

Once pushed, Vercel builds automatically. The build should pass — I ran the
TypeScript check and it came back clean, and this project is configured to
fail the build on type errors, so that check is the real gate.

### Also: make sure the repo is private

The repo has a file called `db_transactions_dump.json` committed to it. On
GitHub, go to the repo → **Settings** → scroll to the bottom → confirm it
says "This repository is currently private". If it's public, make it private
now.

---

## Step 5 — Point Meta's webhook at the site

This step is what makes "delivered" and "read" ticks show up in your admin
logs. **Outgoing messages work fine without it** — do it after the site is
deployed.

1. Meta App Dashboard → **WhatsApp** → **Configuration** → Webhook → **Edit**.
2. **Callback URL:** `https://vyraherbals.com/api/webhooks/whatsapp`
3. **Verify token:** the exact same random string you put in
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Step 3.
4. Click **Verify and save**. Meta calls the URL to check it's really you.
5. Then click **Manage** next to Webhook fields and subscribe to **`messages`**.

If verification fails, the usual cause is that `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
in Vercel doesn't match what you typed, or you changed it in Vercel without
redeploying.

---

## Step 6 — Turn it on

Only after Steps 1–3 are done and your templates show **Approved** in
WhatsApp Manager:

1. Vercel → Settings → Environment Variables → change `WHATSAPP_ENABLED`
   from `false` to `true`.
2. Vercel → **Deployments** → the latest one → **⋯** → **Redeploy**.
   Environment variable changes only take effect on a new deploy.
3. Place one real test order on the site using your own phone number, and
   check that the message arrives.

To turn everything off instantly at any point: set `WHATSAPP_ENABLED` back to
`false` and redeploy. Orders keep working normally; only the messages stop.

---

## One decision I need from you: Vercel plan

`vercel.json` currently has **no cron jobs** in it, on purpose.

The retry system wants a job that runs every minute. **Vercel's free (Hobby)
plan doesn't allow that** — it only permits once-a-day schedules, maximum 2
jobs. If I'd put the every-minute job in, **your deployment would fail
outright**. So I left it out to keep your deploys safe.

What you lose without the crons: nothing for normal operation. When an order
is placed the message is sent **immediately**, in the same request. The crons
only handle the unhappy path — retrying a message that failed because Meta
was down, and deleting old logs.

**Tell me which plan you're on:**

- **Hobby (free):** leave it as is. Everything works; a message that fails
  its immediate send just stays in the queue unsent. Alternatively I can add
  a single once-daily retry job, which the free plan does allow.
- **Pro (paid):** tell me and I'll merge the block from `vercel.cron.json`
  into `vercel.json` — three jobs: process the queue every minute, retry
  failures every 5 minutes, clean up logs at 2am.

---

## How to check it's working

- **Admin panel:** the WhatsApp logs screen reads from `/api/whatsapp/admin/logs`.
- **Supabase → Table Editor → `whatsapp_messages`:** one row per message.
  `status` should be `sent`, then `delivered` once the webhook is live.
- **Supabase → `message_queue`:** should be nearly empty in normal operation.
  Rows sitting in `failed_retry` or `failed_permanent` mean sends are failing
  — the `last_error` column will say why, usually a template name or language
  mismatch.
- **Vercel → Deployments → Runtime Logs:** search for `whatsapp_send`. You'll
  see `whatsapp_send_succeeded` or `whatsapp_send_failed` with the reason.

---

## What sends when

| When this happens | Customer gets | Triggered from |
|---|---|---|
| COD order placed | `order_placed` | `app/api/payment/cod/route.ts` |
| Online payment succeeds | `order_placed` + `payment_confirmed` | `src/utils/orderFinalize.ts` |
| Shipment booked with a real tracking number | `shipment_created` | `src/utils/orderShipment.ts` |
| Admin clicks "Sync from iCarry" and the status changed | one of the 5 delivery templates | `app/api/admin/orders/sync-status/route.ts` |

Every one of these is wrapped so that a WhatsApp failure **can never fail the
order**. A customer's payment will always go through even if Meta is down.

---

## Known limits (deliberate, not bugs)

- **No refund message.** There's no refund flow in the site, so nothing
  triggers it. The code and template slot are ready for when there is one.
- **Delivery updates are not automatic.** They fire when the admin "Sync from
  iCarry" action runs, because iCarry doesn't push updates to us. One sync run
  sends at most 20 messages; if more orders changed status, the rest are
  picked up on the next run — none are lost.
- **`order_placed` has 3 placeholders, not 4.** There's no customer-facing
  tracking page on the site yet, so a tracking-link placeholder would render
  blank. Add it back when a `/track` page exists.
- **The `tests/` folder is excluded from the type check.** The test files came
  across with the port but Jest isn't installed. To run them:
  `npm i -D jest ts-jest @types/jest`, remove `"tests"` from `exclude` in
  `tsconfig.json`, then `npx jest --config jest.config.whatsapp.js`.

---

## Security note

Several live secrets (Supabase service-role key, Easebuzz salt, iCarry key,
JWT secret, admin password) were visible in our chat while we worked. Chat
histories are stored. Rotating them is the safe move — each one can be
regenerated in its own dashboard, then updated in Vercel and `.env.local`.
Not urgent-urgent, but worth doing.
