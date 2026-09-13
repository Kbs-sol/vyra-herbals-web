import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createServerSupabase();
    
    // This endpoint returns products with their associated approved reviews
    const { extra_condition, ids } = body || {};
    
    // Fetch all product fields to avoid column mismatch
    let productsQuery = supabase.from('products').select('*');
    
    // Filter by specific IDs if provided (more efficient than fetching all)
    if (ids && Array.isArray(ids) && ids.length > 0) {
      productsQuery = productsQuery.in('id', ids);
    }
    
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
    
    // Then, fetch approved reviews for these products
    const productIds = products.map((p: any) => p.id).filter((id: any) => id != null);
    let reviews: any[] = [];
    
    // Skip review fetch if no valid product IDs
    if (productIds.length === 0) {
      return NextResponse.json(products.map((p: any) => ({ ...p, reviews: [] })));
    }
    
    // Fetch all review fields to avoid column mismatch errors
    const { data: approvedReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .in('product_id', productIds)
      .eq('status', 1);
    
    if (reviewsError) {
      // If status column doesn't exist or other error, fetch all reviews without status filter
      console.log('Reviews fetch with status failed, trying without status filter:', reviewsError.message);
      const { data: allReviews, error: allReviewsError } = await supabase
        .from('reviews')
        .select('*')
        .in('product_id', productIds.filter((id: any) => id != null));
      
      if (allReviewsError) {
        console.error('Reviews fetch error:', allReviewsError);
        // Return products without reviews if reviews fetch fails
        return NextResponse.json(products.map((p: any) => ({ ...p, reviews: [] })));
      }
      reviews = allReviews || [];
    } else {
      reviews = approvedReviews || [];
    }
    
    // Merge reviews into products and normalize review fields (add review_date, ensure id is numeric)
    const productsWithReviews = products.map((product: any) => {
      const productImages = Array.isArray(product.images)
        ? product.images.filter((img: string) => !!img)
        : [];
      const imageUrl = product.image_url || productImages[0] || null;

      const productReviews = (reviews || [])
        .filter((review: any) => review.product_id === product.id)
        .map((r: any) => ({
          // normalize fields expected by frontend
          id: r.id ?? null,
          product_id: r.product_id,
          rating: r.rating,
          reviewer_name: r.reviewer_name || r.reviewer || 'Anonymous',
          review_text: r.review_text || r.comment || '',
          status: typeof r.status === 'string' ? Number(r.status) : r.status ?? 0,
          created_at: r.created_at || r.date || null,
          review_date: r.created_at || r.date || null,
        }));

      return {
        ...product,
        image_url: imageUrl,
        images: productImages,
        reviews: productReviews
      };
    });
    
    return NextResponse.json(productsWithReviews);
  } catch (err) {
    console.error('Products with reviews exception:', err);
    return NextResponse.json([]);
  }
}
