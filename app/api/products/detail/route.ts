import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_handle, user_id } = body || {};
    if (!product_handle) return NextResponse.json({ error: 'product_handle required' }, { status: 400 });

    const supabase = createServerSupabase();

    const { data: products, error: pErr } = await supabase.from('products').select('*').eq('handle', product_handle).limit(1);
    if (pErr) {
      console.error('Product fetch error:', pErr);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    const product = products?.[0] || null;
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // fetch approved reviews only (status = 1), fall back to all reviews if status column doesn't exist
    let reviews: any[] = [];
    const { data: approvedReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', product.id)
      .eq('status', 1)
      .order('created_at', { ascending: false });
    
    if (reviewsError) {
      // If status column doesn't exist, fetch all reviews
      console.log('Reviews fetch with status failed, trying without status filter');
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      reviews = allReviews || [];
    } else {
      reviews = approvedReviews || [];
    }

    // is_in_cart check
    let is_in_cart = '0';
    if (user_id) {
      const { data: cartRows } = await supabase.from('cart').select('*').match({ user_id, product_id: product.id });
      if (cartRows && cartRows.length) is_in_cart = '1';
    }

    return NextResponse.json({ ...product, reviews, is_in_cart });
  } catch (err) {
    console.error('Product detail error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
