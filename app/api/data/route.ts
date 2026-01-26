import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../src/utils/supabaseClient';

// Default to selecting all fields (*) to avoid column mismatch errors
// The frontend will only use what it needs
const DEFAULT_FIELDS: Record<string, string> = {
  products: '*',
  categories: '*',
  reviews: '*',
  testimonials: '*',
  cart: '*',
  orders: '*',
  users: '*'
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tbl_name, extra_condition, fields, select_all, ...rest } = body || {};

    if (!tbl_name) return NextResponse.json({ error: 'tbl_name required' }, { status: 400 });

    let supabase;
    try {
      supabase = createServerSupabase();
    } catch (e) {
      console.error('Failed to create server supabase client', e);
      return NextResponse.json({ error: 'Supabase configuration error' }, { status: 500 });
    }

    // Basic, guarded table access
    const allowed = ['products', 'categories', 'reviews', 'testimonials', 'cart', 'orders', 'users'];
    if (!allowed.includes(tbl_name)) {
      return NextResponse.json({ error: 'table not allowed' }, { status: 400 });
    }

    // Use custom fields, or default optimized fields, or all fields if explicitly requested
    const selectFields = fields || (select_all ? '*' : DEFAULT_FIELDS[tbl_name] || '*');

    let query;
    try {
      query = supabase.from(tbl_name).select(selectFields);
    } catch (qe) {
      console.error('Supabase query build error', qe);
      return NextResponse.json({ error: 'Supabase query build error' }, { status: 500 });
    }

    // Parse ORDER BY / LIMIT from extra_condition
    if (typeof extra_condition === 'string') {
      const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
      const orderMatch = extra_condition.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = orderMatch[2].toUpperCase() === 'ASC';
        query = query.order(col, { ascending: dir });
      }
      if (limitMatch) query = query.limit(parseInt(limitMatch[1], 10));
    }

    // Apply IDs filter if provided
    if (rest.ids && Array.isArray(rest.ids)) {
      query = query.in('id', rest.ids);
      delete rest.ids;
    }

    // Apply filters if provided
    const filterKeys = Object.keys(rest);
    if (filterKeys.length) {
      try {
        query = query.match(rest as Record<string, any>);
      } catch (e) {
        console.log('Match filter failed');
      }
    }

    try {
      let { data, error } = await query;

      // If query failed or returned empty results and we were filtering by status, retry without status filter
      // This handles cases where status column doesn't exist or no approved items exist yet
      if ((error || (data && data.length === 0)) && rest.status !== undefined) {
        const { status, ...restWithoutStatus } = rest;
        let retryQuery = supabase.from(tbl_name).select(selectFields);

        if (typeof extra_condition === 'string') {
          const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
          const orderMatch = extra_condition.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
          if (orderMatch) {
            const col = orderMatch[1];
            const dir = orderMatch[2].toUpperCase() === 'ASC';
            retryQuery = retryQuery.order(col, { ascending: dir });
          }
          if (limitMatch) retryQuery = retryQuery.limit(parseInt(limitMatch[1], 10));
        }

        if (Object.keys(restWithoutStatus).length) {
          retryQuery = retryQuery.match(restWithoutStatus as Record<string, any>);
        }

        const retryResult = await retryQuery;
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('Supabase returned error', error);
        return NextResponse.json([]);
      }
      return NextResponse.json(data || []);
    } catch (qe) {
      console.error('Supabase query execution exception', qe);
      return NextResponse.json([]);
    }
  } catch (err) {
    console.error('Handler exception', err);
    return NextResponse.json([]);
  }
}
