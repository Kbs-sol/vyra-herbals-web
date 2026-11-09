# Mobile-first conversion redesign (Nov 2026)

Why: analytics showed heavy Instagram (mobile) traffic, a high quick-back rate and low conversion.
Brand rules: "100% Natural Herbal Hair Care - Chemical-free, Handmade in India". Never use the word
"Ayurvedic". Icons (lucide-react), not emojis. Deep green + cream, clean, no clutter.

## Customer path
Homepage -> hero "What's Your Hair Concern?" (bottom sheet on mobile) -> concern -> routine ->
"Add Recommended Products (n) - total" (sticky, strongest CTA) -> /cart -> "Proceed to Checkout"
(Shiprocket when enabled, native Easebuzz/COD otherwise).

## Homepage order
1 Free-shipping bar, 2 Header + search, 3 Quick categories (Hair Oil, Shampoo, Kits, Tools, Mask),
4 Hero, 5 Concern -> Routine flow (with expert tips), 6 Real chat reviews, 7 Before & After,
8 Best Sellers / Recommended Kits, 9 Founder story, 10 Trust / certifications, 11 FAQ.

## What was built (where)
| Area | Files |
|---|---|
| Free-shipping bar, category strip, sticky spacer | `src/Components/Common/Header.tsx`, `public/assets/css/custom/awwwards-luxury.css` |
| Hero + concern bottom sheet | `src/Components/Home/redesign/EditorialHero.tsx`, `ConcernSheet.tsx`, `ConcernRoutineBuilder.tsx` (exports `ConcernFlow`), `brand.ts` (`EXPERT_TIPS`) |
| Chat reviews (WhatsApp / Instagram screenshots) | `ChatProof.tsx`, `app/admin/chat-reviews/page.tsx`, `app/api/admin/chat-reviews/route.ts`, `supabase/migrations/20261108_chat_reviews.sql`, allow-list entry in `app/api/data/route.ts` |
| Before & After | `BeforeAfter.tsx`, `Lightbox.tsx` (data: existing `before_after_images` table) |
| Best sellers / kits | `BestSellersSelector.tsx` |
| Size selector on every product | `src/utils/variantFamilies.ts`, `src/Components/Common/VariantSelector.tsx`, `src/PageComponents/Singleproducts.tsx` |
| Live "N+ people ordered this month" | `app/api/products/order-counts/route.ts`, `src/Components/Common/useOrderCounts.ts` |
| Collections (5) with family cards | `src/utils/collections.ts`, `src/PageComponents/Category.tsx`, `src/Components/Shared/FamilyProductCard.tsx`, `app/api/products/by-category/route.ts`, `app/category/[categoryName]/page.tsx` |
| Simplified checkout form | `src/PageComponents/Checkout.tsx` |
| Wording cleanup | `supabase/migrations/20261109_remove_ayurvedic_copy.sql` + code/docs |

## Data model notes
- **Variant families**: every size is still its own `products` row. `variantFamilies.ts` groups rows into a
  family (static map; optional DB columns `variant_group / variant_label / variant_order` can override later).
  Add a new product/size by adding its id to a family in that file.
- **Order counter**: distinct successful orders per product/family over 30 days, cached 10 min server-side.
  The label is hidden below 5 orders (never shows a weak number) and rounds down to tens from 50.
- **chat_reviews**: `image_url, platform (whatsapp|instagram), caption, customer_label, sort_order, status`.
  Public read only where `status = 1`. Managed at `/admin/chat-reviews` (upload goes to Supabase Storage).

## Checkout (native) changes
PIN code first (auto-fills city and state), then name/phone, area. Landmark, house number and email are
optional. Country is fixed to India. Prepaid vs COD text is shorter (COD = Rs 100 advance now, balance +
Rs 50 COD charge on delivery). Login is still required to place a native order. Server routes do not
require landmark or house number.

## Shiprocket + Easebuzz readiness
- Shiprocket becomes the primary checkout when the API key + secret are saved and the admin switch is on.
- Any failure (status call, script load, token call, session) falls back to native Easebuzz/COD. The
  "Problem checking out? Use standard checkout" link does the same.
- Kill switches: `SHIPROCKET_CHECKOUT_ENABLED=false` (env, needs redeploy) or `/admin/shiprocket`
  master switch (instant).
- Shiprocket reads the catalogue from `/api/shiprocket/catalog/*`; sizes stay separate product rows so
  variant ids still match. The storefront grouping is UI-only.
- Easebuzz S2S is not required by the code paths in this repo (no S2S calls exist); the native flow uses
  the redirect/reconcile flow. When Easebuzz enables S2S nothing needs to change here.

### Go-live checklist (Shiprocket)
1. `/admin/shiprocket`: paste key + secret, choose Live, Test and save. Turn the master switch ON
   (currently `/api/shiprocket/status` reports `admin_disabled`).
2. Set the webhook token; in Shiprocket dashboard set the order webhook to
   `https://<domain>/api/shiprocket/webhook/order` and catalogue URLs to `/api/shiprocket/catalog/...`.
3. Place one prepaid and one COD test order; confirm they appear in `/admin/orders`.
4. Confirm the native fallback still works (`?native=1` on cart, or the fallback link).

## One-time Supabase SQL
1. `supabase/migrations/20261108_chat_reviews.sql`
2. `supabase/migrations/20261109_remove_ayurvedic_copy.sql`

## Not done / next
- Optional DB columns for variant families; upload real chat screenshots in the admin;
  unused components `TrustTicker`, `ShopByCategory`, `TransformationStories` can be deleted.
