import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createServerSupabase();
    
    // This endpoint returns products with their associated approved reviews
    const { extra_condition } = body || {};
    
    // First, fetch products
    let productsQuery = supabase.from('products').select('*');
    
    if (typeof extra_condition === 'string') {
      const limitMatch = extra_condition.match(/LIMIT\s+(\d+)/i);
      const orderMatch = extra_condition.match(/ORDER\s+BY\s+(\w+)\s+(ASC|DESC)/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = orderMatch[2].toUpperCase() === 'ASC';
        productsQuery = productsQuery.order(col, { ascending: dir });
      }
      if (limitMatch) productsQuery = productsQuery.limit(parseInt(limitMatch[1], 10));
    }
    
    const { data: products, error: productsError } = await productsQuery;
    if (productsError) {
      console.error('Products fetch error:', productsError);
      return NextResponse.json([]);
    }
    
    if (!products || products.length === 0) {
      return NextResponse.json([]);
    }
    
    // Then, fetch all approved reviews for these products
    // Try with status filter first, fall back to all reviews if status column doesn't exist
    const productIds = products.map((p: any) => p.id);
    let reviews: any[] = [];
    
    // First try fetching with status = 1 (approved)
    const { data: approvedReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .in('product_id', productIds)
      .eq('status', 1);
    
    if (reviewsError) {
      // If status column doesn't exist, fetch all reviews
      console.log('Reviews fetch with status failed, trying without status filter:', reviewsError.message);
      const { data: allReviews, error: allReviewsError } = await supabase
        .from('reviews')
        .select('*')
        .in('product_id', productIds);
      
      if (allReviewsError) {
        console.error('Reviews fetch error:', allReviewsError);
        // Return products without reviews if reviews fetch fails
        return NextResponse.json(products.map((p: any) => ({ ...p, reviews: [] })));
      }
      reviews = allReviews || [];
    } else {
      reviews = approvedReviews || [];
    }
    
    // Merge reviews into products
    const productsWithReviews = products.map((product: any) => ({
      ...product,
      reviews: (reviews || []).filter((review: any) => review.product_id === product.id)
    }));
    
    return NextResponse.json(productsWithReviews);
  } catch (err) {
    console.error('Products with reviews exception:', err);
    return NextResponse.json([]);
  }
}
