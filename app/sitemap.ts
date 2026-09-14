import type { MetadataRoute } from 'next';
import { createServerSupabase } from '@/utils/supabaseClient';
import { SITE_URL } from '@/utils/seo';

/**
 * Dynamic sitemap: enumerates every discoverable page on the site.
 *
 * The previous sitemap hard-coded 8 URLs — home, about, contact, cart, privacy,
 * terms, faqs, track-order — so Google had no idea any of the products or blog
 * posts existed. That fact alone explained why ~93% of clicks were branded
 * ("vyra herbals"): nobody could arrive at a product from a non-brand search
 * because the products were not in the sitemap.
 *
 * This version:
 *   - fetches every published product, category and blog slug from Supabase
 *   - drops `/cart`, `/track-order`, `/search`, `/checkout` etc. (utility pages
 *     that pollute the search index and can never rank)
 *   - uses `lastModified` from the row's `updated_at` when available so Google's
 *     `IndexNow` and change-detection actually work.
 *
 * A Supabase outage MUST NOT return an empty sitemap — that would tell Google
 * every URL was deleted. On failure we return only the safe static routes.
 */

export const revalidate = 900; // 15 minutes — plenty for a small catalogue.

type Route = MetadataRoute.Sitemap[number];

const STATIC_ROUTES: Route[] = [
  { url: `${SITE_URL}`, changeFrequency: 'daily', priority: 1.0, lastModified: new Date() },
  { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.7, lastModified: new Date() },
  { url: `${SITE_URL}/faqs`, changeFrequency: 'monthly', priority: 0.8, lastModified: new Date() },
  { url: `${SITE_URL}/testimonials`, changeFrequency: 'weekly', priority: 0.7, lastModified: new Date() },
  { url: `${SITE_URL}/blogs`, changeFrequency: 'weekly', priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3, lastModified: new Date() },
  { url: `${SITE_URL}/terms-conditions`, changeFrequency: 'yearly', priority: 0.3, lastModified: new Date() },
  // Concern landing pages — programmatic SEO targeting non-brand queries
  // ("hair oil for hair fall", "rosemary leaves for hair growth", etc.)
  // that already generate impressions in GSC but had no matching page.
  { url: `${SITE_URL}/concern/hair-fall`, changeFrequency: 'weekly', priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/concern/hair-growth`, changeFrequency: 'weekly', priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/concern/dandruff`, changeFrequency: 'weekly', priority: 0.9, lastModified: new Date() },
  { url: `${SITE_URL}/concern/scalp-care`, changeFrequency: 'weekly', priority: 0.9, lastModified: new Date() },
  // Contact / About are trust anchors — Google's E-E-A-T evaluators check them
  // explicitly for health-and-beauty. Higher priority than the /faqs page.
  { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: 0.9, lastModified: new Date() },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: Route[] = [...STATIC_ROUTES];

  try {
    const supabase = createServerSupabase();

    // ---- Products --------------------------------------------------------
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('handle, updated_at, created_at, status')
      // Live products only. Row shape varies across the codebase — status can
      // be numeric or string. This filter is tolerant of both.
      .or('status.eq.1,status.eq.active,status.is.null')
      .limit(1000);

    if (!pErr && products) {
      for (const p of products) {
        if (!p.handle) continue;
        routes.push({
          url: `${SITE_URL}/product/${encodeURIComponent(p.handle)}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : p.created_at ? new Date(p.created_at) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.9,
        });
      }
    }

    // ---- Categories ------------------------------------------------------
    // The site derives categories from the `category` column on products, not
    // a separate table. Distinct-scan the field and emit /category/<name>.
    const { data: catRows } = await supabase.from('products').select('category').not('category', 'is', null).limit(1000);
    const uniqueCats = Array.from(new Set((catRows ?? []).map((r: any) => (r.category || '').trim()).filter(Boolean)));
    for (const cat of uniqueCats) {
      routes.push({
        url: `${SITE_URL}/category/${encodeURIComponent(cat)}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    // ---- Blogs -----------------------------------------------------------
    const { data: blogs, error: bErr } = await supabase
      .from('blogs')
      .select('handle, updated_at, created_at, status')
      .or('status.eq.1,status.eq.published,status.is.null')
      .limit(500);

    if (!bErr && blogs) {
      for (const b of blogs) {
        if (!b.handle) continue;
        routes.push({
          url: `${SITE_URL}/blogs/${encodeURIComponent(b.handle)}`,
          lastModified: b.updated_at ? new Date(b.updated_at) : b.created_at ? new Date(b.created_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    // Keep static routes; log and let the build succeed. A missing DB row is
    // preferable to a delisting event with Google.
    console.error('[sitemap] Supabase enumeration failed:', (err as Error).message);
  }

  return routes;
}
