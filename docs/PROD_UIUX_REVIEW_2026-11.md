# Prod UI/UX Review - vyraherbals.com (read-only review, 2026-11-09)

Scope: live site https://vyraherbals.com (mobile 390px first, then desktop) and the read-only repo
`vyraherbals-ux/vyra-herbals` @ e0fd1d5. Nothing was pushed to prod. All changes below were applied to the
TEST repo only (`Kbs-sol/vyra-herbals-web`) and are previewable at https://vyra-herbals-web.vercel.app.

## 1. What prod looks like today (mobile)

Home section order: Banner slider > Category grid > StickyHairConcern > OurProducts > Stories > ShipingImage >
BestSeller > Video > Certificate > OurPromise > Founder > OurJourney > Testimonial > AllTestimonials >
Follow > Marketplace > Blog > Features. That is 18 stacked sections; the first product appears after ~3 screens.

## 2. Findings (prioritised)

### P0 - conversion blockers
1. **Hero is a generic image slider with no concern-led CTA.** Instagram visitors see a banner, not a reason to
   stay. No question ("What's your hair concern?"), so quick-back is high.
2. **Concern picker (StickyHairConcern, 790 lines) is a floating bar/dialog that overlaps content on small screens**
   and uses emoji icons (breaks the "lucide, no emoji" brand rule). Product mapping is hard-coded per concern and the
   flow ends at a product list, not at an "Add Recommended Products" action.
3. **Social proof is generic.** Text testimonials only; no real WhatsApp/Instagram chat screenshots and no
   before/after block.
4. **Collections show every size as a separate card** (100ml / 200ml / 500ml duplicates), which doubles scrolling
   and hides the variant choice. PDP has no size selector tying sizes together.
5. **Checkout asks too much**: landmark mandatory, house number required, email required, country picker, login wall
   for guests. Each extra field costs mobile conversions.
6. **No dynamic urgency/proof on PDP** (no "X+ people ordered this month").

### P1 - trust and clarity
7. Header strip copy is vague ("FREE Shipping Available on All Products", "ISO 9001 : 2015 & GMP Certified" with
   odd spacing). No quick-category strip under the search bar, so users must open the menu to find Hair Oil / Shampoo.
8. 18-section home dilutes the story; Video, Marketplace, Follow, Features repeat the same trust claims.
9. Unicode glyphs used as icons across the UI (`✓ CODE`, `{n} ★`, `View All Articles →`, `👉` in blog CTAs, `🌿` in
   device fingerprint canvas text) - inconsistent rendering across Android fonts.

### P1 - brand compliance
10. **"Ayurvedic" still present on prod**: `app/layout.tsx` keywords ('ayurvedic hair care'),
    `staticCatalogue.ts` (ids 3 and 9: "ancient Ayurvedic formulations", "Traditional Ayurvedic"),
    `app/concern/[concern]/page.tsx` (3 keywords + body copy), `llms.txt` ("rooted in Ayurvedic tradition"),
    WhatsApp main-menu footer ("Natural - Ayurvedic - Trusted"), and DB product/category descriptions.
11. "Handcrafted" vs "Hand-made" wording is inconsistent between catalogue, blogs and llms.txt.

### P2 - polish
12. Product card has no discount badge, no clean title (the "Combo - " prefix is shown), no fallback when a product
    has no reviews.
13. Only Open Sans is loaded; headings lack the editorial serif that the brand palette (forest/sage/linen) calls for.
14. Mobile bottom navigation / filter chips on collection pages are minimal.

## 3. What was changed on the TEST repo (and why)

| Finding | Change |
|---|---|
| 1, 2, 8 | Concern-led editorial hero ("What's Your Hair Concern?") opening a mobile bottom sheet; concern > routine > add flow with expert tips and a final "Add Recommended Products" CTA; home cut to 11 sections in the agreed order |
| 3 | Chat-screenshot reviews rail (admin CRUD at /admin/chat-reviews) and a dedicated Before & After section |
| 4, 12 | Collections with one family card per product line and size chips; discount badge and clean titles |
| 5 | Checkout: PIN-first, landmark/house/email optional, India default, autofill/inputMode, shorter COD vs Prepaid copy; Shiprocket primary / native fallback untouched |
| 6 | PDP size selector and live "X+ people ordered this month" counter (30-day order counts API, cached) |
| 7 | "Free Shipping on All Orders Across India" bar + category strip (Hair Oil, Shampoo, Kits, Tools, Mask) under search |
| 9 | lucide/SVG icons replace glyphs in the touched components |
| 10, 11 | "Ayurvedic" removed from code, copy, docs, plus SQL migration `20261109_remove_ayurvedic_copy.sql` for live DB |
| 13 | Cormorant Garamond headings + Open Sans body; brand tokens in `redesign/brand.ts` |
| prod-only fixes | Ported from prod e0fd1d5 so nothing is lost: WhatsApp webhook verify-token fallback, edit-cart handler, order tracking by phone/user + AWB link, draft-order column fixes (`id`, `order_id`, `total_amount`, `shipping_data`), delivery-status template guard, default-on order-placed notification |

## 4. Intentionally NOT copied from prod
Prod versions that are regressions versus the redesign were not ported: unicode-glyph UI strings, the
'ayurvedic' keywords, the older untyped ProductCard, and the prod-only home components (Banner, Category strip,
StickyHairConcern, HairConcernBar/Dialog, Features) which the new home replaces.

## 5. Needs a human decision / action
- Run the two Supabase migrations (`20261108_chat_reviews.sql`, `20261109_remove_ayurvedic_copy.sql`).
- Upload real chat screenshots at /admin/chat-reviews, and before/after photos.
- Shiprocket goes live tomorrow: admin/shiprocket (key, secret, master switch, webhook token). Easebuzz S2S still off.
- Review whether the default-on WhatsApp ORDER_PLACED / DELIVERY notifications (prod behaviour) is what you want.
- Porting to prod is a manual step for you: cherry-pick from the test repo after approval.
