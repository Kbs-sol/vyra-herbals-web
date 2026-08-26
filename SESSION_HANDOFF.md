# Session handoff — Vyra (icarry-vyra-complete)

Written 2026-08-23. Everything a fresh session needs to pick this up cold.

---

## 1. Project

Vyra e-commerce storefront. Next.js 15.5.9 App Router (Webpack), React 18.3.1,
`reactStrictMode: true` (`next.config.ts:35`), `ignoreBuildErrors: false`
(`next.config.ts:165`). Supabase backend (project ref `obbohecegyagnqufelpx`),
Easebuzz payments, iCarry shipping, Message Central for OTP. Deploys to Vercel.

**Folders**
- `C:\Users\HP\Desktop\Short Film\icarry-vyra-complete` — the working folder.
- `C:\Users\HP\Desktop\Short Film` — parent, connected late in the session. A
  sibling-folder search was started here and returned no output; **inconclusive,
  needs redoing.**

---

## 2. Standing constraints (verbatim from HP, still in force)

- "do not add or modify anything external that doesnt already exist"
- "dont delete, move to a seperate folder"
- "i have no clue of what to do in the supabse website, its too complex for me
  half the stuff fly over my head so, i am relying on you for it" → plain
  English, paste-and-Run SQL, no assumed Supabase knowledge
- "i need to migrate the database tables without effecting the current data"
- "remember that this is fragile data, productio database"
- "you do the necessary and push to github. all i care for is the website
  working once loaded into vercel"
- HP wants speed. Investigate less, decide more, report concisely.

**Environment gotchas learned the hard way**
- Do **not** run `git` from the Linux sandbox — it once created a
  `.git/index.lock` the sandbox could not remove.
- Sandbox has no network egress. `next build` cannot run there (the SWC native
  binary is Windows-built). `node node_modules/typescript/bin/tsc --noEmit`
  **does** work, because `typescript` is pure JS.
- There is no `PowerShell` tool. Don't call one.
- Every secret pasted into chat needs rotation. Never write secret *values* to
  memory or to any committed file.

---

## 3. Work completed and verified this session (NOT yet committed or pushed)

Two features: guest cart, and admin registration-date sorting. Seven files.

| File | Change |
|---|---|
| `src/Components/Common/AddToCartButton.tsx` | Removed login gate #1; dropped unused `useAuth`/`toast`. `useRouter` kept ("Go to Cart" branch). |
| `src/Components/Home/StickyHairConcern.tsx` | Removed login gate #2 (found only by grepping `"login first"`). |
| `src/Components/Contexts/CartContext.tsx` | Removed login gate #3 and added the whole guest cart. See details below. |
| `src/PageComponents/Checkout.tsx` | Kept the existing `!user` gate in `handleCheckout`; made `returnTo` flow-aware via the pre-existing `isDirectBuy` (cart → `/checkout`, Buy Now → product page, because `/checkout` renders `product={null}` and would drop the item). Added `onClose` fallback `router.replace('/cart')` to fix a dead end. |
| `app/checkout/page.tsx` | New auth gate on the URL itself, because `Checkout.tsx:366-370` sets `showModal` from its `show` prop and bypasses `handleCheckout`. Waits on `authLoading` first — without that it bounces signed-in users on a cold load. |
| `app/admin/customers/page.tsx` | Added the missing `Registration Date` `<th>`/`<td>` for the leads tab. Changed detail-modal "Customer Since" from `lastOrderDate` → `registeredAt`. |
| `app/api/admin/customers/route.ts` | Null-safe `toTime` comparator for `registeredAt` (nulls sink last in **both** directions instead of masquerading as epoch 0). Added `registeredAt: null` to the order-derived shape. Replaced a write-only `purchaserKeys` Set with a `purchaserByKey` Map so a matched `users` row hands its signup date to the purchaser it belongs to. Additive; no field renamed, no contract change. |

**Guest cart design rules that must not regress**
- Storage key `vyra_guest_cart_v1`, holds **only** `{product_id, quantity}` —
  never prices or product details, so a stale browser can never show a stale
  price. Details always re-fetched via `POST /api/products/cart`.
- Merge on sign-in uses the existing
  `upsert(..., { onConflict: 'user_id, product_id' })`; `cart` has
  `UNIQUE(user_id, product_id)`, which is what makes duplicates impossible.
- Two refs guard the merge: `mergedForUserId` (once per sign-in) and
  `mergeInFlight` (shared promise, because StrictMode double-invokes effects).
  The guard is set **only after the merge succeeds** — setting it early makes a
  failed merge look like an empty cart to the shopper.
- Merge quantity is `Math.max(existing, Math.min(10, existing + guest))`. The
  plain `min` silently *shrinks* an account line legitimately above 10, since
  the signed-in add path is uncapped.
- `hydrateGuestCart` returns `null` (not `[]`) on lookup failure, and
  `fetchCart` leaves state untouched on `null`, so an API blip never blanks a cart.
- Login gate now lives **only** at checkout. `AddToWishlistButton` still gates on
  login — intentional, different feature, out of scope.
- Server-side backstop already exists: `app/api/payment/{access,session}/route.ts`
  resolve identity from the verified bearer token via `requireUser`. The UI gate
  is convenience, not security.

**Verification performed**
- `node node_modules/typescript/bin/tsc --noEmit` → exit 0, 0 diagnostics.
- Cart merge/storage harness: 13/13.
- Post-review fix harness: 18/18 (non-shrinking qty, failed-merge retry,
  StrictMode single merge, null-vs-empty hydration, purchaser `registeredAt`
  handover incl. `<phone>@phone.internal` OTP matching).
- Sort harness: descending is the exact reverse of ascending on the real format
  `2026-08-07T14:59:40.78505+00:00`; undated rows last in both directions; no
  rows dropped.

**Deliberately left alone**
- The `lastOrderDate` sort case still has the `: 0` fallback — same class of bug,
  not the reported one. One-line fix, offered but not applied.
- `DATABASE_FIX_PRODUCTION.sql:429-430` has
  `POLICY "Service role cart access" ON cart FOR ALL USING (true)` — if that is
  what production ran, `cart` is readable by any role.
  `SUPABASE_AUTH_SETUP.sql:92-95` has the correct `auth.uid() = user_id` version.
  **Unresolved: which one is live.**

---

## 4. The WhatsApp blocker (current task)

**The WhatsApp automation code does not exist in the working folder. Only its
configuration does.**

Evidence gathered:
- `grep -ri whatsapp` across all source returns exactly three real hits:
  `public/assets/images/whatsapp.webp`, `FaWhatsapp` icon imports in
  `StickyHairConcern.tsx` / `OrderPlaced.tsx`, and a hardcoded number at
  `OrderPlaced.tsx:301`.
- `mock-servers/` — absent.
- `package.json` scripts are only `dev, build, start, lint, pretty, typecheck`.
  No `mock:whatsapp`, no Control Panel script.
- No WhatsApp webhook route anywhere under `app/api/`.
- No message-queue / message-log / notification table in any `.sql` file.
- `src/services/` — absent entirely.

Yet `.env.local` (modified 2026-08-22) carries a complete, well-commented
24-variable WhatsApp block that explicitly references
`mock-servers/meta-whatsapp-mock/`, `npm run mock:whatsapp`, and a "Control
Panel". `.env.example` (2026-08-11) has **zero** WhatsApp variables.

**Conclusion:** `.env.local` was copied in from a different, newer working copy
where the feature was actually built. Consistent with the already-known tree
mismatch (local HEAD `ee65944` vs pushed `4de224e`, flattened root,
`src/services/` missing, hundreds of files showing as modified).

### Provider identified
Official **Meta WhatsApp Cloud API (Graph API)** — not a reseller (not Interakt,
Wati, Gupshup, 360dialog). Identified from the variable names.

### Non-secret config values found in `.env.local`
```
WHATSAPP_ENABLED=true
WHATSAPP_GRAPH_API_BASE=http://localhost:4001     <-- mock, must be unset in prod
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_TEMPLATE_ORDER_PLACED=order_placed
WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED=payment_confirmed
WHATSAPP_TEMPLATE_SHIPMENT_CREATED=shipment_created
WHATSAPP_TEMPLATE_IN_TRANSIT=in_transit
WHATSAPP_TEMPLATE_REFUND_INITIATED=refund_initiated
WHATSAPP_TEMPLATE_MARKETING=marketing_update
WHATSAPP_SEND_ORDER_PLACED=true
WHATSAPP_SEND_PAYMENT_CONFIRMED=true
WHATSAPP_SEND_SHIPMENT_CREATED=true
WHATSAPP_SEND_DELIVERY_UPDATES=true
WHATSAPP_SEND_REFUND_INITIATED=true
WHATSAPP_LOG_LEVEL=info
WHATSAPP_LOG_TO_CONSOLE=true
MESSAGE_QUEUE_BATCH_SIZE=20
MESSAGE_QUEUE_MAX_RETRIES=5
RETRY_DELAYS_MS=60000,300000,1800000
CONTROL_PANEL_PORT=4100
MOCK_WHATSAPP_PORT=4001
APP_BASE_URL=http://localhost:3000                <-- must change for prod
NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3000     <-- must change for prod
```

So the feature was designed to fire on: order placed, payment confirmed,
shipment created, in-transit/delivery updates, refund initiated — plus a
marketing template. This finally answers HP's earlier unanswered question
"at what updates does the whatsapp message get sent at".

### Secrets present in `.env.local` (values withheld; never commit this file)
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_BUSINESS_ACCOUNT_ID`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`,
`INTERNAL_EVENT_SECRET`, `CRON_SECRET`.

### Production landmine
`WHATSAPP_ENABLED=true` combined with `WHATSAPP_GRAPH_API_BASE=http://localhost:4001`
means that if these values reach Vercel as-is, **every** order message would be
posted to a mock server that doesn't exist in production. `WHATSAPP_GRAPH_API_BASE`
must be unset (or set to `https://graph.facebook.com`) and both localhost URLs
replaced with the real domain.

### Credentials HP needs for the real Meta API
HP's stated status: **Meta account exists, no templates submitted.** HP wants the
real API, not the mock, and wants it production-ready.

1. **Business verification** in Meta Business Manager — required to send at scale
   and to get off test numbers. Takes days; start first.
2. **Meta developer App** (type Business) with the WhatsApp product added →
   yields App ID and **App Secret** (`WHATSAPP_APP_SECRET`, used to verify the
   `X-Hub-Signature-256` webhook signature).
3. **WhatsApp Business Account (WABA) ID** → `WHATSAPP_BUSINESS_ACCOUNT_ID`.
4. **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`. The number must **not** be
   active on consumer WhatsApp or the WhatsApp Business app; delete it from
   WhatsApp first or use a fresh number.
5. **System User permanent access token** with `whatsapp_business_messaging` +
   `whatsapp_business_management` scopes → `WHATSAPP_ACCESS_TOKEN`. The 24-hour
   dev token will not survive production.
6. **Webhook verify token** → `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. HP invents this;
   it's just a random string pasted into both Meta's dashboard and the env var.
7. **Six approved message templates**, names must match the env values above.
   Utility templates (order/payment/shipment/transit/refund) usually approve
   quickly; `marketing_update` is a Marketing-category template with stricter
   review, per-message marketing pricing, and a recorded opt-in requirement.
8. **Payment method** on the Meta business account — sends fail once the free
   allowance is exhausted.
9. **Public HTTPS webhook URL** — Meta will not deliver to localhost. Needs the
   Vercel domain, or a tunnel for local testing.

Meta's messaging pricing changed during 2025 (conversation-based → per-message
for templates); verify current rates rather than trusting older figures.

---

## 5. Other pending items

- **#3** Set env vars in Vercel (`.env.example` has 24 names; `.env.local` has 57 —
  reconcile before uploading, and do not upload the localhost/mock values).
- **#4** Re-run the schema migration against `obbohecegyagnqufelpx`:
  PREFLIGHT → the four migration files **individually** → VERIFY. Never paste the
  54 KB combined file (the SQL Editor clips large pastes and only shows the last
  statement's result).
- **#5** Rotate every secret exposed in chat: Supabase `service_role` + anon keys,
  `JWT_SECRET`, `ADMIN_PASSWORD`, `EASEBUZZ_SALT`, `ICARRY_KEY`,
  `MESSAGE_CENTRAL_KEY`, the old `sb_secret_…` key, and the DB password.
- Unanswered: the step-by-step guide for pushing/deploying via HP's "official"
  GitHub account; whether `npm run dev` starts after the env fix; whether
  `src/utils/supabaseClient.ts` should read `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 6. Prompt for the next session

> Continue work on the Vyra storefront at
> `C:\Users\HP\Desktop\Short Film\icarry-vyra-complete`. Read
> `SESSION_HANDOFF.md` in that folder first — it has the full state, the standing
> constraints, and the environment gotchas. Do not re-investigate what it already
> documents.
>
> I want the WhatsApp order-update automation tested against the **real Meta
> WhatsApp Cloud API** (not the mock server) and made production-ready, then
> pushed to GitHub so it works on Vercel.
>
> The blocker: that feature's code is not in the working folder — only its
> `.env.local` configuration is. It was built in a different copy of the project.
> **Start by searching `C:\Users\HP\Desktop\Short Film` and its sibling folders
> for the working copy.** Identify it by the presence of `mock-servers/`, a
> `mock:whatsapp` script in `package.json`, a WhatsApp service module, a message
> queue, and a WhatsApp webhook route under `app/api/`. Both folders are already
> connected. Search with `find`/`grep` in the Linux sandbox using narrow,
> time-boxed commands — a broad recursive search timed out at 120s last time, so
> exclude `node_modules` and cap depth.
>
> Once found: tell me where it is and what it contains before changing anything.
> Then (a) confirm whether it's a superset of my current folder or a divergent
> fork, and how the cart and admin-customers changes listed in the handoff relate
> to it — those seven files are edited and verified in the current folder but not
> committed, and I don't want to lose them; (b) review the WhatsApp
> implementation for production readiness, especially that
> `WHATSAPP_GRAPH_API_BASE` and the two localhost URLs can't leak into
> production, that webhook signatures are verified with the app secret, and that
> the retry/queue path can't double-send; (c) give me a plain-English,
> click-by-click checklist for the Meta side — I have a Meta account but have
> submitted none of the six templates, and I need the exact template names,
> categories, and body text to paste in; (d) then walk me through pushing to
> GitHub and setting the Vercel env vars.
>
> Constraints: don't add or modify anything external that doesn't already exist;
> don't delete anything, move it to a separate folder instead; the Supabase
> database is fragile production data, so any SQL must be paste-and-run and must
> not affect existing rows. Never commit `.env.local`. Don't run `git` from the
> Linux sandbox — it leaves an unremovable lock file; give me the commands to run
> myself. `next build` can't run in the sandbox, but
> `node node_modules/typescript/bin/tsc --noEmit` can. Be concise and move fast;
> report findings and decisions, not step-by-step narration.
