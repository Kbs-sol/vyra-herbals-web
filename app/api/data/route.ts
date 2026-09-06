import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';
import { enforceRateLimit } from '@/utils/rateLimit';

export const runtime = 'nodejs';

/**
 * Public read-only catalogue endpoint.
 *
 * This route runs with the service-role key, which bypasses RLS entirely, so
 * whatever it is willing to select is effectively world-readable. It previously
 * accepted `users`, `orders` and `cart` as table names — a single anonymous
 * POST could dump the whole customer database, passwords and addresses
 * included. The allow-list below is restricted to genuinely public catalogue
 * content.
 *
 * Everything the caller can influence is validated against a per-table rule:
 * the select expression, the sort column and the filter columns. A caller can
 * no longer name an arbitrary column, embed an arbitrary related table, or
 * request an unbounded result set.
 */

type TableRule = {
  /**
   * Select expressions this table accepts, matched exactly. The first entry is
   * the default. Free-form `fields` from the request body is never passed
   * through to PostgREST — that is what allowed arbitrary table embedding.
   */
  allowedSelects: string[];
  /** Columns a caller may sort by. */
  sortable: string[];
  /** Columns a caller may filter on with an equality match. */
  filterable: string[];
};

const PUBLIC_TABLES: Record<string, TableRule> = {
  products: {
    allowedSelects: ['*'],
    sortable: ['created_at', 'price', 'title', 'featured_order', 'ordered_count', 'view_count', 'id'],
    filterable: ['id', 'handle', 'category', 'category_id', 'featured'],
  },
  categories: {
    allowedSelects: ['*'],
    sortable: ['name', 'created_at', 'id'],
    filterable: ['id', 'slug', 'handle', 'name'],
  },
  reviews: {
    // The embedded form is used by the testimonials page to show which product
    // a review belongs to. Both variants are fixed strings, not caller input.
    allowedSelects: ['*', '*, products(title, image_url)'],
    sortable: ['created_at', 'date', 'rating', 'id'],
    filterable: ['id', 'product_id', 'status'],
  },
  testimonials: {
    allowedSelects: ['*'],
    sortable: ['created_at', 'rating', 'id'],
    filterable: ['id', 'status'],
  },
  before_after_images: {
    allowedSelects: ['*'],
    sortable: ['created_at', 'id'],
    filterable: ['id', 'status'],
  },
};

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export async function POST(req: Request) {
  try {
    // Generous, but enough to stop the catalogue being scraped in a tight loop.
    const limited = enforceRateLimit(req, 'data:read', 120, 60_000);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const { tbl_name, extra_condition, fields, select_all, ...rest } = body || {};

    if (!tbl_name || typeof tbl_name !== 'string') {
      return NextResponse.json({ error: 'tbl_name required' }, { status: 400 });
    }

    const rule = PUBLIC_TABLES[tbl_name];
    if (!rule) {
      return NextResponse.json({ error: 'table not allowed' }, { status: 403 });
    }

    // Accept a requested select expression only if it matches a known-good one.
    const requestedSelect = typeof fields === 'string' ? fields.trim() : '';
    const selectExpr =
      requestedSelect && rule.allowedSelects.includes(requestedSelect)
        ? requestedSelect
        : rule.allowedSelects[0];

    const supabase = createServerSupabase();
    let query = supabase.from(tbl_name).select(selectExpr);

    // Parse the legacy `ORDER BY x DIR` / `LIMIT n` mini-syntax, validating the
    // column against the allow-list so it cannot name an unexposed column.
    let limit = DEFAULT_LIMIT;
    if (typeof extra_condition === 'string') {
      const orderMatch = extra_condition.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderMatch && rule.sortable.includes(orderMatch[1])) {
        query = query.order(orderMatch[1], { ascending: orderMatch[2].toUpperCase() === 'ASC' });
      }

      const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const parsed = parseInt(limitMatch[1], 10);
        if (Number.isFinite(parsed) && parsed > 0) limit = Math.min(parsed, MAX_LIMIT);
      }
    }

    if (Array.isArray(rest.ids)) {
      // Bound the IN list so it cannot be used as an unpaginated full dump.
      query = query.in('id', rest.ids.slice(0, MAX_LIMIT));
      delete rest.ids;
    }

    // Equality filters, restricted to the table's declared filterable columns.
    // Unknown keys are ignored rather than rejected, so an older client that
    // sends an extra field still gets its data.
    for (const [key, value] of Object.entries(rest)) {
      if (!rule.filterable.includes(key)) continue;
      if (value === null || typeof value === 'object') continue;
      query = query.eq(key, value);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error(`[api/data] query failed for table ${tbl_name}:`, error.message);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[api/data] handler exception:', err);
    return NextResponse.json([]);
  }
}
