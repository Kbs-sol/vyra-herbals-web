import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { SITE_URL } from '@/utils/seo';

// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
// Cache the generated feed for 15 minutes at the edge. Merchant Center pulls
// every 24h by default; anything faster is wasted work.
export const revalidate = 900;

/**
 * Google Merchant Center product feed (RSS 2.0 + `g:` extension).
 *
 * Why this file exists
 * --------------------
 * The Shopping tab in Google search is 100% populated from Merchant Center
 * catalogues. Products only ever appear in the Shopping tab, in the free
 * "Popular products" carousel on regular search, in Google Lens results,
 * and in the Google image-search shopping shelf if they are ingested from
 * this feed. Structured data on the site helps, but it is NOT a
 * replacement — Merchant Center's own crawlers pull from a feed URL.
 *
 * How Merchant Center consumes this
 * ---------------------------------
 * In Google Merchant Center → Products → Feeds → Add feed:
 *   Method:        Scheduled fetch
 *   File name:     feed.xml
 *   Fetch URL:     https://vyraherbals.com/feed.xml
 *   Frequency:     Daily
 *   Country:       India
 *   Language:      English
 *   Currency:      INR
 *
 * Reference: https://support.google.com/merchants/answer/7052112
 *
 * Field mapping notes (from Supabase `products` row → `g:` element)
 * ------------------------------------------------------------------
 *   id             ← handle (URL-safe, stable across price/description edits)
 *   title          ← title, truncated to 150 chars per Google's spec
 *   description    ← description (short_description column does not exist in this DB), plain text
 *   link           ← https://vyraherbals.com/product/<handle>
 *   image_link     ← image_url  (must be publicly accessible)
 *   additional_image_link × N  ← images[1..10]
 *   availability   ← 'in_stock' if stock > 0 && status active, else 'out_of_stock'
 *   price          ← "<amount> INR"      (both required)
 *   sale_price     ← price when regular_price > price (MRP vs selling price)
 *   brand          ← 'Vyra Herbals'
 *   gtin           ← sku if it looks like a GTIN (else omitted; identifier_exists = false)
 *   condition      ← 'new'
 *   product_type   ← category  (breadcrumb-style)
 *   google_product_category ← "Health & Beauty > Personal Care > Hair Care > Hair Oils" etc.
 *   shipping       ← IN::Standard:0 INR  (free shipping across India — declared upfront)
 */

// Map Vyra category names → Google product-category taxonomy.
// Ref: https://www.google.com/basepages/producttype/taxonomy-with-ids.en-IN.txt
function googleCategoryFor(category?: string | null): string {
  const c = (category || '').toLowerCase();
  if (c.includes('oil')) return 'Health & Beauty > Personal Care > Hair Care > Hair Oils';
  if (c.includes('shampoo')) return 'Health & Beauty > Personal Care > Hair Care > Shampoo & Conditioner';
  if (c.includes('mask')) return 'Health & Beauty > Personal Care > Hair Care > Hair Masks';
  if (c.includes('comb') || c.includes('massager') || c.includes('brush')) {
    return 'Health & Beauty > Personal Care > Hair Care > Hair Care Accessories';
  }
  if (c.includes('rosemary') || c.includes('leaves') || c.includes('herb')) {
    return 'Health & Beauty > Personal Care > Cosmetics > Bath & Body';
  }
  return 'Health & Beauty > Personal Care > Hair Care';
}

// XML-escape untrusted strings. We use CDATA for description/title to sidestep
// most of it, but attributes / IDs still need this.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function absoluteImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${SITE_URL}${url}`;
  return `${SITE_URL}/${url}`;
}

function priceInINR(price: number | string | null | undefined): string | null {
  if (price === null || price === undefined) return null;
  const n = typeof price === 'number' ? price : Number(String(price).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n.toFixed(2)} INR`;
}

// GTIN-8/12/13/14 gate: only claim `gtin` when the SKU actually looks like a
// GTIN. Sending Vyra's SKUs (VYRA-OIL-100 etc.) through Google's checker
// would fail every product with "invalid identifier".
function isLikelyGtin(sku?: string | null): boolean {
  if (!sku) return false;
  const digits = String(sku).replace(/\D/g, '');
  return [8, 12, 13, 14].includes(digits.length);
}

export async function GET() {
  const supabase = createServerSupabase();

  // ------------------------------------------------------------------
  // Filter reality (verified 2026-09-18 against the actual Supabase dump):
  //   - Every one of the 29 live products has `status = NULL`.
  //   - The `status` column is Postgres type `unknown` (never seeded with a
  //     non-NULL value), so ANY numeric or string comparison inside a
  //     PostgREST .or() clause tries to cast the whole column and errors with
  //     `invalid input syntax for type bigint: "active"` — returning 0 rows.
  //   - The inherited `.or('status.eq.1,status.eq.active,status.is.null')`
  //     pattern from sitemap.ts silently drops every single row for that
  //     exact reason.
  //
  // Simplest correct filter: `.not('status', 'eq', 0)`, which matches BOTH
  // `status IS NULL` and `status = 1` (PostgREST treats NULL != 0 as true
  // for a negated equality), and stays correct if the column ever gets
  // seeded with 0-for-archived / 1-for-active integers later.
  //
  // SELECT column names verified against actual schema (products table dump):
  //   description (no short_description),
  //   regular_price (no compare_at_price),
  //   stock_quantity (no stock)
  // ------------------------------------------------------------------
  const { data, error } = await supabase
    .from('products')
    .select('id, handle, title, description, price, regular_price, image_url, images, category, sku, stock_quantity, status, brand')
    .not('status', 'eq', 0)
    .limit(500);

  if (error) {
    // Never 500 on a Google fetch — return an empty valid feed so Merchant
    // Center doesn't disapprove the account. Log the error out-of-band.
    // eslint-disable-next-line no-console
    console.error('[feed.xml] Supabase error:', error.message, error.code, error.details);
  }

  const products = (data ?? []) as any[];
  // Diagnostic breadcrumb — tail this in Vercel logs if the feed appears empty.
  // eslint-disable-next-line no-console
  console.log(`[feed.xml] fetched=${products.length} error=${error?.message || 'none'}`);
  const now = new Date().toUTCString();

  const items = products
    .filter((p) => p.handle && p.title && priceInINR(p.price))
    .map((p) => {
      const link = `${SITE_URL}/product/${encodeURIComponent(p.handle)}`;
      const mainImage = absoluteImage(p.image_url || (Array.isArray(p.images) && p.images[0]) || null) || `${SITE_URL}/assets/images/banner/og-image.jpg`;
      const additional = Array.isArray(p.images)
        ? p.images.slice(1, 11).map((u: string) => absoluteImage(u)).filter(Boolean)
        : [];

      // stock_quantity is often NULL in this DB; treat NULL as in-stock.
      const inStock = (p.stock_quantity ?? 1) > 0 && String(p.status ?? '1') !== '0';
      const price = priceInINR(p.price)!;
      // `regular_price` is the MRP; `price` is the selling price. If MRP > sale
      // price, Google Shopping wants: g:price = MRP, g:sale_price = actual.
      const hasDiscount = priceInINR(p.regular_price) && Number(p.regular_price) > Number(p.price);
      const salePrice = hasDiscount ? priceInINR(p.price) : null;
      const listPrice = hasDiscount ? priceInINR(p.regular_price) : price;

      const desc = stripHtml(p.description || `${p.title} — 100% natural handmade herbal hair care by Vyra Herbals. Chemical-free, sulphate-free, paraben-free. ISO 9001:2015 & GMP certified.`).slice(0, 5000);

      const brand = p.brand || 'Vyra Herbals';
      const gtinBlock = isLikelyGtin(p.sku)
        ? `<g:gtin>${xmlEscape(String(p.sku))}</g:gtin>`
        : `<g:identifier_exists>no</g:identifier_exists>`;

      const additionalImagesXml = additional
        .map((u: string) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
        .join('');

      // Meta Commerce Manager fields — Meta shares Google's Merchant feed
      // spec but reads a few extras. Adding them here means the SAME
      // feed.xml can be plugged into Meta Commerce Manager (Facebook /
      // Instagram Shops) without a duplicate export step.
      //   `age_group` + `gender` = adult / unisex (hair care is unisex)
      //   `product_highlight`   = bullet-point selling points, up to 4
      //   `shipping_weight`     = required for accurate Meta shipping quotes
      const highlights = [
        '100% herbal formulation',
        'ISO 9001:2015 & GMP certified',
        'Sulphate- and paraben-free',
        'Free shipping across India',
      ]
        .map((h) => `<g:product_highlight><![CDATA[${h}]]></g:product_highlight>`)
        .join('');

      return `<item>
  <g:id>${xmlEscape(p.handle)}</g:id>
  <g:title><![CDATA[${p.title.slice(0, 150)}]]></g:title>
  <g:description><![CDATA[${desc}]]></g:description>
  <g:link>${xmlEscape(link)}</g:link>
  <g:image_link>${xmlEscape(mainImage)}</g:image_link>${additionalImagesXml}
  <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
  <g:price>${listPrice}</g:price>
  ${salePrice ? `<g:sale_price>${salePrice}</g:sale_price>` : ''}
  <g:brand>${xmlEscape(brand)}</g:brand>
  ${gtinBlock}
  <g:mpn>${xmlEscape(p.sku || String(p.id))}</g:mpn>
  <g:condition>new</g:condition>
  <g:age_group>adult</g:age_group>
  <g:gender>unisex</g:gender>
  ${highlights}
  ${p.category ? `<g:product_type>${xmlEscape(p.category)}</g:product_type>` : ''}
  <g:google_product_category>${xmlEscape(googleCategoryFor(p.category))}</g:google_product_category>
  <g:custom_label_0>${xmlEscape(p.category || 'general')}</g:custom_label_0>
  <g:custom_label_1>${inStock ? 'available' : 'unavailable'}</g:custom_label_1>
  <g:custom_label_2>${salePrice ? 'on-sale' : 'regular-price'}</g:custom_label_2>
  <g:shipping>
    <g:country>IN</g:country>
    <g:service>Standard</g:service>
    <g:price>0.00 INR</g:price>
    <g:min_handling_time>1</g:min_handling_time>
    <g:max_handling_time>2</g:max_handling_time>
    <g:min_transit_time>2</g:min_transit_time>
    <g:max_transit_time>5</g:max_transit_time>
  </g:shipping>
  <g:tax>
    <g:country>IN</g:country>
    <g:rate>0.00</g:rate>
    <g:tax_ship>no</g:tax_ship>
  </g:tax>
</item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Vyra Herbals — Product Catalogue</title>
  <link>${SITE_URL}</link>
  <description>Herbal hair care products from Vyra Herbals, formulated in India, ISO 9001:2015 &amp; GMP certified.</description>
  <language>en-IN</language>
  <lastBuildDate>${now}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=900, stale-while-revalidate=3600',
    },
  });
}
