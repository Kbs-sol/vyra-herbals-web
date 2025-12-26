import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createServerSupabase();
    
    // This endpoint returns products with their associated reviews
    const { tbl_name, extra_condition, ids } = body || {};
    
    let query = supabase.from('products').select('*, reviews(*)');
    
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
    
    const { data, error } = await query;
    if (error) {
      console.error('Products with reviews error:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Products with reviews exception:', err);
    return NextResponse.json([]);
  }
}
