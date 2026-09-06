import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productIds } = body || {};
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'productIds array required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    
    // Fetch products by their IDs
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);
    
    if (error) {
      console.error('Cart products error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(products || []);
  } catch (err) {
    console.error('Cart products exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
