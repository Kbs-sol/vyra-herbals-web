import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_handle, user_id, include_reviews = true } = body || {};
    if (!product_handle) return NextResponse.json({ error: 'product_handle required' }, { status: 400 });

    const supabase = createServerSupabase();

    // Fetch product with all fields
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*')
      .eq('handle', product_handle)
      .limit(1);
      
    if (pErr) {
      console.error('Product fetch error:', pErr);
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    const product = products?.[0] || null;
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Only fetch reviews if needed (for product detail page)
    let reviews: any[] = [];
    if (include_reviews) {
      // Fetch approved reviews
      const { data: approvedReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', product.id)
        .eq('status', 1)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (reviewsError) {
        // If status column doesn't exist, fetch all reviews
        console.log('Reviews fetch with status failed, trying without status filter');
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', product.id)
          .order('created_at', { ascending: false })
          .limit(50);
        reviews = allReviews || [];
      } else {
        reviews = approvedReviews || [];
      }

      // Normalize review fields for frontend
      reviews = reviews.map((r: any) => ({
        id: r.id ?? null,
        product_id: r.product_id,
        rating: r.rating,
        reviewer_name: r.reviewer_name || r.reviewer || 'Anonymous',
        review_text: r.review_text || r.comment || '',
        status: typeof r.status === 'string' ? Number(r.status) : r.status ?? 0,
        created_at: r.created_at || r.date || null,
        review_date: r.created_at || r.date || null,
      }));
    }

    // is_in_cart check
    let is_in_cart = '0';
    if (user_id) {
      const { data: cartRows } = await supabase
        .from('cart')
        .select('id')
        .match({ user_id, product_id: product.id })
        .limit(1);
      if (cartRows && cartRows.length > 0) is_in_cart = '1';
    }

    const images = Array.isArray((product as any).images)
      ? (product as any).images.filter((img: string) => !!img)
      : [];
    const mainImage = product.image_url || images[0] || null;

    return NextResponse.json({
      ...product,
      image_url: mainImage,
      images,
      reviews,
      is_in_cart
    });
  } catch (err) {
    console.error('Product detail error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
