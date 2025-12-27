import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Accept both 'category' and 'category_name' for compatibility
    const { category, category_name, extra_condition } = body || {};
    const categoryValue = category || category_name;
    
    if (!categoryValue) {
      return NextResponse.json({ error: 'category required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    let query = supabase.from('products').select('*').eq('category', categoryValue);
    
    if (typeof extra_condition === 'string') {
      const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) query = query.limit(parseInt(limitMatch[1], 10));
    }

    const { data, error } = await query;
    if (error) {
      console.error('Category products error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return in expected format for both old and new API consumers
    return NextResponse.json({ products: data || [], data: data || [] });
  } catch (err) {
    console.error('Category products exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
