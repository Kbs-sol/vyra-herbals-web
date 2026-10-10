import { createServerSupabase } from '@/utils/supabaseClient';
import { STATIC_PRODUCTS } from '@/utils/staticCatalogue';

/**
 * Shared, resilient product loader for SEO surfaces
 * (feed.xml, sitemap.xml, llms.txt, /category/*).
 *
 * WHY THIS EXISTS
 * ---------------
 * `products.status` is a Postgres column of type `unknown` and every live row
 * holds NULL. Any PostgREST comparison on it (`.eq`, `.neq`, `.not`, `.or`)
 * fails with `invalid input syntax for type bigint: "active"` and the query
 * silently returns zero rows. The routes that work (/api/products/by-category,
 * /api/products/detail ...) use `.select('*')` and filter in JS — so do we.
 *
 * Real column names: description (no short_description),
 * regular_price (no compare_at_price), stock_quantity (no stock).
 *
 * If Supabase errors or returns zero usable rows we fall back to the static
 * 29-product snapshot so crawlers never see an empty feed / sitemap.
 */

export interface CatalogueProduct {
  id: string | number;
  handle: string;
  title: string;
  category: string | null;
  price: number | string | null;
  regular_price: number | string | null;
  image_url: string | null;
  images?: string[] | null;
  status?: unknown;
  brand: string | null;
  sku: string | null;
  description: string | null;
  stock_quantity?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
}

/** True when a `status` value means "archived / hidden". NULL means live. */
export function isInactiveStatus(s: unknown): boolean {
  if (s === null || s === undefined) return false;
  if (s === 0 || s === false) return true;
  const v = String(s).trim().toLowerCase();
  return ['0', 'false', 'archived', 'draft', 'inactive', 'deleted', 'hidden', 'unpublished'].includes(v);
}

export interface CatalogueResult {
  products: CatalogueProduct[];
  source: 'supabase' | 'static';
}

export async function getLiveProducts(limit = 500): Promise<CatalogueResult> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('products').select('*').limit(limit);

    if (error) {
      console.error('[catalogue] Supabase error:', error.message);
    } else if (data && data.length > 0) {
      const live = (data as CatalogueProduct[]).filter(
        (p) => p && p.handle && p.title && !isInactiveStatus(p.status),
      );
      if (live.length > 0) return { products: live, source: 'supabase' };
    }
  } catch (e) {
    console.error('[catalogue] unexpected failure:', (e as Error).message);
  }

  return {
    products: STATIC_PRODUCTS.filter((p) => p.handle && p.title && !isInactiveStatus(p.status)) as CatalogueProduct[],
    source: 'static',
  };
}

/** Blog handles for the sitemap — same no-status-filter pattern. */
export async function getLiveBlogs(
  limit = 500,
): Promise<Array<{ handle: string; updated_at?: string | null; created_at?: string | null }>> {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from('blogs').select('*').limit(limit);
    if (error) {
      console.error('[catalogue] blogs error:', error.message);
      return [];
    }
    return ((data ?? []) as any[]).filter((b) => b?.handle && !isInactiveStatus(b.status));
  } catch (e) {
    console.error('[catalogue] blogs failure:', (e as Error).message);
    return [];
  }
}
