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

    const { data: products, error } = await query;
    if (error) {
      console.error('Category products error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [], data: [] });
    }

    // Fetch approved reviews for these products
    const productIds = products.map((p: any) => p.id).filter((id: any) => id != null);
    let reviews: any[] = [];

    if (productIds.length > 0) {
      const { data: approvedReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .in('product_id', productIds)
        .eq('status', 1);

      if (reviewsError) {
        console.log('Reviews fetch failed, trying without status filter:', reviewsError.message);
        const { data: allReviews, error: allReviewsError } = await supabase
          .from('reviews')
          .select('*')
          .in('product_id', productIds);
        
        if (!allReviewsError) {
          reviews = allReviews || [];
        }
      } else {
        reviews = approvedReviews || [];
      }
    }

    // Merge reviews into products
    const productsWithReviews = products.map((product: any) => {
      const productReviews = (reviews || [])
        .filter((review: any) => review.product_id === product.id)
        .map((r: any) => ({
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
        reviews: productReviews
      };
    });
    
    // Return in expected format for both old and new API consumers
    return NextResponse.json({ products: productsWithReviews, data: productsWithReviews });
  } catch (err) {
    console.error('Category products exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
