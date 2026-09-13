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
 *   description    ← description || short_description, plain text
 *   link           ← https://vyraherbals.com/product/<handle>
 *   image_link     ← image_url  (must be publicly accessible)
 *   additional_image_link × N  ← images[1..10]
 *   availability   ← 'in_stock' if stock > 0 && status active, else 'out_of_stock'
 *   price          ← "<amount> INR"      (both required)
 *   sale_price     ← price when compare_at_price > price
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

  // Only publish products that are active, in stock, and have a price.
  const { data, error } = await supabase
    .from('products')
    .select('id, handle, title, description, short_description, price, compare_at_price, image_url, images, category, sku, stock, status, brand')
    .or('status.eq.1,status.eq.active,status.is.null')
    .limit(500);

  if (error) {
    // Never 500 on a Google fetch — return an empty valid feed so Merchant
    // Center doesn't disapprove the account. Log the error out-of-band.
    // eslint-disable-next-line no-console
    console.error('[feed.xml] Supabase error:', error.message);
  }

  const products = (data ?? []) as any[];
  const now = new Date().toUTCString();

  const items = products
    .filter((p) => p.handle && p.title && priceInINR(p.price))
    .map((p) => {
      const link = `${SITE_URL}/product/${encodeURIComponent(p.handle)}`;
      const mainImage = absoluteImage(p.image_url || (Array.isArray(p.images) && p.images[0]) || null) || `${SITE_URL}/assets/images/banner/og-image.jpg`;
      const additional = Array.isArray(p.images)
        ? p.images.slice(1, 11).map((u: string) => absoluteImage(u)).filter(Boolean)
        : [];

      const inStock = (p.stock ?? 1) > 0 && String(p.status ?? '1') !== '0';
      const price = priceInINR(p.price)!;
      const salePrice = priceInINR(p.compare_at_price) && Number(p.compare_at_price) > Number(p.price)
        ? priceInINR(p.price)
        : null;
      const listPrice = priceInINR(p.compare_at_price) && Number(p.compare_at_price) > Number(p.price)
        ? priceInINR(p.compare_at_price)
        : price;

      const desc = stripHtml(p.description || p.short_description || `${p.title} — herbal hair care by Vyra Herbals. 100% natural, chemical-free, ISO 9001:2015 & GMP certified.`).slice(0, 5000);

      const brand = p.brand || 'Vyra Herbals';
      const gtinBlock = isLikelyGtin(p.sku)
        ? `<g:gtin>${xmlEscape(String(p.sku))}</g:gtin>`
        : `<g:identifier_exists>no</g:identifier_exists>`;

      const additionalImagesXml = additional
        .map((u: string) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
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
  ${p.category ? `<g:product_type>${xmlEscape(p.category)}</g:product_type>` : ''}
  <g:google_product_category>${xmlEscape(googleCategoryFor(p.category))}</g:google_product_category>
  <g:shipping>
    <g:country>IN</g:country>
    <g:service>Standard</g:service>
    <g:price>0.00 INR</g:price>
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
