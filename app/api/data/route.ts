import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../src/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('DEBUG /api/data body:', JSON.stringify(body));
    const { tbl_name, extra_condition, new_query, ...rest } = body || {};

    if (!tbl_name) return NextResponse.json({ error: 'tbl_name required' }, { status: 400 });

    console.log('DEBUG: SUPABASE_URL set?', !!process.env.SUPABASE_URL, 'SERVICE_ROLE_KEY set?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
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

    let query;
    try {
      query = supabase.from(tbl_name).select('*');
    } catch (qe) {
      console.error('Supabase query build error', qe);
      return NextResponse.json({ error: 'Supabase query build error' }, { status: 500 });
    }

    // crude parsing of ORDER BY / LIMIT from extra_condition (e.g. " ORDER BY id DESC LIMIT 8")
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

    // If additional match filters provided, apply them
    // But handle status filter specially for tables that might not have it
    const filterKeys = Object.keys(rest);
    if (filterKeys.length) {
      // Try to apply all filters
      try {
        query = query.match(rest as Record<string, any>);
      } catch (e) {
        console.log('Match filter failed, trying without status');
      }
    }

    try {
      let { data, error } = await query;
      
      // If query failed and we were filtering by status, retry without status filter
      if (error && rest.status !== undefined) {
        console.log('Query with status filter failed, retrying without status');
        const { status, ...restWithoutStatus } = rest;
        let retryQuery = supabase.from(tbl_name).select('*');
        
        // Re-apply extra_condition parsing
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
        // Return empty data to avoid breaking frontend when Supabase has transient errors
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
