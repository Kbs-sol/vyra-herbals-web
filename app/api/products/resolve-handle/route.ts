import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabaseClient';


// Force dynamic — API routes touch Supabase / cookies; static analysis at build time would try
// to import the module without runtime env vars and blow up in 'collect page data'.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Resolve a product's CURRENT handle (URL slug) from its id.
 *
 * Order line-items store a snapshot of the product taken at purchase time,
 * including the handle that was active back then. Admins can later change a
 * product's handle, which makes that stored handle stale. Anything that wants
 * to link back to the live product page (e.g. "Order Again") must therefore
 * resolve the up-to-date handle from the stable product id rather than trust
 * the snapshot.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = createServerSupabase();

    const { data: product, error } = await supabase
      .from('products')
      .select('id, handle')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('resolve-handle error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!product || !product.handle) {
      return NextResponse.json({ status: 'error', message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ status: 'success', id: product.id, handle: product.handle });
  } catch (err) {
    console.error('resolve-handle exception:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
